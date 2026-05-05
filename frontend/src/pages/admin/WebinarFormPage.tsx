import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { webinarApi, WebinarCreate } from '../../api/webinars'
import AdminLayout from '../../components/admin/AdminLayout'
import { ChevronLeft, Copy } from 'lucide-react'

export default function WebinarFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<WebinarCreate>({
    title: '',
    description: '',
    webinar_type: 'live',
    youtube_url: '',
    scheduled_at: '',
    duration_minutes: undefined,
    offer_text: '',
    offer_url: '',
    offer_button_text: 'Получить',
    chat_enabled: true,
  })
  const [status, setStatus] = useState('draft')
  const [inviteToken, setInviteToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    webinarApi.get(Number(id)).then((w) => {
      setForm({
        title: w.title,
        description: w.description ?? '',
        webinar_type: w.webinar_type,
        youtube_url: w.youtube_url ?? '',
        scheduled_at: w.scheduled_at ? w.scheduled_at.slice(0, 16) : '',
        duration_minutes: w.duration_minutes ?? undefined,
        offer_text: w.offer_text ?? '',
        offer_url: w.offer_url ?? '',
        offer_button_text: w.offer_button_text ?? 'Получить',
        chat_enabled: w.chat_enabled,
      })
      setStatus(w.status)
      setInviteToken(w.invite_token ?? '')
    }).finally(() => setLoading(false))
  }, [id])

  const set = (field: keyof WebinarCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at || undefined,
        status: isEdit ? status : undefined,
      }
      if (isEdit) {
        const updated = await webinarApi.update(Number(id), payload)
        setInviteToken(updated.invite_token ?? '')
      } else {
        const created = await webinarApi.create(payload as WebinarCreate)
        setInviteToken(created.invite_token ?? '')
        navigate(`/admin/webinars/${created.id}/edit`, { replace: true })
        return
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const inviteLink = inviteToken ? `${window.location.origin}/join/${inviteToken}` : null

  if (loading) return <AdminLayout><p className="text-gray-500">Загрузка...</p></AdminLayout>

  return (
    <AdminLayout>
      <div className="mb-6">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2">
          <ChevronLeft size={16} /> Назад
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Редактировать вебинар' : 'Новый вебинар'}</h1>
      </div>

      {inviteLink && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-6 flex items-center gap-3">
          <span className="text-sm text-indigo-700 truncate flex-1">{inviteLink}</span>
          <button
            onClick={() => navigator.clipboard.writeText(inviteLink)}
            className="text-indigo-500 hover:text-indigo-700"
            title="Скопировать"
          >
            <Copy size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Название *</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              className="input"
              placeholder="Вебинар о продажах"
            />
          </div>

          <div>
            <label className="label">Тип</label>
            <select value={form.webinar_type} onChange={(e) => set('webinar_type', e.target.value)} className="input">
              <option value="live">Live-вебинар</option>
              <option value="auto">Автовебинар</option>
            </select>
          </div>

          {isEdit && (
            <div>
              <label className="label">Статус</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                <option value="draft">Черновик</option>
                <option value="scheduled">Запланирован</option>
                <option value="live">В эфире</option>
                <option value="finished">Завершён</option>
              </select>
            </div>
          )}

          <div className="col-span-2">
            <label className="label">YouTube URL</label>
            <input
              value={form.youtube_url}
              onChange={(e) => set('youtube_url', e.target.value)}
              className="input"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div>
            <label className="label">Дата и время начала</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => set('scheduled_at', e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Длительность (мин)</label>
            <input
              type="number"
              value={form.duration_minutes ?? ''}
              onChange={(e) => set('duration_minutes', e.target.value ? Number(e.target.value) : undefined)}
              className="input"
              placeholder="60"
            />
          </div>

          <div className="col-span-2">
            <label className="label">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Краткое описание вебинара"
            />
          </div>

          <div className="col-span-2 border-t pt-4">
            <h3 className="font-semibold mb-3 text-sm text-gray-700">Оффер</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Текст оффера</label>
                <input
                  value={form.offer_text}
                  onChange={(e) => set('offer_text', e.target.value)}
                  className="input"
                  placeholder="Специальное предложение..."
                />
              </div>
              <div>
                <label className="label">URL оффера</label>
                <input
                  value={form.offer_url}
                  onChange={(e) => set('offer_url', e.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="label">Текст кнопки</label>
                <input
                  value={form.offer_button_text}
                  onChange={(e) => set('offer_button_text', e.target.value)}
                  className="input"
                  placeholder="Получить"
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <input
              id="chat_enabled"
              type="checkbox"
              checked={form.chat_enabled}
              onChange={(e) => set('chat_enabled', e.target.checked)}
              className="w-4 h-4 accent-brand"
            />
            <label htmlFor="chat_enabled" className="text-sm">Включить чат</label>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
        >
          {saving ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Создать'}
        </button>
      </form>

      <style>{`
        .label { display: block; font-size: 0.8rem; font-weight: 500; margin-bottom: 4px; color: #374151; }
        .input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 0.875rem; outline: none; }
        .input:focus { box-shadow: 0 0 0 2px #6366f1; border-color: #6366f1; }
      `}</style>
    </AdminLayout>
  )
}
