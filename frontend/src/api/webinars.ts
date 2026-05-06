import { api } from './client'
import { useProjectStore } from '../store/project'

const pid = () => useProjectStore.getState().currentProjectId

export interface Webinar {
  id: number
  slug: string
  invite_token: string | null
  title: string
  description: string | null
  webinar_type: 'live' | 'auto'
  status: 'draft' | 'scheduled' | 'live' | 'finished'
  youtube_url: string | null
  video_id: string | null
  scheduled_at: string | null
  duration_minutes: number | null
  offer_text: string | null
  offer_url: string | null
  offer_button_text: string | null
  chat_enabled: boolean
  project_id: number | null
  created_at: string
  updated_at: string
}

export interface WebinarCreate {
  title: string
  description?: string
  webinar_type?: 'live' | 'auto'
  youtube_url?: string
  scheduled_at?: string
  duration_minutes?: number
  offer_text?: string
  offer_url?: string
  offer_button_text?: string
  chat_enabled?: boolean
}

export const webinarApi = {
  list: () =>
    api.get<Webinar[]>('/webinars/', { params: { project_id: pid() } }).then((r) => r.data),
  get: (id: number) =>
    api.get<Webinar>(`/webinars/${id}`).then((r) => r.data),
  create: (data: WebinarCreate) =>
    api.post<Webinar>('/webinars/', { ...data, project_id: pid() }).then((r) => r.data),
  update: (id: number, data: Partial<WebinarCreate> & { status?: string }) =>
    api.patch<Webinar>(`/webinars/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/webinars/${id}`),
  createScenario: (id: number, youtube_url: string) =>
    api.post<Webinar>(`/webinars/${id}/create-scenario`, { youtube_url }).then((r) => r.data),
}
