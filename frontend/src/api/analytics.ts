import apiClient from './client'
import type { AnalyticsData } from '@/types'

export const analyticsApi = {
  getEquipmentAnalytics: () =>
    apiClient.get<AnalyticsData>('/analytics/equipment/'),

  getFinancialAnalytics: () =>
    apiClient.get('/analytics/financial/'),

  getMaintenanceAnalytics: () =>
    apiClient.get('/analytics/maintenance/'),

  getUserAnalytics: () =>
    apiClient.get('/analytics/user/'),

  generateReport: (params: { type: string; format?: string; date_from?: string; date_to?: string }) =>
    apiClient.get('/reports/', { params }),

  quickReport: () =>
    apiClient.get('/quick-report/'),
}
