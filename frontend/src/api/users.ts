import apiClient from './client'
import type { User, PaginatedResponse } from '@/types'

export interface UserFilters {
  page?: number
  search?: string
  department?: string
  is_active?: string
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
}
