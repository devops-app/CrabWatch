import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { SpeciesListScreen } from '../SpeciesListScreen'
import { useNavigation } from '@react-navigation/native'

const mockSpecies = [
  {
    id: '1',
    scientificName: 'Scylla serrata',
    commonName: 'Blue swimmer crab',
    images: [],
    description: 'Largest mud crab species',
    keyFeatures: [],
    distributionZones: [],
  },
  {
    id: '2',
    scientificName: 'Scylla paramamosain',
    commonName: 'Green mud crab',
    images: [],
    description: 'Common in estuaries',
    keyFeatures: [],
    distributionZones: [],
  },
]

let mockLoading = false

jest.mock('@/store/speciesStore', () => ({
  useSpeciesStore: jest.fn((selector) => {
    const mockState = {
      species: mockLoading ? [] : mockSpecies,
      selectedSpecies: null,
      loading: mockLoading,
      error: null,
      loadSpecies: jest.fn(),
      selectSpecies: jest.fn(),
      getSpeciesById: jest.fn(),
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

describe('SpeciesListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoading = false
    ;(useNavigation as unknown as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
    })
  })

  it('renders search input', () => {
    const { getByPlaceholderText } = render(<SpeciesListScreen />)
    expect(getByPlaceholderText('Search species...')).toBeTruthy()
  })

  it('shows species cards when data is loaded', () => {
    const { getByText } = render(<SpeciesListScreen />)
    expect(getByText('Scylla serrata')).toBeTruthy()
    expect(getByText('Scylla paramamosain')).toBeTruthy()
  })

  it('filters species by search term', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<SpeciesListScreen />)
    fireEvent.change(getByPlaceholderText('Search species...'), {
      target: { value: 'green' },
    })
    expect(getByText('Green mud crab')).toBeTruthy()
    expect(queryByText('Blue swimmer crab')).toBeFalsy()
  })

  it('shows empty state when no species match search', () => {
    const { getByPlaceholderText, getByText } = render(<SpeciesListScreen />)
    fireEvent.change(getByPlaceholderText('Search species...'), {
      target: { value: 'nonexistent' },
    })
    expect(getByText('No species found')).toBeTruthy()
    expect(getByText('Try a different search term')).toBeTruthy()
  })

  it('shows loading spinner when loading', () => {
    mockLoading = true
    const { container } = render(<SpeciesListScreen />)
    const spinner = container.querySelector('[role="progressbar"]')
    expect(spinner).toBeTruthy()
    mockLoading = false
  })

  it('navigates to detail on species card press', () => {
    const navigateMock = jest.fn()
    ;(useNavigation as unknown as jest.Mock).mockReturnValue({
      navigate: navigateMock,
      goBack: jest.fn(),
    })
    const { getByText } = render(<SpeciesListScreen />)
    fireEvent.click(getByText('Scylla serrata'))
    expect(navigateMock).toHaveBeenCalledWith('SpeciesDetail', { speciesId: '1' })
  })
})
