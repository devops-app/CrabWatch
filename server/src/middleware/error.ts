import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Server error:', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
}

export function notFoundHandler(
  _req: Request,
  res: Response
): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
}
