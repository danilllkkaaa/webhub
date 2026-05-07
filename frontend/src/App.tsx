import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth, RequireProject } from './components/admin/RouteGuards'

import LoginPage from './pages/admin/LoginPage'
import ForgotPasswordPage from './pages/admin/ForgotPasswordPage'
import ResetPasswordPage from './pages/admin/ResetPasswordPage'
import RegisterOrganizationPage from './pages/admin/RegisterOrganizationPage'
import ProjectsPage from './pages/admin/ProjectsPage'
import DashboardPage from './pages/admin/DashboardPage'
import WebinarListPage from './pages/admin/WebinarListPage'
import WebinarFormPage from './pages/admin/WebinarFormPage'
import TimelineEditorPage from './pages/admin/TimelineEditorPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import BroadcastPage from './pages/admin/BroadcastPage'
import SettingsPage from './pages/admin/SettingsPage'
import ComingSoonPage from './pages/admin/ComingSoonPage'
import StaffPage from './pages/admin/StaffPage'
import CourseListPage from './pages/admin/CourseListPage'
import CourseFormPage from './pages/admin/CourseFormPage'
import CourseBuilderPage from './pages/admin/CourseBuilderPage'
import CourseStudentsPage from './pages/admin/CourseStudentsPage'
import RegisterPage from './pages/public/RegisterPage'
import WatchPage from './pages/public/WatchPage'
import CourseJoinPage from './pages/public/CourseJoinPage'
import CourseLearnPage from './pages/public/CourseLearnPage'
import StudentDashboardPage from './pages/public/StudentDashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/register" element={<RegisterOrganizationPage />} />

        {/* Project selector */}
        <Route path="/admin/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />

        {/* Admin routes require auth and, for workspace pages, a selected project. */}
        <Route path="/admin" element={<RequireAuth><RequireProject><DashboardPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/webinars" element={<RequireAuth><RequireProject><WebinarListPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/webinars/new" element={<RequireAuth><RequireProject><WebinarFormPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/webinars/:id/edit" element={<RequireAuth><RequireProject><WebinarFormPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/webinars/:id/timeline" element={<RequireAuth><RequireProject><TimelineEditorPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/webinars/:id/analytics" element={<RequireAuth><RequireProject><AnalyticsPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/webinars/:id/broadcast" element={<RequireAuth><RequireProject><BroadcastPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/courses" element={<RequireAuth><RequireProject><CourseListPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/courses/new" element={<RequireAuth><RequireProject><CourseFormPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/courses/:id/settings" element={<RequireAuth><RequireProject><CourseFormPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/courses/:id/builder" element={<RequireAuth><RequireProject><CourseBuilderPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/courses/:id/students" element={<RequireAuth><RequireProject><CourseStudentsPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/settings"      element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/admin/billing"       element={<RequireAuth><RequireProject><ComingSoonPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/staff"         element={<RequireAuth><RequireProject><StaffPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/bonuses"       element={<RequireAuth><RequireProject><ComingSoonPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/achievements"  element={<RequireAuth><RequireProject><ComingSoonPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/coming-soon"   element={<RequireAuth><RequireProject><ComingSoonPage /></RequireProject></RequireAuth>} />
        <Route path="/admin/about"         element={<RequireAuth><ComingSoonPage /></RequireAuth>} />
        <Route path="/admin/help"          element={<RequireAuth><ComingSoonPage /></RequireAuth>} />

        {/* Public */}
        <Route path="/join/:inviteToken" element={<RegisterPage />} />
        <Route path="/webinars/:slug/watch" element={<WatchPage />} />
        
        {/* Student Portal */}
        <Route path="/course/invite/:inviteToken" element={<CourseJoinPage />} />
        <Route path="/course/join/:inviteToken" element={<CourseJoinPage />} />
        <Route path="/student/dashboard" element={<StudentDashboardPage />} />
        <Route path="/course/:slug/learn" element={<CourseLearnPage />} />

        <Route path="*" element={<Navigate to="/admin/projects" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
