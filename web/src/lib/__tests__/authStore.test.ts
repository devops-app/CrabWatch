import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().logout()
  })

  describe('initial state', () => {
    it('should have null user', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('login', () => {
    it('should set user', () => {
      const user = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
        avatar: null,
      }

      useAuthStore.getState().login(user)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear user', () => {
      useAuthStore.getState().login({
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        role: 'user' as const,
        avatar: null,
      })

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('should update user data', () => {
      useAuthStore.getState().login({
        id: '1',
        name: 'Old Name',
        email: 'test@example.com',
        role: 'user' as const,
        avatar: null,
      })

      useAuthStore.getState().updateUser({
        id: '1',
        name: 'New Name',
        email: 'test@example.com',
        role: 'user' as const,
        avatar: 'https://example.com/avatar.png',
      })

      const state = useAuthStore.getState()
      expect(state.user?.name).toBe('New Name')
      expect(state.user?.avatar).toBe('https://example.com/avatar.png')
    })
  })

  describe('persistence', () => {
    it('should persist auth state to localStorage', () => {
      useAuthStore.getState().login({
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        role: 'user' as const,
        avatar: null,
      })

      const stored = localStorage.getItem('crabwatch-auth')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored || '')
      expect(parsed.state.user.name).toBe('Test')
    })
  })
})
