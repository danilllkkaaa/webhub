import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Layers, Link2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { Course, courseApi } from '../../api/courses'

const STATUS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
}

export default function CourseListPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const load = () => courseApi.list().then(setCourses).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const copyLink = (course: Course) => {
    navigator.clipboard.writeText(`${window.location.origin}/course/join/${course.invite_token}`)
    setCopied(course.public_id)
    setTimeout(() => setCopied(null), 1500)
  }

  const remove = async (course: Course) => {
    if (!confirm('Удалить курс?')) return
    await courseApi.delete(course.public_id)
    setCourses((prev) => prev.filter((item) => item.id !== course.id))
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Онлайн-курсы</h1>
          <p className="text-sm text-gray-400">Курсы, уроки, ученики и прогресс прохождения</p>
        </div>
        <Link to="/admin/courses/new" className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          <Plus size={16} /> Создать курс
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Загрузка...</div>
        ) : courses.length === 0 ? (
          <div className="p-16 text-center">
            <BookOpen size={44} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-500">Курсов пока нет</p>
            <Link to="/admin/courses/new" className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm text-white">
              Создать первый курс
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/admin/courses/${course.public_id}/builder`)}
                className="flex cursor-pointer items-center gap-4 p-4 hover:bg-gray-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <BookOpen size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold">{course.title}</h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{STATUS[course.status]}</span>
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-400">#{course.public_id}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Layers size={13} /> {course.module_count} мод. / {course.lesson_count} ур.</span>
                    <span className="flex items-center gap-1"><Users size={13} /> {course.student_count} учеников</span>
                  </div>
                </div>
                <button
                  onClick={(event) => { event.stopPropagation(); copyLink(course) }}
                  className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs hover:bg-gray-100"
                >
                  <Link2 size={14} /> {copied === course.public_id ? 'Скопировано' : 'Ссылка'}
                </button>
                <Link
                  onClick={(event) => event.stopPropagation()}
                  to={`/admin/courses/${course.public_id}/students`}
                  className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-100"
                >
                  Ученики
                </Link>
                <Link
                  onClick={(event) => event.stopPropagation()}
                  to={`/admin/courses/${course.public_id}/settings`}
                  className="p-2 text-gray-400 hover:text-brand"
                  title="Настройки"
                >
                  <Pencil size={16} />
                </Link>
                <button
                  onClick={(event) => { event.stopPropagation(); remove(course) }}
                  className="p-2 text-gray-400 hover:text-red-500"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
