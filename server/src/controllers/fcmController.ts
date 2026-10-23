import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError, NotFoundError } from '../utils/errors'
import { getPrisma } from '../services/container'
import {
  sendObservationApproved,
  sendObservationRejected,
  sendNewSpeciesAlert,
} from '../services/fcm'

export const registerFcmToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new AppError('Authentication required', 401)
  }

  const { fcmToken } = req.body
  if (!fcmToken) {
    throw new AppError('fcmToken is required', 400)
  }

  await getPrisma().fcmToken.upsert({
    where: { userId: dbUser.id },
    update: { token: fcmToken, updatedAt: new Date() },
    create: {
      userId: dbUser.id,
      token: fcmToken,
    },
  })

  res.json({ success: true, data: { registered: true } })
})

export const unregisterFcmToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new AppError('Authentication required', 401)
  }

  await getPrisma().fcmToken.deleteMany({
    where: { userId: dbUser.id },
  })

  res.json({ success: true, data: { unregistered: true } })
})

export const notifyObservationApproved = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new AppError('Authentication required', 401)
  }

  const { observationId } = req.body
  if (!observationId) {
    throw new AppError('observationId is required', 400)
  }

  const observation = await getPrisma().observation.findUnique({
    where: { id: observationId },
    include: {
      user: { include: { fcmToken: true } },
      species: { select: { commonName: true } },
    },
  })

  if (!observation) {
    throw new NotFoundError('Observation not found')
  }

  if (!observation.user.fcmToken) {
    res.json({ success: true, data: { sent: false, reason: 'No FCM token for user' } })
    return
  }

  await sendObservationApproved(observation.user.fcmToken.token, observation.species.commonName)

  res.json({ success: true, data: { sent: true } })
})

export const notifyObservationRejected = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new AppError('Authentication required', 401)
  }

  const { observationId, reason } = req.body
  if (!observationId || !reason) {
    throw new AppError('observationId and reason are required', 400)
  }

  const observation = await getPrisma().observation.findUnique({
    where: { id: observationId },
    include: {
      user: { include: { fcmToken: true } },
      species: { select: { commonName: true } },
    },
  })

  if (!observation) {
    throw new NotFoundError('Observation not found')
  }

  if (!observation.user.fcmToken) {
    res.json({ success: true, data: { sent: false, reason: 'No FCM token for user' } })
    return
  }

  await sendObservationRejected(observation.user.fcmToken.token, observation.species.commonName, reason)

  res.json({ success: true, data: { sent: true } })
})

export const notifyNewSpecies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbUser = req.dbUser
  if (!dbUser) {
    throw new AppError('Authentication required', 401)
  }

  const { speciesName, zone } = req.body
  if (!speciesName || !zone) {
    throw new AppError('speciesName and zone are required', 400)
  }

  // Page tokens with a stable cursor so a large device base is never loaded
  // into memory in a single query.
  const PAGE = 1000
  const allTokens: string[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await getPrisma().fcmToken.findMany({
      select: { id: true, token: true },
      orderBy: { id: 'asc' },
      take: PAGE,
      cursor: cursor ? { id: cursor } : undefined,
    })
    if (page.length === 0) break
    for (const row of page) allTokens.push(row.token)
    if (page.length < PAGE) break
    cursor = page[page.length - 1].id
  }

  if (allTokens.length === 0) {
    res.json({ success: true, data: { sent: false, reason: 'No FCM tokens registered' } })
    return
  }

  const summary = await sendNewSpeciesAlert(allTokens, speciesName, zone)

  res.json({ success: true, data: { sent: true, ...summary } })
})
