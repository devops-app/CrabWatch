import { Router } from 'express'
import { authMiddleware, requireAuth, resolveUser, requireRole, requirePermission, AdminPermission } from '../middleware/auth'
import { UserRole } from '@prisma/client'
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as ctrl from '../controllers/adminEngagementController'
import { config } from '../config'

const router = Router()

router.use(authMiddleware)
router.use(requireAuth)
router.use(resolveUser)
router.use(requireRole(UserRole.ADMIN))

// Gamification Rules — read
router.get('/gamification/rules', requirePermission(AdminPermission.ENGAGEMENT_READ), ctrl.listGamificationRules)
// Gamification Rules — write
router.post('/gamification/rules', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.createGamificationRule)
router.patch('/gamification/rules/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.updateGamificationRule)
router.delete('/gamification/rules/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.deleteGamificationRule)

// Level Configs — read
router.get('/gamification/levels', requirePermission(AdminPermission.ENGAGEMENT_READ), ctrl.listLevelConfigs)
// Level Configs — write
router.post('/gamification/levels', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.createLevelConfig)
router.patch('/gamification/levels/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.updateLevelConfig)
router.delete('/gamification/levels/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.deleteLevelConfig)

// XP Management
router.post('/gamification/adjust-xp', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.adjustXP)
router.post('/gamification/recalculate', requirePermission(AdminPermission.ENGAGEMENT_RECALCULATE), ctrl.recalculateXP)
router.get('/gamification/recalculate/:jobId', requirePermission(AdminPermission.ENGAGEMENT_READ), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { getRecalculationJobStatus } = await import('../services/recalculationService')
    const job = await getRecalculationJobStatus(req.params.jobId)
    if (!job) {
      return res.status(404).json({ success: false, error: 'Recalculation job not found' })
    }
    res.json({ success: true, data: job })
  } catch (error) {
    next(error)
  }
})

// Achievements CRUD
router.get('/achievements', requirePermission(AdminPermission.ENGAGEMENT_READ), ctrl.listAchievements)
router.post('/achievements', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.createAchievement)
router.patch('/achievements/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.updateAchievement)
router.delete('/achievements/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.deleteAchievement)
router.post('/achievements/:id/award', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.awardAchievement)

// Mission Definitions CRUD
router.get('/missions', requirePermission(AdminPermission.ENGAGEMENT_READ), ctrl.listMissions)
router.post('/missions', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.createMission)
router.patch('/missions/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.updateMission)
router.delete('/missions/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.deleteMission)

// Seasons CRUD
router.get('/seasons', requirePermission(AdminPermission.ENGAGEMENT_READ), ctrl.listSeasons)
router.post('/seasons', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.createSeason)
router.patch('/seasons/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.updateSeason)
router.delete('/seasons/:id', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.deleteSeason)
router.post('/seasons/:id/activate', requirePermission(AdminPermission.ENGAGEMENT_WRITE), ctrl.activateSeason)

// Campaigns (Phase 4)
router.get('/campaigns', requirePermission(AdminPermission.ENGAGEMENT_READ), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { listCampaigns } = await import('../services/campaignService')
    const campaigns = await listCampaigns({ status: req.query.status as string })
    res.json({ success: true, data: campaigns })
  } catch (error) {
    next(error)
  }
})

router.get('/campaigns/:id', requirePermission(AdminPermission.ENGAGEMENT_READ), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { getCampaign } = await import('../services/campaignService')
    const campaign = await getCampaign(req.params.id)
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' })
    }
    res.json({ success: true, data: campaign })
  } catch (error) {
    next(error)
  }
})

router.post('/campaigns', requirePermission(AdminPermission.CAMPAIGNS_WRITE), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { createCampaign } = await import('../services/campaignService')
    const campaign = await createCampaign(req.body, req.dbUser?.id || '')
    res.status(201).json({ success: true, data: campaign })
  } catch (error) {
    next(error)
  }
})

router.patch('/campaigns/:id/status', requirePermission(AdminPermission.CAMPAIGNS_WRITE), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { updateCampaignStatus } = await import('../services/campaignService')
    const { status } = req.body
    const campaign = await updateCampaignStatus(req.params.id, status, req.dbUser?.id || '')
    res.json({ success: true, data: campaign })
  } catch (error) {
    next(error)
  }
})

router.post('/campaigns/:id/send-test', requirePermission(AdminPermission.CAMPAIGNS_WRITE), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { sendTestCampaign } = await import('../services/campaignService')
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required for test send' })
    }
    const result = await sendTestCampaign(req.params.id, userId, req.dbUser?.id || '')
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

router.post('/campaigns/:id/launch', requirePermission(AdminPermission.CAMPAIGNS_WRITE), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { launchCampaign } = await import('../services/campaignService')
    const result = await launchCampaign(req.params.id, req.dbUser?.id || '')
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

router.delete('/campaigns/:id', requirePermission(AdminPermission.CAMPAIGNS_WRITE), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { deleteCampaign } = await import('../services/campaignService')
    await deleteCampaign(req.params.id, req.dbUser?.id || '')
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Audit Logs (Phase 4)
router.get('/audit-logs', requirePermission(AdminPermission.AUDIT_READ), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { getAuditLogs } = await import('../services/campaignService')
    const logs = await getAuditLogs({
      action: req.query.action as string,
      resourceType: req.query.resourceType as string,
      actorId: req.query.actorId as string,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    })
    res.json({ success: true, data: logs })
  } catch (error) {
    next(error)
  }
})

router.get('/audit-logs/stats', requirePermission(AdminPermission.AUDIT_READ), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const { getAuditLogStats } = await import('../services/campaignService')
    const stats = await getAuditLogStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// Metrics (Phase 5)
router.get('/metrics', requirePermission(AdminPermission.ENGAGEMENT_READ), ctrl.getEngagementMetricsEndpoint)

// Abuse Signals (Phase 5)
router.get('/abuse-signals', requirePermission(AdminPermission.SECURITY_MODERATE), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const prisma = (await import('../config/database')).default
    const signals = await prisma.abuseSignal.findMany({
      where: { resolved: false },
      orderBy: [{ riskScore: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      take: 100,
    })
    res.json({ success: true, data: signals })
  } catch (error) {
    next(error)
  }
})

router.patch('/abuse-signals/:id/resolve', requirePermission(AdminPermission.SECURITY_MODERATE), async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!config.engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Gamification not enabled' })
  }
  try {
    const prisma = (await import('../config/database')).default
    const { note } = req.body
    const signal = await prisma.abuseSignal.update({
      where: { id: req.params.id },
      data: {
        resolved: true,
        resolvedByAdminId: req.dbUser?.id || null,
        resolvedAt: new Date(),
      },
    })
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: req.dbUser?.id || null,
        action: 'RESOLVE_ABUSE_SIGNAL',
        resourceType: 'abuseSignal',
        resourceId: req.params.id,
        reason: note || 'Resolved via admin panel',
      },
    })
    res.json({ success: true, data: signal })
  } catch (error) {
    next(error)
  }
})

export default router
