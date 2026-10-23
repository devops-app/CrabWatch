import crypto from 'crypto'
import { getPrisma } from './container'

export interface RecalculationResult {
  userId: string
  currentXP: number
  correctXP: number
  diff: number
}

export interface RecalculationParams {
  mode: 'dry-run' | 'execute'
  userId?: string
  reason?: string
}

export interface RecalculationOutput {
  jobId: string
  mode: string
  totalUsers: number
  results: RecalculationResult[]
}

export interface RecalculationJobStatus {
  jobId: string
  mode: string
  status: 'running' | 'completed' | 'failed'
  totalUsers: number
  processedUsers: number
  discrepancies: number
  results?: RecalculationResult[]
  startedAt: string
  completedAt?: string
  error?: string
}

// In-memory job tracking with max-size eviction (LRU-style)
const jobs = new Map<string, RecalculationJobStatus>()
const MAX_JOBS = 50

function setJob(jobId: string, status: RecalculationJobStatus): void {
  if (jobs.size >= MAX_JOBS && !jobs.has(jobId)) {
    const oldestKey = jobs.keys().next().value
    if (oldestKey !== undefined) {
      jobs.delete(oldestKey)
    }
  }
  jobs.set(jobId, status)
}

/**
 * Recalculate user XP from XPTransaction ledger and compare against stored totalXP.
 * In dry-run mode, returns diff without writing. In execute mode, patches discrepancies.
 */
export async function recalculateXP(params: RecalculationParams, adminId?: string): Promise<RecalculationOutput> {
  const jobId = crypto.randomUUID()
  const startedAt = new Date()

  // Create job tracking entry
  const jobStatus: RecalculationJobStatus = {
    jobId,
    mode: params.mode,
    status: 'running',
    totalUsers: 0,
    processedUsers: 0,
    discrepancies: 0,
    startedAt: startedAt.toISOString(),
  }
  setJob(jobId, jobStatus)

  try {
    const users = params.userId
      ? await getPrisma().user.findMany({ where: { id: params.userId } })
      : await getPrisma().user.findMany({ where: { deletedAt: null } })

    jobStatus.totalUsers = users.length

    // Single grouped query instead of one findMany per user (fixes N+1).
    // Users absent from the result have no ledger transactions -> total 0.
    const ledgerTotals = await getPrisma().xPTransaction.groupBy({
      by: ['userId'],
      where: params.userId ? { userId: params.userId } : undefined,
      _sum: { deltaXP: true },
    })
    const ledgerMap = new Map(ledgerTotals.map((t) => [t.userId, t._sum.deltaXP ?? 0]))

    const results: RecalculationResult[] = []
    const discrepancies: RecalculationResult[] = []

    for (const user of users) {
      const correctXP = ledgerMap.get(user.id) ?? 0
      const diff = correctXP - user.totalXP

      const result: RecalculationResult = {
        userId: user.id,
        currentXP: user.totalXP,
        correctXP,
        diff,
      }
      results.push(result)

      if (diff !== 0) {
        jobStatus.discrepancies++
        discrepancies.push(result)
      }

      // The ledger is authoritative: set totalXP to the ledger sum.
      // Do NOT insert an adjustment transaction — that would add `diff` on
      // top of the ledger and corrupt it (the very inconsistency this repair
      // is meant to resolve).
      if (params.mode === 'execute' && diff !== 0) {
        await getPrisma().user.update({
          where: { id: user.id },
          data: { totalXP: correctXP },
        })
      }

      jobStatus.processedUsers++
    }

    // Audit log for the recalculation run
    await getPrisma().auditLog.create({
      data: {
        actorType: adminId ? 'ADMIN' : 'SYSTEM',
        actorId: adminId || null,
        action: 'RECALCULATE_XP',
        resourceType: 'System',
        afterState: {
          mode: params.mode,
          totalUsers: users.length,
          discrepancies: discrepancies.length,
          repairedUsers: params.mode === 'execute' ? discrepancies.map((d) => d.userId) : undefined,
        },
        reason: params.reason || 'XP recalculation',
      },
    })

    jobStatus.status = 'completed'
    jobStatus.results = results
    jobStatus.completedAt = new Date().toISOString()

    return {
      jobId,
      mode: params.mode,
      totalUsers: users.length,
      results,
    }
  } catch (error: unknown) {
    jobStatus.status = 'failed'
    jobStatus.error = error instanceof Error ? error.message : String(error)
    jobStatus.completedAt = new Date().toISOString()
    throw error
  }
}

/**
 * Get the status of a recalculation job by ID.
 */
export async function getRecalculationJobStatus(jobId: string): Promise<RecalculationJobStatus | null> {
  return jobs.get(jobId) || null
}
