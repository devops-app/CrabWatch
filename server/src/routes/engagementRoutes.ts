import { Router } from 'express'
import { authMiddleware, requireAuth, resolveUser } from '../middleware/auth'
import {
  getOnboardingStatus,
  completeOnboardingStep,
  getActiveMissions,
  claimMission,
  getAchievements,
  getUnlockedAchievements,
  checkAchievements,
  getAchievementProgress,
  getInsights,
  actOnInsight,
  getSocialContributors,
  getSocialStats,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/engagementController'
import { completeOnboardingStepSchema, claimMissionSchema } from '../utils/schemas'
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

// Achievements (Phase 3)
router.get('/achievements', getAchievements)
router.get('/achievements/unlocked', getUnlockedAchievements)
router.get('/achievements/check', checkAchievements)
router.get('/achievements/:id/progress', getAchievementProgress)

// Insights (Phase 4)
router.get('/insights/me', getInsights)
router.post('/insights/:id/act', actOnInsight)

// Social (Phase 3)
router.get('/social/contributors', getSocialContributors)
router.get('/social/stats', getSocialStats)

// Notifications (Phase 3)
router.get('/notification-preferences', getNotificationPreferences)
router.patch('/notification-preferences', updateNotificationPreferences)

export default router
