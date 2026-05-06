import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { projectApi } from '../../api/projects'
import { useAuthStore } from '../../store/auth'
import { useProjectStore } from '../../store/project'

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />
}

export function RequireProject({ children }: { children: ReactNode }) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const clearProject = useProjectStore((s) => s.clearProject)
  const [checking, setChecking] = useState(Boolean(projectId))
  const [valid, setValid] = useState(false)

  useEffect(() => {
    let mounted = true

    if (!projectId) {
      setChecking(false)
      setValid(false)
      return () => { mounted = false }
    }

    setChecking(true)
    projectApi.list()
      .then((projects) => {
        if (!mounted) return
        const exists = projects.some((project) => project.id === projectId)
        if (!exists) clearProject()
        setValid(exists)
      })
      .catch(() => {
        if (!mounted) return
        setValid(false)
      })
      .finally(() => {
        if (mounted) setChecking(false)
      })

    return () => { mounted = false }
  }, [clearProject, projectId])

  if (!projectId) return <Navigate to="/admin/projects" replace />
  if (checking) return <div className="min-h-screen bg-gray-100 p-6 text-sm text-gray-400">Загрузка проекта...</div>
  return valid ? <>{children}</> : <Navigate to="/admin/projects" replace />
}
