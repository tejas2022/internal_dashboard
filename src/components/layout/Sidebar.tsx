import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, ClipboardCheck, Network, Shield, Bug,
  FolderKanban, CheckSquare, Users, ScrollText, LogOut, ChevronLeft,
  ChevronRight, Presentation, HardDrive
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { clsx } from 'clsx'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
  userAccess?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', adminOnly: true },
  { to: '/applications', icon: <Server size={18} />, label: 'Applications', adminOnly: true },
  { to: '/checklists', icon: <ClipboardCheck size={18} />, label: 'Checklists', userAccess: true },
  { to: '/infra-checklists', icon: <HardDrive size={18} />, label: 'Infra BOD', userAccess: true },
  { to: '/network', icon: <Network size={18} />, label: 'Network', adminOnly: true },
  { to: '/security', icon: <Shield size={18} />, label: 'Security', adminOnly: true },
  { to: '/vapt', icon: <Bug size={18} />, label: 'VAPT', adminOnly: true },
  { to: '/projects', icon: <FolderKanban size={18} />, label: 'Projects', adminOnly: true },
  { to: '/my-tasks', icon: <CheckSquare size={18} />, label: 'My Tasks', userAccess: true },
  { to: '/users', icon: <Users size={18} />, label: 'Users', adminOnly: true },
  { to: '/audit', icon: <ScrollText size={18} />, label: 'Audit Logs', adminOnly: true },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter(item => {
    if (user?.role === 'admin') return true
    if (item.userAccess && user?.role === 'user') return true
    return false
  })

  return (
    <aside className={clsx(
      'flex flex-col bg-primary-800 text-white transition-all duration-300 min-h-screen',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-primary-700">
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white leading-tight">CIO Dashboard</div>
            <div className="text-xs text-primary-300">Operations Platform</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-primary-700 text-primary-300 hover:text-white transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              isActive
                ? 'bg-primary-600 text-white font-medium'
                : 'text-primary-200 hover:bg-primary-700 hover:text-white'
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Stakeholder View Link (Admin) */}
      {user?.role === 'admin' && (
        <NavLink
          to="/stakeholder"
          title={collapsed ? 'Stakeholder View' : undefined}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-200 hover:bg-primary-700 hover:text-white border-t border-primary-700"
        >
          <Presentation size={18} />
          {!collapsed && <span>Stakeholder View</span>}
        </NavLink>
      )}

      {/* User info + logout */}
      <div className="border-t border-primary-700 p-3">
        {!collapsed && (
          <div className="mb-2 px-1">
            <div className="text-xs text-white font-medium truncate">{user?.name}</div>
            <div className="text-xs text-primary-300 capitalize">{user?.role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="flex items-center gap-2 w-full px-1 py-1.5 text-xs text-primary-300 hover:text-white transition-colors rounded hover:bg-primary-700"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
