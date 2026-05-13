const mockCache = {
  getFromCache: jest.fn().mockReturnValue(null),
  setCache: jest.fn(),
  clearCache: jest.fn(),
}

jest.mock('../../utils/cache', () => mockCache)

const mockPrisma = {
  species: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
  listSpecies,
  getSpecies,
  createSpecies,
  updateSpecies,
  deleteSpecies,
} from '../../controllers/speciesController'
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth'

describe('Species Controller', () => {
  let req: Partial<AuthRequest>
  let res: Record<string, unknown>

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      body: {},
      query: {},
      params: {},
    }
    res = mockRes()
  })

  describe('listSpecies', () => {
    it('should return all species ordered by scientific name', async () => {
      mockPrisma.species.findMany.mockResolvedValue([
        {
          id: 'species-1',
          scientificName: 'Scylla olivacea',
          commonName: 'Olive Mud Crab',
          description: 'Olive crab',
          keyFeatures: [],
          images: [],
          distributionZones: [],
        },
        {
          id: 'species-2',
          scientificName: 'Scylla serrata',
          commonName: 'Blue Mud Crab',
          description: 'Blue crab',
          keyFeatures: [],
          images: [],
          distributionZones: [],
        },
      ])

      await listSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.species.findMany).toHaveBeenCalledWith({
        orderBy: { scientificName: 'asc' },
      })
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'species-1' }),
            expect.objectContaining({ id: 'species-2' }),
          ]),
        })
      )
    })

    it('should return 500 on error', async () => {
      mockPrisma.species.findMany.mockRejectedValue(new Error('DB error'))

      await listSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getSpecies', () => {
    it('should return species by id', async () => {
      const mockSpecies = {
        id: 'species-1',
        scientificName: 'Scylla serrata',
        commonName: 'Blue Mud Crab',
        description: 'A large mud crab',
        keyFeatures: [{ trait: 'Color', value: 'Blue' }],
        images: ['https://example.com/img.jpg'],
        distributionZones: [],
      }
      mockPrisma.species.findUnique.mockResolvedValue(mockSpecies)
      req.params = { id: 'species-1' }

      await getSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 'species-1', scientificName: 'Scylla serrata' }),
        })
      )
    })

    it('should return 404 when species not found', async () => {
      mockPrisma.species.findUnique.mockResolvedValue(null)
      req.params = { id: 'nonexistent' }

      await getSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Species not found' })
      )
    })
  })

  describe('createSpecies', () => {
    it('should create new species', async () => {
      const mockSpecies = {
        id: 'species-new',
        scientificName: 'Scylla paramamosain',
        commonName: 'Green Mud Crab',
        description: 'Green crab',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      }
      mockPrisma.species.create.mockResolvedValue(mockSpecies)
      req.body = {
        scientificName: 'Scylla paramamosain',
        commonName: 'Green Mud Crab',
        description: 'Green crab',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      }

      await createSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 'species-new' }),
        })
      )
    })

    it('should return 400 on creation error', async () => {
      mockPrisma.species.create.mockRejectedValue(new Error('Validation failed'))
      req.body = { scientificName: '' }

      await createSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('updateSpecies', () => {
    it('should update species fields', async () => {
      const mockSpecies = {
        id: 'species-1',
        scientificName: 'Scylla serrata',
        commonName: 'Updated Blue Crab',
        description: 'Updated description',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      }
      mockPrisma.species.update.mockResolvedValue(mockSpecies)
      req.params = { id: 'species-1' }
      req.body = { commonName: 'Updated Blue Crab', description: 'Updated description' }

      await updateSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.species.update).toHaveBeenCalledWith({
        where: { id: 'species-1' },
        data: expect.objectContaining({
          commonName: 'Updated Blue Crab',
          description: 'Updated description',
        }),
      })
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      )
    })

    it('should only update provided fields', async () => {
      const mockSpecies = {
        id: 'species-1',
        scientificName: 'Scylla serrata',
        commonName: 'Blue Mud Crab',
        description: 'Original',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      }
      mockPrisma.species.update.mockResolvedValue(mockSpecies)
      req.params = { id: 'species-1' }
      req.body = { commonName: 'New Name' }

      await updateSpecies(req as unknown as AuthRequest, res as unknown as Response)

      const callData = mockPrisma.species.update.mock.calls[0][0].data
      expect(callData.commonName).toBe('New Name')
      expect(callData.description).toBeUndefined()
    })
  })

  describe('deleteSpecies', () => {
    it('should delete species', async () => {
      mockPrisma.species.delete.mockResolvedValue({})
      req.params = { id: 'species-1' }

      await deleteSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.species.delete).toHaveBeenCalledWith({ where: { id: 'species-1' } })
      expect(res.json).toHaveBeenCalledWith({ success: true, data: null })
    })

    it('should return 500 on deletion error', async () => {
      mockPrisma.species.delete.mockRejectedValue(new Error('Foreign key constraint'))
      req.params = { id: 'species-1' }

      await deleteSpecies(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
