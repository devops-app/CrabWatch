import { authService } from '../authService'
import * as apiModule from '../api'
import { useAuthStore } from '../../store/authStore'
import * as SecureStore from 'expo-secure-store'

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}))

jest.mock('firebase/auth', () => ({
  signInWithCustomToken: jest.fn().mockResolvedValue({
    user: {
      getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
      uid: 'mock-uid',
    },
  }),
}))

jest.mock('../../lib/firebase', () => ({
  auth: {
    signOut: jest.fn().mockResolvedValue(undefined),
    currentUser: null,
  },
}))

jest.mock('../api', () => ({
  api: {
    login: jest.fn(),
    register: jest.fn(),
  },
}))

jest.mock('expo-secure-store')
jest.mock('../../store/authStore')

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(SecureStore, 'getItemAsync').mockResolvedValue(null)
})

describe('authService', () => {
  describe('login', () => {
    it('logs in user and stores credentials', async () => {
      const mockUser = { id: '1', name: 'Test', email: 'test@test.com', role: 'user' as const, avatar: null, createdAt: '2024-01-01' }
      const mockStoreLogin = jest.fn().mockResolvedValue(undefined)

      ;(apiModule.api.login as jest.Mock).mockResolvedValue({ token: 'mock-token', user: mockUser })

      jest.spyOn(useAuthStore, 'getState').mockReturnValue({
        login: mockStoreLogin,
        logout: jest.fn(),
        setToken: jest.fn(),
        user: null,
        token: null,
        firebaseUid: null,
        isAuthenticated: false,
        updateUser: jest.fn(),
      } as unknown as ReturnType<typeof useAuthStore['getState']>)

      const result = await authService.login('test@test.com', 'password123')

      expect(result).toEqual(mockUser)
      expect(apiModule.api.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' })
      expect(mockStoreLogin).toHaveBeenCalledWith(mockUser, 'mock-id-token', 'mock-uid')
    })

    it('throws on login failure', async () => {
      (apiModule.api.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

      await expect(authService.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('registers a new user and logs them in', async () => {
      const mockUser = { id: '2', name: 'New User', email: 'new@test.com', role: 'user' as const, avatar: null, createdAt: '2024-01-01' }
      const mockStoreLogin = jest.fn().mockResolvedValue(undefined)

      ;(apiModule.api.register as jest.Mock).mockResolvedValue(mockUser)
      ;(apiModule.api.login as jest.Mock).mockResolvedValue({ token: 'mock-token', user: mockUser })

      jest.spyOn(useAuthStore, 'getState').mockReturnValue({
        login: mockStoreLogin,
        logout: jest.fn(),
        setToken: jest.fn(),
        user: null,
        token: null,
        firebaseUid: null,
        isAuthenticated: false,
        updateUser: jest.fn(),
      } as unknown as ReturnType<typeof useAuthStore['getState']>)

      const result = await authService.register('New User', 'new@test.com', 'password123')

      expect(result).toEqual(mockUser)
      expect(apiModule.api.register).toHaveBeenCalledWith('New User', 'new@test.com', 'password123')
      expect(mockStoreLogin).toHaveBeenCalledWith(mockUser, 'mock-id-token', 'mock-uid')
    })

    it('throws on registration failure', async () => {
      (apiModule.api.register as jest.Mock).mockRejectedValue(new Error('Email already exists'))

      await expect(
        authService.register('Existing', 'existing@test.com', 'password123')
      ).rejects.toThrow('Email already exists')
    })
  })

  describe('logout', () => {
    it('logs out the user', async () => {
      const mockLogout = jest.fn().mockResolvedValue(undefined)

      jest.spyOn(useAuthStore, 'getState').mockReturnValue({
        login: jest.fn(),
        logout: mockLogout,
        setToken: jest.fn(),
        user: null,
        token: null,
        firebaseUid: null,
        isAuthenticated: false,
        updateUser: jest.fn(),
      } as unknown as ReturnType<typeof useAuthStore['getState']>)

      await authService.logout()
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe('refreshToken', () => {
    it('refreshes token when user is logged in', async () => {
      const mockSetToken = jest.fn()
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { auth } = require('../../lib/firebase')
      auth.currentUser = { getIdToken: jest.fn().mockResolvedValue('new-token') }

      jest.spyOn(useAuthStore, 'getState').mockReturnValue({
        login: jest.fn(),
        logout: jest.fn(),
        setToken: mockSetToken,
        user: null,
        token: null,
        firebaseUid: null,
        isAuthenticated: false,
        updateUser: jest.fn(),
      } as unknown as ReturnType<typeof useAuthStore['getState']>)

      const token = await authService.refreshToken()

      expect(token).toBe('new-token')
      expect(mockSetToken).toHaveBeenCalledWith('new-token')
      auth.currentUser = null
    })

    it('returns null when no current user', async () => {
      const mockSetToken = jest.fn()
      jest.spyOn(useAuthStore, 'getState').mockReturnValue({
        login: jest.fn(),
        logout: jest.fn(),
        setToken: mockSetToken,
        user: null,
        token: null,
        firebaseUid: null,
        isAuthenticated: false,
        updateUser: jest.fn(),
      } as unknown as ReturnType<typeof useAuthStore['getState']>)

      const token = await authService.refreshToken()

      expect(token).toBeNull()
      expect(mockSetToken).not.toHaveBeenCalled()
    })
  })
})
