import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { getContainer } from './container'

let _prisma: PrismaClient
function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = getContainer().prisma
  }
  return _prisma
}

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

// In-memory job tracking
const jobs = new Map<string, RecalculationJobStatus>()

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
  jobs.set(jobId, jobStatus)

  try {
    const users = params.userId
      ? await getPrisma().user.findMany({ where: { id: params.userId } })
      : await getPrisma().user.findMany({ where: { deletedAt: null } })

    jobStatus.totalUsers = users.length
    const results: RecalculationResult[] = []

    for (const user of users) {
      const transactions = await getPrisma().xPTransaction.findMany({
        where: { userId: user.id },
        select: { deltaXP: true },
      })

      const correctXP = transactions.reduce((s: number, t: any) => s + t.deltaXP, 0)
      const diff = correctXP - (user as any).totalXP

      results.push({
        userId: user.id,
        currentXP: (user as any).totalXP,
        correctXP,
        diff,
      })

      if (diff !== 0) {
        jobStatus.discrepancies++
      }

      if (params.mode === 'execute' && diff !== 0) {
        await getPrisma().user.update({
          where: { id: user.id },
          data: { totalXP: correctXP },
        })

        // Create adjustment transaction to keep ledger consistent
        await getPrisma().xPTransaction.create({
          data: {
            userId: user.id,
            actionType: diff > 0 ? 'ADMIN_ADJUSTMENT' : 'ADMIN_REVERSAL',
            deltaXP: diff,
            sourceType: 'Recalculation',
            reason: params.reason || 'XP recalculation correction',
            idempotencyKey: `recalc:${user.id}:${Date.now()}`,
          },
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
        afterState: { mode: params.mode, totalUsers: users.length, discrepancies: results.filter(r => r.diff !== 0).length } as any,
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
  } catch (error: any) {
    jobStatus.status = 'failed'
    jobStatus.error = error.message
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
