import { Response } from 'express'

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): void {
  res.status(statusCode).json({ success: true, data })
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400
): void {
  res.status(statusCode).json({ success: false, error: message })
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}
