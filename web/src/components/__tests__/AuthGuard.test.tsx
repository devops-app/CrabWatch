import { render, screen, waitFor } from '@testing-library/react'
import AuthGuard from '../AuthGuard'
import { useAuthStore } from '@/lib/authStore'
import { api } from '@/lib/api'

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockApi = api as jest.Mocked<typeof api>
const mockReplace = jest.fn()

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
  }),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getProfile: jest.fn(),
  },
}))

jest.mock('@/lib/authStore', () => ({
  useAuthStore: jest.fn(),
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect to login when not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: false,
      isHydrated: true,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    })

    render(<AuthGuard><div>Protected Content</div></AuthGuard>)

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(mockReplace).toHaveBeenCalledWith('/auth/login')
  })

  it('should show children when authenticated', async () => {
    mockApi.getProfile.mockResolvedValue({
      id: '1',
      name: 'Test',
      email: 'test@example.com',
      role: 'user',
      avatar: null,
    } as any)

    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        role: 'user',
        avatar: null,
      },
      isLoading: false,
      isHydrated: true,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    })

    render(<AuthGuard><div>Protected Content</div></AuthGuard>)

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('should redirect to dashboard when role does not match', () => {
    mockApi.getProfile.mockResolvedValue({
      id: '1',
      name: 'Test',
      email: 'test@example.com',
      role: 'user',
      avatar: null,
    } as any)

    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        role: 'user',
        avatar: null,
      },
      isLoading: false,
      isHydrated: true,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    })

    render(
      <AuthGuard requiredRole="admin">
        <div>Admin Content</div>
      </AuthGuard>
    )

    return waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should show content when role matches', async () => {
    mockApi.getProfile.mockResolvedValue({
      id: '1',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      avatar: null,
    } as any)

    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        avatar: null,
      },
      isLoading: false,
      isHydrated: true,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    })

    render(
      <AuthGuard requiredRole="admin">
        <div>Admin Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })

  it('should show loading spinner while checking', () => {
    mockApi.getProfile.mockResolvedValue({
      id: '1',
      name: 'Test',
      email: 'test@example.com',
      role: 'user',
      avatar: null,
    } as any)

    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: true,
      isHydrated: true,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    })

    render(<AuthGuard><div>Content</div></AuthGuard>)

    expect(screen.getByText('loading')).toBeInTheDocument()
  })
})
