import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { HomeScreen } from '../HomeScreen'
import { api } from '@/services/api'

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { name: 'Test User', email: 'test@test.com', role: 'user' },
    token: 'mock-token',
    isAuthenticated: true,
    logout: jest.fn(),
    updateUser: jest.fn(),
  })),
}))

jest.mock('@/services/api', () => ({
  api: {
    getDashboardStats: jest.fn(),
    listSpecies: jest.fn(),
    getSpecies: jest.fn(),
    createObservation: jest.fn(),
    listObservations: jest.fn(),
    updateProfile: jest.fn(),
  },
}))

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading spinner while loading', () => {
    (api.getDashboardStats as jest.Mock).mockReturnValue(new Promise(() => {}))
    const { container } = render(<HomeScreen />)
    const spinner = container.querySelector('div[role="progressbar"]')
    expect(spinner).toBeTruthy()
  })

  it('renders greeting with user name', async () => {
    (api.getDashboardStats as jest.Mock).mockResolvedValue({
      totalObservations: 42,
      approvedObservations: 35,
      totalSpecies: 3,
      totalContributors: 10,
    })
    const { getByText } = render(<HomeScreen />)
    await waitFor(() => {
      expect(getByText(/Welcome, Test/)).toBeTruthy()
    })
  })

  it('renders subheader text', async () => {
    (api.getDashboardStats as jest.Mock).mockResolvedValue({
      totalObservations: 10,
      approvedObservations: 8,
      totalSpecies: 3,
      totalContributors: 5,
    })
    const { getByText } = render(<HomeScreen />)
    await waitFor(() => {
      expect(getByText(/Track mud crab/)).toBeTruthy()
    })
  })

  it('renders stat cards with data', async () => {
    (api.getDashboardStats as jest.Mock).mockResolvedValue({
      totalObservations: 42,
      approvedObservations: 35,
      totalSpecies: 3,
      totalContributors: 10,
    })
    const { getByText } = render(<HomeScreen />)
    await waitFor(() => {
      expect(getByText('Observations')).toBeTruthy()
    })
    expect(getByText('Approved')).toBeTruthy()
    expect(getByText('Species')).toBeTruthy()
    expect(getByText('Contributors')).toBeTruthy()
    expect(getByText('42')).toBeTruthy()
  })

  it('renders quick actions section', async () => {
    (api.getDashboardStats as jest.Mock).mockResolvedValue({
      totalObservations: 5,
      approvedObservations: 3,
      totalSpecies: 2,
      totalContributors: 4,
    })
    const { getByText } = render(<HomeScreen />)
    await waitFor(() => {
      expect(getByText('Quick Actions')).toBeTruthy()
    })
    expect(getByText('New Observation')).toBeTruthy()
    expect(getByText('Species Guide')).toBeTruthy()
  })

  it('renders about CrabWatch section', async () => {
    (api.getDashboardStats as jest.Mock).mockResolvedValue({
      totalObservations: 1,
      approvedObservations: 0,
      totalSpecies: 1,
      totalContributors: 1,
    })
    const { getByText } = render(<HomeScreen />)
    await waitFor(() => {
      expect(getByText('About CrabWatch')).toBeTruthy()
    })
    expect(getByText(/citizen science platform/)).toBeTruthy()
  })

  it('handles API error gracefully', async () => {
    (api.getDashboardStats as jest.Mock).mockRejectedValue(new Error('Network error'))
    const { getByText } = render(<HomeScreen />)
    await waitFor(() => {
      expect(getByText(/Welcome/)).toBeTruthy()
    })
  })
})
