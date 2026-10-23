import { Request, Response } from 'express'
import { sanitizeFilename } from '../utils/sanitize'
import { AuthRequest } from '../middleware/auth'
import { getPrisma } from '../services/container'
import { CsvExportTable } from '@crabwatch/shared'
import { asyncHandler, ValidationError } from '../utils/errors'
import { createTranslator } from '../middleware/i18n'
import {
  listBackupFiles,
  deleteBackupFile,
  resolveBackupDownloadPath,
  runDatabaseBackup,
  streamCsvExport,
} from '../services/backup'

const SOFT_DELETE_RETENTION_DAYS = 30

export const listBackups = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const files = await listBackupFiles()
  res.json({ success: true, data: files })
})

export const deleteBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const fileName = sanitizeFilename(req.params.fileName)
  await deleteBackupFile(fileName, __)
  res.json({ success: true })
})

export const downloadBackup = asyncHandler(async (req: Request, res: Response) => {
  const __ = createTranslator(req)
  const fileName = sanitizeFilename(req.params.fileName)
  const filePath = await resolveBackupDownloadPath(fileName, __)
  res.download(filePath, fileName)
})

export const backupDatabase = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await runDatabaseBackup()
  res.json({ success: true, data: result })
})

export const exportCsv = asyncHandler(async (req: AuthRequest, res: Response) => {
  const table = (req.query.table as string)?.toLowerCase()
  const validTables: CsvExportTable[] = ['observations', 'species', 'users']

  if (!table || !validTables.includes(table as CsvExportTable)) {
    throw new ValidationError('Invalid or missing table parameter. Use: observations, species, users')
  }

  await streamCsvExport(res, table as CsvExportTable)
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
