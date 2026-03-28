import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../services/api'
import { Card, Badge, Table, Button, Modal, Input, Select, Alert } from '../components/ui'
import { Plus, Key, UserCheck, UserX } from 'lucide-react'
import type { User } from '../types'
import { format } from 'date-fns'

const emptyForm = { name: '', email: '', username: '', password: '', role: 'user' }

export default function Users() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; user?: User; mode?: 'edit' | 'create' | 'password' }>({ open: false })
  const [form, setForm] = useState(emptyForm)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      modal.user ? usersApi.update(modal.user!.id, payload) : usersApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeModal() },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed'),
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) => usersApi.resetPassword(id, pwd),
    onSuccess: () => { closeModal() },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Reset failed'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => usersApi.update(id, { is_active: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const users: User[] = data?.data?.data || []

  const openCreate = () => { setForm(emptyForm); setError(''); setModal({ open: true, mode: 'create' }) }
  const openEdit = (user: User) => {
    setForm({ name: user.name, email: user.email, username: user.username, password: '', role: user.role })
    setError('')
    setModal({ open: true, user, mode: 'edit' })
  }
  const openPassword = (user: User) => { setNewPassword(''); setError(''); setModal({ open: true, user, mode: 'password' }) }
  const closeModal = () => setModal({ open: false })

  const columns = [
    { key: 'name', header: 'Name', render: (r: User) => (
      <div>
        <div className="font-medium text-gray-800">{r.name}</div>
        <div className="text-xs text-gray-400">{r.email}</div>
      </div>
    )},
    { key: 'username', header: 'Username', render: (r: User) => <span className="font-mono text-xs">{r.username}</span> },
    { key: 'role', header: 'Role', render: (r: User) => (
      <Badge variant={r.role === 'admin' ? 'danger' : r.role === 'user' ? 'info' : 'gray'} className="capitalize">{r.role}</Badge>
    )},
    { key: 'is_active', header: 'Status', render: (r: User) => (
      r.is_active
        ? <Badge variant="success">Active</Badge>
        : <Badge variant="gray">Inactive</Badge>
    )},
    { key: 'last_login', header: 'Last Login', render: (r: User) =>
      r.last_login ? format(new Date(r.last_login), 'dd/MM/yyyy HH:mm') : <span className="text-gray-400">Never</span>
    },
    { key: 'actions', header: '', render: (r: User) => (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit user">
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openPassword(r)} title="Reset password">
          <Key size={13} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => {
          if (confirm(`${r.is_active ? 'Deactivate' : 'Activate'} ${r.name}?`)) {
            toggleActiveMutation.mutate({ id: r.id, active: !r.is_active })
          }
        }}>
          {r.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} users registered</p>
        <Button onClick={openCreate}><Plus size={15} /> Add User</Button>
      </div>

      <Card>
        <Table columns={columns as never} data={users as never} loading={isLoading} emptyMessage="No users found" />
      </Card>

      {/* Create / Edit Modal */}
      {(modal.mode === 'create' || modal.mode === 'edit') && (
        <Modal open={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New User' : `Edit: ${modal.user?.name}`}>
          <div className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
              <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input label="Username *" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                disabled={modal.mode === 'edit'} />
              <Select label="Role *" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="user">User (App Manager / Developer)</option>
                <option value="admin">Admin (CIO)</option>
                <option value="stakeholder">Stakeholder (Viewer)</option>
              </Select>
              {modal.mode === 'create' && (
                <Input label="Initial Password *" type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={8} />
              )}
            </div>
            {modal.mode === 'create' && (
              <p className="text-xs text-gray-500">User will be prompted to change their password on first login.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form as never)} loading={saveMutation.isPending}>
                {modal.mode === 'create' ? 'Create User' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {modal.mode === 'password' && (
        <Modal open={modal.open} onClose={closeModal} title={`Reset Password: ${modal.user?.name}`} size="sm">
          <div className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <Input label="New Password *" type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} minLength={8}
              placeholder="Minimum 8 characters" />
            <p className="text-xs text-gray-500">User will be required to change this on next login.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={() => {
                if (newPassword.length < 8) { setError('Minimum 8 characters'); return }
                resetMutation.mutate({ id: modal.user!.id, pwd: newPassword })
              }} loading={resetMutation.isPending}>
                Reset Password
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
