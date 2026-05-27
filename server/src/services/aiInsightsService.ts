import { PrismaClient } from '@prisma/client'
import { getContainer } from './container'
import { getServerI18n } from '../config/i18n'

let _prisma: PrismaClient
function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = getContainer().prisma
  }
  return _prisma
}

// ==================== AI INSIGHTS SERVICE ====================

export interface Insight {
  id: string
  type: 'STREAK_WARNING' | 'LEVEL_UP' | 'MILESTONE' | 'SUGGESTION' | 'SEASONAL'
  title: string
  description: string
  actionText?: string
  actionUrl?: string
  priority: 'low' | 'medium' | 'high'
  expiresAt: Date
}

export async function generateInsights(userId: string, locale?: string): Promise<Insight[]> {
  const insights: Insight[] = []
  const i18n = getServerI18n()
  const lng = locale || 'en'
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
      totalXP: true,
      level: true,
      approvedCount: true,
      totalSubmissions: true,
      createdAt: true,
    },
  })

  if (!user) return insights

  // Streak warning: user has been inactive for 2+ days
  if (user.lastActiveDate) {
    const daysSinceActive = Math.floor(
      (Date.now() - user.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceActive >= 2 && user.currentStreak > 0) {
      insights.push({
        id: `streak-warning-${userId}`,
        type: 'STREAK_WARNING',
        title: i18n.t('insights.streakWarning.title', { lng }),
        description: i18n.t('insights.streakWarning.description', { lng, streak: user.currentStreak }),
        actionText: i18n.t('insights.streakWarning.actionText', { lng }),
        actionUrl: '/dashboard/capture',
        priority: 'high',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
    }
  }

  // Milestone: 10, 25, 50, 100 approved observations
  const milestones = [10, 25, 50, 100, 250, 500, 1000]
  const nextMilestone = milestones.find((m) => m > user.approvedCount)
  if (nextMilestone) {
    const remaining = nextMilestone - user.approvedCount
    const progress = Math.round((user.approvedCount / nextMilestone) * 100)
    insights.push({
      id: `milestone-${userId}-${nextMilestone}`,
      type: 'MILESTONE',
      title: i18n.t('insights.milestone.title', { lng, remaining, milestone: nextMilestone }),
      description: i18n.t('insights.milestone.description', { lng, progress }),
      actionText: i18n.t('insights.milestone.actionText', { lng }),
      actionUrl: '/dashboard/capture',
      priority: progress > 80 ? 'high' : 'medium',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
  }

 // Species diversity suggestion
  const speciesGroups = await getPrisma().observation.groupBy({
    by: ['speciesId'],
    where: { userId, status: 'APPROVED' },
  })
  const speciesCount = speciesGroups.length

  if (speciesCount < 3) {
    insights.push({
      id: `diversity-${userId}`,
      type: 'SUGGESTION',
      title: i18n.t('insights.diversity.title', { lng }),
      description: i18n.t('insights.diversity.description', { lng, count: speciesCount }),
      priority: 'low',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
  }

  // Weekly activity comparison
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const [lastWeekCount, prevWeekCount] = await Promise.all([
    getPrisma().observation.count({
      where: { userId, createdAt: { gte: lastWeek } },
    }),
    getPrisma().observation.count({
      where: { userId, createdAt: { gte: twoWeeksAgo, lt: lastWeek } },
    }),
  ])

  if (prevWeekCount > 0 && lastWeekCount < prevWeekCount) {
    insights.push({
      id: `activity-drop-${userId}`,
      type: 'SUGGESTION',
      title: i18n.t('insights.activityDrop.title', { lng }),
      description: i18n.t('insights.activityDrop.description', { lng, current: lastWeekCount, previous: prevWeekCount }),
      actionText: i18n.t('insights.activityDrop.actionText', { lng }),
      actionUrl: '/dashboard/capture',
      priority: 'medium',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    })
  }

  return insights
}
