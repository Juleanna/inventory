import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sparePartsApi } from '@/api/spare-parts'
import type { SparePart, Supplier, Counterparty, PurchaseOrder } from '@/types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useStorageLocations() {
  return useQuery({
    queryKey: ['storage-locations'],
    queryFn: () => sparePartsApi.listStorageLocations().then((r) => r.data.results),
  })
}

export function useCreateStorageLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      sparePartsApi.createStorageLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] })
      toast.success('Місце зберігання створено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}

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

export function useSparePart(id: string) {
  return useQuery({
    queryKey: ['spare-parts', id],
    queryFn: () => sparePartsApi.getPart(Number(id)).then((r) => r.data),
    enabled: !!id,
  })
}

export function useSparePartsList(params?: { page?: number; page_size?: number; search?: string; category?: number; item_type?: string }) {
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

export function useSuppliersList(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => sparePartsApi.listSuppliers(params).then((r) => r.data),
  })
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: () => sparePartsApi.getSupplier(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useSupplierParts(supplierId: number) {
  return useQuery({
    queryKey: ['spare-parts', { primary_supplier: supplierId }],
    queryFn: () => sparePartsApi.listParts({ primary_supplier: supplierId }).then((r) => r.data),
    enabled: !!supplierId,
  })
}

export function useSupplierOrders(supplierId: number) {
  return useQuery({
    queryKey: ['purchase-orders', { supplier_id: supplierId }],
    queryFn: () => sparePartsApi.listOrders({ supplier_id: supplierId }).then((r) => r.data),
    enabled: !!supplierId,
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

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PurchaseOrder> }) =>
      sparePartsApi.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Замовлення оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення замовлення'))
    },
  })
}

export function useUpdateSparePart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SparePart> }) =>
      sparePartsApi.updatePart(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] })
      toast.success('Запчастину оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення запчастини'))
    },
  })
}

export function useDeleteSparePart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => sparePartsApi.deletePart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] })
      toast.success('Запчастину видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення запчастини'))
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Supplier> }) =>
      sparePartsApi.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Постачальника оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення постачальника'))
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => sparePartsApi.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Постачальника видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення постачальника'))
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

// === Контрагенти ===

export function useCounterpartiesList(params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ['counterparties', params],
    queryFn: () => sparePartsApi.listCounterparties(params).then((r) => r.data),
  })
}

export function useCounterparty(id: number) {
  return useQuery({
    queryKey: ['counterparty', id],
    queryFn: () => sparePartsApi.getCounterparty(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateCounterparty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Counterparty>) => sparePartsApi.createCounterparty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      toast.success('Контрагента додано')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка додавання контрагента'))
    },
  })
}

export function useUpdateCounterparty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Counterparty> }) =>
      sparePartsApi.updateCounterparty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      toast.success('Контрагента оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення контрагента'))
    },
  })
}

export function useDeleteCounterparty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => sparePartsApi.deleteCounterparty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      toast.success('Контрагента видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення контрагента'))
    },
  })
}
