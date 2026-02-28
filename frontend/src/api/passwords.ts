import apiClient from './client'
import type { PasswordSystem, PasswordCategory, PasswordAccount, PasswordAuditLog, PaginatedResponse } from '@/types'

export const passwordsApi = {
  listSystems: (params?: { page?: number; search?: string; category?: number }) =>
    apiClient.get<PaginatedResponse<PasswordSystem>>('/password-systems/', { params }),

  getSystem: (id: number) =>
    apiClient.get<PasswordSystem>(`/password-systems/${id}/`),

  createSystem: (data: Partial<PasswordSystem>) =>
    apiClient.post<PasswordSystem>('/password-systems/', data),

  updateSystem: (id: number, data: Partial<PasswordSystem>) =>
    apiClient.patch<PasswordSystem>(`/password-systems/${id}/`, data),

  deleteSystem: (id: number) =>
    apiClient.delete(`/password-systems/${id}/`),

  listCategories: () =>
    apiClient.get<PaginatedResponse<PasswordCategory>>('/password-categories/'),

  listAccounts: (params?: { page?: number; system?: number }) =>
    apiClient.get<PaginatedResponse<PasswordAccount>>('/password-accounts/', { params }),

  getAccount: (id: number) =>
    apiClient.get<PasswordAccount>(`/password-accounts/${id}/`),

  createAccount: (data: Partial<PasswordAccount>) =>
    apiClient.post<PasswordAccount>('/password-accounts/', data),

  updateAccount: (id: number, data: Partial<PasswordAccount>) =>
    apiClient.patch<PasswordAccount>(`/password-accounts/${id}/`, data),

  deleteAccount: (id: number) =>
    apiClient.delete(`/password-accounts/${id}/`),

  getDecryptedPassword: (accountId: number) =>
    apiClient.post<{ password: string }>(`/password-accounts/${accountId}/get_password/`),

  listAuditLogs: (params?: { page?: number; action?: string; user?: number }) =>
    apiClient.get<PaginatedResponse<PasswordAuditLog>>('/password-logs/', { params }),

  myActivity: () =>
    apiClient.get<PasswordAuditLog[]>('/password-logs/my_activity/'),
}
