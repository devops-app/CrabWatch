import { Response } from 'express'
import { Prisma, ObservationStatus as PrismaObservationStatus, Gender as PrismaObservationGender } from '@prisma/client'
import { BlobSASPermissions } from '@azure/storage-blob'
import { AuthRequest } from '../middleware/auth'
import { ObservationResponse, ObservationListResponse } from '@crabwatch/shared'
import { sendObservationApproved, sendObservationRejected } from '../services/fcm'
import { copyAnalysisBlobsToObservation, cleanupAnalysisBlobs } from '../services/foundryAgent'
import type { BlobCopyResult } from '../services/foundryAgent'
import { markAnalysisSessionDone } from './analysisController'
import { OBSERVATION_INCLUDE, parsePagination, ObservationWithRelations } from '../utils/query'
import { sanitizeText } from '../utils/sanitize'
import { getBlobService } from '../services/upload'
import { awardXP, updateStreak, isFirstObservation, isNewSpecies, incrementSubmissions, incrementApproved, generateIdempotencyKey } from '../services/rewardEngine'
import { checkAndAwardAchievements } from '../services/achievementService'
import { sendNotification } from '../services/notificationService'
import { getPrisma, getConfig } from '../services/container'
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../utils/errors'
import { createTranslator, detectLocale } from '../middleware/i18n'

type DbUser = { id: string; role: string; email: string }

async function refreshPhotoUrls(photos: string[]): Promise<string[]> {
  const refreshed: string[] = []
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  const service = getBlobService()
  const containerClient = service.getContainerClient(containerName)

  for (const url of photos) {
    if (/^(file|content|ph|assets-library):\/\//i.test(url)) {
      continue
    }

    if (!url.includes('?sv=')) {
      refreshed.push(url)
      continue
    }

    const isAnalysisBlob = url.includes('/analysis/')

    try {
      const afterContainer = url.split(`${containerName}/`)
      if (afterContainer.length < 2) {
        refreshed.push(url)
        continue
      }
      const blobPath = afterContainer.slice(1).join('/')
      const decodedName = decodeURIComponent(blobPath.split('?')[0])
      const blobClient = containerClient.getBlockBlobClient(decodedName)
      const sasUrl = await blobClient.generateSasUrl({
         startsOn: new Date(Date.now() - 2 * 60 * 1000),
         expiresOn: new Date(Date.now() + 60 * 60 * 1000),
         permissions: BlobSASPermissions.parse('r'),
       })
      refreshed.push(sasUrl)
    } catch {
      if (isAnalysisBlob) {
        refreshed.push('placeholder://missing')
      } else {
        refreshed.push(url)
      }
    }
  }
  return refreshed
}

function getDbUser(req: AuthRequest): DbUser {
  const dbUser = req.dbUser
  if (!dbUser) throw new Error('Database user not found')
  return dbUser
}

export const createObservation = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const dbUser = getDbUser(req)
  const { speciesId, cw, bw, gender, maturationStatus, lat, lng, locationMethod, photos, detectedCoin, notes, uploadSessionId } = req.body

  const photoUrls = photos as string[]
  const hasAnalysisBlobs = photoUrls.some((url: string) => url.includes('/analysis/'))
  let finalPhotos = photoUrls

  if (hasAnalysisBlobs) {
    const tempObservationId = `temp_${Date.now()}`
    const { observationUrls, cleanedUpUrls }: BlobCopyResult = await copyAnalysisBlobsToObservation(photoUrls, dbUser.id, tempObservationId)
    finalPhotos = observationUrls
    if (cleanedUpUrls.length > 0) {
      cleanupAnalysisBlobs(cleanedUpUrls).catch(() => {})
    }
    markAnalysisSessionDone(dbUser.id)
  }

  const prisma = getPrisma()
  const observation = await prisma.observation.create({
    data: {
      userId: dbUser.id,
      speciesId,
      cw,
      bw,
      gender: gender.toUpperCase(),
      maturationStatus: maturationStatus.toUpperCase(),
      lat,
      lng,
      locationMethod: locationMethod.toUpperCase(),
      photos: finalPhotos,
      uploadSessionId: uploadSessionId || null,
      detectedCoin: detectedCoin || null,
      notes: sanitizeText(notes),
    },
    include: OBSERVATION_INCLUDE,
  })

  const cfg = getConfig()
  if (cfg.engagement.enabled) {
    const userId = dbUser.id
    const obsId = observation.id
    const locale = detectLocale(req)

    incrementSubmissions(userId).catch(() => {})

    awardXP({
      userId,
      actionType: 'OBSERVATION_SUBMIT',
      sourceType: 'Observation',
      sourceId: obsId,
      idempotencyKey: generateIdempotencyKey(userId, 'OBSERVATION_SUBMIT', obsId),
      locale,
    }).catch(() => {})

    if (await isFirstObservation(userId)) {
      awardXP({
        userId,
        actionType: 'FIRST_OBSERVATION',
        sourceType: 'Observation',
        sourceId: obsId,
        reason: 'First observation bonus',
        idempotencyKey: generateIdempotencyKey(userId, 'FIRST_OBSERVATION', 'once'),
        locale,
      }).catch(() => {})

      if (cfg.engagement.missionsEnabled) {
        try {
          await prisma.onboardingProgress.upsert({
            where: {
              userId_flowCode_flowVersion_stepKey: {
                userId,
                flowCode: 'default_v1',
                flowVersion: 1,
                stepKey: 'first_observation',
              },
            },
            update: { status: 'completed', completedAt: new Date() },
            create: {
              userId,
              flowCode: 'default_v1',
              flowVersion: 1,
              stepKey: 'first_observation',
              status: 'completed',
              completedAt: new Date(),
            },
          })
        } catch { /* non-blocking */ }
      }
    }

    if (await isNewSpecies(userId, speciesId)) {
      awardXP({
        userId,
        actionType: 'NEW_SPECIES',
        sourceType: 'Observation',
        sourceId: obsId,
        reason: `New species: ${speciesId}`,
        idempotencyKey: generateIdempotencyKey(userId, 'NEW_SPECIES', speciesId),
        locale,
      }).catch(() => {})
    }

    updateStreak(userId, locale).catch(() => {})

    if (cfg.engagement.enabled) {
      checkAndAwardAchievements(userId, locale).catch(() => {})
    }

    if (cfg.engagement.missionsEnabled) {
      try {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const submitMissions = await prisma.missionDefinition.findMany({
          where: { code: { in: ['daily_submit_1', 'daily_submit_3'] }, active: true },
        })

        for (const submitMission of submitMissions) {
          const criteria = submitMission.criteria as Array<{ field?: string; value?: number }>
          const target = criteria?.[0]?.value ?? 1

          await prisma.userMission.upsert({
            where: {
              userId_missionId_assignmentDate: {
                userId,
                missionId: submitMission.id,
                assignmentDate: todayStart,
              },
            },
            update: { progressValue: { increment: 1 } },
            create: {
              userId,
              missionId: submitMission.id,
              assignmentDate: todayStart,
              progressValue: 1,
              targetValue: target,
            },
          })
        }
      } catch { /* non-blocking */ }
    }
  }

  res.status(201).json({ success: true, data: await formatObservation(observation) })
})

export const listObservations = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const dbUser = getDbUser(req)
  const { page, limit } = parsePagination(req.query)
  const speciesId = typeof req.query.speciesId === 'string' ? req.query.speciesId : undefined
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const gender = typeof req.query.gender === 'string' ? req.query.gender : undefined
  const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined
  const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined

  const skip = (page - 1) * limit
  const where: Prisma.ObservationWhereInput = {}

  if (dbUser.role === 'USER') {
    where.userId = dbUser.id
  }

  if (speciesId) where.speciesId = speciesId
  if (status) where.status = status.toUpperCase() as PrismaObservationStatus
  if (gender) where.gender = gender.toUpperCase() as PrismaObservationGender
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59')
  }

  const prisma = getPrisma()
  const [observations, total] = await Promise.all([
    prisma.observation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: OBSERVATION_INCLUDE,
    }),
    prisma.observation.count({ where }),
  ])

  const data: ObservationListResponse = {
    observations: await Promise.all(observations.map(formatObservation)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  res.json({ success: true, data })
})

export const getObservation = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const __ = createTranslator(req)
  const { id } = req.params
  const dbUser = getDbUser(req)

  const prisma = getPrisma()
  const observation = await prisma.observation.findUnique({
    where: { id },
    include: OBSERVATION_INCLUDE,
  })

  if (!observation) {
    throw new NotFoundError(__('observation.notFound', 'observation'))
  }

  if (dbUser.role === 'USER' && observation.userId !== dbUser.id) {
    throw new ForbiddenError(__('common.auth.insufficientPermissions', 'common'))
  }

  res.json({ success: true, data: await formatObservation(observation) })
})

export const validateObservation = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const dbUser = getDbUser(req)
  const { status, rejectionReason } = req.body
  const normalizedStatus = status.toLowerCase()
  const sanitizedRejectionReason = normalizedStatus === 'rejected' ? sanitizeText(rejectionReason) : null

  const prisma = getPrisma()
  const observation = await prisma.observation.update({
    where: { id },
    data: {
      status: normalizedStatus.toUpperCase(),
      validatedBy: dbUser.id,
      validatedAt: new Date(),
      rejectionReason: sanitizedRejectionReason,
    },
    include: OBSERVATION_INCLUDE,
  })

  const cfg = getConfig()
  if (cfg.engagement.enabled && normalizedStatus === 'approved') {
    const authorId = observation.userId
    const locale = detectLocale(req)

    awardXP({
      userId: authorId,
      actionType: 'OBSERVATION_APPROVED',
      sourceType: 'Observation',
      sourceId: id,
      reason: 'Observation approved by researcher',
      idempotencyKey: generateIdempotencyKey(authorId, 'OBSERVATION_APPROVED', id),
      locale,
    }).catch(() => {})

    incrementApproved(authorId).catch(() => {})

    awardXP({
      userId: dbUser.id,
      actionType: 'VALIDATION',
      sourceType: 'Observation',
      sourceId: id,
      reason: 'Validated observation',
      idempotencyKey: generateIdempotencyKey(dbUser.id, 'VALIDATION', id),
      locale,
    }).catch(() => {})

    if (cfg.engagement.enabled) {
      checkAndAwardAchievements(authorId, locale).catch(() => {})
      checkAndAwardAchievements(dbUser.id, locale).catch(() => {})
    }

    if (cfg.engagement.missionsEnabled) {
      try {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const validationMission = await prisma.missionDefinition.findFirst({
          where: { code: 'daily_validate_1', active: true },
        })

        if (validationMission) {
          const criteria = validationMission.criteria as Array<{ field?: string; value?: number }>
          const target = criteria?.[0]?.value ?? 1

          await prisma.userMission.upsert({
            where: {
              userId_missionId_assignmentDate: {
                userId: dbUser.id,
                missionId: validationMission.id,
                assignmentDate: todayStart,
              },
            },
            update: { progressValue: { increment: 1 } },
            create: {
              userId: dbUser.id,
              missionId: validationMission.id,
              assignmentDate: todayStart,
              progressValue: 1,
              targetValue: target,
            },
          })
        }
      } catch { /* non-blocking */ }
    }
  }

  const fcmToken = await prisma.fcmToken.findUnique({
    where: { userId: observation.userId },
    select: { token: true },
  })

  if (fcmToken) {
    const speciesName = observation.species.commonName
    if (normalizedStatus === 'approved') {
      sendObservationApproved(fcmToken.token, speciesName).catch(() => {})
    } else if (normalizedStatus === 'rejected' && sanitizedRejectionReason) {
      sendObservationRejected(fcmToken.token, speciesName, sanitizedRejectionReason).catch(() => {})
    }
  }

  res.json({ success: true, data: await formatObservation(observation) })
})

export const getPendingObservations = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit } = parsePagination(req.query)
  const speciesId = typeof req.query.speciesId === 'string' ? req.query.speciesId : undefined

  const skip = (page - 1) * limit
  const where: Prisma.ObservationWhereInput = { status: 'PENDING' }
  if (speciesId) where.speciesId = speciesId

  const prisma = getPrisma()
  const [observations, total] = await Promise.all([
    prisma.observation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: OBSERVATION_INCLUDE,
    }),
    prisma.observation.count({ where }),
  ])

  const data: ObservationListResponse = {
    observations: await Promise.all(observations.map(formatObservation)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }

  res.json({ success: true, data })
})

async function formatObservation(obs: ObservationWithRelations): Promise<ObservationResponse> {
  const photos = await refreshPhotoUrls(obs.photos as string[])
  return {
    id: obs.id,
    userId: obs.userId,
    user: {
      id: obs.user.id,
      name: obs.user.name,
      email: obs.user.email,
    },
    speciesId: obs.speciesId,
    species: {
      id: obs.species.id,
      scientificName: obs.species.scientificName,
      commonName: obs.species.commonName,
    },
    cw: obs.cw,
    bw: obs.bw,
    gender: obs.gender.toLowerCase() as import('@crabwatch/shared').Gender,
    maturationStatus: obs.maturationStatus.toLowerCase() as import('@crabwatch/shared').MaturationStatus,
    lat: obs.lat,
    lng: obs.lng,
    locationMethod: obs.locationMethod.toLowerCase() as import('@crabwatch/shared').LocationMethod,
    photos,
    uploadSessionId: obs.uploadSessionId,
    detectedCoin: obs.detectedCoin,
    notes: obs.notes,
    status: obs.status.toLowerCase() as import('@crabwatch/shared').ObservationStatus,
    validatedBy: obs.validatedBy,
    validatedAt: obs.validatedAt?.toISOString() ?? null,
    rejectionReason: obs.rejectionReason,
    createdAt: obs.createdAt.toISOString(),
  }
}
