import { Response } from 'express'
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'
import { getPrisma } from '../services/container'
import { UserResponse, UserListResponse, UserRole } from '@crabwatch/shared'
import { asyncHandler, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors'
import { createTranslator } from '../middleware/i18n'

const SOFT_DELETE_RETENTION_DAYS = 30

export const listUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const search = (req.query.search as string) || ''
  const role = req.query.role as string
  const includeDeleted = req.query.includeDeleted === 'true'

  const skip = (page - 1) * limit
  const where: Prisma.UserWhereInput = {}

  if (!includeDeleted) {
    where.deletedAt = null
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (role) {
    where.role = role.toUpperCase() as PrismaUserRole
  }

  const db = getPrisma()
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phoneCode: true,
        phoneNumber: true,
        addressLine1: true,
        addressLine2: true,
        state: true,
        postcode: true,
        country: true,
        role: true,
        avatar: true,
        preferredLocale: true,
        consentAccepted: true,
        blockedAt: true,
        blockReason: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ])

  const response: UserListResponse = {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phoneCode: u.phoneCode,
      phoneNumber: u.phoneNumber,
      addressLine1: u.addressLine1,
      addressLine2: u.addressLine2,
      state: u.state,
      postcode: u.postcode,
      country: u.country,
      role: u.role.toLowerCase() as UserRole,
      avatar: u.avatar,
      preferredLocale: u.preferredLocale,
      consentAccepted: u.consentAccepted,
      blockedAt: u.blockedAt?.toISOString() || null,
      blockReason: u.blockReason,
      deletedAt: u.deletedAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  }

  res.json({ success: true, data: response })
})

export const updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const { id } = req.params
  const { role } = req.body
  const dbUser = req.dbUser

  // Defensive role validation (the route also enforces this via Zod).
  const normalizedRole = String(role).toUpperCase()
  if (!['USER', 'RESEARCHER', 'ADMIN'].includes(normalizedRole)) {
    throw new ValidationError(__('user.role.invalid', 'user'))
  }

  // An admin cannot change their own role (prevents accidental lockout and
  // self-privilege changes).
  if (dbUser && id === dbUser.id) {
    throw new ForbiddenError(__('user.role.self', 'user'))
  }

  const db = getPrisma()
  const target = await db.user.findUnique({ where: { id } })
  if (!target) {
    throw new NotFoundError(__('user.notFound', 'user'))
  }

  // Last-admin guard: never allow demoting the only active admin, which would
  // leave the system with no one able to manage users.
  if (target.role === 'ADMIN' && normalizedRole !== 'ADMIN') {
    const activeAdmins = await db.user.count({
      where: { role: 'ADMIN', deletedAt: null, blockedAt: null },
    })
    if (activeAdmins <= 1) {
      throw new ConflictError(__('user.role.lastAdmin', 'user'))
    }
  }

  const user = await db.user.update({
    where: { id },
    data: { role: normalizedRole as PrismaUserRole },
  })

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase() as UserRole,
    },
  })
})

export const softDeleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const { id } = req.params
  const dbUser = req.dbUser

  if (dbUser && id === dbUser.id) {
    throw new ValidationError(__('user.delete.self', 'user'))
  }

  const db = getPrisma()
  const target = await db.user.findUnique({ where: { id } })
  if (!target) {
    throw new NotFoundError(__('user.notFound', 'user'))
  }

  const user = await db.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      firebaseUid: null,
    },
  })

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      deletedAt: user.deletedAt?.toISOString() || null,
      expiresAt: new Date(user.deletedAt!.getTime() + SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      retentionDays: SOFT_DELETE_RETENTION_DAYS,
    },
  })
})

export const restoreUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const { id } = req.params

  const db = getPrisma()
  const user = await db.user.findUnique({ where: { id } })

  if (!user) {
    throw new NotFoundError(__('user.notFound', 'user'))
  }

  if (!user.deletedAt) {
    throw new ValidationError(__('user.restore.notDeleted', 'user'))
  }

  const expiresAt = new Date(user.deletedAt.getTime() + SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    throw new ValidationError(__('user.restore.expired', 'user'))
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      deletedAt: true,
    },
  })

  res.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role.toLowerCase() as UserRole,
      deletedAt: updated.deletedAt?.toISOString() || null,
    },
  })
})

export const blockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const { id } = req.params
  const { reason } = req.body
  const dbUser = req.dbUser

  if (dbUser && id === dbUser.id) {
    throw new ValidationError(__('user.block.self', 'user'))
  }

  const db = getPrisma()
  const user = await db.user.findUnique({ where: { id } })

  if (!user) {
    throw new NotFoundError(__('user.notFound', 'user'))
  }

  if (user.blockedAt) {
    throw new ValidationError(__('user.block.alreadyBlocked', 'user'))
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      blockedAt: new Date(),
      blockReason: reason || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      blockedAt: true,
      blockReason: true,
    },
  })

  res.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role.toLowerCase() as UserRole,
      blockedAt: updated.blockedAt?.toISOString() || null,
      blockReason: updated.blockReason,
    },
  })
})

export const unblockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const { id } = req.params

  const db = getPrisma()
  const user = await db.user.findUnique({ where: { id } })

  if (!user) {
    throw new NotFoundError(__('user.notFound', 'user'))
  }

  if (!user.blockedAt) {
    throw new ValidationError(__('user.unblock.notBlocked', 'user'))
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      blockedAt: null,
      blockReason: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      blockedAt: true,
      blockReason: true,
    },
  })

  res.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role.toLowerCase() as UserRole,
      blockedAt: updated.blockedAt?.toISOString() || null,
      blockReason: updated.blockReason,
    },
  })
})
