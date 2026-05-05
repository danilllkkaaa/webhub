import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { courseApi, Course } from '../../api/courses'
import { BookOpen, Plus, Pencil, Trash2, Link2, Users, Layers } from 'lucide-react'

const STATUS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
}

export default function CourseListPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<number | null>(null)

  const load = () => courseApi.list().then(setCourses).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const copyLink = (course: Course) => {
    navigator.clipboard.writeText(`${window.location.origin}/course/join/${course.invite_token}`)
    setCopied(course.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const remove = async (id: number) => {
    if (!confirm('Удалить курс?')) return
    await courseApi.delete(id)
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Онлайн-курсы</h1>
          <p className="text-sm text-gray-400">Курсы, уроки, ученики и прогресс прохождения</p>
        </div>
        <Link to="/admin/courses/new" className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-dark">
          <Plus size={16} /> Создать курс
        </Link>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Загрузка...</div>
        ) : courses.length === 0 ? (
          <div className="p-16 text-center">
            <BookOpen size={44} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Курсов пока нет</p>
            <Link to="/admin/courses/new" className="inline-flex mt-4 bg-brand text-white rounded-lg px-4 py-2 text-sm">
              Создать первый курс
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/admin/courses/${course.id}/builder`)}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
              >
                <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold truncate">{course.title}</h2>
                    <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{STATUS[course.status]}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><Layers size={13} /> {course.module_count} мод. / {course.lesson_count} ур.</span>
                    <span className="flex items-center gap-1"><Users size={13} /> {course.student_count} учеников</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); copyLink(course) }}
                  className="text-xs border rounded-lg px-3 py-2 hover:bg-gray-100 flex items-center gap-1"
                >
                  <Link2 size={14} /> {copied === course.id ? 'Скопировано' : 'Ссылка'}
                </button>
                <Link
                  onClick={(e) => e.stopPropagation()}
                  to={`/admin/courses/${course.id}/students`}
                  className="text-xs border rounded-lg px-3 py-2 hover:bg-gray-100"
                >
                  Ученики
                </Link>
                <Link
                  onClick={(e) => e.stopPropagation()}
                  to={`/admin/courses/${course.id}/settings`}
                  className="p-2 text-gray-400 hover:text-brand"
                  title="Настройки"
                >
                  <Pencil size={16} />
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(course.id) }}
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
