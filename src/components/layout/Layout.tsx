import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const pageTitles: Record<string, string> = {
  '/dashboard': 'CIO Dashboard',
  '/applications': 'Application Registry',
  '/checklists': 'Daily Checklists',
  '/network': 'Network & Servers',
  '/security': 'Security Operations',
  '/vapt': 'VAPT Tracker',
  '/projects': 'Projects & Tasks',
  '/my-tasks': 'My Tasks',
  '/users': 'User Management',
  '/audit': 'Audit Logs',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || pageTitles[Object.keys(pageTitles).find(k => pathname.startsWith(k)) || ''] || 'CIO Dashboard'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
