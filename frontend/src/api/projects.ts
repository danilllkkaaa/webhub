import { api } from './client'

export interface Project {
  id: number
  organization_id: number
  name: string
  color: string
  webinar_count: number
  access_type: 'owner' | 'shared'
  member_role: string | null
  created_at: string
}

export const projectApi = {
  list: () => api.get<Project[]>('/projects/').then((r) => r.data),
  create: (name: string, color: string) =>
    api.post<Project>('/projects/', { name, color }).then((r) => r.data),
  update: (id: number, data: { name?: string; color?: string }) =>
    api.patch<Project>(`/projects/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/projects/${id}`),
}
