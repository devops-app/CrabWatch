import { Response } from 'express'
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { isFirebaseEnabled } from '../config/firebase'
import { AuthRequest } from '../middleware/auth'
import { getPrisma } from '../services/container'
import { UserResponse, UserListResponse, UserRole } from '@crabwatch/shared'
import { asyncHandler, AppError, ConflictError, NotFoundError, ValidationError } from '../utils/errors'

const SOFT_DELETE_RETENTION_DAYS = 30

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phoneCode, phoneNumber, addressLine1, addressLine2, addressLine3, state, postcode, country, password, inviteToken } = req.body

  let assignedRole = 'USER'
  const db = getPrisma()

  if (inviteToken) {
    const invite = await db.invite.findUnique({ where: { token: inviteToken } })

    if (!invite) {
      throw new ValidationError('Invalid invite token')
    }

    if (invite.used) {
      throw new ValidationError('This invite has already been used')
    }

    if (new Date() > new Date(invite.expiresAt)) {
      throw new ValidationError('This invite has expired')
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new ValidationError('Email does not match the invite')
    }

    assignedRole = invite.role
    await db.invite.update({
      where: { token: inviteToken },
      data: { used: true },
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const userData: Prisma.UserCreateInput = {
    name,
    email,
    password: hashedPassword,
    role: assignedRole,
    phoneCode,
    phoneNumber,
    addressLine1,
    state,
    postcode,
    country,
    ...(addressLine2 && { addressLine2 }),
    ...(addressLine3 && { addressLine3 }),
  }

  if (isFirebaseEnabled && req.user?.uid) {
    userData.firebaseUid = req.user.uid
  }

  const existingByEmail = await db.user.findUnique({ where: { email } })
  if (existingByEmail && !existingByEmail.deletedAt) {
    throw new ConflictError('An account with this email already exists')
  }
  if (existingByEmail && existingByEmail.deletedAt) {
    await db.user.update({
      where: { id: existingByEmail.id },
      data: { email: `deleted-${existingByEmail.id}@deleted.local`, firebaseUid: null },
    })
  }

  if (userData.firebaseUid) {
    const existingByFirebase = await db.user.findUnique({ where: { firebaseUid: userData.firebaseUid } })
    if (existingByFirebase) {
      if (existingByFirebase.email.toLowerCase() === email.toLowerCase() && !existingByFirebase.deletedAt) {
        throw new ConflictError('An account with this email already exists')
      }
      console.log(`Clearing firebaseUid from existing user ${existingByFirebase.id} (${existingByFirebase.email}) for new registration ${email}`)
      await db.user.update({
        where: { id: existingByFirebase.id },
        data: { firebaseUid: null },
      })
    }
  }

  const user = await db.user.create({
    data: userData,
  })

  const response: UserResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneCode: user.phoneCode,
    phoneNumber: user.phoneNumber,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    addressLine3: user.addressLine3,
    state: user.state,
    postcode: user.postcode,
    country: user.country,
    role: user.role.toLowerCase() as UserRole,
    avatar: user.avatar,
    deletedAt: user.deletedAt?.toISOString() || null,
    blockedAt: user.blockedAt?.toISOString() || null,
    blockReason: user.blockReason,
    createdAt: user.createdAt.toISOString(),
  }

  res.status(201).json({ success: true, data: response })
})

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new NotFoundError('User not found')
  }

  const db = getPrisma()
  const user = await db.user.findUnique({
    where: { id: dbUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      phoneCode: true,
      phoneNumber: true,
      addressLine1: true,
      addressLine2: true,
      addressLine3: true,
      state: true,
      postcode: true,
      country: true,
      role: true,
      avatar: true,
      deletedAt: true,
      blockedAt: true,
      blockReason: true,
      createdAt: true,
      _count: {
        select: {
          observations: {
            where: { status: 'APPROVED' },
          },
        },
      },
    },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  const response: UserResponse & { observationCount: number } = {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneCode: user.phoneCode,
    phoneNumber: user.phoneNumber,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    addressLine3: user.addressLine3,
    state: user.state,
    postcode: user.postcode,
    country: user.country,
    role: user.role.toLowerCase() as UserRole,
    avatar: user.avatar,
    deletedAt: user.deletedAt?.toISOString() || null,
    blockedAt: user.blockedAt?.toISOString() || null,
    blockReason: user.blockReason,
    createdAt: user.createdAt.toISOString(),
    observationCount: user._count.observations,
  }

  res.json({ success: true, data: response })
})

export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new NotFoundError('User not found')
  }
  const { name, phoneCode, phoneNumber, addressLine1, addressLine2, addressLine3, state, postcode, country, avatar } = req.body

  const db = getPrisma()
  const user = await db.user.update({
    where: { id: dbUser.id },
    data: {
      ...(name && { name }),
      ...(phoneCode !== undefined && { phoneCode }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(addressLine1 !== undefined && { addressLine1 }),
      ...(addressLine2 !== undefined && { addressLine2 }),
      ...(addressLine3 !== undefined && { addressLine3 }),
      ...(state !== undefined && { state }),
      ...(postcode !== undefined && { postcode }),
      ...(country !== undefined && { country }),
      ...(avatar !== undefined && { avatar }),
    },
  })

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneCode: user.phoneCode,
      phoneNumber: user.phoneNumber,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      addressLine3: user.addressLine3,
      state: user.state,
      postcode: user.postcode,
      country: user.country,
      role: user.role.toLowerCase() as UserRole,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
    },
  })
})

export const changeUserPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new NotFoundError('User not found')
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string
    newPassword: string
  }

  const db = getPrisma()
  const user = await db.user.findUnique({
    where: { id: dbUser.id },
    select: { id: true, password: true },
  })

  if (!user || !user.password) {
    throw new ValidationError('Password login is not configured for this account')
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
  if (!isCurrentPasswordValid) {
    throw new ValidationError('Current password is incorrect')
  }

  const isSameAsCurrent = await bcrypt.compare(newPassword, user.password)
  if (isSameAsCurrent) {
    throw new ValidationError('New password must be different from current password')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await db.user.update({
    where: { id: dbUser.id },
    data: { password: hashedPassword },
  })

  res.json({ success: true, data: { message: 'Password updated successfully' } })
})

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
        addressLine3: true,
        state: true,
        postcode: true,
        country: true,
        role: true,
        avatar: true,
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
      addressLine3: u.addressLine3,
      state: u.state,
      postcode: u.postcode,
      country: u.country,
      role: u.role.toLowerCase() as UserRole,
      avatar: u.avatar,
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
  const { id } = req.params
  const { role } = req.body

  const db = getPrisma()
  const user = await db.user.update({
    where: { id },
    data: { role: role.toUpperCase() },
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
  const { id } = req.params
  const dbUser = req.dbUser

  if (dbUser && id === dbUser.id) {
    throw new ValidationError('Cannot delete your own account')
  }

  const db = getPrisma()
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

export const softDeleteMyAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser

  if (!dbUser) {
    throw new NotFoundError('User not found')
  }

  const db = getPrisma()
  const user = await db.user.update({
    where: { id: dbUser.id },
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
  const { id } = req.params

  const db = getPrisma()
  const user = await db.user.findUnique({ where: { id } })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  if (!user.deletedAt) {
    throw new ValidationError('User has not been deleted')
  }

  const expiresAt = new Date(user.deletedAt.getTime() + SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    throw new ValidationError('User has exceeded retention period and cannot be restored')
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
  const { id } = req.params
  const { reason } = req.body
  const dbUser = req.dbUser

  if (dbUser && id === dbUser.id) {
    throw new ValidationError('Cannot block your own account')
  }

  const db = getPrisma()
  const user = await db.user.findUnique({ where: { id } })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  if (user.blockedAt) {
    throw new ValidationError('User is already blocked')
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
  const { id } = req.params

  const db = getPrisma()
  const user = await db.user.findUnique({ where: { id } })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  if (!user.blockedAt) {
    throw new ValidationError('User is not blocked')
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
