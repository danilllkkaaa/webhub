import { api } from './client'
import { useProjectStore } from '../store/project'

const pid = () => useProjectStore.getState().currentProjectId

export type CourseStatus = 'draft' | 'published' | 'archived'
export type LessonType = 'video' | 'text' | 'mixed'
export type CourseStudentStatus = 'pending' | 'approved' | 'rejected'
export type QuizQuestionType = 'single' | 'multiple'

export interface Course {
  id: number
  public_id: string
  project_id: number | null
  slug: string
  invite_token: string
  title: string
  description: string | null
  cover_url: string | null
  status: CourseStatus
  sequential_access: boolean
  module_count: number
  lesson_count: number
  student_count: number
  created_at: string
  updated_at: string
}

export interface QuizOption {
  id?: number
  text: string
  is_correct?: boolean
  position: number
}

export interface QuizQuestion {
  id?: number
  text: string
  question_type: QuizQuestionType
  position: number
  options: QuizOption[]
}

export interface Quiz {
  id: number
  module_id: number
  title: string
  description: string | null
  passing_score: number
  questions?: QuizQuestion[]
  created_at: string
}

export interface CourseModule {
  id: number
  course_id: number
  title: string
  description: string | null
  position: number
  is_published: boolean
  quiz: Quiz | null
  created_at: string
}

export interface CourseLesson {
  id: number
  module_id: number
  title: string
  lesson_type: LessonType
  video_url: string | null
  video_id: string | null
  bunny_video_id: string | null
  content: string | null
  position: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface CourseStudent {
  id: number
  course_id: number
  token: string
  name: string
  phone: string
  email: string
  telegram: string | null
  status: CourseStudentStatus
  progress_percent: number
  completed_lessons: number
  total_lessons: number
  created_at: string
  last_seen_at: string | null
}

export interface CourseStructure {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
}

export interface CourseLearn {
  course: Course
  student: CourseStudent
  modules: CourseModule[]
  lessons: CourseLesson[]
  completed_lesson_ids: number[]
  passed_quiz_ids: number[]
  quiz_count: number
  avg_quiz_score: number | null
}

export interface QuizAttempt {
  id: number
  score: number
  passed: boolean
  created_at: string
}

export interface StudentDashboardCourse {
  course: Course
  registration: CourseStudent
  avg_quiz_score: number
}

export interface StudentDashboard {
  courses: StudentDashboardCourse[]
  stats: {
    total_courses: number
    total_completed_lessons: number
    avg_global_score: number
  }
}

export const courseApi = {
  list: () => api.get<Course[]>('/courses/', { params: { project_id: pid() } }).then((r) => r.data),
  get: (id: number | string) => api.get<Course>(`/courses/${id}`).then((r) => r.data),
  create: (data: Partial<Course>) => api.post<Course>('/courses/', { ...data, project_id: pid() }).then((r) => r.data),
  update: (id: number | string, data: Partial<Course>) => api.patch<Course>(`/courses/${id}`, data).then((r) => r.data),
  delete: (id: number | string) => api.delete(`/courses/${id}`),
  structure: (id: number | string) => api.get<CourseStructure>(`/courses/${id}/structure`).then((r) => r.data),
  
  createModule: (courseId: number | string, data: Partial<CourseModule>) =>
    api.post<CourseModule>(`/courses/${courseId}/modules`, data).then((r) => r.data),
  updateModule: (id: number, data: Partial<CourseModule>) =>
    api.patch<CourseModule>(`/courses/modules/${id}`, data).then((r) => r.data),
  deleteModule: (id: number) => api.delete(`/courses/modules/${id}`),
  
  createLesson: (moduleId: number, data: Partial<CourseLesson>) =>
    api.post<CourseLesson>(`/courses/modules/${moduleId}/lessons`, data).then((r) => r.data),
  updateLesson: (id: number, data: Partial<CourseLesson>) =>
    api.patch<CourseLesson>(`/courses/lessons/${id}`, data).then((r) => r.data),
  deleteLesson: (id: number) => api.delete(`/courses/lessons/${id}`),

  createQuiz: (moduleId: number, data: Partial<Quiz>) =>
    api.post<Quiz>(`/courses/modules/${moduleId}/quiz`, data).then((r) => r.data),
  getQuiz: (moduleId: number) =>
    api.get<Quiz>(`/courses/modules/${moduleId}/quiz`).then((r) => r.data),
  updateQuiz: (moduleId: number, data: Partial<Quiz>) =>
    api.put<Quiz>(`/courses/modules/${moduleId}/quiz`, data).then((r) => r.data),
  deleteQuiz: (moduleId: number) =>
    api.delete(`/courses/modules/${moduleId}/quiz`),
  submitQuiz: (quizId: number, token: string, answers: Record<string, number[]>) =>
    api.post<QuizAttempt>(`/course/quizzes/${quizId}/attempt`, { answers }, { params: { token } }).then((r) => r.data),

  students: (courseId: number | string) => api.get<CourseStudent[]>(`/courses/${courseId}/students`).then((r) => r.data),
  exportStudents: (courseId: number | string) =>
    api.get(`/courses/${courseId}/students/export.xlsx`, { responseType: 'blob' }),
  
  invite: (token: string) => api.get<Course>(`/course/invite/${token}`).then((r) => r.data),
  join: (token: string, data: { name: string; phone: string; email: string; password: string; telegram?: string }) =>
    api.post<CourseStudent>(`/course/invite/${token}/join`, data).then((r) => r.data),
  learn: (slug: string, token: string) =>
    api.get<CourseLearn>(`/course/${slug}/learn`, { params: { token } }).then((r) => r.data),
  completeLesson: (lessonId: number, token: string) =>
    api.post(`/course/lessons/${lessonId}/complete`, null, { params: { token } }),
  updateStudentStatus: (_courseId: number | string, studentId: number, data: { status: CourseStudentStatus }) =>
    api.patch<CourseStudent>(`/courses/students/${studentId}`, data).then((r) => r.data),
  studentLogin: (data: { email: string; password: string }) =>
    api.post<CourseStudent[]>('/course/login', data).then((r) => r.data),
  studentDashboard: (tokens: string[]) => {
    const params = new URLSearchParams()
    tokens.forEach((token) => params.append('tokens', token))
    return api.get<StudentDashboard>(`/student/dashboard?${params.toString()}`).then((r) => r.data)
  },
}
