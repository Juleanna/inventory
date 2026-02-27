import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { softwareApi } from '@/api/software'
import type { Software } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useSoftwareList(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ['software', params],
    queryFn: () => softwareApi.list(params).then((r) => r.data),
  })
}

export function useCreateSoftware() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Software>) => softwareApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software'] })
      toast.success('Програму додано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання програми'))
    },
  })
}

export function useDeleteSoftware() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => softwareApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software'] })
      toast.success('Програму видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення'))
    },
  })
}
