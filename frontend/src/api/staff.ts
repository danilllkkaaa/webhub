import { api } from './client'

export type OrganizationRole = 'owner' | 'admin' | 'manager'
export type ProjectMemberRole = 'project_admin' | 'content_manager' | 'webinar_moderator' | 'support' | 'analyst'

export interface StaffProjectAccess {
  project_id: number
  project_name: string
  project_color: string
  role: ProjectMemberRole
  created_at: string
}

export interface StaffUser {
  id: number
  organization_id: number | null
  email: string
  full_name: string | null
  role: OrganizationRole
  is_active: boolean
  created_at: string
  projects: StaffProjectAccess[]
}

export interface ProjectMember {
  id: number
  project_id: number
  user_id: number
  email: string
  full_name: string | null
  organization_role: OrganizationRole
  role: ProjectMemberRole
  is_active: boolean
  created_at: string
}

export const staffApi = {
  list: () => api.get<StaffUser[]>('/admin/staff/').then((r) => r.data),
  create: (data: {
    email: string
    full_name?: string
    temp_password?: string
    organization_role: OrganizationRole
    project_id: number
    project_role: ProjectMemberRole
  }) => api.post<StaffUser>('/admin/staff/', data).then((r) => r.data),
  update: (userId: number, data: { full_name?: string; organization_role?: OrganizationRole; is_active?: boolean }) =>
    api.patch<StaffUser>(`/admin/staff/users/${userId}`, data).then((r) => r.data),
  projectMembers: (projectId: number) =>
    api.get<ProjectMember[]>(`/admin/staff/projects/${projectId}/members`).then((r) => r.data),
  addProjectMember: (projectId: number, data: {
    email: string
    full_name?: string
    temp_password?: string
    organization_role: OrganizationRole
    role: ProjectMemberRole
  }) => api.post<ProjectMember>(`/admin/staff/projects/${projectId}/members`, data).then((r) => r.data),
  updateProjectMember: (projectId: number, userId: number, role: ProjectMemberRole) =>
    api.patch<ProjectMember>(`/admin/staff/projects/${projectId}/members/${userId}`, { role }).then((r) => r.data),
  removeProjectMember: (projectId: number, userId: number) =>
    api.delete(`/admin/staff/projects/${projectId}/members/${userId}`),
}
