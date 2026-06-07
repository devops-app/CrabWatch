import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../Sidebar'
import { useAuthStore } from '@/lib/authStore'

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

jest.mock('@/lib/authStore', () => ({
  useAuthStore: jest.fn(),
}))

describe('Sidebar', () => {
  const mockOnToggle = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        avatar: null,
      },
      token: 'token',
      isLoading: false,
      isHydrated: true,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    })
  })

  it('should render all navigation items', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)

    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.getByText('analytics')).toBeInTheDocument()
    expect(screen.getByText('capture')).toBeInTheDocument()
    expect(screen.getByText('researcher')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('should render branding when open', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)

    expect(screen.getByText('CrabWatch')).toBeInTheDocument()
  })

  it('should show abbreviated branding when collapsed', () => {
    render(<Sidebar isOpen={false} onToggle={mockOnToggle} />)

    expect(screen.getByText('CW')).toBeInTheDocument()
    expect(screen.queryByText('CrabWatch')).not.toBeInTheDocument()
  })

  it('should not show overlay when closed', () => {
    const { container } = render(<Sidebar isOpen={false} onToggle={mockOnToggle} />)

    const overlay = container.querySelector('aside')
    expect(overlay).toHaveClass('w-0')
  })

  it('should show overlay when open', () => {
    const { container } = render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)

    const overlay = container.querySelector('.bg-black\\/30')
    expect(overlay).toBeInTheDocument()
  })

  it('should call onToggle when overlay is clicked', () => {
    const { container } = render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)
    const overlay = container.querySelector('.bg-black\\/30')
    if (overlay) fireEvent.click(overlay)
    expect(mockOnToggle).toHaveBeenCalled()
  })

  it('should hide footer text when collapsed', () => {
    const { container } = render(<Sidebar isOpen={false} onToggle={mockOnToggle} />)
    const footer = container.querySelector('.border-t.border-ocean-700') || container.querySelector('[class*="border-t"]')
    expect(footer?.className).toContain('hidden')
  })

  it('should show footer text when open', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)

    expect(screen.getByText('crabConservation')).toBeInTheDocument()
  })

  it('should highlight active route', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)

    const dashboardLink = screen.getByText('dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-ocean-600')
  })

  it('should hide nav labels when collapsed', () => {
    render(<Sidebar isOpen={false} onToggle={mockOnToggle} />)

    expect(screen.queryByText('dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('analytics')).not.toBeInTheDocument()
  })
})
