import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { Video } from 'lucide-react'
import { fieldClass, validateEmail } from '../../utils/validation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const errors = useMemo(() => ({
    email: validateEmail(email),
    password: password ? '' : 'Пароль обязателен',
  }), [email, password])

  const showError = (name: 'email' | 'password') => touched[name] ? errors[name] : ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTouched({ email: true, password: true })
    if (Object.values(errors).some(Boolean)) {
      setError('Проверьте email и пароль')
      return
    }
    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
      navigate('/admin/projects')
    } catch {
      setError('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3"><Video size={28} /></div>
          <h1 className="text-xl font-bold">StudentHub</h1>
          <p className="text-gray-500 text-sm">Войти в панель управления</p>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              onChange={(e) => { setEmail(e.target.value); setTouched((p) => ({ ...p, email: true })) }}
              required
              className={fieldClass(showError('email'))}
              placeholder="admin@example.com"
            />
            {showError('email') && <p className="mt-1 text-xs text-red-500">{showError('email')}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Пароль</label>
              <Link to="/admin/forgot-password" className="text-xs font-semibold text-brand hover:text-brand-dark">
                Забыли пароль?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              onChange={(e) => { setPassword(e.target.value); setTouched((p) => ({ ...p, password: true })) }}
              required
              className={fieldClass(showError('password'))}
            />
            {showError('password') && <p className="mt-1 text-xs text-red-500">{showError('password')}</p>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-60">
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-5">
          Нет аккаунта школы? <Link to="/admin/register" className="text-brand font-semibold hover:text-brand-dark">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
