import apiClient from './client'
import type { DashboardStats } from '@/types'

export const dashboardApi = {
  getStats: () =>
    apiClient.get<DashboardStats>('/dashboard/'),

  getPersonalized: () =>
    apiClient.get('/personalized-dashboard/'),
}
