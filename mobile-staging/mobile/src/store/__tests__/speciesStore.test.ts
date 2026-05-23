import { useSpeciesStore } from '../../store/speciesStore'

jest.mock('../../services/api', () => ({
  api: {
    listSpecies: jest.fn(),
    getSpecies: jest.fn(),
  },
}))

import { api } from '../../services/api'

describe('speciesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSpeciesStore.getState().selectSpecies(null)
    useSpeciesStore.setState({ species: [], loading: false, error: null })
  })

  describe('initial state', () => {
    it('has empty species list', () => {
      expect(useSpeciesStore.getState().species).toEqual([])
    })

    it('has null selected species', () => {
      expect(useSpeciesStore.getState().selectedSpecies).toBeNull()
    })

    it('is not loading', () => {
      expect(useSpeciesStore.getState().loading).toBe(false)
    })

    it('has null error', () => {
      expect(useSpeciesStore.getState().error).toBeNull()
    })
  })

  describe('loadSpecies', () => {
    it('loads species successfully', async () => {
      const mockSpecies = [
        { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Mud Crab' },
        { id: 'species-2', scientificName: 'Scylla olivacea', commonName: 'Green Mud Crab' },
      ]
      ;(api.listSpecies as jest.Mock).mockResolvedValue(mockSpecies)

      await useSpeciesStore.getState().loadSpecies()

      expect(useSpeciesStore.getState().species).toEqual(mockSpecies)
      expect(useSpeciesStore.getState().loading).toBe(false)
      expect(useSpeciesStore.getState().error).toBeNull()
    })

    it('sets loading to true during request', async () => {
      (api.listSpecies as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 10))
      )

      useSpeciesStore.getState().loadSpecies()
      expect(useSpeciesStore.getState().loading).toBe(true)
    })

    it('sets error on failure', async () => {
      (api.listSpecies as jest.Mock).mockRejectedValue(new Error('Network error'))

      await useSpeciesStore.getState().loadSpecies()

      expect(useSpeciesStore.getState().error).toBe('Network error')
      expect(useSpeciesStore.getState().loading).toBe(false)
    })

    it('handles non-Error objects', async () => {
      (api.listSpecies as jest.Mock).mockRejectedValue('Unknown error')

      await useSpeciesStore.getState().loadSpecies()

      expect(useSpeciesStore.getState().error).toBe('Failed to load species')
    })
  })

  describe('selectSpecies', () => {
    it('sets the selected species', () => {
      const species = { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Mud Crab', description: '', keyFeatures: [], images: [], distributionZones: [] }

      useSpeciesStore.getState().selectSpecies(species)

      expect(useSpeciesStore.getState().selectedSpecies).toEqual(species)
    })

    it('can clear selected species with null', () => {
      const species = { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Mud Crab', description: '', keyFeatures: [], images: [], distributionZones: [] }

      useSpeciesStore.getState().selectSpecies(species)
      useSpeciesStore.getState().selectSpecies(null)

      expect(useSpeciesStore.getState().selectedSpecies).toBeNull()
    })
  })

  describe('getSpeciesById', () => {
    it('returns species by id', async () => {
      const mockSpecies = [
        { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Mud Crab' },
        { id: 'species-2', scientificName: 'Scylla olivacea', commonName: 'Green Mud Crab' },
      ]
      ;(api.listSpecies as jest.Mock).mockResolvedValue(mockSpecies)

      await useSpeciesStore.getState().loadSpecies()

      const result = useSpeciesStore.getState().getSpeciesById('species-1')
      expect(result).toEqual(mockSpecies[0])
    })

    it('returns undefined for non-existent id', async () => {
      const mockSpecies = [
        { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Mud Crab' },
      ]
      ;(api.listSpecies as jest.Mock).mockResolvedValue(mockSpecies)

      await useSpeciesStore.getState().loadSpecies()

      const result = useSpeciesStore.getState().getSpeciesById('non-existent')
      expect(result).toBeUndefined()
    })

    it('returns undefined when list is empty', () => {
      const result = useSpeciesStore.getState().getSpeciesById('any-id')
      expect(result).toBeUndefined()
    })
  })
})
