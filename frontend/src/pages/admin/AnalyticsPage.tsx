import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { analyticsApi, Analytics } from '../../api/analytics'
import { webinarApi, Webinar } from '../../api/webinars'
import AdminLayout from '../../components/admin/AdminLayout'
import { ChevronLeft, Download } from 'lucide-react'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const webinarId = Number(id)
  const navigate = useNavigate()

  const [webinar, setWebinar] = useState<Webinar | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([webinarApi.get(webinarId), analyticsApi.get(webinarId)])
      .then(([wb, an]) => { setWebinar(wb); setAnalytics(an) })
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    const res = await analyticsApi.exportExcel(webinarId)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `participants_${webinarId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmtTime = (s: number) => {
    if (s < 60) return `${Math.round(s)} сек`
    return `${Math.floor(s / 60)} мин ${Math.round(s % 60)} сек`
  }

  if (loading) return <AdminLayout><p className="text-gray-500">Загрузка...</p></AdminLayout>

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2">
            <ChevronLeft size={16} /> Назад
          </button>
          <h1 className="text-2xl font-bold">Аналитика: {webinar?.title}</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Download size={16} /> Экспорт Excel
        </button>
      </div>

      {analytics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Регистраций" value={analytics.total_registrations} />
            <StatCard label="Посетителей" value={analytics.total_visitors} />
            <StatCard label="Конверсия рег → посещ." value={`${analytics.conversion_reg_to_visit}%`} />
            <StatCard label="Ср. время просмотра" value={fmtTime(analytics.avg_watch_seconds)} />
            <StatCard label="Сообщений в чате" value={analytics.total_chat_messages} />
            <StatCard label="Кликов по офферу" value={analytics.total_offer_clicks} />
            <StatCard label="Конверсия посещ. → клик" value={`${analytics.conversion_visit_to_click}%`} />
          </div>

          {Object.keys(analytics.utm_breakdown).length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3 text-sm">UTM-источники</h3>
              <div className="space-y-2">
                {Object.entries(analytics.utm_breakdown).map(([source, count]) => (
                  <div key={source} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-32 truncate">{source}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-brand h-2 rounded-full"
                        style={{ width: `${Math.min(100, (count / analytics.total_registrations) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}
