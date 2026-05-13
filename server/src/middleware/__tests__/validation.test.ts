import { validate } from '../../middleware/validation'
import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

describe('Validation Middleware', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    req = { body: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()
  })

  it('should call next when validation passes', () => {
    const mockSchema = {
      safeParse: jest.fn().mockReturnValue({ success: true }),
    }
    const middleware = validate(mockSchema as ZodSchema<unknown>)
    middleware(req as Request, res as Response, next)

    expect(mockSchema.safeParse).toHaveBeenCalledWith(req.body)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should return 400 when validation fails', () => {
    const mockSchema = {
      safeParse: jest.fn().mockReturnValue({
        success: false,
        error: {
          errors: [
            { path: ['email'], message: 'Invalid email' },
            { path: ['nested', 'field'], message: 'Required' },
          ],
        },
      }),
    }
    const middleware = validate(mockSchema as ZodSchema<unknown>)
    middleware(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: [
        { field: 'email', message: 'Invalid email' },
        { field: 'nested.field', message: 'Required' },
      ],
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should handle empty errors array', () => {
    const mockSchema = {
      safeParse: jest.fn().mockReturnValue({
        success: false,
        error: { errors: [] },
      }),
    }
    const middleware = validate(mockSchema as ZodSchema<unknown>)
    middleware(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: [],
    })
  })
})
