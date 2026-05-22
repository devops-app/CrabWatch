import { Request, Response, NextFunction } from 'express'
import { UserRole } from '@prisma/client'
import jwt from 'jsonwebtoken'
import admin, { isFirebaseEnabled } from '../config/firebase'
import { getAuthCookie } from './cookieAuth'
import { config } from '../config'
import prisma from '../config/database'
import logger from '../utils/logger'

declare module 'express' {
  interface Request {
    user?: {
      uid: string
      email: string
      name?: string
    }
    dbUser?: {
      id: string
      role: string
      email: string
    }
  }
}

export type AuthRequest = Request

// Granular admin permissions
export const AdminPermission = {
  // Engagement read/write
  ENGAGEMENT_READ: 'engagement.read',
  ENGAGEMENT_WRITE: 'engagement.write',
  ENGAGEMENT_RECALCULATE: 'engagement.recalculate',
  // Campaigns
  CAMPAIGNS_WRITE: 'campaigns.write',
  // Security & moderation
  SECURITY_MODERATE: 'security.moderate',
  // Audit
  AUDIT_READ: 'audit.read',
} as const

export type AdminPermissionKey = (typeof AdminPermission)[keyof typeof AdminPermission]

// Permission matrix: role -> set of permissions
const RolePermissions: Record<UserRole, Set<AdminPermissionKey>> = {
  [UserRole.ADMIN]: new Set<AdminPermissionKey>(Object.values(AdminPermission)),
  [UserRole.RESEARCHER]: new Set<AdminPermissionKey>([]),
  [UserRole.USER]: new Set<AdminPermissionKey>([]),
}

// Check if a role has the required permission
export function hasPermission(role: UserRole, permission: AdminPermissionKey): boolean {
  return RolePermissions[role]?.has(permission) ?? false
}

// Middleware factory: require specific permission(s)
export function requirePermission(...permissions: AdminPermissionKey[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const dbRole = req.dbUser?.role as UserRole | undefined
    if (!dbRole) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' })
      return
    }

    const hasAny = permissions.some(p => hasPermission(dbRole, p))
    if (!hasAny) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' })
      return
    }
    next()
  }
}

export async function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  let token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    token = getAuthCookie(req)
  }

  if (!token) {
    req.user = undefined
    next()
    return
  }

  try {
    let decoded: { uid: string; email?: string; name?: string }
    let verified = false

    if (isFirebaseEnabled) {
      try {
        decoded = await admin.auth().verifyIdToken(token)
        verified = true
      } catch {
        // Not a Firebase ID token, try JWT
      }
    }

    if (!verified) {
      if (!config.jwtSecret) {
        _res.status(401).json({ success: false, error: 'Server misconfigured: JWT_SECRET not set' })
        return
      }
      decoded = jwt.verify(token, config.jwtSecret) as { uid: string; email?: string; name?: string }
    }

    req.user = {
      uid: decoded!.uid,
      email: decoded!.email || '',
      name: decoded!.name,
    }
    next()
  } catch (err) {
    _res.status(401).json({ success: false, error: 'Invalid or expired token' })
    return
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' })
    return
  }
  next()
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const dbRole = req.dbUser?.role as UserRole | undefined
    if (!dbRole || !roles.includes(dbRole)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' })
      return
    }
    next()
  }
}

export async function resolveUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next()
    return
  }

  let user: { id: string; role: string; email: string; blockedAt: Date | null; deletedAt: Date | null } | null = null

  try {
    const uid = req.user.uid
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)
    const where: any = {
      firebaseUid: uid,
    }
    if (isUuid) {
      where.OR = [{ firebaseUid: uid }, { id: uid }]
    }

    user = await prisma.user.findFirst({
      where,
      select: { id: true, role: true, email: true, blockedAt: true, deletedAt: true },
    })
  } catch (err) {
    logger.error({ err, msg: 'resolveUser: UUID lookup failed', requestId: (req as any).requestId })
  }

  if (!user && req.user.email) {
    try {
      user = await prisma.user.findFirst({
        where: { email: req.user.email },
        select: { id: true, role: true, email: true, blockedAt: true, deletedAt: true },
      })
    } catch (err) {
      logger.error({ err, msg: 'resolveUser: email lookup failed', requestId: (req as any).requestId })
    }
  }

  if (user) {
    if (user.deletedAt) {
      res.status(403).json({ success: false, error: 'Account has been deleted' })
      return
    }
    if (user.blockedAt) {
      res.status(403).json({ success: false, error: 'Account has been suspended' })
      return
    }
    req.dbUser = { id: user.id, role: user.role, email: user.email }
  }
  next()
}
