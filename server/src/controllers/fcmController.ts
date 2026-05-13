import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import {
  sendObservationApproved,
  sendObservationRejected,
  sendNewSpeciesAlert,
} from '../services/fcm'

export async function registerFcmToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { fcmToken } = req.body
    if (!fcmToken) {
      res.status(400).json({ success: false, error: 'fcmToken is required' })
      return
    }

    await prisma.fcmToken.upsert({
      where: { userId: dbUser.id },
      update: { token: fcmToken, updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        token: fcmToken,
      },
    })

    res.json({ success: true, data: { registered: true } })
  } catch (error: unknown) {
    console.error('FCM token registration error:', error)
    res.status(500).json({ success: false, error: 'Failed to register FCM token' })
  }
}

export async function unregisterFcmToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    await prisma.fcmToken.deleteMany({
      where: { userId: dbUser.id },
    })

    res.json({ success: true, data: { unregistered: true } })
  } catch (error: unknown) {
    console.error('FCM token unregistration error:', error)
    res.status(500).json({ success: false, error: 'Failed to unregister FCM token' })
  }
}

export async function notifyObservationApproved(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { observationId } = req.body
    if (!observationId) {
      res.status(400).json({ success: false, error: 'observationId is required' })
      return
    }

    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: {
        user: { include: { fcmToken: true } },
        species: { select: { commonName: true } },
      },
    })

    if (!observation) {
      res.status(404).json({ success: false, error: 'Observation not found' })
      return
    }

    if (!observation.user.fcmToken) {
      res.json({ success: true, data: { sent: false, reason: 'No FCM token for user' } })
      return
    }

    await sendObservationApproved(observation.user.fcmToken.token, observation.species.commonName)

    res.json({ success: true, data: { sent: true } })
  } catch (error: unknown) {
    console.error('Notify approved error:', error)
    res.status(500).json({ success: false, error: 'Failed to send notification' })
  }
}

export async function notifyObservationRejected(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { observationId, reason } = req.body
    if (!observationId || !reason) {
      res.status(400).json({ success: false, error: 'observationId and reason are required' })
      return
    }

    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: {
        user: { include: { fcmToken: true } },
        species: { select: { commonName: true } },
      },
    })

    if (!observation) {
      res.status(404).json({ success: false, error: 'Observation not found' })
      return
    }

    if (!observation.user.fcmToken) {
      res.json({ success: true, data: { sent: false, reason: 'No FCM token for user' } })
      return
    }

    await sendObservationRejected(observation.user.fcmToken.token, observation.species.commonName, reason)

    res.json({ success: true, data: { sent: true } })
  } catch (error: unknown) {
    console.error('Notify rejected error:', error)
    res.status(500).json({ success: false, error: 'Failed to send notification' })
  }
}

export async function notifyNewSpecies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dbUser = req.dbUser
    if (!dbUser) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { speciesName, zone } = req.body
    if (!speciesName || !zone) {
      res.status(400).json({ success: false, error: 'speciesName and zone are required' })
      return
    }

    const tokens = await prisma.fcmToken.findMany({
      select: { token: true },
    })

    if (tokens.length === 0) {
      res.json({ success: true, data: { sent: false, reason: 'No FCM tokens registered' } })
      return
    }

    await sendNewSpeciesAlert(tokens.map((t) => t.token), speciesName, zone)

    res.json({ success: true, data: { sent: true } })
  } catch (error: unknown) {
    console.error('Notify new species error:', error)
    res.status(500).json({ success: false, error: 'Failed to send notification' })
  }
}
