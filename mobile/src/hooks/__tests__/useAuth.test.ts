import { renderHook } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

describe('useAuth', () => {
  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user' as const,
  }
  const mockLogin = jest.fn()
  const mockLogout = jest.fn()
  const mockUpdateUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        user: mockUser,
        token: 'test-token',
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
        updateUser: mockUpdateUser,
        setToken: jest.fn(),
      })
    )
  })

  it('returns user from store', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toEqual(mockUser)
  })

  it('returns token from store', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.token).toBe('test-token')
  })

  it('returns isAuthenticated from store', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('returns login function from store', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.login).toBe(mockLogin)
  })

  it('returns logout function from store', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.logout).toBe(mockLogout)
  })

  it('returns updateUser function from store', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.updateUser).toBe(mockUpdateUser)
  })

  describe('unauthenticated state', () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({
          user: null,
          token: null,
          isAuthenticated: false,
          login: mockLogin,
          logout: mockLogout,
          updateUser: mockUpdateUser,
          setToken: jest.fn(),
        })
      )
    })

    it('returns null user when not authenticated', () => {
      const { result } = renderHook(() => useAuth())
      expect(result.current.user).toBeNull()
    })

    it('returns null token when not authenticated', () => {
      const { result } = renderHook(() => useAuth())
      expect(result.current.token).toBeNull()
    })

    it('returns false isAuthenticated when not authenticated', () => {
      const { result } = renderHook(() => useAuth())
      expect(result.current.isAuthenticated).toBe(false)
    })
  })
})
