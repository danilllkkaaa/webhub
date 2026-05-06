import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CourseLearn, CourseLesson, courseApi } from '../../api/courses'
import { CheckCircle, Circle, Maximize, Minimize, Pause, Play, PlayCircle, Volume1, Volume2, VolumeX } from 'lucide-react'
import BunnyPlayer from '../../components/BunnyPlayer'

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void }
}

function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function VideoLesson({ lesson, onEnded }: { lesson: CourseLesson; onEnded?: () => void }) {
  // Bunny Stream player — use when bunny_video_id is set
  if (lesson.bunny_video_id) {
    return <BunnyPlayer videoId={lesson.bunny_video_id} onEnded={onEnded} autoplay={false} />
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const playerDivRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [ctrlVisible, setCtrlVisible] = useState(true)

  // refs to avoid stale closures in event listeners
  const playingRef = useRef(false)
  const mutedRef = useRef(false)
  const volumeRef = useRef(80)
  const durationRef = useRef(0)
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { durationRef.current = duration }, [duration])

  useEffect(() => {
    if (!lesson.video_id) return
    const init = () => {
      if (!playerDivRef.current) return
      playerRef.current = new window.YT.Player(playerDivRef.current, {
        videoId: lesson.video_id,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            setReady(true)
            setDuration(playerRef.current.getDuration() || 0)
            playerRef.current.setVolume(80)
            // Pin the iframe at z-index 0 so our overlays (z-10..z-30) are always above it
            const iframe = playerRef.current.getIframe?.()
            if (iframe) {
              Object.assign(iframe.style, {
                position: 'absolute', top: '0', left: '0',
                width: '100%', height: '100%', zIndex: '0',
              })
            }
          },
          onStateChange: ({ data }: { data: number }) => {
            if (data === 1) { setPlaying(true); setBuffering(false) }
            else if (data === 2) setPlaying(false)
            else if (data === 0) { setPlaying(false); setCurrentTime(0) }
            else if (data === 3) setBuffering(true)
          },
        },
      })
    }
    if (window.YT?.Player) init()
    else {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
      window.onYouTubeIframeAPIReady = init
    }
    return () => {
      playerRef.current?.destroy?.()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [lesson.id, lesson.video_id])

  // progress polling
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        if (!playerRef.current) return
        setCurrentTime(playerRef.current.getCurrentTime() || 0)
        setBuffered(playerRef.current.getVideoLoadedFraction() || 0)
        const d = playerRef.current.getDuration() || 0
        if (d) setDuration(d)
      }, 250)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing])

  // fullscreen listener
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        playingRef.current ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault()
        const t = Math.min((playerRef.current?.getCurrentTime() || 0) + 10, durationRef.current)
        playerRef.current?.seekTo(t, true); setCurrentTime(t)
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        const t = Math.max((playerRef.current?.getCurrentTime() || 0) - 10, 0)
        playerRef.current?.seekTo(t, true); setCurrentTime(t)
      }
      if (e.code === 'KeyF') document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()
      if (e.code === 'KeyM') {
        if (mutedRef.current) { playerRef.current?.unMute(); setMuted(false); if (!volumeRef.current) { playerRef.current?.setVolume(50); setVolume(50) } }
        else { playerRef.current?.mute(); setMuted(true) }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (playingRef.current) hideTimerRef.current = setTimeout(() => setCtrlVisible(false), 3000)
  }
  const revealControls = () => { setCtrlVisible(true); scheduleHide() }

  const togglePlay = () => playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()
  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()
  const toggleMute = () => {
    if (muted) { playerRef.current?.unMute(); setMuted(false); if (!volume) { playerRef.current?.setVolume(50); setVolume(50) } }
    else { playerRef.current?.mute(); setMuted(true) }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const t = ((e.clientX - rect.left) / rect.width) * duration
    playerRef.current?.seekTo(t, true); setCurrentTime(t)
  }

  const handleVolume = (val: number) => {
    setVolume(val); playerRef.current?.setVolume(val)
    if (val === 0) { playerRef.current?.mute(); setMuted(true) }
    else { playerRef.current?.unMute(); setMuted(false) }
  }

  const skip = (delta: number) => {
    const t = Math.max(0, Math.min((playerRef.current?.getCurrentTime() || 0) + delta, duration))
    playerRef.current?.seekTo(t, true); setCurrentTime(t)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2

  if (!lesson.video_id) return <div className="bg-gray-900 text-gray-400 rounded-xl p-10 text-center">Видео не добавлено</div>

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden select-none"
      style={{ paddingBottom: '56.25%' }}
      onMouseMove={revealControls}
      onMouseEnter={revealControls}
      onMouseLeave={() => { if (playing) setCtrlVisible(false) }}
    >
      {/* YouTube iframe — pointer-events-none so we control everything */}
      <div ref={playerDivRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Click overlay — play/pause on click */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Initial loading */}
      {!ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="w-11 h-11 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Buffering */}
      {buffering && ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-[3px] border-white/50 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Pause overlay — solid cover so YouTube's end/pause screen never shows through */}
      {!playing && ready && !buffering && (
        <div className="absolute inset-0 z-20 bg-black flex items-center justify-center pointer-events-none">
          {/* Thumbnail as soft background — hidden on error (e.g. unlisted video) */}
          <img
            src={`https://img.youtube.com/vi/${lesson.video_id}/maxresdefault.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div className="relative w-[72px] h-[72px] bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${ctrlVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
      >
        {/* Gradient + controls */}
        <div className="bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pt-10 pb-3">

          {/* ── Progress bar ── */}
          <div
            className="relative w-full mb-3 cursor-pointer group/bar flex items-center"
            style={{ height: 20 }}
            onClick={handleSeek}
          >
            <div className="absolute left-0 right-0 h-1 group-hover/bar:h-[5px] transition-all duration-150 rounded-full bg-white/20">
              {/* buffered */}
              <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full" style={{ width: `${buffered * 100}%` }} />
              {/* played */}
              <div className="absolute inset-y-0 left-0 bg-brand rounded-full transition-none" style={{ width: `${progress}%` }}>
                {/* thumb */}
                <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[13px] h-[13px] bg-white rounded-full shadow-md scale-0 group-hover/bar:scale-100 transition-transform" />
              </div>
            </div>
          </div>

          {/* ── Controls row ── */}
          <div className="flex items-center gap-1">

            {/* Play / Pause */}
            <button onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white">
              {playing ? <Pause className="w-[18px] h-[18px]" fill="currentColor" /> : <Play className="w-[18px] h-[18px]" fill="currentColor" />}
            </button>

            {/* Skip −10 */}
            <button onClick={() => skip(-10)} title="-10 сек (←)" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                <path d="M12 5V2L7 7l5 5V9c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="12" y="16.5" fontSize="5.5" textAnchor="middle" fontWeight="700" fontFamily="system-ui">10</text>
              </svg>
            </button>

            {/* Skip +10 */}
            <button onClick={() => skip(10)} title="+10 сек (→)" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                <path d="M12 5V2l5 5-5 5V9c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="12" y="16.5" fontSize="5.5" textAnchor="middle" fontWeight="700" fontFamily="system-ui">10</text>
              </svg>
            </button>

            {/* Time */}
            <span className="text-white/70 text-[13px] font-mono tabular-nums ml-1">
              {fmt(currentTime)}<span className="text-white/30 mx-1">/</span>{fmt(duration)}
            </span>

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
                  <div className="absolute inset-y-0 left-0 bg-white/80 rounded-full" style={{ width: `${muted ? 0 : volume}%` }}>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover/vol:scale-100 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white ml-1">
              {fullscreen ? <Minimize className="w-[18px] h-[18px]" /> : <Maximize className="w-[18px] h-[18px]" />}
            </button>

          </div>
        </div>
      </div>

      {/* Keyboard hint — fades in briefly on first load */}
      {ready && !playing && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <div className="flex gap-1.5 flex-wrap justify-end">
            {[['Space','▶/⏸'], ['←/→','±10s'], ['F','⛶'], ['M','🔇']].map(([k, v]) => (
              <span key={k} className="bg-black/60 text-white/50 text-[10px] rounded px-1.5 py-0.5 font-mono">{k} {v}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CourseLearnPage() {
  const { slug } = useParams<{ slug: string }>()
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const [data, setData] = useState<CourseLearn | null>(null)
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = () => courseApi.learn(slug ?? '', token).then((d) => {
    setData(d)
    setActiveLessonId((prev) => prev ?? d.lessons[0]?.id ?? null)
  }).catch(() => setError('Доступ к курсу не найден'))

  useEffect(() => { load() }, [slug, token])

  const activeLesson = useMemo(() => data?.lessons.find((l) => l.id === activeLessonId) ?? null, [data, activeLessonId])
  const completed = new Set(data?.completed_lesson_ids ?? [])
  const progress = data?.student.progress_percent ?? 0

  const complete = async () => {
    if (!activeLesson) return
    await courseApi.completeLesson(activeLesson.id, token)
    load()
  }

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-80 bg-white border-r h-screen sticky top-0 overflow-y-auto">
        <div className="p-5 border-b">
          <h1 className="font-bold text-lg">{data.course.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{data.student.name}</p>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{progress}% пройдено</p>
        </div>
        <div className="p-3 space-y-4">
          {data.modules.map((module) => (
            <div key={module.id}>
              <p className="text-xs font-bold text-gray-500 uppercase px-2 mb-1">{module.title}</p>
              {(data.lessons.filter((l) => l.module_id === module.id)).map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={`w-full flex items-center gap-2 text-left rounded-lg px-2 py-2 text-sm ${activeLessonId === lesson.id ? 'bg-brand text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  {completed.has(lesson.id) ? <CheckCircle size={16} /> : lesson.lesson_type === 'video' ? <PlayCircle size={16} /> : <Circle size={16} />}
                  <span className="truncate">{lesson.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>
      <main className="flex-1 p-8">
        {activeLesson ? (
          <div className="max-w-4xl mx-auto">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                <p className="text-sm text-gray-400">{activeLesson.lesson_type === 'video' ? 'Видео-урок' : 'Текстовый урок'}</p>
              </div>
              <button onClick={complete} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-semibold">
                {completed.has(activeLesson.id) ? 'Пройдено' : 'Отметить пройденным'}
              </button>
            </div>
            {activeLesson.lesson_type === 'video' ? <VideoLesson lesson={activeLesson} /> : null}
            {activeLesson.content && <div className="bg-white border rounded-xl p-6 mt-5 whitespace-pre-wrap leading-relaxed">{activeLesson.content}</div>}
          </div>
        ) : (
          <div className="text-center text-gray-400 mt-20">В курсе пока нет уроков</div>
        )}
      </main>
    </div>
  )
}
