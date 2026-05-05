import { useLocation } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { Construction } from 'lucide-react'

const LABELS: Record<string, string> = {
  '/admin/billing':      'Услуги и финансы',
  '/admin/staff':        'Сотрудники',
  '/admin/bonuses':      'Бонусный магазин',
  '/admin/achievements': 'Достижения',
}

export default function ComingSoonPage() {
  const { pathname } = useLocation()
  const name = LABELS[pathname] ?? 'Раздел'

  return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
          <Construction size={28} className="text-amber-400" />
        </div>
        <p className="text-lg font-bold text-gray-800">{name}</p>
        <p className="text-sm text-gray-400 mt-1">Раздел находится в разработке</p>
      </div>
    </AdminLayout>
  )
}
