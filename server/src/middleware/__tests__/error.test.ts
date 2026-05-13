import { errorHandler, notFoundHandler } from '../../middleware/error'
import { Request, Response, NextFunction } from 'express'

describe('Error Middleware', () => {
  let res: Partial<Response>

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('errorHandler', () => {
    it('should return 500 with error message', () => {
      const err = new Error('Test error')
      errorHandler(err, {} as Request, res as Response, {} as NextFunction)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      })
    })

    it('should log the error to console', () => {
      const err = new Error('Test error')
      errorHandler(err, {} as Request, res as Response, {} as NextFunction)
      expect(console.error).toHaveBeenCalledWith('Server error:', err)
    })
  })

  describe('notFoundHandler', () => {
    it('should return 404 with not found message', () => {
      notFoundHandler({} as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Route not found',
      })
    })
  })
})
