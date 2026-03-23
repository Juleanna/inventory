import apiClient from './client'
import type { Employee, PaginatedResponse } from '@/types'

export const employeesApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) =>
    apiClient.get<PaginatedResponse<Employee>>('/employees/', { params }),

  get: (id: number) =>
    apiClient.get<Employee>(`/employees/${id}/`),

  create: (data: Partial<Employee>) =>
    apiClient.post<Employee>('/employees/', data),

  update: (id: number, data: Partial<Employee>) =>
    apiClient.patch<Employee>(`/employees/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/employees/${id}/`),
}
