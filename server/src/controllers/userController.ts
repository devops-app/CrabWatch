import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { isFirebaseEnabled } from '../config/firebase'
import { AuthRequest } from '../middleware/auth'
import { getPrisma } from '../services/container'
import { UserResponse, UserRole } from '@crabwatch/shared'
import { asyncHandler, ConflictError, NotFoundError, ValidationError } from '../utils/errors'
import { createTranslator, detectLocale } from '../middleware/i18n'
import { hashPassword, verifyPassword } from '../utils/password'
import logger from '../utils/logger'

const SOFT_DELETE_RETENTION_DAYS = 30

// A real Firebase Auth UID is 28-char alphanumeric, never a UUID. A UUID-valued
// uid is the user's own id (JWT is signed with `firebaseUid || id`) and must not
// be persisted as firebaseUid — doing so creates cross-account collisions.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phoneCode, phoneNumber, addressLine1, addressLine2, state, postcode, country, password, inviteToken, consentAccepted } = req.body
  const __ = createTranslator(req)
  const detectedLocale = detectLocale(req)

  let assignedRole = 'USER'
  const db = getPrisma()

  if (inviteToken) {
    const invite = await db.invite.findUnique({ where: { token: inviteToken } })

    if (!invite) {
      throw new ValidationError(__('invite.validate.invalid', 'invite'))
    }

    if (invite.used) {
      throw new ValidationError(__('invite.validate.used', 'invite'))
    }

    if (new Date() > new Date(invite.expiresAt)) {
      throw new ValidationError(__('invite.validate.expired', 'invite'))
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new ValidationError(__('invite.emailMismatch', 'invite'))
    }

    assignedRole = invite.role
    await db.invite.update({
      where: { token: inviteToken },
      data: { used: true },
    })
  }

  const hashedPassword = await hashPassword(password)

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
    preferredLocale: detectedLocale,
    ...(addressLine2 && { addressLine2 }),
    consentAccepted: consentAccepted === true,
  }

  // Only persist a real Firebase UID. A UUID uid is the user's own id and must
  // not be stored as firebaseUid (it causes cross-account resolution collisions).
  if (isFirebaseEnabled && req.user?.uid && !UUID_RE.test(req.user.uid)) {
    userData.firebaseUid = req.user.uid
  }

  const existingByEmail = await db.user.findUnique({ where: { email } })
  if (existingByEmail && !existingByEmail.deletedAt) {
    throw new ConflictError(__('register.emailTaken', 'auth'))
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
        throw new ConflictError(__('register.emailTaken', 'auth'))
      }
      logger.info({ existingUserId: existingByFirebase.id, existingEmail: existingByFirebase.email, newEmail: email }, 'Clearing firebaseUid from existing user for new registration')
      await db.user.update({
        where: { id: existingByFirebase.id },
        data: { firebaseUid: null },
      })
    }
  }

  let user
  try {
    user = await db.user.create({
      data: userData,
    })
  } catch (error) {
    // R1: The check-then-create above is not atomic. A concurrent registration
    // with the same email (or firebaseUid) can slip past the findUnique guard
    // and hit the unique constraint. Map that race to a 409 instead of a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(__('register.emailTaken', 'auth'))
    }
    throw error
  }

  const response: UserResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneCode: user.phoneCode,
    phoneNumber: user.phoneNumber,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    state: user.state,
    postcode: user.postcode,
    country: user.country,
    role: user.role.toLowerCase() as UserRole,
    avatar: user.avatar,
    preferredLocale: user.preferredLocale,
    consentAccepted: user.consentAccepted,
    deletedAt: user.deletedAt?.toISOString() || null,
    blockedAt: user.blockedAt?.toISOString() || null,
    blockReason: user.blockReason,
    createdAt: user.createdAt.toISOString(),
  }

  res.status(201).json({ success: true, data: response })
})

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new NotFoundError(__('user.notFound', 'user'))
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
      state: true,
      postcode: true,
      country: true,
      role: true,
      avatar: true,
      preferredLocale: true,
      consentAccepted: true,
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
    throw new NotFoundError(__('user.notFound', 'user'))
  }

  const response: UserResponse & { observationCount: number } = {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneCode: user.phoneCode,
    phoneNumber: user.phoneNumber,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    state: user.state,
    postcode: user.postcode,
    country: user.country,
    role: user.role.toLowerCase() as UserRole,
    avatar: user.avatar,
    preferredLocale: user.preferredLocale,
    consentAccepted: user.consentAccepted,
    deletedAt: user.deletedAt?.toISOString() || null,
    blockedAt: user.blockedAt?.toISOString() || null,
    blockReason: user.blockReason,
    createdAt: user.createdAt.toISOString(),
    observationCount: user._count.observations,
  }

  res.json({ success: true, data: response })
})

export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new NotFoundError(__('user.notFound', 'user'))
  }
  const { name, phoneCode, phoneNumber, addressLine1, addressLine2, state, postcode, country, avatar, preferredLocale } = req.body

  const db = getPrisma()
  const user = await db.user.update({
    where: { id: dbUser.id },
    data: {
      ...(name && { name }),
      ...(phoneCode !== undefined && { phoneCode }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(addressLine1 !== undefined && { addressLine1 }),
      ...(addressLine2 !== undefined && { addressLine2 }),
      ...(state !== undefined && { state }),
      ...(postcode !== undefined && { postcode }),
      ...(country !== undefined && { country }),
      ...(avatar !== undefined && { avatar }),
      ...(preferredLocale !== undefined && { preferredLocale }),
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
      state: user.state,
      postcode: user.postcode,
      country: user.country,
      role: user.role.toLowerCase() as UserRole,
      avatar: user.avatar,
      preferredLocale: user.preferredLocale,
      consentAccepted: user.consentAccepted,
      createdAt: user.createdAt.toISOString(),
    },
  })
})

export const changeUserPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new NotFoundError(__('user.notFound', 'user'))
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
    throw new ValidationError(__('user.password.notConfigured', 'user'))
  }

  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)
  if (!isCurrentPasswordValid) {
    throw new ValidationError(__('user.password.currentIncorrect', 'user'))
  }

  const isSameAsCurrent = await verifyPassword(newPassword, user.password)
  if (isSameAsCurrent) {
    throw new ValidationError(__('user.password.sameAsCurrent', 'user'))
  }

  const hashedPassword = await hashPassword(newPassword)

  await db.user.update({
    where: { id: dbUser.id },
    data: { password: hashedPassword },
  })

  res.json({ success: true, data: { message: __('user.password.changeSuccess', 'user') } })
})

export const softDeleteMyAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const dbUser = req.dbUser

  if (!dbUser) {
    throw new NotFoundError(__('user.notFound', 'user'))
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

// Admin user-management handlers live in `userAdminController.ts`. They are
// re-exported here so existing route imports (`userRoutes.ts`) and tests keep
// working without changes.
export {
  listUsers,
  updateUserRole,
  softDeleteUser,
  restoreUser,
  blockUser,
  unblockUser,
} from './userAdminController'
