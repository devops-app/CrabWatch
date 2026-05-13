import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { SpeciesDetailScreen } from '../SpeciesDetailScreen'
import { useRoute, useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'

const mockSpecies = {
  id: 'sp-1',
  scientificName: 'Scylla serrata',
  commonName: 'Blue swimmer crab',
  images: ['https://example.com/img1.jpg'],
  description: 'The largest species of mud crab.',
  keyFeatures: [
    { trait: 'Carapace', value: 'Dark green to black' },
  ],
  distributionZones: [
    { name: 'West Malaysia' },
    { name: 'East Malaysia' },
  ],
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

describe('SpeciesDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRoute as jest.Mock).mockReturnValue({ params: { speciesId: 'sp-1' } })
    ;(useNavigation as jest.Mock).mockReturnValue({ goBack: jest.fn() })
    ;(api.getSpecies as jest.Mock).mockResolvedValue(mockSpecies)
  })

  it('shows loading spinner initially', () => {
    (api.getSpecies as jest.Mock).mockReturnValue(new Promise(() => {}))
    const { container } = render(<SpeciesDetailScreen />)
    const spinner = container.querySelector('div[role="progressbar"]')
    expect(spinner).toBeTruthy()
  })

  it('renders species names', async () => {
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      expect(getByText('Scylla serrata')).toBeTruthy()
    })
  })

  it('renders common name', async () => {
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      expect(getByText('Blue swimmer crab')).toBeTruthy()
    })
  })

  it('renders description', async () => {
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      expect(getByText('Description')).toBeTruthy()
    })
  })

  it('renders key features', async () => {
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      expect(getByText('Key Features')).toBeTruthy()
    })
  })

  it('renders distribution zones', async () => {
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      expect(getByText(/Distribution Zones/)).toBeTruthy()
    })
  })

  it('renders back button', async () => {
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      expect(getByText('Back to Species')).toBeTruthy()
    })
  })

  it('calls goBack when back button pressed', async () => {
    const goBackMock = jest.fn()
    ;(useNavigation as jest.Mock).mockReturnValue({ goBack: goBackMock })
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      fireEvent.click(getByText('Back to Species'))
    })
    expect(goBackMock).toHaveBeenCalled()
  })

  it('shows not found when API fails', async () => {
    (api.getSpecies as jest.Mock).mockRejectedValue(new Error('Not found'))
    const { getByText } = render(<SpeciesDetailScreen />)
    await waitFor(() => {
      expect(getByText('Species not found')).toBeTruthy()
    })
  })
})
