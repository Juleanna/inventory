import apiClient from './client'
import type { DashboardData } from '@/types'

export const dashboardApi = {
  getStats: () =>
    apiClient.get<DashboardData>('/dashboard/'),

  getPersonalized: () =>
    apiClient.get('/personalized-dashboard/'),
}
