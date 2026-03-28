import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { checklistsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Card, Badge, StatusBadge, Button, Table, RagDot } from '../components/ui'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function Checklists() {
  const { isAdmin, user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['checklists-today'],
    queryFn: () => checklistsApi.today(),
    refetchInterval: 60_000,
  })

  const { data: myApps } = useQuery({
    queryKey: ['my-apps'],
    queryFn: () => import('../services/api').then(m => m.applicationsApi.mine()),
    enabled: !isAdmin,
  })

  const today = todayData?.data?.data || []
  const apps = myApps?.data?.data || []

  const ragStatus = (row: Record<string, unknown>): 'green' | 'amber' | 'red' | 'gray' => {
    if (Number(row.failure_count) > 0) return 'red'
    if (row.bod_status === 'locked' && row.eod_status === 'locked') return 'green'
    if (row.bod_status === 'locked' || row.eod_status === 'locked') return 'amber'
    return 'gray'
  }

  const adminColumns = [
    { key: 'name', header: 'Application', render: (row: Record<string, unknown>) => (
      <div className="flex items-center gap-2">
        <RagDot status={ragStatus(row)} />
        <span className="font-medium">{String(row.name)}</span>
      </div>
    )},
    { key: 'type', header: 'Type', render: (row: Record<string, unknown>) => row.type ? <Badge variant="gray">{String(row.type)}</Badge> : '-' },
    { key: 'bod_status', header: 'BOD', render: (row: Record<string, unknown>) => (
      row.bod_status ? <StatusBadge status={String(row.bod_status)} /> : <Badge variant="gray">Not submitted</Badge>
    )},
    { key: 'eod_status', header: 'EOD', render: (row: Record<string, unknown>) => (
      row.eod_status ? <StatusBadge status={String(row.eod_status)} /> : <Badge variant="gray">Not submitted</Badge>
    )},
    { key: 'failure_count', header: 'Failures', render: (row: Record<string, unknown>) => (
      Number(row.failure_count) > 0
        ? <Badge variant="danger">{String(row.failure_count)}</Badge>
        : <span className="text-gray-400">—</span>
    )},
    { key: 'late', header: 'Late', render: (row: Record<string, unknown>) => (
      (row.bod_late === 'true' || row.eod_late === 'true')
        ? <Badge variant="warning">Late</Badge> : <span className="text-gray-400">—</span>
    )},
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Today: {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-800" />
        </div>
      </div>

      {/* Admin view: full grid */}
      {isAdmin && (
        <Card title="BOD/EOD Status — Today" action={
          <span className="text-xs text-gray-400">{today.length} applications</span>
        }>
          <Table columns={adminColumns as never} data={today as never} loading={todayLoading}
            emptyMessage="No applications configured" />
        </Card>
      )}

      {/* User view: their apps */}
      {!isAdmin && (
        <div className="space-y-4">
          <Card title="My Applications">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {apps.map((app: Record<string, unknown>) => (
                <div key={String(app.id)} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-800">{String(app.name)}</h3>
                    <Badge variant={app.environment === 'prod' ? 'danger' : 'warning'}>
                      {String(app.environment).toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/checklists/submit/${app.id}?session=BOD`}>
                      <Button size="sm" variant="outline">
                        <ClipboardCheck size={13} /> BOD Check
                      </Button>
                    </Link>
                    <Link to={`/checklists/submit/${app.id}?session=EOD`}>
                      <Button size="sm" variant="outline">
                        <ClipboardCheck size={13} /> EOD Check
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {apps.length === 0 && (
                <div className="col-span-2 py-8 text-center text-gray-400 text-sm">
                  No applications assigned to you. Contact admin.
                </div>
              )}
            </div>
          </Card>

          {/* Recent submissions */}
          <Card title="Recent Submissions">
            <ChecklistHistory userId={user?.id} />
          </Card>
        </div>
      )}

      {/* Admin: recent submissions */}
      {isAdmin && (
        <Card title="Recent Checklist Submissions">
          <ChecklistHistory />
        </Card>
      )}
    </div>
  )
}

function ChecklistHistory({ userId }: { userId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['checklists-history', userId],
    queryFn: () => checklistsApi.list({ limit: 20 }),
  })

  const checklists = data?.data?.data || []

  const columns = [
    { key: 'application_name', header: 'Application', render: (row: Record<string, unknown>) => String(row.application_name) },
    { key: 'date', header: 'Date' },
    { key: 'session', header: 'Session', render: (row: Record<string, unknown>) => (
      <Badge variant={row.session === 'BOD' ? 'info' : 'default'}>{String(row.session)}</Badge>
    )},
    { key: 'status', header: 'Status', render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} /> },
    { key: 'submitted_by_name', header: 'Submitted By' },
    { key: 'is_late', header: 'On Time', render: (row: Record<string, unknown>) => (
      row.is_late ? <Badge variant="warning">Late</Badge> : <Badge variant="success">On time</Badge>
    )},
  ]

  return <Table columns={columns as never} data={checklists as never} loading={isLoading} emptyMessage="No checklists submitted yet" />
}
