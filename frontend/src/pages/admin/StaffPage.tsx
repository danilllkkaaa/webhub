import { FormEvent, useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { useProjectStore } from '../../store/project'
import { ProjectMember, ProjectMemberRole, staffApi } from '../../api/staff'
import { Check, Shield, Trash2, UserPlus, Users, X } from 'lucide-react'

const PROJECT_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  project_admin: 'Администратор проекта',
  content_manager: 'Контент-менеджер',
  webinar_moderator: 'Модератор вебинаров',
  support: 'Поддержка',
  analyst: 'Аналитик',
}

const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectMemberRole, string> = {
  project_admin: 'Управляет проектом, сотрудниками, курсами, вебинарами и аналитикой.',
  content_manager: 'Создает и редактирует курсы, уроки и вебинары.',
  webinar_moderator: 'Заходит в эфирную комнату и модерирует чат на вебинарах.',
  support: 'Работает с учениками, чатами, регистрациями и выгрузками.',
  analyst: 'Смотрит аналитику и выгружает отчеты.',
}

const ROLE_OPTIONS = Object.keys(PROJECT_ROLE_LABELS) as ProjectMemberRole[]

export default function StaffPage() {
  const { currentProjectId, currentProjectName } = useProjectStore()
  const projectId = Number(currentProjectId)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [role, setRole] = useState<ProjectMemberRole>('webinar_moderator')

  const load = () => {
    if (!projectId) return
    setLoading(true)
    staffApi.projectMembers(projectId)
      .then(setMembers)
      .catch((err) => setError(err.response?.data?.detail ?? 'Не удалось загрузить сотрудников'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const resetForm = () => {
    setEmail('')
    setFullName('')
    setTempPassword('')
    setRole('webinar_moderator')
    setError('')
  }

  const addMember = async (e: FormEvent) => {
    e.preventDefault()
    if (!projectId || !email.trim()) return
    setSaving(true)
    setError('')
    try {
      await staffApi.addProjectMember(projectId, {
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        temp_password: tempPassword || undefined,
        organization_role: 'manager',
        role,
      })
      setShowModal(false)
      resetForm()
      load()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Не удалось добавить сотрудника')
    } finally {
      setSaving(false)
    }
  }

  const updateRole = async (member: ProjectMember, nextRole: ProjectMemberRole) => {
    await staffApi.updateProjectMember(projectId, member.user_id, nextRole)
    setMembers((prev) => prev.map((item) => item.user_id === member.user_id ? { ...item, role: nextRole } : item))
  }

  const removeMember = async (member: ProjectMember) => {
    if (!confirm(`Удалить доступ для ${member.email}?`)) return
    await staffApi.removeProjectMember(projectId, member.user_id)
    setMembers((prev) => prev.filter((item) => item.user_id !== member.user_id))
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Сотрудники</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Доступ к проекту: {currentProjectName}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
        >
          <UserPlus size={16} /> Добавить сотрудника
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <Users size={18} className="text-brand" />
            <h2 className="font-semibold">Доступ к проекту</h2>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-400">Загрузка...</div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={42} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">В проект пока не добавлены сотрудники</p>
            </div>
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.user_id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                    {(member.full_name || member.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{member.full_name || member.email}</p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Расшаренный доступ к проекту</p>
                  </div>
                  <select
                    value={member.role}
                    onChange={(e) => updateRole(member, e.target.value as ProjectMemberRole)}
                    className="border rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{PROJECT_ROLE_LABELS[option]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeMember(member)}
                    className="p-2 text-gray-400 hover:text-red-500"
                    title="Удалить доступ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-brand" />
            <h2 className="font-semibold">Роли в проекте</h2>
          </div>
          <div className="space-y-3">
            {ROLE_OPTIONS.map((option) => (
              <div key={option} className="rounded-xl bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-800">{PROJECT_ROLE_LABELS[option]}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{PROJECT_ROLE_DESCRIPTIONS[option]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">Добавить сотрудника</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700" aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="employee@example.com"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Если пользователь уже есть в базе, ему просто откроется доступ к этому проекту.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ФИО</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="Иванов Иван"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Временный пароль</label>
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="Нужен только для нового пользователя"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Роль в проекте</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as ProjectMemberRole)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{PROJECT_ROLE_LABELS[option]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{PROJECT_ROLE_DESCRIPTIONS[role]}</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

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
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? 'Сохранение...' : <><Check size={15} /> Добавить</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
