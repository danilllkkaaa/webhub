import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { timelineApi, TimelineEvent } from '../../api/timeline'
import { Maximize, Minimize, Send, Volume1, Volume2, VolumeX, X } from 'lucide-react'

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void }
}

function fmtElapsed(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
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

interface ChatMsg { id: number | string; author: string; text: string; ts: string; is_admin?: boolean }

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

  // player UI state
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [playerBuffering, setPlayerBuffering] = useState(false)
  const [needClick, setNeedClick] = useState(false)
  const [playerVolume, setPlayerVolume] = useState(80)
  const [playerMuted, setPlayerMuted] = useState(false)
  const [playerFullscreen, setPlayerFullscreen] = useState(false)
  const [ctrlVisible, setCtrlVisible] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const playerMutedRef = useRef(false)
  const playerVolumeRef = useRef(80)
  useEffect(() => { playerMutedRef.current = playerMuted }, [playerMuted])
  useEffect(() => { playerVolumeRef.current = playerVolume }, [playerVolume])

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
          autoplay: 1, controls: 0, disablekb: 1, fs: 0,
          iv_load_policy: 3, playsinline: 1, rel: 0, modestbranding: 1,
          mute: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (ev: any) => {
            setPlayerReady(true)
            if (info.webinar.webinar_type === 'auto' && info.autowebinar_offset != null && info.autowebinar_offset > 0) {
              ev.target.seekTo(info.autowebinar_offset, true)
              setElapsed(info.autowebinar_offset)
            }
            ev.target.playVideo()
            // unmute after brief delay — muted autoplay is universally allowed,
            // then we restore sound once playback has started
            setTimeout(() => {
              try { ev.target.unMute(); ev.target.setVolume(80) } catch {}
            }, 500)
            elapsedIntervalRef.current = setInterval(() => {
              setElapsed(ev.target.getCurrentTime() || 0)
            }, 1000)
          },
          onStateChange: (ev: any) => {
            if (ev.data === 1) { setPlayerBuffering(false); setNeedClick(false) }
            if (ev.data === 3) setPlayerBuffering(true)
            // state -1 means video cued but not playing — autoplay blocked
            if (ev.data === -1) {
              setTimeout(() => {
                const s = ev.target.getPlayerState?.()
                if (s === -1 || s === 2 || s === 5) setNeedClick(true)
              }, 1500)
            }
            if (ev.data === 2) ev.target.playVideo() // force-play: viewer can't pause
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
    return () => {
      playerRef.current?.destroy?.()
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
    }
  }, [phase, info?.webinar.video_id])

  // fullscreen listener
  useEffect(() => {
    const h = () => setPlayerFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // keyboard shortcuts (only mute + fullscreen — no seek/pause for webinars)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'KeyF') document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()
      if (e.code === 'KeyM') {
        if (playerMutedRef.current) {
          playerRef.current?.unMute(); setPlayerMuted(false)
          if (!playerVolumeRef.current) { playerRef.current?.setVolume(50); setPlayerVolume(50) }
        } else {
          playerRef.current?.mute(); setPlayerMuted(true)
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setCtrlVisible(false), 3000)
  }
  const revealControls = () => { setCtrlVisible(true); scheduleHide() }

  const toggleMute = () => {
    if (playerMuted) {
      playerRef.current?.unMute(); setPlayerMuted(false)
      if (!playerVolume) { playerRef.current?.setVolume(50); setPlayerVolume(50) }
    } else {
      playerRef.current?.mute(); setPlayerMuted(true)
    }
  }

  const handleVolume = (val: number) => {
    setPlayerVolume(val); playerRef.current?.setVolume(val)
    if (val === 0) { playerRef.current?.mute(); setPlayerMuted(true) }
    else { playerRef.current?.unMute(); setPlayerMuted(false) }
  }

  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()

  const VolumeIcon = playerMuted || playerVolume === 0 ? VolumeX : playerVolume < 50 ? Volume1 : Volume2

  // WebSocket chat
  useEffect(() => {
    if (phase !== 'live' || !info?.webinar.chat_enabled) return
    const WS_BASE = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`
    const ws = new WebSocket(`${WS_BASE}/chat/${info.webinar.id}?token=${token}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'chat_message') {
        setMessages((prev) => [...prev.slice(-199), { id: msg.id, author: msg.author, text: msg.text, ts: msg.ts, is_admin: msg.is_admin }])
      }
      if (msg.type === 'webinar_ended') {
        setPhase('finished')
        playerRef.current?.destroy?.()
        if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
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

        {/* ── Video Player ── */}
        <div
          ref={containerRef}
          className="relative bg-black select-none"
          style={playerFullscreen ? { height: '100vh' } : { paddingBottom: '56.25%' }}
          onMouseMove={revealControls}
          onMouseEnter={revealControls}
          onMouseLeave={() => setCtrlVisible(false)}
        >
          {/* YouTube iframe */}
          <div ref={playerDivRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Interaction blocker — no seeking, no right-click */}
          <div className="absolute inset-0 z-10 cursor-default" onContextMenu={e => e.preventDefault()} />

          {/* Initial loading */}
          {!playerReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
              <div className="w-11 h-11 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Buffering */}
          {playerBuffering && playerReady && !needClick && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 border-[3px] border-white/50 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Click-to-start fallback (browser blocked autoplay) */}
          {needClick && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 cursor-pointer"
              onClick={() => {
                playerRef.current?.playVideo()
                playerRef.current?.unMute()
                playerRef.current?.setVolume(80)
                setNeedClick(false)
              }}
            >
              <div className="flex flex-col items-center gap-3 select-none">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 text-white ml-1" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Нажмите, чтобы начать</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${ctrlVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={e => e.stopPropagation()}
            onMouseMove={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pt-8 pb-3">

              {/* Controls row */}
              <div className="flex items-center gap-2">

                {/* Live / Auto badge */}
                {info?.webinar.webinar_type === 'live' ? (
                  <span className="flex items-center gap-1.5 bg-red-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-white/15 text-white/80 text-xs font-semibold px-2.5 py-1 rounded-full">
                    ▶ AUTO
                  </span>
                )}

                {/* Elapsed time */}
                {playerReady && (
                  <span className="text-white/60 text-[13px] font-mono tabular-nums">
                    {fmtElapsed(elapsed)}
                  </span>
                )}

                <div className="flex-1" />

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                    <VolumeIcon className="w-[18px] h-[18px]" />
                  </button>
                  <div
                    className="relative w-20 h-5 flex items-center cursor-pointer group/vol"
                    onClick={e => { const r = e.currentTarget.getBoundingClientRect(); handleVolume(Math.round(((e.clientX - r.left) / r.width) * 100)) }}
                  >
                    <div className="absolute left-0 right-0 h-1 group-hover/vol:h-[5px] transition-all duration-150 rounded-full bg-white/20">
                      <div className="absolute inset-y-0 left-0 bg-white/80 rounded-full" style={{ width: `${playerMuted ? 0 : playerVolume}%` }}>
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover/vol:scale-100 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white ml-1">
                  {playerFullscreen ? <Minimize className="w-[18px] h-[18px]" /> : <Maximize className="w-[18px] h-[18px]" />}
                </button>

              </div>
            </div>
          </div>
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
                {m.is_admin ? (
                  <span className="font-bold italic text-amber-400 text-xs">Модератор: </span>
                ) : (
                  <span className="font-semibold text-indigo-300">{m.author}: </span>
                )}
                <span className={m.is_admin ? 'text-amber-100' : 'text-gray-200'}>{m.text}</span>
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
