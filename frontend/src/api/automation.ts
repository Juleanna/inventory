import apiClient from './client'

export interface AutomationRule {
  id: number
  name: string
  description: string
  trigger_type: string
  conditions: Record<string, unknown>
  actions: Array<{ type: string; params: Record<string, unknown> }>
  active: boolean
  last_run: string | null
  run_count: number
  created_by: number
  created_at: string
  updated_at: string
}

export const TRIGGER_TYPES = [
  { value: 'EQUIPMENT_AGE', label: 'Вік обладнання' },
  { value: 'WARRANTY_EXPIRY', label: 'Закінчення гарантії' },
  { value: 'MAINTENANCE_OVERDUE', label: 'Прострочене ТО' },
  { value: 'STATUS_CHANGE', label: 'Зміна статусу' },
  { value: 'COST_THRESHOLD', label: 'Поріг вартості' },
]

export const ACTION_TYPES = [
  { value: 'CHANGE_STATUS', label: 'Змінити статус' },
  { value: 'SEND_NOTIFICATION', label: 'Надіслати сповіщення' },
  { value: 'SEND_WEBHOOK', label: 'Надіслати webhook' },
  { value: 'CREATE_MAINTENANCE', label: 'Створити запит на ТО' },
  { value: 'SEND_EMAIL', label: 'Надіслати email' },
]

export const automationApi = {
  list: () => apiClient.get<{ results: AutomationRule[]; count: number }>('/automation-rules/'),
  get: (id: number) => apiClient.get<AutomationRule>(`/automation-rules/${id}/`),
  create: (data: Partial<AutomationRule>) => apiClient.post<AutomationRule>('/automation-rules/', data),
  update: (id: number, data: Partial<AutomationRule>) => apiClient.patch<AutomationRule>(`/automation-rules/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/automation-rules/${id}/`),
  run: (id: number) => apiClient.post(`/automation-rules/${id}/run/`),
  runAll: () => apiClient.post('/automation-rules/run-all/'),
}
