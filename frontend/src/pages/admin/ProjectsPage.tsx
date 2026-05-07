import { useEffect, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi, Project } from '../../api/projects'
import { useProjectStore } from '../../store/project'
import { useAuthStore } from '../../store/auth'
import { api } from '../../api/client'
import {
  Video, Plus, LogOut, FolderOpen, Trash2, X, Check,
} from 'lucide-react'

const COLORS = [
  '#2D9A27', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#6366F1',
]

function plural(n: number) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return `${n} вебинаров`
  if (mod10 === 1) return `${n} вебинар`
  if (mod10 >= 2 && mod10 <= 4) return `${n} вебинара`
  return `${n} вебинаров`
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const setProject = useProjectStore((s) => s.setProject)
  const logout = useAuthStore((s) => s.logout)

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [creating, setCreating] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  useEffect(() => {
    api.get('/auth/me').then((r) => setUserName(r.data.full_name || r.data.email))
    projectApi.list().then(setProjects).finally(() => setLoading(false))
  }, [])

  const openProject = (p: Project) => {
    setProject(p.id, p.name, p.color)
    navigate('/admin')
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const p = await projectApi.create(newName.trim(), newColor)
      setProjects((prev) => [p, ...prev])
      setShowModal(false)
      setNewName('')
      setNewColor(COLORS[0])
      openProject(p)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    await projectApi.delete(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setConfirmDelete(null)
  }

  const handleLogout = () => { logout(); navigate('/admin/login') }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <div className="bg-brand text-white rounded-lg p-1.5 shrink-0">
          <Video size={18} />
        </div>
        <span className="font-bold text-base tracking-tight">StudentHub</span>
        <div className="ml-auto flex items-center gap-4">
          {userName && (
            <span className="text-sm text-gray-500 hidden sm:block">{userName}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <LogOut size={15} /> Выйти
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ваши проекты</h1>
            <p className="text-sm text-gray-400 mt-0.5">Выберите проект или создайте новый</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus size={15} /> Создать проект
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 py-12 text-center">Загрузка...</div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FolderOpen size={30} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Нет проектов</p>
              <p className="text-sm text-gray-400 mt-1">Создайте первый проект, чтобы начать</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition mt-1"
            >
              <Plus size={15} /> Создать проект
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border hover:shadow-md transition-shadow overflow-hidden flex flex-col group"
              >
                {/* Color bar */}
                <div className="h-1.5 w-full" style={{ background: p.color }} />

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: p.color + '20' }}
                    >
                      <FolderOpen size={18} style={{ color: p.color }} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-3 flex-1">
                    <p className="font-bold text-gray-900 text-base leading-tight">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{plural(p.webinar_count)}</p>
                  </div>

                  <button
                    onClick={() => openProject(p)}
                    className="mt-4 w-full py-2 rounded-xl text-sm font-semibold transition border"
                    style={{
                      borderColor: p.color,
                      color: p.color,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.background = p.color
                      el.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.background = ''
                      el.style.color = p.color
                    }}
                  >
                    Открыть →
                  </button>
                </div>

                {/* Delete confirm */}
                {confirmDelete === p.id && (
                  <div className="px-5 pb-4 bg-red-50 border-t border-red-100">
                    <p className="text-xs text-red-700 font-medium pt-3 pb-2">
                      Удалить проект? Все вебинары будут отвязаны.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-1.5 rounded-lg border text-xs text-gray-600 hover:bg-white transition"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create project modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">Новый проект</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Название проекта
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Маркетинг 2025"
                  required
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className="w-7 h-7 rounded-lg transition-transform hover:scale-110 relative"
                      style={{ background: c }}
                    >
                      {newColor === c && (
                        <Check size={13} className="text-white absolute inset-0 m-auto" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
                  style={{ background: newColor }}
                >
                  {creating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
