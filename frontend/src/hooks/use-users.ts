import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type UserFilters } from '@/api/users'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useUsersList(params?: UserFilters) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params).then((r) => r.data),
  })
}

export function useUsersStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => usersApi.stats().then((r) => r.data),
  })
}

export function useUserEquipment(userId: number | null) {
  return useQuery({
    queryKey: ['users', userId, 'equipment'],
    queryFn: () => usersApi.equipment(userId!).then((r) => r.data.results),
    enabled: userId !== null,
  })
}

export function useUserHistory(userId: number | null) {
  return useQuery({
    queryKey: ['users', userId, 'history'],
    queryFn: () => usersApi.history(userId!).then((r) => r.data.results),
    enabled: userId !== null,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Користувача створено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка створення користувача'))
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Користувача оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення користувача'))
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Користувача деактивовано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка деактивації користувача'))
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Користувача видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення користувача'))
    },
  })
}

export function useBulkUserAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: number[] }) =>
      usersApi.bulkAction(action, ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const labels: Record<string, string> = {
        deactivate: 'Деактивовано',
        activate: 'Активовано',
        delete: 'Видалено',
      }
      toast.success(`${labels[variables.action] || 'Виконано'} ${variables.ids.length} користувачів`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка масової дії'))
    },
  })
}

export function useImportUsers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (users: Record<string, string>[]) => usersApi.import(users),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const d = response.data
      toast.success(`Імпортовано ${d.created} з ${d.total} користувачів`)
      if (d.errors.length > 0) {
        toast.warning(`Помилки: ${d.errors.slice(0, 3).join('; ')}`)
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка імпорту'))
    },
  })
}
