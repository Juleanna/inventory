import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import type { User } from '@/types'

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
  })

  it('should start unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
  })

  it('should set tokens and authenticate', () => {
    useAuthStore.getState().setTokens('access-token', 'refresh-token')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.accessToken).toBe('access-token')
    expect(state.refreshToken).toBe('refresh-token')
  })

  it('should set user', () => {
    const user = { id: 1, username: 'testuser', email: 'test@test.com', first_name: 'Test', last_name: 'User' }
    useAuthStore.getState().setUser(user as unknown as User)
    expect(useAuthStore.getState().user).toEqual(user)
  })

  it('should logout and clear state', () => {
    useAuthStore.getState().setTokens('access', 'refresh')
    useAuthStore.getState().setUser({ id: 1, username: 'test' } as unknown as User)
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
  })
})
