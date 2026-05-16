const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
}

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
}

const mockRes = () => {
  const res: Record<string, unknown> = {}
  res.status = jest.fn().mockReturnThis()
  res.json = jest.fn()
  return res
}

jest.mock('../../config/database', () => mockPrisma)
jest.mock('bcrypt', () => mockBcrypt)

import {
  createUser,
  getUserProfile,
  updateUserProfile,
  listUsers,
  updateUserRole,
} from '../../controllers/userController'
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth'

describe('User Controller', () => {
  let req: Partial<AuthRequest & { dbUser: unknown }>
  let res: Record<string, unknown>

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      body: {},
      query: {},
      params: {},
      user: { uid: 'uid-1', email: 'test@test.com' },
      dbUser: { id: 'user-1', role: 'ADMIN', email: 'test@test.com' },
    }
    res = mockRes()
  })

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed_password')
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-new',
        name: 'New User',
        email: 'new@test.com',
        phone: '+60123456789',
        address: null,
        role: 'USER',
        avatar: null,
        createdAt: new Date('2024-01-01'),
      })
      req.body = { name: 'New User', email: 'new@test.com', password: 'password123' }

      await createUser(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(mockPrisma.user.create).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 'user-new', role: 'user' }),
        })
      )
    })

    it('should return 400 on creation error', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed_password')
      mockPrisma.user.create.mockRejectedValue(new Error('Unique constraint failed'))
      req.body = { name: 'New User', email: 'existing@test.com', password: 'password123' }

      await createUser(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Unique constraint failed' })
      )
    })
  })

  describe('getUserProfile', () => {
    it('should return user profile with observation count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        phone: '+60123456789',
        address: '123 Street',
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date('2024-01-01'),
        _count: { observations: 10 },
      })

      await getUserProfile(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'user-1',
            observationCount: 10,
            role: 'admin',
          }),
        })
      )
    })

    it('should return 404 when dbUser is missing', async () => {
      req.dbUser = undefined

      await getUserProfile(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 when user not found in database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await getUserProfile(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Updated Name',
        email: 'test@test.com',
        phone: '+60123456789',
        address: '123 Street',
        role: 'ADMIN',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: new Date('2024-01-01'),
      })
      req.body = { name: 'Updated Name', avatar: 'https://example.com/avatar.jpg' }

      await updateUserProfile(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } })
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ name: 'Updated Name' }),
        })
      )
    })

    it('should return 404 when dbUser is missing', async () => {
      req.dbUser = undefined

      await updateUserProfile(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          name: 'Test User',
          email: 'test@test.com',
          phone: '+60123456789',
          address: '123 Street',
          role: 'ADMIN',
          avatar: null,
          createdAt: new Date('2024-01-01'),
        },
      ])
      mockPrisma.user.count.mockResolvedValue(1)
      req.query = { page: '1', limit: '10' }

      await listUsers(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            users: expect.arrayContaining([
              expect.objectContaining({ id: 'user-1', role: 'admin' }),
            ]),
            total: 1,
            page: 1,
            limit: 10,
          }),
        })
      )
    })

    it('should filter by search term', async () => {
      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)
      req.query = { search: 'John' }

      await listUsers(req as unknown as AuthRequest, res as unknown as Response)

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
      expect(callArgs.where.OR).toBeDefined()
    })

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)
      req.query = { role: 'admin' }

      await listUsers(req as unknown as AuthRequest, res as unknown as Response)

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
      expect(callArgs.where.role).toBe('ADMIN')
    })
  })

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-2',
        name: 'Other User',
        email: 'other@test.com',
        role: 'RESEARCHER',
      })
      req.params = { id: 'user-2' }
      req.body = { role: 'RESEARCHER' }

      await updateUserRole(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { role: 'RESEARCHER' },
      })
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ role: 'researcher' }),
        })
      )
    })

    it('should return 500 on update error', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Record not found'))
      req.params = { id: 'nonexistent' }
      req.body = { role: 'ADMIN' }

      await updateUserRole(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
