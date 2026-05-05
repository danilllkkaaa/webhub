import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { Video } from 'lucide-react'

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

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/invite/${inviteToken}/join`, form)
      if (!webinar?.slug) throw new Error('Missing webinar slug')
      navigate(`/webinars/${webinar.slug}/watch?token=${data.token}`)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Не удалось открыть трансляцию')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand text-white rounded-full p-3 mb-3">
            <Video size={28} />
          </div>
          {webinar && <h2 className="text-sm text-gray-500 text-center">{webinar.title}</h2>}
          <h1 className="text-xl font-bold mt-1 text-center">Вход на трансляцию</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Имя *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Иван Иванов"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Телефон *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="+7 999 000 00 00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="ivan@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telegram</label>
            <input
              value={form.telegram}
              onChange={(e) => set('telegram', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="@username"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !webinar}
            className="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
          >
            {loading ? 'Открываем...' : 'Перейти к трансляции'}
          </button>
        </form>
      </div>
    </div>
  )
}
