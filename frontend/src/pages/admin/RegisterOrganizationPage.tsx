import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useProjectStore } from '../../store/project'
import {
  fieldClass,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirm,
  validateRequiredText,
} from '../../utils/validation'

type FieldName = 'full_name' | 'email' | 'password' | 'password_confirm' | 'organization_name' | 'project_name'

export default function RegisterOrganizationPage() {
  const navigate = useNavigate()
  const registerOrganization = useAuthStore((s) => s.registerOrganization)
  const clearProject = useProjectStore((s) => s.clearProject)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    password_confirm: '',
    organization_name: '',
    project_name: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const errors = useMemo(() => ({
    full_name: validateFullName(form.full_name),
    email: validateEmail(form.email),
    password: validatePassword(form.password),
    password_confirm: validatePasswordConfirm(form.password, form.password_confirm),
    organization_name: validateRequiredText(form.organization_name, 'Название организации'),
    project_name: validateRequiredText(form.project_name, 'Название проекта'),
  }), [form])

  const set = (key: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setTouched((prev) => ({ ...prev, [key]: true }))
  }

  const showError = (key: FieldName) => touched[key] ? errors[key] : ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched({
      full_name: true,
      email: true,
      password: true,
      password_confirm: true,
      organization_name: true,
      project_name: true,
    })
    const firstError = Object.values(errors).find(Boolean)
    if (firstError) {
      setError('Проверьте поля формы')
      return
    }
    setLoading(true)
    setError('')
    try {
      await registerOrganization({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password_confirm: form.password_confirm,
        organization_name: form.organization_name.trim(),
        project_name: form.project_name.trim(),
      })
      clearProject()
      navigate('/admin/projects', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Не удалось зарегистрировать организацию')
    } finally {
      setLoading(false)
    }
  }

  const InputError = ({ name }: { name: FieldName }) => (
    showError(name) ? <p className="mt-1 text-xs text-red-500">{showError(name)}</p> : null
  )

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3">
            <Building2 size={28} />
          </div>
          <h1 className="text-xl font-bold">Регистрация школы</h1>
          <p className="text-gray-500 text-sm text-center mt-1">Создайте организацию, владельца и первый проект.</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <input className={fieldClass(showError('full_name'))} required placeholder="ФИО владельца" value={form.full_name} onBlur={() => setTouched((p) => ({ ...p, full_name: true }))} onChange={(e) => set('full_name', e.target.value)} />
            <InputError name="full_name" />
          </div>
          <div>
            <input className={fieldClass(showError('email'))} required type="email" placeholder="Email: owner@example.com" value={form.email} onBlur={() => setTouched((p) => ({ ...p, email: true }))} onChange={(e) => set('email', e.target.value)} />
            <InputError name="email" />
          </div>
          <div>
            <input className={fieldClass(showError('password'))} required type="password" placeholder="Пароль: минимум 6 символов, буква и цифра" value={form.password} onBlur={() => setTouched((p) => ({ ...p, password: true }))} onChange={(e) => set('password', e.target.value)} />
            <InputError name="password" />
          </div>
          <div>
            <input className={fieldClass(showError('password_confirm'))} required type="password" placeholder="Подтвердить пароль" value={form.password_confirm} onBlur={() => setTouched((p) => ({ ...p, password_confirm: true }))} onChange={(e) => set('password_confirm', e.target.value)} />
            <InputError name="password_confirm" />
          </div>
          <div>
            <input className={fieldClass(showError('organization_name'))} required placeholder="Название школы или организации" value={form.organization_name} onBlur={() => setTouched((p) => ({ ...p, organization_name: true }))} onChange={(e) => set('organization_name', e.target.value)} />
            <InputError name="organization_name" />
          </div>
          <div>
            <input className={fieldClass(showError('project_name'))} required placeholder="Название первого проекта" value={form.project_name} onBlur={() => setTouched((p) => ({ ...p, project_name: true }))} onChange={(e) => set('project_name', e.target.value)} />
            <InputError name="project_name" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60">
            {loading ? 'Создаем...' : 'Создать организацию'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          Уже есть аккаунт? <Link to="/admin/login" className="text-brand font-semibold hover:text-brand-dark">Войти</Link>
        </p>
      </div>
    </div>
  )
}
