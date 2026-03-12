import apiClient from './client'

export interface WebhookConfig {
  id: number
  name: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_by: number
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: number
  webhook: number
  webhook_name: string
  event: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string
  success: boolean
  sent_at: string
}

export const WEBHOOK_EVENTS = [
  { value: 'equipment.created', label: 'Обладнання створено' },
  { value: 'equipment.updated', label: 'Обладнання оновлено' },
  { value: 'equipment.status_changed', label: 'Статус обладнання змінено' },
  { value: 'maintenance.created', label: 'ТО створено' },
  { value: 'maintenance.completed', label: 'ТО завершено' },
  { value: 'contract.expiring', label: 'Договір закінчується' },
  { value: 'license.expiring', label: 'Ліцензія закінчується' },
]

export const webhooksApi = {
  list: () => apiClient.get<{ results: WebhookConfig[]; count: number }>('/webhooks/'),
  get: (id: number) => apiClient.get<WebhookConfig>(`/webhooks/${id}/`),
  create: (data: Partial<WebhookConfig>) => apiClient.post<WebhookConfig>('/webhooks/', data),
  update: (id: number, data: Partial<WebhookConfig>) => apiClient.patch<WebhookConfig>(`/webhooks/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/webhooks/${id}/`),
  test: (id: number) => apiClient.post(`/webhooks/${id}/test/`),
  logs: (id: number) => apiClient.get<{ results: WebhookLog[] }>(`/webhooks/${id}/logs/`),
}
