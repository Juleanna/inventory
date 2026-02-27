import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { peripheralsApi } from '@/api/peripherals'
import type { PeripheralDevice } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function usePeripheralsList(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ['peripherals', params],
    queryFn: () => peripheralsApi.list(params).then((r) => r.data),
  })
}

export function useCreatePeripheral() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<PeripheralDevice>) => peripheralsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peripherals'] })
      toast.success('Пристрій додано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання пристрою'))
    },
  })
}

export function useDeletePeripheral() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => peripheralsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peripherals'] })
      toast.success('Пристрій видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення'))
    },
  })
}
