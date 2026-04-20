import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { infraChecklistsApi, usersApi } from '../services/api'
import { Card, Badge, StatusBadge, Button, Table, Modal, Select } from '../components/ui'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import {
  Cpu,
  Database,
  HardDrive,
  Server,
  Activity,
  Archive,
  ClipboardCheck,
  Clock,
  UserCheck,
} from 'lucide-react'

type CategoryRow = {
  category_id: string
  category_name: string
  sort_order: number
  checklist_id: string | null
  status: string | null
  is_late: boolean | null
  submitted_at: string | null
  failure_count: string | number
  manager_name: string | null
}

type ChecklistRow = {
  id: string
  category_name: string
  date: string
  status: string
  submitted_by_name: string | null
  is_late: boolean
  failure_count: string | number
}

const categoryIcon = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('vmware'))        return <Cpu size={20} />
  if (n.includes('database'))      return <Database size={20} />
  if (n.includes('veeam'))         return <HardDrive size={20} />
  if (n.includes('server health')) return <Server size={20} />
  if (n.includes('iis'))           return <Activity size={20} />
  if (n.includes('monthly'))       return <Archive size={20} />
  return <Server size={20} />
}

const statusColor = (status: string | null): string => {
  if (status === 'locked')    return 'border-green-200 bg-green-50'
  if (status === 'submitted') return 'border-green-200 bg-green-50'
  if (status === 'draft')     return 'border-amber-200 bg-amber-50'
  return 'border-gray-200 bg-white'
}

const iconColor = (status: string | null): string => {
  if (status === 'locked' || status === 'submitted') return 'text-green-600'
  if (status === 'draft')  return 'text-amber-500'
  return 'text-gray-400'
}

export default function InfraChecklists() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [assignModal, setAssignModal] = useState<{ open: boolean; categoryId?: string; categoryName?: string; currentUserId?: string }>({ open: false })
  const [assignUserId, setAssignUserId] = useState('')

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['infra-checklists-today'],
    queryFn: () => infraChecklistsApi.today(),
    refetchInterval: 60_000,
  })

  // Non-admin users see only their assigned categories via my-categories
  const { data: myCatData } = useQuery({
    queryKey: ['infra-my-categories'],
    queryFn: () => infraChecklistsApi.myCategories(),
    enabled: !isAdmin,
  })

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['infra-checklists-list'],
    queryFn: () => infraChecklistsApi.list(),
  })

  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: () => usersApi.getManagers(),
    enabled: isAdmin,
  })

  const assignMutation = useMutation({
    mutationFn: ({ categoryId, userId }: { categoryId: string; userId: string }) =>
      infraChecklistsApi.assign(categoryId, userId || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['infra-checklists-today'] })
      qc.invalidateQueries({ queryKey: ['infra-my-categories'] })
      setAssignModal({ open: false })
    },
  })

  const openAssign = (cat: CategoryRow) => {
    setAssignUserId(cat.manager_name ? String((managersData?.data?.data || []).find((m: Record<string, unknown>) => m.name === cat.manager_name)?.id || '') : '')
    setAssignModal({ open: true, categoryId: cat.category_id, categoryName: cat.category_name, currentUserId: undefined })
  }

  // Admin sees all from today endpoint; users see only their assigned categories
  const allCategories: CategoryRow[] = todayData?.data?.data || []
  const myAssignedIds = new Set((myCatData?.data?.data || []).map((c: Record<string, unknown>) => String(c.id)))

  // For non-admin: filter today categories to only assigned ones
  const categories: CategoryRow[] = isAdmin
    ? allCategories
    : allCategories.filter(c => myAssignedIds.has(c.category_id))

  const todayDate: string = todayData?.data?.date || new Date().toISOString().split('T')[0]
  const checklists: ChecklistRow[] = listData?.data?.data || []
  const managers = managersData?.data?.data || []

  const submittedCount = categories.filter(c => c.status === 'locked' || c.status === 'submitted').length
  const pendingCount   = categories.filter(c => !c.status).length
  const lateCount      = categories.filter(c => c.is_late).length
  const failureTotal   = categories.reduce((acc, c) => acc + Number(c.failure_count || 0), 0)

  const recentColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (row: Record<string, unknown>) => (
        <span className="font-medium text-gray-700">{String(row.date)}</span>
      ),
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{categoryIcon(String(row.category_name))}</span>
          <span>{String(row.category_name)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} />,
    },
    {
      key: 'submitted_by_name',
      header: 'Submitted By',
      render: (row: Record<string, unknown>) =>
        row.submitted_by_name ? String(row.submitted_by_name) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'is_late',
      header: 'Timing',
      render: (row: Record<string, unknown>) =>
        row.is_late
          ? <Badge variant="warning"><Clock size={10} className="mr-1 inline" />Late</Badge>
          : <Badge variant="success">On time</Badge>,
    },
    {
      key: 'failure_count',
      header: 'Failures',
      render: (row: Record<string, unknown>) =>
        Number(row.failure_count) > 0
          ? <Badge variant="danger">{String(row.failure_count)}</Badge>
          : <span className="text-gray-400">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Infrastructure Beginning-of-Day Checklist
          </p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <div className="text-lg font-bold text-green-700">{submittedCount}</div>
            <div className="text-xs text-green-600">Submitted</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
            <div className="text-lg font-bold text-gray-600">{pendingCount}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          {lateCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <div className="text-lg font-bold text-amber-700">{lateCount}</div>
              <div className="text-xs text-amber-600">Late</div>
            </div>
          )}
          {failureTotal > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <div className="text-lg font-bold text-red-700">{failureTotal}</div>
              <div className="text-xs text-red-600">Failures</div>
            </div>
          )}
        </div>
      </div>

      {/* Today's Status Grid */}
      <Card
        title={`BOD Status — ${todayDate}`}
        action={
          <span className="text-xs text-gray-400">{categories.length} categories</span>
        }
      >
        {todayLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : allCategories.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            No infra categories configured. Check server logs for seed status.
          </div>
        ) : !isAdmin && categories.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            No infra categories assigned to you. Contact your admin to get assigned.
          </div>
        ) : (
          <>
            {/* Admin: show unassigned categories at a glance */}
            {isAdmin && allCategories.some(c => !c.manager_name) && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                {allCategories.filter(c => !c.manager_name).length} categor{allCategories.filter(c => !c.manager_name).length === 1 ? 'y has' : 'ies have'} no assigned user — click <strong>Assign</strong> on each card below.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(isAdmin ? allCategories : categories).map((cat) => (
                <div
                  key={cat.category_id}
                  className={`border rounded-lg p-4 transition-all ${statusColor(cat.status)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={iconColor(cat.status)}>
                        {categoryIcon(cat.category_name)}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 leading-tight">
                        {cat.category_name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      {cat.status ? (
                        <StatusBadge status={cat.status} />
                      ) : (
                        <Badge variant="gray">Not submitted</Badge>
                      )}
                      {cat.is_late && (
                        <Badge variant="warning">
                          <Clock size={9} className="mr-0.5 inline" />Late
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Manager / assignment row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <UserCheck size={11} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500 truncate max-w-[120px]">
                        {cat.manager_name || <span className="text-amber-600 font-medium">Unassigned</span>}
                      </span>
                    </div>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => openAssign(cat)}>
                        <UserCheck size={11} /> Assign
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {Number(cat.failure_count) > 0 ? (
                        <Badge variant="danger">
                          {cat.failure_count} failure{Number(cat.failure_count) !== 1 ? 's' : ''}
                        </Badge>
                      ) : cat.status ? (
                        <Badge variant="success">All clear</Badge>
                      ) : null}
                    </div>
                    <Link to={`/infra-checklists/submit/${cat.category_id}`}>
                      <Button
                        size="sm"
                        variant={cat.status === 'locked' ? 'outline' : 'primary'}
                      >
                        <ClipboardCheck size={12} />
                        {cat.status === 'locked' ? 'View / Resubmit' : 'Submit BOD Check'}
                      </Button>
                    </Link>
                  </div>

                  {cat.submitted_at && (
                    <div className="mt-2 text-xs text-gray-400">
                      Submitted: {new Date(cat.submitted_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Recent Submissions Table */}
      <Card
        title="Recent Submissions"
        action={
          <span className="text-xs text-gray-400">{checklists.length} records</span>
        }
      >
        <Table
          columns={recentColumns as never}
          data={checklists as never}
          loading={listLoading}
          emptyMessage="No infra checklists submitted yet"
        />
      </Card>

      {/* Assign user modal (admin only) */}
      <Modal
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false })}
        title={`Assign — ${assignModal.categoryName || ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select the user responsible for submitting this infra BOD checklist daily.
          </p>
          <Select
            label="Assigned User"
            value={assignUserId}
            onChange={e => setAssignUserId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {managers.map((m: Record<string, unknown>) => (
              <option key={String(m.id)} value={String(m.id)}>{String(m.name)}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setAssignModal({ open: false })}>Cancel</Button>
            <Button
              loading={assignMutation.isPending}
              onClick={() => {
                if (assignModal.categoryId) {
                  assignMutation.mutate({ categoryId: assignModal.categoryId, userId: assignUserId })
                }
              }}
            >
              Save Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
