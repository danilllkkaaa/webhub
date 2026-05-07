import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { CourseStudent, CourseStudentStatus, courseApi } from '../../api/courses'
import { Check, Download, X } from 'lucide-react'

const STATUS_LABELS: Record<CourseStudentStatus, string> = {
  pending: 'Заявка',
  approved: 'Одобрен',
  rejected: 'Отклонен',
}

const STATUS_CLASSES: Record<CourseStudentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
}

export default function CourseStudentsPage() {
  const { id } = useParams<{ id: string }>()
  const courseId = id ?? ''
  const [students, setStudents] = useState<CourseStudent[]>([])
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const load = () => courseApi.students(courseId).then(setStudents)
  useEffect(() => { load() }, [courseId])

  const counts = useMemo(() => ({
    pending: students.filter((s) => s.status === 'pending').length,
    approved: students.filter((s) => s.status === 'approved').length,
    rejected: students.filter((s) => s.status === 'rejected').length,
  }), [students])

  const setStatus = async (student: CourseStudent, status: CourseStudentStatus) => {
    setLoadingId(student.id)
    try {
      const updated = await courseApi.updateStudentStatus(courseId, student.id, { status })
      setStudents((prev) => prev.map((item) => item.id === updated.id ? updated : item))
    } finally {
      setLoadingId(null)
    }
  }

  const exportExcel = async () => {
    const res = await courseApi.exportStudents(courseId)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `course_students_${courseId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ученики курса</h1>
          <p className="text-sm text-gray-400">Заявки, контакты и прогресс прохождения</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/courses/${courseId}/builder`} className="border rounded-lg px-4 py-2 text-sm">Конструктор</Link>
          <button onClick={exportExcel} className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm"><Download size={16} /> Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-400">Ожидают решения</p>
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-400">Одобрены</p>
          <p className="text-2xl font-bold text-emerald-700">{counts.approved}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-400">Отклонены</p>
          <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left p-3">ФИО</th>
              <th className="text-left p-3">Телефон</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Статус</th>
              <th className="text-left p-3">Прогресс</th>
              <th className="text-left p-3">Дата заявки</th>
              <th className="text-right p-3">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.phone}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_CLASSES[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
                <td className="p-3">{s.completed_lessons}/{s.total_lessons} · {s.progress_percent}%</td>
                <td className="p-3 text-gray-500">{new Date(s.created_at).toLocaleString('ru-RU')}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {s.status !== 'approved' && (
                      <button
                        disabled={loadingId === s.id}
                        onClick={() => setStatus(s, 'approved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      >
                        <Check size={14} /> Одобрить
                      </button>
                    )}
                    {s.status !== 'rejected' && (
                      <button
                        disabled={loadingId === s.id}
                        onClick={() => setStatus(s, 'rejected')}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        <X size={14} /> Отклонить
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400">Заявок и учеников пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
