import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import Checklists from './pages/Checklists'
import ChecklistSubmit from './pages/ChecklistSubmit'
import Network from './pages/Network'
import Security from './pages/Security'
import Vapt from './pages/Vapt'
import Projects from './pages/Projects'
import MyTasks from './pages/MyTasks'
import Stakeholder from './pages/Stakeholder'
import Users from './pages/Users'
import AuditLogs from './pages/AuditLogs'

const ProtectedRoute: React.FC<{
  element: React.ReactElement
  adminOnly?: boolean
  stakeholderOnly?: boolean
}> = ({ element, adminOnly, stakeholderOnly }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-800" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  if (stakeholderOnly && user.role !== 'stakeholder') return <Navigate to="/" replace />

  return element
}

const AppRoutes = () => {
  const { user } = useAuth()

  const defaultRoute = () => {
    if (!user) return '/login'
    if (user.role === 'stakeholder') return '/stakeholder'
    if (user.role === 'admin') return '/dashboard'
    return '/my-tasks'
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/stakeholder" element={<Stakeholder />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} adminOnly />} />
        <Route path="/applications" element={<ProtectedRoute element={<Applications />} adminOnly />} />
        <Route path="/checklists" element={<ProtectedRoute element={<Checklists />} />} />
        <Route path="/checklists/submit/:appId" element={<ProtectedRoute element={<ChecklistSubmit />} />} />
        <Route path="/network" element={<ProtectedRoute element={<Network />} adminOnly />} />
        <Route path="/security" element={<ProtectedRoute element={<Security />} adminOnly />} />
        <Route path="/vapt" element={<ProtectedRoute element={<Vapt />} adminOnly />} />
        <Route path="/projects" element={<ProtectedRoute element={<Projects />} adminOnly />} />
        <Route path="/my-tasks" element={<ProtectedRoute element={<MyTasks />} />} />
        <Route path="/users" element={<ProtectedRoute element={<Users />} adminOnly />} />
        <Route path="/audit" element={<ProtectedRoute element={<AuditLogs />} adminOnly />} />
      </Route>

      <Route path="/" element={<Navigate to={defaultRoute()} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
