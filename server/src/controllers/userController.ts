import { Response } from 'express'
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client'
import bcrypt from 'bcrypt'
import { isFirebaseEnabled } from '../config/firebase'
import { AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import { UserResponse, UserListResponse, UserRole } from '@crabwatch/shared'

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body

    const hashedPassword = await bcrypt.hash(password, 10)

    const userData: Prisma.UserCreateInput = {
      name,
      email,
      password: hashedPassword,
      role: 'USER',
    }

    if (isFirebaseEnabled && req.user?.uid) {
      userData.firebaseUid = req.user.uid
    }

    const user = await prisma.user.create({
      data: userData,
    })

    const response: UserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase() as UserRole,
      avatar: user.avatar,
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
        role: true,
        avatar: true,
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
      role: user.role.toLowerCase() as UserRole,
      avatar: user.avatar,
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
    const { name, avatar } = req.body

    const user = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
      },
    })

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
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

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = (req.query.search as string) || ''
    const role = req.query.role as string

    const skip = (page - 1) * limit
    const where: Prisma.UserWhereInput = {}

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
          role: true,
          avatar: true,
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
        role: u.role.toLowerCase() as UserRole,
        avatar: u.avatar,
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
