import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipmentApi, type EquipmentFilters } from '@/api/equipment'
import { peripheralsApi } from '@/api/peripherals'
import { softwareApi } from '@/api/software'
import type { Equipment } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useEquipmentPeripherals(equipmentId: number) {
  return useQuery({
    queryKey: ['peripherals', { connected_to: equipmentId }],
    queryFn: () => peripheralsApi.list({ connected_to: equipmentId }).then((r) => r.data),
    enabled: !!equipmentId,
  })
}

export function useEquipmentSoftware(equipmentId: number) {
  return useQuery({
    queryKey: ['software', { installed_on: equipmentId }],
    queryFn: () => softwareApi.list({ installed_on: equipmentId }).then((r) => r.data),
    enabled: !!equipmentId,
  })
}

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

export function useEquipmentHistory(equipmentId: number) {
  return useQuery({
    queryKey: ['equipment', equipmentId, 'history'],
    queryFn: () => equipmentApi.getHistory(equipmentId).then((r) => r.data),
    enabled: !!equipmentId,
  })
}

export function useEquipmentDocuments(equipmentId: number) {
  return useQuery({
    queryKey: ['equipment', equipmentId, 'documents'],
    queryFn: () => equipmentApi.listDocuments(equipmentId).then((r) => r.data),
    enabled: !!equipmentId,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ equipmentId, formData }: { equipmentId: number; formData: FormData }) =>
      equipmentApi.uploadDocument(equipmentId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Документ завантажено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка завантаження документу'))
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ equipmentId, docId }: { equipmentId: number; docId: number }) =>
      equipmentApi.deleteDocument(equipmentId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Документ видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення документу'))
    },
  })
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      equipmentApi.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Статус оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка масового оновлення'))
    },
  })
}

export function useBulkDelete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => equipmentApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Обладнання видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка масового видалення'))
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
