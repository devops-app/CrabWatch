import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth'
import { Response, NextFunction } from 'express'

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
      req.dbUser = { id: '123', role: 'USER', email: 'test@test.com' }
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
      req.dbUser = { id: '123', role: 'ADMIN', email: 'test@test.com' }
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
})
