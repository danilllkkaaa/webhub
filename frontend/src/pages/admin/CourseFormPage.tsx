import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { courseApi } from '../../api/courses'
import { Copy } from 'lucide-react'

export default function CourseFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', cover_url: '', status: 'draft' })
  const [invite, setInvite] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    courseApi.get(Number(id)).then((course) => {
      setForm({
        title: course.title,
        description: course.description ?? '',
        cover_url: course.cover_url ?? '',
        status: course.status,
      })
      setInvite(course.invite_token)
    })
  }, [id])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, description: form.description || undefined, cover_url: form.cover_url || undefined } as any
    try {
      if (isEdit) {
        const updated = await courseApi.update(Number(id), payload)
        setInvite(updated.invite_token)
      } else {
        const created = await courseApi.create(payload)
        navigate(`/admin/courses/${created.id}/builder`, { replace: true })
      }
    } finally {
      setSaving(false)
    }
  }

  const inviteLink = invite ? `${window.location.origin}/course/join/${invite}` : ''

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{isEdit ? 'Настройки курса' : 'Новый курс'}</h1>
        <p className="text-sm text-gray-400">Основная информация и публичная ссылка</p>
      </div>

      {inviteLink && (
        <div className="max-w-2xl bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 flex gap-3 items-center">
          <span className="text-sm text-emerald-800 truncate flex-1">{inviteLink}</span>
          <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="text-emerald-700" title="Скопировать">
            <Copy size={16} />
          </button>
        </div>
      )}

      <form onSubmit={submit} className="max-w-2xl bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="label">Название *</label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Название курса" />
        </div>
        <div>
          <label className="label">Описание</label>
          <textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Обложка URL</label>
          <input className="input" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Статус</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Черновик</option>
            <option value="published">Опубликован</option>
            <option value="archived">Архив</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button disabled={saving} className="bg-brand text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {isEdit && <button type="button" onClick={() => navigate(`/admin/courses/${id}/builder`)} className="border rounded-lg px-5 py-2 text-sm">Конструктор</button>}
        </div>
      </form>
      <style>{`.label{display:block;font-size:.8rem;font-weight:600;margin-bottom:4px}.input{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:9px 12px;font-size:.875rem}`}</style>
    </AdminLayout>
  )
}
