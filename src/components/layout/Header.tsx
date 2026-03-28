import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth()
  const now = format(new Date(), 'EEE, dd MMM yyyy HH:mm')

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-400">{now}</span>
        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 relative">
          <Bell size={17} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-800 flex items-center justify-center text-white text-xs font-semibold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-gray-700">{user?.name}</span>
        </div>
      </div>
    </header>
  )
}
