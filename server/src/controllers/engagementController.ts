import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import { config } from '../config'

// ==================== ONBOARDING ====================

export async function getOnboardingStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  try {
    const userId = req.dbUser?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    // Get all active onboarding flows
    const flows = await prisma.onboardingFlow.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    })

    // Get user's progress for all flows
    const progress = await prisma.onboardingProgress.findMany({
      where: { userId },
    })

    // Build status by parsing steps JSON from each flow
    const steps: any[] = []
    for (const flow of flows) {
      const flowSteps = (flow.steps as any[]) || []
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
  } catch (error) {
    next(error)
  }
}

export async function completeOnboardingStep(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  try {
    const userId = req.dbUser?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { step: stepKey } = req.body
    if (!stepKey) {
      res.status(400).json({ success: false, error: 'Step is required' })
      return
    }

    // Find the active flow containing this step
    const flows = await prisma.onboardingFlow.findMany({
      where: { active: true },
    })

    let matchedFlow: any = null
    let matchedStep: any = null
    for (const flow of flows) {
      const flowSteps = (flow.steps as any[]) || []
      const step = flowSteps.find((s: any) => s.key === stepKey)
      if (step) {
        matchedFlow = flow
        matchedStep = step
        break
      }
    }

    if (!matchedFlow) {
      res.status(404).json({ success: false, error: 'Onboarding step not found' })
      return
    }

    // Upsert progress using composite key
    const progress = await prisma.onboardingProgress.upsert({
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
  } catch (error) {
    next(error)
  }
}

// ==================== MISSIONS ====================

export async function getActiveMissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  try {
    const userId = req.dbUser?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    // Get active missions
    const missions = await prisma.missionDefinition.findMany({
      where: {
        active: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Get user's missions for these definitions
    const missionIds = missions.map((m) => m.id)
    const userMissions = await prisma.userMission.findMany({
      where: {
        userId,
        missionId: { in: missionIds },
      },
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const result = missions.map((mission) => {
      const criteria = (mission.criteria as any[]) || []
      const targetCount = criteria.length > 0 ? (criteria[0].value || 1) : 1

      const userMission = userMissions.find(
        (um) => um.missionId === mission.id && um.assignmentDate.toDateString() === todayStart.toDateString()
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
  } catch (error) {
    next(error)
  }
}

export async function claimMission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  try {
    const userId = req.dbUser?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { missionCode } = req.body
    if (!missionCode) {
      res.status(400).json({ success: false, error: 'Mission code is required' })
      return
    }

    // Find mission by code
    const mission = await prisma.missionDefinition.findUnique({
      where: { code: missionCode, active: true },
    })

    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' })
      return
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const criteria = (mission.criteria as any[]) || []
    const targetValue = criteria.length > 0 ? (criteria[0].value || 1) : 1

    // Upsert user mission using missionId + assignmentDate
    const userMission = await prisma.userMission.upsert({
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
  } catch (error) {
    next(error)
  }
}

export async function updateMissionProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.missionsEnabled) {
    res.status(501).json({ success: false, error: 'Missions not enabled' })
    return
  }

  try {
    const userId = req.dbUser?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const { missionCode, increment } = req.body
    if (!missionCode) {
      res.status(400).json({ success: false, error: 'Mission code is required' })
      return
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get mission definition by code
    const mission = await prisma.missionDefinition.findUnique({
      where: { code: missionCode, active: true },
    })

    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' })
      return
    }

    const criteria = (mission.criteria as any[]) || []
    const targetValue = criteria.length > 0 ? (criteria[0].value || 1) : 1

    // Get or create user mission
    let userMission = await prisma.userMission.findUnique({
      where: {
        userId_missionId_assignmentDate: {
          userId,
          missionId: mission.id,
          assignmentDate: todayStart,
        },
      },
    })

    if (!userMission) {
      userMission = await prisma.userMission.create({
        data: {
          userId,
          missionId: mission.id,
          assignmentDate: todayStart,
          progressValue: increment || 1,
          targetValue,
        },
      })
    } else {
      userMission = await prisma.userMission.update({
        where: { id: userMission.id },
        data: {
          progressValue: { increment: increment || 1 },
        },
      })
    }

    // Check if mission is complete
    const isComplete = (userMission.progressValue || 0) >= targetValue
    if (isComplete && !userMission.completedAt) {
      userMission = await prisma.userMission.update({
        where: { id: userMission.id },
        data: {
          completedAt: new Date(),
          status: 'COMPLETED',
        },
      })

      // Award XP
      await prisma.xPTransaction.create({
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

      await prisma.user.update({
        where: { id: userId },
        data: { totalXP: { increment: mission.xpReward } },
      })
    }

    res.json({ success: true, data: userMission })
  } catch (error) {
    next(error)
  }
}
