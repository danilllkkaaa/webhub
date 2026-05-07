import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { webinarApi, Webinar } from '../../api/webinars'
import { courseApi, Course } from '../../api/courses'
import { api } from '../../api/client'
import AdminLayout from '../../components/admin/AdminLayout'
import { useProjectStore } from '../../store/project'
import {
  ChevronRight, BarChart2, BookOpen, ShoppingCart,
  Users, TrendingUp, Award, ExternalLink, Radio, FileText, CreditCard,
} from 'lucide-react'

interface UserInfo { id: number; email: string; full_name: string | null }

function Widget({
  title, to, topRight, children, className = '',
}: {
  title: string; to?: string; topRight?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {to ? (
          <Link to={to} className="flex items-center gap-1 font-bold text-gray-900 hover:text-brand transition text-sm">
            {title} <ChevronRight size={15} className="mt-px opacity-50" />
          </Link>
        ) : (
          <span className="font-bold text-gray-900 text-sm">{title}</span>
        )}
        {topRight}
      </div>
      {children}
    </div>
  )
}

function StatBox({ value, label, sub, to, loading }: {
  value: React.ReactNode; label: string; sub?: string; to?: string; loading?: boolean
}) {
  const inner = loading ? (
    <div className="flex flex-col items-center gap-1.5">
      <div className="h-5 w-8 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
    </div>
  ) : (
    <>
      <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </>
  )
  if (to) {
    return (
      <Link to={to} className="bg-gray-50 rounded-xl p-3 text-center block hover:bg-brand-light hover:text-brand transition-colors border border-transparent hover:border-brand/10">
        {inner}
      </Link>
    )
  }
  return <div className="bg-gray-50 rounded-xl p-3 text-center">{inner}</div>
}

function PlaceholderBtn({ label }: { label: string }) {
  return (
    <button className="w-full mt-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition">
      {label}
    </button>
  )
}

function CourseStatusBadge({ status }: { status: Course['status'] }) {
  const map = {
    published: 'bg-green-100 text-green-700',
    draft:     'bg-amber-100 text-amber-700',
    archived:  'bg-gray-100 text-gray-500',
  }
  const label = { published: 'Опубликован', draft: 'Черновик', archived: 'Архив' }
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  )
}

export default function DashboardPage() {
  const { currentProjectName, currentProjectColor } = useProjectStore()
  const [webinars,  setWebinars]  = useState<Webinar[]>([])
  const [courses,   setCourses]   = useState<Course[]>([])
  const [user,      setUser]      = useState<UserInfo | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      webinarApi.list(),
      courseApi.list(),
      api.get<UserInfo>('/auth/me').then((r) => r.data),
    ]).then(([w, c, u]) => {
      setWebinars(w)
      setCourses(c)
      setUser(u)
    }).finally(() => setLoading(false))
  }, [])

  const total     = webinars.length
  const live      = webinars.filter((w) => w.status === 'live').length
  const scheduled = webinars.filter((w) => w.status === 'scheduled').length

  const projectLetter = currentProjectName?.[0]?.toUpperCase() ?? 'П'
  const userDisplay   = user?.full_name || user?.email || ''
  const userLetter    = userDisplay[0]?.toUpperCase() ?? '?'

  return (
    <AdminLayout>
      <div className="flex gap-5 items-start">

        {/* ── Left: main widgets ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Project header */}
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
              style={{ background: currentProjectColor ?? '#2D9A27' }}
            >
              {projectLetter}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{currentProjectName ?? 'Проект'}</h1>
              <p className="text-xs text-gray-400">Панель управления</p>
            </div>
          </div>

          {/* ── Row 1: Вебинары + Онлайн-курсы ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Вебинары */}
            <Widget
              title="Вебинары"
              to="/admin/webinars"
              topRight={
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={13} />
                  {loading
                    ? <span className="inline-block h-3 w-4 bg-gray-200 rounded animate-pulse" />
                    : total}
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <StatBox value={total}     sub="/ ∞" label="Комнаты"         to="/admin/webinars"               loading={loading} />
                <StatBox value={live}              label="Сейчас в эфире"  to="/admin/webinars?tab=live"       loading={loading} />
                <StatBox value={scheduled} sub="/ ∞" label="Запланировано" to="/admin/webinars?tab=scheduled" loading={loading} />
                <Link
                  to="/admin/webinars?tab=finished"
                  className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-brand-light transition-colors border border-transparent hover:border-brand/10"
                >
                  <FileText size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Отчёты</span>
                </Link>
              </div>
            </Widget>

            {/* Онлайн-курсы — реальные данные */}
            <Widget
              title="Онлайн-курсы"
              to="/admin/courses"
              topRight={
                loading
                  ? <span className="inline-block h-3 w-6 bg-gray-200 rounded animate-pulse" />
                  : courses.length > 0
                    ? <span className="text-xs text-gray-400 flex items-center gap-1"><BookOpen size={13} />{courses.length}</span>
                    : null
              }
            >
              {loading ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <StatBox key={i} value={0} label="" loading={true} />
                    ))}
                  </div>
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                    <BookOpen size={28} className="text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Настройте раздел, чтобы начать<br />создавать свои курсы
                  </p>
                  <Link
                    to="/admin/courses/new"
                    className="mt-4 px-6 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
                  >
                    Создать
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox
                      value={courses.length}
                      label="Всего курсов"
                      to="/admin/courses"
                      loading={false}
                    />
                    <StatBox
                      value={courses.filter((c) => c.status === 'published').length}
                      label="Опубликовано"
                      to="/admin/courses"
                      loading={false}
                    />
                    <StatBox
                      value={courses.reduce((s, c) => s + (c.student_count || 0), 0)}
                      label="Студентов"
                      to="/admin/courses"
                      loading={false}
                    />
                    <StatBox
                      value={courses.filter((c) => c.status === 'draft').length}
                      label="Черновики"
                      to="/admin/courses"
                      loading={false}
                    />
                  </div>

                  {/* Course list */}
                  <div className="space-y-1 pt-1 border-t border-gray-100">
                    {courses.slice(0, 3).map((c) => (
                      <Link
                        key={c.id}
                        to={`/admin/courses/${c.public_id}/builder`}
                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                          <p className="text-xs text-gray-400">
                            {c.lesson_count} ур. · {c.student_count} студ.
                          </p>
                        </div>
                        <CourseStatusBadge status={c.status} />
                      </Link>
                    ))}
                    {courses.length > 3 && (
                      <Link
                        to="/admin/courses"
                        className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-brand pt-1 transition"
                      >
                        Все {courses.length} курса <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </Widget>
          </div>

          {/* ── Row 2: Статистика + Сотрудники ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Статистика */}
            <Widget
              title="Статистика"
              to="/admin/coming-soon"
              topRight={<BarChart2 size={22} className="text-gray-200" />}
            >
              <p className="text-xs text-gray-400">За всё время</p>
              <div className="flex items-end gap-1 mt-3 h-10">
                {[2, 4, 3, 6, 5, 7, 4, 8, 5, 6, 9, 7].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h * 10}%`,
                      background: `color-mix(in srgb, #2D9A27 ${30 + h * 7}%, #e5e7eb)`,
                    }}
                  />
                ))}
              </div>
            </Widget>

            {/* Сотрудники — реальные данные */}
            <Widget title="Сотрудники" to="/admin/staff">
              {loading ? (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                    style={{ background: currentProjectColor ?? '#2D9A27' }}
                  >
                    {userLetter}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user?.full_name || user?.email || 'Владелец'}
                    </p>
                    {user?.full_name && (
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    )}
                  </div>
                  <span className="ml-auto text-xs bg-brand-light text-brand font-medium px-2 py-0.5 rounded-full shrink-0">
                    Владелец
                  </span>
                </div>
              )}
              <PlaceholderBtn label="Добавить сотрудника" />
            </Widget>
          </div>

          {/* ── Row 3: Касса — full width (сдвинута вниз) ── */}
          <Widget
            title="Касса"
            to="/admin/billing"
            topRight={
              <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <BarChart2 size={13} /> 0 ₽
              </div>
            }
          >
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: ShoppingCart, label: 'Заказы',    value: 0    },
                { icon: Users,        label: 'Партнёры',  value: 0    },
                { icon: TrendingUp,   label: 'Товары',    value: 0    },
                { icon: CreditCard,   label: 'Промокоды', value: null },
              ].map(({ icon: Icon, label, value }) => (
                <Link
                  key={label}
                  to="/admin/billing"
                  className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-brand-light transition-colors border border-transparent hover:border-brand/10"
                >
                  {value !== null
                    ? <p className="text-lg font-bold text-gray-800">{value}</p>
                    : <Icon size={20} className="text-gray-400" />}
                  <p className="text-xs text-gray-500">{label}</p>
                </Link>
              ))}
            </div>
          </Widget>

          {/* ── Row 4: Диск + Прогресс и опыт ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Диск */}
            <Widget title="Диск" to="/admin/coming-soon">
              <p className="text-xs text-gray-500 mb-2">Использовано 0 ГБ из 5 ГБ (0%)</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 rounded-full" style={{ width: '0%' }} />
              </div>
              <PlaceholderBtn label="Изменить объём хранилища" />
            </Widget>

            {/* Прогресс и опыт */}
            <Widget
              title="Прогресс и опыт"
              to="/admin/achievements"
              topRight={<Award size={28} className="text-amber-300" />}
            >
              <p className="text-xs text-gray-500">1 уровень · К новым вызовам</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>0 XP</span>
                  <span>100 XP</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400" style={{ width: '5%' }} />
                </div>
              </div>
            </Widget>
          </div>

        </div>

        {/* ── Right panel ── */}
        <div className="hidden xl:flex flex-col gap-4 w-52 shrink-0">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-700">Тариф</p>
            <p className="text-xs text-gray-400 mt-0.5">Бесплатный план</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">0 ₽</p>
            <button className="mt-3 w-full py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-semibold transition">
              Улучшить
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-700">Регистрации</p>
            <p className="text-xs text-gray-400 mt-0.5">1 регистрация = 1 место</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">О StudentHub</p>
              <ExternalLink size={12} className="text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              StudentHub — ваш инструмент для автовебинаров
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <Radio size={12} className="text-brand" />
              <span className="text-xs text-gray-500">v1.0 MVP</span>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  )
}
