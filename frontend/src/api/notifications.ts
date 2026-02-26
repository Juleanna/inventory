import apiClient from './client'
import type { Notification, PaginatedResponse } from '@/types'

export const notificationsApi = {
  list: (params?: { page?: number; read?: boolean }) =>
    apiClient.get<PaginatedResponse<Notification>>('/notifications/', { params }),

  markRead: (ids: number[]) =>
    apiClient.post('/notifications/mark-read/', { notification_ids: ids }),

  markAllRead: () =>
    apiClient.post('/notifications/mark-read/', { all: true }),

  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/', { params: { read: false, page_size: 1 } }),
}
