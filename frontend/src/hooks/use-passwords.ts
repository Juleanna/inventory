import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { passwordsApi } from '@/api/passwords'
import type { PasswordSystem, PasswordAccount } from '@/types'
import { toast } from 'sonner'

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
