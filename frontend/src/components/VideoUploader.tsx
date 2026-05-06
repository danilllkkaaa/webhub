import { useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Film } from 'lucide-react'
import { videoApi } from '../api/videos'

interface Props {
  title: string
  onComplete: (videoId: string) => void
  existingVideoId?: string | null
}

type Stage = 'idle' | 'uploading' | 'encoding' | 'done' | 'error'

export default function VideoUploader({ title, onComplete, existingVideoId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>(existingVideoId ? 'done' : 'idle')
  const [uploadPct, setUploadPct] = useState(0)
  const [encodePct, setEncodePct] = useState(0)
  const [error, setError] = useState('')
  const [videoId, setVideoId] = useState(existingVideoId ?? '')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => { if (pollRef.current) clearInterval(pollRef.current) }

  const pollStatus = (vid: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const s = await videoApi.status(vid)
        setEncodePct(s.encode_progress)
        if (s.ready) {
          stopPoll()
          setStage('done')
          onComplete(vid)
        }
        if (s.status === 5 || s.status === 6) {
          stopPoll()
          setStage('error')
          setError('Ошибка кодирования видео')
        }
      } catch {}
    }, 3000)
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Выберите видео-файл')
      return
    }
    setError('')
    setStage('uploading')
    setUploadPct(0)
    try {
      const info = await videoApi.create(title || file.name)
      setVideoId(info.video_id)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.open('PUT', info.upload_url)
        xhr.setRequestHeader('AccessKey', info.access_key)
        xhr.send(file)
      })

      setStage('encoding')
      setEncodePct(0)
      pollStatus(info.video_id)
    } catch (e: any) {
      setStage('error')
      setError(e?.message ?? 'Ошибка загрузки')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (stage === 'done') {
    return (
      <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl px-4 py-3">
        <CheckCircle size={18} className="text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800">Видео загружено</p>
          <p className="text-xs text-green-600 font-mono truncate">{videoId}</p>
        </div>
        <button
          onClick={() => { setStage('idle'); setVideoId(''); setUploadPct(0); setEncodePct(0) }}
          className="text-xs text-green-600 hover:text-green-800 underline shrink-0"
        >
          Заменить
        </button>
      </div>
    )
  }

  if (stage === 'uploading') {
    return (
      <div className="border rounded-xl px-4 py-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Загрузка на Bunny...</span>
          <span className="font-mono font-semibold text-brand">{uploadPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
        </div>
      </div>
    )
  }

  if (stage === 'encoding') {
    return (
      <div className="border rounded-xl px-4 py-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-2">
            <Film size={14} className="animate-pulse text-brand" /> Кодирование...
          </span>
          <span className="font-mono font-semibold text-brand">{encodePct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand/60 rounded-full transition-all duration-500" style={{ width: `${encodePct}%` }} />
        </div>
        <p className="text-xs text-gray-400">Это может занять несколько минут</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand/50 hover:bg-brand-light/30 transition-colors"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={24} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">Перетащите видео или нажмите для выбора</p>
        <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI — до нескольких ГБ</p>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-600 text-xs">
          <AlertCircle size={13} /> {error}
        </div>
      )}
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}
