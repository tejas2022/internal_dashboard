import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vaptApi, usersApi } from '../services/api'
import { Card, StatCard, Badge, Table, SeverityBadge, StatusBadge, Button, Modal, Input, Select, Textarea, Alert } from '../components/ui'
import { Bug, AlertTriangle, Plus } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import type { VaptFinding, User } from '../types'
import { format } from 'date-fns'

const SEVERITY_COLORS: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#2563eb', informational: '#6b7280' }
const STATUS_COLORS: Record<string, string> = { open: '#dc2626', in_progress: '#d97706', remediated: '#16a34a', accepted_risk: '#6b7280', closed: '#9ca3af' }

const emptyForm = {
  title: '', severity: 'medium', category: 'application', affected_asset: '',
  discovery_date: '', description: '', assigned_to: '', status: 'open',
  target_remediation_date: '', evidence_notes: '', assessment_id: '',
}

export default function Vapt() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; finding?: VaptFinding }>({ open: false })
  const [form, setForm] = useState(emptyForm)
  const [saveError, setSaveError] = useState('')

  const { data: summaryData } = useQuery({ queryKey: ['vapt-summary'], queryFn: () => vaptApi.summary() })
  const { data: ageingData } = useQuery({ queryKey: ['vapt-ageing'], queryFn: () => vaptApi.ageing() })
  const { data: findingsData, isLoading } = useQuery({ queryKey: ['vapt-findings'], queryFn: () => vaptApi.list() })
  const { data: usersData } = useQuery({ queryKey: ['managers'], queryFn: () => usersApi.getManagers() })
  const { data: assessmentsData } = useQuery({ queryKey: ['vapt-assessments'], queryFn: () => vaptApi.assessments() })

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      modal.finding ? vaptApi.update(modal.finding!.id, payload) : vaptApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vapt-findings'] })
      qc.invalidateQueries({ queryKey: ['vapt-summary'] })
      closeModal()
    },
    onError: (err: unknown) => setSaveError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed'),
  })

  const s = summaryData?.data?.data || {}
  const findings: VaptFinding[] = findingsData?.data?.data || []
  const ageing = ageingData?.data?.data || []
  const users: User[] = usersData?.data?.data || []
  const assessments = assessmentsData?.data?.data || []

  const bySeverityData = (s.by_severity || []).map((x: Record<string, unknown>) => ({
    name: String(x.severity), value: Number(x.count), color: SEVERITY_COLORS[String(x.severity)] || '#6b7280'
  }))

  const byStatusData = (s.by_status || []).map((x: Record<string, unknown>) => ({
    name: String(x.status).replace('_', ' '), value: Number(x.count), color: STATUS_COLORS[String(x.status)] || '#6b7280'
  }))

  const openModal = (finding?: VaptFinding) => {
    setForm(finding ? {
      title: finding.title, severity: finding.severity, category: finding.category || 'application',
      affected_asset: finding.affected_asset || '', discovery_date: finding.discovery_date || '',
      description: finding.description || '', assigned_to: finding.assigned_to || '',
      status: finding.status, target_remediation_date: finding.target_remediation_date || '',
      evidence_notes: finding.evidence_notes || '', assessment_id: '',
    } : emptyForm)
    setSaveError('')
    setModal({ open: true, finding })
  }

  const closeModal = () => setModal({ open: false })

  const columns = [
    { key: 'finding_id', header: 'ID', render: (r: VaptFinding) => <span className="font-mono text-xs">{r.finding_id}</span> },
    { key: 'title', header: 'Title', render: (r: VaptFinding) => (
      <div>
        <div className="font-medium text-gray-800 max-w-xs truncate" title={r.title}>{r.title}</div>
        <div className="text-xs text-gray-400">{r.affected_asset}</div>
      </div>
    )},
    { key: 'severity', header: 'Severity', render: (r: VaptFinding) => <SeverityBadge severity={r.severity} /> },
    { key: 'status', header: 'Status', render: (r: VaptFinding) => <StatusBadge status={r.status} /> },
    { key: 'assigned_to_name', header: 'Assigned To', render: (r: VaptFinding) => r.assigned_to_name || <span className="text-gray-400">—</span> },
    { key: 'target_remediation_date', header: 'Target Date', render: (r: VaptFinding) => {
      if (!r.target_remediation_date) return '—'
      const overdue = new Date(r.target_remediation_date) < new Date() && !['remediated', 'accepted_risk', 'closed'].includes(r.status)
      return <span className={overdue ? 'text-red-600 font-medium' : ''}>{format(new Date(r.target_remediation_date), 'dd/MM/yyyy')}</span>
    }},
    { key: 'actions', header: '', render: (r: VaptFinding) => (
      <Button size="sm" variant="ghost" onClick={() => openModal(r)}>Edit</Button>
    )},
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => openModal()}><Plus size={15} /> New Finding</Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Open Findings" value={findings.filter(f => !['remediated','accepted_risk','closed'].includes(f.status)).length}
          icon={<Bug size={22} />} color="text-primary-800" />
        <StatCard title="Critical Open" value={findings.filter(f => f.severity === 'critical' && !['remediated','accepted_risk','closed'].includes(f.status)).length}
          color="text-red-600" />
        <StatCard title="Overdue" value={s.overdue_count || 0}
          icon={<AlertTriangle size={22} />} color={s.overdue_count > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard title="Total Findings" value={findings.length} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Open Findings by Severity">
          {bySeverityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bySeverityData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                  {bySeverityData.map((e: { color: string }, i: number) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No open findings</div>}
        </Card>
        <Card title="Findings by Status">
          {byStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byStatusData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {byStatusData.map((e: { color: string }, i: number) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </Card>
      </div>

      {ageing.length > 0 && (
        <Alert variant="danger">
          <strong>{ageing.length} finding(s)</strong> are past their target remediation date.
        </Alert>
      )}

      <Card title="All Findings">
        <Table columns={columns as never} data={findings as never} loading={isLoading} emptyMessage="No VAPT findings logged" />
      </Card>

      {/* Edit/Create Modal */}
      <Modal open={modal.open} onClose={closeModal} title={modal.finding ? `Edit ${modal.finding.finding_id}` : 'New VAPT Finding'} size="xl">
        <div className="space-y-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Textarea label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Severity *" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
              {['critical','high','medium','low','informational'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </Select>
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {['network','application','configuration','social_engineering','other'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </Select>
            <Input label="Affected Asset" value={form.affected_asset} onChange={e => setForm(f => ({ ...f, affected_asset: e.target.value }))} />
            <Input label="Discovery Date" type="date" value={form.discovery_date} onChange={e => setForm(f => ({ ...f, discovery_date: e.target.value }))} />
            <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {['open','in_progress','remediated','accepted_risk','closed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </Select>
            <Select label="Assigned To" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            <Input label="Target Remediation Date" type="date" value={form.target_remediation_date} onChange={e => setForm(f => ({ ...f, target_remediation_date: e.target.value }))} />
            <Select label="Assessment" value={form.assessment_id} onChange={e => setForm(f => ({ ...f, assessment_id: e.target.value }))}>
              <option value="">— No Assessment —</option>
              {assessments.map((a: Record<string, string>) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <Textarea label="Evidence / Notes" value={form.evidence_notes} onChange={e => setForm(f => ({ ...f, evidence_notes: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form as never)} loading={saveMutation.isPending}>
              {modal.finding ? 'Save Changes' : 'Create Finding'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
