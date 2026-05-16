const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
}

const mockBcrypt = {
  compare: jest.fn(),
}

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
}

const mockFirebase = {
  auth: jest.fn().mockReturnValue({
    createUser: jest.fn(),
    createCustomToken: jest.fn(),
    verifyIdToken: jest.fn(),
  }),
}

const mockRes = () => {
  const res: Record<string, unknown> = {}
  res.status = jest.fn().mockReturnThis()
  res.json = jest.fn()
  res.cookie = jest.fn()
  res.clearCookie = jest.fn()
  return res
}

jest.mock('../../config/database', () => mockPrisma)
jest.mock('bcrypt', () => mockBcrypt)
jest.mock('jsonwebtoken', () => mockJwt)
jest.mock('../../config/firebase', () => ({
  __esModule: true,
  default: mockFirebase,
  isFirebaseEnabled: false,
}))

import { login, verifyToken } from '../../controllers/authController'
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth'

describe('Auth Controller', () => {
  let req: Partial<AuthRequest>
  let res: Record<string, unknown>

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      body: {},
    }
    res = mockRes()
  })

  describe('login', () => {
    it('should return token for valid credentials (JWT mode)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        password: 'hashed_password',
        role: 'USER',
        firebaseUid: null,
      })
      mockBcrypt.compare.mockResolvedValue(true)
      mockJwt.sign.mockReturnValue('jwt_token')
      req.body = { email: 'test@test.com', password: 'password123' }

      await login(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password')
      expect(mockJwt.sign).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: 'jwt_token',
            user: expect.objectContaining({ email: 'test@test.com', role: 'user' }),
          }),
        })
      )
    })

    it('should return 401 when user not found (prevents enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      req.body = { email: 'nonexistent@test.com', password: 'password123' }

      await login(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Invalid credentials' })
      )
    })

    it('should return 401 when password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed_password',
        role: 'USER',
      })
      mockBcrypt.compare.mockResolvedValue(false)
      req.body = { email: 'test@test.com', password: 'wrong_password' }

      await login(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Invalid credentials' })
      )
    })

    it('should return 401 when user has no password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: null,
        role: 'USER',
      })
      req.body = { email: 'test@test.com', password: 'password123' }

      await login(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      mockJwt.verify.mockReturnValue({ uid: 'user-1', email: 'test@test.com', name: 'Test User' })
      req.body = { token: 'valid_jwt_token' }

      await verifyToken(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockJwt.verify).toHaveBeenCalledWith('valid_jwt_token', expect.any(String))
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ uid: 'user-1', email: 'test@test.com' }),
        })
      )
    })

    it('should return 401 for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })
      req.body = { token: 'invalid_token' }

      await verifyToken(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Invalid token' })
      )
    })
  })
})
