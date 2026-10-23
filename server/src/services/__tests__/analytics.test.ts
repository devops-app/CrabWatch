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
  $queryRaw: jest.fn(),
}

jest.mock('../../services/container', () => ({
  getContainer: () => ({ prisma: mockPrisma }),
  getPrisma: () => mockPrisma,
  getConfig: () => ({}),
}))

import {
  getDashboardStats,
  getSizeFrequency,
  getGenderRatio,
  getConditionIndices,
  getCW50,
  getSpeciesDistribution,
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
        // (5.4, 100.3) -> Pulau Pinang, (4.2, 101.9) -> no state, (1.5, 103.5) -> Johor
        statesCovered: 2,
      })
      // Pin the contributor semantics: user.count() is called with NO filter,
      // i.e. totalContributors counts every user, not just those with
      // observations. A future "contributors only" change must be deliberate.
      expect(mockPrisma.user.count).toHaveBeenCalledWith()
      expect(mockPrisma.observation.count).toHaveBeenCalledWith()
      expect(mockPrisma.observation.count).toHaveBeenCalledWith({ where: { status: 'APPROVED' } })
      expect(mockPrisma.observation.count).toHaveBeenCalledWith({ where: { status: 'PENDING' } })
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

    it('should count a state only once when multiple observations fall in it', async () => {
      mockPrisma.observation.count.mockResolvedValue(0)
      mockPrisma.species.count.mockResolvedValue(0)
      mockPrisma.user.count.mockResolvedValue(0)
      // Both points resolve to Johor (lat 1.3-2.5, lng 102.8-104.3).
      mockPrisma.observation.findMany.mockResolvedValue([
        { lat: 1.5, lng: 103.5 },
        { lat: 2.0, lng: 103.0 },
      ])

      const result = await getDashboardStats()

      expect(result.statesCovered).toBe(1)
    })

    it('should ignore observations outside any Malaysian state', async () => {
      mockPrisma.observation.count.mockResolvedValue(0)
      mockPrisma.species.count.mockResolvedValue(0)
      mockPrisma.user.count.mockResolvedValue(0)
      // (10.0, 100.0) is outside every state bounding rectangle.
      mockPrisma.observation.findMany.mockResolvedValue([
        { lat: 10.0, lng: 100.0 },
      ])

      const result = await getDashboardStats()

      expect(result.statesCovered).toBe(0)
    })
  })

  describe('getSizeFrequency', () => {
    it('should bin observations by carapace width', async () => {
      // SQL returns only non-empty bins; the service fills the 21-bin shape.
      mockPrisma.$queryRaw.mockResolvedValue([
        { size_bin: 3, count: 2 },
        { size_bin: 5, count: 2 },
        { size_bin: 10, count: 1 },
      ])

      const result = await getSizeFrequency()

      expect(result).toHaveLength(21)
      expect(result.find((r) => r.sizeBin === '3-4cm')?.count).toBe(2)
      expect(result.find((r) => r.sizeBin === '5-6cm')?.count).toBe(2)
      expect(result.find((r) => r.sizeBin === '10-11cm')?.count).toBe(1)
      // Bins with no SQL rows must be filled with zero, not dropped.
      expect(result.find((r) => r.sizeBin === '0-1cm')?.count).toBe(0)
      expect(result.find((r) => r.sizeBin === '4-5cm')?.count).toBe(0)
      expect(result.find((r) => r.sizeBin === '20cm+')?.count).toBe(0)
    })

    it('should filter by speciesId when provided', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])
      await getSizeFrequency('species-123')

      const sqlFragment = mockPrisma.$queryRaw.mock.calls[0][1] as { values: unknown[] }
      expect(sqlFragment.values).toContain('species-123')
    })

    it('should filter by gender when provided', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])
      await getSizeFrequency(undefined, 'female')

      const sqlFragment = mockPrisma.$queryRaw.mock.calls[0][1] as { values: unknown[] }
      expect(sqlFragment.values).toContain('FEMALE')
    })

    it('should reject an invalid gender value', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])

      await expect(getSizeFrequency(undefined, 'BOGUS')).rejects.toThrow(
        'Invalid gender filter'
      )
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
    })

    it('should handle empty results with zero bins', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])
      const result = await getSizeFrequency()

      expect(result).toHaveLength(21)
      result.forEach((r) => expect(r.count).toBe(0))
    })

    it('should label SQL bin 20 as the 20cm+ overflow bucket', async () => {
      // The SQL CASE (cw >= 20 -> 20) is exercised by the integration suite;
      // here we verify the service maps the overflow bin value (20) to the
      // '20cm+' label and leaves every other bin empty.
      mockPrisma.$queryRaw.mockResolvedValue([{ size_bin: 20, count: 2 }])

      const result = await getSizeFrequency()

      expect(result.find((r) => r.sizeBin === '20cm+')?.count).toBe(2)
      expect(result.find((r) => r.sizeBin === '19-20cm')?.count).toBe(0)
      expect(result.find((r) => r.sizeBin === '0-1cm')?.count).toBe(0)
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

      // Half-open range: inclusive start, exclusive next-day end so the final
      // day (2024-12-31) is fully included (Finding 3).
      expect(mockPrisma.observation.groupBy).toHaveBeenCalledWith({
        by: ['speciesId', 'gender'],
        where: {
          status: 'APPROVED',
          createdAt: {
            gte: new Date('2024-01-01'),
            lt: new Date('2025-01-01'),
          },
        },
        _count: { _all: true },
      })
    })
  })

  describe('getConditionIndices', () => {
    it('should calculate aggregated condition indices per species', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          species: 'Scylla serrata',
          count: 2,
          mean_cf: 12.5,
          median_cf: 12.4,
          min_cf: 12.3,
          max_cf: 12.7,
          std_cf: 0.2,
          mean_cw: 5.5,
          mean_bw: 74.45,
        },
      ])

      const result = await getConditionIndices()

      expect(result).toHaveLength(1)
      expect(result[0].species).toBe('Scylla serrata')
      expect(result[0].count).toBe(2)
      expect(result[0].meanConditionFactor).toBe(12.5)
      expect(result[0].medianConditionFactor).toBe(12.4)
      expect(result[0].minConditionFactor).toBe(12.3)
      expect(result[0].maxConditionFactor).toBe(12.7)
      expect(result[0].stdDevConditionFactor).toBe(0.2)
      expect(result[0].meanCW).toBe(5.5)
      expect(result[0].meanBW).toBe(74.45)
    })

    it('should filter by speciesId when provided', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])
      await getConditionIndices('species-123')

      const sqlFragment = mockPrisma.$queryRaw.mock.calls[0][1] as { values: unknown[] }
      expect(sqlFragment.values).toContain('species-123')
    })

    it('should return empty when no rows match', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])

      const result = await getConditionIndices()

      expect(result).toHaveLength(0)
    })
  })

  describe('getCW50', () => {
    it('should estimate CW50 for each species', async () => {
      // Overlapping fixture: maturity is not perfectly separated by width,
      // which is the realistic case the cumulative-share estimator must handle.
      mockPrisma.observation.findMany.mockResolvedValue([
        { cw: 3, maturationStatus: 'MATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 4, maturationStatus: 'IMMATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 5, maturationStatus: 'MATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 6, maturationStatus: 'IMMATURE', species: { scientificName: 'Scylla serrata' } },
        { cw: 7, maturationStatus: 'MATURE', species: { scientificName: 'Scylla serrata' } },
      ])
      const result = await getCW50()

      expect(result).toHaveLength(1)
      expect(result[0].species).toBe('Scylla serrata')
      expect(result[0].sampleSize).toBe(5)
      // 50% maturity crossing falls between cw=6 (0.4) and cw=7 (0.6).
      expect(Number.isFinite(result[0].cw50)).toBe(true)
      expect(result[0].cw50).toBe(6.5)
      const [lo, hi] = result[0].confidenceInterval
      expect(lo).toBe(6)
      expect(hi).toBe(7)
      expect(lo).toBeLessThanOrEqual(result[0].cw50)
      expect(hi).toBeGreaterThanOrEqual(result[0].cw50)
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
      // SQL groups by month + species and returns pre-aggregated rows.
      mockPrisma.$queryRaw.mockResolvedValue([
        { month: '2024-01', species: 'Scylla serrata', count: 2 },
        { month: '2024-02', species: 'Scylla serrata', count: 1 },
        { month: '2024-01', species: 'Scylla olivacea', count: 1 },
      ])
      const result = await getTemporalTrends()

      expect(result).toHaveLength(3)
      expect(result.find((r) => r.month === '2024-01' && r.species === 'Scylla serrata')?.count).toBe(2)
      expect(result.find((r) => r.month === '2024-02' && r.species === 'Scylla serrata')?.count).toBe(1)
      expect(result.find((r) => r.month === '2024-01' && r.species === 'Scylla olivacea')?.count).toBe(1)
    })

    it('should preserve SQL row order (month first)', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { month: '2024-01', species: 'Scylla serrata', count: 1 },
        { month: '2024-02', species: 'Scylla serrata', count: 1 },
        { month: '2024-03', species: 'Scylla serrata', count: 1 },
      ])
      const result = await getTemporalTrends()

      expect(result[0].month).toBe('2024-01')
      expect(result[1].month).toBe('2024-02')
      expect(result[2].month).toBe('2024-03')
    })

    it('should preserve SQL row order (species within a month)', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { month: '2024-01', species: 'Scylla olivacea', count: 1 },
        { month: '2024-01', species: 'Scylla serrata', count: 1 },
      ])

      const result = await getTemporalTrends()

      expect(result[0].species).toBe('Scylla olivacea')
      expect(result[1].species).toBe('Scylla serrata')
    })
  })

  describe('getSpeciesDistribution', () => {
    it('should use a half-open date range so the end day is included', async () => {
      mockPrisma.observation.groupBy.mockResolvedValue([])
      mockPrisma.species.findMany.mockResolvedValue([])
      await getSpeciesDistribution('2024-01-01', '2024-12-31')

      expect(mockPrisma.observation.groupBy).toHaveBeenCalledWith({
        by: ['speciesId'],
        where: {
          status: 'APPROVED',
          createdAt: {
            gte: new Date('2024-01-01'),
            lt: new Date('2025-01-01'),
          },
        },
        _count: { speciesId: true },
      })
    })
  })
})
