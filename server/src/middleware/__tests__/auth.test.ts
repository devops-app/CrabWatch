import { Response, NextFunction } from 'express'

jest.mock('../../middleware/i18n', () => require('../../controllers/__tests__/i18nMock').createI18nMock())
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

import { requireAuth, requireRole, resolveUser, AuthRequest } from '../../middleware/auth'
import prisma from '../../config/database'

describe('Auth Middleware', () => {
  let req: Partial<AuthRequest>
  let res: Partial<Response>
  let next: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()
    jest.resetModules()
  })

  describe('requireAuth', () => {
    it('should return 401 when user is not authenticated', () => {
      req.user = undefined
      requireAuth(req as AuthRequest, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('should call next when user is authenticated', () => {
      req.user = { uid: '123', email: 'test@test.com' }
      requireAuth(req as AuthRequest, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('requireRole', () => {
    it('should return 401 when user is not authenticated', () => {
      req.user = undefined
      const middleware = requireRole('ADMIN', 'RESEARCHER')
      middleware(req as AuthRequest, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      })
    })

    it('should return 403 when user does not have required role', () => {
      req.user = { uid: '123', email: 'test@test.com' }
      req.dbUser = { id: '123', role: 'USER', email: 'test@test.com', preferredLocale: null }
      const middleware = requireRole('ADMIN')
      middleware(req as AuthRequest, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('should call next when user has required role', () => {
      req.user = { uid: '123', email: 'test@test.com' }
      req.dbUser = { id: '123', role: 'ADMIN', email: 'test@test.com', preferredLocale: null }
      const middleware = requireRole('ADMIN', 'RESEARCHER')
      middleware(req as AuthRequest, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should return 403 when dbUser is not set', () => {
      req.user = { uid: '123', email: 'test@test.com' }
      req.dbUser = undefined
      const middleware = requireRole('ADMIN')
      middleware(req as AuthRequest, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('resolveUser', () => {
    const adminUser = {
      id: '8d679c06-0000-4000-8000-000000000001',
      role: 'ADMIN',
      email: 'wilson.tchui@gmail.com',
      blockedAt: null,
      deletedAt: null,
      preferredLocale: null,
    }
    const userAccount = {
      id: '9e78ad17-0000-4000-8000-000000000002',
      role: 'USER',
      email: 'crabwatcher@gmail.com',
      blockedAt: null,
      deletedAt: null,
      preferredLocale: null,
    }

    beforeEach(() => {
      ;(prisma.user.findUnique as jest.Mock).mockReset()
      ;(prisma.user.findFirst as jest.Mock).mockReset()
    })

    it('resolves a UUID uid by id (not by a colliding firebaseUid)', async () => {
      // The admin's own id is the JWT uid. Another account (USER) has its
      // firebaseUid set to this same id — the old code resolved to that account.
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(adminUser)

      req.user = { uid: adminUser.id, email: adminUser.email }
      await resolveUser(req as AuthRequest, res as Response, next)

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: adminUser.id } })
      )
      expect(req.dbUser).toEqual({
        id: adminUser.id,
        role: 'ADMIN',
        email: adminUser.email,
        preferredLocale: null,
      })
      expect(next).toHaveBeenCalled()
    })

    it('falls back to email when the UUID id lookup finds no matching email', async () => {
      // Legacy collision: a UUID uid that is NOT a real user id, but the email
      // still identifies the correct account.
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(userAccount)

      req.user = { uid: '00000000-0000-4000-8000-000000000000', email: userAccount.email }
      await resolveUser(req as AuthRequest, res as Response, next)

      expect(req.dbUser).toEqual({
        id: userAccount.id,
        role: 'USER',
        email: userAccount.email,
        preferredLocale: null,
      })
    })

    it('resolves a non-UUID (Firebase) uid by firebaseUid', async () => {
      const firebaseUser = {
        id: '11111111-0000-4000-8000-000000000003',
        role: 'USER',
        email: 'fb@test.com',
        blockedAt: null,
        deletedAt: null,
        preferredLocale: null,
      }
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(firebaseUser)

      req.user = { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz01', email: firebaseUser.email }
      await resolveUser(req as AuthRequest, res as Response, next)

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { firebaseUid: 'AbCdEfGhIjKlMnOpQrStUvWxYz01' } })
      )
      expect(req.dbUser).toEqual({
        id: firebaseUser.id,
        role: 'USER',
        email: firebaseUser.email,
        preferredLocale: null,
      })
    })

    it('does not set dbUser when no user is found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(null)

      req.user = { uid: '00000000-0000-4000-8000-000000000000', email: 'nobody@test.com' }
      await resolveUser(req as AuthRequest, res as Response, next)

      expect(req.dbUser).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })
  })
})
