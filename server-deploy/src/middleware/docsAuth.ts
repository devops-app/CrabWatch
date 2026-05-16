import { Request, Response, NextFunction } from 'express'

const DEFAULT_TRUSTED_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

export function getTrustedIPs(): string[] {
  const env = process.env.TRUSTED_IPS
  if (!env) return DEFAULT_TRUSTED_IPS
  return env.split(',').map(ip => ip.trim())
}

export function isTrustedIP(ip: string | undefined): boolean {
  if (!ip) return false
  const trusted = getTrustedIPs()
  return trusted.includes(ip)
}

export function docsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress
  if (!isTrustedIP(ip)) {
    res.status(403).json({ success: false, error: 'Access denied: IP not allowed' })
    return
  }
  next()
}
