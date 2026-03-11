import apiClient from './client'

export interface Contract {
  id: number
  title: string
  contract_number: string
  contract_type: string
  contract_type_display: string
  status: string
  status_display: string
  counterparty: string
  description: string
  start_date: string
  end_date: string | null
  amount: string | null
  file: string | null
  equipment: number[]
  responsible_person: number | null
  responsible_person_name: string
  auto_renew: boolean
  reminder_days: number
  created_at: string
  updated_at: string
}

export interface ContractFilters {
  page?: number
  page_size?: number
  contract_type?: string
  status?: string
  search?: string
}

export const contractsApi = {
  list: (filters?: ContractFilters) =>
    apiClient.get('/contracts/', { params: filters }).then(r => r.data),
  get: (id: number) =>
    apiClient.get<Contract>(`/contracts/${id}/`).then(r => r.data),
  create: (data: FormData) =>
    apiClient.post('/contracts/', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  update: (id: number, data: FormData) =>
    apiClient.patch(`/contracts/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/contracts/${id}/`).then(r => r.data),
}
