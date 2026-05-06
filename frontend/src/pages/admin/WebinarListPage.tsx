import { useEffect, useState, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { webinarApi, Webinar } from '../../api/webinars'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  Plus, Pencil, Trash2, BarChart2, ListVideo,
  Link2, Radio, Search, Settings, Clapperboard, X,
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

type Tab = 'all' | 'live' | 'scheduled' | 'auto' | 'finished'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',       label: 'Все' },
  { id: 'live',      label: 'В эфире' },
  { id: 'scheduled', label: 'Запланированные' },
  { id: 'auto',      label: 'Автовебинары' },
  { id: 'finished',  label: 'Завершённые' },
]

const STATUS_DOT: Record<string, string> = {
  draft:     'bg-gray-300',
  scheduled: 'bg-blue-400',
  live:      'bg-green-500 animate-pulse',
  finished:  'bg-gray-400',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Черновик', scheduled: 'Запланирован', live: 'В эфире', finished: 'Завершён',
}

export default function WebinarListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [webinars, setWebinars]   = useState<Webinar[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [copiedId, setCopiedId]   = useState<number | null>(null)

  const [scenarioModal, setScenarioModal] = useState<Webinar | null>(null)
  const [scenarioUrl, setScenarioUrl]     = useState('')
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [scenarioDone, setScenarioDone]   = useState<Webinar | null>(null)

  const tab = (searchParams.get('tab') as Tab) || 'all'
  const setTab = (t: Tab) => setSearchParams(t === 'all' ? {} : { tab: t })

  useEffect(() => {
    webinarApi.list().then(setWebinars).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить вебинар? Это действие нельзя отменить.')) return
    await webinarApi.delete(id)
    setWebinars((prev) => prev.filter((w) => w.id !== id))
  }

  const handleGoLive = (w: Webinar) => {
    navigate(`/admin/webinars/${w.id}/broadcast`)
  }

  const handleCreateScenario = async (e: FormEvent) => {
    e.preventDefault()
    if (!scenarioModal) return
    setScenarioLoading(true)
    try {
      const newWebinar = await webinarApi.createScenario(scenarioModal.id, scenarioUrl)
      setScenarioDone(newWebinar)
      setWebinars((prev) => [newWebinar, ...prev])
    } finally {
      setScenarioLoading(false)
    }
  }

  const copyInviteLink = (w: Webinar) => {
    if (!w.invite_token) return
    const link = `${window.location.origin}/join/${w.invite_token}`
    navigator.clipboard.writeText(link)
    setCopiedId(w.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = webinars
    .filter((w) => {
      if (tab === 'live')      return w.status === 'live'
      if (tab === 'scheduled') return w.status === 'scheduled'
      if (tab === 'auto')      return w.webinar_type === 'auto'
      if (tab === 'finished')  return w.status === 'finished'
      return true
    })
    .filter((w) => !search || w.title.toLowerCase().includes(search.toLowerCase()))

  const count = (t: Tab) => {
    if (t === 'all')       return webinars.length
    if (t === 'live')      return webinars.filter((w) => w.status === 'live').length
    if (t === 'scheduled') return webinars.filter((w) => w.status === 'scheduled').length
    if (t === 'auto')      return webinars.filter((w) => w.webinar_type === 'auto').length
    if (t === 'finished')  return webinars.filter((w) => w.status === 'finished').length
    return 0
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Вебинарные комнаты</h1>
          <p className="text-sm text-gray-400 mt-0.5">Управление трансляциями и автовебинарами</p>
        </div>
        <Link
          to="/admin/webinars/new"
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-dark transition shadow-sm"
        >
          <Plus size={16} /> Создать комнату
        </Link>
      </div>

      {/* Tabs + search */}
      <div className="bg-white rounded-xl border mb-4">
        <div className="flex items-center gap-1 px-4 pt-3 border-b overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {count(t.id) > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count(t.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-gray-50"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <ListVideo size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 text-sm">
              {search ? `Ничего не найдено по запросу «${search}»` : 'Нет вебинаров в этой категории'}
            </p>
            {tab === 'all' && !search && (
              <Link
                to="/admin/webinars/new"
                className="inline-flex items-center gap-2 mt-4 bg-brand text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition"
              >
                <Plus size={15} /> Создать первый вебинар
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((w) => (
              <div key={w.id} className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition group">
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[w.status]}`} title={STATUS_LABEL[w.status]} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 truncate">{w.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      w.webinar_type === 'auto'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {w.webinar_type === 'live' ? 'ЖВ' : 'АВ'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {w.scheduled_at
                      ? format(new Date(w.scheduled_at), 'EEE, d MMM yyyy, HH:mm', { locale: ru })
                      : 'Дата не указана'}
                    {w.video_id && <span className="ml-2 font-mono opacity-70">▶ {w.video_id}</span>}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Viewer link */}
                  <button
                    onClick={() => copyInviteLink(w)}
                    className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 font-medium hover:bg-gray-100 transition text-gray-600"
                    title="Скопировать ссылку для зрителей"
                  >
                    <Link2 size={13} />
                    {copiedId === w.id ? 'Скопировано!' : 'Ссылка'}
                  </button>

                  {/* Go to broadcast or scenario */}
                  {w.status === 'finished' ? (
                    <button
                      onClick={() => { setScenarioModal(w); setScenarioUrl(''); setScenarioDone(null) }}
                      className="flex items-center gap-1.5 text-xs border border-purple-200 text-purple-700 rounded-lg px-3 py-1.5 font-medium hover:bg-purple-50 transition"
                    >
                      <Clapperboard size={13} /> Сценарий
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGoLive(w)}
                      className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 font-medium transition ${
                        w.status === 'live'
                          ? 'border-green-400 text-green-700 bg-green-50 hover:bg-green-100'
                          : 'border-green-200 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      <Radio size={13} />
                      {w.status === 'live' ? 'В эфире →' : 'Перейти в эфир'}
                    </button>
                  )}

                  {/* Settings */}
                  <Link
                    to={`/admin/webinars/${w.id}/edit`}
                    className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 font-medium hover:bg-gray-100 transition text-gray-600"
                    title="Настройка комнаты"
                  >
                    <Settings size={13} /> Настройка
                  </Link>

                  {/* Icon actions */}
                  <div className="flex items-center gap-0.5 ml-1">
                    <Link
                      to={`/admin/webinars/${w.id}/timeline`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand transition"
                      title="Таймлайн событий"
                    >
                      <ListVideo size={15} />
                    </Link>
                    <Link
                      to={`/admin/webinars/${w.id}/analytics`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand transition"
                      title="Аналитика"
                    >
                      <BarChart2 size={15} />
                    </Link>
                    <Link
                      to={`/admin/webinars/${w.id}/edit`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand transition"
                      title="Редактировать"
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      title="Удалить"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Scenario modal */}
      {scenarioModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold">Создать автовебинар из записи</h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{scenarioModal.title}</p>
              </div>
              <button onClick={() => setScenarioModal(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            {scenarioDone ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-800 text-sm">Сценарий создан</p>
                    <p className="text-xs text-green-600 mt-0.5">Автовебинар добавлен в черновики</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScenarioModal(null)}
                    className="flex-1 py-2.5 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={() => { navigate(`/admin/webinars/${scenarioDone.id}/broadcast`); setScenarioModal(null) }}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition"
                  >
                    Открыть →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateScenario} className="space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Введите ссылку на запись трансляции в YouTube. Система создаст автовебинар
                  с воспроизведением чата по таймлайну.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ссылка на запись YouTube
                  </label>
                  <input
                    autoFocus
                    type="url"
                    value={scenarioUrl}
                    onChange={(e) => setScenarioUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setScenarioModal(null)}
                    className="flex-1 py-2.5 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={scenarioLoading || !scenarioUrl.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition disabled:opacity-60"
                  >
                    {scenarioLoading ? 'Создание...' : 'Создать сценарий'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
