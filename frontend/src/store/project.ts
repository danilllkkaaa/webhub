import { create } from 'zustand'

interface ProjectState {
  currentProjectId: number | null
  currentProjectName: string | null
  currentProjectColor: string | null
  setProject: (id: number, name: string, color: string) => void
  clearProject: () => void
}

const load = () => {
  try { return JSON.parse(localStorage.getItem('current_project') || 'null') } catch { return null }
}

const saved = load()

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId:    saved?.id    ?? null,
  currentProjectName:  saved?.name  ?? null,
  currentProjectColor: saved?.color ?? null,

  setProject: (id, name, color) => {
    localStorage.setItem('current_project', JSON.stringify({ id, name, color }))
    set({ currentProjectId: id, currentProjectName: name, currentProjectColor: color })
  },

  clearProject: () => {
    localStorage.removeItem('current_project')
    set({ currentProjectId: null, currentProjectName: null, currentProjectColor: null })
  },
}))
