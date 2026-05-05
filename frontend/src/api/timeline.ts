import { api } from './client'

export type EventType = 'chat_message' | 'offer_show' | 'offer_hide' | 'banner_show' | 'banner_hide' | 'redirect'

export interface TimelineEvent {
  id: number
  webinar_id: number
  event_type: EventType
  offset_seconds: number
  payload: string | null
  created_at: string
}

export const timelineApi = {
  list: (webinarId: number) =>
    api.get<TimelineEvent[]>(`/admin/webinars/${webinarId}/timeline`).then((r) => r.data),
  create: (webinarId: number, data: { event_type: EventType; offset_seconds: number; payload?: string }) =>
    api.post<TimelineEvent>(`/admin/webinars/${webinarId}/timeline`, data).then((r) => r.data),
  update: (eventId: number, data: Partial<{ event_type: EventType; offset_seconds: number; payload: string }>) =>
    api.patch<TimelineEvent>(`/admin/timeline/${eventId}`, data).then((r) => r.data),
  delete: (eventId: number) => api.delete(`/admin/timeline/${eventId}`),
  publicList: (webinarId: number) =>
    api.get<TimelineEvent[]>(`/webinars/${webinarId}/timeline`).then((r) => r.data),
}
