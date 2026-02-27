import apiClient from './client'
import type { Equipment, PaginatedResponse } from '@/types'

export interface EquipmentFilters {
  page?: number
  page_size?: number
  search?: string
  category?: string
  status?: string
  location?: string
  purchase_date_after?: string
  purchase_date_before?: string
  ordering?: string
}

export const equipmentApi = {
  list: (filters?: EquipmentFilters) =>
    apiClient.get<PaginatedResponse<Equipment>>('/equipment/', { params: filters }),

  get: (id: number) =>
    apiClient.get<Equipment>(`/equipment/${id}/`),

  create: (data: Partial<Equipment>) =>
    apiClient.post<Equipment>('/equipment/', data),

  update: (id: number, data: Partial<Equipment>) =>
    apiClient.patch<Equipment>(`/equipment/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/equipment/${id}/`),

  exportCSV: (filters?: EquipmentFilters) =>
    apiClient.get('/export/', { params: { ...filters, format: 'csv' }, responseType: 'blob' }),

  exportExcel: (filters?: EquipmentFilters) =>
    apiClient.get('/export/', { params: { ...filters, format: 'xlsx' }, responseType: 'blob' }),

  regenerateCodes: (id: number) =>
    apiClient.post<Equipment>(`/equipment/${id}/regenerate-codes/`),
}
