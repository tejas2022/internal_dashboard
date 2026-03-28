import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi, usersApi } from '../services/api'
import { Button, Card, Badge, Table, Modal, Input, Select, Textarea, StatusBadge } from '../components/ui'
import type { Application, User } from '../types'
import { Plus, Edit, Power } from 'lucide-react'

const emptyForm = { name: '', type: '', environment: 'prod', parent_id: '', manager_user_id: '', description: '', tags: '' }

export default function Applications() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; app?: Application }>({ open: false })
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  })

  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: () => usersApi.getManagers(),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      modal.app ? applicationsApi.update(modal.app!.id, payload) : applicationsApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); closeModal() },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })

  const apps: Application[] = data?.data?.data || []
  const managers: User[] = managersData?.data?.data || []

  const openCreate = () => { setForm(emptyForm); setError(''); setModal({ open: true }) }
  const openEdit = (app: Application) => {
    setForm({
      name: app.name, type: app.type || '', environment: app.environment,
      parent_id: app.parent_id || '', manager_user_id: app.manager_user_id || '',
      description: app.description || '', tags: (app.tags || []).join(', ')
    })
    setError('')
    setModal({ open: true, app })
  }
  const closeModal = () => setModal({ open: false })

  const handleSave = () => {
    if (!form.name.trim()) { setError('Application name is required'); return }
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      parent_id: form.parent_id || null,
      manager_user_id: form.manager_user_id || null,
    }
    saveMutation.mutate(payload)
  }

  const columns = [
    { key: 'name', header: 'Application', render: (row: Application) => (
      <div>
        <div className="font-medium text-gray-800">{row.name}</div>
        {row.parent_name && <div className="text-xs text-gray-400">Sub-app of: {row.parent_name}</div>}
      </div>
    )},
    { key: 'type', header: 'Type', render: (row: Application) => row.type ? <Badge variant="gray">{row.type}</Badge> : '-' },
    { key: 'environment', header: 'Env', render: (row: Application) => (
      <Badge variant={row.environment === 'prod' ? 'danger' : row.environment === 'uat' ? 'warning' : 'gray'}>
        {row.environment?.toUpperCase()}
      </Badge>
    )},
    { key: 'manager_name', header: 'Manager', render: (row: Application) => row.manager_name || <span className="text-gray-400">Unassigned</span> },
    { key: 'is_active', header: 'Status', render: (row: Application) => (
      <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
    )},
    { key: 'actions', header: '', render: (row: Application) => (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => openEdit(row)}><Edit size={13} /></Button>
        {row.is_active && (
          <Button size="sm" variant="ghost" onClick={() => {
            if (confirm(`Deactivate "${row.name}"?`)) deactivateMutation.mutate(row.id)
          }}><Power size={13} /></Button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{apps.length} applications registered</p>
        <Button onClick={openCreate}><Plus size={15} /> Add Application</Button>
      </div>

      <Card>
        <Table columns={columns as never} data={apps as never} loading={isLoading} emptyMessage="No applications configured. Click 'Add Application' to get started." />
      </Card>

      <Modal open={modal.open} onClose={closeModal} title={modal.app ? 'Edit Application' : 'New Application'} size="lg">
        <div className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
            <Input label="Type (e.g. trading, reporting)" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
            <Select label="Environment" value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
              <option value="prod">Production</option>
              <option value="uat">UAT</option>
              <option value="dev">Development</option>
            </Select>
            <Select label="Assigned Manager" value={form.manager_user_id} onChange={e => setForm(f => ({ ...f, manager_user_id: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <Select label="Parent Application (optional)" value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
              <option value="">— None (top-level) —</option>
              {apps.filter(a => !a.parent_id && a.id !== modal.app?.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Input label="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="trading, critical, equities" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              {modal.app ? 'Save Changes' : 'Create Application'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
