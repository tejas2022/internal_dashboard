import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle token expiry — attempt silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const res = await axios.post('/api/v1/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefresh } = res.data

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefresh)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  getMe: () => api.get('/auth/me'),
}

// Users
export const usersApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
  getManagers: () => api.get('/users/managers'),
}

// Applications
export const applicationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/applications', { params }),
  mine: () => api.get('/applications/mine'),
  get: (id: string) => api.get(`/applications/${id}`),
  create: (data: Record<string, unknown>) => api.post('/applications', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/applications/${id}`, data),
  deactivate: (id: string) => api.delete(`/applications/${id}`),
}

// Checklists
export const checklistsApi = {
  templates: (params?: Record<string, unknown>) => api.get('/checklists/templates', { params }),
  today: () => api.get('/checklists/today'),
  health: () => api.get('/checklists/health'),
  list: (params?: Record<string, unknown>) => api.get('/checklists', { params }),
  get: (id: string) => api.get(`/checklists/${id}`),
  submit: (data: Record<string, unknown>) => api.post('/checklists', data),
}

// Network
export const networkApi = {
  summary: () => api.get('/network/summary'),
  devices: () => api.get('/network/devices'),
  deviceHistory: (deviceId: string) => api.get(`/network/devices/${deviceId}/history`),
  alarms: (params?: Record<string, unknown>) => api.get('/network/alarms', { params }),
  uptime: () => api.get('/network/uptime'),
  widgets: () => api.get('/network/widgets'),
}

// Security
export const securityApi = {
  summary: () => api.get('/security/summary'),
  wazuhDashboard: () => api.get('/security/wazuh/dashboard'),
  wazuhAlerts: (params?: Record<string, unknown>) => api.get('/security/wazuh/alerts', { params }),
  wazuhSummary: () => api.get('/security/wazuh/summary'),
  acknowledgeWazuh: (id: string, notes?: string) =>
    api.patch(`/security/wazuh/alerts/${id}/acknowledge`, { notes }),
  socAlerts: (params?: Record<string, unknown>) => api.get('/security/soc/alerts', { params }),
  updateSocAlert: (id: string, data: Record<string, unknown>) =>
    api.patch(`/security/soc/alerts/${id}`, data),
}

// VAPT
export const vaptApi = {
  assessments: () => api.get('/vapt/assessments'),
  createAssessment: (data: Record<string, unknown>) => api.post('/vapt/assessments', data),
  summary: () => api.get('/vapt/summary'),
  ageing: () => api.get('/vapt/ageing'),
  list: (params?: Record<string, unknown>) => api.get('/vapt', { params }),
  get: (id: string) => api.get(`/vapt/${id}`),
  create: (data: Record<string, unknown>) => api.post('/vapt', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/vapt/${id}`, data),
}

// Projects
export const projectsApi = {
  list: (params?: Record<string, unknown>) => api.get('/projects', { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}`, data),
  gantt: () => api.get('/projects/gantt'),
  workload: () => api.get('/projects/workload'),
  deadlines: (days?: number) => api.get('/projects/deadlines', { params: { days } }),
  createMilestone: (projectId: string, data: Record<string, unknown>) =>
    api.post(`/projects/${projectId}/milestones`, data),
  updateMilestone: (id: string, data: Record<string, unknown>) =>
    api.patch(`/projects/milestones/${id}`, data),
  tasks: (params?: Record<string, unknown>) => api.get('/projects/tasks/list', { params }),
  getTask: (id: string) => api.get(`/projects/tasks/${id}`),
  createTask: (data: Record<string, unknown>) => api.post('/projects/tasks', data),
  updateTask: (id: string, data: Record<string, unknown>) =>
    api.patch(`/projects/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/projects/tasks/${id}`),
}

// Dashboard
export const dashboardApi = {
  cio: () => api.get('/dashboard/summary'),
  trends: () => api.get('/dashboard/trends'),
  stakeholder: (params?: Record<string, unknown>) => api.get('/dashboard/stakeholder', { params }),
}

// Audit
export const auditApi = {
  logs: (params?: Record<string, unknown>) => api.get('/audit/logs', { params }),
}

// Infra BOD Checklists
export const infraChecklistsApi = {
  categories: () => api.get('/infra-checklists/categories'),
  myCategories: () => api.get('/infra-checklists/my-categories'),
  assign: (categoryId: string, managerUserId: string | null) =>
    api.patch(`/infra-checklists/categories/${categoryId}/assign`, { manager_user_id: managerUserId }),
  templates: (params?: Record<string, unknown>) => api.get('/infra-checklists/templates', { params }),
  today: () => api.get('/infra-checklists/today'),
  list: (params?: Record<string, unknown>) => api.get('/infra-checklists', { params }),
  get: (id: string) => api.get(`/infra-checklists/${id}`),
  submit: (data: Record<string, unknown>) => api.post('/infra-checklists', data),
}
