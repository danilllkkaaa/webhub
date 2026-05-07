import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { Video } from 'lucide-react'
import { fieldClass, validateEmail } from '../../utils/validation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState('')

  const emailError = useMemo(() => validateEmail(email), [email])
  const resetLink = resetToken ? `${window.location.origin}/admin/reset-password?token=${encodeURIComponent(resetToken)}` : ''

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    setError('')
    setMessage('')
    setResetToken('')
    if (emailError) {
      setError('Проверьте email')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setMessage('Если email существует, инструкция подготовлена')
      if (data.reset_token) setResetToken(data.reset_token)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Не удалось запросить восстановление пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3"><Video size={28} /></div>
          <h1 className="text-xl font-bold">Восстановление пароля</h1>
          <p className="text-gray-500 text-sm text-center">Введите email администратора</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onBlur={() => setTouched(true)}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={fieldClass(touched ? emailError : '')}
              placeholder="admin@example.com"
            />
            {touched && emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}

          {resetLink && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">Dev reset link</p>
              <Link to={`/admin/reset-password?token=${encodeURIComponent(resetToken)}`} className="mt-1 block break-all underline">
                {resetLink}
              </Link>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-60">
            {loading ? 'Отправляем...' : 'Восстановить пароль'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          <Link to="/admin/login" className="text-brand font-semibold hover:text-brand-dark">Вернуться ко входу</Link>
        </p>
      </div>
    </div>
  )
}
