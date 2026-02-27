import apiClient from './client'
import type { User, PaginatedResponse } from '@/types'

export const usersApi = {
  list: (params?: { page?: number; search?: string; department?: string; is_active?: string }) =>
    apiClient.get<PaginatedResponse<User>>('/users/', { params }),
}
