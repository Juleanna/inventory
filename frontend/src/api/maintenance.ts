import apiClient from './client'
import type { MaintenanceRequest, MaintenanceSchedule, PaginatedResponse } from '@/types'

export const maintenanceApi = {
  listRequests: (params?: { page?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<MaintenanceRequest>>('/maintenance/requests/', { params }),

  getRequest: (id: number) =>
    apiClient.get<MaintenanceRequest>(`/maintenance/requests/${id}/`),

  createRequest: (data: Partial<MaintenanceRequest>) =>
    apiClient.post<MaintenanceRequest>('/maintenance/create-scheduled/', data),

  assignTechnician: (requestId: number, technicianId: number) =>
    apiClient.post(`/maintenance/assign-technician/${requestId}/`, { technician_id: technicianId }),

  startMaintenance: (requestId: number) =>
    apiClient.post(`/maintenance/start/${requestId}/`),

  completeMaintenance: (requestId: number, notes?: string) =>
    apiClient.post(`/maintenance/complete/${requestId}/`, { notes }),

  listSchedules: (params?: { page?: number }) =>
    apiClient.get<PaginatedResponse<MaintenanceSchedule>>('/maintenance/schedule/', { params }),

  getTechnicians: () =>
    apiClient.get('/maintenance/technicians/'),

  getDashboard: () =>
    apiClient.get('/maintenance/dashboard/'),
}
