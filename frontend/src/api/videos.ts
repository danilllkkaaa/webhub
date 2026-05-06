import { api } from './client'

export interface VideoUploadInfo {
  video_id: string
  upload_url: string
  access_key: string
  library_id: string
}

export interface VideoStatus {
  status: number
  encode_progress: number
  duration: number | null
  ready: boolean
}

export const videoApi = {
  create: (title: string) =>
    api.post<VideoUploadInfo>('/admin/videos/create', { title }).then((r) => r.data),
  status: (videoId: string) =>
    api.get<VideoStatus>(`/admin/videos/${videoId}/status`).then((r) => r.data),
  delete: (videoId: string) => api.delete(`/admin/videos/${videoId}`),
}
