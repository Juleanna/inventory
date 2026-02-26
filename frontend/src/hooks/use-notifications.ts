import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useAuthStore } from '@/stores/auth-store'

export function useNotifications(params?: { page?: number; read?: boolean }) {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.list(params).then((r) => r.data),
    enabled: isAuthenticated,
  })
}

export function useUnreadCount() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      notificationsApi.list({ read: false }).then((r) => r.data.count),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => notificationsApi.markRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
