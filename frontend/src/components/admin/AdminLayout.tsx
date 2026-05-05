import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { useProjectStore } from '../../store/project'
import {
  LayoutDashboard, Video, BookOpen, Wallet, Users, Gift, Trophy,
  Settings, Info, HelpCircle, LogOut, Menu, X, ChevronRight,
  ArrowLeftRight, ExternalLink,
} from 'lucide-react'

const SIDEBAR_W = 220

const NAV_MAIN = [
  { to: '/admin', icon: LayoutDashboard, label: 'Главное', exact: true },
  { to: '/admin/webinars', icon: Video, label: 'Вебинары', exact: false },
  { to: '/admin/courses', icon: BookOpen, label: 'Онлайн-курсы', exact: false },
  { to: '/admin/billing', icon: Wallet, label: 'Услуги и финансы', exact: false },
  { to: '/admin/staff', icon: Users, label: 'Сотрудники', exact: false },
  { to: '/admin/bonuses', icon: Gift, label: 'Бонусный магазин', exact: false },
  { to: '/admin/achievements', icon: Trophy, label: 'Достижения', exact: false },
  { to: '/admin/settings', icon: Settings, label: 'Настройки', exact: false },
]

const NAV_BOTTOM = [
  { to: '/admin/about', icon: Info, label: 'О платформе' },
  { to: '/admin/help', icon: HelpCircle, label: 'Справка' },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const logout = useAuthStore((s) => s.logout)
  const { clearProject, currentProjectName, currentProjectColor } = useProjectStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    clearProject()
    navigate('/admin/login')
  }

  const handleSwitchProject = () => {
    clearProject()
    navigate('/admin/projects')
  }

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to || location.pathname === `${to}/` : location.pathname.startsWith(to)

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10 shrink-0">
        <div className="bg-brand rounded-lg p-1.5 shrink-0">
          <Video size={16} />
        </div>
        <span className="font-bold text-sm tracking-tight leading-tight">Webinar<br />Platform</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-white/50 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {currentProjectName && (
        <button
          onClick={handleSwitchProject}
          className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/10 transition text-left group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ background: currentProjectColor ?? '#2D9A27' }}
          >
            {currentProjectName[0].toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-white/90 flex-1 truncate">{currentProjectName}</span>
          <ArrowLeftRight size={12} className="text-white/30 group-hover:text-white/60 transition shrink-0" />
        </button>
      )}

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_MAIN.map(({ to, icon: Icon, label, exact }) => {
          const active = isActive(to, exact)
          return (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                active ? 'bg-brand text-white font-medium' : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1 leading-none">{label}</span>
              {active && <ChevronRight size={13} className="opacity-50 shrink-0" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 pb-3 border-t border-white/10 pt-3 space-y-0.5 shrink-0">
        {NAV_BOTTOM.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/10 hover:text-white/80 transition"
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{label}</span>
            <ExternalLink size={11} className="opacity-50 shrink-0" />
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/10 hover:text-white/80 transition"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Выйти</span>
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      <aside
        className="hidden lg:flex flex-col fixed top-4 left-4 bottom-4 rounded-2xl bg-sidebar text-white shadow-xl overflow-hidden z-30"
        style={{ width: SIDEBAR_W }}
      >
        <SidebarContent />
      </aside>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
          <aside
            className="fixed top-4 left-4 bottom-4 rounded-2xl bg-sidebar text-white shadow-xl overflow-hidden z-50 lg:hidden flex flex-col"
            style={{ width: SIDEBAR_W }}
          >
            <SidebarContent onClose={() => setOpen(false)} />
          </aside>
        </>
      )}

      <div className="lg:ml-[252px] flex flex-col min-h-screen">
        <header className="lg:hidden bg-sidebar text-white px-4 py-3 flex items-center gap-3 shadow sticky top-0 z-20">
          <button onClick={() => setOpen(true)}><Menu size={22} /></button>
          <span className="font-bold">Webinar Platform</span>
        </header>

        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  )
}
