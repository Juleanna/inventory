import apiClient from './client'
import type { Software, PaginatedResponse } from '@/types'

export const softwareApi = {
  list: (params?: { page?: number; search?: string; installed_on?: number }) =>
    apiClient.get<PaginatedResponse<Software>>('/software/', { params }),

  get: (id: number) =>
    apiClient.get<Software>(`/software/${id}/`),

  create: (data: Partial<Software>) =>
    apiClient.post<Software>('/software/', data),

  update: (id: number, data: Partial<Software>) =>
    apiClient.patch<Software>(`/software/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/software/${id}/`),
}
