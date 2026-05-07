import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Award, BookOpen, CheckCircle2, ChevronRight, Clock, GraduationCap, LayoutDashboard } from 'lucide-react'
import { courseApi, StudentDashboard, StudentDashboardCourse } from '../../api/courses'
import { useStudentAuth } from '../../store/studentAuth'

export default function StudentDashboardPage() {
  const navigate = useNavigate()
  const { email, registrations, logout } = useStudentAuth()
  const [data, setData] = useState<StudentDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tokens = registrations.map((registration) => registration.token).filter(Boolean)
    if (!email || tokens.length === 0) {
      logout()
      navigate('/')
      return
    }

    courseApi.studentDashboard(tokens)
      .then(setData)
      .catch(() => {
        logout()
        navigate('/')
      })
      .finally(() => setLoading(false))
  }, [email, registrations, logout, navigate])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Загрузка кабинета...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/20">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">StudentHub</h1>
              <p className="text-[10px] font-bold uppercase leading-none tracking-widest text-gray-400">Личный кабинет</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-gray-900">{email}</p>
              <button onClick={() => { logout(); navigate('/') }} className="text-xs font-bold text-red-500 hover:underline">Выйти</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard icon={<BookOpen size={28} />} color="blue" value={data?.stats.total_courses || 0} label="Курсов" />
          <StatCard icon={<CheckCircle2 size={28} />} color="green" value={data?.stats.total_completed_lessons || 0} label="Уроков" />
          <StatCard icon={<Award size={28} />} color="orange" value={`${data?.stats.avg_global_score || 0}%`} label="Балл" />
        </div>

        <div className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-black text-gray-900"><LayoutDashboard className="text-brand" /> Моё обучение</h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {data?.courses.map((item: StudentDashboardCourse) => (
              <div key={item.course.id} className="group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand/5 sm:flex-row">
                <div className="relative h-48 w-full shrink-0 bg-gray-100 sm:w-48">
                  {item.course.cover_url ? <img src={item.course.cover_url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-gray-300"><BookOpen size={48} /></div>}
                  {item.registration.status === 'pending' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4 text-center backdrop-blur-[2px]">
                      <Clock className="mb-2 text-orange-400" size={32} />
                      <p className="text-xs font-black uppercase tracking-widest text-white">Ожидает<br />подтверждения</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-black leading-tight text-gray-900 transition group-hover:text-brand">{item.course.title}</h3>
                    <p className="line-clamp-2 text-sm text-gray-500">{item.course.description || 'Нет описания'}</p>
                  </div>
                  <div className="mt-6 space-y-4 border-t pt-6">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-gray-400">Прогресс</span>
                      <span className="text-gray-900">{item.registration.progress_percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-brand transition-all duration-500" style={{ width: `${item.registration.progress_percent}%` }} />
                    </div>
                    {item.registration.status === 'approved' ? (
                      <button onClick={() => navigate(`/course/${item.course.slug}/learn?token=${item.registration.token}`)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-bold text-white shadow-lg shadow-gray-200 transition hover:bg-brand">
                        Продолжить <ChevronRight size={16} />
                      </button>
                    ) : (
                      <div className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-50 py-3 font-bold text-gray-400">
                        <AlertCircle size={16} /> Доступ ограничен
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, color, value, label }: { icon: React.ReactNode; color: 'blue' | 'green' | 'orange'; value: string | number; label: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-500',
    orange: 'bg-orange-50 text-orange-500',
  }
  return (
    <div className="flex items-center gap-5 rounded-2xl border bg-white p-6 shadow-sm">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-3xl font-black text-gray-900">{value}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
    </div>
  )
}
