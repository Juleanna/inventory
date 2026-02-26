import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth-store'
import type { LoginCredentials, RegisterData } from '@/types'
import { toast } from 'sonner'

export function useLogin() {
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: async (response) => {
      setTokens(response.data.access, response.data.refresh)
      try {
        const profileResponse = await authApi.getProfile()
        setUser(profileResponse.data)
      } catch {
        // Profile fetch is optional
      }
      queryClient.clear()
      navigate('/')
      toast.success('Успішний вхід')
    },
    onError: () => {
      toast.error('Невірне ім\'я користувача або пароль')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: () => {
      navigate('/login')
      toast.success('Реєстрація успішна. Увійдіть в систему.')
    },
    onError: () => {
      toast.error('Помилка реєстрації')
    },
  })
}

export function useProfile() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile().then((r) => r.data),
    enabled: isAuthenticated,
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return () => {
    logout()
    queryClient.clear()
    navigate('/login')
    toast.success('Ви вийшли з системи')
  }
}
