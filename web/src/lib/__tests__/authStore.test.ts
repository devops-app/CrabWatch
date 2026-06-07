import { useAuthStore } from '../authStore'

const mockUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  phoneCode: null,
  phoneNumber: null,
  addressLine1: null,
  addressLine2: null,
  state: null,
  postcode: null,
  country: null,
  role: 'user' as const,
  avatar: null,
  firebaseUid: '',
  preferredLocale: null,
  consentAccepted: false,
  createdAt: new Date(),
  ...overrides,
})

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
      const user = mockUser()

      useAuthStore.getState().login(user)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear user', () => {
      useAuthStore.getState().login(mockUser({ name: 'Test' }))

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('should update user data', () => {
      useAuthStore.getState().login(mockUser({ name: 'Old Name' }))

      useAuthStore.getState().updateUser(mockUser({
        name: 'New Name',
        avatar: 'https://example.com/avatar.png',
      }))

      const state = useAuthStore.getState()
      expect(state.user?.name).toBe('New Name')
      expect(state.user?.avatar).toBe('https://example.com/avatar.png')
    })
  })

  describe('persistence', () => {
    it('should persist auth state to localStorage', () => {
      useAuthStore.getState().login(mockUser({ name: 'Test' }))

      const stored = localStorage.getItem('crabwatch-auth')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored || '')
      expect(parsed.state.user.name).toBe('Test')
    })
  })
})
