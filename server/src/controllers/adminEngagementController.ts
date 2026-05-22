import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError, NotFoundError, ValidationError, ConflictError } from '../utils/errors'
import { getPrisma, getConfig } from '../services/container'
import { recalculateXP as recalculateXPService } from '../services/recalculationService'
import { getEngagementMetrics } from '../services/metricsService'
import { invalidateLeaderboardCache } from '../services/leaderboardService'

// Audit log helper
async function writeAuditLog(req: AuthRequest, action: string, resourceType: string, resourceId: string | null, beforeState: any, afterState: any, reason?: string): Promise<void> {
  if (!getConfig().engagement.enabled) return
  const db = getPrisma()
  await db.auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: req.dbUser?.id || null,
      action,
      resourceType,
      resourceId,
      beforeState,
      afterState,
      reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    },
  })
}

class EngagementDisabledError extends AppError {
  constructor() {
    super('Gamification not enabled', 501)
  }
}

function checkEngagement(): void {
  if (!getConfig().engagement.enabled) {
    throw new EngagementDisabledError()
  }
}

// ==================== GAMIFICATION RULES ====================

export const listGamificationRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const rules = await db.gamificationRule.findMany({
    orderBy: { actionType: 'asc' },
  })
  res.json({ success: true, data: rules })
})

export const createGamificationRule = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { actionType, name, description, xpReward, active, startsAt, endsAt, maxPerDay, maxPerUserPerDay, cooldownHours, roleScope, platformScope, metadata } = req.body
  const rule = await db.gamificationRule.create({
    data: {
      actionType,
      name,
      description,
      xpReward,
      active: active ?? true,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      maxPerDay,
      maxPerUserPerDay,
      cooldownHours,
      roleScope,
      platformScope,
      metadata,
    },
  })
  await writeAuditLog(req, 'CREATE', 'GamificationRule', rule.id, null, rule, 'Admin created gamification rule')
  res.status(201).json({ success: true, data: rule })
})

export const updateGamificationRule = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.gamificationRule.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Rule not found')
  }

  const { actionType, name, description, xpReward, active, startsAt, endsAt, maxPerDay, maxPerUserPerDay, cooldownHours, roleScope, platformScope, metadata } = req.body
  const rule = await db.gamificationRule.update({
    where: { id },
    data: {
      actionType,
      name,
      description,
      xpReward,
      active,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      maxPerDay,
      maxPerUserPerDay,
      cooldownHours,
      roleScope,
      platformScope,
      metadata,
    },
  })
  await writeAuditLog(req, 'UPDATE', 'GamificationRule', id, before, rule, 'Admin updated gamification rule')
  res.json({ success: true, data: rule })
})

export const deleteGamificationRule = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.gamificationRule.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Rule not found')
  }
  await db.gamificationRule.delete({ where: { id } })
  await writeAuditLog(req, 'DELETE', 'GamificationRule', id, before, null, 'Admin deleted gamification rule')
  res.status(204).end()
})

// ==================== LEVEL CONFIGS ====================

export const listLevelConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const levels = await db.levelConfig.findMany({
    orderBy: { xpThreshold: 'asc' },
  })
  res.json({ success: true, data: levels })
})

export const createLevelConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { level, xpThreshold, title, description, active } = req.body
  const lvl = await db.levelConfig.create({
    data: {
      level,
      xpThreshold,
      title,
      description,
      active: active ?? true,
    },
  })
  await writeAuditLog(req, 'CREATE', 'LevelConfig', lvl.id, null, lvl, 'Admin created level config')
  res.status(201).json({ success: true, data: lvl })
})

export const updateLevelConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.levelConfig.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Level config not found')
  }

  const { level, xpThreshold, title, description, active } = req.body
  const lvl = await db.levelConfig.update({
    where: { id },
    data: {
      level,
      xpThreshold,
      title,
      description,
      active,
    },
  })
  await writeAuditLog(req, 'UPDATE', 'LevelConfig', id, before, lvl, 'Admin updated level config')
  res.json({ success: true, data: lvl })
})

export const deleteLevelConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.levelConfig.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Level config not found')
  }
  await db.levelConfig.delete({ where: { id } })
  await writeAuditLog(req, 'DELETE', 'LevelConfig', id, before, null, 'Admin deleted level config')
  res.status(204).end()
})

// ==================== XP ADJUSTMENT ====================

export const adjustXP = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { userId, deltaXP, reason } = req.body
  if (!userId || !deltaXP || !reason) {
    throw new ValidationError('userId, deltaXP, and reason are required')
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new NotFoundError('User not found')
  }

  const beforeXP = user.totalXP
  const actionType = deltaXP > 0 ? 'ADMIN_ADJUSTMENT' : 'ADMIN_REVERSAL'

  await db.xPTransaction.create({
    data: {
      userId,
      actionType,
      deltaXP,
      sourceType: 'Admin',
      reason,
      idempotencyKey: `admin:${req.dbUser?.id}:${userId}:${Date.now()}`,
    },
  })

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      totalXP: { increment: deltaXP },
    },
  })

  await writeAuditLog(req, 'ADJUST_XP', 'User', userId, { xp: beforeXP, deltaXP }, { xp: updatedUser.totalXP }, reason)
  invalidateLeaderboardCache()
  res.json({ success: true, data: { userId, beforeXP, afterXP: updatedUser.totalXP, deltaXP } })
})

// ==================== RECALCULATE ====================

export const recalculateXP = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const { mode, userId, reason } = req.body
  if (!mode || !['dry-run', 'execute'].includes(mode)) {
    throw new ValidationError('mode must be dry-run or execute')
  }

  const result = await recalculateXPService(
    { mode, userId, reason },
    req.dbUser?.id
  )

  if (mode === 'execute') {
    invalidateLeaderboardCache()
  }

  res.json({ success: true, data: result })
})

// ==================== ACHIEVEMENTS ====================

export const listAchievements = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const achievements = await db.achievement.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  })
  res.json({ success: true, data: achievements })
})

export const createAchievement = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { code, name, description, category, rarity, iconUrl, requirements, xpReward, isHidden, isActive, startsAt, endsAt } = req.body
  if (!code || !name || !description || !category) {
    throw new ValidationError('code, name, description, and category are required')
  }
  const achievement = await db.achievement.create({
    data: {
      code,
      name,
      description,
      category,
      rarity: rarity || 'common',
      iconUrl,
      requirements,
      xpReward: xpReward ?? 0,
      isHidden: isHidden ?? false,
      isActive: isActive ?? true,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  })
  await writeAuditLog(req, 'CREATE', 'Achievement', achievement.id, null, achievement, 'Admin created achievement')
  res.status(201).json({ success: true, data: achievement })
})

export const updateAchievement = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.achievement.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Achievement not found')
  }
  const { code, name, description, category, rarity, iconUrl, requirements, xpReward, isHidden, isActive, startsAt, endsAt } = req.body
  const achievement = await db.achievement.update({
    where: { id },
    data: {
      code,
      name,
      description,
      category,
      rarity,
      iconUrl,
      requirements,
      xpReward,
      isHidden,
      isActive,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  })
  await writeAuditLog(req, 'UPDATE', 'Achievement', id, before, achievement, 'Admin updated achievement')
  res.json({ success: true, data: achievement })
})

export const deleteAchievement = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.achievement.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Achievement not found')
  }
  await db.achievement.delete({ where: { id } })
  await writeAuditLog(req, 'DELETE', 'Achievement', id, before, null, 'Admin deleted achievement')
  res.status(204).end()
})

export const awardAchievement = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const { id } = req.params
  const { userId, reason } = req.body
  if (!userId || !reason) {
    throw new ValidationError('userId and reason are required')
  }
  const { awardAchievementManually } = await import('../services/achievementService')
  try {
    await awardAchievementManually(userId, id, req.dbUser?.id || '', reason)
  } catch (error: any) {
    if (error?.message?.includes('already has this achievement')) {
      throw new ConflictError(error.message)
    }
    throw error
  }
  invalidateLeaderboardCache()
  res.json({ success: true })
})

// ==================== MISSION DEFINITIONS ====================

export const listMissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const missions = await db.missionDefinition.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  })
  res.json({ success: true, data: missions })
})

export const createMission = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { code, name, description, cadence, criteria, xpReward, maxClaimsPerUser, active, startsAt, endsAt } = req.body
  if (!code || !name || !description || !cadence || !criteria) {
    throw new ValidationError('code, name, description, cadence, and criteria are required')
  }
  const mission = await db.missionDefinition.create({
    data: {
      code,
      name,
      description,
      cadence: cadence as any,
      criteria,
      xpReward: xpReward ?? 0,
      maxClaimsPerUser: maxClaimsPerUser ?? 1,
      active: active ?? true,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  })
  await writeAuditLog(req, 'CREATE', 'MissionDefinition', mission.id, null, mission, 'Admin created mission')
  res.status(201).json({ success: true, data: mission })
})

export const updateMission = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.missionDefinition.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Mission not found')
  }
  const { code, name, description, cadence, criteria, xpReward, maxClaimsPerUser, active, startsAt, endsAt } = req.body
  const mission = await db.missionDefinition.update({
    where: { id },
    data: {
      code,
      name,
      description,
      cadence,
      criteria,
      xpReward,
      maxClaimsPerUser,
      active,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  })
  await writeAuditLog(req, 'UPDATE', 'MissionDefinition', id, before, mission, 'Admin updated mission')
  res.json({ success: true, data: mission })
})

export const deleteMission = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.missionDefinition.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Mission not found')
  }
  await db.missionDefinition.delete({ where: { id } })
  await writeAuditLog(req, 'DELETE', 'MissionDefinition', id, before, null, 'Admin deleted mission')
  res.status(204).end()
})

// ==================== SEASONS ====================

export const listSeasons = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const seasons = await db.season.findMany({
    orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }],
    include: {
      _count: {
        select: { seasonStats: true },
      },
    },
  })
  res.json({ success: true, data: seasons })
})

export const createSeason = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { code, name, description, startsAt, endsAt } = req.body
  if (!code || !name || !startsAt || !endsAt) {
    throw new ValidationError('code, name, startsAt, and endsAt are required')
  }
  const season = await db.season.create({
    data: {
      code,
      name,
      description,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      isActive: false,
    },
  })
  await writeAuditLog(req, 'CREATE', 'Season', season.id, null, season, 'Admin created season')
  res.status(201).json({ success: true, data: season })
})

export const updateSeason = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.season.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Season not found')
  }
  const { code, name, description, startsAt, endsAt } = req.body
  const season = await db.season.update({
    where: { id },
    data: {
      code,
      name,
      description,
      startsAt: startsAt ? new Date(startsAt) : before.startsAt,
      endsAt: endsAt ? new Date(endsAt) : before.endsAt,
    },
  })
  await writeAuditLog(req, 'UPDATE', 'Season', id, before, season, 'Admin updated season')
  res.json({ success: true, data: season })
})

export const deleteSeason = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.season.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Season not found')
  }
  await db.season.delete({ where: { id } })
  await writeAuditLog(req, 'DELETE', 'Season', id, before, null, 'Admin deleted season')
  res.status(204).end()
})

export const activateSeason = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const db = getPrisma()
  const { id } = req.params
  const before = await db.season.findUnique({ where: { id } })
  if (!before) {
    throw new NotFoundError('Season not found')
  }
  await db.season.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  })
  const season = await db.season.update({
    where: { id },
    data: { isActive: true },
  })
  await writeAuditLog(req, 'ACTIVATE', 'Season', id, before, season, 'Admin activated season')
  res.json({ success: true, data: season })
})

// ==================== METRICS ====================

export const getEngagementMetricsEndpoint = asyncHandler(async (req: AuthRequest, res: Response) => {
  checkEngagement()
  const metrics = await getEngagementMetrics()
  res.json({ success: true, data: metrics })
})
