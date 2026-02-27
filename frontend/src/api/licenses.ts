import apiClient from './client'
import type { License, PaginatedResponse } from '@/types'

export const licensesApi = {
  list: (params?: { page?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<License>>('/licenses/', { params }),

  get: (id: number) =>
    apiClient.get<License>(`/licenses/${id}/`),

  create: (data: Partial<License>) =>
    apiClient.post<License>('/licenses/', data),

  update: (id: number, data: Partial<License>) =>
    apiClient.patch<License>(`/licenses/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/licenses/${id}/`),
}
