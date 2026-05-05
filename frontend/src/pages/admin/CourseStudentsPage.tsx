import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { CourseStudent, courseApi } from '../../api/courses'
import { Download } from 'lucide-react'

export default function CourseStudentsPage() {
  const { id } = useParams<{ id: string }>()
  const courseId = Number(id)
  const [students, setStudents] = useState<CourseStudent[]>([])

  useEffect(() => { courseApi.students(courseId).then(setStudents) }, [courseId])

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
          <p className="text-sm text-gray-400">Контакты и прогресс прохождения</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/courses/${courseId}/builder`} className="border rounded-lg px-4 py-2 text-sm">Конструктор</Link>
          <button onClick={exportExcel} className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm"><Download size={16} /> Excel</button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left p-3">ФИО</th>
              <th className="text-left p-3">Телефон</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Прогресс</th>
              <th className="text-left p-3">Дата входа</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.phone}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.completed_lessons}/{s.total_lessons} · {s.progress_percent}%</td>
                <td className="p-3 text-gray-500">{new Date(s.created_at).toLocaleString('ru-RU')}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400">Учеников пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
