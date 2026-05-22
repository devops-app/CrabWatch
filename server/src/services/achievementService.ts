import { PrismaClient } from '@prisma/client'
import { getContainer } from './container'
import { awardXP } from './rewardEngine'
import { sendNotification } from './notificationService'

let _prisma: PrismaClient
function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = getContainer().prisma
  }
  return _prisma
}

// ==================== ACHIEVEMENT SERVICE ====================

export interface AchievementProgress {
  achievementId: string
  code: string
  name: string
  description: string
  category: string
  rarity: string
  iconUrl: string | null
  xpReward: number
  isHidden: boolean
  isUnlocked: boolean
  progress: number
  target: number
  earnedAt: string | null
}

export async function getAchievements(userId: string): Promise<AchievementProgress[]> {
  const achievements = await getPrisma().achievement.findMany({
    where: { isActive: true },
    orderBy: [{ isHidden: 'asc' }, { rarity: 'asc' }],
  })

  const userAchievements = await getPrisma().userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, earnedAt: true },
  })

  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.earnedAt]))

  const results: AchievementProgress[] = []

  for (const achievement of achievements) {
    const unlocked = unlockedMap.has(achievement.id)
    const progress = await calculateAchievementProgress(userId, achievement)

    if (!achievement.isHidden || unlocked) {
      results.push({
        achievementId: achievement.id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        rarity: achievement.rarity,
        iconUrl: achievement.iconUrl,
        xpReward: achievement.xpReward,
        isHidden: achievement.isHidden,
        isUnlocked: unlocked,
        progress: progress.current,
        target: progress.target,
        earnedAt: unlocked ? (unlockedMap.get(achievement.id) as Date).toISOString() : null,
      })
    }
  }

  return results
}

export async function getUnlockedAchievements(userId: string): Promise<AchievementProgress[]> {
  const all = await getAchievements(userId)
  return all.filter((a) => a.isUnlocked)
}

export async function getAchievementProgress(userId: string, achievementId: string): Promise<AchievementProgress | null> {
  const achievement = await getPrisma().achievement.findUnique({
    where: { id: achievementId },
  })
  if (!achievement) return null

  const userAchievement = await getPrisma().userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
  })

  const progress = await calculateAchievementProgress(userId, achievement)

  return {
    achievementId: achievement.id,
    code: achievement.code,
    name: achievement.name,
    description: achievement.description,
    category: achievement.category,
    rarity: achievement.rarity,
    iconUrl: achievement.iconUrl,
    xpReward: achievement.xpReward,
    isHidden: achievement.isHidden,
    isUnlocked: !!userAchievement,
    progress: progress.current,
    target: progress.target,
    earnedAt: userAchievement?.earnedAt?.toISOString() || null,
  }
}

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const newlyUnlocked: string[] = []
  const achievements = await getPrisma().achievement.findMany({
    where: { isActive: true },
  })

  for (const achievement of achievements) {
    const existing = await getPrisma().userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    })
    if (existing) continue

    const progress = await calculateAchievementProgress(userId, achievement)
    if (progress.current >= progress.target) {
      try {
        await getPrisma().userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
          },
        })

        if (achievement.xpReward > 0) {
          await awardXP({
            userId,
            actionType: 'ACHIEVEMENT_UNLOCK',
            sourceType: 'achievement',
            sourceId: achievement.id,
            idempotencyKey: `achievement:${userId}:${achievement.id}`,
            reason: `Unlocked achievement: ${achievement.name}`,
          }).catch(() => {})
        }

        sendNotification({
          userId,
          title: 'Achievement Unlocked!',
          body: `You've earned "${achievement.name}": ${achievement.description}`,
          channel: 'IN_APP',
          category: 'gamification',
          data: { type: 'achievement_unlock', code: achievement.code, name: achievement.name, rarity: achievement.rarity },
        }).catch(() => {})

        newlyUnlocked.push(achievement.code)
      } catch {
        // Duplicate or constraint error - skip
      }
    }
  }

  return newlyUnlocked
}

export async function awardAchievementManually(
  userId: string,
  achievementId: string,
  adminId: string,
  reason: string
): Promise<void> {
  const existing = await getPrisma().userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
  })
  if (existing) {
    throw new Error('User already has this achievement')
  }

  const achievement = await getPrisma().achievement.findUnique({
    where: { id: achievementId },
  })
  if (!achievement) {
    throw new Error('Achievement not found')
  }

  await getPrisma().userAchievement.create({
    data: {
      userId,
      achievementId: achievement.id,
      earnedAt: new Date(),
    },
  })

  if (achievement.xpReward > 0) {
    await awardXP({
      userId,
      actionType: 'ACHIEVEMENT_UNLOCK',
      sourceType: 'admin',
      sourceId: adminId,
      idempotencyKey: `admin_achievement:${userId}:${achievement.id}`,
      reason: `Admin awarded: ${achievement.name} (${reason})`,
    }).catch(() => {})
  }

  await getPrisma().auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'AWARD_ACHIEVEMENT',
      resourceType: 'achievement',
      resourceId: achievement.id,
      afterState: { userId, achievementId: achievement.id, reason },
      reason,
    },
  })
}

// ==================== PROGRESS CALCULATION ====================

export async function calculateAchievementProgress(
  userId: string,
  achievement: any
): Promise<{ current: number; target: number }> {
  const requirements = achievement.requirements as any[]
  if (!requirements || requirements.length === 0) {
    return { current: 0, target: 1 }
  }

  const req = requirements[0]
  const field = req.field
  const target = req.value

  switch (field) {
    case 'totalSubmissions': {
      const count = await getPrisma().observation.count({ where: { userId } })
      return { current: count, target }
    }
    case 'speciesCount': {
      const obs = await getPrisma().observation.groupBy({
        by: ['speciesId'],
        where: { userId },
        _count: { speciesId: true },
      })
      return { current: obs.length, target }
    }
    case 'longestStreak': {
      const user = await getPrisma().user.findUnique({ where: { id: userId }, select: { longestStreak: true } })
      return { current: user?.longestStreak || 0, target }
    }
    case 'approvedCount': {
      const count = await getPrisma().observation.count({
        where: { userId, status: 'APPROVED' },
      })
      return { current: count, target }
    }
    case 'level': {
      const user = await getPrisma().user.findUnique({ where: { id: userId }, select: { level: true } })
      return { current: user?.level || 1, target }
    }
    case 'nightObservations': {
      const count = await getPrisma().observation.count({
        where: {
          userId,
          AND: [
            { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            { createdAt: { lt: new Date(new Date().setHours(1, 0, 0, 0)) } },
          ],
        },
      })
      return { current: count, target }
    }
    case 'weekendObservations': {
      const obs = await getPrisma().observation.findMany({
        where: { userId },
        select: { createdAt: true },
      })
      const weekend = obs.filter((o) => {
        const day = new Date(o.createdAt).getDay()
        return day === 0 || day === 6
      }).length
      return { current: weekend, target }
    }
    default:
      return { current: 0, target }
  }
}
