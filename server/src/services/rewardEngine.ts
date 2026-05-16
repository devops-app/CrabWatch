import prisma from '../config/database'
import crypto from 'crypto'
import { invalidateLeaderboardCache } from './leaderboardService'

interface AwardXPParams {
  userId: string
  actionType: string
  sourceType: string
  sourceId?: string
  reason?: string
  idempotencyKey?: string
}

interface XPResult {
  awarded: boolean
  deltaXP: number
  newTotalXP: number
  newLevel: number
  newTitle: string
  leveledUp: boolean
  xpToNextLevel: number
}

/**
 * Award XP to a user with full idempotency, transaction safety, and cascading level/streak checks.
 */
export async function awardXP(params: AwardXPParams): Promise<XPResult> {
  const { userId, actionType, sourceType, sourceId, reason } = params

  // Generate or use provided idempotency key
  const idempotencyKey = params.idempotencyKey || `${userId}:${actionType}:${sourceType}:${sourceId || 'none'}:${Date.now()}`

  // Check for duplicate award
  const existing = await prisma.xPTransaction.findUnique({
    where: { idempotencyKey },
  })

  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    return {
      awarded: false,
      deltaXP: 0,
      newTotalXP: user?.totalXP ?? 0,
      newLevel: user?.level ?? 1,
      newTitle: user?.title ?? 'Crab Scout',
      leveledUp: false,
      xpToNextLevel: 0,
    }
  }

  // Look up active rule for this action type
  const now = new Date()
  const rule = await prisma.gamificationRule.findFirst({
    where: {
      actionType: actionType as any,
      active: true,
      OR: [
        { startsAt: null, endsAt: null },
        { startsAt: null, endsAt: { gte: now } },
        { startsAt: { lte: now }, endsAt: null },
        { startsAt: { lte: now }, endsAt: { gte: now } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!rule) {
    return {
      awarded: false,
      deltaXP: 0,
      newTotalXP: 0,
      newLevel: 1,
      newTitle: 'Crab Scout',
      leveledUp: false,
      xpToNextLevel: 0,
    }
  }

  const deltaXP = rule.xpReward

  // Perform everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create XP transaction record
    await tx.xPTransaction.create({
      data: {
        userId,
        actionType: actionType as any,
        deltaXP,
        sourceType,
        sourceId,
        idempotencyKey,
        reason,
      },
    })

    // Update user XP
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: deltaXP },
      },
    })

    // Calculate new level
    const { level, title, xpToNext } = await calculateLevelFromDB(updatedUser.totalXP, tx)

    // Check for level up
    const leveledUp = level > updatedUser.level

    if (leveledUp) {
      await tx.user.update({
        where: { id: userId },
        data: { level, title },
      })
    }

    // Log level up
    if (leveledUp) {
      await tx.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'LEVEL_UP',
          resourceType: 'User',
          resourceId: userId,
          afterState: { level, title, totalXP: updatedUser.totalXP + deltaXP },
          reason: `User leveled up to level ${level} (${title})`,
        },
      })
    }

    return {
      awarded: true,
      deltaXP,
      newTotalXP: updatedUser.totalXP + deltaXP,
      newLevel: level,
      newTitle: title,
      leveledUp,
      xpToNextLevel: xpToNext,
    }
  })

  if (result.awarded) {
    invalidateLeaderboardCache()
  }

  return result
}

/**
 * Calculate the user's level based on total XP using active LevelConfig entries.
 */
export async function calculateLevel(totalXP: number): Promise<{ level: number; title: string; xpToNextLevel: number }> {
  const activeLevels = await prisma.levelConfig.findMany({
    where: { active: true },
    orderBy: { xpThreshold: 'desc' },
  })

  for (const lvl of activeLevels) {
    if (totalXP >= lvl.xpThreshold) {
      // Find next level
      const nextLevel = activeLevels.find(l => l.xpThreshold > lvl.xpThreshold)
      const xpToNext = nextLevel ? nextLevel.xpThreshold - totalXP : 0
      return {
        level: lvl.level,
        title: lvl.title,
        xpToNextLevel: xpToNext,
      }
    }
  }

  return { level: 1, title: 'Crab Scout', xpToNextLevel: 100 }
}

/**
 * Calculate level within a transaction context.
 */
async function calculateLevelFromDB(totalXP: number, tx: any): Promise<{ level: number; title: string; xpToNext: number }> {
  const activeLevels = await tx.levelConfig.findMany({
    where: { active: true },
    orderBy: { xpThreshold: 'desc' },
  })

  for (const lvl of activeLevels) {
    if (totalXP >= lvl.xpThreshold) {
      const nextLevel = activeLevels.find((l: any) => l.xpThreshold > lvl.xpThreshold)
      const xpToNext = nextLevel ? nextLevel.xpThreshold - totalXP : 0
      return { level: lvl.level, title: lvl.title, xpToNext }
    }
  }

  return { level: 1, title: 'Crab Scout', xpToNext: 100 }
}

/**
 * Update user's observation streak.
 * Called after a new observation is submitted.
 */
export async function updateStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; streakBonus: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null
  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0)
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let newStreak = user.currentStreak
  let streakBonus = false

  if (!lastActive) {
    // First activity
    newStreak = 1
  } else if (lastActive.getTime() === today.getTime()) {
    // Already active today — no streak increment, but don't reset
    newStreak = user.currentStreak
  } else if (lastActive.getTime() === yesterday.getTime()) {
    // Consecutive day
    newStreak = user.currentStreak + 1
    streakBonus = true
  } else {
    // Gap — reset streak
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, user.longestStreak)

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
    },
  })

  // Award streak bonus if applicable
  if (streakBonus) {
    await awardXP({
      userId,
      actionType: 'STREAK_BONUS',
      sourceType: 'Streak',
      reason: `Streak bonus: ${newStreak} days`,
      idempotencyKey: `streak:${userId}:${today.toISOString().split('T')[0]}`,
    })
  }

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    streakBonus,
  }
}

/**
 * Get computed user stats with XP-to-next-level.
 */
export async function getUserStats(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const { xpToNextLevel } = await calculateLevel(user.totalXP)

  return {
    totalXP: user.totalXP,
    level: user.level,
    title: user.title,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    approvedCount: user.approvedCount,
    totalSubmissions: user.totalSubmissions,
    xpToNextLevel,
  }
}

/**
 * Check if this is the user's first observation.
 */
export async function isFirstObservation(userId: string): Promise<boolean> {
  const count = await prisma.observation.count({ where: { userId } })
  return count === 0
}

/**
 * Check if this is a new species for the user.
 */
export async function isNewSpecies(userId: string, speciesId: string): Promise<boolean> {
  const existing = await prisma.observation.findFirst({
    where: { userId, speciesId },
  })
  return !existing
}

/**
 * Increment user submission count.
 */
export async function incrementSubmissions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalSubmissions: { increment: 1 },
    },
  })
}

/**
 * Increment user approved count.
 */
export async function incrementApproved(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      approvedCount: { increment: 1 },
    },
  })
}

/**
 * Generate a deterministic idempotency key for an action.
 */
export function generateIdempotencyKey(userId: string, action: string, context: string): string {
  const raw = `${userId}:${action}:${context}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}
