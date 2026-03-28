import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../services/api'
import { Card, StatCard, Badge, Table, StatusBadge, Button, Modal, Select, Input, Textarea, Alert } from '../components/ui'
import { CheckSquare, AlertTriangle, Clock, Plus } from 'lucide-react'
import type { Task } from '../types'
import { format, isAfter, isToday } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const emptyNew = { name: '', description: '', priority: 'medium', status: 'todo', due_date: '', estimated_hours: '', blockers: '' }

export default function MyTasks() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [modal, setModal] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [newModal, setNewModal] = useState(false)
  const [form, setForm] = useState({ status: '', actual_hours: '', blockers: '' })
  const [newForm, setNewForm] = useState(emptyNew)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => projectsApi.tasks({ mine: 'true' }),
    refetchInterval: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => projectsApi.updateTask(modal.task!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-tasks'] }); setModal({ open: false }) },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed'),
  })

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => projectsApi.createTask(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-tasks'] }); setNewModal(false); setNewForm(emptyNew) },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Create failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tasks'] }),
    onError: (err: unknown) => alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Delete failed'),
  })

  const tasks: Task[] = data?.data?.data || []

  const dueToday = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'done')
  const overdue = tasks.filter(t => t.due_date && isAfter(new Date(), new Date(t.due_date)) && t.status !== 'done' && !isToday(new Date(t.due_date)))
  const blocked = tasks.filter(t => t.status === 'blocked')
  const inProgress = tasks.filter(t => t.status === 'in_progress')

  const openModal = (task: Task) => {
    setForm({ status: task.status, actual_hours: String(task.actual_hours || ''), blockers: task.blockers || '' })
    setError('')
    setModal({ open: true, task })
  }

  const openNew = () => { setNewForm(emptyNew); setError(''); setNewModal(true) }

  const columns = [
    { key: 'name', header: 'Task', render: (r: Task) => (
      <div>
        <div className="font-medium text-gray-800">{r.name}</div>
        <div className="text-xs text-gray-400">{r.project_name || 'Personal task'}</div>
      </div>
    )},
    { key: 'status', header: 'Status', render: (r: Task) => <StatusBadge status={r.status} /> },
    { key: 'priority', header: 'Priority', render: (r: Task) => (
      <Badge variant={r.priority === 'critical' ? 'danger' : r.priority === 'high' ? 'warning' : 'gray'}>{r.priority}</Badge>
    )},
    { key: 'due_date', header: 'Due Date', render: (r: Task) => {
      if (!r.due_date) return '—'
      const od = isAfter(new Date(), new Date(r.due_date)) && r.status !== 'done'
      const td = isToday(new Date(r.due_date))
      return (
        <span className={od ? 'text-red-600 font-medium' : td ? 'text-amber-600 font-medium' : ''}>
          {td ? 'Today' : format(new Date(r.due_date), 'dd/MM/yyyy')}
          {od && ' (OVERDUE)'}
        </span>
      )
    }},
    { key: 'blockers', header: 'Blockers', render: (r: Task) => (
      r.blockers ? <span className="text-xs text-red-600 max-w-xs block truncate">{r.blockers}</span> : '—'
    )},
    { key: 'actions', header: '', render: (r: Task) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => openModal(r)}>Update</Button>
        {r.reported_by === user?.id && (
          <Button size="sm" variant="ghost"
            onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate(r.id) }}
            loading={deleteMutation.isPending && deleteMutation.variables === r.id}
          >Delete</Button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={tasks.length} icon={<CheckSquare size={22} />} color="text-primary-800" />
        <StatCard title="In Progress" value={inProgress.length} color="text-blue-600" />
        <StatCard title="Due Today" value={dueToday.length} icon={<Clock size={22} />} color={dueToday.length > 0 ? 'text-amber-600' : 'text-gray-400'} />
        <StatCard title="Overdue" value={overdue.length} icon={<AlertTriangle size={22} />} color={overdue.length > 0 ? 'text-red-600' : 'text-green-600'} />
      </div>

      {dueToday.length > 0 && (
        <Alert variant="warning">
          <strong>{dueToday.length} task(s)</strong> due today: {dueToday.map(t => t.name).join(', ')}
        </Alert>
      )}
      {overdue.length > 0 && <Alert variant="danger"><strong>{overdue.length} task(s)</strong> overdue.</Alert>}
      {blocked.length > 0 && <Alert variant="danger"><strong>{blocked.length} task(s)</strong> are blocked.</Alert>}

      <Card title="My Tasks" action={
        <Button size="sm" onClick={openNew}><Plus size={14} /> New Task</Button>
      }>
        <Table columns={columns as never} data={tasks as never} loading={isLoading} emptyMessage="No tasks assigned to you" />
      </Card>

      {/* Update Task Modal */}
      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={`Update: ${modal.task?.name || ''}`}>
        <div className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {['todo','in_progress','blocked','in_review','done'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </Select>
          <Input label="Actual Hours Logged" type="number" step="0.5" value={form.actual_hours}
            onChange={e => setForm(f => ({ ...f, actual_hours: e.target.value }))} />
          <Textarea label="Blockers (if any)" value={form.blockers}
            onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))} rows={2}
            placeholder="What is blocking this task?" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({
              status: form.status,
              actual_hours: form.actual_hours ? Number(form.actual_hours) : undefined,
              blockers: form.blockers || null,
            })} loading={updateMutation.isPending}>Save Update</Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="New Task">
        <div className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Input label="Task Name *" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" value={newForm.priority} onChange={e => setNewForm(f => ({ ...f, priority: e.target.value }))}>
              {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select label="Status" value={newForm.status} onChange={e => setNewForm(f => ({ ...f, status: e.target.value }))}>
              {['todo','in_progress','in_review'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </Select>
            <Input label="Due Date" type="date" value={newForm.due_date} onChange={e => setNewForm(f => ({ ...f, due_date: e.target.value }))} />
            <Input label="Estimated Hours" type="number" step="0.5" value={newForm.estimated_hours} onChange={e => setNewForm(f => ({ ...f, estimated_hours: e.target.value }))} />
          </div>
          <Textarea label="Description" value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Textarea label="Blockers" value={newForm.blockers} onChange={e => setNewForm(f => ({ ...f, blockers: e.target.value }))} rows={2} placeholder="What is blocking this task?" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewModal(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({
              name: newForm.name,
              description: newForm.description || undefined,
              priority: newForm.priority,
              status: newForm.status,
              due_date: newForm.due_date || undefined,
              estimated_hours: newForm.estimated_hours ? Number(newForm.estimated_hours) : undefined,
              blockers: newForm.blockers || undefined,
            })} loading={createMutation.isPending}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
