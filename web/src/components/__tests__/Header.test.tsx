import { render, screen, waitFor } from '@testing-library/react'
import Header from '../Header'
import { useAuthStore } from '@/lib/authStore'

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

jest.mock('@/lib/authStore', () => ({
  useAuthStore: jest.fn(),
}))

describe('Header', () => {
  const mockOnSidebarToggle = jest.fn()
  const mockLogout = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        avatar: null,
      },
      logout: mockLogout,
      isLoading: false,
      updateUser: jest.fn(),
      login: jest.fn(),
    })
  })

  it('should render the CrabWatch logo', () => {
    render(<Header onSidebarToggle={mockOnSidebarToggle} />)

    expect(screen.getByText('CrabWatch')).toBeInTheDocument()
  })

  it('should render user initial', () => {
    render(<Header onSidebarToggle={mockOnSidebarToggle} />)

    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('should render user name', () => {
    render(<Header onSidebarToggle={mockOnSidebarToggle} />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should render user role', () => {
    render(<Header onSidebarToggle={mockOnSidebarToggle} />)

    expect(screen.getByText('user')).toBeInTheDocument()
  })

  it('should call onSidebarToggle when menu button is clicked', () => {
    render(<Header onSidebarToggle={mockOnSidebarToggle} />)

    const buttons = screen.getAllByRole('button')
    buttons[0].click()
    expect(mockOnSidebarToggle).toHaveBeenCalled()
  })

  it('should call logout when logout button is clicked', async () => {
    render(<Header onSidebarToggle={mockOnSidebarToggle} />)

    const logoutButton = screen.getByTitle('Logout')
    logoutButton.click()
    await waitFor(() => expect(mockLogout).toHaveBeenCalled())
  })

  it('should show default initial when user name is empty', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        name: '',
        email: 'test@example.com',
        role: 'user',
        avatar: null,
      },
      logout: mockLogout,
      isLoading: false,
      updateUser: jest.fn(),
      login: jest.fn(),
    })

    const { container } = render(<Header onSidebarToggle={mockOnSidebarToggle} />)
    const initialDiv = container.querySelector('.w-8.h-8') || container.querySelector('[class*="rounded-full"]')
    expect(initialDiv?.textContent).toBe('')
  })

  it('should show "User" when user is null', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      logout: mockLogout,
      isLoading: false,
      updateUser: jest.fn(),
      login: jest.fn(),
    })

    render(<Header onSidebarToggle={mockOnSidebarToggle} />)

    expect(screen.getByText('User')).toBeInTheDocument()
  })
})
