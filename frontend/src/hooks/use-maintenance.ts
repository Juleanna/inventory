import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '@/api/maintenance'
import { toast } from 'sonner'

export function useMaintenanceRequests(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['maintenance', 'requests', params],
    queryFn: () => maintenanceApi.listRequests(params).then((r) => r.data),
  })
}

export function useMaintenanceSchedules(params?: { page?: number }) {
  return useQuery({
    queryKey: ['maintenance', 'schedules', params],
    queryFn: () => maintenanceApi.listSchedules(params).then((r) => r.data),
  })
}

export function useMaintenanceDashboard() {
  return useQuery({
    queryKey: ['maintenance', 'dashboard'],
    queryFn: () => maintenanceApi.getDashboard().then((r) => r.data),
  })
}

export function useCompleteMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      maintenanceApi.completeMaintenance(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Обслуговування завершено')
    },
    onError: () => {
      toast.error('Помилка завершення обслуговування')
    },
  })
}

export function useStartMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.startMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Обслуговування розпочато')
    },
  })
}
