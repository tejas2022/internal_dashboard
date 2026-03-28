import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { StatCard, Card, Badge, RagDot, StatusBadge, Skeleton } from '../components/ui'
import { Server, Shield, Network, FolderKanban, ClipboardCheck, Bug, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const COLORS = { green: '#16a34a', amber: '#d97706', red: '#dc2626', gray: '#9ca3af' }

function appRagStatus(app: Record<string, unknown>): 'green' | 'amber' | 'red' | 'gray' {
  const failures = Number(app.failures_today) || 0
  if (failures > 0) return 'red'
  if (app.bod_status === 'locked') return 'green'
  if (app.bod_status === null && app.eod_status === null) return 'gray'
  return 'amber'
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['cio-dashboard'],
    queryFn: () => dashboardApi.cio(),
    refetchInterval: 60_000,
  })

  const d = data?.data?.data

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  )

  const network = d?.network || {}
  const security = d?.security || {}
  const vapt = d?.vapt || {}
  const projects = d?.projects || {}
  const tasks = d?.tasks || {}
  const compliance = d?.checklist_compliance || {}
  const appHealth = d?.application_health || []

  const bodPct = compliance.total_apps > 0
    ? Math.round((compliance.bod_submitted / compliance.total_apps) * 100) : 0
  const eodPct = compliance.total_apps > 0
    ? Math.round((compliance.eod_submitted / compliance.total_apps) * 100) : 0

  const statusCounts = appHealth.reduce((acc: Record<string, number>, app: Record<string, unknown>) => {
    const s = appRagStatus(app)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const ragData = [
    { name: 'Healthy', value: statusCounts.green || 0, color: COLORS.green },
    { name: 'Attention', value: statusCounts.amber || 0, color: COLORS.amber },
    { name: 'Failed', value: statusCounts.red || 0, color: COLORS.red },
    { name: 'No Data', value: statusCounts.gray || 0, color: COLORS.gray },
  ].filter(x => x.value > 0)

  return (
    <div className="space-y-6">
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Devices Online" value={`${network.devices_up || 0}/${network.total_devices || 0}`}
          subtitle={`${network.devices_down || 0} down · ${network.active_alarms || 0} alarms`}
          icon={<Network size={24} />} color={network.devices_down > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard title="Security Alerts (24h)" value={security.wazuh_24h?.total || 0}
          subtitle={`${security.wazuh_24h?.critical || 0} critical · ${security.soc_open || 0} SOC open`}
          icon={<Shield size={24} />}
          color={security.wazuh_24h?.critical > 0 ? 'text-red-600' : 'text-primary-800'} />
        <StatCard title="Projects In Progress" value={projects.in_progress || 0}
          subtitle={`${projects.overdue || 0} overdue · ${tasks.blocked || 0} blocked tasks`}
          icon={<FolderKanban size={24} />} color="text-primary-800" />
        <StatCard title="VAPT Open Findings" value={vapt.open_findings || 0}
          subtitle={`${vapt.critical_open || 0} critical`}
          icon={<Bug size={24} />}
          color={vapt.critical_open > 0 ? 'text-red-600' : 'text-amber-600'} />
      </div>

      {/* BOD/EOD compliance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="BOD Submitted Today" value={`${compliance.bod_submitted || 0}/${compliance.total_apps || 0}`}
          subtitle={`${bodPct}% completion`}
          icon={<ClipboardCheck size={24} />} color={bodPct === 100 ? 'text-green-600' : 'text-amber-600'} />
        <StatCard title="EOD Submitted Today" value={`${compliance.eod_submitted || 0}/${compliance.total_apps || 0}`}
          subtitle={`${eodPct}% completion`}
          icon={<ClipboardCheck size={24} />} color={eodPct === 100 ? 'text-green-600' : 'text-amber-600'} />
        <StatCard title="Tasks Overdue" value={tasks.overdue || 0}
          icon={<AlertTriangle size={24} />} color={tasks.overdue > 0 ? 'text-red-600' : 'text-green-600'}
          subtitle={`${tasks.completed_this_week || 0} completed this week`} />
        <StatCard title="Total Applications" value={appHealth.length}
          icon={<Server size={24} />} color="text-primary-800"
          subtitle={`${statusCounts.green || 0} healthy · ${statusCounts.red || 0} failing`} />
      </div>

      {/* App health grid + RAG chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Application Health — Today" className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {appHealth.map((app: Record<string, unknown>) => {
              const rag = appRagStatus(app)
              return (
                <div key={String(app.id)} className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-lg">
                  <RagDot status={rag} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{String(app.name)}</div>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant={app.bod_status === 'locked' ? 'success' : 'gray'} className="text-[10px]">BOD</Badge>
                      <Badge variant={app.eod_status === 'locked' ? 'success' : 'gray'} className="text-[10px]">EOD</Badge>
                      {Number(app.failures_today) > 0 && (
                        <Badge variant="danger" className="text-[10px]">{String(app.failures_today)} fail</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {appHealth.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-400 text-sm">No applications configured</div>
            )}
          </div>
        </Card>

        <Card title="RAG Status Distribution">
          {ragData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ragData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                  fontSize={11}>
                  {ragData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          )}
        </Card>
      </div>

      {/* Bottom info strip */}
      <div className="text-xs text-gray-400 text-right">
        Last updated: {format(new Date(), 'HH:mm:ss')} — auto-refreshes every 60s
      </div>
    </div>
  )
}
