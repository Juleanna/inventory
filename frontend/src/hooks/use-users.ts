import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/api/users'

export function useUsersList(params?: { page?: number; search?: string; department?: string; is_active?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params).then((r) => r.data),
  })
}
