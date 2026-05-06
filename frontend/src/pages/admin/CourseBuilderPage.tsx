import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { CourseLesson, CourseModule, courseApi } from '../../api/courses'
import VideoUploader from '../../components/VideoUploader'
import { BookOpen, Plus, Trash2, Video, FileText } from 'lucide-react'

interface LessonDraft {
  title: string
  lesson_type: 'video' | 'text'
  bunny_video_id: string
  content: string
}

const defaultDraft = (): LessonDraft => ({ title: '', lesson_type: 'video', bunny_video_id: '', content: '' })

export default function CourseBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const courseId = Number(id)
  const [courseTitle, setCourseTitle] = useState('')
  const [modules, setModules] = useState<CourseModule[]>([])
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [moduleTitle, setModuleTitle] = useState('')
  const [lessonDraft, setLessonDraft] = useState<Record<number, LessonDraft>>({})

  const load = () => courseApi.structure(courseId).then((data) => {
    setCourseTitle(data.course.title)
    setModules(data.modules)
    setLessons(data.lessons)
  })
  useEffect(() => { load() }, [courseId])

  const lessonsByModule = useMemo(() => {
    const map: Record<number, CourseLesson[]> = {}
    lessons.forEach((lesson) => {
      map[lesson.module_id] = [...(map[lesson.module_id] ?? []), lesson]
    })
    return map
  }, [lessons])

  const draft = (moduleId: number): LessonDraft => lessonDraft[moduleId] ?? defaultDraft()
  const setDraft = (moduleId: number, patch: Partial<LessonDraft>) =>
    setLessonDraft((prev) => ({ ...prev, [moduleId]: { ...draft(moduleId), ...patch } }))

  const addModule = async (e: FormEvent) => {
    e.preventDefault()
    if (!moduleTitle.trim()) return
    await courseApi.createModule(courseId, { title: moduleTitle.trim(), position: modules.length })
    setModuleTitle('')
    load()
  }

  const addLesson = async (moduleId: number) => {
    const d = draft(moduleId)
    if (!d.title.trim()) return
    if (d.lesson_type === 'video' && !d.bunny_video_id) return

    await courseApi.createLesson(moduleId, {
      title: d.title.trim(),
      lesson_type: d.lesson_type,
      bunny_video_id: d.lesson_type === 'video' ? d.bunny_video_id : undefined,
      content: d.lesson_type === 'text' ? d.content : undefined,
      position: lessonsByModule[moduleId]?.length ?? 0,
    })
    setDraft(moduleId, defaultDraft())
    load()
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Конструктор курса</h1>
          <p className="text-sm text-gray-400">{courseTitle}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/courses/${courseId}/students`} className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition">Ученики</Link>
          <Link to={`/admin/courses/${courseId}/settings`} className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition">Настройки</Link>
        </div>
      </div>

      <form onSubmit={addModule} className="bg-white border rounded-xl p-4 mb-5 flex gap-3">
        <input
          value={moduleTitle}
          onChange={(e) => setModuleTitle(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="Название нового модуля"
        />
        <button className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:bg-brand-dark transition">
          <Plus size={16} /> Модуль
        </button>
      </form>

      <div className="space-y-4">
        {modules.length === 0 && (
          <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
            <BookOpen size={42} className="mx-auto mb-3 text-gray-200" />
            Добавьте первый модуль курса
          </div>
        )}

        {modules.map((module) => {
          const d = draft(module.id)
          return (
            <div key={module.id} className="bg-white border rounded-xl overflow-hidden">
              {/* Module header */}
              <div className="p-4 border-b flex items-center gap-3 bg-gray-50">
                <div className="flex-1">
                  <h2 className="font-semibold text-sm">{module.title}</h2>
                  <p className="text-xs text-gray-400">{lessonsByModule[module.id]?.length ?? 0} уроков</p>
                </div>
                <button
                  onClick={() => courseApi.deleteModule(module.id).then(load)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Lesson list */}
              <div className="divide-y">
                {(lessonsByModule[module.id] ?? []).map((lesson) => (
                  <div key={lesson.id} className="p-4 flex gap-3 items-start">
                    <div className="mt-0.5 text-gray-300">
                      {lesson.lesson_type === 'video' ? <Video size={15} /> : <FileText size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{lesson.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {lesson.lesson_type === 'video' ? 'Видео' : 'Текст'}
                        {lesson.bunny_video_id && (
                          <span className="ml-2 font-mono text-brand">Bunny: {lesson.bunny_video_id.slice(0, 8)}…</span>
                        )}
                        {!lesson.bunny_video_id && lesson.video_id && (
                          <span className="ml-2 font-mono text-gray-400">YT: {lesson.video_id}</span>
                        )}
                      </p>
                      {lesson.content && <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap line-clamp-2">{lesson.content}</p>}
                    </div>
                    <button
                      onClick={() => courseApi.deleteLesson(lesson.id).then(load)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add lesson form */}
              <div className="p-4 bg-gray-50 border-t space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    className="sm:col-span-2 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="Название урока"
                    value={d.title}
                    onChange={(e) => setDraft(module.id, { title: e.target.value })}
                  />
                  <select
                    className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                    value={d.lesson_type}
                    onChange={(e) => setDraft(module.id, { lesson_type: e.target.value as 'video' | 'text' })}
                  >
                    <option value="video">Видео</option>
                    <option value="text">Текст</option>
                  </select>
                </div>

                {d.lesson_type === 'video' ? (
                  <VideoUploader
                    title={d.title || 'Урок'}
                    existingVideoId={d.bunny_video_id || null}
                    onComplete={(vid) => setDraft(module.id, { bunny_video_id: vid })}
                  />
                ) : (
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 min-h-24"
                    placeholder="Текст урока"
                    value={d.content}
                    onChange={(e) => setDraft(module.id, { content: e.target.value })}
                  />
                )}

                <button
                  onClick={() => addLesson(module.id)}
                  disabled={!d.title.trim() || (d.lesson_type === 'video' && !d.bunny_video_id)}
                  className="w-full py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition disabled:opacity-40"
                >
                  Добавить урок
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </AdminLayout>
  )
}
