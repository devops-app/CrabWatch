import {
  SizeFrequencyData,
  GenderRatioData,
  ConditionIndexAggregatedData,
  CW50Data,
  TemporalTrendData,
  SpeciesDistributionData,
  DashboardStats,
} from '@crabwatch/shared'
import { Prisma, Gender as PrismaGender } from '@prisma/client'
import { getPrisma } from './container'
import { ValidationError } from '../utils/errors'

const GENDER_VALUES: readonly string[] = ['MALE', 'FEMALE', 'UNKNOWN']

/**
 * Validate a gender filter against the enum before it is used in a query.
 * Replaces the previous unsafe `as PrismaGender` cast.
 */
function toGenderFilter(gender?: string): PrismaGender | undefined {
  if (!gender) return undefined
  const upper = gender.toUpperCase()
  if (!GENDER_VALUES.includes(upper)) {
    throw new ValidationError(`Invalid gender filter: ${gender}`)
  }
  return upper as PrismaGender
}

/**
 * Build a half-open `createdAt` range from date-only strings.
 *
 * `dateFrom` is inclusive (UTC midnight of the start day) and `dateTo` is
 * inclusive of the *entire* end day, expressed as `lt` the UTC midnight of the
 * following day. The previous `lte: new Date(dateTo)` pinned the bound to UTC
 * midnight of the end day and silently dropped every observation created on
 * that day (Finding 3).
 */
function toCreatedAtRange(
  dateFrom?: string,
  dateTo?: string
): Prisma.ObservationWhereInput['createdAt'] {
  if (!dateFrom && !dateTo) return undefined
  const range: { gte?: Date; lt?: Date } = {}
  if (dateFrom) range.gte = new Date(dateFrom)
  if (dateTo) {
    const end = new Date(dateTo)
    end.setUTCDate(end.getUTCDate() + 1)
    range.lt = end
  }
  return range
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalObs, approvedObs, pendingObs, totalSpecies, totalUsers] = await Promise.all([
    getPrisma().observation.count(),
    getPrisma().observation.count({ where: { status: 'APPROVED' } }),
    getPrisma().observation.count({ where: { status: 'PENDING' } }),
    getPrisma().species.count(),
    getPrisma().user.count(),
  ])

  // NOTE: State coverage is derived from lat/lng bounding rectangles because
  // Observation has no persisted `stateCode` column. The read is capped and
  // ordered by id so the subset is deterministic (previously the 50k window
  // was unordered and could vary with the query plan). A full fix — persist a
  // normalized `stateCode` at write time and `groupBy` it in SQL — is tracked
  // as a schema change (see CODE_REVIEW.md, P1).
  const approvedObsWithLocation = await getPrisma().observation.findMany({
    where: { status: 'APPROVED' },
    select: { lat: true, lng: true },
    orderBy: { id: 'asc' },
    take: 50000,
  })

  const statesCovered = new Set<string>()
  for (const obs of approvedObsWithLocation) {
    const state = getStateFromCoords(obs.lat, obs.lng)
    if (state) statesCovered.add(state)
  }

  return {
    totalObservations: totalObs,
    approvedObservations: approvedObs,
    pendingObservations: pendingObs,
    totalSpecies: totalSpecies,
    totalContributors: totalUsers,
    statesCovered: statesCovered.size,
  }
}

export async function getSizeFrequency(
  speciesId?: string,
  gender?: string,
  _pagination?: unknown
): Promise<SizeFrequencyData[]> {
  // Bin in SQL (FLOOR(cw)) so we never load every approved row into memory.
  // All filters are interpolated as bound parameters via Prisma.sql — never
  // string concatenation.
  // NOTE: raw SQL uses the physical column names from the migration —
  // table "observations", gender stored in "sex" (Prisma maps it to `gender`).
  const whereClauses: Prisma.Sql[] = [
    Prisma.sql`"status" = 'APPROVED'`,
    Prisma.sql`"cw" >= 0`,
  ]
  if (speciesId) {
    whereClauses.push(Prisma.sql`"speciesId" = ${speciesId}`)
  }
  const genderFilter = toGenderFilter(gender)
  if (genderFilter) {
    whereClauses.push(Prisma.sql`"sex" = ${genderFilter}`)
  }

  const rows = await getPrisma().$queryRaw<
    Array<{ size_bin: number; count: number }>
  >`
    SELECT
      (CASE WHEN "cw" >= 20 THEN 20 ELSE FLOOR("cw") END)::int AS size_bin,
      COUNT(*)::int AS count
    FROM "observations"
    WHERE ${Prisma.join(whereClauses, ' AND ')}
    GROUP BY size_bin
    ORDER BY size_bin
  `

  const countsByBin = new Map<number, number>(rows.map((r) => [r.size_bin, r.count]))

  const bins: Record<string, number> = {}
  for (let i = 0; i < 20; i += 1) {
    bins[`${i}-${i + 1}cm`] = countsByBin.get(i) ?? 0
  }
  bins['20cm+'] = countsByBin.get(20) ?? 0

  return Object.entries(bins).map(([sizeBin, count]) => ({
    sizeBin,
    count,
  }))
}

export async function getGenderRatio(
  speciesId?: string,
  dateFrom?: string,
  dateTo?: string,
  _pagination?: unknown
): Promise<GenderRatioData[]> {
  const where: Prisma.ObservationWhereInput = { status: 'APPROVED' }
  if (speciesId) where.speciesId = speciesId
  const createdAt = toCreatedAtRange(dateFrom, dateTo)
  if (createdAt) where.createdAt = createdAt

  const observations = await getPrisma().observation.groupBy({
    by: ['speciesId', 'gender'],
    where,
    _count: { _all: true },
  })

  const speciesRows = await getPrisma().species.findMany({
    where: { id: { in: observations.map(obs => obs.speciesId) } },
    select: { id: true, scientificName: true },
  })

  const speciesNameById = new Map(speciesRows.map(s => [s.id, s.scientificName]))

  const grouped: Record<string, { male: number; female: number; unknown: number }> = {}

  for (const obs of observations) {
    const species = speciesNameById.get(obs.speciesId) ?? 'Unknown'
    if (!grouped[species]) {
      grouped[species] = { male: 0, female: 0, unknown: 0 }
    }
    grouped[species][obs.gender.toLowerCase() as 'male' | 'female' | 'unknown'] += obs._count._all
  }

  return Object.entries(grouped).map(([species, counts]) => {
    const { male, female } = counts
    const ratio = female > 0 ? male / female : male > 0 ? Infinity : 0
    return {
      species,
      ...counts,
      ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : ratio,
    }
  })
}

export async function getConditionIndices(
  speciesId?: string,
  _pagination?: unknown
): Promise<ConditionIndexAggregatedData[]> {
  // Aggregate in SQL so we never load every approved row into memory.
  // Guards: bw IS NOT NULL and cw > 0 (prevents Infinity / division by zero).
  // STDDEV_POP matches the previous population-variance calculation.
  const whereClauses: Prisma.Sql[] = [
    Prisma.sql`o."status" = 'APPROVED'`,
    Prisma.sql`o."bw" IS NOT NULL`,
    Prisma.sql`o."cw" > 0`,
  ]
  if (speciesId) {
    whereClauses.push(Prisma.sql`o."speciesId" = ${speciesId}`)
  }

  const rows = await getPrisma().$queryRaw<
    Array<{
      species: string
      count: number
      mean_cf: number | null
      median_cf: number | null
      min_cf: number | null
      max_cf: number | null
      std_cf: number | null
      mean_cw: number | null
      mean_bw: number | null
    }>
  >`
    SELECT
      s."scientificName" AS species,
      COUNT(*)::int AS count,
      AVG((o."bw" / POWER(o."cw", 3)) * 100) AS mean_cf,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (o."bw" / POWER(o."cw", 3)) * 100) AS median_cf,
      MIN((o."bw" / POWER(o."cw", 3)) * 100) AS min_cf,
      MAX((o."bw" / POWER(o."cw", 3)) * 100) AS max_cf,
      STDDEV_POP((o."bw" / POWER(o."cw", 3)) * 100) AS std_cf,
      AVG(o."cw") AS mean_cw,
      AVG(o."bw") AS mean_bw
    FROM "observations" o
    JOIN "species" s ON s."id" = o."speciesId"
    WHERE ${Prisma.join(whereClauses, ' AND ')}
    GROUP BY s."scientificName"
  `

  return rows.map((r) => ({
    species: r.species,
    count: r.count,
    meanConditionFactor: Number((r.mean_cf ?? 0).toFixed(3)),
    medianConditionFactor: Number((r.median_cf ?? 0).toFixed(3)),
    minConditionFactor: Number((r.min_cf ?? 0).toFixed(3)),
    maxConditionFactor: Number((r.max_cf ?? 0).toFixed(3)),
    stdDevConditionFactor: Number((r.std_cf ?? 0).toFixed(3)),
    meanCW: Number((r.mean_cw ?? 0).toFixed(2)),
    meanBW: Number((r.mean_bw ?? 0).toFixed(2)),
  }))
}

export async function getCW50(
  speciesId?: string,
  _pagination?: unknown
): Promise<CW50Data[]> {
  const where: Prisma.ObservationWhereInput = {
    status: 'APPROVED',
    maturationStatus: { in: ['MATURE', 'IMMATURE'] },
    gender: { in: ['MALE', 'FEMALE'] },
  }
  if (speciesId) where.speciesId = speciesId

  const observations = await getPrisma().observation.findMany({
    where,
    select: {
      cw: true,
      maturationStatus: true,
      species: { select: { scientificName: true } },
    },
  })

  const grouped: Record<string, { cw: number; isMature: boolean }[]> = {}

  for (const obs of observations) {
    const key = obs.species.scientificName
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({
      cw: obs.cw,
      isMature: obs.maturationStatus === 'MATURE',
    })
  }

  return Object.entries(grouped).map(([species, data]) => {
    const sorted = [...data].sort((a, b) => a.cw - b.cw)
    const { cw50, ciLow, ciHigh } = estimateCW50(sorted)
    return {
      species,
      cw50: Number(cw50.toFixed(1)),
      confidenceInterval: [Number(ciLow.toFixed(1)), Number(ciHigh.toFixed(1))] as [number, number],
      sampleSize: sorted.length,
    }
  })
}

export async function getSpeciesDistribution(
  dateFrom?: string,
  dateTo?: string
): Promise<SpeciesDistributionData[]> {
  const where: Prisma.ObservationWhereInput = { status: 'APPROVED' }
  const createdAt = toCreatedAtRange(dateFrom, dateTo)
  if (createdAt) where.createdAt = createdAt

  const observations = await getPrisma().observation.groupBy({
    by: ['speciesId'],
    where,
    _count: { speciesId: true },
  })

  const speciesData = await getPrisma().species.findMany({
    where: {
      id: {
        in: observations.map(o => o.speciesId),
      },
    },
    select: {
      id: true,
      scientificName: true,
      commonName: true,
    },
  })

  const speciesMap = new Map(speciesData.map(s => [s.id, s]))

  return observations.map(o => {
    const species = speciesMap.get(o.speciesId)
    return {
      speciesId: o.speciesId,
      species: species?.scientificName ?? 'Unknown',
      commonName: species?.commonName ?? 'Unknown',
      count: o._count.speciesId,
    }
  }).sort((a, b) => b.count - a.count)
}

export async function getTemporalTrends(
  speciesId?: string,
  _pagination?: unknown
): Promise<TemporalTrendData[]> {
  // Group by month + species in SQL (DATE_TRUNC) so we never load every
  // approved row into memory. Output is already ordered by month, then species.
  const whereClauses: Prisma.Sql[] = [Prisma.sql`o."status" = 'APPROVED'`]
  if (speciesId) {
    whereClauses.push(Prisma.sql`o."speciesId" = ${speciesId}`)
  }

  const rows = await getPrisma().$queryRaw<
    Array<{ month: string; species: string; count: number }>
  >`
    SELECT
      TO_CHAR(DATE_TRUNC('month', o."createdAt"), 'YYYY-MM') AS month,
      s."scientificName" AS species,
      COUNT(*)::int AS count
    FROM "observations" o
    JOIN "species" s ON s."id" = o."speciesId"
    WHERE ${Prisma.join(whereClauses, ' AND ')}
    GROUP BY month, s."scientificName"
    ORDER BY month, s."scientificName"
  `

  return rows.map((r) => ({
    month: r.month,
    count: r.count,
    species: r.species,
  }))
}

// Helper functions

/**
 * Estimate the width at which 50% of the sample is mature, plus an honest
 * bracketing interval. The interval is the range of the two adjacent
 * observations that straddle the 50% maturity crossing — a real, data-derived
 * uncertainty band (NOT the previous fabricated `cw50 ± 1`).
 *
 * NOTE: the cumulative-share estimator is a simple descriptive statistic, not
 * a fitted maturity model. A defensible redesign (logistic regression of
 * maturity vs. width, or a bootstrap CI) is tracked separately in
 * CODE_REVIEW.md (P1) and is out of scope for the performance fix.
 */
function estimateCW50(
  sorted: { cw: number; isMature: boolean }[],
): { cw50: number; ciLow: number; ciHigh: number } {
  const total = sorted.length
  if (total === 0) return { cw50: 0, ciLow: 0, ciHigh: 0 }

  const cumulative: { cw: number; proportion: number }[] = []
  let matureCount = 0
  for (const obs of sorted) {
    if (obs.isMature) matureCount++
    cumulative.push({ cw: obs.cw, proportion: matureCount / total })
  }

  for (let i = 0; i < cumulative.length - 1; i++) {
    const a = cumulative[i]
    const b = cumulative[i + 1]
    if (a.proportion <= 0.5 && b.proportion >= 0.5) {
      const ciLow = Math.min(a.cw, b.cw)
      const ciHigh = Math.max(a.cw, b.cw)
      const dProp = b.proportion - a.proportion
      const dCw = b.cw - a.cw
      // Guard against a zero slope (equal widths / flat proportion) to avoid
      // division by zero producing an invalid CW50.
      if (dCw === 0 || dProp === 0) {
        return { cw50: a.cw, ciLow, ciHigh }
      }
      const cw50 = a.cw + (0.5 - a.proportion) / (dProp / dCw)
      return { cw50, ciLow, ciHigh }
    }
  }

  const mid = sorted[Math.floor(sorted.length / 2)]?.cw ?? 0
  return { cw50: mid, ciLow: mid, ciHigh: mid }
}

function getStateFromCoords(_lat: number, _lng: number): string | null {
  const stateBounds: Record<string, { latRange: [number, number]; lngRange: [number, number] }> = {
    'Perlis': { latRange: [6.4, 6.9], lngRange: [100.1, 100.4] },
    'Kedah': { latRange: [5.6, 6.8], lngRange: [100.2, 101.3] },
    'Pulau Pinang': { latRange: [5.2, 5.6], lngRange: [100.2, 100.4] },
    'Perak': { latRange: [4.6, 6.8], lngRange: [100.7, 101.3] },
    'Kelantan': { latRange: [5.9, 6.2], lngRange: [102.2, 102.6] },
    'Terengganu': { latRange: [4.9, 5.9], lngRange: [102.8, 103.2] },
    'Pahang': { latRange: [3.5, 5.0], lngRange: [102.8, 103.7] },
    'Selangor': { latRange: [2.8, 3.5], lngRange: [101.1, 101.8] },
    'Kuala Lumpur': { latRange: [3.0, 3.2], lngRange: [101.6, 101.8] },
    'Putrajaya': { latRange: [2.9, 3.0], lngRange: [101.6, 101.7] },
    'Negeri Sembilan': { latRange: [2.4, 2.9], lngRange: [101.7, 102.2] },
    'Melaka': { latRange: [2.1, 2.4], lngRange: [101.8, 102.2] },
    'Johor': { latRange: [1.3, 2.5], lngRange: [102.8, 104.3] },
    'Sabah': { latRange: [4.3, 7.1], lngRange: [116.0, 119.0] },
    'Sarawak': { latRange: [0.9, 4.4], lngRange: [109.7, 115.5] },
    'Labuan': { latRange: [4.9, 5.0], lngRange: [115.0, 115.3] },
  }

  for (const [state, bounds] of Object.entries(stateBounds)) {
    if (
      _lat >= bounds.latRange[0] &&
      _lat <= bounds.latRange[1] &&
      _lng >= bounds.lngRange[0] &&
      _lng <= bounds.lngRange[1]
    ) {
      return state
    }
  }

  return null
}
