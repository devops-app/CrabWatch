import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { ObservationDetailScreen } from '../ObservationDetailScreen'
import { useRoute, useNavigation } from '@react-navigation/native'

const mockObservation = {
  id: 'obs-1',
  speciesId: 'sp-1',
  cw: 8.5,
  bw: 350,
  sex: 'male' as const,
  maturationStatus: 'pre-puber' as const,
  lat: 5.5,
  lng: 100.5,
  locationMethod: 'gps' as const,
  photos: ['https://example.com/photo1.jpg'],
  notes: 'Found near mangrove',
  status: 'approved' as const,
  createdAt: '2024-01-15T10:30:00Z',
  validatedAt: '2024-01-16T08:00:00Z',
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
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@test.com',
    role: 'user' as const,
  },
}

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

describe('ObservationDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRoute as jest.Mock).mockReturnValue({ params: { observation: mockObservation } })
    ;(useNavigation as jest.Mock).mockReturnValue({ goBack: jest.fn() })
  })

  it('renders species names', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Scylla serrata')).toBeTruthy()
    expect(getByText('Blue swimmer crab')).toBeTruthy()
  })

  it('renders status badge', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Approved')).toBeTruthy()
  })

  it('renders measurements section', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Measurements')).toBeTruthy()
    expect(getByText('Carapace Width')).toBeTruthy()
    expect(getByText('Body Weight')).toBeTruthy()
    expect(getByText('Condition Factor')).toBeTruthy()
  })

  it('renders biological data section', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Biological Data')).toBeTruthy()
    expect(getByText('Gender')).toBeTruthy()
    expect(getByText('Maturation')).toBeTruthy()
  })

  it('renders location section', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Location')).toBeTruthy()
    expect(getByText('Coordinates')).toBeTruthy()
    expect(getByText('Method')).toBeTruthy()
  })

  it('renders photos section', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Photos')).toBeTruthy()
  })

  it('renders notes section', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Notes')).toBeTruthy()
    expect(getByText('Found near mangrove')).toBeTruthy()
  })

  it('renders submission info section', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Submission Info')).toBeTruthy()
    expect(getByText('Submitted')).toBeTruthy()
    expect(getByText('Test User')).toBeTruthy()
    expect(getByText('Validated')).toBeTruthy()
  })

  it('renders back button', () => {
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Back')).toBeTruthy()
  })

  it('calls goBack when back button is pressed', () => {
    const goBackMock = jest.fn()
    ;(useNavigation as jest.Mock).mockReturnValue({ goBack: goBackMock })
    const { getByText } = render(<ObservationDetailScreen />)
    fireEvent.click(getByText('Back'))
    expect(goBackMock).toHaveBeenCalled()
  })

  it('shows not found when no observation provided', () => {
    (useRoute as jest.Mock).mockReturnValue({ params: { observation: undefined } })
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Observation not found')).toBeTruthy()
  })

  it('shows rejection reason when present', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        observation: {
          ...mockObservation,
          status: 'rejected' as const,
          rejectionReason: 'Invalid measurements',
        },
      },
    })
    const { getByText } = render(<ObservationDetailScreen />)
    expect(getByText('Rejection Reason:')).toBeTruthy()
    expect(getByText('Invalid measurements')).toBeTruthy()
  })
})
