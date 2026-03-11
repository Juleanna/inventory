import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi, type ContractFilters } from '@/api/contracts'
import { toast } from 'sonner'

export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractsApi.list(filters),
  })
}

export function useContract(id: number) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FormData) => contractsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); toast.success('Договір створено') },
    onError: () => toast.error('Помилка створення договору'),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => contractsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); toast.success('Договір оновлено') },
    onError: () => toast.error('Помилка оновлення'),
  })
}

export function useDeleteContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contractsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); toast.success('Договір видалено') },
    onError: () => toast.error('Помилка видалення'),
  })
}
