import apiClient from './client'
import type { AuthTokens, LoginCredentials, RegisterData, User } from '@/types'

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthTokens>('/login/', credentials),

  register: (data: RegisterData) =>
    apiClient.post('/register/', data),

  refreshToken: (refresh: string) =>
    apiClient.post<{ access: string; refresh?: string }>('/token/refresh/', { refresh }),

  getProfile: () =>
    apiClient.get<User>('/profile/'),

  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>('/profile/', data),

  setup2FA: () =>
    apiClient.post<{ qr_code: string; secret: string }>('/auth/2fa-setup/'),

  verify2FA: (token: string) =>
    apiClient.post<{ success: boolean }>('/auth/2fa/', { token }),

  get2FAStatus: () =>
    apiClient.get<{ enabled: boolean }>('/auth/2fa-status/'),
}
