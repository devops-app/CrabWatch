import { Response } from 'express'
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { isFirebaseEnabled } from '../config/firebase'
import { AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import { UserResponse, UserListResponse, UserRole } from '@crabwatch/shared'

const SOFT_DELETE_RETENTION_DAYS = 30

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, phoneCode, phoneNumber, addressLine1, addressLine2, addressLine3, state, postcode, country, password, inviteToken } = req.body

    let assignedRole = 'USER'

    if (inviteToken) {
      const invite = await prisma.invite.findUnique({ where: { token: inviteToken } })

      if (!invite) {
        res.status(400).json({ success: false, error: 'Invalid invite token' })
        return
      }

      if (invite.used) {
        res.status(400).json({ success: false, error: 'This invite has already been used' })
        return
      }

      if (new Date() > new Date(invite.expiresAt)) {
        res.status(400).json({ success: false, error: 'This invite has expired' })
        return
      }

      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        res.status(400).json({ success: false, error: 'Email does not match the invite' })
        return
      }

      assignedRole = invite.role
      await prisma.invite.update({
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

    const existingByEmail = await prisma.user.findUnique({ where: { email } })
    if (existingByEmail && !existingByEmail.deletedAt) {
      res.status(400).json({ success: false, error: 'An account with this email already exists' })
      return
    }
    if (existingByEmail && existingByEmail.deletedAt) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { email: `deleted-${existingByEmail.id}@deleted.local`, firebaseUid: null },
      })
    }

    if (userData.firebaseUid) {
      const existingByFirebase = await prisma.user.findUnique({ where: { firebaseUid: userData.firebaseUid } })
      if (existingByFirebase) {
        if (existingByFirebase.email.toLowerCase() === email.toLowerCase() && !existingByFirebase.deletedAt) {
          res.status(400).json({ success: false, error: 'An account with this email already exists' })
          return
        }
        console.log(`Clearing firebaseUid from existing user ${existingByFirebase.id} (${existingByFirebase.email}) for new registration ${email}`)
        await prisma.user.update({
          where: { id: existingByFirebase.id },
          data: { firebaseUid: null },
        })
      }
    }

    const user = await prisma.user.create({
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
  } catch (error: unknown) {
    console.error('Create user error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create user'
    res.status(400).json({ success: false, error: message || 'Failed to create user' })
  }
}

export async function getUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    const user = await prisma.user.findUnique({
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
      res.status(404).json({ success: false, error: 'User not found' })
      return
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
  } catch (error: unknown) {
    console.error('Get profile error:', error)
    res.status(500).json({ success: false, error: 'Failed to get profile' })
  }
}

export async function updateUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }
    const { name, phoneCode, phoneNumber, addressLine1, addressLine2, addressLine3, state, postcode, country, avatar } = req.body

    const user = await prisma.user.update({
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
  } catch (error: unknown) {
    console.error('Update profile error:', error)
    res.status(500).json({ success: false, error: 'Failed to update profile' })
  }
}

export async function changeUserPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword: string
      newPassword: string
    }

    const user = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: { id: true, password: true },
    })

    if (!user || !user.password) {
      res.status(400).json({ success: false, error: 'Password login is not configured for this account' })
      return
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      res.status(400).json({ success: false, error: 'Current password is incorrect' })
      return
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password)
    if (isSameAsCurrent) {
      res.status(400).json({ success: false, error: 'New password must be different from current password' })
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { password: hashedPassword },
    })

    res.json({ success: true, data: { message: 'Password updated successfully' } })
  } catch (error: unknown) {
    console.error('Change password error:', error)
    res.status(500).json({ success: false, error: 'Failed to change password' })
  }
}

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
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

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count({ where }),
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
  } catch (error: unknown) {
    console.error('List users error:', error)
    res.status(500).json({ success: false, error: 'Failed to list users' })
  }
}

export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { role } = req.body

    const user = await prisma.user.update({
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
  } catch (error: unknown) {
    console.error('Update role error:', error)
    res.status(500).json({ success: false, error: 'Failed to update role' })
  }
}

export async function softDeleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const dbUser = req.dbUser

    if (dbUser && id === dbUser.id) {
      res.status(400).json({ success: false, error: 'Cannot delete your own account' })
      return
    }

    const user = await prisma.user.update({
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
  } catch (error: unknown) {
    console.error('Soft delete error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete user' })
  }
}

export async function restoreUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({ where: { id } })

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    if (!user.deletedAt) {
      res.status(400).json({ success: false, error: 'User has not been deleted' })
      return
    }

    const expiresAt = new Date(user.deletedAt.getTime() + SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    if (new Date() > expiresAt) {
      res.status(400).json({ success: false, error: 'User has exceeded retention period and cannot be restored' })
      return
    }

    const updated = await prisma.user.update({
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
  } catch (error: unknown) {
    console.error('Restore user error:', error)
    res.status(500).json({ success: false, error: 'Failed to restore user' })
  }
}

export async function blockUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body
    const dbUser = req.dbUser

    if (dbUser && id === dbUser.id) {
      res.status(400).json({ success: false, error: 'Cannot block your own account' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id } })

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    if (user.blockedAt) {
      res.status(400).json({ success: false, error: 'User is already blocked' })
      return
    }

    const updated = await prisma.user.update({
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
  } catch (error: unknown) {
    console.error('Block user error:', error)
    res.status(500).json({ success: false, error: 'Failed to block user' })
  }
}

export async function unblockUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({ where: { id } })

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    if (!user.blockedAt) {
      res.status(400).json({ success: false, error: 'User is not blocked' })
      return
    }

    const updated = await prisma.user.update({
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
  } catch (error: unknown) {
    console.error('Unblock user error:', error)
    res.status(500).json({ success: false, error: 'Failed to unblock user' })
  }
}
