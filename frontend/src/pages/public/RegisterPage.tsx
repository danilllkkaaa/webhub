import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { Video } from 'lucide-react'
import { fieldClass, validateEmail, validateFullName, validatePhone } from '../../utils/validation'

type FieldName = 'name' | 'phone' | 'email'

export default function RegisterPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>()
  const navigate = useNavigate()
  const [search] = useSearchParams()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    telegram: '',
    utm_source: search.get('utm_source') ?? '',
    utm_medium: search.get('utm_medium') ?? '',
    utm_campaign: search.get('utm_campaign') ?? '',
    utm_term: search.get('utm_term') ?? '',
    utm_content: search.get('utm_content') ?? '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [webinar, setWebinar] = useState<{ title: string; slug: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/invite/${inviteToken}`)
      .then((r) => setWebinar({ title: r.data.title, slug: r.data.slug }))
      .catch(() => setError('Ссылка недействительна или трансляция не найдена'))
      .finally(() => setPageLoading(false))
  }, [inviteToken])

  const errors = useMemo(() => ({
    name: validateFullName(form.name),
    phone: validatePhone(form.phone),
    email: validateEmail(form.email),
  }), [form.name, form.phone, form.email])

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }))
    setTouched((p) => ({ ...p, [k]: true }))
  }
  const showError = (name: FieldName) => touched[name] ? errors[name] : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, phone: true, email: true })
    if (Object.values(errors).some(Boolean)) {
      setError('Проверьте поля формы')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
      }
      const { data } = await api.post(`/invite/${inviteToken}/join`, payload)
      if (!webinar?.slug) throw new Error('Missing webinar slug')
      navigate(`/webinars/${webinar.slug}/watch?token=${data.token}`)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Не удалось открыть трансляцию')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3"><Video size={28} /></div>
          {webinar && <h2 className="text-sm text-gray-500 text-center">{webinar.title}</h2>}
          <h1 className="text-xl font-bold mt-1 text-center">Вход на трансляцию</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Имя *</label>
            <input value={form.name} onBlur={() => setTouched((p) => ({ ...p, name: true }))} onChange={(e) => set('name', e.target.value)} required className={fieldClass(showError('name'))} placeholder="Иван Иванов" />
            {showError('name') && <p className="mt-1 text-xs text-red-500">{showError('name')}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Телефон *</label>
            <input type="tel" value={form.phone} onBlur={() => setTouched((p) => ({ ...p, phone: true }))} onChange={(e) => set('phone', e.target.value)} required className={fieldClass(showError('phone'))} placeholder="+7 999 000 00 00" />
            {showError('phone') && <p className="mt-1 text-xs text-red-500">{showError('phone')}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" value={form.email} onBlur={() => setTouched((p) => ({ ...p, email: true }))} onChange={(e) => set('email', e.target.value)} required className={fieldClass(showError('email'))} placeholder="ivan@example.com" />
            {showError('email') && <p className="mt-1 text-xs text-red-500">{showError('email')}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telegram</label>
            <input value={form.telegram} onChange={(e) => set('telegram', e.target.value)} className={fieldClass()} placeholder="@username" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading || !webinar} className="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60">
            {loading ? 'Открываем...' : 'Перейти к трансляции'}
          </button>
        </form>
      </div>
    </div>
  )
}
