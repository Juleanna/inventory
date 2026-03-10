import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { licensesApi } from '@/api/licenses'
import type { License } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useLicensesList(params?: { page?: number; page_size?: number; search?: string }) {
  return useQuery({
    queryKey: ['licenses', params],
    queryFn: () => licensesApi.list(params).then((r) => r.data),
  })
}

export function useCreateLicense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<License>) => licensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] })
      queryClient.invalidateQueries({ queryKey: ['software'] })
      toast.success('Ліцензію додано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання ліцензії'))
    },
  })
}

export function useUpdateLicense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<License> }) =>
      licensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] })
      queryClient.invalidateQueries({ queryKey: ['software'] })
      toast.success('Ліцензію оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення ліцензії'))
    },
  })
}

export function useDeleteLicense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => licensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] })
      queryClient.invalidateQueries({ queryKey: ['software'] })
      toast.success('Ліцензію видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення'))
    },
  })
}
