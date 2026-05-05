import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../api/client'
import { webinarApi, Webinar } from '../../api/webinars'
import { useAuthStore } from '../../store/auth'
import {
  ArrowLeft, Users, Send, Radio, Square, Settings,
  Lock, Unlock, MessageSquare, ShieldAlert,
} from 'lucide-react'

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void }
}

interface ChatMsg {
  id: number | string
  author: string
  text: string
  ts: string
  is_admin?: boolean
}

function Timer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [startedAt])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  return (
    <span className="font-mono text-sm font-bold text-green-400">
      +{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

export default function BroadcastPage() {
  const { id } = useParams<{ id: string }>()
  const webinarId = Number(id)
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [webinar, setWebinar] = useState<Webinar | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [chatLocked, setChatLocked] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const playerDivRef = useRef<HTMLDivElement>(null)
  const playerRef    = useRef<any>(null)
  const wsRef        = useRef<WebSocket | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const timerStart   = useRef<Date>(new Date())

  // Load webinar
  useEffect(() => {
    webinarApi.get(webinarId).then((w) => {
      setWebinar(w)
      if (w.scheduled_at) timerStart.current = new Date(w.scheduled_at)
    })
  }, [webinarId])

  // YouTube player
  useEffect(() => {
    if (!webinar?.video_id) return
    const load = () => {
      if (!playerDivRef.current) return
      playerRef.current = new window.YT.Player(playerDivRef.current, {
        videoId: webinar.video_id!,
        playerVars: { autoplay: 1, controls: 1, rel: 0, origin: window.location.origin },
        events: { onReady: (ev: any) => ev.target.playVideo() },
      })
    }
    if (window.YT?.Player) load()
    else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
      window.onYouTubeIframeAPIReady = load
    }
    return () => playerRef.current?.destroy?.()
  }, [webinar?.video_id])

  // Admin WebSocket chat
  useEffect(() => {
    if (!token) return
    const WS_BASE = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`
    const ws = new WebSocket(`${WS_BASE}/admin-chat/${webinarId}?token=${token}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'chat_message') {
        setMessages((prev) => [...prev.slice(-299), msg as ChatMsg])
      }
    }
    return () => ws.close()
  }, [webinarId, token])

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Viewer count polling
  useEffect(() => {
    if (!token) return
    const poll = () =>
      api.get(`/admin/webinars/${webinarId}/viewer-count?token=${token}`)
        .then((r) => setViewerCount(r.data.count))
        .catch(() => {})
    poll()
    const t = setInterval(poll, 10_000)
    return () => clearInterval(t)
  }, [webinarId, token])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'chat_message', text }))
    setInput('')
  }, [input])

  const handleFinish = async () => {
    if (!confirm('Завершить трансляцию?')) return
    setFinishing(true)
    await webinarApi.update(webinarId, { status: 'finished' })
    navigate('/admin/webinars')
  }

  const handleGoLive = async () => {
    const updated = await webinarApi.update(webinarId, { status: 'live' })
    setWebinar(updated)
    timerStart.current = new Date()
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Загрузка...
      </div>
    )
  }

  const isLive = webinar.status === 'live'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Top bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-4 text-sm shrink-0">
        <Link
          to="/admin/webinars"
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition shrink-0"
        >
          <ArrowLeft size={15} /> Вернуться к списку
        </Link>
        <div className="w-px h-4 bg-gray-700 shrink-0" />
        <p className="truncate text-gray-300 flex-1">{webinar.title}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/admin/webinars/${webinarId}/edit`}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-1"
          >
            <Settings size={13} /> Настройка
          </Link>
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3 shrink-0 flex-wrap">
        {/* Status + timer */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
          isLive ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          {isLive ? (
            <>Автовебинар &nbsp; <Timer startedAt={timerStart.current} /></>
          ) : (
            `Статус: ${webinar.status === 'draft' ? 'Черновик' : webinar.status === 'scheduled' ? 'Запланирован' : webinar.status}`
          )}
        </div>

        {/* Go live / Finish */}
        {isLive ? (
          <button
            onClick={handleFinish}
            disabled={finishing}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            <Square size={13} fill="white" /> Завершить
          </button>
        ) : (
          <button
            onClick={handleGoLive}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            <Radio size={13} /> Запустить эфир
          </button>
        )}

        {/* Lock chat */}
        <button
          onClick={() => setChatLocked((l) => !l)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition ${
            chatLocked
              ? 'border-red-600 text-red-400 bg-red-950/30'
              : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
          }`}
        >
          {chatLocked ? <><Lock size={13} /> Чат заблокирован</> : <><Unlock size={13} /> Заблокировать чат</>}
        </button>

        {/* Viewer count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-300">
          <Users size={15} className="text-gray-500" />
          <span className="font-semibold">{viewerCount}</span>
          <span className="text-gray-500 text-xs">зрителей</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">
        {/* Video area */}
        <div className="flex-1 flex flex-col bg-black min-w-0">
          {webinar.video_id ? (
            <div className="relative bg-black" style={{ paddingBottom: '56.25%', flexShrink: 0 }}>
              <div ref={playerDivRef} className="absolute inset-0 w-full h-full" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-900">
              <Radio size={48} className="text-gray-700 mb-4" />
              <p className="text-xl font-semibold text-gray-300 mb-2">Трансляция включена</p>
              <p className="text-sm text-gray-500 mb-6">YouTube-ссылка не добавлена</p>
              <Link
                to={`/admin/webinars/${webinarId}/edit`}
                className="flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-dark transition"
              >
                <Settings size={15} /> Добавить YouTube-ссылку
              </Link>
            </div>
          )}

          {/* Webinar info below video */}
          {webinar.video_id && (
            <div className="p-4 bg-gray-900 border-t border-gray-800">
              <p className="text-sm font-semibold">{webinar.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {webinar.webinar_type === 'auto' ? 'Автовебинар' : 'Live-вебинар'} · video_id: {webinar.video_id}
              </p>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="w-80 shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-gray-400" />
              <span className="text-sm font-semibold">Чат</span>
              {messages.length > 0 && (
                <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </div>
            <button
              title="Модерация"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-400 border border-gray-700 rounded px-2 py-1"
            >
              <ShieldAlert size={12} /> Модерация
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <p className="text-gray-600 text-xs text-center pt-8">Сообщений пока нет</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className="group">
                <div className="flex items-baseline gap-2">
                  <span className={`font-semibold text-xs shrink-0 ${m.is_admin ? 'text-green-400' : 'text-indigo-300'}`}>
                    {m.author}
                  </span>
                  <span className="text-gray-600 text-xs shrink-0">
                    {new Date(m.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-sm mt-0.5 leading-relaxed ${m.is_admin ? 'text-green-100' : 'text-gray-300'}`}>
                  {m.text}
                </p>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-800 space-y-2">
            <p className="text-xs text-gray-600">Кому: всем</p>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !chatLocked && sendMessage()}
                placeholder={chatLocked ? 'Чат заблокирован' : 'Введите сообщение'}
                disabled={chatLocked}
                maxLength={1000}
                className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-brand"
              />
              <button
                onClick={sendMessage}
                disabled={chatLocked || !input.trim()}
                className="bg-brand hover:bg-brand-dark text-white rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-40 shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
