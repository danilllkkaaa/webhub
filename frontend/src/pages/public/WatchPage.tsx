import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { timelineApi, TimelineEvent } from '../../api/timeline'
import { Send, X } from 'lucide-react'

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void }
}

interface WatchInfo {
  webinar: {
    id: number; title: string; video_id: string | null; webinar_type: 'live' | 'auto'
    status: string; scheduled_at: string | null; duration_minutes: number | null
    offer_text: string | null; offer_url: string | null; offer_button_text: string | null
    chat_enabled: boolean
  }
  registration_id: number
  session_id: number
  viewer_name: string
  server_time: string
  autowebinar_offset: number | null
}

interface ChatMsg { id: number | string; author: string; text: string; ts: string }

function Countdown({ target }: { target: Date }) {
  const [diff, setDiff] = useState(target.getTime() - Date.now())
  useEffect(() => {
    const t = setInterval(() => setDiff(target.getTime() - Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])

  if (diff <= 0) return null
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  return (
    <div className="flex gap-4 justify-center text-center">
      {h > 0 && <div><div className="text-4xl font-bold">{String(h).padStart(2, '0')}</div><div className="text-xs text-gray-400 mt-1">часов</div></div>}
      <div><div className="text-4xl font-bold">{String(m).padStart(2, '0')}</div><div className="text-xs text-gray-400 mt-1">минут</div></div>
      <div><div className="text-4xl font-bold">{String(s).padStart(2, '0')}</div><div className="text-xs text-gray-400 mt-1">секунд</div></div>
    </div>
  )
}

export default function WatchPage() {
  const { slug } = useParams<{ slug: string }>()
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''

  const [info, setInfo] = useState<WatchInfo | null>(null)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [phase, setPhase] = useState<'loading' | 'timer' | 'live' | 'finished'>('loading')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [offer, setOffer] = useState<{ visible: boolean; text: string; url: string; btnText: string } | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const playerRef = useRef<any>(null)
  const playerDivRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Load info
  useEffect(() => {
    if (!token) { setError('Нет токена доступа'); return }
    api.get(`/webinars/${slug}/watch?token=${token}`)
      .then((r) => {
        const d: WatchInfo = r.data
        setInfo(d)
        setSessionId(d.session_id)
        determinePhase(d)
      })
      .catch((e) => setError(e?.response?.data?.detail ?? 'Доступ запрещён'))
  }, [slug, token])

  // We actually need session_id from the response — backend returns it inside WatchInfo
  // Let's enrich: backend watch endpoint returns session info in response

  const determinePhase = (d: WatchInfo) => {
    const { status, scheduled_at, webinar_type } = d.webinar
    if (status === 'finished') { setPhase('finished'); return }
    if (status === 'live') { setPhase('live'); return }
    if (!scheduled_at) { setPhase('live'); return }
    const start = new Date(scheduled_at)
    const now = new Date()
    if (now >= start) {
      setPhase('live')
    } else {
      setPhase('timer')
      // Auto-switch when timer hits zero
      const msLeft = start.getTime() - now.getTime()
      setTimeout(() => setPhase('live'), msLeft)
    }
  }

  // YouTube Player
  useEffect(() => {
    if (phase !== 'live' || !info?.webinar.video_id) return
    const loadPlayer = () => {
      if (!playerDivRef.current) return
      playerRef.current = new window.YT.Player(playerDivRef.current, {
        videoId: info.webinar.video_id!,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (ev: any) => {
            if (info.webinar.webinar_type === 'auto' && info.autowebinar_offset != null && info.autowebinar_offset > 0) {
              ev.target.seekTo(info.autowebinar_offset, true)
            }
            ev.target.playVideo()
          },
          onStateChange: (ev: any) => {
            if (ev.data === window.YT.PlayerState.PAUSED) {
              ev.target.playVideo()
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
      loadPlayer()
    } else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
      window.onYouTubeIframeAPIReady = loadPlayer
    }
    return () => { playerRef.current?.destroy?.() }
  }, [phase, info?.webinar.video_id])

  // WebSocket chat
  useEffect(() => {
    if (phase !== 'live' || !info?.webinar.chat_enabled) return
    const WS_BASE = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`
    const ws = new WebSocket(`${WS_BASE}/chat/${info.webinar.id}?token=${token}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'chat_message') {
        setMessages((prev) => [...prev.slice(-199), { id: msg.id, author: msg.author, text: msg.text, ts: msg.ts }])
      }
    }
    return () => ws.close()
  }, [phase, info?.webinar.id, info?.webinar.chat_enabled])

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Ping every 30s
  useEffect(() => {
    if (phase !== 'live' || !sessionId) return
    const t = setInterval(() => api.post('/watch/ping', { session_id: sessionId, token }), 30_000)
    const onUnload = () => api.post('/watch/exit', { session_id: sessionId, token })
    window.addEventListener('beforeunload', onUnload)
    return () => { clearInterval(t); window.removeEventListener('beforeunload', onUnload) }
  }, [phase, sessionId])

  // Timeline events for autowebinar
  useEffect(() => {
    if (!info || info.webinar.webinar_type !== 'auto' || phase !== 'live') return
    timelineApi.publicList(info.webinar.id).then((events) => {
      const startOffset = info.autowebinar_offset ?? 0
      events.forEach((ev) => {
        const delay = Math.max(0, (ev.offset_seconds - startOffset) * 1000)
        setTimeout(() => fireEvent(ev, info), delay)
      })
    })
  }, [phase, info?.webinar.id])

  const fireEvent = (ev: TimelineEvent, info: WatchInfo) => {
    switch (ev.event_type) {
      case 'chat_message':
        if (ev.payload) {
          setMessages((prev) => [...prev.slice(-199), {
            id: `scripted-${ev.id}`,
            author: 'Участник',
            text: ev.payload!,
            ts: new Date().toISOString(),
          }])
        }
        break
      case 'offer_show':
        setOffer({
          visible: true,
          text: info.webinar.offer_text ?? '',
          url: ev.payload ?? info.webinar.offer_url ?? '#',
          btnText: info.webinar.offer_button_text ?? 'Получить',
        })
        break
      case 'offer_hide':
        setOffer((prev) => prev ? { ...prev, visible: false } : null)
        break
      case 'banner_show':
        setBanner(ev.payload ?? '')
        break
      case 'banner_hide':
        setBanner(null)
        break
      case 'redirect':
        if (ev.payload) window.location.href = ev.payload
        break
    }
  }

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'chat_message', text: chatInput.trim() }))
    setChatInput('')
  }

  const handleOfferClick = () => {
    if (!info) return
    api.post('/watch/offer-click', { registration_id: info.registration_id, token })
    if (offer?.url) window.open(offer.url, '_blank')
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-red-500 font-semibold text-lg mb-2">Нет доступа</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (phase === 'loading' || !info) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>
  }

  if (phase === 'timer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-950 flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-2xl font-bold mb-2 text-center">{info.webinar.title}</h1>
        <p className="text-indigo-300 mb-8 text-sm">Вебинар начнётся через:</p>
        {info.webinar.scheduled_at && <Countdown target={new Date(info.webinar.scheduled_at)} />}
        <p className="mt-8 text-sm text-indigo-300">Привет, {info.viewer_name}! Оставайтесь на странице.</p>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-bold text-lg mb-1">{info.webinar.title}</p>
          <p className="text-gray-500 text-sm">Вебинар завершён. Спасибо за участие!</p>
        </div>
      </div>
    )
  }

  // Live / auto
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row">
      {/* Video area */}
      <div className="flex-1 flex flex-col">
        <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <h1 className="font-semibold text-sm truncate">{info.webinar.title}</h1>
          <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full">
            {info.webinar.webinar_type === 'live' ? '🔴 LIVE' : '▶ AUTO'}
          </span>
        </div>

        <div className="relative bg-black select-none" style={{ paddingBottom: '56.25%' }}>
          <div ref={playerDivRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <div
            className="absolute inset-0 z-10 cursor-default"
            aria-hidden="true"
            onContextMenu={(e) => e.preventDefault()}
            onDoubleClick={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
          />
        </div>

        {/* Banner */}
        {banner && (
          <div className="bg-indigo-600 text-white text-sm px-4 py-2 flex items-center justify-between">
            <span>{banner}</span>
            <button onClick={() => setBanner(null)}><X size={14} /></button>
          </div>
        )}

        {/* Offer */}
        {offer?.visible && (
          <div className="bg-amber-500 text-gray-900 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{offer.text}</span>
            <button
              onClick={handleOfferClick}
              className="ml-4 bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg font-semibold hover:bg-gray-700 shrink-0"
            >
              {offer.btnText}
            </button>
          </div>
        )}
      </div>

      {/* Chat */}
      {info.webinar.chat_enabled && (
        <div className="w-full lg:w-80 bg-gray-800 flex flex-col border-l border-gray-700" style={{ height: '100vh', maxHeight: '100vh' }}>
          <div className="p-3 border-b border-gray-700 text-sm font-semibold">Чат</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.map((m) => (
              <div key={m.id}>
                <span className="font-semibold text-indigo-300">{m.author}: </span>
                <span className="text-gray-200">{m.text}</span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          <div className="p-2 border-t border-gray-700 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none placeholder-gray-400"
              placeholder="Написать..."
              maxLength={500}
            />
            <button onClick={sendChat} className="text-indigo-400 hover:text-indigo-200">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
