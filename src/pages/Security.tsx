import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { securityApi } from '../services/api'
import { Card, StatCard, Badge, Table, SeverityBadge, StatusBadge, Button, Modal, Textarea, Alert } from '../components/ui'
import { Shield, Mail, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import type { WazuhAlert, SocAlert } from '../types'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#2563eb', info: '#6b7280'
}

export default function Security() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'wazuh' | 'soc'>('wazuh')
  const [ackModal, setAckModal] = useState<{ open: boolean; alertId?: string; type?: 'wazuh' | 'soc' }>({ open: false })
  const [notes, setNotes] = useState('')
  const [socStatus, setSocStatus] = useState('acknowledged')

  const { data: summaryData } = useQuery({
    queryKey: ['security-summary'],
    queryFn: () => securityApi.summary(),
    refetchInterval: 5 * 60 * 1000,
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['wazuh-dashboard'],
    queryFn: () => securityApi.wazuhDashboard(),
    staleTime: Infinity,
  })

  const wazuhDashboardUrl: string | null = dashboardData?.data?.data?.url ? '/wazuh-proxy' : null

  const { data: wazuhSummaryData } = useQuery({
    queryKey: ['wazuh-summary'],
    queryFn: () => securityApi.wazuhSummary(),
    refetchInterval: 5 * 60 * 1000,
  })

  const { data: wazuhData, isLoading: wazuhLoading } = useQuery({
    queryKey: ['wazuh-alerts'],
    queryFn: () => securityApi.wazuhAlerts({ limit: 50 }),
    refetchInterval: 5 * 60 * 1000,
  })

  const { data: socData, isLoading: socLoading } = useQuery({
    queryKey: ['soc-alerts'],
    queryFn: () => securityApi.socAlerts({ limit: 50 }),
    refetchInterval: 5 * 60 * 1000,
  })

  const ackWazuhMutation = useMutation({
    mutationFn: ({ id, n }: { id: string; n: string }) => securityApi.acknowledgeWazuh(id, n),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wazuh-alerts'] }); closeAck() },
  })

  const updateSocMutation = useMutation({
    mutationFn: ({ id, status, n }: { id: string; status: string; n: string }) =>
      securityApi.updateSocAlert(id, { status, notes: n }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soc-alerts'] }); closeAck() },
  })

  const closeAck = () => { setAckModal({ open: false }); setNotes('') }

  const summary = summaryData?.data?.data || {}
  const wazuhSummary = wazuhSummaryData?.data?.data || {}
  const wazuhAlerts: WazuhAlert[] = wazuhData?.data?.data || []
  const socAlerts: SocAlert[] = socData?.data?.data || []

  const severityData = wazuhSummary.severity_summary?.map((s: Record<string, unknown>) => ({
    name: String(s.severity), value: Number(s.count), color: SEVERITY_COLORS[String(s.severity)] || '#6b7280'
  })) || []

  const trendData = wazuhSummary.trend_30_days?.map((t: Record<string, unknown>) => ({
    day: format(new Date(String(t.day)), 'dd/MM'),
    count: Number(t.count),
  })) || []

  const wazuhColumns = [
    { key: 'rule_id', header: 'Rule ID', render: (r: WazuhAlert) => <span className="font-mono text-xs">{r.rule_id}</span> },
    { key: 'severity', header: 'Severity', render: (r: WazuhAlert) => <SeverityBadge severity={r.severity} /> },
    { key: 'agent_name', header: 'Agent' },
    { key: 'rule_description', header: 'Description', render: (r: WazuhAlert) => (
      <span className="max-w-xs block truncate text-xs" title={r.rule_description}>{r.rule_description}</span>
    )},
    { key: 'triggered_at', header: 'Time', render: (r: WazuhAlert) => format(new Date(r.triggered_at), 'dd/MM HH:mm') },
    { key: 'status', header: 'Status', render: (r: WazuhAlert) => (
      r.acknowledged_by ? <Badge variant="success">Acknowledged</Badge> : <Badge variant="warning">Open</Badge>
    )},
    { key: 'actions', header: '', render: (r: WazuhAlert) => (
      !r.acknowledged_by && (
        <Button size="sm" variant="ghost"
          onClick={() => { setAckModal({ open: true, alertId: r.id, type: 'wazuh' }); setNotes('') }}>
          Ack
        </Button>
      )
    )},
  ]

  const socColumns = [
    { key: 'alert_type', header: 'Type' },
    { key: 'severity', header: 'Severity', render: (r: SocAlert) => <SeverityBadge severity={r.severity} /> },
    { key: 'affected_asset', header: 'Asset' },
    { key: 'received_at', header: 'Received', render: (r: SocAlert) => format(new Date(r.received_at), 'dd/MM HH:mm') },
    { key: 'status', header: 'Status', render: (r: SocAlert) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', render: (r: SocAlert) => (
      r.status === 'open' && (
        <Button size="sm" variant="ghost"
          onClick={() => { setAckModal({ open: true, alertId: r.id, type: 'soc' }); setNotes('') }}>
          Update
        </Button>
      )
    )},
  ]

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Wazuh Alerts (24h)" value={summary.wazuh_24h?.total || 0}
          icon={<Shield size={22} />} color={summary.wazuh_24h?.critical > 0 ? 'text-red-600' : 'text-primary-800'}
          subtitle={`${summary.wazuh_24h?.critical || 0} critical`} />
        <StatCard title="Critical Alerts" value={summary.wazuh_24h?.critical || 0} color="text-red-600" />
        <StatCard title="High Alerts" value={summary.wazuh_24h?.high || 0} color="text-orange-600" />
        <StatCard title="SOC Alerts Open" value={summary.soc_7d?.open || 0}
          icon={<Mail size={22} />} color={summary.soc_7d?.open > 0 ? 'text-amber-600' : 'text-green-600'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Alert Severity (24h)">
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                  {severityData.map((entry: { color: string }, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No Wazuh data — check integration settings</div>}
        </Card>

        <Card title="Alert Trend (30 days)">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1B3A6B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No trend data</div>}
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'wazuh' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('wazuh')}>
          Wazuh Alerts ({wazuhAlerts.length})
        </button>
        <button className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'soc' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('soc')}>
          SOC Alerts ({socAlerts.length})
        </button>
      </div>

      {tab === 'wazuh' && (
        <Card>
          {wazuhAlerts.length === 0 && !wazuhLoading && (
            <Alert variant="info" className="mb-3">No Wazuh alerts. Configure WAZUH_HOST credentials to enable live data.</Alert>
          )}
          <Table columns={wazuhColumns as never} data={wazuhAlerts as never} loading={wazuhLoading} emptyMessage="No Wazuh alerts" />
        </Card>
      )}

      {tab === 'soc' && (
        <Card>
          {socAlerts.length === 0 && !socLoading && (
            <Alert variant="info" className="mb-3">No SOC alerts. Configure SOC_EMAIL credentials to enable email ingestion.</Alert>
          )}
          <Table columns={socColumns as never} data={socAlerts as never} loading={socLoading} emptyMessage="No SOC alerts" />
        </Card>
      )}

      {/* Wazuh Live Dashboard */}
      {wazuhDashboardUrl && (
        <Card title="Wazuh Live Dashboard">
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
            <iframe
              src={wazuhDashboardUrl}
              width="100%"
              height={800}
              title="Wazuh Dashboard"
              className="w-full block"
              style={{ border: 'none' }}
            />
          </div>
        </Card>
      )}

      {/* Acknowledge Modal */}
      <Modal open={ackModal.open} onClose={closeAck}
        title={ackModal.type === 'wazuh' ? 'Acknowledge Alert' : 'Update SOC Alert'}>
        <div className="space-y-4">
          {ackModal.type === 'soc' && (
            <div>
              <label className="text-xs font-medium text-gray-700">New Status</label>
              <select value={socStatus} onChange={e => setSocStatus(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}
          <Textarea label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeAck}>Cancel</Button>
            <Button onClick={() => {
              if (ackModal.type === 'wazuh') {
                ackWazuhMutation.mutate({ id: ackModal.alertId!, n: notes })
              } else {
                updateSocMutation.mutate({ id: ackModal.alertId!, status: socStatus, n: notes })
              }
            }} loading={ackWazuhMutation.isPending || updateSocMutation.isPending}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
