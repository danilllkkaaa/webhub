import { create } from 'zustand'
import { api } from '../api/client'

interface AuthState {
  token: string | null
  login: (email: string, password: string) => Promise<void>
  registerOrganization: (data: {
    full_name: string
    email: string
    password: string
    password_confirm: string
    organization_name: string
    project_name: string
  }) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('admin_token', data.access_token)
    set({ token: data.access_token })
  },

  registerOrganization: async (payload) => {
    const { data } = await api.post('/auth/register-organization', payload)
    localStorage.setItem('admin_token', data.access_token)
    set({ token: data.access_token })
  },

  logout: () => {
    localStorage.removeItem('admin_token')
    set({ token: null })
  },
}))
