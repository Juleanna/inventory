import apiClient from './client'

export interface SearchResult {
  type: string
  id: number | string
  title: string
  subtitle: string
  url: string
}

export interface SearchResponse {
  results: Record<string, SearchResult[]>
  total: number
}

export const searchApi = {
  search: (q: string) =>
    apiClient.get<SearchResponse>('/search/', { params: { q } }).then(r => r.data),
}
