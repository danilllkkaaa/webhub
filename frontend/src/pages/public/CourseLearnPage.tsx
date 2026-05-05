import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CourseLearn, CourseLesson, courseApi } from '../../api/courses'
import { CheckCircle, Circle, PlayCircle } from 'lucide-react'

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void }
}

function VideoLesson({ lesson }: { lesson: CourseLesson }) {
  const playerDivRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)

  useEffect(() => {
    if (!lesson.video_id) return
    const load = () => {
      if (!playerDivRef.current) return
      playerRef.current = new window.YT.Player(playerDivRef.current, {
        videoId: lesson.video_id,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, origin: window.location.origin },
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
  }, [lesson.id, lesson.video_id])

  if (!lesson.video_id) return <div className="bg-gray-900 text-gray-400 rounded-xl p-10 text-center">Видео не добавлено</div>
  return (
    <div className="relative bg-black rounded-xl overflow-hidden select-none" style={{ paddingBottom: '56.25%' }}>
      <div ref={playerDivRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 z-10" aria-hidden="true" onPointerDown={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()} />
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
