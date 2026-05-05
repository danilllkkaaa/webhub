import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { timelineApi, TimelineEvent, EventType } from '../../api/timeline'
import { webinarApi, Webinar } from '../../api/webinars'
import AdminLayout from '../../components/admin/AdminLayout'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'

const EVENT_LABELS: Record<EventType, string> = {
  chat_message: '💬 Сообщение в чат',
  offer_show: '🎯 Показать оффер',
  offer_hide: '🙈 Скрыть оффер',
  banner_show: '📢 Показать баннер',
  banner_hide: '📴 Скрыть баннер',
  redirect: '↗️ Редирект',
}

function secondsToTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function timeToSeconds(t: string): number {
  const [m, s] = t.split(':').map(Number)
  return (m || 0) * 60 + (s || 0)
}

export default function TimelineEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const webinarId = Number(id)

  const [webinar, setWebinar] = useState<Webinar | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [newType, setNewType] = useState<EventType>('chat_message')
  const [newTime, setNewTime] = useState('00:00')
  const [newPayload, setNewPayload] = useState('')
  const [adding, setAdding] = useState(false)

  const load = async () => {
    const [wb, evs] = await Promise.all([webinarApi.get(webinarId), timelineApi.list(webinarId)])
    setWebinar(wb)
    setEvents(evs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    const event = await timelineApi.create(webinarId, {
      event_type: newType,
      offset_seconds: timeToSeconds(newTime),
      payload: newPayload || undefined,
    })
    setEvents((prev) => [...prev, event].sort((a, b) => a.offset_seconds - b.offset_seconds))
    setNewPayload('')
    setAdding(false)
  }

  const handleDelete = async (eventId: number) => {
    await timelineApi.delete(eventId)
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  if (loading) return <AdminLayout><p className="text-gray-500">Загрузка...</p></AdminLayout>

  return (
    <AdminLayout>
      <div className="mb-6">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2">
          <ChevronLeft size={16} /> Назад
        </button>
        <h1 className="text-2xl font-bold">Таймлайн: {webinar?.title}</h1>
        <p className="text-sm text-gray-500 mt-1">События автовебинара появляются в нужную секунду от старта</p>
      </div>

      {/* Add event form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Тип события</label>
          <select value={newType} onChange={(e) => setNewType(e.target.value as EventType)} className="border rounded-lg px-3 py-2 text-sm">
            {Object.entries(EVENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Время (мм:сс)</label>
          <input
            type="text"
            pattern="\d{2}:\d{2}"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-24"
            placeholder="01:30"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium mb-1">Данные / текст</label>
          <input
            value={newPayload}
            onChange={(e) => setNewPayload(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full"
            placeholder={
              newType === 'chat_message' ? 'Текст сообщения' :
              newType === 'redirect' ? 'https://...' :
              newType === 'banner_show' ? 'Текст баннера' : 'необязательно'
            }
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="flex items-center gap-1 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
        >
          <Plus size={16} /> Добавить
        </button>
      </form>

      {/* Timeline */}
      {events.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Нет событий. Добавьте первое!</p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600 shrink-0">
                {secondsToTime(ev.offset_seconds)}
              </span>
              <span className="text-sm flex-1">
                <span className="font-medium">{EVENT_LABELS[ev.event_type]}</span>
                {ev.payload && <span className="ml-2 text-gray-500 truncate">{ev.payload}</span>}
              </span>
              <button
                onClick={() => handleDelete(ev.id)}
                className="text-gray-400 hover:text-red-500 p-1 rounded"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
