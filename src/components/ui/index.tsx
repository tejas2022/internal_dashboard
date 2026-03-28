import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

// ---- Button ----
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = ({
  variant = 'primary', size = 'md', loading, children, className, disabled, ...props
}: ButtonProps) => {
  const base = 'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1'
  const variants = {
    primary: 'bg-primary-800 text-white hover:bg-primary-700 focus:ring-primary-800',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2 text-sm gap-2', lg: 'px-5 py-2.5 text-sm gap-2' }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], (disabled || loading) && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />}
      {children}
    </button>
  )
}

// ---- Card ----
interface CardProps { children: ReactNode; className?: string; title?: string; action?: ReactNode }
export const Card = ({ children, className, title, action }: CardProps) => (
  <div className={clsx('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
)

// ---- Badge ----
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray'
interface BadgeProps { children: ReactNode; variant?: BadgeVariant; className?: string }
export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-primary-100 text-primary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

// ---- Severity Badge ----
const severityVariant = (s: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    critical: 'danger', high: 'danger', major: 'danger',
    medium: 'warning', minor: 'warning',
    low: 'info', informational: 'gray', clear: 'success', info: 'gray',
  }
  return map[s?.toLowerCase()] || 'gray'
}
export const SeverityBadge = ({ severity }: { severity: string }) => (
  <Badge variant={severityVariant(severity)} className="capitalize">{severity}</Badge>
)

// ---- Status Badge (RAG + task/project statuses) ----
const statusVariant = (s: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    locked: 'success', submitted: 'success', pass: 'success', resolved: 'success',
    remediated: 'success', completed: 'success', done: 'success', up: 'success',
    in_progress: 'info', planning: 'info', acknowledged: 'info', open: 'warning',
    in_review: 'info', todo: 'gray', not_started: 'gray',
    fail: 'danger', escalated: 'danger', blocked: 'danger', down: 'danger',
    on_hold: 'warning', cancelled: 'gray', accepted_risk: 'gray',
    edge_case: 'warning', na: 'gray',
  }
  return map[s?.toLowerCase()] || 'gray'
}
export const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant={statusVariant(status)} className="capitalize">
    {status?.replace(/_/g, ' ')}
  </Badge>
)

// ---- RAG dot ----
export const RagDot = ({ status }: { status: 'green' | 'amber' | 'red' | 'gray' }) => {
  const colors = { green: 'bg-green-500', amber: 'bg-amber-400', red: 'bg-red-500', gray: 'bg-gray-300' }
  return <span className={clsx('inline-block w-2.5 h-2.5 rounded-full', colors[status])} />
}

// ---- Input ----
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }
export const Input = ({ label, error, className, ...props }: InputProps) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
    <input
      className={clsx(
        'border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent',
        error ? 'border-red-400' : 'border-gray-300',
        className
      )}
      {...props}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
)

// ---- Select ----
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string }
export const Select = ({ label, error, className, children, ...props }: SelectProps) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
    <select
      className={clsx(
        'border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent bg-white',
        error ? 'border-red-400' : 'border-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
)

// ---- Textarea ----
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }
export const Textarea = ({ label, error, className, ...props }: TextareaProps) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
    <textarea
      className={clsx(
        'border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent resize-y',
        error ? 'border-red-400' : 'border-gray-300',
        className
      )}
      {...props}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
)

// ---- Table ----
interface Column<T> { key: string; header: string; render?: (row: T) => ReactNode; className?: string }
interface TableProps<T> { columns: Column<T>[]; data: T[]; loading?: boolean; emptyMessage?: string }
export function Table<T extends Record<string, unknown>>({ columns, data, loading, emptyMessage = 'No data found' }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map(col => (
              <th key={col.key} className={clsx('px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={clsx('px-4 py-2.5', col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---- Modal ----
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }
export const Modal = ({ open, onClose, title, children, size = 'md' }: ModalProps) => {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={clsx('relative bg-white rounded-lg shadow-xl w-full', sizes[size])}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ---- LoadingSkeleton ----
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx('bg-gray-200 rounded animate-pulse', className)} />
)

// ---- Stat Card ----
interface StatCardProps { title: string; value: string | number; subtitle?: string; icon?: ReactNode; color?: string; className?: string }
export const StatCard = ({ title, value, subtitle, icon, color = 'text-primary-800', className }: StatCardProps) => (
  <div className={clsx('bg-white rounded-lg border border-gray-200 p-4 shadow-sm', className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
        <p className={clsx('text-2xl font-bold mt-1', color)}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {icon && <div className="text-gray-300">{icon}</div>}
    </div>
  </div>
)

// ---- Empty State ----
export const EmptyState = ({ message, icon }: { message: string; icon?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    {icon && <div className="mb-3 text-gray-200">{icon}</div>}
    <p className="text-sm">{message}</p>
  </div>
)

// ---- Alert/Toast-like inline alert ----
interface AlertProps { variant: 'success' | 'warning' | 'danger' | 'info'; children: ReactNode; className?: string }
export const Alert = ({ variant, children, className }: AlertProps) => {
  const variants = {
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }
  return (
    <div className={clsx('border rounded-lg px-4 py-3 text-sm', variants[variant], className)}>
      {children}
    </div>
  )
}
