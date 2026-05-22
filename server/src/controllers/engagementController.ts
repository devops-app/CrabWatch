import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { getPrisma, getConfig } from '../services/container'
import { asyncHandler, UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors'

// ==================== ONBOARDING ====================

export const getOnboardingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  const db = getPrisma()
  const flows = await db.onboardingFlow.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  })

  const progress = await db.onboardingProgress.findMany({
    where: { userId },
  })

  const steps: any[] = []
  for (const flow of flows) {
    const flowSteps = (flow.steps as any[]) || []
    for (const step of flowSteps) {
      const userProgress = progress.find(
        (p: any) => p.flowCode === flow.code && p.flowVersion === flow.version && p.stepKey === step.key
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
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  const { step: stepKey } = req.body
  if (!stepKey) {
    throw new ValidationError('Step is required')
  }

  const db = getPrisma()
  const flows = await db.onboardingFlow.findMany({
    where: { active: true },
  })

  let matchedFlow: any = null
  for (const flow of flows) {
    const flowSteps = (flow.steps as any[]) || []
    const step = flowSteps.find((s: any) => s.key === stepKey)
    if (step) {
      matchedFlow = flow
      break
    }
  }

  if (!matchedFlow) {
    throw new NotFoundError('Onboarding step not found')
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
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  const db = getPrisma()
  const missions = await db.missionDefinition.findMany({
    where: {
      active: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const missionIds = missions.map((m: any) => m.id)
  const userMissions = await db.userMission.findMany({
    where: {
      userId,
      missionId: { in: missionIds },
    },
  })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const result = missions.map((mission: any) => {
    const criteria = (mission.criteria as any[]) || []
    const targetCount = criteria.length > 0 ? (criteria[0].value || 1) : 1

    const userMission = userMissions.find(
      (um: any) => um.missionId === mission.id && um.assignmentDate.toDateString() === todayStart.toDateString()
    )

    return {
      code: mission.code,
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
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  const { missionCode } = req.body
  if (!missionCode) {
    throw new ValidationError('Mission code is required')
  }

  const db = getPrisma()
  const mission = await db.missionDefinition.findUnique({
    where: { code: missionCode, active: true },
  })

  if (!mission) {
    throw new NotFoundError('Mission not found')
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const criteria = (mission.criteria as any[]) || []
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

export const updateMissionProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cfg = getConfig()
  if (!cfg.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  const { missionCode, increment } = req.body
  if (!missionCode) {
    throw new ValidationError('Mission code is required')
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const db = getPrisma()
  const mission = await db.missionDefinition.findUnique({
    where: { code: missionCode, active: true },
  })

  if (!mission) {
    throw new NotFoundError('Mission not found')
  }

  const criteria = (mission.criteria as any[]) || []
  const targetValue = criteria.length > 0 ? (criteria[0].value || 1) : 1

  let userMission = await db.userMission.findUnique({
    where: {
      userId_missionId_assignmentDate: {
        userId,
        missionId: mission.id,
        assignmentDate: todayStart,
      },
    },
  })

  if (!userMission) {
    userMission = await db.userMission.create({
      data: {
        userId,
        missionId: mission.id,
        assignmentDate: todayStart,
        progressValue: increment || 1,
        targetValue,
      },
    })
  } else {
    userMission = await db.userMission.update({
      where: { id: userMission.id },
      data: {
        progressValue: { increment: increment || 1 },
      },
    })
  }

  const isComplete = (userMission.progressValue || 0) >= targetValue
  if (isComplete && !userMission.completedAt) {
    userMission = await db.userMission.update({
      where: { id: userMission.id },
      data: {
        completedAt: new Date(),
        status: 'COMPLETED',
      },
    })

    await db.xPTransaction.create({
      data: {
        userId,
        actionType: 'MISSION_COMPLETE' as any,
        deltaXP: mission.xpReward,
        sourceType: 'Mission',
        sourceId: mission.id,
        reason: `Completed mission: ${mission.name}`,
        idempotencyKey: `mission:${userId}:${mission.id}:${todayStart.toISOString()}`,
      },
    })

    await db.user.update({
      where: { id: userId },
      data: { totalXP: { increment: mission.xpReward } },
    })
  }

  res.json({ success: true, data: userMission })
})
