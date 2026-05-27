import { Request, Response, NextFunction } from 'express'
import { AppError, ValidationError } from '../utils/errors'
import { createTranslator } from './i18n'
import logger from '../utils/logger'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const __ = createTranslator(req)
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
      error: __('common.internalError', 'common'),
    })
    return
  }

  // AI analysis timeout — treat as 504
  if (err.message?.includes('timed out')) {
    logger.warn({
      err: err.message,
      statusCode: 504,
      requestId,
      method: req.method,
      path: req.path,
    })
    res.status(504).json({
      success: false,
      error: __('analysis.analysis.timeout', 'analysis'),
    })
    return
  }

  // AI service not configured — treat as 503
  if (err.message?.includes('not configured') || err.message?.includes('must be configured')) {
    logger.warn({
      err: err.message,
      statusCode: 503,
      requestId,
      method: req.method,
      path: req.path,
    })
    res.status(503).json({
      success: false,
      error: __('analysis.analysis.notConfigured', 'analysis'),
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
      ? __('common.internalError', 'common')
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
  const __ = createTranslator(req)
  const requestId = (req as any).requestId || 'unknown'
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    statusCode: 404,
  })
  res.status(404).json({
    success: false,
    error: __('common.routeNotFound', 'common'),
  })
}
