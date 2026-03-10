import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '@/api/maintenance'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function useMaintenanceRequests(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['maintenance', 'requests', params],
    queryFn: () => maintenanceApi.listRequests(params).then((r) => r.data),
  })
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: maintenanceApi.createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Запит на обслуговування створено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка створення запиту'))
    },
  })
}

export function useMaintenanceSchedules(params?: { page?: number; show_inactive?: boolean }) {
  return useQuery({
    queryKey: ['maintenance', 'schedules', params],
    queryFn: () => maintenanceApi.listSchedules(params).then((r) => r.data),
  })
}

export function useCreateMaintenanceSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: maintenanceApi.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Розклад обслуговування створено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка створення розкладу'))
    },
  })
}

export function useUpdateMaintenanceSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      maintenanceApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Розклад оновлено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення розкладу'))
    },
  })
}

export function useDeleteMaintenanceSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Розклад видалено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка видалення розкладу'))
    },
  })
}

export function useAssignTechnician() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, technicianId }: { requestId: number | string; technicianId: number }) =>
      maintenanceApi.assignTechnician(requestId, technicianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Технічника призначено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка призначення'))
    },
  })
}

export function useTechnicians() {
  return useQuery({
    queryKey: ['maintenance', 'technicians'],
    queryFn: () => maintenanceApi.getTechnicians().then((r) => r.data),
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
    mutationFn: ({ id, notes }: { id: number | string; notes?: string }) =>
      maintenanceApi.completeMaintenance(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Обслуговування завершено')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка завершення'))
    },
  })
}

export function useStartMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => maintenanceApi.startMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Обслуговування розпочато')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Помилка'))
    },
  })
}
