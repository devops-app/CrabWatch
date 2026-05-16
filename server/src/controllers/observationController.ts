import { Response } from 'express'
import { Prisma, ObservationStatus as PrismaObservationStatus, Gender as PrismaObservationGender } from '@prisma/client'
import { BlobSASPermissions } from '@azure/storage-blob'
import { AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import { ObservationResponse, ObservationListResponse } from '@crabwatch/shared'
import { sendObservationApproved, sendObservationRejected } from '../services/fcm'
import { OBSERVATION_INCLUDE, parsePagination, ObservationWithRelations } from '../utils/query'
import { sanitizeText } from '../utils/sanitize'
import { getBlobService } from '../services/upload'
import { awardXP, updateStreak, isFirstObservation, isNewSpecies, incrementSubmissions, incrementApproved, generateIdempotencyKey } from '../services/rewardEngine'
import { config } from '../config'

type DbUser = { id: string; role: string; email: string }

async function refreshPhotoUrls(photos: string[]): Promise<string[]> {
  const refreshed: string[] = []
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  const service = getBlobService()
  const containerClient = service.getContainerClient(containerName)

  for (const url of photos) {
    if (!url.includes('?sv=')) {
      refreshed.push(url)
      continue
    }
    try {
      // SAS URLs can be absolute (https://account.blob.core.windows.net/container/...)
      // or relative (/container/path?sv=...). Strip everything before container name.
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
      refreshed.push(url)
    }
  }
  return refreshed
}

function getDbUser(req: AuthRequest): DbUser {
  const dbUser = req.dbUser
  if (!dbUser) throw new Error('Database user not found')
  return dbUser
}

export async function createObservation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = getDbUser(req)
    const { speciesId, cw, bw, gender, maturationStatus, lat, lng, locationMethod, photos, detectedCoin, notes } = req.body

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
        photos: photos as string[],
        detectedCoin: detectedCoin || null,
        notes: sanitizeText(notes),
      },
      include: OBSERVATION_INCLUDE,
    })

    // Engagement: award XP and update streak (non-blocking)
    if (config.engagement.enabled) {
      const userId = dbUser.id
      const obsId = observation.id

      // Increment submission count
      incrementSubmissions(userId).catch(() => {})

      // Award XP for submission
      awardXP({
        userId,
        actionType: 'OBSERVATION_SUBMIT',
        sourceType: 'Observation',
        sourceId: obsId,
        idempotencyKey: generateIdempotencyKey(userId, 'OBSERVATION_SUBMIT', obsId),
      }).catch(() => {})

      // Check for first observation bonus
      if (await isFirstObservation(userId)) {
        awardXP({
          userId,
          actionType: 'FIRST_OBSERVATION',
          sourceType: 'Observation',
          sourceId: obsId,
          reason: 'First observation bonus',
          idempotencyKey: generateIdempotencyKey(userId, 'FIRST_OBSERVATION', 'once'),
        }).catch(() => {})

        // Complete onboarding step for first observation
        if (config.engagement.missionsEnabled) {
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

      // Check for new species bonus
      if (await isNewSpecies(userId, speciesId)) {
        awardXP({
          userId,
          actionType: 'NEW_SPECIES',
          sourceType: 'Observation',
          sourceId: obsId,
          reason: `New species: ${speciesId}`,
          idempotencyKey: generateIdempotencyKey(userId, 'NEW_SPECIES', speciesId),
        }).catch(() => {})
      }

      // Update streak
      updateStreak(userId).catch(() => {})

      // Update mission progress (non-blocking)
      if (config.engagement.missionsEnabled) {
        try {
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

          // Find mission by code
          const submitMission = await prisma.missionDefinition.findFirst({
            where: { code: { in: ['daily_submit_1', 'daily_submit_3'] }, active: true },
          })

          if (submitMission) {
            // Progress for "submit observation" mission
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
                targetValue: 1,
              },
            })
          }
        } catch { /* non-blocking */ }
      }
    }

    res.status(201).json({ success: true, data: await formatObservation(observation) })
  } catch (error: unknown) {
    console.error('Create observation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create observation'
    res.status(400).json({ success: false, error: message || 'Failed to create observation' })
  }
}

export async function listObservations(req: AuthRequest, res: Response): Promise<void> {
  try {
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
  } catch (error: unknown) {
    console.error('List observations error:', error)
    res.status(500).json({ success: false, error: 'Failed to list observations' })
  }
}

export async function getObservation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const dbUser = getDbUser(req)

    const observation = await prisma.observation.findUnique({
      where: { id },
      include: OBSERVATION_INCLUDE,
    })

    if (!observation) {
      res.status(404).json({ success: false, error: 'Observation not found' })
      return
    }

    if (dbUser.role === 'USER' && observation.userId !== dbUser.id) {
      res.status(403).json({ success: false, error: 'Access denied' })
      return
    }

    res.json({ success: true, data: await formatObservation(observation) })
  } catch (error: unknown) {
    console.error('Get observation error:', error)
    res.status(500).json({ success: false, error: 'Failed to get observation' })
  }
}

export async function validateObservation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const dbUser = getDbUser(req)
    const { status, rejectionReason } = req.body
    const normalizedStatus = status.toLowerCase()
    const sanitizedRejectionReason = normalizedStatus === 'rejected' ? sanitizeText(rejectionReason) : null

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

    // Engagement: award XP for validation and approval (non-blocking)
    if (config.engagement.enabled && normalizedStatus === 'approved') {
      const authorId = observation.userId

      // Award XP for approved observation
      awardXP({
        userId: authorId,
        actionType: 'OBSERVATION_APPROVED',
        sourceType: 'Observation',
        sourceId: id,
        reason: 'Observation approved by researcher',
        idempotencyKey: generateIdempotencyKey(authorId, 'OBSERVATION_APPROVED', id),
      }).catch(() => {})

      // Increment approved count
      incrementApproved(authorId).catch(() => {})

      // Award XP to researcher for validation
      awardXP({
        userId: dbUser.id,
        actionType: 'VALIDATION',
        sourceType: 'Observation',
        sourceId: id,
        reason: 'Validated observation',
        idempotencyKey: generateIdempotencyKey(dbUser.id, 'VALIDATION', id),
      }).catch(() => {})

      // Update mission progress for researcher (non-blocking)
      if (config.engagement.missionsEnabled) {
        try {
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

          // Progress for "validate observation" mission — skip if no matching mission defined
          // (validate missions would need to be seeded separately)
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
  } catch (error: unknown) {
    console.error('Validate observation error:', error)
    res.status(500).json({ success: false, error: 'Failed to validate observation' })
  }
}

export async function getPendingObservations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query)
    const speciesId = typeof req.query.speciesId === 'string' ? req.query.speciesId : undefined

    const skip = (page - 1) * limit
    const where: Prisma.ObservationWhereInput = { status: 'PENDING' }
    if (speciesId) where.speciesId = speciesId

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
  } catch (error: unknown) {
    console.error('Get pending observations error:', error)
    res.status(500).json({ success: false, error: 'Failed to get pending observations' })
  }
}

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
    detectedCoin: obs.detectedCoin,
    notes: obs.notes,
    status: obs.status.toLowerCase() as import('@crabwatch/shared').ObservationStatus,
    validatedBy: obs.validatedBy,
    validatedAt: obs.validatedAt?.toISOString() ?? null,
    rejectionReason: obs.rejectionReason,
    createdAt: obs.createdAt.toISOString(),
  }
}
