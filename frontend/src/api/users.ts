import apiClient from './client'
import type { User, PaginatedResponse } from '@/types'

export interface UserFilters {
  page?: number
  search?: string
  department?: string
  position?: string
  is_active?: string
  employment_type?: string
  ordering?: string
}

export interface UsersStats {
  total: number
  active: number
  inactive: number
  new_this_month: number
  without_equipment: number
  by_department: Array<{ department: string; count: number }>
  by_position: Array<{ position: string; count: number }>
  by_employment: Array<{ employment_type: string; count: number }>
}

export interface UserEquipment {
  id: number
  name: string
  category: string
  status: string
  serial_number: string
  inventory_number: string
  location: string
}

export interface UserHistoryRecord {
  date: string
  user: string | null
  type: string
  changes: Array<{ field: string; old: string | null; new: string | null }>
}

export const usersApi = {
  list: (params?: UserFilters) =>
    apiClient.get<PaginatedResponse<User>>('/users/', { params }),

  get: (id: number) =>
    apiClient.get<User>(`/users/${id}/`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<User>('/users/create/', data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient.patch<User>(`/users/${id}/`, data),

  deactivate: (id: number) =>
    apiClient.delete(`/users/${id}/`),

  delete: (id: number) =>
    apiClient.delete(`/users/${id}/`, { params: { permanent: 'true' } }),

  bulkAction: (action: string, ids: number[]) =>
    apiClient.post('/users/bulk-action/', { action, ids }),

  stats: () =>
    apiClient.get<UsersStats>('/users/stats/'),

  equipment: (userId: number) =>
    apiClient.get<{ results: UserEquipment[] }>(`/users/${userId}/equipment/`),

  history: (userId: number) =>
    apiClient.get<{ results: UserHistoryRecord[] }>(`/users/${userId}/history/`),

  import: (users: Record<string, string>[]) =>
    apiClient.post<{ created: number; errors: string[]; total: number }>('/users/import/', { users }),
}
