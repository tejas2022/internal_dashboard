import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { RagDot, SeverityBadge } from '../components/ui'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { Maximize2, RefreshCw } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#2563eb', info: '#6b7280' }
const STATUS_COLORS: Record<string, string> = { open: '#dc2626', in_progress: '#d97706', remediated: '#16a34a', closed: '#9ca3af', accepted_risk: '#6b7280' }

function ProgressRing({ pct, size = 80, color = '#16a34a', label }: { pct: number; size?: number; color?: string; label: string }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold" fill={color} fontSize={16}>
          {pct}%
        </text>
      </svg>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

function Widget({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3 bg-primary-800">
        <h3 className="text-xs font-semibold text-primary-200 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function Stakeholder() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [fullscreen, setFullscreen] = useState(false)

  const { data, refetch } = useQuery({
    queryKey: ['stakeholder-dashboard'],
    queryFn: () => dashboardApi.stakeholder(),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 0,
  })

  useEffect(() => {
    if (data) setLastUpdated(new Date())
  }, [data])

  const d = data?.data?.data

  if (!d) return (
    <div className="min-h-screen bg-primary-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
    </div>
  )

  const health = d.system_health || {}
  const total = Number(health.total) || 1
  const healthPct = Math.round(((Number(health.green) || 0) / total) * 100)

  const bodPct = d.bod_eod_completion?.total > 0
    ? Math.round((Number(d.bod_eod_completion.bod_done) / Number(d.bod_eod_completion.total)) * 100) : 0
  const eodPct = d.bod_eod_completion?.total > 0
    ? Math.round((Number(d.bod_eod_completion.eod_done) / Number(d.bod_eod_completion.total)) * 100) : 0

  const alertSummary = (d.active_alerts || []).reduce((acc: Record<string, number>, a: Record<string, unknown>) => {
    const s = String(a.severity)
    acc[s] = (acc[s] || 0) + Number(a.count)
    return acc
  }, {})

  const vaptData = (d.vapt_open_findings || []).map((v: Record<string, unknown>) => ({
    name: String(v.severity), value: Number(v.count), color: SEVERITY_COLORS[String(v.severity)] || '#6b7280'
  }))

  const productivityData = [
    { name: 'Last Week', tasks: Number(d.team_productivity?.last_week) || 0 },
    { name: 'This Week', tasks: Number(d.team_productivity?.this_week) || 0 },
  ]

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50' : ''} min-h-screen bg-gray-50`}>
      {/* Header */}
      <header className="bg-primary-800 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">CIO Operations Dashboard</h1>
          <p className="text-sm text-primary-300">Technology Operations — Live Status</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-white font-medium">{format(new Date(), 'EEEE, dd MMMM yyyy')}</div>
            <div className="text-xs text-primary-300 flex items-center gap-1 justify-end">
              <RefreshCw size={10} /> Last updated: {format(lastUpdated, 'HH:mm:ss')}
            </div>
          </div>
          <button onClick={() => setFullscreen(f => !f)} className="p-2 rounded hover:bg-primary-700 text-primary-300">
            <Maximize2 size={18} />
          </button>
        </div>
      </header>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Row 1: System Health */}
        <Widget title="System Health" className="lg:col-span-1">
          <div className="flex flex-col items-center py-3">
            <div className={`text-5xl font-bold mb-2 ${healthPct >= 90 ? 'text-green-600' : healthPct >= 70 ? 'text-amber-500' : 'text-red-600'}`}>
              {healthPct}%
            </div>
            <div className="text-sm text-gray-500 mb-4">Applications Healthy</div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1"><RagDot status="green" /><span className="text-gray-600">{health.green || 0} OK</span></div>
              <div className="flex items-center gap-1"><RagDot status="red" /><span className="text-gray-600">{health.red || 0} Issues</span></div>
              <div className="flex items-center gap-1"><RagDot status="gray" /><span className="text-gray-600">{health.not_submitted || 0} Pending</span></div>
            </div>
          </div>
        </Widget>

        {/* Active Alerts */}
        <Widget title="Active Security Alerts" className="lg:col-span-1">
          <div className="space-y-2">
            {['critical','high','medium','low'].map(sev => (
              <div key={sev} className="flex items-center justify-between">
                <SeverityBadge severity={sev} />
                <span className={`text-lg font-bold ${sev === 'critical' && alertSummary[sev] > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {alertSummary[sev] || 0}
                </span>
              </div>
            ))}
          </div>
        </Widget>

        {/* BOD/EOD Completion */}
        <Widget title="Checklist Completion Today" className="lg:col-span-1">
          <div className="flex justify-center gap-8 py-2">
            <ProgressRing pct={bodPct} color={bodPct === 100 ? '#16a34a' : '#d97706'} label="BOD" />
            <ProgressRing pct={eodPct} color={eodPct === 100 ? '#16a34a' : '#d97706'} label="EOD" />
          </div>
        </Widget>

        {/* Team Productivity */}
        <Widget title="Team Productivity (Tasks Completed)" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={productivityData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tasks" fill="#1B3A6B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Widget>

        {/* Row 2: Projects + Milestones */}
        <Widget title="Projects In Progress" className="lg:col-span-2">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {d.projects_in_progress?.map((p: Record<string, unknown>) => {
              const taskPct = Number(p.task_count) > 0 ? Math.round((Number(p.tasks_done) / Number(p.task_count)) * 100) : 0
              return (
                <div key={String(p.id)} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-gray-800">{String(p.name)}</span>
                      <span className="text-xs text-gray-400">{taskPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-primary-800 h-1.5 rounded-full" style={{ width: `${taskPct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
            {(!d.projects_in_progress || d.projects_in_progress.length === 0) && (
              <div className="text-center text-sm text-gray-400 py-6">No active projects</div>
            )}
          </div>
        </Widget>

        <Widget title="Upcoming Milestones (14 Days)" className="lg:col-span-2">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {d.upcoming_milestones?.map((m: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-800">{String(m.name)}</div>
                  <div className="text-xs text-gray-400">{String(m.project_name)}</div>
                </div>
                <div className="text-xs font-medium text-primary-800">
                  {m.due_date ? format(new Date(String(m.due_date)), 'dd MMM') : '—'}
                </div>
              </div>
            ))}
            {(!d.upcoming_milestones || d.upcoming_milestones.length === 0) && (
              <div className="text-center text-sm text-gray-400 py-6">No upcoming milestones</div>
            )}
          </div>
        </Widget>

        {/* Row 3: VAPT + Achievements */}
        <Widget title="Open VAPT Findings" className="lg:col-span-2">
          {vaptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={vaptData} cx="50%" cy="50%" outerRadius={65} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} fontSize={12}>
                  {vaptData.map((e: { color: string }, i: number) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-green-600 font-medium text-sm">No open findings</div>}
        </Widget>

        <Widget title="Recent Achievements" className="lg:col-span-2">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {d.recent_achievements?.map((a: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <div className="text-sm text-gray-800">{String(a.name)}</div>
                  <div className="text-xs text-gray-400">{String(a.project_name)} · {a.updated_at ? format(new Date(String(a.updated_at)), 'dd MMM') : ''}</div>
                </div>
              </div>
            ))}
            {(!d.recent_achievements || d.recent_achievements.length === 0) && (
              <div className="text-center text-sm text-gray-400 py-6">No completed tasks in last 30 days</div>
            )}
          </div>
        </Widget>

        {/* Application Uptime */}
        <Widget title="Application/Server Uptime (30 days)" className="lg:col-span-4">
          {d.uptime_30d?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={d.uptime_30d} layout="vertical" margin={{ left: 120, right: 40 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="device_name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => `${v?.toFixed(2)}%`} />
                <Bar dataKey="uptime_pct_30d" radius={[0, 3, 3, 0]}>
                  {d.uptime_30d.map((d: Record<string, unknown>, i: number) => (
                    <Cell key={i} fill={Number(d.uptime_pct_30d) >= 99 ? '#16a34a' : Number(d.uptime_pct_30d) >= 95 ? '#d97706' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-gray-400 py-6">No uptime data — configure OpManager integration</div>
          )}
        </Widget>

      </div>
    </div>
  )
}
