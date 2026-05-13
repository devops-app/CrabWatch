const mockAnalyticsService = {
  getDashboardStats: jest.fn(),
  getSizeFrequency: jest.fn(),
  getGenderRatio: jest.fn(),
  getConditionIndices: jest.fn(),
  getCW50: jest.fn(),
  getTemporalTrends: jest.fn(),
}

const mockRes = () => {
  const res: Record<string, unknown> = {}
  res.status = jest.fn().mockReturnThis()
  res.json = jest.fn()
  return res
}

jest.mock('../../services/analytics', () => mockAnalyticsService)

import {
  getDashboardStats,
  getSizeFrequency,
  getGenderRatio,
  getConditionIndices,
  getCW50,
  getTemporalTrends,
} from '../../controllers/analyticsController'
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth'

describe('Analytics Controller', () => {
  let req: Partial<AuthRequest>
  let res: Record<string, unknown>

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      query: {},
    }
    res = mockRes()
  })

  describe('getDashboardStats', () => {
    it('should return dashboard stats', async () => {
      const mockStats = {
        totalObservations: 100,
        approvedObservations: 80,
        pendingObservations: 20,
        totalSpecies: 4,
        totalContributors: 25,
        statesCovered: 10,
      }
      mockAnalyticsService.getDashboardStats.mockResolvedValue(mockStats)

      await getDashboardStats(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStats })
    })

    it('should return 500 on service error', async () => {
      mockAnalyticsService.getDashboardStats.mockRejectedValue(new Error('DB error'))

      await getDashboardStats(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Failed to get dashboard stats' })
      )
    })
  })

  describe('getSizeFrequency', () => {
    it('should return size frequency data', async () => {
      const mockData = [{ sizeBin: '0-1cm', count: 5 }]
      mockAnalyticsService.getSizeFrequency.mockResolvedValue(mockData)

      await getSizeFrequency(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData })
    })

    it('should pass speciesId and gender query params', async () => {
       mockAnalyticsService.getSizeFrequency.mockResolvedValue([])
       req.query = { speciesId: 'species-1', gender: 'female' }

       await getSizeFrequency(req as unknown as AuthRequest, res as unknown as Response)

       expect(mockAnalyticsService.getSizeFrequency).toHaveBeenCalledWith('species-1', 'female', expect.objectContaining({ page: 1, limit: 20 }))
     })
  })

describe('getGenderRatio', () => {
    it('should return gender ratio data', async () => {
      const mockData = []
      mockAnalyticsService.getGenderRatio.mockResolvedValue(mockData)

      await getGenderRatio(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData })
    })

    it('should pass query params to service', async () => {
      mockAnalyticsService.getGenderRatio.mockResolvedValue([])
      req.query = { speciesId: 'species-1', dateFrom: '2024-01-01', dateTo: '2024-12-31' }

      await getGenderRatio(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockAnalyticsService.getGenderRatio).toHaveBeenCalledWith(
         'species-1',
         '2024-01-01',
         '2024-12-31',
         expect.objectContaining({ page: 1, limit: 20 })
       )
     })
  })

  describe('getConditionIndices', () => {
    it('should return condition indices', async () => {
      const mockData = [{ id: 'obs-1', conditionFactor: 0.5 }]
      mockAnalyticsService.getConditionIndices.mockResolvedValue(mockData)

      await getConditionIndices(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData })
    })

  it('should pass speciesId when provided', async () => {
       mockAnalyticsService.getConditionIndices.mockResolvedValue([])
       req.query = { speciesId: 'species-1' }

       await getConditionIndices(req as unknown as AuthRequest, res as unknown as Response)

       expect(mockAnalyticsService.getConditionIndices).toHaveBeenCalledWith('species-1', expect.objectContaining({ page: 1, limit: 20 }))
     })
  })

  describe('getCW50', () => {
    it('should return CW50 data', async () => {
      const mockData = [{ species: 'Scylla serrata', cw50: 5.5 }]
      mockAnalyticsService.getCW50.mockResolvedValue(mockData)

      await getCW50(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData })
    })

 it('should pass speciesId when provided', async () => {
       mockAnalyticsService.getCW50.mockResolvedValue([])
       req.query = { speciesId: 'species-1' }

       await getCW50(req as unknown as AuthRequest, res as unknown as Response)

       expect(mockAnalyticsService.getCW50).toHaveBeenCalledWith('species-1', expect.objectContaining({ page: 1, limit: 20 }))
     })
  })

  describe('getTemporalTrends', () => {
    it('should return temporal trends', async () => {
      const mockData = [{ month: '2024-01', count: 10, species: 'Scylla serrata' }]
      mockAnalyticsService.getTemporalTrends.mockResolvedValue(mockData)

      await getTemporalTrends(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData })
    })

 it('should pass speciesId when provided', async () => {
       mockAnalyticsService.getTemporalTrends.mockResolvedValue([])
       req.query = { speciesId: 'species-1' }

       await getTemporalTrends(req as unknown as AuthRequest, res as unknown as Response)

       expect(mockAnalyticsService.getTemporalTrends).toHaveBeenCalledWith('species-1', expect.objectContaining({ page: 1, limit: 20 }))
     })
  })
})
