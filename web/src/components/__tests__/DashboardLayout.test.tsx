import { render, screen } from '@testing-library/react'
import DashboardLayout from '../DashboardLayout'
import { useAuthStore } from '@/lib/authStore'

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

jest.mock('@/lib/authStore', () => ({
  useAuthStore: jest.fn(),
}))

describe('DashboardLayout', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        avatar: null,
      },
      isLoading: false,
      logout: jest.fn(),
      updateUser: jest.fn(),
      login: jest.fn(),
    })
  })

  it('should render children content', () => {
    render(
      <DashboardLayout>
        <div data-testid="main-content">Dashboard Content</div>
      </DashboardLayout>
    )

    expect(screen.getByTestId('main-content')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
  })

  it('should render Sidebar component', () => {
    render(<DashboardLayout><div>Content</div></DashboardLayout>)

    const crabWatchElements = screen.getAllByText('CrabWatch')
    expect(crabWatchElements).toHaveLength(2)
  })

  it('should render Header component', () => {
    render(<DashboardLayout><div>Content</div></DashboardLayout>)

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should render user role in header', () => {
    render(<DashboardLayout><div>Content</div></DashboardLayout>)

    expect(screen.getByText('user')).toBeInTheDocument()
  })

  it('should have correct layout structure', () => {
    const { container } = render(<DashboardLayout><div>Content</div></DashboardLayout>)

    const mainContainer = container.querySelector('.min-h-screen.bg-gray-50.flex')
    expect(mainContainer).toBeInTheDocument()
  })
})
