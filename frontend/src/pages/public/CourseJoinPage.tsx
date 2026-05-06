import { FormEvent, useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { courseApi, Course } from '../../api/courses'
import { BookOpen } from 'lucide-react'
import {
  fieldClass,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirm,
} from '../../utils/validation'

type Mode = 'register' | 'login'
type RegisterField = 'full_name' | 'email' | 'password' | 'password_confirm'
type LoginField = 'email' | 'password'

export default function CourseJoinPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [mode, setMode] = useState<Mode>('register')
  const [registerForm, setRegisterForm] = useState({ full_name: '', email: '', password: '', password_confirm: '' })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [touchedRegister, setTouchedRegister] = useState<Record<string, boolean>>({})
  const [touchedLogin, setTouchedLogin] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    courseApi.invite(inviteToken ?? '').then(setCourse).catch(() => setError('Курс не найден'))
  }, [inviteToken])

  const registerErrors = useMemo(() => ({
    full_name: validateFullName(registerForm.full_name),
    email: validateEmail(registerForm.email),
    password: validatePassword(registerForm.password),
    password_confirm: validatePasswordConfirm(registerForm.password, registerForm.password_confirm),
  }), [registerForm])

  const loginErrors = useMemo(() => ({
    email: validateEmail(loginForm.email),
    password: loginForm.password ? '' : 'Пароль обязателен',
  }), [loginForm])

  const showRegisterError = (name: RegisterField) => touchedRegister[name] ? registerErrors[name] : ''
  const showLoginError = (name: LoginField) => touchedLogin[name] ? loginErrors[name] : ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!course || !inviteToken) return
    if (mode === 'register') {
      setTouchedRegister({ full_name: true, email: true, password: true, password_confirm: true })
      if (Object.values(registerErrors).some(Boolean)) {
        setError('Проверьте поля регистрации')
        return
      }
    } else {
      setTouchedLogin({ email: true, password: true })
      if (Object.values(loginErrors).some(Boolean)) {
        setError('Проверьте поля входа')
        return
      }
    }

    setLoading(true)
    setError('')
    try {
      const student = mode === 'register'
        ? await courseApi.register(inviteToken, {
            ...registerForm,
            email: registerForm.email.trim().toLowerCase(),
            full_name: registerForm.full_name.trim(),
          })
        : await courseApi.login(inviteToken, {
            email: loginForm.email.trim().toLowerCase(),
            password: loginForm.password,
          })
      localStorage.setItem(`course_token_${course.slug}`, student.token)
      navigate(`/course/${course.slug}/learn?token=${student.token}`, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Не удалось продолжить')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3"><BookOpen size={28} /></div>
          {course && <p className="text-sm text-gray-500 text-center">{course.title}</p>}
          <h1 className="text-xl font-bold mt-1 text-center">{mode === 'register' ? 'Регистрация на курс' : 'Вход в курс'}</h1>
          <p className="text-sm text-gray-400 text-center mt-2">
            {mode === 'register' ? 'Создайте аккаунт ученика. После этого школа рассмотрит заявку.' : 'Войдите в аккаунт ученика, чтобы открыть кабинет курса.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5 rounded-xl bg-gray-100 p-1">
          <button type="button" onClick={() => { setMode('register'); setError('') }} className={`rounded-lg py-2 text-sm font-semibold transition ${mode === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Регистрация</button>
          <button type="button" onClick={() => { setMode('login'); setError('') }} className={`rounded-lg py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Войти</button>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === 'register' ? (
            <>
              <div>
                <input className={fieldClass(showRegisterError('full_name'))} required placeholder="ФИО" value={registerForm.full_name} onBlur={() => setTouchedRegister((p) => ({ ...p, full_name: true }))} onChange={(e) => { setRegisterForm({ ...registerForm, full_name: e.target.value }); setTouchedRegister((p) => ({ ...p, full_name: true })) }} />
                {showRegisterError('full_name') && <p className="mt-1 text-xs text-red-500">{showRegisterError('full_name')}</p>}
              </div>
              <div>
                <input className={fieldClass(showRegisterError('email'))} required type="email" placeholder="Почта: student@example.com" value={registerForm.email} onBlur={() => setTouchedRegister((p) => ({ ...p, email: true }))} onChange={(e) => { setRegisterForm({ ...registerForm, email: e.target.value }); setTouchedRegister((p) => ({ ...p, email: true })) }} />
                {showRegisterError('email') && <p className="mt-1 text-xs text-red-500">{showRegisterError('email')}</p>}
              </div>
              <div>
                <input className={fieldClass(showRegisterError('password'))} required type="password" placeholder="Пароль: минимум 6 символов, буква и цифра" value={registerForm.password} onBlur={() => setTouchedRegister((p) => ({ ...p, password: true }))} onChange={(e) => { setRegisterForm({ ...registerForm, password: e.target.value }); setTouchedRegister((p) => ({ ...p, password: true })) }} />
                {showRegisterError('password') && <p className="mt-1 text-xs text-red-500">{showRegisterError('password')}</p>}
              </div>
              <div>
                <input className={fieldClass(showRegisterError('password_confirm'))} required type="password" placeholder="Подтвердить пароль" value={registerForm.password_confirm} onBlur={() => setTouchedRegister((p) => ({ ...p, password_confirm: true }))} onChange={(e) => { setRegisterForm({ ...registerForm, password_confirm: e.target.value }); setTouchedRegister((p) => ({ ...p, password_confirm: true })) }} />
                {showRegisterError('password_confirm') && <p className="mt-1 text-xs text-red-500">{showRegisterError('password_confirm')}</p>}
              </div>
            </>
          ) : (
            <>
              <div>
                <input className={fieldClass(showLoginError('email'))} required type="email" placeholder="Почта" value={loginForm.email} onBlur={() => setTouchedLogin((p) => ({ ...p, email: true }))} onChange={(e) => { setLoginForm({ ...loginForm, email: e.target.value }); setTouchedLogin((p) => ({ ...p, email: true })) }} />
                {showLoginError('email') && <p className="mt-1 text-xs text-red-500">{showLoginError('email')}</p>}
              </div>
              <div>
                <input className={fieldClass(showLoginError('password'))} required type="password" placeholder="Пароль" value={loginForm.password} onBlur={() => setTouchedLogin((p) => ({ ...p, password: true }))} onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); setTouchedLogin((p) => ({ ...p, password: true })) }} />
                {showLoginError('password') && <p className="mt-1 text-xs text-red-500">{showLoginError('password')}</p>}
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={loading || !course} className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">
            {loading ? 'Проверяем...' : mode === 'register' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
