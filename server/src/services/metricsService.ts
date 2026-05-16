import prisma from '../config/database'

export interface EngagementMetrics {
  // User engagement
  totalUsers: number
  activeUsers1d: number
  activeUsers7d: number
  activeUsers30d: number
  dau: number
  wau: number
  mau: number
  stickiness: number
  newUsers7d: number
  newUsers30d: number

  // Observation metrics
  totalObservations: number
  observations7d: number
  observations30d: number
  pendingApproval: number
  approvalRate: number

  // XP & level distribution
  avgXP: number
  medianXP: number
  xpDistribution: Array<{ level: number; title: string; count: number }>

  // Streak metrics
  avgStreak: number
  maxStreak: number
  usersWithStreak: number
  streakDistribution: Array<{ bucket: string; count: number }>

  // Mission metrics
  missionsCompleted7d: number
  missionsCompleted30d: number
  missionCompletionRate: number

  // Achievement metrics
  totalAchievements: number
  totalUnlocks: number
  avgAchievementsPerUser: number

  // Abuse metrics
  activeAbuseSignals: number
  resolvedSignals7d: number
  highRiskUsers: number

  // System health
  xpTransactions7d: number
  auditLogs7d: number
  leaderboardCacheHits: number
}

export async function getEngagementMetrics(): Promise<EngagementMetrics> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // User metrics
  const [totalUsers, activeUsers1d, activeUsers7d, activeUsers30d, newUsers7d, newUsers30d] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, blockedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, blockedAt: null, lastActiveDate: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { deletedAt: null, blockedAt: null, lastActiveDate: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { deletedAt: null, blockedAt: null, lastActiveDate: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
  ])

  const dau = activeUsers1d
  const wau = activeUsers7d
  const mau = activeUsers30d
  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0

  // Observation metrics
  const [totalObservations, observations7d, observations30d, pendingApproval, totalApproved] = await Promise.all([
    prisma.observation.count(),
    prisma.observation.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.observation.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.observation.count({ where: { status: 'PENDING' } }),
    prisma.observation.count({ where: { status: 'APPROVED' } }),
  ])

  // XP distribution by level
  const xpDistribution = await prisma.user.groupBy({
    by: ['level', 'title'],
    where: { deletedAt: null, blockedAt: null },
    _count: { id: true },
    orderBy: { level: 'asc' },
  })

  // XP stats
  const xpStats = await prisma.$queryRaw<Array<{ avg: number; median: number }>>`
    SELECT
      AVG("totalXP") as avg,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "totalXP") as median
    FROM "User"
    WHERE "deletedAt" IS NULL AND "blockedAt" IS NULL
  `

  // Streak metrics
  const streakStats = await prisma.$queryRaw<Array<{ avg: number; max: number; usersWithStreak: number }>>`
    SELECT
      AVG("currentStreak") as avg,
      MAX("currentStreak") as max,
      COUNT(*) FILTER (WHERE "currentStreak" > 0) as usersWithStreak
    FROM "User"
    WHERE "deletedAt" IS NULL AND "blockedAt" IS NULL
  `

  // Streak distribution
  const streakDist = await prisma.$queryRaw<Array<{ bucket: string; count: number }>>`
    SELECT
      bucket,
      COUNT(*) as count
    FROM (
      SELECT
        CASE
          WHEN "currentStreak" = 0 THEN 'Inactive'
          WHEN "currentStreak" BETWEEN 1 AND 3 THEN '1-3 days'
          WHEN "currentStreak" BETWEEN 4 AND 7 THEN '4-7 days'
          WHEN "currentStreak" BETWEEN 8 AND 14 THEN '8-14 days'
          WHEN "currentStreak" BETWEEN 15 AND 30 THEN '15-30 days'
          ELSE '30+ days'
        END as bucket
      FROM "User"
      WHERE "deletedAt" IS NULL AND "blockedAt" IS NULL
    ) grouped
    GROUP BY bucket
    ORDER BY
      CASE bucket
        WHEN 'Inactive' THEN 0
        WHEN '1-3 days' THEN 1
        WHEN '4-7 days' THEN 2
        WHEN '8-14 days' THEN 3
        WHEN '15-30 days' THEN 4
        ELSE 5
      END
  `

  // Mission metrics
  const [missionsCompleted7d, missionsCompleted30d, totalActiveMissions] = await Promise.all([
    prisma.userMission.count({ where: { completedAt: { gte: sevenDaysAgo } } }),
    prisma.userMission.count({ where: { completedAt: { gte: thirtyDaysAgo } } }),
    prisma.userMission.count({ where: { status: 'CLAIMED' } }),
  ])

  // Achievement metrics
  const [totalAchievements, totalUnlocks] = await Promise.all([
    prisma.achievement.count({ where: { isActive: true } }),
    prisma.userAchievement.count(),
  ])

  // Abuse metrics
  const [activeAbuseSignals, resolvedSignals7d, highRiskUserList] = await Promise.all([
    prisma.abuseSignal.count({ where: { resolved: false } }),
    prisma.abuseSignal.count({ where: { resolved: true, resolvedAt: { gte: sevenDaysAgo } } }),
    prisma.abuseSignal.groupBy({
      by: ['userId'],
      where: { resolved: false, riskScore: { gte: 80 } },
    }),
  ])
  const highRiskUsers = highRiskUserList.length

  // System health
  const [xpTransactions7d, auditLogs7d] = await Promise.all([
    prisma.xPTransaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ])

  return {
    totalUsers,
    activeUsers1d,
    activeUsers7d,
    activeUsers30d,
    dau,
    wau,
    mau,
    stickiness,
    newUsers7d,
    newUsers30d,
    totalObservations,
    observations7d,
    observations30d,
    pendingApproval,
    approvalRate: totalObservations > 0 ? Math.round((totalApproved / totalObservations) * 100) : 0,
    avgXP: xpStats[0]?.avg ? Number(xpStats[0].avg) : 0,
    medianXP: xpStats[0]?.median ? Number(xpStats[0].median) : 0,
    xpDistribution: xpDistribution.map((g) => ({
      level: g.level,
      title: g.title,
      count: g._count.id,
    })),
    avgStreak: streakStats[0]?.avg ? Number(streakStats[0].avg) : 0,
    maxStreak: streakStats[0]?.max ? Number(streakStats[0].max) : 0,
    usersWithStreak: streakStats[0]?.usersWithStreak ? Number(streakStats[0].usersWithStreak) : 0,
    streakDistribution: streakDist as Array<{ bucket: string; count: number }>,
    missionsCompleted7d,
    missionsCompleted30d,
    missionCompletionRate: totalActiveMissions > 0
      ? Math.round(((missionsCompleted7d + missionsCompleted30d) / (totalActiveMissions * 2)) * 100)
      : 0,
    totalAchievements,
    totalUnlocks,
    avgAchievementsPerUser: totalUsers > 0 ? Math.round((totalUnlocks / totalUsers) * 100) / 100 : 0,
    activeAbuseSignals,
    resolvedSignals7d,
    highRiskUsers,
    xpTransactions7d,
    auditLogs7d,
    leaderboardCacheHits: 0, // Would need middleware instrumentation
  }
}
