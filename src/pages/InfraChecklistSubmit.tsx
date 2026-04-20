import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { infraChecklistsApi } from '../services/api'
import { Button, Card, Input, Select, Textarea, Alert } from '../components/ui'
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Search,
} from 'lucide-react'

type ItemResult = 'pass' | 'fail' | 'na' | 'edge_case' | null

interface InfraItem {
  item_key: string
  label: string
  result: ItemResult
  notes: string
  sort_order: number
  failure?: Record<string, string>
}

const ResultButton = ({
  result,
  active,
  onClick,
  icon,
  label,
  color,
}: {
  result: ItemResult
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  color: string
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all ${
      active ? `${color} shadow-sm` : 'border-gray-200 text-gray-500 hover:border-gray-300'
    }`}
  >
    {icon}{label}
  </button>
)

export default function InfraChecklistSubmit() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()

  const [items, setItems] = useState<InfraItem[]>([])
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Load categories to get the category name
  const { data: categoriesData } = useQuery({
    queryKey: ['infra-categories'],
    queryFn: () => infraChecklistsApi.categories(),
  })

  const categories = categoriesData?.data?.data || []
  const category = categories.find(
    (c: Record<string, unknown>) => String(c.id) === categoryId
  )
  const categoryName: string = category ? String(category.name) : 'Loading...'

  // Load templates for this category
  const { data: templateData, isLoading: templatesLoading } = useQuery({
    queryKey: ['infra-templates', categoryId],
    queryFn: () => infraChecklistsApi.templates({ category_id: categoryId }),
    enabled: !!categoryId,
  })

  // Determine if this is a large category (show search box)
  const templates = templateData?.data?.data || []
  const showSearch = templates.length >= 20

  useEffect(() => {
    if (templates.length > 0) {
      setItems(
        templates.map((t: Record<string, unknown>) => ({
          item_key: String(t.item_key),
          label: String(t.label),
          result: null,
          notes: '',
          sort_order: Number(t.sort_order),
        }))
      )
    }
  }, [templateData])

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.item_key.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

  const submitMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => infraChecklistsApi.submit(payload),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => navigate('/infra-checklists'), 2000)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error || 'Submission failed. Please try again.')
    },
  })

  const setResultByKey = (key: string, result: ItemResult) => {
    setItems((prev) =>
      prev.map((item) => (item.item_key === key ? { ...item, result } : item))
    )
  }

  const setNotesbyKey = (key: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.item_key === key ? { ...item, notes: value } : item))
    )
  }

  const setFailureFieldByKey = (key: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.item_key === key
          ? { ...item, failure: { ...item.failure, [field]: value } }
          : item
      )
    )
  }

  const handleBulkPass = () => {
    setItems((prev) =>
      prev.map((item) => (item.result === null ? { ...item, result: 'pass' } : item))
    )
  }

  const handleSubmit = () => {
    setError('')

    const unanswered = items.filter((i) => i.result === null)
    if (unanswered.length > 0) {
      setError(
        `Please mark all items. ${unanswered.length} item(s) not answered.`
      )
      return
    }

    const failedItems = items.filter((i) => i.result === 'fail')
    for (const item of failedItems) {
      if (
        !item.failure?.justification ||
        !item.failure?.occurred_at ||
        !item.failure?.impact ||
        !item.failure?.steps_taken ||
        !item.failure?.status
      ) {
        setError(`Please complete all failure details for: "${item.label}"`)
        return
      }
    }

    submitMutation.mutate({
      category_id: categoryId,
      items: items.map((item) => ({
        item_key: item.item_key,
        label: item.label,
        result: item.result,
        notes: item.notes,
        sort_order: item.sort_order,
      })),
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle size={48} className="text-green-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-800">Checklist Submitted</h2>
        <p className="text-sm text-gray-500 mt-1">Redirecting to Infra BOD dashboard...</p>
      </div>
    )
  }

  const answeredCount = items.filter((i) => i.result !== null).length
  const totalCount = items.length
  const failCount = items.filter((i) => i.result === 'fail').length
  const progressPct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-800">
          Infrastructure BOD Check — {categoryName}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>
              {answeredCount} of {totalCount} items completed
              {failCount > 0 && (
                <span className="ml-2 text-red-600 font-medium">
                  · {failCount} failure{failCount !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                progressPct === 100
                  ? failCount > 0
                    ? 'bg-red-500'
                    : 'bg-green-500'
                  : 'bg-primary-600'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="secondary" onClick={handleBulkPass}>
              Mark all unanswered as Pass
            </Button>
          </div>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Search box for large categories */}
      {showSearch && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder={`Search ${totalCount} items...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          )}
        </div>
      )}

      {/* Items list */}
      {templatesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {searchQuery && (
            <p className="text-xs text-gray-500">
              Showing {filteredItems.length} of {totalCount} items
            </p>
          )}
          <div className="space-y-2">
            {filteredItems.map((item) => {
              return (
                <Card key={item.item_key}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-400 font-mono mr-2">
                          {item.sort_order}.
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                        <ResultButton
                          result="pass"
                          active={item.result === 'pass'}
                          onClick={() => setResultByKey(item.item_key, 'pass')}
                          icon={<CheckCircle size={12} />}
                          label="Pass"
                          color="border-green-400 bg-green-50 text-green-700"
                        />
                        <ResultButton
                          result="fail"
                          active={item.result === 'fail'}
                          onClick={() => setResultByKey(item.item_key, 'fail')}
                          icon={<XCircle size={12} />}
                          label="Fail"
                          color="border-red-400 bg-red-50 text-red-700"
                        />
                        <ResultButton
                          result="na"
                          active={item.result === 'na'}
                          onClick={() => setResultByKey(item.item_key, 'na')}
                          icon={<MinusCircle size={12} />}
                          label="N/A"
                          color="border-gray-400 bg-gray-50 text-gray-600"
                        />
                        <ResultButton
                          result="edge_case"
                          active={item.result === 'edge_case'}
                          onClick={() => setResultByKey(item.item_key, 'edge_case')}
                          icon={<AlertTriangle size={12} />}
                          label="Edge"
                          color="border-amber-400 bg-amber-50 text-amber-700"
                        />
                      </div>
                    </div>

                    {/* Notes field */}
                    <div>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={item.notes}
                        onChange={(e) => setNotesbyKey(item.item_key, e.target.value)}
                        className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent placeholder-gray-300"
                      />
                    </div>

                    {/* Failure details */}
                    {item.result === 'fail' && (
                      <div className="border-t border-red-100 pt-3 space-y-3">
                        <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                          Failure Details Required
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Textarea
                            label="Justification / Root Cause *"
                            rows={2}
                            value={item.failure?.justification || ''}
                            onChange={(e) =>
                              setFailureFieldByKey(item.item_key, 'justification', e.target.value)
                            }
                            className="col-span-2"
                          />
                          <Input
                            label="Time of Occurrence *"
                            type="datetime-local"
                            value={item.failure?.occurred_at || ''}
                            onChange={(e) =>
                              setFailureFieldByKey(item.item_key, 'occurred_at', e.target.value)
                            }
                          />
                          <Select
                            label="Current Status *"
                            value={item.failure?.status || ''}
                            onChange={(e) =>
                              setFailureFieldByKey(item.item_key, 'status', e.target.value)
                            }
                          >
                            <option value="">— Select —</option>
                            <option value="resolved">Resolved</option>
                            <option value="in_progress">In Progress</option>
                            <option value="escalated">Escalated</option>
                          </Select>
                          <Textarea
                            label="Impact Description *"
                            rows={2}
                            value={item.failure?.impact || ''}
                            onChange={(e) =>
                              setFailureFieldByKey(item.item_key, 'impact', e.target.value)
                            }
                          />
                          <Textarea
                            label="Steps Taken to Resolve *"
                            rows={2}
                            value={item.failure?.steps_taken || ''}
                            onChange={(e) =>
                              setFailureFieldByKey(item.item_key, 'steps_taken', e.target.value)
                            }
                          />
                          {item.failure?.status === 'resolved' && (
                            <Input
                              label="Resolved At *"
                              type="datetime-local"
                              value={item.failure?.resolved_at || ''}
                              onChange={(e) =>
                                setFailureFieldByKey(item.item_key, 'resolved_at', e.target.value)
                              }
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Submit bar */}
      <div className="flex justify-between items-center gap-3 pb-6 pt-2 border-t border-gray-200 bg-white sticky bottom-0 px-1">
        <div className="text-xs text-gray-500">
          {answeredCount}/{totalCount} answered
          {failCount > 0 && (
            <span className="ml-2 text-red-600 font-medium">· {failCount} failures</span>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/infra-checklists')}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitMutation.isPending}
            disabled={totalCount === 0}
          >
            Submit Infra BOD Check
          </Button>
        </div>
      </div>
    </div>
  )
}
