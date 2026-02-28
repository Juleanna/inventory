import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sparePartsApi } from '@/api/spare-parts'
import type { SparePart, Supplier, PurchaseOrder } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useSparePartsAnalytics() {
  return useQuery({
    queryKey: ['spare-parts-analytics'],
    queryFn: () => sparePartsApi.analytics().then((r) => r.data.analytics),
  })
}

export function useSparePartMovements(params?: { page?: number; page_size?: number; spare_part_id?: string }) {
  return useQuery({
    queryKey: ['spare-part-movements', params],
    queryFn: () => sparePartsApi.getMovements(params).then((r) => r.data),
  })
}

export function useCreateMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      spare_part_id: string
      movement_type: string
      quantity: number
      equipment_id?: number
      unit_cost?: string
      reference_number?: string
      notes?: string
    }) => sparePartsApi.createMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-part-movements'] })
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] })
      toast.success('Рух запчастини зареєстровано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка реєстрації руху'))
    },
  })
}

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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання запчастини'))
    },
  })
}

export function useSuppliersList(params?: { page?: number }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => sparePartsApi.listSuppliers(params).then((r) => r.data),
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Supplier>) => sparePartsApi.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Постачальника додано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання постачальника'))
    },
  })
}

export function usePurchaseOrders(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => sparePartsApi.listOrders(params).then((r) => r.data),
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<PurchaseOrder>) => sparePartsApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Замовлення створено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка створення замовлення'))
    },
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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видачі запчастини'))
    },
  })
}
