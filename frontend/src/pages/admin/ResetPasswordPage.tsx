import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { Video } from 'lucide-react'
import { fieldClass, parseApiError, validatePassword, validatePasswordConfirm } from '../../utils/validation'

export default function ResetPasswordPage() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const token = search.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const errors = useMemo(() => ({
    password: validatePassword(password),
    confirm: validatePasswordConfirm(password, confirm),
  }), [password, confirm])

  const showError = (name: 'password' | 'confirm') => touched[name] ? errors[name] : ''

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched({ password: true, confirm: true })
    setError('')
    setSuccess('')
    if (!token) {
      setError('Токен восстановления отсутствует')
      return
    }
    if (Object.values(errors).some(Boolean)) {
      setError('Проверьте новый пароль')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password,
        password_confirm: confirm,
      })
      setSuccess('Пароль обновлен. Сейчас откроется вход.')
      setTimeout(() => navigate('/admin/login'), 1200)
    } catch (err: unknown) {
      setError(parseApiError(err, 'Не удалось обновить пароль'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3"><Video size={28} /></div>
          <h1 className="text-xl font-bold">Новый пароль</h1>
          <p className="text-gray-500 text-sm text-center">Введите новый пароль администратора</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Новый пароль</label>
            <input
              type="password"
              value={password}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              onChange={(event) => setPassword(event.target.value)}
              required
              className={fieldClass(showError('password'))}
            />
            {showError('password') && <p className="mt-1 text-xs text-red-500">{showError('password')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Повторите новый пароль</label>
            <input
              type="password"
              value={confirm}
              onBlur={() => setTouched((current) => ({ ...current, confirm: true }))}
              onChange={(event) => setConfirm(event.target.value)}
              required
              className={fieldClass(showError('confirm'))}
            />
            {showError('confirm') && <p className="mt-1 text-xs text-red-500">{showError('confirm')}</p>}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button type="submit" disabled={loading || !token} className="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-60">
            {loading ? 'Сохраняем...' : 'Сохранить пароль'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          <Link to="/admin/login" className="text-brand font-semibold hover:text-brand-dark">Вернуться ко входу</Link>
        </p>
      </div>
    </div>
  )
}
