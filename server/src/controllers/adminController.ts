import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
import { AuthRequest } from '../middleware/auth'
import { getPrisma } from '../services/container'
import { BackupResult } from '@crabwatch/shared'
import { asyncHandler, AppError, NotFoundError } from '../utils/errors'
import { createTranslator } from '../middleware/i18n'

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || './backups')
const SOFT_DELETE_RETENTION_DAYS = 30

export const listBackups = asyncHandler(async (_req: AuthRequest, res: Response) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.json.gz'))
    .map((f) => {
      const filePath = path.join(BACKUP_DIR, f)
      const stats = fs.statSync(filePath)
      return {
        fileName: f,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  res.json({ success: true, data: files })
})

export const deleteBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const fileName = req.params.fileName
  const filePath = path.join(BACKUP_DIR, fileName)

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError(__('admin.backup.notFound', 'admin'))
  }

  fs.unlinkSync(filePath)
  res.json({ success: true })
})

export const downloadBackup = asyncHandler(async (req: Request, res: Response) => {
  const __ = createTranslator(req)
  const fileName = req.params.fileName
  const filePath = path.join(BACKUP_DIR, fileName)

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError(__('admin.backup.notFound', 'admin'))
  }

  res.download(filePath, fileName)
})

export const backupDatabase = asyncHandler(async (_req: AuthRequest, res: Response) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const timestamp = new Date()
  const fileName = `crabwatch_backup_${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}_${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}.json.gz`
  const filePath = path.join(BACKUP_DIR, fileName)

  const db = getPrisma()
  const [observations, species, users, fcmTokens] = await Promise.all([
    db.observation.findMany({ orderBy: { createdAt: 'desc' } }),
    db.species.findMany({ orderBy: { id: 'asc' } }),
    db.user.findMany({ orderBy: { createdAt: 'desc' } }),
    db.fcmToken.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  const backupData = {
    version: '1.0',
    exportedAt: timestamp.toISOString(),
    observations,
    species,
    users,
    fcmTokens,
  }

  const json = JSON.stringify(backupData, null, 2)
  const compressed = zlib.gzipSync(json)
  fs.writeFileSync(filePath, compressed)

  const stats = fs.statSync(filePath)

  const result: BackupResult = {
    fileName,
    filePath,
    size: stats.size,
    timestamp: timestamp.toISOString(),
  }

  res.json({ success: true, data: result })
})

export const cleanupDeletedUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - SOFT_DELETE_RETENTION_DAYS)

  const db = getPrisma()
  const result = await db.$transaction(async (tx) => {
    const deletedUsers = await tx.user.findMany({
      where: {
        deletedAt: { lte: threshold },
      },
      select: { id: true, email: true },
    })

    const userIds = deletedUsers.map((u) => u.id)

    if (userIds.length === 0) {
      return { deletedCount: 0, users: [] }
    }

    await tx.observation.deleteMany({
      where: { userId: { in: userIds } },
    })

    await tx.observation.updateMany({
      where: { validatedBy: { in: userIds } },
      data: { validatedBy: null, validatedAt: null },
    })

    await tx.fcmToken.deleteMany({
      where: { userId: { in: userIds } },
    })

    await tx.user.deleteMany({
      where: { id: { in: userIds } },
    })

    return {
      deletedCount: userIds.length,
      users: deletedUsers,
    }
  })

  res.json({
    success: true,
    data: {
      deletedCount: result.deletedCount,
      users: result.users,
      retentionDays: SOFT_DELETE_RETENTION_DAYS,
    },
  })
})

export const listDeletedUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const skip = (page - 1) * limit

  const threshold = new Date()
  threshold.setDate(threshold.getDate() - SOFT_DELETE_RETENTION_DAYS)

  const db = getPrisma()
  const [users, total] = await Promise.all([
    db.user.findMany({
      where: {
        deletedAt: { not: null },
      },
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
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
        deletedAt: true,
        blockedAt: true,
        blockReason: true,
        createdAt: true,
      },
    }),
    db.user.count({
      where: {
        deletedAt: { not: null },
      },
    }),
  ])

  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + SOFT_DELETE_RETENTION_DAYS)

  res.json({
    success: true,
    data: {
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
        role: u.role.toLowerCase(),
        avatar: u.avatar,
        deletedAt: u.deletedAt?.toISOString() || null,
        blockedAt: u.blockedAt?.toISOString() || null,
        blockReason: u.blockReason,
        createdAt: u.createdAt.toISOString(),
        expiresAt: new Date(u.deletedAt!.getTime() + SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      })),
      total,
      page,
      limit,
      retentionDays: SOFT_DELETE_RETENTION_DAYS,
    },
  })
})
