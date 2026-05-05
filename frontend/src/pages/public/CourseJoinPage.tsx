import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { courseApi, Course } from '../../api/courses'
import { BookOpen } from 'lucide-react'

export default function CourseJoinPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', telegram: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    courseApi.invite(inviteToken ?? '').then(setCourse).catch(() => setError('Курс не найден'))
  }, [inviteToken])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!course || !inviteToken) return
    setLoading(true)
    setError('')
    try {
      const student = await courseApi.join(inviteToken, form)
      navigate(`/course/${course.slug}/learn?token=${student.token}`)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Не удалось открыть курс')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3"><BookOpen size={28} /></div>
          {course && <p className="text-sm text-gray-500 text-center">{course.title}</p>}
          <h1 className="text-xl font-bold mt-1 text-center">Вход в курс</h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input className="input" required placeholder="ФИО" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" required placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Telegram" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={loading || !course} className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">
            {loading ? 'Открываем...' : 'Перейти к курсу'}
          </button>
        </form>
      </div>
      <style>{`.input{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:.875rem}`}</style>
    </div>
  )
}
