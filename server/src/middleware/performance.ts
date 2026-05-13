import { Request, Response, NextFunction } from 'express'

interface PerformanceMetrics {
  requests: number
  totalResponseTime: number
  avgResponseTime: number
  p95ResponseTime: number
  errors: number
}

const responseTimes: number[] = []
const metrics: PerformanceMetrics = {
  requests: 0,
  totalResponseTime: 0,
  avgResponseTime: 0,
  p95ResponseTime: 0,
  errors: 0,
}

export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    responseTimes.push(duration)

    if (responseTimes.length > 1000) {
      responseTimes.shift()
    }

    metrics.requests += 1
    metrics.totalResponseTime += duration
    metrics.avgResponseTime = metrics.totalResponseTime / metrics.requests
    metrics.p95ResponseTime = calculateP95(responseTimes)

    if (res.statusCode >= 500) {
      metrics.errors += 1
    }
  })

  next()
}

function calculateP95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * 0.95) - 1
  return sorted[Math.max(0, index)]
}

export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics }
}
