import apiClient from './client'

export interface ActivityLogEntry {
  id: number
  user: number
  user_name: string
  action_type: string
  action_type_display: string
  target_object_id: number | null
  target_model: string | null
  target_name: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string
  timestamp: string
}

export interface ActivityLogFilters {
  page?: number
  page_size?: number
  user?: number
  action_type?: string
  target_model?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface ActivityLogResponse {
  results: ActivityLogEntry[]
  count: number
  next: string | null
  previous: string | null
}

export const activityLogApi = {
  list: (filters?: ActivityLogFilters) =>
    apiClient.get<ActivityLogResponse>('/activity-log/', { params: filters }).then(r => r.data),
}
