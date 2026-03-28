export type UserRole = 'admin' | 'user' | 'stakeholder'

export interface User {
  id: string
  name: string
  email: string
  username: string
  role: UserRole
  is_active?: boolean
  last_login?: string
  created_at?: string
  mustChangePassword?: boolean
}

export interface Application {
  id: string
  name: string
  parent_id?: string
  parent_name?: string
  type?: string
  environment: 'prod' | 'uat' | 'dev'
  manager_user_id?: string
  manager_name?: string
  description?: string
  tags?: string[]
  is_active: boolean
  sub_applications?: Application[]
}

export interface ChecklistItem {
  id?: string
  item_key: string
  label: string
  result: 'pass' | 'fail' | 'na' | 'edge_case' | null
  notes?: string
  sort_order: number
  failure?: ChecklistFailure
  // from DB join
  justification?: string
  occurred_at?: string
  impact?: string
  steps_taken?: string
  failure_status?: string
  resolved_at?: string
  escalated_to?: string
}

export interface ChecklistFailure {
  justification: string
  occurred_at: string
  impact: string
  steps_taken: string
  status: 'resolved' | 'in_progress' | 'escalated'
  resolved_at?: string
  escalated_to?: string
}

export interface Checklist {
  id: string
  application_id: string
  application_name: string
  submitted_by: string
  submitted_by_name?: string
  date: string
  session: 'BOD' | 'EOD'
  status: 'draft' | 'submitted' | 'locked'
  is_late: boolean
  submitted_at?: string
  items?: ChecklistItem[]
}

export interface NetworkDevice {
  device_id: string
  device_name: string
  device_type?: string
  ip_address?: string
  status: 'up' | 'down' | 'unknown'
  uptime_pct_24h?: number
  uptime_pct_7d?: number
  uptime_pct_30d?: number
  cpu_utilization?: number
  memory_utilization?: number
  polled_at: string
}

export interface OpManagerAlarm {
  id: string
  alarm_id: string
  device_name: string
  severity: 'critical' | 'major' | 'minor' | 'warning' | 'clear'
  message: string
  raised_at: string
  is_active: boolean
}

export interface WazuhAlert {
  id: string
  alert_id: string
  rule_id?: string
  rule_description?: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  agent_name?: string
  triggered_at: string
  acknowledged_by?: string
  acknowledged_at?: string
  notes?: string
}

export interface SocAlert {
  id: string
  alert_type: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  affected_asset: string
  description?: string
  raw_subject?: string
  received_at: string
  status: 'open' | 'acknowledged' | 'resolved'
  acknowledged_by_name?: string
  notes?: string
}

export interface VaptFinding {
  id: string
  finding_id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  category?: string
  affected_asset?: string
  discovery_date?: string
  description?: string
  assigned_to?: string
  assigned_to_name?: string
  status: 'open' | 'in_progress' | 'remediated' | 'accepted_risk' | 'closed'
  target_remediation_date?: string
  actual_remediation_date?: string
  evidence_notes?: string
  assessment_name?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  owner_id?: string
  owner_name?: string
  start_date?: string
  end_date?: string
  tags?: string[]
  task_count?: number
  tasks_done?: number
  milestones?: Milestone[]
  tasks?: Task[]
}

export interface Milestone {
  id: string
  project_id: string
  name: string
  description?: string
  due_date?: string
  status: string
  sort_order: number
}

export interface Task {
  id: string
  project_id: string
  milestone_id?: string
  project_name?: string
  milestone_name?: string
  name: string
  description?: string
  assigned_to?: string
  assigned_to_name?: string
  reported_by?: string
  priority: string
  status: string
  start_date?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  blockers?: string
  tags?: string[]
}

export interface AuditLog {
  id: string
  user_id?: string
  user_name?: string
  username?: string
  action: string
  entity_type?: string
  entity_id?: string
  payload?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface ApiResponse<T> {
  data: T
  total?: number
  limit?: number
  offset?: number
}

export interface PaginationParams {
  limit?: number
  offset?: number
}
