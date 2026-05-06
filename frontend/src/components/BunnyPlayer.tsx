import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import {
  Play, Pause, Volume1, Volume2, VolumeX,
  Maximize, Minimize, RotateCcw, RotateCw,
} from 'lucide-react'

const CDN = import.meta.env.VITE_BUNNY_CDN_HOSTNAME ?? ''

function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface Props {
  videoId: string
  onEnded?: () => void
  autoplay?: boolean
}

export default function BunnyPlayer({ videoId, onEnded, autoplay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [ctrlVisible, setCtrlVisible] = useState(true)

  const playingRef = useRef(false)
  const mutedRef = useRef(false)
  const volumeRef = useRef(80)
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { volumeRef.current = volume }, [volume])

  const src = `https://${CDN}/${videoId}/playlist.m3u8`

  useEffect(() => {
    const video = videoRef.current
    if (!video || !CDN) return

    const onCanPlay = () => { setReady(true); if (autoplay) video.play().catch(() => {}) }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)
    const onTimeUpdate = () => setCurrent(video.currentTime)
    const onDurationChange = () => setDuration(video.duration)
    const onEnded2 = () => { setPlaying(false); onEnded?.() }

    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('ended', onEnded2)

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src
    }

    video.volume = volume / 100

    return () => {
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('ended', onEnded2)
      hlsRef.current?.destroy()
    }
  }, [videoId, src])

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const v = videoRef.current
      if (!v) return
      if (e.code === 'Space') { e.preventDefault(); playingRef.current ? v.pause() : v.play() }
      if (e.code === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10) }
      if (e.code === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 10) }
      if (e.code === 'KeyM') { v.muted = !mutedRef.current; setMuted(!mutedRef.current) }
      if (e.code === 'KeyF') { fullscreen ? document.exitFullscreen() : containerRef.current?.requestFullscreen() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fullscreen])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setCtrlVisible(false), 3000)
  }, [])

  const revealControls = useCallback(() => { setCtrlVisible(true); scheduleHide() }, [scheduleHide])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    playing ? v.pause() : v.play()
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !duration) return
    const r = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - r.left) / r.width) * duration
  }

  const handleVolume = (val: number) => {
    const v = videoRef.current
    if (!v) return
    setVolume(val)
    v.volume = val / 100
    if (val === 0) { v.muted = true; setMuted(true) }
    else { v.muted = false; setMuted(false) }
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !muted
    setMuted(!muted)
    if (muted && volume === 0) { handleVolume(50) }
  }

  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative bg-black select-none rounded-xl overflow-hidden"
      style={fullscreen ? { height: '100vh', borderRadius: 0 } : { paddingBottom: '56.25%' }}
      onMouseMove={revealControls}
      onMouseEnter={revealControls}
      onMouseLeave={() => setCtrlVisible(false)}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        playsInline
      />

      {/* Loading */}
      {!ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="w-11 h-11 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Buffering */}
      {buffering && ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-[3px] border-white/40 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Big play/pause on click */}
      {ready && (
        <div className="absolute inset-0 z-10" onClick={togglePlay} />
      )}

      {/* Pause overlay */}
      {!playing && ready && !buffering && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-[72px] h-[72px] bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${ctrlVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-10 pb-3">
          {/* Progress bar */}
          <div
            className="relative w-full h-5 flex items-center cursor-pointer group/bar mb-2"
            onClick={seek}
          >
            <div className="absolute left-0 right-0 h-1 group-hover/bar:h-[5px] transition-all duration-150 rounded-full bg-white/20">
              <div className="absolute inset-y-0 left-0 bg-brand rounded-full" style={{ width: `${pct}%` }}>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover/bar:scale-100 transition-transform" />
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white">
              {playing ? <Pause className="w-[18px] h-[18px]" fill="currentColor" /> : <Play className="w-[18px] h-[18px]" fill="currentColor" />}
            </button>

            {/* Skip buttons */}
            <button
              onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10) }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              <RotateCcw className="w-[16px] h-[16px]" />
            </button>
            <button
              onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10) }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              <RotateCw className="w-[16px] h-[16px]" />
            </button>

            {/* Time */}
            <span className="text-white/60 text-xs font-mono tabular-nums">
              {fmt(current)} / {fmt(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                <VolumeIcon className="w-[18px] h-[18px]" />
              </button>
              <div
                className="relative w-20 h-5 flex items-center cursor-pointer group/vol"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  handleVolume(Math.round(((e.clientX - r.left) / r.width) * 100))
                }}
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
    </div>
  )
}
