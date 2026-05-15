import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path} - ${err.message} - ${err.stack}`)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
}

export function notFoundHandler(
  req: Request,
  res: Response
): void {
  console.warn(`[404] ${req.method} ${req.path}`)
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
}
