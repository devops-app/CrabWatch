import prisma from '../config/database'
import { config } from '../config'
import logger from '../utils/logger'

/** Page size for cursor-paginated user reads (bounds memory). */
const USER_PAGE = 5000

interface MissionTarget {
  id: string
  targetValue: number
}

function readTargetValue(criteria: unknown): number {
  return (criteria as { target?: number } | null)?.target ?? 1
}

/**
 * Start of the current UTC calendar week (Monday 00:00:00 UTC).
 * Used as the idempotent assignment-period key for weekly missions.
 */
function utcWeekStart(now: Date): Date {
  const utcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = utcDay.getUTCDay() // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = (day + 6) % 7
  return new Date(utcDay.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000)
}

/**
 * Assigns active missions of the given cadence to all eligible users who do
 * not already have an assignment for the period key.
 *
 * Uses cursor-paginated user reads and chunked `createMany({ skipDuplicates })`
 * so the job scales to large user bases without N+1 lookups/inserts. The
 * compound unique constraint (userId, missionId, assignmentDate) makes the
 * operation idempotent: re-running for the same period inserts nothing new.
 */
async function assignMissions(
  cadence: 'DAILY' | 'WEEKLY',
  assignmentDate: Date,
): Promise<{ assigned: number; skipped: number }> {
  const missions = await prisma.missionDefinition.findMany({
    where: {
      active: true,
      cadence,
      AND: [
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: assignmentDate } },
          ],
        },
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: assignmentDate } },
          ],
        },
      ],
    },
    select: { id: true, criteria: true },
  })

  if (missions.length === 0) {
    return { assigned: 0, skipped: 0 }
  }

  const targets: MissionTarget[] = missions.map((m) => ({
    id: m.id,
    targetValue: readTargetValue(m.criteria),
  }))

  let assigned = 0
  let skipped = 0
  let cursor: string | undefined

  // Page through eligible users with a stable cursor so we never load the
  // whole table into memory at once.
  for (;;) {
    const page = await prisma.user.findMany({
      where: { deletedAt: null, blockedAt: null },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: USER_PAGE,
      cursor: cursor ? { id: cursor } : undefined,
    })

    if (page.length === 0) break

    for (const mission of targets) {
      const rows = page.map((u) => ({
        userId: u.id,
        missionId: mission.id,
        assignmentDate,
        progressValue: 0,
        targetValue: mission.targetValue,
        status: 'ASSIGNED' as const,
      }))

      // skipDuplicates -> ON CONFLICT DO NOTHING. Duplicates are absorbed by
      // the DB (counted as skipped); any other error (outage, constraint,
      // schema) propagates instead of being silently swallowed.
      const result = await prisma.userMission.createMany({
        data: rows,
        skipDuplicates: true,
      })
      assigned += result.count
      skipped += rows.length - result.count
    }

    if (page.length < USER_PAGE) break
    cursor = page[page.length - 1].id
  }

  logger.info(
    { cadence, assignmentDate: assignmentDate.toISOString(), assigned, skipped },
    'Mission assignment completed',
  )

  return { assigned, skipped }
}

/**
 * Assigns active daily missions to all eligible users who don't already have
 * a mission for today. Runs once per day (typically at midnight UTC).
 *
 * The assignment date is the start of the current UTC day, so results are
 * identical regardless of the host's local timezone.
 */
export async function assignDailyMissions(): Promise<{ assigned: number; skipped: number }> {
  if (!config.engagement.missionsEnabled) {
    return { assigned: 0, skipped: 0 }
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  return assignMissions('DAILY', today)
}

/**
 * Assigns active weekly missions to all eligible users for the current UTC
 * calendar week. The assignment date is the Monday 00:00:00 UTC of the
 * current week, so the compound unique constraint guarantees exactly one
 * assignment per user per calendar week — independent of when the scheduler
 * fires (rolling 7-day windows are no longer used).
 */
export async function assignWeeklyMissions(): Promise<{ assigned: number; skipped: number }> {
  if (!config.engagement.missionsEnabled) {
    return { assigned: 0, skipped: 0 }
  }

  const weekStart = utcWeekStart(new Date())

  return assignMissions('WEEKLY', weekStart)
}
