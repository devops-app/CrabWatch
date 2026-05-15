const mockPrisma = {
  observation: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  species: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
}

jest.mock('../../config/database', () => mockPrisma)

import {
  getDashboardStats,
  getSizeFrequency,
  getGenderRatio,
  getConditionIndices,
  getCW50,
  getTemporalTrends,
} from '../../services/analytics'

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getDashboardStats', () => {
    it('should return aggregated dashboard statistics', async () => {
      mockPrisma.observation.count.mockImplementation((params?: unknown) => {
        const p = params as { where?: { status?: string } } | undefined
        if (p?.where?.status === 'APPROVED') return Promise.resolve(80)
        if (p?.where?.status === 'PENDING') return Promise.resolve(20)
        return Promise.resolve(100)
      })
      mockPrisma.species.count.mockResolvedValue(4)
      mockPrisma.user.count.mockResolvedValue(25)
      mockPrisma.observation.findMany.mockResolvedValue([
        { lat: 5.4, lng: 100.3 },
        { lat: 4.2, lng: 101.9 },
        { lat: 1.5, lng: 103.5 },
      ])

      const result = await getDashboardStats()

      expect(result).toEqual({
        totalObservations: 100,
        approvedObservations: 80,
        pendingObservations: 20,
        totalSpecies: 4,
        totalContributors: 25,
        statesCovered: expect.any(Number),
      })
      expect(result.statesCovered).toBeGreaterThanOrEqual(1)
    })

    it('should handle empty observations', async () => {
      mockPrisma.observation.count.mockResolvedValue(0)
      mockPrisma.species.count.mockResolvedValue(0)
      mockPrisma.user.count.mockResolvedValue(0)
      mockPrisma.observation.findMany.mockResolvedValue([])

      const result = await getDashboardStats()

      expect(result.totalObservations).toBe(0)
      expect(result.statesCovered).toBe(0)
    })
  })

  describe('getSizeFrequency', () => {
    it('should bin observations by carapace width', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([
        { cw: 3.2 },
        { cw: 3.8 },
        { cw: 5.1 },
        { cw: 5.9 },
        { cw: 10.0 },
      ])

      const result = await getSizeFrequency()

      expect(result).toHaveLength(21)
      expect(result.find((r) => r.sizeBin === '3-4cm')?.count).toBe(2)
      expect(result.find((r) => r.sizeBin === '5-6cm')?.count).toBe(2)
      expect(result.find((r) => r.sizeBin === '10-11cm')?.count).toBe(1)
    })

    it('should filter by speciesId when provided', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      await getSizeFrequency('species-123')

      expect(mockPrisma.observation.findMany).toHaveBeenCalledWith({
        where: { status: 'APPROVED', speciesId: 'species-123' },
        select: { cw: true },
      })
    })

    it('should filter by gender when provided', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      await getSizeFrequency(undefined, 'female')

      expect(mockPrisma.observation.findMany).toHaveBeenCalledWith({
        where: { status: 'APPROVED', gender: 'FEMALE' },
        select: { cw: true },
      })
    })

    it('should handle empty results with zero bins', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      const result = await getSizeFrequency()

      expect(result).toHaveLength(21)
      result.forEach((r) => expect(r.count).toBe(0))
    })

    it('should place widths above 20cm into overflow bin', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([{ cw: 20.1 }, { cw: 25.9 }])

      const result = await getSizeFrequency()

      expect(result.find((r) => r.sizeBin === '20cm+')?.count).toBe(2)
    })
  })

  describe('getGenderRatio', () => {
    it('should calculate gender ratio per species', async () => {
      mockPrisma.observation.groupBy.mockResolvedValue([
        { speciesId: 's1', gender: 'MALE', _count: { _all: 2 } },
        { speciesId: 's1', gender: 'FEMALE', _count: { _all: 2 } },
        { speciesId: 's2', gender: 'MALE', _count: { _all: 1 } },
        { speciesId: 's2', gender: 'FEMALE', _count: { _all: 2 } },
      ])
      mockPrisma.species.findMany.mockResolvedValue([
        { id: 's1', scientificName: 'Scylla serrata' },
        { id: 's2', scientificName: 'Scylla olivacea' },
      ])

      const result = await getGenderRatio()

      expect(result).toHaveLength(2)
      const serrata = result.find((r) => r.species === 'Scylla serrata')
      expect(serrata?.male).toBe(2)
      expect(serrata?.female).toBe(2)
      expect(serrata?.ratio).toBe(1)

      const olivacea = result.find((r) => r.species === 'Scylla olivacea')
      expect(olivacea?.ratio).toBe(0.5)
    })

    it('should handle only male observations with Infinity ratio', async () => {
      mockPrisma.observation.groupBy.mockResolvedValue([
        { speciesId: 's1', gender: 'MALE', _count: { _all: 1 } },
      ])
      mockPrisma.species.findMany.mockResolvedValue([
        { id: 's1', scientificName: 'Scylla serrata' },
      ])

      const result = await getGenderRatio()
      const serrata = result.find((r) => r.species === 'Scylla serrata')
      expect(serrata?.ratio).toBe(Infinity)
    })

    it('should handle only female observations with 0 ratio', async () => {
      mockPrisma.observation.groupBy.mockResolvedValue([
        { speciesId: 's1', gender: 'FEMALE', _count: { _all: 1 } },
      ])
      mockPrisma.species.findMany.mockResolvedValue([
        { id: 's1', scientificName: 'Scylla serrata' },
      ])

      const result = await getGenderRatio()
      const serrata = result.find((r) => r.species === 'Scylla serrata')
      expect(serrata?.ratio).toBe(0)
    })

    it('should filter by date range when provided', async () => {
      mockPrisma.observation.groupBy.mockResolvedValue([])
      mockPrisma.species.findMany.mockResolvedValue([])
      await getGenderRatio(undefined, '2024-01-01', '2024-12-31')

      expect(mockPrisma.observation.groupBy).toHaveBeenCalledWith({
        by: ['speciesId', 'gender'],
        where: {
          status: 'APPROVED',
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        },
        _count: { _all: true },
      })
    })
  })

  describe('getConditionIndices', () => {
    it('should calculate aggregated condition indices per species', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([
        {
          cw: 5,
          bw: 62.5,
          species: { scientificName: 'Scylla serrata' },
        },
        {
          cw: 6,
          bw: 86.4,
          species: { scientificName: 'Scylla serrata' },
        },
      ])

      const result = await getConditionIndices()

      expect(result).toHaveLength(1)
      expect(result[0].species).toBe('Scylla serrata')
      expect(result[0].count).toBe(2)
      expect(result[0].meanConditionFactor).toBeGreaterThan(0)
      expect(result[0].meanCW).toBe(5.5)
      expect(result[0].meanBW).toBe(74.45)
    })

    it('should filter by speciesId when provided', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      await getConditionIndices('species-123')

      expect(mockPrisma.observation.findMany).toHaveBeenCalledWith({
        where: { status: 'APPROVED', speciesId: 'species-123' },
        select: {
          cw: true,
          bw: true,
          species: { select: { scientificName: true } },
        },
      })
    })
  })

  describe('getCW50', () => {
    it('should estimate CW50 for each species', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([
        { cw: 3, maturationStatus: 'IMMATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 4, maturationStatus: 'IMMATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 5, maturationStatus: 'MATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 6, maturationStatus: 'MATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 7, maturationStatus: 'MATURE', species: { scientificName: 'Scylla serrata' } },
      ])
      const result = await getCW50()

      expect(result).toHaveLength(1)
      expect(result[0].species).toBe('Scylla serrata')
      expect(result[0].sampleSize).toBe(5)
      expect(result[0].cw50).toBeGreaterThan(0)
      expect(result[0].confidenceInterval).toHaveLength(2)
    })

    it('should filter by speciesId when provided', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      await getCW50('species-123')

      expect(mockPrisma.observation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ speciesId: 'species-123' }),
        })
      )
    })

    it('should only include MATURE and IMMATURE observations', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      await getCW50()

      const callArgs = mockPrisma.observation.findMany.mock.calls[0][0]
      expect(callArgs.where.maturationStatus.in).toContain('MATURE')
      expect(callArgs.where.maturationStatus.in).toContain('IMMATURE')
    })
  })

  describe('getTemporalTrends', () => {
    it('should group observations by month and species', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([
        {
          createdAt: new Date('2024-01-15'),
          species: { scientificName: 'Scylla serrata' },
        },
        {
          createdAt: new Date('2024-01-20'),
          species: { scientificName: 'Scylla serrata' },
        },
        {
          createdAt: new Date('2024-02-10'),
          species: { scientificName: 'Scylla serrata' },
        },
        {
          createdAt: new Date('2024-01-05'),
          species: { scientificName: 'Scylla olivacea' },
        },
      ])
      const result = await getTemporalTrends()

      expect(result).toHaveLength(3)
      expect(result.find((r) => r.month === '2024-01' && r.species === 'Scylla serrata')?.count).toBe(2)
      expect(result.find((r) => r.month === '2024-02' && r.species === 'Scylla serrata')?.count).toBe(1)
      expect(result.find((r) => r.month === '2024-01' && r.species === 'Scylla olivacea')?.count).toBe(1)
    })

    it('should sort results by month', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([
        { createdAt: new Date('2024-03-01'), species: { scientificName: 'Scylla serrata' } },
        { createdAt: new Date('2024-01-01'), species: { scientificName: 'Scylla serrata' } },
        { createdAt: new Date('2024-02-01'), species: { scientificName: 'Scylla serrata' } },
      ])
      const result = await getTemporalTrends()

      expect(result[0].month).toBe('2024-01')
      expect(result[1].month).toBe('2024-02')
      expect(result[2].month).toBe('2024-03')
    })

    it('should sort by species when months match', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([
        { createdAt: new Date('2024-01-02'), species: { scientificName: 'Scylla olivacea' } },
        { createdAt: new Date('2024-01-03'), species: { scientificName: 'Scylla serrata' } },
      ])

      const result = await getTemporalTrends()

      expect(result[0].species).toBe('Scylla olivacea')
      expect(result[1].species).toBe('Scylla serrata')
    })
  })
})
