import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../Sidebar'

describe('Sidebar', () => {
  const mockOnToggle = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all navigation items', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('Researcher')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
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

    expect(screen.getByText('Crab Conservation')).toBeInTheDocument()
  })

  it('should highlight active route', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} />)

    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-ocean-600')
  })

  it('should hide nav labels when collapsed', () => {
    render(<Sidebar isOpen={false} onToggle={mockOnToggle} />)

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument()
  })
})
