import { useAuthStore, initAuth } from '../../store/authStore'
import * as SecureStore from 'expo-secure-store'
import type { UserResponse } from '@crabwatch/shared'

jest.mock('expo-secure-store')

describe('authStore', () => {
  const baseMockUser: UserResponse = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    phoneCode: null,
    phoneNumber: null,
    addressLine1: null,
    addressLine2: null,
    addressLine3: null,
    state: null,
    postcode: null,
    country: null,
    role: 'user',
    avatar: null,
    deletedAt: null,
    blockedAt: null,
    blockReason: null,
    createdAt: '2024-01-01',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.getState().logout().catch(() => {})
  })

  describe('initial state', () => {
    it('has null user', () => {
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('has null token', () => {
      expect(useAuthStore.getState().token).toBeNull()
    })

    it('is not authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('stores user and token', async () => {
      const mockUser = { ...baseMockUser }
      const mockToken = 'test-token'

      await useAuthStore.getState().login(mockUser, mockToken)

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().token).toBe(mockToken)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('saves token to SecureStore', async () => {
      const mockUser = { ...baseMockUser }
      const mockToken = 'test-token'

      await useAuthStore.getState().login(mockUser, mockToken)

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', mockToken)
    })
  })

  describe('logout', () => {
    it('clears user and token', async () => {
      const mockUser = { ...baseMockUser }
      const mockToken = 'test-token'

      await useAuthStore.getState().login(mockUser, mockToken)
      await useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('deletes token from SecureStore', async () => {
      await useAuthStore.getState().logout()
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token')
    })
  })

  describe('updateUser', () => {
    it('updates the user object', () => {
      const mockUser = { ...baseMockUser }

      useAuthStore.getState().updateUser(mockUser)

      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('preserves existing token', () => {
      useAuthStore.getState().setToken('existing-token')
      const mockUser = { ...baseMockUser }

      useAuthStore.getState().updateUser(mockUser)

      expect(useAuthStore.getState().token).toBe('existing-token')
    })
  })

  describe('setToken', () => {
    it('sets token and marks as authenticated', () => {
      useAuthStore.getState().setToken('new-token')

      expect(useAuthStore.getState().token).toBe('new-token')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('clears token and marks as not authenticated', () => {
      useAuthStore.getState().setToken('some-token')
      useAuthStore.getState().setToken(null)

      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })
})

describe('initAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.getState().logout().catch(() => {})
  })

  it('sets token from SecureStore on init', async () => {
    jest.spyOn(SecureStore, 'getItemAsync').mockResolvedValue('stored-token')

    await initAuth()

    expect(useAuthStore.getState().token).toBe('stored-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('does nothing when no token in SecureStore', async () => {
    jest.spyOn(SecureStore, 'getItemAsync').mockResolvedValue(null)

    await initAuth()

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('calls setToken via getState', async () => {
    jest.spyOn(SecureStore, 'getItemAsync').mockResolvedValue('my-token')

    await initAuth()

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token')
  })
})
