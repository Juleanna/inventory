import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { employeesApi } from '@/api/employees'
import type { Employee } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useEmployeesList(params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeesApi.list(params).then((r) => r.data),
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Співробітника додано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання співробітника'))
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Співробітника оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення'))
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Співробітника видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення'))
    },
  })
}
