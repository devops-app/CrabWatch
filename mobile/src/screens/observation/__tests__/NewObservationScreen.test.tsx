import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { NewObservationScreen } from '../NewObservationScreen'
import { Alert } from 'react-native'

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: null,
    formState: { errors: {} },
    handleSubmit: (cb: (data: Record<string, unknown>) => void) => () => cb({ speciesId: '1', cw: 8, bw: 300, sex: 'unknown', maturationStatus: 'unknown', lat: 0, lng: 0, locationMethod: 'gps', photos: [], notes: '' }),
    reset: jest.fn(),
  }),
  Controller: ({ render }: { render: (field: Record<string, unknown>) => React.ReactNode }) => render({ field: { onChange: jest.fn(), onBlur: jest.fn(), value: '' } }),
}))

jest.mock('@hookform/resolvers/zod', () => ({ zodResolver: () => jest.fn() }))

jest.mock('@/hooks/useObservation', () => ({
  useObservation: jest.fn(() => ({
    submitObservation: jest.fn().mockResolvedValue(true),
    submitting: false,
    error: null,
    syncStatus: 'idle',
  })),
}))

jest.mock('@/store/speciesStore', () => ({
  useSpeciesStore: jest.fn((selector) => {
    const mockState = {
      species: [
        { id: '1', scientificName: 'Scylla serrata', commonName: 'Blue swimmer crab', images: [], description: '', keyFeatures: [], distributionZones: [] },
      ],
      selectedSpecies: null,
      loading: false,
      error: null,
      loadSpecies: jest.fn(),
      selectSpecies: jest.fn(),
      getSpeciesById: jest.fn(),
    }
    return selector ? selector(mockState) : mockState
  }),
}))

let mockPendingObservations: { localId: string }[] = []

jest.mock('@/store/observationStore', () => ({
  useObservationStore: jest.fn((selector) => {
    const mockState = {
      pendingObservations: mockPendingObservations,
      syncStatus: 'idle',
      addObservation: jest.fn(),
      removeObservation: jest.fn(),
      clearPending: jest.fn(),
      setSyncStatus: jest.fn(),
    }
    return selector ? selector(mockState) : mockState
  }),
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

describe('NewObservationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPendingObservations = []
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders section titles', () => {
    const { getAllByText, getByText } = render(<NewObservationScreen />)
    expect(getAllByText('Species').length).toBeGreaterThanOrEqual(1)
    expect(getByText('Measurements')).toBeTruthy()
    expect(getByText('Biological Data')).toBeTruthy()
    expect(getAllByText('Location').length).toBeGreaterThanOrEqual(1)
    expect(getByText('Photos')).toBeTruthy()
  })

  it('renders submit button', () => {
    const { getByText } = render(<NewObservationScreen />)
    expect(getByText('Submit Observation')).toBeTruthy()
  })

  it('renders measurement inputs', () => {
    const { getByPlaceholderText } = render(<NewObservationScreen />)
    expect(getByPlaceholderText('e.g. 8.5')).toBeTruthy()
    expect(getByPlaceholderText('e.g. 350')).toBeTruthy()
  })

  it('renders notes input', () => {
    const { getByPlaceholderText } = render(<NewObservationScreen />)
    expect(getByPlaceholderText(/Add any additional notes/)).toBeTruthy()
  })

  it('shows offline banner when there are pending observations', () => {
    mockPendingObservations = [{ localId: '1' }]

    const { getByText } = render(<NewObservationScreen />)
    expect(getByText(/queued offline/)).toBeTruthy()
  })

  it('shows Alert when location not captured on submit', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    const { getByText } = render(<NewObservationScreen />)
    fireEvent.click(getByText('Submit Observation'))

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Location Required', expect.any(String))
    })
  })
})
