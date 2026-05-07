import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const adminToken = localStorage.getItem('admin_token')
    const url = String(err.config?.url ?? '')
    const isStudentRequest = url.startsWith('/course/') || url.startsWith('/student/')
    if (err.response?.status === 401 && adminToken && !isStudentRequest) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('current_project')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)
