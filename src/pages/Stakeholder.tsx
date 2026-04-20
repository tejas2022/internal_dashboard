import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { format, subDays } from 'date-fns'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  RefreshCw, Maximize2, Shield, ClipboardCheck, Activity,
  Calendar, ChevronDown, Server, CheckCircle2, TrendingUp, HardDrive,
} from 'lucide-react'
import { SeverityBadge } from '../components/ui'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#2563eb', info: '#6b7280',
}

type Preset = 'all' | 'today' | '7d' | '30d' | '90d' | 'custom'
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
]

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({ pct, color, label }: { pct: number; color: string; label: string }) {
  const size = 100; const r = 39
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct, 100) / 100 * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={19} fontWeight="bold">{pct}%</text>
      </svg>
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
  )
}

function KPI({ label, value, sub, color, icon }: {
  label: string; value: React.ReactNode; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${color}18` }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{label}</p>
        <p className="text-2xl font-black mt-0.5 leading-tight" style={{ color }}>{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b border-gray-50">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function UptimeChart({ data, emptyLabel }: { data: { device_name: string; uptime_pct_30d: number }[]; emptyLabel: string }) {
  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-36 text-gray-400">
      <Server size={24} className="mb-1.5 opacity-40" />
      <span className="text-xs">{emptyLabel}</span>
    </div>
  )
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 52, top: 0, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="device_name" tick={{ fontSize: 10 }} width={120} />
        <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Uptime']} />
        <Bar dataKey="uptime_pct_30d" radius={[0, 4, 4, 0]}
          label={{ position: 'right', fontSize: 9, fill: '#6b7280', formatter: (v: number) => `${v.toFixed(1)}%` }}>
          {data.map((row, i) => (
            <Cell key={i} fill={row.uptime_pct_30d >= 99 ? '#16a34a' : row.uptime_pct_30d >= 95 ? '#d97706' : '#dc2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Stakeholder() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [preset, setPreset] = useState<Preset>('all')
  const [fromDate, setFromDate] = useState<string | undefined>(undefined)
  const [toDate, setToDate] = useState(todayStr)
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(todayStr)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const applyPreset = (p: Preset) => {
    const now = new Date()
    const tod = format(now, 'yyyy-MM-dd')
    setPreset(p)
    setPickerOpen(false)
    switch (p) {
      case 'all':   setFromDate(undefined); setToDate(tod); break
      case 'today': setFromDate(tod); setToDate(tod); break
      case '7d':    setFromDate(format(subDays(now, 7), 'yyyy-MM-dd')); setToDate(tod); break
      case '30d':   setFromDate(format(subDays(now, 30), 'yyyy-MM-dd')); setToDate(tod); break
      case '90d':   setFromDate(format(subDays(now, 90), 'yyyy-MM-dd')); setToDate(tod); break
    }
  }

  const applyCustom = () => {
    setPreset('custom')
    setFromDate(customFrom)
    setToDate(customTo)
    setPickerOpen(false)
  }

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['stakeholder-dashboard', fromDate, toDate],
    queryFn: () => dashboardApi.stakeholder(fromDate ? { from_date: fromDate, to_date: toDate } : {}),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 0,
  })

  useEffect(() => { if (data) setLastUpdated(new Date()) }, [data])

  const d = data?.data?.data

  const presetLabel: Record<Preset, string> = {
    all: 'All Time', today: 'Today', '7d': 'Last 7 Days',
    '30d': 'Last 30 Days', '90d': 'Last 90 Days',
    custom: fromDate ? `${fromDate.split('-').reverse().join('/')} → ${toDate.split('-').reverse().join('/')}` : 'Custom Range',
  }

  if (!d) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-800 mx-auto" />
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      </div>
    </div>
  )

  // ── Derived values ─────────────────────────────────────────────────────────
  const health = d.system_health || {}
  const totalApps = Math.max(Number(health.total) || 1, 1)
  const healthPct = Math.round(((Number(health.green) || 0) / totalApps) * 100)
  const healthColor = healthPct >= 90 ? '#16a34a' : healthPct >= 70 ? '#d97706' : '#dc2626'

  const bodTotal = Number(d.bod_eod_completion?.total) || 0
  const bodPct = bodTotal > 0 ? Math.round((Number(d.bod_eod_completion.bod_done) / bodTotal) * 100) : 0
  const eodPct = bodTotal > 0 ? Math.round((Number(d.bod_eod_completion.eod_done) / bodTotal) * 100) : 0

  const alertMap = (d.active_alerts || []).reduce((acc: Record<string, number>, a: Record<string, unknown>) => {
    acc[String(a.severity)] = (acc[String(a.severity)] || 0) + Number(a.count)
    return acc
  }, {})
  const totalAlerts = Object.values(alertMap).reduce((s: number, v) => s + (v as number), 0)
  const criticalAlerts = alertMap['critical'] || 0

  const vaptData = (d.vapt_open_findings || []).map((v: Record<string, unknown>) => ({
    name: String(v.severity), value: Number(v.count), color: SEVERITY_COLORS[String(v.severity)] || '#6b7280',
  }))
  const totalVapt = vaptData.reduce((s: number, v: { value: number }) => s + v.value, 0)

  const coerceUptime = (rows: unknown[]) =>
    (rows || []).map((row: unknown) => ({
      device_name: String((row as Record<string, unknown>).device_name),
      uptime_pct_30d: Number((row as Record<string, unknown>).uptime_pct_30d) || 0,
    }))

  const appUptimeData = coerceUptime(d.app_uptime || [])
  const networkUptimeData = coerceUptime(d.network_uptime || [])
  const infraUptimeData = coerceUptime(d.infra_uptime || [])

  const prod = d.team_productivity || {}
  const prodThisWeek = Number(prod.this_week) || Number(prod.this_period) || 0
  const prodLastWeek = Number(prod.last_week) || 0
  const productivityChart = [
    { name: fromDate ? 'Previous' : 'Last Week', value: prodLastWeek, fill: '#bfdbfe' },
    { name: fromDate ? 'Selected Period' : 'This Week', value: prodThisWeek, fill: '#1B3A6B' },
  ]

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50' : ''} min-h-screen bg-slate-50 flex flex-col`}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-primary-800 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-lg font-black tracking-tight">CIO Operations Dashboard</h1>
          <p className="text-xs text-primary-300 mt-0.5">Technology Operations · Live Status</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors border border-white/20"
            >
              <Calendar size={14} />
              <span>{presetLabel[preset]}</span>
              <ChevronDown size={13} className={`transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {pickerOpen && (
              <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Select</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {PRESETS.map(p => (
                    <button key={p.key} onClick={() => applyPreset(p.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        preset === p.key ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{p.label}</button>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Custom Range</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                    <input type="date" value={customFrom} max={customTo}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                    <input type="date" value={customTo} min={customFrom}
                      onChange={e => setCustomTo(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <button onClick={applyCustom}
                    className="w-full bg-primary-800 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-700 transition-colors mt-1">
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{format(new Date(), 'EEEE, dd MMMM yyyy')}</div>
            <div className="text-xs text-primary-300 flex items-center gap-1 justify-end mt-0.5">
              <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
              <span>{format(lastUpdated, 'HH:mm:ss')}</span>
              <button onClick={() => refetch()} className="ml-1 hover:text-white transition-colors text-primary-300">↺</button>
            </div>
          </div>

          <button onClick={() => setFullscreen(f => !f)}
            className="p-2 rounded-xl hover:bg-white/10 text-primary-300 transition-colors">
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-5 overflow-auto">

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="System Health" value={`${healthPct}%`}
            sub={`${health.green || 0} OK · ${health.red || 0} Issues · ${health.not_submitted || 0} Pending`}
            color={healthColor} icon={<Activity size={20} />} />
          <KPI label="Security Alerts" value={totalAlerts}
            sub={criticalAlerts > 0 ? `${criticalAlerts} Critical — Immediate Action` : 'No critical alerts'}
            color={criticalAlerts > 0 ? '#dc2626' : '#16a34a'} icon={<Shield size={20} />} />
          <KPI label="BOD Compliance" value={`${bodPct}%`}
            sub={`${d.bod_eod_completion?.bod_done || 0} of ${bodTotal} apps submitted`}
            color={bodPct === 100 ? '#16a34a' : '#d97706'} icon={<ClipboardCheck size={20} />} />
          <KPI label="EOD Compliance" value={`${eodPct}%`}
            sub={`${d.bod_eod_completion?.eod_done || 0} of ${bodTotal} apps submitted`}
            color={eodPct === 100 ? '#16a34a' : '#d97706'} icon={<ClipboardCheck size={20} />} />
        </div>

        {/* ── Uptime Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Panel title="Application Uptime (Rolling 30 Days)">
            <UptimeChart data={appUptimeData} emptyLabel="No application data" />
          </Panel>
          <Panel title="Network Uptime (Rolling 30 Days)">
            <UptimeChart data={networkUptimeData} emptyLabel="No network device data" />
          </Panel>
          <Panel title="Infrastructure Uptime (Rolling 30 Days)">
            <UptimeChart data={infraUptimeData} emptyLabel="No infrastructure data" />
          </Panel>
        </div>

        {/* ── Infra BOD Panel ─────────────────────────────────────────────── */}
        {(() => {
          const infraBod: Record<string, unknown>[] = d.infra_bod_today || []
          const submitted = infraBod.filter(c => c.status === 'locked').length
          const total = infraBod.length
          const infraFailures = infraBod.reduce((acc, c) => acc + Number(c.failure_count || 0), 0)
          const infraPct = total > 0 ? Math.round((submitted / total) * 100) : 0
          return (
            <Panel title={`Infrastructure BOD Status — Today · ${submitted}/${total} submitted`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: '#1B3A6B18' }}>
                    <HardDrive size={18} style={{ color: '#1B3A6B' }} />
                  </div>
                  <div>
                    <p className="text-xl font-black" style={{ color: infraPct === 100 ? '#16a34a' : infraPct > 0 ? '#d97706' : '#6b7280' }}>
                      {infraPct}%
                    </p>
                    <p className="text-[10px] text-gray-400">BOD Completion</p>
                  </div>
                </div>
                {infraFailures > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: '#dc262618' }}>
                      <Shield size={18} style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-red-600">{infraFailures}</p>
                      <p className="text-[10px] text-gray-400">Failures Reported</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {infraBod.map((cat) => {
                  const status = String(cat.status || '')
                  const failures = Number(cat.failure_count) || 0
                  const dotColor = failures > 0 ? '#dc2626' : status === 'locked' ? '#16a34a' : '#9ca3af'
                  return (
                    <div key={String(cat.category_id)} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-700 truncate">{String(cat.category_name)}</p>
                        <p className="text-[10px] text-gray-400">
                          {status === 'locked' ? 'Submitted' : 'Pending'}
                          {cat.is_late ? ' · Late' : ''}
                          {failures > 0 ? ` · ${failures} fail` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {infraBod.length === 0 && (
                  <p className="col-span-3 text-xs text-gray-400 text-center py-4">No infra categories configured</p>
                )}
              </div>
            </Panel>
          )
        })()}

        {/* ── Row 2 ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Alert breakdown + BOD/EOD rings */}
          <div className="space-y-5">
            <Panel title="Alert Severity Breakdown">
              <div className="space-y-3">
                {['critical', 'high', 'medium', 'low', 'info'].map(sev => (
                  <div key={sev} className="flex items-center gap-3">
                    <SeverityBadge severity={sev} />
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${totalAlerts > 0 ? ((alertMap[sev] || 0) / totalAlerts * 100) : 0}%`,
                          backgroundColor: SEVERITY_COLORS[sev],
                        }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-6 text-right tabular-nums">
                      {alertMap[sev] || 0}
                    </span>
                  </div>
                ))}
                {totalAlerts === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-2">No alerts in selected period</p>
                )}
              </div>
            </Panel>

            <Panel title="Checklist Completion">
              <div className="flex justify-center gap-8 py-1">
                <ProgressRing pct={bodPct} color={bodPct === 100 ? '#16a34a' : '#d97706'} label="BOD" />
                <ProgressRing pct={eodPct} color={eodPct === 100 ? '#16a34a' : '#d97706'} label="EOD" />
              </div>
            </Panel>
          </div>

          {/* Projects in progress */}
          <Panel title="Projects in Progress" className="lg:col-span-2">
            <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
              {(d.projects_in_progress || []).map((p: Record<string, unknown>) => {
                const pct = Number(p.task_count) > 0
                  ? Math.round((Number(p.tasks_done) / Number(p.task_count)) * 100) : 0
                const isOverdue = Boolean(p.end_date && new Date(String(p.end_date)) < new Date())
                const barColor = pct === 100 ? '#16a34a' : isOverdue ? '#dc2626' : '#1B3A6B'
                return (
                  <div key={String(p.id)}>
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate">{String(p.name)}</span>
                        {isOverdue && (
                          <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2 text-xs text-gray-400">
                        <span>{String(p.tasks_done)}/{String(p.task_count)} tasks</span>
                        <span className="font-bold text-gray-700">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    {p.end_date && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Due: {format(new Date(String(p.end_date)), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                )
              })}
              {(!d.projects_in_progress || d.projects_in_progress.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <TrendingUp size={28} className="mb-2 opacity-40" />
                  <span className="text-sm">No active projects</span>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* ── Row 3 ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* VAPT donut */}
          <Panel title={`Open VAPT Findings${totalVapt > 0 ? ` · ${totalVapt} Total` : ''}`}>
            {vaptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={vaptData} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                    dataKey="value" paddingAngle={3}
                    label={({ name, value }) => `${String(name)[0].toUpperCase() + String(name).slice(1)}: ${value}`}
                    labelLine={false} fontSize={11}>
                    {vaptData.map((e: { color: string }, i: number) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Findings']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-green-600">
                <CheckCircle2 size={36} className="mb-2" />
                <span className="text-sm font-semibold">No open findings</span>
                <span className="text-xs text-gray-400 mt-1">All vulnerabilities resolved</span>
              </div>
            )}
          </Panel>

          {/* Milestones */}
          <Panel title="Milestones">
            <div className="space-y-3 max-h-52 overflow-y-auto">
              {(d.upcoming_milestones || []).map((m: Record<string, unknown>, i: number) => {
                const due = m.due_date ? new Date(String(m.due_date)) : null
                const isPast = due && due < new Date()
                return (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{String(m.name)}</p>
                      <p className="text-xs text-gray-400 truncate">{String(m.project_name)}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${
                      isPast ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-primary-50 text-primary-800 border border-primary-100'
                    }`}>
                      {due ? format(due, 'dd MMM') : '—'}
                    </span>
                  </div>
                )
              })}
              {(!d.upcoming_milestones || d.upcoming_milestones.length === 0) && (
                <div className="text-center text-sm text-gray-400 py-10">No milestones in this period</div>
              )}
            </div>
          </Panel>

          {/* Recent achievements */}
          <Panel title="Recent Achievements">
            <div className="space-y-3 max-h-52 overflow-y-auto">
              {(d.recent_achievements || []).map((a: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={12} className="text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{String(a.name)}</p>
                    <p className="text-xs text-gray-400">
                      {String(a.project_name)} · {a.updated_at ? format(new Date(String(a.updated_at)), 'dd MMM yyyy') : ''}
                    </p>
                  </div>
                </div>
              ))}
              {(!d.recent_achievements || d.recent_achievements.length === 0) && (
                <div className="text-center text-sm text-gray-400 py-10">No completed tasks in this period</div>
              )}
            </div>
          </Panel>
        </div>

        {/* ── Row 4: Productivity ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <Panel title="Team Productivity (Tasks Completed)" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={productivityChart} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'Tasks']} />
                <Bar dataKey="value" name="Tasks" radius={[5, 5, 0, 0]}>
                  {productivityChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 shrink-0">
        <span>Auto-refreshes every 2 minutes</span>
        <span>Last updated: {format(lastUpdated, 'HH:mm:ss')} · {format(new Date(), 'dd MMM yyyy')}</span>
      </footer>
    </div>
  )
}
