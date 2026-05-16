import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import { config } from '../config'
import { recalculateXP as recalculateXPService } from '../services/recalculationService'
import { getEngagementMetrics } from '../services/metricsService'
import { invalidateLeaderboardCache } from '../services/leaderboardService'

// Audit log helper
async function writeAuditLog(req: AuthRequest, action: string, resourceType: string, resourceId: string | null, beforeState: any, afterState: any, reason?: string): Promise<void> {
  if (!config.engagement.enabled) return
  await prisma.auditLog.create({
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

// ==================== GAMIFICATION RULES ====================

export async function listGamificationRules(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const rules = await prisma.gamificationRule.findMany({
      orderBy: { actionType: 'asc' },
    })
    res.json({ success: true, data: rules })
  } catch (error) {
    next(error)
  }
}

export async function createGamificationRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { actionType, name, description, xpReward, active, startsAt, endsAt, maxPerDay, maxPerUserPerDay, cooldownHours, roleScope, platformScope, metadata } = req.body
    const rule = await prisma.gamificationRule.create({
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
  } catch (error) {
    next(error)
  }
}

export async function updateGamificationRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.gamificationRule.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Rule not found' })
      return
    }

    const { actionType, name, description, xpReward, active, startsAt, endsAt, maxPerDay, maxPerUserPerDay, cooldownHours, roleScope, platformScope, metadata } = req.body
    const rule = await prisma.gamificationRule.update({
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
  } catch (error) {
    next(error)
  }
}

export async function deleteGamificationRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.gamificationRule.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Rule not found' })
      return
    }
    await prisma.gamificationRule.delete({ where: { id } })
    await writeAuditLog(req, 'DELETE', 'GamificationRule', id, before, null, 'Admin deleted gamification rule')
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

// ==================== LEVEL CONFIGS ====================

export async function listLevelConfigs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const levels = await prisma.levelConfig.findMany({
      orderBy: { xpThreshold: 'asc' },
    })
    res.json({ success: true, data: levels })
  } catch (error) {
    next(error)
  }
}

export async function createLevelConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { level, xpThreshold, title, description, active } = req.body
    const lvl = await prisma.levelConfig.create({
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
  } catch (error) {
    next(error)
  }
}

export async function updateLevelConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.levelConfig.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Level config not found' })
      return
    }

    const { level, xpThreshold, title, description, active } = req.body
    const lvl = await prisma.levelConfig.update({
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
  } catch (error) {
    next(error)
  }
}

export async function deleteLevelConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.levelConfig.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Level config not found' })
      return
    }
    await prisma.levelConfig.delete({ where: { id } })
    await writeAuditLog(req, 'DELETE', 'LevelConfig', id, before, null, 'Admin deleted level config')
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

// ==================== XP ADJUSTMENT ====================

export async function adjustXP(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { userId, deltaXP, reason } = req.body
    if (!userId || !deltaXP || !reason) {
      res.status(400).json({ success: false, error: 'userId, deltaXP, and reason are required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    const beforeXP = user.totalXP
    const actionType = deltaXP > 0 ? 'ADMIN_ADJUSTMENT' : 'ADMIN_REVERSAL'

    // Create XP transaction
    await prisma.xPTransaction.create({
      data: {
        userId,
        actionType,
        deltaXP,
        sourceType: 'Admin',
        reason,
        idempotencyKey: `admin:${req.dbUser?.id}:${userId}:${Date.now()}`,
      },
    })

    // Update user XP
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: deltaXP },
      },
    })

    await writeAuditLog(req, 'ADJUST_XP', 'User', userId, { xp: beforeXP, deltaXP }, { xp: updatedUser.totalXP }, reason)

    invalidateLeaderboardCache()

    res.json({ success: true, data: { userId, beforeXP, afterXP: updatedUser.totalXP, deltaXP } })
  } catch (error) {
    next(error)
  }
}

// ==================== RECALCULATE ====================

export async function recalculateXP(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { mode, userId, reason } = req.body
    if (!mode || !['dry-run', 'execute'].includes(mode)) {
      res.status(400).json({ success: false, error: 'mode must be dry-run or execute' })
      return
    }

    const result = await recalculateXPService(
      { mode, userId, reason },
      req.dbUser?.id
    )

    if (mode === 'execute') {
      invalidateLeaderboardCache()
    }

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

// ==================== ACHIEVEMENTS ====================

export async function listAchievements(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    })
    res.json({ success: true, data: achievements })
  } catch (error) {
    next(error)
  }
}

export async function createAchievement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { code, name, description, category, rarity, iconUrl, requirements, xpReward, isHidden, isActive, startsAt, endsAt } = req.body
    if (!code || !name || !description || !category) {
      res.status(400).json({ success: false, error: 'code, name, description, and category are required' })
      return
    }
    const achievement = await prisma.achievement.create({
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
  } catch (error) {
    next(error)
  }
}

export async function updateAchievement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.achievement.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Achievement not found' })
      return
    }
    const { code, name, description, category, rarity, iconUrl, requirements, xpReward, isHidden, isActive, startsAt, endsAt } = req.body
    const achievement = await prisma.achievement.update({
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
  } catch (error) {
    next(error)
  }
}

export async function deleteAchievement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.achievement.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Achievement not found' })
      return
    }
    await prisma.achievement.delete({ where: { id } })
    await writeAuditLog(req, 'DELETE', 'Achievement', id, before, null, 'Admin deleted achievement')
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function awardAchievement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const { userId, reason } = req.body
    if (!userId || !reason) {
      res.status(400).json({ success: false, error: 'userId and reason are required' })
      return
    }
    const { awardAchievementManually } = await import('../services/achievementService')
    await awardAchievementManually(userId, id, req.dbUser?.id || '', reason)
    invalidateLeaderboardCache()
    res.json({ success: true })
  } catch (error: any) {
    if (error.message.includes('already has this achievement')) {
      res.status(409).json({ success: false, error: error.message })
      return
    }
    next(error)
  }
}

// ==================== MISSION DEFINITIONS ====================

export async function listMissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const missions = await prisma.missionDefinition.findMany({
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    })
    res.json({ success: true, data: missions })
  } catch (error) {
    next(error)
  }
}

export async function createMission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { code, name, description, cadence, criteria, xpReward, maxClaimsPerUser, active, startsAt, endsAt } = req.body
    if (!code || !name || !description || !cadence || !criteria) {
      res.status(400).json({ success: false, error: 'code, name, description, cadence, and criteria are required' })
      return
    }
    const mission = await prisma.missionDefinition.create({
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
  } catch (error) {
    next(error)
  }
}

export async function updateMission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.missionDefinition.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Mission not found' })
      return
    }
    const { code, name, description, cadence, criteria, xpReward, maxClaimsPerUser, active, startsAt, endsAt } = req.body
    const mission = await prisma.missionDefinition.update({
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
  } catch (error) {
    next(error)
  }
}

export async function deleteMission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.missionDefinition.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Mission not found' })
      return
    }
    await prisma.missionDefinition.delete({ where: { id } })
    await writeAuditLog(req, 'DELETE', 'MissionDefinition', id, before, null, 'Admin deleted mission')
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

// ==================== SEASONS ====================

export async function listSeasons(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const seasons = await prisma.season.findMany({
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }],
      include: {
        _count: {
          select: { seasonStats: true },
        },
      },
    })
    res.json({ success: true, data: seasons })
  } catch (error) {
    next(error)
  }
}

export async function createSeason(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { code, name, description, startsAt, endsAt } = req.body
    if (!code || !name || !startsAt || !endsAt) {
      res.status(400).json({ success: false, error: 'code, name, startsAt, and endsAt are required' })
      return
    }
    const season = await prisma.season.create({
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
  } catch (error) {
    next(error)
  }
}

export async function updateSeason(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.season.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Season not found' })
      return
    }
    const { code, name, description, startsAt, endsAt } = req.body
    const season = await prisma.season.update({
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
  } catch (error) {
    next(error)
  }
}

export async function deleteSeason(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.season.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Season not found' })
      return
    }
    await prisma.season.delete({ where: { id } })
    await writeAuditLog(req, 'DELETE', 'Season', id, before, null, 'Admin deleted season')
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function activateSeason(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const { id } = req.params
    const before = await prisma.season.findUnique({ where: { id } })
    if (!before) {
      res.status(404).json({ success: false, error: 'Season not found' })
      return
    }
    // Deactivate all other seasons
    await prisma.season.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })
    // Activate the requested season
    const season = await prisma.season.update({
      where: { id },
      data: { isActive: true },
    })
    await writeAuditLog(req, 'ACTIVATE', 'Season', id, before, season, 'Admin activated season')
    res.json({ success: true, data: season })
  } catch (error) {
    next(error)
  }
}

// ==================== METRICS ====================

export async function getEngagementMetricsEndpoint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }
  try {
    const metrics = await getEngagementMetrics()
    res.json({ success: true, data: metrics })
  } catch (error) {
    next(error)
  }
}
