import apiClient from './client'
import type { MaintenanceRequest, PaginatedResponse } from '@/types'

export const maintenanceApi = {
  // Запити на ТО (через роутер ViewSet)
  listRequests: (params?: { page?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<MaintenanceRequest>>('/maintenance/requests/', { params }),

  createRequest: (data: Record<string, unknown>) =>
    apiClient.post<MaintenanceRequest>('/maintenance/requests/', data),

  // Розклади
  listSchedules: (params?: { page?: number }) =>
    apiClient.get('/maintenance/schedules/', { params }),

  createSchedule: (data: Record<string, unknown>) =>
    apiClient.post('/maintenance/schedules/', data),

  // Дії
  startMaintenance: (requestId: number | string) =>
    apiClient.post('/maintenance/start/', { request_id: requestId }),

  completeMaintenance: (requestId: number | string, notes?: string) =>
    apiClient.post('/maintenance/complete/', { request_id: requestId, notes }),

  assignTechnician: (requestId: number | string, technicianId: number) =>
    apiClient.post('/maintenance/assign-technician/', { request_id: requestId, technician_id: technicianId }),

  getTechnicians: () =>
    apiClient.get('/maintenance/technicians/'),

  getDashboard: () =>
    apiClient.get('/maintenance/dashboard/'),
}
