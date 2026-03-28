import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { checklistsApi, applicationsApi } from '../services/api'
import { Button, Card, Textarea, Select, Input, Alert } from '../components/ui'
import { CheckCircle, XCircle, MinusCircle, AlertTriangle } from 'lucide-react'
import type { ChecklistItem } from '../types'

type ItemResult = 'pass' | 'fail' | 'na' | 'edge_case' | null

const ResultButton = ({ result, active, onClick, icon, label, color }: {
  result: ItemResult; active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string
}) => (
  <button onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all ${
      active ? `${color} shadow-sm` : 'border-gray-200 text-gray-500 hover:border-gray-300'
    }`}>
    {icon}{label}
  </button>
)

export default function ChecklistSubmit() {
  const { appId } = useParams()
  const [searchParams] = useSearchParams()
  const session = (searchParams.get('session') || 'BOD') as 'BOD' | 'EOD'
  const navigate = useNavigate()

  const [items, setItems] = useState<(ChecklistItem & { failure?: Record<string, string> })[]>([])
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const { data: appData } = useQuery({
    queryKey: ['application', appId],
    queryFn: () => applicationsApi.mine().then(r =>
      r.data.data.find((a: Record<string, string>) => a.id === appId)
    ),
  })

  const { data: templateData, isLoading } = useQuery({
    queryKey: ['checklist-templates', appData?.type, session],
    queryFn: () => checklistsApi.templates({ application_type: appData?.type || 'general', session }),
    enabled: !!appData,
  })

  useEffect(() => {
    const templates = templateData?.data?.data || []
    if (templates.length > 0) {
      setItems(templates.map((t: Record<string, unknown>) => ({
        item_key: t.item_key as string,
        label: t.label as string,
        result: null,
        notes: '',
        sort_order: t.sort_order as number,
      })))
    } else if (appData && !isLoading) {
      // Default items if no template
      setItems([
        { item_key: 'service_health', label: 'Service Health Check', result: null, notes: '', sort_order: 1 },
        { item_key: 'db_connection', label: 'Database Connectivity', result: null, notes: '', sort_order: 2 },
        { item_key: 'integrations', label: 'Integrations Active', result: null, notes: '', sort_order: 3 },
      ])
    }
  }, [templateData, appData, isLoading])

  const submitMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => checklistsApi.submit(payload),
    onSuccess: () => { setSuccess(true); setTimeout(() => navigate('/checklists'), 2000) },
    onError: (err: unknown) => setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Submission failed'),
  })

  const setResult = (idx: number, result: ItemResult) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, result } : item))
  }

  const setFailureField = (idx: number, field: string, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx
      ? { ...item, failure: { ...item.failure, [field]: value } }
      : item
    ))
  }

  const handleSubmit = () => {
    setError('')
    const unanswered = items.filter(i => i.result === null)
    if (unanswered.length > 0) {
      setError(`Please mark all items. ${unanswered.length} item(s) not answered.`)
      return
    }

    const failedItems = items.filter(i => i.result === 'fail')
    for (const item of failedItems) {
      if (!item.failure?.justification || !item.failure?.occurred_at || !item.failure?.impact || !item.failure?.steps_taken || !item.failure?.status) {
        setError(`Please complete all failure details for: "${item.label}"`)
        return
      }
    }

    submitMutation.mutate({
      application_id: appId,
      session,
      items: items.map(item => ({
        item_key: item.item_key,
        label: item.label,
        result: item.result,
        notes: item.notes,
        sort_order: item.sort_order,
        failure: item.result === 'fail' ? item.failure : undefined,
      })),
    })
  }

  if (success) return (
    <div className="flex flex-col items-center justify-center py-20">
      <CheckCircle size={48} className="text-green-500 mb-4" />
      <h2 className="text-lg font-semibold text-gray-800">Checklist Submitted</h2>
      <p className="text-sm text-gray-500 mt-1">Redirecting...</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-800">
          {session} Checklist — {appData?.name || 'Loading...'}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="space-y-3">
        {items.map((item, idx) => (
          <Card key={item.item_key}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs text-gray-400 font-mono mr-2">{idx + 1}.</span>
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <ResultButton result="pass" active={item.result === 'pass'} onClick={() => setResult(idx, 'pass')}
                    icon={<CheckCircle size={12} />} label="Pass"
                    color="border-green-400 bg-green-50 text-green-700" />
                  <ResultButton result="fail" active={item.result === 'fail'} onClick={() => setResult(idx, 'fail')}
                    icon={<XCircle size={12} />} label="Fail"
                    color="border-red-400 bg-red-50 text-red-700" />
                  <ResultButton result="na" active={item.result === 'na'} onClick={() => setResult(idx, 'na')}
                    icon={<MinusCircle size={12} />} label="N/A"
                    color="border-gray-400 bg-gray-50 text-gray-600" />
                  <ResultButton result="edge_case" active={item.result === 'edge_case'} onClick={() => setResult(idx, 'edge_case')}
                    icon={<AlertTriangle size={12} />} label="Edge"
                    color="border-amber-400 bg-amber-50 text-amber-700" />
                </div>
              </div>

              {item.result === 'fail' && (
                <div className="border-t border-red-100 pt-3 space-y-3">
                  <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">Failure Details Required</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Textarea label="Justification / Root Cause *" rows={2}
                      value={item.failure?.justification || ''}
                      onChange={e => setFailureField(idx, 'justification', e.target.value)}
                      className="col-span-2" />
                    <Input label="Time of Occurrence *" type="datetime-local"
                      value={item.failure?.occurred_at || ''}
                      onChange={e => setFailureField(idx, 'occurred_at', e.target.value)} />
                    <Select label="Current Status *"
                      value={item.failure?.status || ''}
                      onChange={e => setFailureField(idx, 'status', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="resolved">Resolved</option>
                      <option value="in_progress">In Progress</option>
                      <option value="escalated">Escalated</option>
                    </Select>
                    <Textarea label="Impact Description *" rows={2}
                      value={item.failure?.impact || ''}
                      onChange={e => setFailureField(idx, 'impact', e.target.value)} />
                    <Textarea label="Steps Taken to Resolve *" rows={2}
                      value={item.failure?.steps_taken || ''}
                      onChange={e => setFailureField(idx, 'steps_taken', e.target.value)} />
                    {item.failure?.status === 'resolved' && (
                      <Input label="Resolved At *" type="datetime-local"
                        value={item.failure?.resolved_at || ''}
                        onChange={e => setFailureField(idx, 'resolved_at', e.target.value)} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate('/checklists')}>Cancel</Button>
        <Button onClick={handleSubmit} loading={submitMutation.isPending}>
          Submit {session} Checklist
        </Button>
      </div>
    </div>
  )
}
