import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { CourseLesson, CourseModule, courseApi } from '../../api/courses'
import { BookOpen, Plus, Trash2 } from 'lucide-react'

export default function CourseBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const courseId = Number(id)
  const [courseTitle, setCourseTitle] = useState('')
  const [modules, setModules] = useState<CourseModule[]>([])
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [moduleTitle, setModuleTitle] = useState('')
  const [lessonDraft, setLessonDraft] = useState<Record<number, { title: string; lesson_type: 'video' | 'text'; video_url: string; content: string }>>({})

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

  const addModule = async (e: FormEvent) => {
    e.preventDefault()
    if (!moduleTitle.trim()) return
    await courseApi.createModule(courseId, { title: moduleTitle.trim(), position: modules.length })
    setModuleTitle('')
    load()
  }

  const addLesson = async (moduleId: number) => {
    const draft = lessonDraft[moduleId]
    if (!draft?.title?.trim()) return
    await courseApi.createLesson(moduleId, {
      title: draft.title.trim(),
      lesson_type: draft.lesson_type,
      video_url: draft.video_url || undefined,
      content: draft.content || undefined,
      position: lessonsByModule[moduleId]?.length ?? 0,
    })
    setLessonDraft({ ...lessonDraft, [moduleId]: { title: '', lesson_type: 'video', video_url: '', content: '' } })
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
          <Link to={`/admin/courses/${courseId}/students`} className="border rounded-lg px-4 py-2 text-sm">Ученики</Link>
          <Link to={`/admin/courses/${courseId}/settings`} className="border rounded-lg px-4 py-2 text-sm">Настройки</Link>
        </div>
      </div>

      <form onSubmit={addModule} className="bg-white border rounded-xl p-4 mb-5 flex gap-3">
        <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} className="input flex-1" placeholder="Название нового модуля" />
        <button className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2"><Plus size={16} /> Модуль</button>
      </form>

      <div className="space-y-4">
        {modules.length === 0 && (
          <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
            <BookOpen size={42} className="mx-auto mb-3 text-gray-200" />
            Добавьте первый модуль курса
          </div>
        )}
        {modules.map((module) => {
          const draft = lessonDraft[module.id] ?? { title: '', lesson_type: 'video' as const, video_url: '', content: '' }
          return (
            <div key={module.id} className="bg-white border rounded-xl overflow-hidden">
              <div className="p-4 border-b flex items-center gap-3">
                <div className="flex-1">
                  <h2 className="font-semibold">{module.title}</h2>
                  <p className="text-xs text-gray-400">{lessonsByModule[module.id]?.length ?? 0} уроков</p>
                </div>
                <button onClick={() => courseApi.deleteModule(module.id).then(load)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
              <div className="divide-y">
                {(lessonsByModule[module.id] ?? []).map((lesson) => (
                  <div key={lesson.id} className="p-4 flex gap-3 items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{lesson.title}</p>
                      <p className="text-xs text-gray-400">{lesson.lesson_type === 'video' ? 'Видео' : 'Текст'} {lesson.video_id ? `· ${lesson.video_id}` : ''}</p>
                      {lesson.content && <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{lesson.content}</p>}
                    </div>
                    <button onClick={() => courseApi.deleteLesson(lesson.id).then(load)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-3">
                <input className="input md:col-span-2" placeholder="Название урока" value={draft.title} onChange={(e) => setLessonDraft({ ...lessonDraft, [module.id]: { ...draft, title: e.target.value } })} />
                <select className="input" value={draft.lesson_type} onChange={(e) => setLessonDraft({ ...lessonDraft, [module.id]: { ...draft, lesson_type: e.target.value as 'video' | 'text' } })}>
                  <option value="video">Видео</option>
                  <option value="text">Текст</option>
                </select>
                <button onClick={() => addLesson(module.id)} className="bg-brand text-white rounded-lg text-sm font-semibold">Добавить урок</button>
                {draft.lesson_type === 'video' ? (
                  <input className="input md:col-span-4" placeholder="YouTube URL" value={draft.video_url} onChange={(e) => setLessonDraft({ ...lessonDraft, [module.id]: { ...draft, video_url: e.target.value } })} />
                ) : (
                  <textarea className="input md:col-span-4 min-h-24" placeholder="Текст урока" value={draft.content} onChange={(e) => setLessonDraft({ ...lessonDraft, [module.id]: { ...draft, content: e.target.value } })} />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <style>{`.input{border:1px solid #d1d5db;border-radius:8px;padding:9px 12px;font-size:.875rem;background:white}`}</style>
    </AdminLayout>
  )
}
