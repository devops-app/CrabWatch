import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { ProfileScreen } from '../ProfileScreen'
import { useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { Alert } from 'react-native'

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { name: 'Test User', email: 'test@test.com', role: 'user', avatar: null },
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

const mockObservations = [
  {
    id: 'obs-1',
    speciesId: 'sp-1',
    cw: 8.5,
    bw: 350,
    sex: 'male',
    maturationStatus: 'pre-puber',
    lat: 5.5,
    lng: 100.5,
    locationMethod: 'gps',
    photos: [],
    notes: '',
    status: 'approved',
    createdAt: '2024-01-15T10:30:00Z',
    validatedAt: null,
    rejectionReason: null,
    userId: 'user-1',
    species: {
      id: 'sp-1',
      scientificName: 'Scylla serrata',
      commonName: 'Blue swimmer crab',
      images: [],
      description: '',
      keyFeatures: [],
      distributionZones: [],
    },
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'user' },
  },
]

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
    })
    ;(api.listObservations as jest.Mock).mockResolvedValue({
      observations: mockObservations,
      total: 1,
    })
  })

  it('renders user name', async () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('Test User')).toBeTruthy()
  })

  it('renders user email', async () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('test@test.com')).toBeTruthy()
  })

  it('renders avatar placeholder when no avatar', async () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('T')).toBeTruthy()
  })

  it('renders role badge', async () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('User')).toBeTruthy()
  })

  it('renders stats row with counts', async () => {
    const { getByText } = render(<ProfileScreen />)
    await waitFor(() => {
      expect(getByText('Approved')).toBeTruthy()
      expect(getByText('Total')).toBeTruthy()
      expect(getByText('Pending')).toBeTruthy()
    })
  })

  it('renders edit profile button', async () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('Edit Profile')).toBeTruthy()
  })

  it('renders sign out button', async () => {
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('Sign Out')).toBeTruthy()
  })

  it('shows sign out confirmation alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    const { getByText } = render(<ProfileScreen />)
    fireEvent.click(getByText('Sign Out'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Sign Out', expect.any(String), expect.any(Array))
    })
  })

  it('renders recent submissions section', async () => {
    const { getByText } = render(<ProfileScreen />)
    await waitFor(() => {
      expect(getByText('Recent Submissions')).toBeTruthy()
    })
  })

  it('renders observation cards', async () => {
    const { getByText } = render(<ProfileScreen />)
    await waitFor(() => {
      expect(getByText('Scylla serrata')).toBeTruthy()
    })
  })

  it('shows empty state when no observations', async () => {
    (api.listObservations as jest.Mock).mockResolvedValue({
      observations: [],
      total: 0,
    })
    const { getByText } = render(<ProfileScreen />)
    await waitFor(() => {
      expect(getByText('No observations yet')).toBeTruthy()
    })
  })
})
