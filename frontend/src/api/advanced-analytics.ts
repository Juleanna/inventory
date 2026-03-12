import apiClient from './client'

export interface AgeDistribution {
  age: string
  label: string
  count: number
}

export interface MonthlyAcquisition {
  month: string
  count: number
  total_cost: number
}

export interface CostByCategory {
  category: string
  total_cost: number
  count: number
  avg_cost: number
}

export interface LifecycleForecast {
  month: string
  expiring: number
  warranty_ending: number
}

export interface MaintenanceHeatmapRow {
  category: string
  months: Array<{ month: string; count: number }>
}

export interface CostForecast {
  month: string
  predicted_cost: number
}

export interface AdvancedAnalyticsData {
  age_distribution: AgeDistribution[]
  monthly_acquisitions: MonthlyAcquisition[]
  cost_by_category: CostByCategory[]
  lifecycle_forecast: LifecycleForecast[]
  maintenance_heatmap: MaintenanceHeatmapRow[]
  cost_forecast: CostForecast[]
  summary: {
    avg_monthly_cost: number
    total_active_equipment: number
    equipment_over_5_years: number
  }
  generated_at: string
}

export const advancedAnalyticsApi = {
  get: () => apiClient.get<AdvancedAnalyticsData>('/analytics/advanced/'),
}
