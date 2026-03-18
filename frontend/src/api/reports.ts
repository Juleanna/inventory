import apiClient from './client'

export interface DepreciationItem {
  id: number
  name: string
  category: string
  purchase_date: string
  purchase_price: number
  depreciation_rate: number
  age_years: number
  accumulated_depreciation: number
  book_value: number
  monthly_depreciation: number
}

export interface DepreciationReport {
  items: DepreciationItem[]
  summary: {
    total_purchase_value: number
    total_book_value: number
    total_depreciation: number
    avg_depreciation_rate: number
  }
  by_category: Array<{ category: string; purchase_value: number; book_value: number; depreciation: number }>
  by_location: Array<{ location: string; purchase_value: number; book_value: number; count: number }>
}

export const reportsApi = {
  depreciation: () =>
    apiClient.get<DepreciationReport>('/reports/depreciation/').then(r => r.data),
  exportReport: (type: string, format: string, filters?: Record<string, string>) =>
    apiClient.get('/export/report/', { params: { type, export_format: format, ...filters }, responseType: 'blob' }).then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    }),
}
