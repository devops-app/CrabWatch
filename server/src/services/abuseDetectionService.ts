import prisma from '../config/database'

// ==================== ABUSE DETECTION SERVICE ====================

export interface AbuseSignal {
  userId: string
  signalType: 'VELOCITY' | 'DUPLICATE' | 'DEVICE_FARM' | 'COORDINATE_CLUSTER' | 'IMAGE_HASH'
  severity: 'low' | 'medium' | 'high'
  score: number
  details: string
  evidence: Record<string, any>
  createdAt: Date
}

export async function analyzeUserActivity(userId: string): Promise<AbuseSignal[]> {
  const signals: AbuseSignal[] = []
  const now = new Date()

  // 1. Velocity check: too many submissions in a short period
  const velocitySignals = await checkVelocity(userId, now)
  signals.push(...velocitySignals)

  // 2. Duplicate check: same species at same coordinates
  const duplicateSignals = await checkDuplicates(userId, now)
  signals.push(...duplicateSignals)

  // 3. Coordinate clustering: many observations from identical coordinates
  const clusterSignals = await checkCoordinateClustering(userId, now)
  signals.push(...clusterSignals)

  return signals
}

async function checkVelocity(userId: string, now: Date): Promise<AbuseSignal[]> {
  const signals: AbuseSignal[] = []

  // Check last hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const hourlyCount = await prisma.observation.count({
    where: { userId, createdAt: { gte: oneHourAgo } },
  })

  if (hourlyCount > 20) {
    signals.push({
      userId,
      signalType: 'VELOCITY',
      severity: 'high',
      score: Math.min(100, hourlyCount * 3),
      details: `${hourlyCount} observations in the last hour`,
      evidence: { hourlyCount, threshold: 20 },
      createdAt: now,
    })
  } else if (hourlyCount > 10) {
    signals.push({
      userId,
      signalType: 'VELOCITY',
      severity: 'medium',
      score: Math.min(100, hourlyCount * 2),
      details: `${hourlyCount} observations in the last hour`,
      evidence: { hourlyCount, threshold: 10 },
      createdAt: now,
    })
  }

  // Check last day
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const dailyCount = await prisma.observation.count({
    where: { userId, createdAt: { gte: oneDayAgo } },
  })

  if (dailyCount > 50) {
    signals.push({
      userId,
      signalType: 'VELOCITY',
      severity: 'high',
      score: Math.min(100, dailyCount * 1.5),
      details: `${dailyCount} observations in the last 24 hours`,
      evidence: { dailyCount, threshold: 50 },
      createdAt: now,
    })
  }

  return signals
}

async function checkDuplicates(userId: string, now: Date): Promise<AbuseSignal[]> {
  const signals: AbuseSignal[] = []

  // Find observations with same species and very close coordinates within 1 hour
  const recentObs = await prisma.observation.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
    },
    select: {
      id: true,
      speciesId: true,
      lat: true,
      lng: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Check for near-duplicates
  let duplicateCount = 0
  for (let i = 0; i < recentObs.length; i++) {
    for (let j = i + 1; j < recentObs.length; j++) {
      const a = recentObs[i]
      const b = recentObs[j]
      if (a.speciesId === b.speciesId && a.lat && b.lat && a.lng && b.lng) {
        const dist = haversineDistance(a.lat, a.lng, b.lat, b.lng)
        if (dist < 10) { // Less than 10 meters apart
          duplicateCount++
        }
      }
    }
  }

  if (duplicateCount > 3) {
    signals.push({
      userId,
      signalType: 'DUPLICATE',
      severity: duplicateCount > 10 ? 'high' : 'medium',
      score: Math.min(100, duplicateCount * 5),
      details: `${duplicateCount} near-duplicate observations detected`,
      evidence: { duplicateCount, recentObservations: recentObs.length },
      createdAt: now,
    })
  }

  return signals
}

async function checkCoordinateClustering(userId: string, now: Date): Promise<AbuseSignal[]> {
  const signals: AbuseSignal[] = []

  // Group observations by coordinate clusters (rounded to 4 decimal places ~10m precision)
  const observations = await prisma.observation.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    },
    select: {
      lat: true,
      lng: true,
    },
  })

  // Count unique coordinate clusters
  const coordClusters = new Map<string, number>()
  for (const obs of observations) {
    if (obs.lat && obs.lng) {
      const key = `${Math.round(obs.lat * 10000) / 10000},${Math.round(obs.lng * 10000) / 10000}`
      coordClusters.set(key, (coordClusters.get(key) || 0) + 1)
    }
  }

  // Check if too many observations are from the same coordinates
  const maxCluster = Math.max(...coordClusters.values(), 0)
  const totalObs = observations.length

  if (totalObs > 10 && maxCluster / totalObs > 0.8) {
    signals.push({
      userId,
      signalType: 'COORDINATE_CLUSTER',
      severity: maxCluster / totalObs > 0.95 ? 'high' : 'medium',
      score: Math.round((maxCluster / totalObs) * 100),
      details: `${maxCluster} of ${totalObs} observations from the same location`,
      evidence: {
        maxCluster,
        totalObs,
        uniqueClusters: coordClusters.size,
        ratio: Math.round((maxCluster / totalObs) * 100) / 100,
      },
      createdAt: now,
    })
  }

  return signals
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ==================== ABUSE SCORE ====================

export async function getAbuseScore(userId: string): Promise<{
  score: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  signals: AbuseSignal[]
  isBlocked: boolean
  autoActions: string[]
}> {
  const signals = await analyzeUserActivity(userId)

  // Check existing abuse record
  const existing = await prisma.abuseSignal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Calculate composite score
  const recentSignals = signals.filter((s) => s.severity === 'high')
  const historicalSignals = existing.filter((e) => e.riskScore >= 80)

  let score = 0
  score += recentSignals.reduce((sum, s) => sum + s.score, 0)
  score += historicalSignals.length * 10

  score = Math.min(100, score)

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (score >= 80) riskLevel = 'critical'
  else if (score >= 60) riskLevel = 'high'
  else if (score >= 30) riskLevel = 'medium'

  const autoActions: string[] = []

  // Auto-actions based on risk level
  if (riskLevel === 'critical') {
    autoActions.push('FLAG_FOR_REVIEW')
    autoActions.push('DISABLE_XP_AWARDS')
  } else if (riskLevel === 'high') {
    autoActions.push('FLAG_FOR_REVIEW')
  }

  // Store signals
  for (const signal of signals) {
    const typeMap: Record<string, string> = {
      VELOCITY: 'VELOCITY',
      DUPLICATE: 'DUPLICATE_CONTENT',
      DEVICE_FARM: 'DEVICE_FARM',
      COORDINATE_CLUSTER: 'SUSPICIOUS_PATTERN',
      IMAGE_HASH: 'SUSPICIOUS_PATTERN',
    }
    const severityToScore = (s: string) => s === 'high' ? 85 : s === 'medium' ? 55 : 25
    await prisma.abuseSignal.create({
      data: {
        userId,
        type: (typeMap[signal.signalType] || 'SUSPICIOUS_PATTERN') as any,
        riskScore: signal.score,
        source: 'auto-detection',
        summary: signal.details,
        metadata: signal.evidence,
      },
    }).catch(() => {}) // Non-blocking
  }

  return {
    score,
    riskLevel,
    signals,
    isBlocked: riskLevel === 'critical',
    autoActions,
  }
}
