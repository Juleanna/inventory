import apiClient from './client'

export interface EquipmentTemplate {
  id: number
  name: string
  description: string
  category: string
  category_display: string
  manufacturer: string
  model_name: string
  cpu: string
  ram: string
  storage: string
  gpu: string
  operating_system: string
  motherboard: string
  network_adapter: string
  power_supply: string
  default_location: string
  default_status: string
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export const templatesApi = {
  list: () =>
    apiClient.get<EquipmentTemplate[]>('/equipment-templates/').then(r => r.data),
  get: (id: number) =>
    apiClient.get<EquipmentTemplate>(`/equipment-templates/${id}/`).then(r => r.data),
  create: (data: Partial<EquipmentTemplate>) =>
    apiClient.post('/equipment-templates/', data).then(r => r.data),
  update: (id: number, data: Partial<EquipmentTemplate>) =>
    apiClient.patch(`/equipment-templates/${id}/`, data).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/equipment-templates/${id}/`).then(r => r.data),
  createEquipment: (id: number, overrides?: Record<string, unknown>) =>
    apiClient.post(`/equipment-templates/${id}/create-equipment/`, overrides || {}).then(r => r.data),
}
