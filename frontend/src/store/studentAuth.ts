import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CourseStudent } from '../api/courses'

interface StudentAuthState {
  email: string | null
  registrations: CourseStudent[]
  setAuth: (email: string, registrations: CourseStudent[]) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useStudentAuth = create<StudentAuthState>()(
  persist(
    (set, get) => ({
      email: null,
      registrations: [],
      setAuth: (email, registrations) => set({ email, registrations }),
      logout: () => {
        set({ email: null, registrations: [] })
        localStorage.removeItem('student_token') // Legacy cleanup
      },
      isAuthenticated: () => !!get().email,
    }),
    { name: 'student_auth_storage' }
  )
)
