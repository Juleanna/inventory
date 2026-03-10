import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { peripheralsApi } from '@/api/peripherals'
import type { PeripheralDevice } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function usePeripheralsList(params?: { page?: number; page_size?: number; search?: string; connected_to?: number; type?: string; ordering?: string }) {
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

export function useUpdatePeripheral() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PeripheralDevice> }) =>
      peripheralsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peripherals'] })
      toast.success('Пристрій оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення пристрою'))
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

export function useBulkDeletePeripherals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => peripheralsApi.delete(id))),
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ['peripherals'] })
      toast.success(`Видалено ${ids.length} пристроїв`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка масового видалення'))
    },
  })
}

export function useRegeneratePeripheralCodes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => peripheralsApi.regenerateCodes(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peripherals'] })
      toast.success('QR-код та штрих-код згенеровано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка генерації кодів'))
    },
  })
}
