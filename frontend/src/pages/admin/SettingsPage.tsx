import { useEffect, useState, FormEvent } from 'react'
import { api } from '../../api/client'
import AdminLayout from '../../components/admin/AdminLayout'
import { ChevronRight, X, Check, AlertCircle } from 'lucide-react'

interface Profile {
  id: number
  email: string
  full_name: string | null
}

type ActivePanel = 'name' | 'email' | 'password' | null

function mask(value: string) {
  if (!value) return '—'
  if (value.includes('@')) {
    const [local, domain] = value.split('@')
    return local.slice(0, 1) + '*'.repeat(Math.max(local.length - 2, 3)) + local.slice(-1) + '@' + domain
  }
  return value
}

function InlineError({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
      <AlertCircle size={12} />
      {msg}
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [active, setActive] = useState<ActivePanel>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // form states
  const [nameVal, setNameVal] = useState('')
  const [emailVal, setEmailVal] = useState('')
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confPass, setConfPass] = useState('')

  useEffect(() => {
    api.get('/auth/me').then((r) => setProfile(r.data))
  }, [])

  const open = (panel: ActivePanel) => {
    setActive(panel)
    setError('')
    setSuccess('')
    if (panel === 'name')  setNameVal(profile?.full_name ?? '')
    if (panel === 'email') setEmailVal(profile?.email ?? '')
    if (panel === 'password') { setCurPass(''); setNewPass(''); setConfPass('') }
  }

  const close = () => { setActive(null); setError(''); setSuccess('') }

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const { data } = await api.patch('/auth/me', { full_name: nameVal })
      setProfile(data)
      setSuccess('Имя обновлено')
      setTimeout(close, 1000)
    } catch { setError('Ошибка при сохранении') }
    finally { setSaving(false) }
  }

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const { data } = await api.patch('/auth/me', { email: emailVal })
      setProfile(data)
      setSuccess('Email обновлён')
      setTimeout(close, 1000)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Ошибка при сохранении')
    } finally { setSaving(false) }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPass !== confPass) { setError('Пароли не совпадают'); return }
    if (newPass.length < 6)   { setError('Минимум 6 символов'); return }
    setSaving(true); setError('')
    try {
      await api.post('/auth/me/password', { current_password: curPass, new_password: newPass })
      setSuccess('Пароль изменён')
      setTimeout(close, 1000)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Ошибка при смене пароля')
    } finally { setSaving(false) }
  }

  if (!profile) {
    return <AdminLayout><div className="text-sm text-gray-400">Загрузка...</div></AdminLayout>
  }

  const actions: {
    id: ActivePanel
    title: string
    subtitle: string
  }[] = [
    {
      id: 'name',
      title: 'Изменить имя',
      subtitle: profile.full_name ? `Ваше имя: ${profile.full_name}` : 'Имя не указано',
    },
    {
      id: 'email',
      title: 'Изменить почту',
      subtitle: `Ваша почта: ${mask(profile.email)}`,
    },
    {
      id: 'password',
      title: 'Изменить пароль',
      subtitle: 'Рекомендуем использовать надёжный пароль',
    },
  ]

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-400 mt-0.5">Управление учётной записью</p>
      </div>

      <div className="max-w-xl space-y-5">

        {/* Popular actions */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-bold text-gray-900">Популярные действия</h2>
          </div>

          {actions.map((action, i) => (
            <div key={action.id}>
              {i > 0 && <div className="mx-5 border-t" />}

              {/* Row */}
              <button
                onClick={() => active === action.id ? close() : open(action.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.subtitle}</p>
                </div>
                {active === action.id
                  ? <X size={16} className="text-gray-400 shrink-0" />
                  : <ChevronRight size={16} className="text-gray-400 shrink-0" />
                }
              </button>

              {/* Inline form */}
              {active === action.id && (
                <div className="px-5 pb-5 bg-gray-50 border-t">
                  <div className="pt-4">

                    {/* Name form */}
                    {action.id === 'name' && (
                      <form onSubmit={saveName} className="space-y-3">
                        <input
                          autoFocus
                          type="text"
                          value={nameVal}
                          onChange={(e) => setNameVal(e.target.value)}
                          placeholder="Иванов Иван Иванович"
                          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        {error && <InlineError msg={error} />}
                        {success && <p className="text-xs text-green-600 flex items-center gap-1"><Check size={12} />{success}</p>}
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={close} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Отмена</button>
                          <button type="submit" disabled={saving} className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60">
                            {saving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Email form */}
                    {action.id === 'email' && (
                      <form onSubmit={saveEmail} className="space-y-3">
                        <input
                          autoFocus
                          type="email"
                          value={emailVal}
                          onChange={(e) => setEmailVal(e.target.value)}
                          required
                          placeholder="new@example.com"
                          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        {error && <InlineError msg={error} />}
                        {success && <p className="text-xs text-green-600 flex items-center gap-1"><Check size={12} />{success}</p>}
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={close} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Отмена</button>
                          <button type="submit" disabled={saving} className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60">
                            {saving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Password form */}
                    {action.id === 'password' && (
                      <form onSubmit={savePassword} className="space-y-3">
                        <input
                          autoFocus
                          type="password"
                          value={curPass}
                          onChange={(e) => setCurPass(e.target.value)}
                          required
                          placeholder="Текущий пароль"
                          autoComplete="current-password"
                          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        <input
                          type="password"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          required
                          placeholder="Новый пароль (мин. 6 символов)"
                          autoComplete="new-password"
                          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        <input
                          type="password"
                          value={confPass}
                          onChange={(e) => setConfPass(e.target.value)}
                          required
                          placeholder="Повторите новый пароль"
                          autoComplete="new-password"
                          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        {error && <InlineError msg={error} />}
                        {success && <p className="text-xs text-green-600 flex items-center gap-1"><Check size={12} />{success}</p>}
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={close} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Отмена</button>
                          <button type="submit" disabled={saving} className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60">
                            {saving ? 'Сохранение...' : 'Изменить пароль'}
                          </button>
                        </div>
                      </form>
                    )}

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-bold text-gray-900">Аккаунт</h2>
            <p className="text-xs text-gray-400 mt-0.5">Информация об учётной записи администратора</p>
          </div>
          <div className="mx-5 border-t" />
          <div className="divide-y mx-0">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500">ID</span>
              <span className="text-sm font-mono text-gray-700">{profile.id}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm text-gray-700">{profile.email}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500">Роль</span>
              <span className="text-xs font-semibold bg-brand/10 text-brand px-2.5 py-1 rounded-full">Администратор</span>
            </div>
          </div>
          <div className="h-2" />
        </div>

      </div>
    </AdminLayout>
  )
}
