import { Response } from 'express'
import { NotificationChannel } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'
import { getPrisma, getConfig } from '../services/container'
import { asyncHandler, UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors'
import { createTranslator, detectLocale } from '../middleware/i18n'
import { OnboardingStepDto } from '@crabwatch/shared'

// Local types for JSON fields
interface OnboardingStepStatus {
  step: string
  title: string
  description: string
  actionType: string
  xpReward: number
  completed: boolean
  completedAt: string | null
}

interface MissionCriterion {
  value?: number
  [key: string]: unknown
}

// ==================== ONBOARDING ====================

export const getOnboardingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: __('engagement.missionsNotEnabled', 'engagement') })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError(__('common.auth.required', 'common'))
  }

  const db = getPrisma()
  const flows = await db.onboardingFlow.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  })

  const progress = await db.onboardingProgress.findMany({
    where: { userId },
  })

  const steps: OnboardingStepStatus[] = []
  for (const flow of flows) {
    const flowSteps: OnboardingStepDto[] = (flow.steps as unknown as OnboardingStepDto[]) || []
    for (const step of flowSteps) {
      const userProgress = progress.find(
        (p) => p.flowCode === flow.code && p.flowVersion === flow.version && p.stepKey === step.key
      )
      steps.push({
        step: step.key,
        title: step.title,
        description: step.description,
        actionType: step.actionType,
        xpReward: step.xpReward,
        completed: !!userProgress?.completedAt,
        completedAt: userProgress?.completedAt?.toISOString() || null,
      })
    }
  }

  const completedCount = steps.filter((s) => s.completed).length
  const totalCount = steps.length

  res.json({
    success: true,
    data: {
      steps,
      completedCount,
      totalCount,
      progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    },
  })
})

export const completeOnboardingStep = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: __('engagement.missionsNotEnabled', 'engagement') })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError(__('common.auth.required', 'common'))
  }

  const { step: stepKey } = req.body
  if (!stepKey) {
    throw new ValidationError(__('engagement.onboarding.stepRequired', 'engagement'))
  }

  const db = getPrisma()
  const flows = await db.onboardingFlow.findMany({
    where: { active: true },
  })

  let matchedFlow: (typeof flows)[number] | null = null
  for (const flow of flows) {
    const flowSteps: OnboardingStepDto[] = (flow.steps as unknown as OnboardingStepDto[]) || []
    const step = flowSteps.find((s) => s.key === stepKey)
    if (step) {
      matchedFlow = flow
      break
    }
  }

  if (!matchedFlow) {
    throw new NotFoundError(__('engagement.onboarding.stepNotFound', 'engagement'))
  }

  const progress = await db.onboardingProgress.upsert({
    where: {
      userId_flowCode_flowVersion_stepKey: {
        userId,
        flowCode: matchedFlow.code,
        flowVersion: matchedFlow.version,
        stepKey,
      },
    },
    update: {
      status: 'completed',
      completedAt: new Date(),
    },
    create: {
      userId,
      flowCode: matchedFlow.code,
      flowVersion: matchedFlow.version,
      stepKey,
      status: 'completed',
      completedAt: new Date(),
    },
  })

  res.json({ success: true, data: progress })
})

// ==================== MISSIONS ====================

export const getActiveMissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: __('engagement.missionsNotEnabled', 'engagement') })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError(__('common.auth.required', 'common'))
  }

  const db = getPrisma()
  const missions = await db.missionDefinition.findMany({
    where: {
      active: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const missionIds = missions.map((m) => m.id)
  const userMissions = await db.userMission.findMany({
    where: {
      userId,
      missionId: { in: missionIds },
    },
  })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const result = missions.map((mission) => {
    const criteria: MissionCriterion[] = (mission.criteria as unknown as MissionCriterion[]) || []
    const targetCount = criteria.length > 0 ? (criteria[0].value || 1) : 1

    const userMission = userMissions.find(
      (um) => um.missionId === mission.id && um.assignmentDate.toDateString() === todayStart.toDateString()
    )

    return {
      id: mission.id,
      code: mission.code,
      key: mission.code,
      name: mission.name,
      title: mission.name,
      description: mission.description,
      targetCount,
      xpReward: mission.xpReward,
      cadence: mission.cadence,
      claimed: !!userMission?.claimedAt,
      completed: !!userMission?.completedAt,
      progress: userMission?.progressValue || 0,
    }
  })

  res.json({ success: true, data: result })
})

export const claimMission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: __('engagement.missionsNotEnabled', 'engagement') })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError(__('common.auth.required', 'common'))
  }

  const { missionCode } = req.body
  if (!missionCode) {
    throw new ValidationError(__('engagement.mission.codeRequired', 'engagement'))
  }

  const db = getPrisma()
  const mission = await db.missionDefinition.findUnique({
    where: { code: missionCode, active: true },
  })

  if (!mission) {
    throw new NotFoundError(__('engagement.mission.notFound', 'engagement'))
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const criteria: MissionCriterion[] = (mission.criteria as unknown as MissionCriterion[]) || []
  const targetValue = criteria.length > 0 ? (criteria[0].value || 1) : 1

  const userMission = await db.userMission.upsert({
    where: {
      userId_missionId_assignmentDate: {
        userId,
        missionId: mission.id,
        assignmentDate: todayStart,
      },
    },
    update: {
      claimedAt: new Date(),
    },
    create: {
      userId,
      missionId: mission.id,
      assignmentDate: todayStart,
      claimedAt: new Date(),
      progressValue: 0,
      targetValue,
    },
  })

  res.json({ success: true, data: userMission })
})

// ==================== ACHIEVEMENTS / INSIGHTS / SOCIAL / NOTIFICATIONS (K2) ====================
// Extracted from inline handlers in engagementRoutes.ts. Each handler guards the
// engagement feature flag (501), resolves the authenticated user (401), and
// delegates to the relevant service via asyncHandler.

const DEFAULT_CATEGORIES = ['mission_reminders', 'streak_warnings', 'milestone_alerts', 'community_updates'] as const
const DEFAULT_CHANNELS = ['PUSH', 'EMAIL', 'IN_APP'] as const

function engagementEnabled(res: Response): boolean {
  if (!getConfig().engagement.enabled) {
    res.status(501).json({ success: false, error: 'Engagement features not enabled' })
    return false
  }
  return true
}

export const getAchievements = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const userId = req.dbUser?.id
  if (!userId) throw new UnauthorizedError('Authentication required')
  const { getAchievements: svcGetAchievements } = await import('../services/achievementService')
  const achievements = await svcGetAchievements(userId)
  res.json({ success: true, data: achievements })
})

export const getUnlockedAchievements = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const userId = req.dbUser?.id
  if (!userId) throw new UnauthorizedError('Authentication required')
  const { getUnlockedAchievements: svcGetUnlocked } = await import('../services/achievementService')
  const achievements = await svcGetUnlocked(userId)
  res.json({ success: true, data: achievements })
})

export const checkAchievements = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const userId = req.dbUser?.id
  if (!userId) throw new UnauthorizedError('Authentication required')
  const { checkAndAwardAchievements } = await import('../services/achievementService')
  const newlyUnlocked = await checkAndAwardAchievements(userId, detectLocale(req))
  res.json({ success: true, data: { newlyUnlocked } })
})

export const getAchievementProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const userId = req.dbUser?.id
  if (!userId) throw new UnauthorizedError('Authentication required')
  const { getAchievementProgress: svcGetProgress } = await import('../services/achievementService')
  const progress = await svcGetProgress(userId, req.params.id)
  if (!progress) throw new NotFoundError('Achievement not found')
  res.json({ success: true, data: progress })
})

export const getInsights = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const userId = req.dbUser?.id
  if (!userId) throw new UnauthorizedError('Authentication required')
  const { generateInsights } = await import('../services/aiInsightsService')
  const insights = await generateInsights(userId, detectLocale(req, req.dbUser?.preferredLocale ?? null))
  res.json({ success: true, data: insights })
})

export const actOnInsight = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  res.json({ success: true, data: { acted: true } })
})

export const getSocialContributors = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const { getTopContributors } = await import('../services/notificationService')
  const contributors = await getTopContributors()
  res.json({ success: true, data: contributors })
})

export const getSocialStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const { getCommunityStats } = await import('../services/notificationService')
  const stats = await getCommunityStats()
  res.json({ success: true, data: stats })
})

export const getNotificationPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const userId = req.dbUser?.id
  if (!userId) throw new UnauthorizedError('Authentication required')
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
})

export const updateNotificationPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!engagementEnabled(res)) return
  const userId = req.dbUser?.id
  if (!userId) throw new UnauthorizedError('Authentication required')
  const { updates } = req.body
  if (!Array.isArray(updates)) throw new ValidationError('updates array required')
  const db = getPrisma()
  const results = await Promise.all(
    updates.map((u: { channel: NotificationChannel; category: string; enabled?: boolean }) =>
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
})
