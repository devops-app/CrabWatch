import { PrismaClient } from '@prisma/client'
import { getContainer } from './container'

let _prisma: PrismaClient
function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = getContainer().prisma
  }
  return _prisma
}

function getConfig() {
  return getContainer().config
}

// ==================== NOTIFICATION SERVICE ====================

export interface NotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
  channel: 'PUSH' | 'EMAIL' | 'IN_APP'
  category?: string
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (!getConfig().engagement.enabled) return

  const category = payload.category || 'system'

  try {
    // Check user preferences
    const preferences = await getPrisma().notificationPreference.findMany({
      where: { userId: payload.userId },
    })

    // Skip if user has disabled this channel+category
    const disabled = preferences.find(
      (p) => p.channel === payload.channel && p.category === category && !p.enabled
    )
    if (disabled) return

    // Create notification delivery record
    const delivery = await getPrisma().notificationDelivery.create({
      data: {
        userId: payload.userId,
        channel: payload.channel as any,
        category,
        title: payload.title,
        body: payload.body,
        payload: payload.data ?? undefined,
        status: 'QUEUED',
      },
    })

    // Dispatch based on channel
    switch (payload.channel) {
      case 'PUSH':
        await sendPushNotification(payload, delivery.id)
        break
      case 'EMAIL':
        await sendEmailNotification(payload, delivery.id)
        break
      case 'IN_APP':
        // In-app notifications are stored in DB
        await getPrisma().notificationDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SENT', sentAt: new Date() },
        })
        break
    }
  } catch (error) {
    console.error('Failed to send notification:', error)
    // Non-blocking - don't throw
  }
}

async function sendPushNotification(payload: NotificationPayload, deliveryId: string): Promise<void> {
  try {
    const fcmTokens = await getPrisma().fcmToken.findMany({
      where: { userId: payload.userId },
    })

    if (fcmTokens.length === 0) {
      await getPrisma().notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'FAILED', failureReason: 'No FCM tokens found' },
      })
      return
    }

    // Send to all tokens
    const admin = await import('firebase-admin')
    for (const token of fcmTokens) {
      try {
        await admin.messaging().send({
          token: token.token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
        })
      } catch (error) {
        console.error(`Failed to send push to token ${token.token}:`, error)
      }
    }

    await getPrisma().notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'SENT', sentAt: new Date() },
    })
  } catch (error) {
    console.error('Push notification error:', error)
    await getPrisma().notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'FAILED', failureReason: String(error) },
    }).catch(() => {})
  }
}

async function sendEmailNotification(payload: NotificationPayload, deliveryId: string): Promise<void> {
  try {
    const user = await getPrisma().user.findUnique({
      where: { id: payload.userId },
      select: { email: true, name: true },
    })

    if (!user) return

    const Resend = await import('resend').then((m) => m.Resend || m.default)
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: `CrabWatch <${process.env.RESEND_FROM_EMAIL || 'noreply@crabwatch.dsigncodehub.com'}>`,
      to: user.email,
      subject: payload.title,
      html: `<p>Hi ${user.name},</p><p>${payload.body}</p>`,
    })

    // Update delivery status
    try {
      await getPrisma().notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'SENT', sentAt: new Date() },
      })
    } catch { /* delivery record may not exist */ }
  } catch (error) {
    console.error('Email notification error:', error)
    await getPrisma().notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'FAILED', failureReason: String(error) },
    }).catch(() => {})
  }
}

// ==================== SOCIAL FEATURES ====================

export async function getTopContributors(limit = 10): Promise<any[]> {
  const users = await getPrisma().user.findMany({
    where: { approvedCount: { gt: 0 } },
    orderBy: { approvedCount: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      avatar: true,
      approvedCount: true,
      totalSubmissions: true,
      level: true,
      title: true,
      totalXP: true,
    },
  })

  return users
}

export async function getUserStats(userId: string): Promise<any> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatar: true,
      approvedCount: true,
      totalSubmissions: true,
      level: true,
      title: true,
      totalXP: true,
      currentStreak: true,
      longestStreak: true,
      createdAt: true,
    },
  })

  if (!user) return null

  // Get species diversity
  const speciesGroups = await getPrisma().observation.groupBy({
    by: ['speciesId'],
    where: {
      userId,
      status: 'APPROVED',
    },
  })
  const speciesCount = speciesGroups.length

  // Get recent observations
  const recent = await getPrisma().observation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      species: { select: { commonName: true, scientificName: true } },
    },
  })

  return {
    ...user,
    speciesCount,
    recentObservations: recent,
  }
}

export async function getCommunityStats(): Promise<any> {
  const [totalUsers, totalObservations, totalSpecies, totalApproved] = await Promise.all([
    getPrisma().user.count(),
    getPrisma().observation.count(),
    getPrisma().species.count(),
    getPrisma().observation.count({ where: { status: 'APPROVED' } }),
  ])

  // Monthly activity
  const monthlyActivity = await getPrisma().observation.groupBy({
    by: ['createdAt'],
    _count: { id: true },
    where: {
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Aggregate by month
  const monthlyMap = new Map<string, number>()
  for (const entry of monthlyActivity) {
    const month = entry.createdAt.toISOString().slice(0, 7)
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + entry._count.id)
  }

  return {
    totalUsers,
    totalObservations,
    totalSpecies,
    totalApproved,
    monthlyActivity: Array.from(monthlyMap.entries()).map(([month, count]) => ({
      month,
      count,
    })),
  }
}
