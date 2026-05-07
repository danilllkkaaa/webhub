import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, GraduationCap, Loader2, Lock, Mail, Phone, User } from 'lucide-react'
import { Course, courseApi } from '../../api/courses'
import { useStudentAuth } from '../../store/studentAuth'

export default function CourseJoinPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>()
  const navigate = useNavigate()
  const setAuth = useStudentAuth((state) => state.setAuth)

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    telegram: '',
  })

  useEffect(() => {
    if (!inviteToken) return
    courseApi.invite(inviteToken)
      .then(setCourse)
      .finally(() => setLoading(false))
  }, [inviteToken])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'register') {
        await courseApi.join(inviteToken!, form)
        const registrations = await courseApi.studentLogin({ email: form.email, password: form.password })
        setAuth(form.email, registrations)
      } else {
        const registrations = await courseApi.studentLogin({ email: form.email, password: form.password })
        setAuth(form.email, registrations)

        const hasThisCourse = registrations.some((registration) => registration.course_id === course?.id)
        if (!hasThisCourse && inviteToken) {
          await courseApi.join(inviteToken, {
            ...form,
            name: registrations[0].name,
            phone: registrations[0].phone,
          })
          const updatedRegistrations = await courseApi.studentLogin({ email: form.email, password: form.password })
          setAuth(form.email, updatedRegistrations)
        }
      }
      navigate('/student/dashboard')
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка входа или регистрации')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
  }

  if (!course) {
    return <div className="flex min-h-screen items-center justify-center font-bold text-red-500">Курс не найден</div>
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden bg-gray-900 p-8 text-white md:w-1/2 md:p-16">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/40">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">StudentHub</h1>
          </div>
          <div className="max-w-lg space-y-6">
            <h2 className="text-4xl font-black italic leading-tight md:text-5xl">{course.title}</h2>
            <p className="text-lg leading-relaxed text-gray-400">{course.description || 'Присоединяйтесь к StudentHub.'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white p-8 md:w-1/2 md:p-16">
        <div className="w-full max-w-md space-y-10">
          <div>
            <h3 className="mb-2 text-3xl font-black text-gray-900">{mode === 'register' ? 'Начать обучение' : 'Вход в StudentHub'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400"><User size={14} className="text-brand" /> Полное имя</label>
                <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 font-semibold outline-none transition focus:border-brand" placeholder="Иван Иванов" />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400"><Mail size={14} className="text-brand" /> Email адрес</label>
              <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 font-semibold outline-none transition focus:border-brand" placeholder="example@mail.com" />
            </div>
            {mode === 'register' ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400"><Phone size={14} className="text-brand" /> Телефон</label>
                <input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 font-semibold outline-none transition focus:border-brand" placeholder="+7" />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400"><Lock size={14} className="text-brand" /> Пароль</label>
              <input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 font-semibold outline-none transition focus:border-brand" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 py-5 text-lg font-black text-white shadow-xl shadow-gray-200 transition-all hover:bg-brand disabled:opacity-50">
              {submitting ? 'Обработка...' : mode === 'register' ? 'Зарегистрироваться' : 'Войти в кабинет'}
              {!submitting ? <ChevronRight size={20} /> : null}
            </button>
          </form>
          <div className="flex flex-col items-center gap-4 border-t border-gray-100 pt-6">
            <button onClick={() => setMode(mode === 'register' ? 'login' : 'register')} className="font-black text-brand hover:underline">
              {mode === 'register' ? 'Войти в StudentHub' : 'Зарегистрироваться на курс'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
