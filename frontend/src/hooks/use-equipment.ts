import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipmentApi, type EquipmentFilters } from '@/api/equipment'
import type { Equipment } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useEquipmentList(filters?: EquipmentFilters) {
  return useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => equipmentApi.list(filters).then((r) => r.data),
  })
}

export function useEquipment(id: number) {
  return useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.get(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Equipment>) => equipmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Обладнання додано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання обладнання'))
    },
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Equipment> }) =>
      equipmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Обладнання оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення обладнання'))
    },
  })
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => equipmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Обладнання видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення обладнання'))
    },
  })
}

export function useRegenerateCodes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => equipmentApi.regenerateCodes(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('QR-код та штрих-код згенеровано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка генерації кодів'))
    },
  })
}
