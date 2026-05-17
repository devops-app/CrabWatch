import { Request, Response, NextFunction } from 'express'
import { AppError, ValidationError } from '../utils/errors'
import logger from '../utils/logger'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as any).requestId || 'unknown'

  if (err instanceof AppError) {
    logger.warn({
      err: err.message,
      statusCode: err.statusCode,
      requestId,
      method: req.method,
      path: req.path,
    })

    const body: any = {
      success: false,
      error: err.message,
    }

    if (err instanceof ValidationError && err.errors) {
      body.details = err.errors
    }

    res.status(err.statusCode).json(body)
    return
  }

  // Prisma P2025 warning (transaction commit on nothing) — treat as 500
  // Prisma P2025 is thrown when a transaction has no operations
  if (err.message?.includes('P2025')) {
    logger.error({
      err: err.message,
      requestId,
      method: req.method,
      path: req.path,
    })
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
    return
  }

  // Unexpected error
  logger.error({
    err: err.message,
    stack: err.stack,
    requestId,
    method: req.method,
    path: req.path,
  })

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message

  res.status(500).json({
    success: false,
    error: message,
  })
}

export function notFoundHandler(
  req: Request,
  res: Response
): void {
  const requestId = (req as any).requestId || 'unknown'
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    statusCode: 404,
  })
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
}
