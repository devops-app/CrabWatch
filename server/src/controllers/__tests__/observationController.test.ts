const mockPrisma = {
  observation: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  fcmToken: {
    findUnique: jest.fn(),
  },
}

const mockRes = () => {
  const res: Record<string, unknown> = {}
  res.status = jest.fn().mockReturnThis()
  res.json = jest.fn()
  return res
}

jest.mock('../../config/database', () => mockPrisma)

import {
  createObservation,
  listObservations,
  getObservation,
  validateObservation,
  getPendingObservations,
} from '../../controllers/observationController'
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth'

describe('Observation Controller', () => {
  let req: Partial<AuthRequest & { dbUser: unknown }>
  let res: Record<string, unknown>

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      body: {},
      query: {},
      params: {},
      dbUser: { id: 'user-1', role: 'RESEARCHER', email: 'test@test.com' },
    }
    res = mockRes()
  })

  describe('createObservation', () => {
    it('should create observation and return formatted data', async () => {
      const mockObservation = {
        id: 'obs-1',
        userId: 'user-1',
        speciesId: 'species-1',
        cw: 5.5,
        bw: 100,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 4.2,
        lng: 101.9,
        locationMethod: 'GPS',
        photos: ['https://example.com/photo.jpg'],
        notes: 'Test',
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
        validatedBy: null,
        validatedAt: null,
        rejectionReason: null,
        user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
        species: { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Blue Mud Crab' },
      }
      mockPrisma.observation.create.mockResolvedValue(mockObservation)

      req.body = {
        speciesId: 'species-1',
        cw: 5.5,
        bw: 100,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 4.2,
        lng: 101.9,
        locationMethod: 'GPS',
        photos: ['https://example.com/photo.jpg'],
        notes: 'Test',
      }

      await createObservation(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ id: 'obs-1' }) })
      )
    })

    it('should return 400 on creation error', async () => {
      mockPrisma.observation.create.mockRejectedValue(new Error('Validation failed'))
      req.body = {
        speciesId: 'invalid',
        gender: 'MALE',
        maturationStatus: 'MATURE',
        locationMethod: 'GPS',
      }

      await createObservation(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Validation failed' })
      )
    })
  })

  describe('listObservations', () => {
    it('should return paginated observations', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      mockPrisma.observation.count.mockResolvedValue(0)
      req.query = { page: '1', limit: '10' }

      await listObservations(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ observations: [], total: 0, page: 1, limit: 10 }),
        })
      )
    })

    it('should filter by speciesId when provided', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      mockPrisma.observation.count.mockResolvedValue(0)
      req.query = { speciesId: 'species-1' }

      await listObservations(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.observation.findMany).toHaveBeenCalled()
    })

    it('should filter by user for USER role', async () => {
      req.dbUser = { id: 'user-1', role: 'USER', email: 'test@test.com' }
      mockPrisma.observation.findMany.mockResolvedValue([])
      mockPrisma.observation.count.mockResolvedValue(0)

      await listObservations(req as unknown as AuthRequest, res as unknown as Response)

      const callArgs = mockPrisma.observation.findMany.mock.calls[0][0]
      expect(callArgs.where.userId).toBe('user-1')
    })
  })

  describe('getObservation', () => {
    it('should return observation by id', async () => {
      const mockObs = {
        id: 'obs-1',
        userId: 'user-1',
        speciesId: 'species-1',
        cw: 5.5,
        bw: 100,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 4.2,
        lng: 101.9,
        locationMethod: 'GPS',
        photos: [],
        notes: null,
        status: 'APPROVED',
        createdAt: new Date('2024-01-01'),
        validatedBy: null,
        validatedAt: null,
        rejectionReason: null,
        user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
        species: { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Blue Mud Crab' },
      }
      mockPrisma.observation.findUnique.mockResolvedValue(mockObs)
      req.params = { id: 'obs-1' }

      await getObservation(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ id: 'obs-1' }) })
      )
    })

    it('should return 404 when observation not found', async () => {
      mockPrisma.observation.findUnique.mockResolvedValue(null)
      req.params = { id: 'nonexistent' }

      await getObservation(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 403 for USER accessing another user observation', async () => {
      const mockObs = {
        id: 'obs-1',
        userId: 'other-user',
        user: { id: 'other-user', name: 'Other', email: 'other@test.com' },
        species: { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Blue Mud Crab' },
      }
      mockPrisma.observation.findUnique.mockResolvedValue(mockObs)
      req.dbUser = { id: 'user-1', role: 'USER', email: 'test@test.com' }
      req.params = { id: 'obs-1' }

      await getObservation(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('validateObservation', () => {
    it('should approve observation', async () => {
      const mockObs = {
        id: 'obs-1',
        userId: 'user-2',
        speciesId: 'species-1',
        cw: 5.5,
        bw: 100,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 4.2,
        lng: 101.9,
        locationMethod: 'GPS',
        photos: [],
        notes: null,
        status: 'APPROVED',
        validatedBy: 'user-1',
        validatedAt: new Date('2024-01-01'),
        rejectionReason: null,
        createdAt: new Date('2024-01-01'),
        user: { id: 'user-2', name: 'Other', email: 'other@test.com' },
        species: { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Blue Mud Crab' },
      }
      mockPrisma.observation.update.mockResolvedValue(mockObs)
      mockPrisma.fcmToken.findUnique.mockResolvedValue(null)
      req.params = { id: 'obs-1' }
      req.body = { status: 'APPROVED' }

      await validateObservation(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.observation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'obs-1' },
          data: expect.objectContaining({ status: 'APPROVED', validatedBy: 'user-1' }),
        })
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      )
    })

    it('should reject observation with reason', async () => {
      const mockObs = {
        id: 'obs-1',
        userId: 'user-2',
        speciesId: 'species-1',
        cw: 5.5,
        bw: 100,
        gender: 'MALE',
        maturationStatus: 'MATURE',
        lat: 4.2,
        lng: 101.9,
        locationMethod: 'GPS',
        photos: [],
        notes: null,
        status: 'REJECTED',
        validatedBy: 'user-1',
        validatedAt: new Date('2024-01-01'),
        rejectionReason: 'Invalid data',
        createdAt: new Date('2024-01-01'),
        user: { id: 'user-2', name: 'Other', email: 'other@test.com' },
        species: { id: 'species-1', scientificName: 'Scylla serrata', commonName: 'Blue Mud Crab' },
      }
      mockPrisma.observation.update.mockResolvedValue(mockObs)
      mockPrisma.fcmToken.findUnique.mockResolvedValue(null)
      req.params = { id: 'obs-1' }
      req.body = { status: 'rejected', rejectionReason: 'Invalid data' }

      await validateObservation(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.observation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rejectionReason: 'Invalid data' }),
        })
      )
    })
  })

  describe('getPendingObservations', () => {
    it('should return paginated pending observations', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      mockPrisma.observation.count.mockResolvedValue(0)
      req.query = { page: '1', limit: '10' }

      await getPendingObservations(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ observations: [], total: 0 }),
        })
      )

      const callArgs = mockPrisma.observation.findMany.mock.calls[0][0]
      expect(callArgs.where.status).toBe('PENDING')
    })

    it('should filter by speciesId when provided', async () => {
      mockPrisma.observation.findMany.mockResolvedValue([])
      mockPrisma.observation.count.mockResolvedValue(0)
      req.query = { speciesId: 'species-1' }

      await getPendingObservations(req as unknown as AuthRequest, res as unknown as Response)

      const callArgs = mockPrisma.observation.findMany.mock.calls[0][0]
      expect(callArgs.where.speciesId).toBe('species-1')
    })
  })
})
