import apiClient from './client'
import type { SparePart, Supplier, PurchaseOrder, SparePartCategory, PaginatedResponse } from '@/types'

export const sparePartsApi = {
  listParts: (params?: { page?: number; search?: string; category?: number }) =>
    apiClient.get<PaginatedResponse<SparePart>>('/spare-parts/', { params }),

  getPart: (id: number) =>
    apiClient.get<SparePart>(`/spare-parts/${id}/`),

  createPart: (data: Partial<SparePart>) =>
    apiClient.post<SparePart>('/spare-parts/', data),

  updatePart: (id: number, data: Partial<SparePart>) =>
    apiClient.patch<SparePart>(`/spare-parts/${id}/`, data),

  deletePart: (id: number) =>
    apiClient.delete(`/spare-parts/${id}/`),

  issuePart: (partId: number, data: { quantity: number; equipment_id?: number; notes?: string }) =>
    apiClient.post(`/spare-parts/issue/${partId}/`, data),

  receivePart: (partId: number, data: { quantity: number; notes?: string }) =>
    apiClient.post(`/spare-parts/receive/${partId}/`, data),

  listCategories: () =>
    apiClient.get<PaginatedResponse<SparePartCategory>>('/spare-part-categories/'),

  listSuppliers: (params?: { page?: number }) =>
    apiClient.get<PaginatedResponse<Supplier>>('/suppliers/', { params }),

  getSupplier: (id: number) =>
    apiClient.get<Supplier>(`/suppliers/${id}/`),

  createSupplier: (data: Partial<Supplier>) =>
    apiClient.post<Supplier>('/suppliers/', data),

  updateSupplier: (id: number, data: Partial<Supplier>) =>
    apiClient.patch<Supplier>(`/suppliers/${id}/`, data),

  listOrders: (params?: { page?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders/', { params }),

  getOrder: (id: number) =>
    apiClient.get<PurchaseOrder>(`/purchase-orders/${id}/`),

  createOrder: (data: Partial<PurchaseOrder>) =>
    apiClient.post<PurchaseOrder>('/spare-parts/create-purchase-order/', data),

  analytics: () =>
    apiClient.get('/spare-parts/analytics/'),
}
