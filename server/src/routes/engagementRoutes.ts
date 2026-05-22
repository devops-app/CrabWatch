import { Router } from 'express'
import { authMiddleware, requireAuth, resolveUser, AuthRequest } from '../middleware/auth'
import { getConfig, getPrisma } from '../services/container'
import { Response, NextFunction } from 'express'
import {
  getOnboardingStatus,
  completeOnboardingStep,
  getActiveMissions,
  claimMission,
  updateMissionProgress,
} from '../controllers/engagementController'
import { completeOnboardingStepSchema, claimMissionSchema, updateMissionProgressSchema } from '../utils/schemas'
import { validate } from '../middleware/validation'

const router = Router()

router.use(authMiddleware)
router.use(requireAuth)
router.use(resolveUser)

// Onboarding
router.get('/onboarding/me', getOnboardingStatus)
router.post('/onboarding/steps/complete', validate(completeOnboardingStepSchema), completeOnboardingStep)

// Missions
router.get('/missions/today', getActiveMissions)
router.post('/missions/claim', validate(claimMissionSchema), claimMission)
router.post('/missions/progress', validate(updateMissionProgressSchema), updateMissionProgress)

// Achievements (Phase 3)
router.get('/achievements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Achievements not enabled' })
  }
  try {
    const userId = req.dbUser?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }
    const { getAchievements } = await import('../services/achievementService')
    const achievements = await getAchievements(userId)
    res.json({ success: true, data: achievements })
  } catch (error) {
    next(error)
  }
})

router.get('/achievements/unlocked', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Achievements not enabled' })
  }
  try {
    const userId = req.dbUser?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }
    const { getUnlockedAchievements } = await import('../services/achievementService')
    const achievements = await getUnlockedAchievements(userId)
    res.json({ success: true, data: achievements })
  } catch (error) {
    next(error)
  }
})

router.get('/achievements/check', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Achievements not enabled' })
  }
  try {
    const userId = req.dbUser?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }
    const { checkAndAwardAchievements } = await import('../services/achievementService')
    const newlyUnlocked = await checkAndAwardAchievements(userId)
    res.json({ success: true, data: { newlyUnlocked } })
  } catch (error) {
    next(error)
  }
})

router.get('/achievements/:id/progress', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Achievements not enabled' })
  }
  try {
    const userId = req.dbUser?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }
    const { getAchievementProgress } = await import('../services/achievementService')
    const progress = await getAchievementProgress(userId, req.params.id)
    if (!progress) {
      return res.status(404).json({ success: false, error: 'Achievement not found' })
    }
    res.json({ success: true, data: progress })
  } catch (error) {
    next(error)
  }
})

// Insights (Phase 4)
router.get('/insights/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Insights not enabled' })
  }
  try {
    const userId = req.dbUser?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }
    const { generateInsights } = await import('../services/aiInsightsService')
    const insights = await generateInsights(userId)
    res.json({ success: true, data: insights })
  } catch (error) {
    next(error)
  }
})

router.post('/insights/:id/act', async (req, res, next) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Insights not enabled' })
  }
  try {
    res.json({ success: true, data: { acted: true } })
  } catch (error) {
    next(error)
  }
})

// Social (Phase 3)
router.get('/social/contributors', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Social features not enabled' })
  }
  try {
    const { getTopContributors } = await import('../services/notificationService')
    const contributors = await getTopContributors()
    res.json({ success: true, data: contributors })
  } catch (error) {
    next(error)
  }
})

router.get('/social/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Social features not enabled' })
  }
  try {
    const { getCommunityStats } = await import('../services/notificationService')
    const stats = await getCommunityStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// Notifications (Phase 3)
const DEFAULT_CATEGORIES = ['mission_reminders', 'streak_warnings', 'milestone_alerts', 'community_updates'] as const
const DEFAULT_CHANNELS = ['PUSH', 'EMAIL', 'IN_APP'] as const

router.get('/notification-preferences', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Notifications not enabled' })
  }
  try {
    const userId = req.dbUser?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }
    const db = getPrisma()
    let prefs = await db.notificationPreference.findMany({ where: { userId } })
    if (prefs.length === 0) {
      const createData = DEFAULT_CHANNELS.flatMap((channel) =>
        DEFAULT_CATEGORIES.map((category) => ({
          userId,
          channel,
          category,
          enabled: category !== 'community_updates',
        }))
      )
      prefs = await db.notificationPreference.createManyAndReturn({ data: createData })
    }
    res.json({ success: true, data: prefs })
  } catch (error) {
    next(error)
  }
})

router.patch('/notification-preferences', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!getConfig().engagement.enabled) {
    return res.status(501).json({ success: false, error: 'Notifications not enabled' })
  }
  try {
    const userId = req.dbUser?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }
    const { updates } = req.body
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'updates array required' })
    }
    const db = getPrisma()
    const results = await Promise.all(
      updates.map((u: any) =>
        db.notificationPreference.upsert({
          where: {
            userId_channel_category: { userId, channel: u.channel, category: u.category },
          },
          update: { enabled: u.enabled },
          create: {
            userId,
            channel: u.channel,
            category: u.category,
            enabled: u.enabled ?? true,
          },
        })
      )
    )
    res.json({ success: true, data: results })
  } catch (error) {
    next(error)
  }
})

export default router
