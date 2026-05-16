import prisma from '../config/database'
import { config } from '../config'

/**
 * Assigns active daily missions to all eligible users who don't already have
 * a mission for today. Runs once per day (typically at midnight UTC).
 */
export async function assignDailyMissions(): Promise<{ assigned: number; skipped: number }> {
  if (!config.engagement.missionsEnabled) {
    return { assigned: 0, skipped: 0 }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all active daily mission definitions
  const dailyMissions = await prisma.missionDefinition.findMany({
    where: {
      active: true,
      cadence: 'DAILY',
      AND: [
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: today } },
          ],
        },
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: today } },
          ],
        },
      ],
    },
  })

  if (dailyMissions.length === 0) {
    return { assigned: 0, skipped: 0 }
  }

  // Get all active, non-deleted users
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      blockedAt: null,
    },
    select: { id: true },
  })

  let assigned = 0
  let skipped = 0

  for (const mission of dailyMissions) {
    for (const user of users) {
      // Check if user already has this mission for today
      const existing = await prisma.userMission.findUnique({
        where: {
          userId_missionId_assignmentDate: {
            userId: user.id,
            missionId: mission.id,
            assignmentDate: today,
          },
        },
      })

      if (existing) {
        skipped++
        continue
      }

      try {
        await prisma.userMission.create({
          data: {
            userId: user.id,
            missionId: mission.id,
            assignmentDate: today,
            progressValue: 0,
            targetValue: (mission.criteria as any)?.target ?? 1,
            status: 'ASSIGNED',
          },
        })
        assigned++
      } catch {
        // Duplicate or constraint error - skip
        skipped++
      }
    }
  }

  return { assigned, skipped }
}

/**
 * Assigns active weekly missions to users on Monday (day 1).
 */
export async function assignWeeklyMissions(): Promise<{ assigned: number; skipped: number }> {
  if (!config.engagement.missionsEnabled) {
    return { assigned: 0, skipped: 0 }
  }

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  // Get all active weekly mission definitions
  const weeklyMissions = await prisma.missionDefinition.findMany({
    where: {
      active: true,
      cadence: 'WEEKLY',
      AND: [
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: today } },
          ],
        },
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: today } },
          ],
        },
      ],
    },
  })

  if (weeklyMissions.length === 0) {
    return { assigned: 0, skipped: 0 }
  }

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      blockedAt: null,
    },
    select: { id: true },
  })

  let assigned = 0
  let skipped = 0

  for (const mission of weeklyMissions) {
    for (const user of users) {
      // Find the most recent assignment for this user + mission
      const lastAssignment = await prisma.userMission.findFirst({
        where: {
          userId: user.id,
          missionId: mission.id,
        },
        orderBy: { assignmentDate: 'desc' },
      })

      // If user already has a non-expired weekly mission, skip
      if (lastAssignment) {
        const daysSinceAssignment = Math.floor(
          (today.getTime() - lastAssignment.assignmentDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceAssignment < 7) {
          skipped++
          continue
        }
      }

      try {
        await prisma.userMission.create({
          data: {
            userId: user.id,
            missionId: mission.id,
            assignmentDate: today,
            progressValue: 0,
            targetValue: (mission.criteria as any)?.target ?? 1,
            status: 'ASSIGNED',
          },
        })
        assigned++
      } catch {
        skipped++
      }
    }
  }

  return { assigned, skipped }
}
