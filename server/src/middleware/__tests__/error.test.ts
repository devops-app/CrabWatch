import { Request, Response, NextFunction } from 'express'

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
}))
jest.mock('../../middleware/i18n', () => require('../../controllers/__tests__/i18nMock').createI18nMock())

import { errorHandler, notFoundHandler } from '../../middleware/error'

describe('Error Middleware', () => {
  let res: Partial<Response>
  let req: Partial<Request>

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    req = {
      headers: {},
      method: 'GET',
      path: '/test',
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('errorHandler', () => {
    it('should return 500 with error message in non-production', () => {
      const err = new Error('Test error')
      errorHandler(err, req as Request, res as Response, {} as NextFunction)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
      })
    })

    it('should log the error via logger', () => {
      const err = new Error('Test error')
      errorHandler(err, req as Request, res as Response, {} as NextFunction)
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('notFoundHandler', () => {
    it('should return 404 with not found message', () => {
      notFoundHandler(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Route not found',
      })
    })
  })
})
