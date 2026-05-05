import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { webinarApi, Webinar } from '../../api/webinars'
import AdminLayout from '../../components/admin/AdminLayout'
import { useProjectStore } from '../../store/project'
import {
  ChevronRight, BarChart2, BookOpen, ShoppingCart, HardDrive,
  Users, TrendingUp, Award, ExternalLink, Radio, FileText, CreditCard,
} from 'lucide-react'

/* ── Reusable widget shell ── */
function Widget({
  title, to, topRight, children, className = '',
}: {
  title: string
  to?: string
  topRight?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {to ? (
          <Link to={to} className="flex items-center gap-1 font-bold text-gray-900 hover:text-brand transition text-sm">
            {title} <ChevronRight size={15} className="mt-px" />
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

function StatBox({ value, label, sub, to }: { value: React.ReactNode; label: string; sub?: string; to?: string }) {
  const inner = (
    <>
      <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </>
  )
  if (to) {
    return (
      <Link to={to} className="bg-gray-50 rounded-xl p-3 text-center block hover:bg-brand-light hover:text-brand transition">
        {inner}
      </Link>
    )
  }
  return <div className="bg-gray-50 rounded-xl p-3 text-center">{inner}</div>
}

function PlaceholderBtn({ label }: { label: string }) {
  return (
    <button className="w-full mt-3 py-2 rounded-xl border text-sm text-gray-500 hover:bg-gray-50 transition">
      {label}
    </button>
  )
}

export default function DashboardPage() {
  const { currentProjectName, currentProjectColor } = useProjectStore()
  const [webinars, setWebinars] = useState<Webinar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    webinarApi.list().then(setWebinars).finally(() => setLoading(false))
  }, [])

  const total    = webinars.length
  const live     = webinars.filter((w) => w.status === 'live').length
  const scheduled = webinars.filter((w) => w.status === 'scheduled').length

  const projectLetter = currentProjectName?.[0]?.toUpperCase() ?? 'П'

  return (
    <AdminLayout>
      <div className="flex gap-5 items-start">

        {/* ── Left: main widgets ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Project header */}
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ background: currentProjectColor ?? '#2D9A27' }}
            >
              {projectLetter}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{currentProjectName ?? 'Проект'}</h1>
          </div>

          {/* Row 1: Вебинары + Онлайн-курсы */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Вебинары */}
            <Widget
              title="Вебинары"
              to="/admin/webinars"
              topRight={
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={13} /> {loading ? '…' : total}
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <StatBox
                  value={loading ? '…' : total}
                  sub="/ ∞"
                  label="Комнаты"
                  to="/admin/webinars"
                />
                <StatBox
                  value={loading ? '…' : live}
                  label="Сейчас в эфире"
                  to="/admin/webinars?tab=live"
                />
                <StatBox
                  value={loading ? '…' : scheduled}
                  sub="/ ∞"
                  label="Запланировано"
                  to="/admin/webinars?tab=scheduled"
                />
                <Link
                  to="/admin/webinars?tab=finished"
                  className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-brand-light transition"
                >
                  <FileText size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Отчёты</span>
                </Link>
              </div>
            </Widget>

            {/* Онлайн-курсы — placeholder */}
            <Widget title="Онлайн-курсы" to="/admin/courses">
              <div className="flex flex-col items-center py-4 text-center">
                <BookOpen size={36} className="text-gray-200 mb-3" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Настройте раздел, чтобы начать<br />создавать свои курсы
                </p>
                <Link
                  to="/admin/courses/new"
                  className="mt-4 px-6 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Создать
                </Link>
              </div>
            </Widget>
          </div>

          {/* Row 2: Касса — full width */}
          <Widget
            title="Касса"
            to="/admin/billing"
            topRight={
              <div className="flex items-center gap-1 text-xs text-green-600">
                <BarChart2 size={13} /> 0 ₽
              </div>
            }
          >
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: ShoppingCart, label: 'Заказы',    value: 0,    to: '/admin/billing' },
                { icon: Users,        label: 'Партнёры',  value: 0,    to: '/admin/billing' },
                { icon: TrendingUp,   label: 'Товары',    value: 0,    to: '/admin/billing' },
                { icon: CreditCard,   label: 'Промокоды', value: null, to: '/admin/billing' },
              ].map(({ icon: Icon, label, value, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-brand-light transition"
                >
                  {value !== null
                    ? <p className="text-lg font-bold text-gray-800">{value}</p>
                    : <Icon size={20} className="text-gray-400" />}
                  <p className="text-xs text-gray-500">{label}</p>
                </Link>
              ))}
            </div>
          </Widget>

          {/* Row 3: Диск + Сотрудники */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Диск */}
            <Widget title="Диск" to="/admin/coming-soon">
              <p className="text-xs text-gray-500 mb-2">Использовано 0 ГБ из 5 ГБ (0%)</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 rounded-full" style={{ width: '0%' }} />
              </div>
              <PlaceholderBtn label="Изменить объем хранилища" />
            </Widget>

            {/* Сотрудники */}
            <Widget title="Сотрудники" to="/admin/staff">
              <div className="flex items-center gap-2 mb-3">
                {['#4ADE80', '#60A5FA'].map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: color, marginLeft: i > 0 ? '-8px' : '0' }}
                  >
                    <Users size={13} />
                  </div>
                ))}
                <span className="text-xs text-gray-500 ml-1">Только вы</span>
              </div>
              <PlaceholderBtn label="Добавить" />
            </Widget>
          </div>

          {/* Row 4: Статистика + Прогресс */}
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
                    className="flex-1 rounded-sm bg-gray-100"
                    style={{ height: `${h * 10}%` }}
                  />
                ))}
              </div>
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
                  <div className="h-full rounded-full bg-amber-300" style={{ width: '5%' }} />
                </div>
              </div>
            </Widget>
          </div>

        </div>

        {/* ── Right panel ── */}
        <div className="hidden xl:flex flex-col gap-4 w-52 shrink-0">

          {/* Тариф / баланс */}
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-xs font-semibold text-gray-700">Тариф</p>
            <p className="text-xs text-gray-400 mt-0.5">Бесплатный план</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">0 ₽</p>
            <button className="mt-3 w-full py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-semibold transition">
              Улучшить
            </button>
          </div>

          {/* Регистрации */}
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Регистрации</p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">1 регистрация = 1 место</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
          </div>

          {/* О платформе */}
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">О платформе</p>
              <ExternalLink size={12} className="text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Webinar Platform — ваш инструмент для автовебинаров
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
