import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { passwordsApi } from '@/api/passwords'
import type { PasswordSystem, PasswordAccount } from '@/types'
import { toast } from 'sonner'

export function usePasswordAuditLogs(params?: { page?: number; action?: string }) {
  return useQuery({
    queryKey: ['password-audit-logs', params],
    queryFn: () => passwordsApi.listAuditLogs(params).then((r) => r.data),
  })
}

export function usePasswordSystems(params?: { page?: number; search?: string; category?: number }) {
  return useQuery({
    queryKey: ['password-systems', params],
    queryFn: () => passwordsApi.listSystems(params).then((r) => r.data),
  })
}

export function usePasswordAccounts(params?: { page?: number; system?: number }) {
  return useQuery({
    queryKey: ['password-accounts', params],
    queryFn: () => passwordsApi.listAccounts(params).then((r) => r.data),
  })
}

export function useCreatePasswordSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<PasswordSystem>) => passwordsApi.createSystem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-systems'] })
      toast.success('Систему додано')
    },
    onError: () => {
      toast.error('Помилка додавання системи')
    },
  })
}

export function useCreatePasswordAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<PasswordAccount>) => passwordsApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-accounts'] })
      toast.success('Обліковий запис додано')
    },
    onError: () => {
      toast.error('Помилка додавання облікового запису')
    },
  })
}

export function useUpdatePasswordSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PasswordSystem> }) =>
      passwordsApi.updateSystem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-systems'] })
      toast.success('Систему оновлено')
    },
    onError: () => {
      toast.error('Помилка оновлення системи')
    },
  })
}

export function useDeletePasswordSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => passwordsApi.deleteSystem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-systems'] })
      toast.success('Систему видалено')
    },
    onError: () => {
      toast.error('Помилка видалення системи')
    },
  })
}

export function useUpdatePasswordAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PasswordAccount> }) =>
      passwordsApi.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-accounts'] })
      toast.success('Обліковий запис оновлено')
    },
    onError: () => {
      toast.error('Помилка оновлення облікового запису')
    },
  })
}

export function useDeletePasswordAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => passwordsApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-accounts'] })
      toast.success('Обліковий запис видалено')
    },
  })
}
