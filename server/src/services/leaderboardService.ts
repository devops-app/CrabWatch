import prisma from '../config/database'

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  avatar: string | null
  level: number
  title: string
  totalXP: number
  approvedCount: number
  currentStreak: number
}

interface LeaderboardResult {
  items: LeaderboardEntry[]
  page: number
  limit: number
  total: number
  myRank?: number
}

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()

const DEFAULT_TTL = 60 * 1000 // 60 seconds
const ALL_TIME_TTL = 120 * 1000 // 2 minutes for all-time (changes less)

function getCacheKey(scope: string, seasonId?: string, page?: number, limit?: number): string {
  return `leaderboard:${scope}:${seasonId || 'none'}:${page || 1}:${limit || 50}`
}

function get<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function set(key: string, data: any, ttl: number = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  })
}

function invalidate(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

export function invalidateLeaderboardCache(): void {
  invalidate('leaderboard:')
}

export async function getLeaderboard(
  params: { scope?: 'ALL_TIME' | 'SEASONAL'; seasonId?: string; page?: number; limit?: number; currentUserId?: string } = {}
): Promise<LeaderboardResult> {
  const page = params.page || 1
  const limit = Math.min(params.limit || 50, 100)
  const skip = (page - 1) * limit

  const cacheKey = getCacheKey(params.scope || 'ALL_TIME', params.seasonId, page, limit)

  // Try cache first
  const cached = get<LeaderboardResult & { myRankXP?: number }>(cacheKey)
  if (cached) {
    // Re-compute myRank for the requesting user (not cached, depends on current user)
    let result = { ...cached }
    delete (result as any).myRankXP

    if (params.currentUserId) {
      const myRank = await computeMyRank(params.currentUserId, params.scope, params.seasonId)
      result.myRank = myRank
    }

    return result
  }

  let items: LeaderboardEntry[]
  let total: number

  if (params.scope === 'SEASONAL' && params.seasonId) {
    const seasonStats = await prisma.userSeasonStat.findMany({
      where: { seasonId: params.seasonId },
      orderBy: { totalXP: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            level: true,
            title: true,
          },
        },
      },
    })

    total = await prisma.userSeasonStat.count({
      where: { seasonId: params.seasonId },
    })

    items = seasonStats.map((stat, index) => ({
      rank: index + 1 + skip,
      userId: stat.user.id,
      name: stat.user.name,
      avatar: stat.user.avatar,
      level: stat.totalXP >= 25000 ? 100 : stat.user.level,
      title: stat.user.title,
      totalXP: stat.totalXP,
      approvedCount: stat.approvedCount,
      currentStreak: stat.currentStreak,
    }))
  } else {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        blockedAt: null,
      },
      orderBy: { totalXP: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        title: true,
        totalXP: true,
        approvedCount: true,
        currentStreak: true,
      },
    })

    total = await prisma.user.count({
      where: {
        deletedAt: null,
        blockedAt: null,
      },
    })

    items = users.map((user, index) => ({
      rank: index + 1 + skip,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
      title: user.title,
      totalXP: user.totalXP,
      approvedCount: user.approvedCount,
      currentStreak: user.currentStreak,
    }))
  }

  const result: LeaderboardResult = {
    items,
    page,
    limit,
    total,
  }

  if (params.currentUserId) {
    result.myRank = await computeMyRank(params.currentUserId, params.scope, params.seasonId)
  }

  // Cache the result (without myRank which is user-specific)
  const ttl = params.scope === 'SEASONAL' ? DEFAULT_TTL : ALL_TIME_TTL
  set(cacheKey, result, ttl)

  return result
}

async function computeMyRank(
  userId: string,
  scope?: 'ALL_TIME' | 'SEASONAL',
  seasonId?: string
): Promise<number | undefined> {
  if (scope === 'SEASONAL' && seasonId) {
    const userStat = await prisma.userSeasonStat.findUnique({
      where: {
        seasonId_userId: {
          seasonId,
          userId,
        },
      },
    })

    if (userStat) {
      const rank = await prisma.userSeasonStat.count({
        where: {
          seasonId,
          totalXP: { gt: userStat.totalXP },
        },
      })
      return rank + 1
    }
  } else {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true },
    })

    if (currentUser) {
      const rank = await prisma.user.count({
        where: {
          deletedAt: null,
          blockedAt: null,
          totalXP: { gt: currentUser.totalXP },
        },
      })
      return rank + 1
    }
  }

  return undefined
}

/**
 * Get XP history for a user.
 */
export async function getXPHistory(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit

  const [transactions, total] = await Promise.all([
    prisma.xPTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.xPTransaction.count({ where: { userId } }),
  ])

  return {
    items: transactions.map(t => ({
      id: t.id,
      actionType: t.actionType,
      deltaXP: t.deltaXP,
      sourceType: t.sourceType,
      sourceId: t.sourceId,
      reason: t.reason,
      metadata: t.metadata,
      createdAt: t.createdAt.toISOString(),
    })),
    page,
    limit,
    total,
  }
}
