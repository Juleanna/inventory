import { AxiosError } from 'axios'

/**
 * Витягує зрозуміле повідомлення про помилку з відповіді API
 */
export function getApiErrorMessage(error: unknown, fallback = 'Виникла помилка'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data

    if (typeof data === 'string') return data

    if (data) {
      // DRF detail field
      if (data.detail) return String(data.detail)
      // DRF message field
      if (data.message) return String(data.message)
      // DRF non_field_errors
      if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join('. ')
      // Field-level errors (take first one)
      const firstField = Object.keys(data).find(
        (key) => Array.isArray(data[key]) && data[key].length > 0
      )
      if (firstField) {
        const fieldErrors = data[firstField]
        return `${firstField}: ${fieldErrors.join(', ')}`
      }
    }

    // Network / timeout errors
    if (error.code === 'ECONNABORTED') return 'Час очікування відповіді вичерпано'
    if (error.code === 'ERR_NETWORK') return 'Немає з\'єднання з сервером'
    if (error.response?.status === 403) return 'Немає прав доступу'
    if (error.response?.status === 404) return 'Ресурс не знайдено'
    if (error.response?.status === 500) return 'Помилка сервера'
  }

  if (error instanceof Error) return error.message

  return fallback
}
