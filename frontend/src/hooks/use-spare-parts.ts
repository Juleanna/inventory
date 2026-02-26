import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sparePartsApi } from '@/api/spare-parts'
import type { SparePart } from '@/types'
import { toast } from 'sonner'

export function useSparePartsList(params?: { page?: number; search?: string; category?: number }) {
  return useQuery({
    queryKey: ['spare-parts', params],
    queryFn: () => sparePartsApi.listParts(params).then((r) => r.data),
  })
}

export function useCreateSparePart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<SparePart>) => sparePartsApi.createPart(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] })
      toast.success('Запчастину додано')
    },
    onError: () => {
      toast.error('Помилка додавання запчастини')
    },
  })
}

export function useSuppliersList(params?: { page?: number }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => sparePartsApi.listSuppliers(params).then((r) => r.data),
  })
}

export function usePurchaseOrders(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => sparePartsApi.listOrders(params).then((r) => r.data),
  })
}

export function useIssueSparePart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ partId, data }: { partId: number; data: { quantity: number; equipment_id?: number; notes?: string } }) =>
      sparePartsApi.issuePart(partId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] })
      toast.success('Запчастину видано')
    },
    onError: () => {
      toast.error('Помилка видачі запчастини')
    },
  })
}
