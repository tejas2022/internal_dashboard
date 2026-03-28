import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, usersApi } from '../services/api'
import { Card, StatCard, Badge, Table, StatusBadge, Button, Modal, Input, Select, Textarea, Alert } from '../components/ui'
import { FolderKanban, Plus, AlertTriangle } from 'lucide-react'
import type { Project, Task, User } from '../types'
import { format, isAfter } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const statusColor = (s: string) => {
  const m: Record<string, string> = { in_progress: 'info', completed: 'success', on_hold: 'warning', cancelled: 'gray', not_started: 'gray', planning: 'info' }
  return (m[s] || 'gray') as 'info' | 'success' | 'warning' | 'gray'
}

export default function Projects() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<'projects' | 'tasks' | 'workload'>(isAdmin ? 'projects' : 'tasks')
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project }>({ open: false })
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [pForm, setPForm] = useState({ name: '', description: '', status: 'not_started', priority: 'medium', start_date: '', end_date: '' })
  const [tForm, setTForm] = useState({ name: '', description: '', project_id: '', assigned_to: '', priority: 'medium', status: 'todo', start_date: '', due_date: '', estimated_hours: '', blockers: '' })
  const [error, setError] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { data: projectsData, isLoading: pLoading } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list(), enabled: isAdmin })
  const { data: tasksData, isLoading: tLoading } = useQuery({ queryKey: ['tasks-all'], queryFn: () => projectsApi.tasks() })
  const { data: workloadData } = useQuery({ queryKey: ['workload'], queryFn: () => projectsApi.workload(), enabled: isAdmin })
  const { data: usersData } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list(), enabled: isAdmin })
  const { data: deadlinesData } = useQuery({ queryKey: ['deadlines'], queryFn: () => projectsApi.deadlines(14), enabled: isAdmin })

  const saveProjectMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      projectModal.project ? projectsApi.update(projectModal.project!.id, d) : projectsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setProjectModal({ open: false }) },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed'),
  })

  const saveTaskMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      taskModal.task ? projectsApi.updateTask(taskModal.task!.id, d) : projectsApi.createTask(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-all'] }); setTaskModal({ open: false }) },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed'),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => projectsApi.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-all'] }),
    onError: (err: unknown) => alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Delete failed'),
  })

  const projects: Project[] = projectsData?.data?.data || []
  const tasks: Task[] = tasksData?.data?.data || []
  const workload = workloadData?.data?.data || []
  const users: User[] = usersData?.data?.data || []
  const deadlines = deadlinesData?.data?.data || {}

  const filteredTasks = tasks.filter(t =>
    (!filterUser || t.assigned_to === filterUser) &&
    (!filterStatus || t.status === filterStatus)
  )

  const openProject = (p?: Project) => {
    setPForm(p ? { name: p.name, description: p.description || '', status: p.status, priority: p.priority, start_date: p.start_date || '', end_date: p.end_date || '' } : { name: '', description: '', status: 'not_started', priority: 'medium', start_date: '', end_date: '' })
    setError('')
    setProjectModal({ open: true, project: p })
  }

  const openTask = (t?: Task) => {
    setTForm(t ? { name: t.name, description: t.description || '', project_id: t.project_id || '', assigned_to: t.assigned_to || '', priority: t.priority, status: t.status, start_date: t.start_date || '', due_date: t.due_date || '', estimated_hours: String(t.estimated_hours || ''), blockers: t.blockers || '' } : { name: '', description: '', project_id: '', assigned_to: '', priority: 'medium', status: 'todo', start_date: '', due_date: '', estimated_hours: '', blockers: '' })
    setError('')
    setTaskModal({ open: true, task: t })
  }

  const projectColumns = [
    { key: 'name', header: 'Project', render: (r: Project) => (
      <div><div className="font-medium text-gray-800">{r.name}</div>
        <div className="text-xs text-gray-400">{r.description?.substring(0, 60)}</div></div>
    )},
    { key: 'status', header: 'Status', render: (r: Project) => <StatusBadge status={r.status} /> },
    { key: 'priority', header: 'Priority', render: (r: Project) => <Badge variant={r.priority === 'critical' ? 'danger' : r.priority === 'high' ? 'warning' : 'gray'}>{r.priority}</Badge> },
    { key: 'tasks', header: 'Tasks', render: (r: Project) => (
      <span className="text-sm">{r.tasks_done || 0}/{r.task_count || 0} done</span>
    )},
    { key: 'end_date', header: 'Deadline', render: (r: Project) => {
      if (!r.end_date) return '—'
      const overdue = isAfter(new Date(), new Date(r.end_date)) && !['completed','cancelled'].includes(r.status)
      return <span className={overdue ? 'text-red-600 font-medium' : ''}>{format(new Date(r.end_date), 'dd/MM/yyyy')}</span>
    }},
    { key: 'actions', header: '', render: (r: Project) => <Button size="sm" variant="ghost" onClick={() => openProject(r)}>Edit</Button> },
  ]

  const taskColumns = [
    { key: 'name', header: 'Task', render: (r: Task) => (
      <div><div className="font-medium text-gray-800 max-w-xs truncate">{r.name}</div>
        <div className="text-xs text-gray-400">{r.project_name}</div></div>
    )},
    { key: 'status', header: 'Status', render: (r: Task) => <StatusBadge status={r.status} /> },
    { key: 'priority', header: 'Priority', render: (r: Task) => <Badge variant={r.priority === 'critical' ? 'danger' : r.priority === 'high' ? 'warning' : 'gray'}>{r.priority}</Badge> },
    { key: 'assigned_to_name', header: 'Assigned To', render: (r: Task) => r.assigned_to_name || <span className="text-gray-400">—</span> },
    { key: 'due_date', header: 'Due', render: (r: Task) => {
      if (!r.due_date) return '—'
      const overdue = isAfter(new Date(), new Date(r.due_date)) && r.status !== 'done'
      return <span className={overdue ? 'text-red-600 font-medium' : ''}>{format(new Date(r.due_date), 'dd/MM/yyyy')}</span>
    }},
    { key: 'blockers', header: 'Blocker', render: (r: Task) => r.blockers ? <Badge variant="danger">Blocked</Badge> : '—' },
    { key: 'actions', header: '', render: (r: Task) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => openTask(r)}>Edit</Button>
        <Button size="sm" variant="ghost"
          onClick={() => { if (confirm('Delete this task?')) deleteTaskMutation.mutate(r.id) }}
          loading={deleteTaskMutation.isPending && deleteTaskMutation.variables === r.id}
        >Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(isAdmin ? ['projects', 'tasks', 'workload'] : ['tasks']).map(t => (
            <button key={t} onClick={() => setTab(t as never)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === t ? 'bg-primary-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t === 'tasks' && !isAdmin ? 'My Tasks' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'projects' && isAdmin && <Button onClick={() => openProject()}><Plus size={15} /> New Project</Button>}
          {tab === 'tasks' && <Button onClick={() => openTask()}><Plus size={15} /> New Task</Button>}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Projects" value={projects.length} icon={<FolderKanban size={22} />} color="text-primary-800" />
        <StatCard title="In Progress" value={projects.filter(p => p.status === 'in_progress').length} color="text-blue-600" />
        <StatCard title="Blocked Tasks" value={tasks.filter(t => t.status === 'blocked').length} color="text-red-600" icon={<AlertTriangle size={22} />} />
        <StatCard title="Overdue Tasks" value={tasks.filter(t => t.due_date && isAfter(new Date(), new Date(t.due_date)) && t.status !== 'done').length} color="text-amber-600" />
      </div>

      {tab === 'projects' && (
        <Card title="All Projects" action={<span className="text-xs text-gray-400">{projects.length} total</span>}>
          <Table columns={projectColumns as never} data={projects as never} loading={pLoading} emptyMessage="No projects yet. Click 'New Project' to create one." />
        </Card>
      )}

      {tab === 'tasks' && (
        <>
          {(deadlines.tasks?.length > 0 || deadlines.milestones?.length > 0) && (
            <Alert variant="warning">
              <strong>Upcoming deadlines (14 days):</strong> {deadlines.tasks?.length || 0} tasks · {deadlines.milestones?.length || 0} milestones
            </Alert>
          )}
          <Card
            title={filterUser
              ? `Tasks — ${users.find(u => u.id === filterUser)?.name || 'User'} (${filteredTasks.length})`
              : `All Tasks (${filteredTasks.length})`}
            action={
              isAdmin && (
                <div className="flex items-center gap-2">
                  <select
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-800"
                  >
                    <option value="">All Users</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-800"
                  >
                    <option value="">All Statuses</option>
                    {['todo','in_progress','blocked','in_review','done'].map(s =>
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    )}
                  </select>
                  {(filterUser || filterStatus) && (
                    <button
                      onClick={() => { setFilterUser(''); setFilterStatus('') }}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              )
            }
          >
            <Table columns={taskColumns as never} data={filteredTasks as never} loading={tLoading} emptyMessage="No tasks found" />
          </Card>
        </>
      )}

      {tab === 'workload' && (
        <Card title="Team Workload">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workload.map((member: Record<string, unknown>) => (
              <div key={String(member.id)} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary-800 flex items-center justify-center text-white text-sm font-semibold">
                    {String(member.name).charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{String(member.name)}</div>
                    <div className="text-xs text-gray-400">{Number(member.total_tasks)} active tasks</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded p-2">
                    <div className="text-sm font-bold text-blue-700">{String(member.in_progress)}</div>
                    <div className="text-xs text-blue-500">Active</div>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <div className="text-sm font-bold text-red-700">{String(member.blocked)}</div>
                    <div className="text-xs text-red-500">Blocked</div>
                  </div>
                  <div className="bg-amber-50 rounded p-2">
                    <div className="text-sm font-bold text-amber-700">{String(member.overdue)}</div>
                    <div className="text-xs text-amber-500">Overdue</div>
                  </div>
                </div>
              </div>
            ))}
            {workload.length === 0 && <div className="col-span-3 text-center py-8 text-gray-400 text-sm">No team members found</div>}
          </div>
        </Card>
      )}

      {/* Project Modal */}
      <Modal open={projectModal.open} onClose={() => setProjectModal({ open: false })} title={projectModal.project ? 'Edit Project' : 'New Project'}>
        <div className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Input label="Project Name *" value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} />
          <Textarea label="Description" value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={pForm.status} onChange={e => setPForm(f => ({ ...f, status: e.target.value }))}>
              {['not_started','planning','in_progress','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </Select>
            <Select label="Priority" value={pForm.priority} onChange={e => setPForm(f => ({ ...f, priority: e.target.value }))}>
              {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input label="Start Date" type="date" value={pForm.start_date} onChange={e => setPForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={pForm.end_date} onChange={e => setPForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setProjectModal({ open: false })}>Cancel</Button>
            <Button onClick={() => saveProjectMutation.mutate(pForm as never)} loading={saveProjectMutation.isPending}>
              {projectModal.project ? 'Save' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Task Modal */}
      <Modal open={taskModal.open} onClose={() => setTaskModal({ open: false })} title={taskModal.task ? 'Edit Task' : 'New Task'} size="lg">
        <div className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Input label="Task Name *" value={tForm.name} onChange={e => setTForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            {isAdmin && (
              <Select label="Project" value={tForm.project_id} onChange={e => setTForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">— Select Project —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
            {isAdmin && (
              <Select label="Assigned To" value={tForm.assigned_to} onChange={e => setTForm(f => ({ ...f, assigned_to: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            )}
            <Select label="Priority" value={tForm.priority} onChange={e => setTForm(f => ({ ...f, priority: e.target.value }))}>
              {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select label="Status" value={tForm.status} onChange={e => setTForm(f => ({ ...f, status: e.target.value }))}>
              {['todo','in_progress','blocked','in_review','done'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </Select>
            <Input label="Start Date" type="date" value={tForm.start_date} onChange={e => setTForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="Due Date" type="date" value={tForm.due_date} onChange={e => setTForm(f => ({ ...f, due_date: e.target.value }))} />
            <Input label="Estimated Hours" type="number" value={tForm.estimated_hours} onChange={e => setTForm(f => ({ ...f, estimated_hours: e.target.value }))} />
          </div>
          <Textarea label="Description" value={tForm.description} onChange={e => setTForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Textarea label="Blockers" value={tForm.blockers} onChange={e => setTForm(f => ({ ...f, blockers: e.target.value }))} rows={2} placeholder="What is blocking this task?" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTaskModal({ open: false })}>Cancel</Button>
            <Button onClick={() => saveTaskMutation.mutate({ ...tForm, estimated_hours: tForm.estimated_hours ? Number(tForm.estimated_hours) : undefined } as never)} loading={saveTaskMutation.isPending}>
              {taskModal.task ? 'Save' : 'Create Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
