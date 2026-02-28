import apiClient from './client'
import type { PeripheralDevice, PaginatedResponse } from '@/types'

export const peripheralsApi = {
  list: (params?: { page?: number; search?: string; connected_to?: number }) =>
    apiClient.get<PaginatedResponse<PeripheralDevice>>('/peripherals/', { params }),

  get: (id: number) =>
    apiClient.get<PeripheralDevice>(`/peripherals/${id}/`),

  create: (data: Partial<PeripheralDevice>) =>
    apiClient.post<PeripheralDevice>('/peripherals/', data),

  update: (id: number, data: Partial<PeripheralDevice>) =>
    apiClient.patch<PeripheralDevice>(`/peripherals/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/peripherals/${id}/`),
}
