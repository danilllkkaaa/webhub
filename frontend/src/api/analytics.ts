import { api } from './client'

export interface Analytics {
  webinar_id: number
  total_registrations: number
  total_visitors: number
  conversion_reg_to_visit: number
  avg_watch_seconds: number
  total_chat_messages: number
  total_offer_clicks: number
  conversion_visit_to_click: number
  utm_breakdown: Record<string, number>
}

export const analyticsApi = {
  get: (webinarId: number) =>
    api.get<Analytics>(`/admin/analytics/${webinarId}`).then((r) => r.data),
  exportCsv: (webinarId: number) =>
    api.get(`/admin/webinars/${webinarId}/registrations/export`, { responseType: 'blob' }),
  exportExcel: (webinarId: number) =>
    api.get(`/admin/webinars/${webinarId}/registrations/export.xlsx`, { responseType: 'blob' }),
}
