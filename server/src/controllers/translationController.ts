import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError, NotFoundError, ValidationError, ConflictError } from '../utils/errors'
import { getPrisma } from '../services/container'
import { createTranslator } from '../middleware/i18n'
import { TRANSLATABLE_MODELS } from '../utils/i18n-prisma'

// Audit log helper
async function writeAuditLog(req: AuthRequest, action: string, resourceType: string, resourceId: string | null, beforeState: any, afterState: any, reason?: string): Promise<void> {
  const db = getPrisma()
  await db.auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: req.dbUser?.id || null,
      action,
      resourceType,
      resourceId,
      beforeState,
      afterState,
      reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    },
  })
}

// Validate that the resourceType and field combination is valid for the given model
function validateModelField(resourceType: string, field: string): void {
  const model = TRANSLATABLE_MODELS.find(m => m.model === resourceType)
  if (!model) {
    throw new ValidationError(`Invalid resource type: ${resourceType}`)
  }
  const validFields = Object.keys(model.fields)
  if (!validFields.includes(field)) {
    throw new ValidationError(`Invalid field "${field}" for model "${resourceType}". Valid fields: ${validFields.join(', ')}`)
  }
}

// ==================== TRANSLATION CRUD ====================

export const listTranslations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getPrisma()
  const { locale, resourceType, resourceId, field, page = '1', limit = '50' } = req.query

  const where: any = {}
  if (locale && typeof locale === 'string') where.locale = locale
  if (resourceType && typeof resourceType === 'string') where.resourceType = resourceType
  if (resourceId && typeof resourceId === 'string') where.resourceId = resourceId
  if (field && typeof field === 'string') where.field = field

  const pageNum = parseInt(page as string, 10) || 1
  const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100)
  const skip = (pageNum - 1) * limitNum

  const [translations, total] = await Promise.all([
    db.translation.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { updatedAt: 'desc' },
    }),
    db.translation.count({ where }),
  ])

  res.json({
    success: true,
    data: translations,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  })
})

export const getTranslationById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const db = getPrisma()
  const { id } = req.params

  const translation = await db.translation.findUnique({
    where: { id },
  })

  if (!translation) {
    throw new NotFoundError(__('translation.notFound', 'translation'))
  }

  res.json({ success: true, data: translation })
})

export const createTranslation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const db = getPrisma()
  const { locale, resourceType, resourceId, field, value } = req.body

  validateModelField(resourceType, field)

  try {
    const translation = await db.translation.create({
      data: {
        locale,
        resourceType,
        resourceId,
        field,
        value,
        createdBy: req.dbUser?.id || null,
      },
    })

    await writeAuditLog(
      req,
      'TRANSLATION_CREATE',
      'Translation',
      translation.id,
      null,
      { locale, resourceType, resourceId, field },
      undefined
    )

    res.status(201).json({ success: true, data: translation })
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError(__('translation.duplicate', 'translation'))
    }
    throw error
  }
})

export const updateTranslation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const db = getPrisma()
  const { id } = req.params
  const { value } = req.body

  const existing = await db.translation.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new NotFoundError(__('translation.notFound', 'translation'))
  }

  const updated = await db.translation.update({
    where: { id },
    data: { value },
  })

  await writeAuditLog(
    req,
    'TRANSLATION_UPDATE',
    'Translation',
    id,
    { value: existing.value },
    { value: updated.value },
    undefined
  )

  res.json({ success: true, data: updated })
})

export const deleteTranslation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const db = getPrisma()
  const { id } = req.params

  const existing = await db.translation.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new NotFoundError(__('translation.notFound', 'translation'))
  }

  await db.translation.delete({
    where: { id },
  })

  await writeAuditLog(
    req,
    'TRANSLATION_DELETE',
    'Translation',
    id,
    { locale: existing.locale, resourceType: existing.resourceType, resourceId: existing.resourceId, field: existing.field, value: existing.value },
    null,
    undefined
  )

  res.json({ success: true, message: __('translation.deleteSuccess', 'translation') })
})

export const bulkCreateTranslations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const db = getPrisma()
  const { translations } = req.body

  const results = {
    created: [] as any[],
    skipped: [] as any[],
    errors: [] as any[],
  }

  for (const t of translations) {
    try {
      validateModelField(t.resourceType, t.field)

      const translation = await db.translation.create({
        data: {
          locale: t.locale,
          resourceType: t.resourceType,
          resourceId: t.resourceId,
          field: t.field,
          value: t.value,
          createdBy: req.dbUser?.id || null,
        },
      })
      results.created.push(translation)
    } catch (error: any) {
      if (error.code === 'P2002') {
        results.skipped.push({
          ...t,
          reason: 'duplicate',
        })
      } else {
        results.errors.push({
          ...t,
          reason: error.message,
        })
      }
    }
  }

  if (results.created.length > 0) {
    await writeAuditLog(
      req,
      'TRANSLATION_BULK_CREATE',
      'Translation',
      null,
      null,
      { count: results.created.length, skipped: results.skipped.length, errors: results.errors.length },
      undefined
    )
  }

  res.status(201).json({
    success: true,
    data: results,
    message: __('translation.bulkCreateSuccess', 'translation'),
  })
})

export const upsertTranslation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const db = getPrisma()
  const { locale, resourceType, resourceId, field, value } = req.body

  validateModelField(resourceType, field)

  const translation = await db.translation.upsert({
    where: {
      locale_resourceType_resourceId_field: {
        locale,
        resourceType,
        resourceId,
        field,
      },
    },
    create: {
      locale,
      resourceType,
      resourceId,
      field,
      value,
      createdBy: req.dbUser?.id || null,
    },
    update: {
      value,
    },
  })

  await writeAuditLog(
    req,
    'TRANSLATION_UPSERT',
    'Translation',
    translation.id,
    null,
    { locale, resourceType, resourceId, field },
    undefined
  )

  res.json({ success: true, data: translation })
})

export const getTranslatableModels = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: TRANSLATABLE_MODELS.map(m => ({
      model: m.model,
      fields: Object.keys(m.fields),
    })),
  })
})
