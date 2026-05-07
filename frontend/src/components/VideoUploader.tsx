import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle, Film, Upload } from 'lucide-react'
import { videoApi } from '../api/videos'

interface Props {
  title: string
  onComplete: (videoId: string) => void
  existingVideoId?: string | null
}

type Stage = 'idle' | 'uploading' | 'encoding' | 'done' | 'error'

export default function VideoUploader({ title, onComplete, existingVideoId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [stage, setStage] = useState<Stage>(existingVideoId ? 'done' : 'idle')
  const [uploadPct, setUploadPct] = useState(0)
  const [encodePct, setEncodePct] = useState(0)
  const [error, setError] = useState('')
  const [videoId, setVideoId] = useState(existingVideoId ?? '')

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    stopPoll()
    setStage(existingVideoId ? 'done' : 'idle')
    setVideoId(existingVideoId ?? '')
    setUploadPct(0)
    setEncodePct(0)
    setError('')

    return stopPoll
  }, [existingVideoId])

  const pollStatus = (id: string) => {
    stopPoll()
    let attempts = 0
    const maxAttempts = 200

    pollRef.current = setInterval(async () => {
      attempts += 1
      if (attempts > maxAttempts) {
        stopPoll()
        setStage('error')
        setError('Превышено время подготовки видео')
        return
      }

      try {
        const status = await videoApi.status(id)
        setEncodePct(status.encode_progress)
        if (status.ready) {
          stopPoll()
          setStage('done')
          onComplete(id)
        } else if (status.status === 5 || status.status === 6) {
          stopPoll()
          setStage('error')
          setError('Не удалось подготовить видео')
        }
      } catch {
        // Network hiccups during processing are common; keep polling until timeout.
      }
    }, 3000)
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Выберите видеофайл')
      return
    }

    stopPoll()
    setError('')
    setStage('uploading')
    setUploadPct(0)
    setEncodePct(0)

    try {
      const info = await videoApi.create(title || file.name)
      setVideoId(info.video_id)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) setUploadPct(Math.round((event.loaded / event.total) * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error('Upload failed'))
        })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.open('PUT', info.upload_url)
        xhr.setRequestHeader('AccessKey', info.access_key)
        xhr.send(file)
      })

      setStage('encoding')
      pollStatus(info.video_id)
    } catch {
      stopPoll()
      setStage('error')
      setError('Не удалось загрузить видео')
    }
  }

  const reset = () => {
    stopPoll()
    setStage('idle')
    setVideoId('')
    setUploadPct(0)
    setEncodePct(0)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (stage === 'done') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle size={18} className="shrink-0 text-green-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-green-800">Видео загружено</p>
          <p className="truncate font-mono text-xs text-green-600">{videoId}</p>
        </div>
        <button type="button" onClick={reset} className="shrink-0 text-xs text-green-600 underline hover:text-green-800">
          Заменить
        </button>
      </div>
    )
  }

  if (stage === 'uploading') {
    return (
      <div className="space-y-2 rounded-xl border px-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Загрузка видео...</span>
          <span className="font-mono font-semibold text-brand">{uploadPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${uploadPct}%` }} />
        </div>
      </div>
    )
  }

  if (stage === 'encoding') {
    return (
      <div className="space-y-2 rounded-xl border px-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <Film size={14} className="animate-pulse text-brand" /> Подготовка видео...
          </span>
          <span className="font-mono font-semibold text-brand">{encodePct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand/60 transition-all duration-500" style={{ width: `${encodePct}%` }} />
        </div>
        <p className="text-xs text-gray-400">Это может занять несколько минут</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-6 text-center transition-colors hover:border-brand/50 hover:bg-brand-light/30"
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={24} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">Перетащите видео или нажмите для выбора</p>
        <p className="mt-1 text-xs text-gray-400">MP4, MOV, AVI - до нескольких ГБ</p>
      </div>
      {error ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={13} /> {error}
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
