import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const tokens = localStorage.getItem('auth-storage')
  if (tokens) {
    try {
      const parsed = JSON.parse(tokens)
      const accessToken = parsed?.state?.accessToken
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    } catch {
      // ignore parse errors
    }
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token!)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const tokens = localStorage.getItem('auth-storage')
        if (!tokens) throw new Error('No tokens')

        const parsed = JSON.parse(tokens)
        const refreshToken = parsed?.state?.refreshToken

        if (!refreshToken) throw new Error('No refresh token')

        const response = await axios.post('/api/token/refresh/', {
          refresh: refreshToken,
        })

        const newAccessToken = response.data.access
        const newRefreshToken = response.data.refresh || refreshToken

        // Update store
        parsed.state.accessToken = newAccessToken
        parsed.state.refreshToken = newRefreshToken
        localStorage.setItem('auth-storage', JSON.stringify(parsed))

        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
