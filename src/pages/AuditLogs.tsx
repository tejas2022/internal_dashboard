import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '../services/api'
import { Card, Table, Badge, Input, Select, Button } from '../components/ui'
import { format } from 'date-fns'
import type { AuditLog } from '../types'

export default function AuditLogs() {
  const [filters, setFilters] = useState({ action: '', entity_type: '', date_from: '', date_to: '' })
  const [page, setPage] = useState(0)
  const limit = 25

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: () => auditApi.logs({ ...filters, limit, offset: page * limit }),
  })

  const logs: AuditLog[] = data?.data?.data || []
  const total = data?.data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const actionColor = (action: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' => {
    if (action.startsWith('CREATE')) return 'success'
    if (action.startsWith('DELETE') || action.startsWith('DEACTIVATE')) return 'danger'
    if (action.startsWith('UPDATE') || action.startsWith('RESET')) return 'warning'
    if (action === 'LOGIN') return 'info'
    return 'gray'
  }

  const columns = [
    { key: 'created_at', header: 'Timestamp', render: (r: AuditLog) => (
      <span className="font-mono text-xs">{format(new Date(r.created_at), 'dd/MM/yyyy HH:mm:ss')}</span>
    )},
    { key: 'user_name', header: 'User', render: (r: AuditLog) => (
      <div>
        <div className="font-medium text-gray-800">{r.user_name || 'System'}</div>
        {r.username && <div className="text-xs text-gray-400 font-mono">{r.username}</div>}
      </div>
    )},
    { key: 'action', header: 'Action', render: (r: AuditLog) => (
      <Badge variant={actionColor(r.action)}>{r.action}</Badge>
    )},
    { key: 'entity_type', header: 'Entity', render: (r: AuditLog) => (
      r.entity_type ? <span className="text-xs">{r.entity_type}</span> : '—'
    )},
    { key: 'ip_address', header: 'IP', render: (r: AuditLog) => (
      <span className="font-mono text-xs text-gray-500">{r.ip_address || '—'}</span>
    )},
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Filter by action..." value={filters.action}
            onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(0) }}
            className="w-44" />
          <Select value={filters.entity_type} onChange={e => { setFilters(f => ({ ...f, entity_type: e.target.value })); setPage(0) }} className="w-44">
            <option value="">All entity types</option>
            {['users','applications','checklists','vapt_findings','projects','tasks','soc_alerts','wazuh_alerts'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Input type="date" value={filters.date_from} onChange={e => { setFilters(f => ({ ...f, date_from: e.target.value })); setPage(0) }} />
          <Input type="date" value={filters.date_to} onChange={e => { setFilters(f => ({ ...f, date_to: e.target.value })); setPage(0) }} />
          <Button variant="outline" onClick={() => { setFilters({ action: '', entity_type: '', date_from: '', date_to: '' }); setPage(0) }}>
            Clear
          </Button>
        </div>
      </Card>

      <Card title={`Audit Logs (${total} total)`}>
        <Table columns={columns as never} data={logs as never} loading={isLoading} emptyMessage="No audit logs found" />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
