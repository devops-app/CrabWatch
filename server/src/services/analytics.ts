import {
  SizeFrequencyData,
  GenderRatioData,
  ConditionIndexAggregatedData,
  CW50Data,
  TemporalTrendData,
  SpeciesDistributionData,
  DashboardStats,
} from '@crabwatch/shared'
import { Prisma, Gender as PrismaGender, PrismaClient } from '@prisma/client'
import { getContainer } from './container'

let _prisma: PrismaClient
function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = getContainer().prisma
  }
  return _prisma
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalObs, approvedObs, pendingObs, totalSpecies, totalUsers] = await Promise.all([
    getPrisma().observation.count(),
    getPrisma().observation.count({ where: { status: 'APPROVED' } }),
    getPrisma().observation.count({ where: { status: 'PENDING' } }),
    getPrisma().species.count(),
    getPrisma().user.count(),
  ])

  const approvedObsWithLocation = await getPrisma().observation.findMany({
    where: { status: 'APPROVED' },
    select: { lat: true, lng: true },
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
  const where: Prisma.ObservationWhereInput = { status: 'APPROVED' }
  if (speciesId) where.speciesId = speciesId
  if (gender) where.gender = gender.toUpperCase() as PrismaGender

  const observations = await getPrisma().observation.findMany({
    where,
    select: { cw: true },
  })

  const bins: Record<string, number> = {}
  for (let i = 0; i < 20; i += 1) {
    const low = i
    const high = i + 1
    bins[`${low}-${high}cm`] = 0
  }
  bins['20cm+'] = 0

  for (const obs of observations) {
    const binIndex = Math.floor(obs.cw)
    const key = `${binIndex}-${binIndex + 1}cm`
    if (bins[key] !== undefined) {
      bins[key]++
    } else if (binIndex >= 20) {
      bins['20cm+']++
    }
  }

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
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo)
  }

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
  const where: Prisma.ObservationWhereInput = { status: 'APPROVED' }
  if (speciesId) where.speciesId = speciesId

  const observations = await getPrisma().observation.findMany({
    where,
    select: {
      cw: true,
      bw: true,
      species: { select: { scientificName: true } },
    },
  })

  const grouped: Record<string, { cw: number; bw: number; conditionFactor: number }[]> = {}

  for (const obs of observations) {
    if (obs.bw == null) continue
    const species = obs.species.scientificName
    const conditionFactor = calculateConditionFactor(obs.cw, obs.bw!)
    if (!grouped[species]) grouped[species] = []
    grouped[species].push({ cw: obs.cw, bw: obs.bw!, conditionFactor })
  }

  return Object.entries(grouped).map(([species, data]) => {
    const conditionFactors = data.map(d => d.conditionFactor).sort((a, b) => a - b)
    const cwValues = data.map(d => d.cw)
    const bwValues = data.map(d => d.bw)
    const count = data.length
    const meanCF = conditionFactors.reduce((sum, v) => sum + v, 0) / count
    const meanCW = cwValues.reduce((sum, v) => sum + v, 0) / count
    const meanBW = bwValues.reduce((sum, v) => sum + v, 0) / count
    const medianCF = percentile(conditionFactors, 50)
    const minCF = conditionFactors[0]
    const maxCF = conditionFactors[count - 1]
    const variance = conditionFactors.reduce((sum, v) => sum + Math.pow(v - meanCF, 2), 0) / count
    const stdDev = Math.sqrt(variance)

    return {
      species,
      count,
      meanConditionFactor: Number(meanCF.toFixed(3)),
      medianConditionFactor: Number(medianCF.toFixed(3)),
      minConditionFactor: Number(minCF.toFixed(3)),
      maxConditionFactor: Number(maxCF.toFixed(3)),
      stdDevConditionFactor: Number(stdDev.toFixed(3)),
      meanCW: Number(meanCW.toFixed(2)),
      meanBW: Number(meanBW.toFixed(2)),
    }
  })
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
    const sorted = data.sort((a, b) => a.cw - b.cw)
    const cw50 = estimateCW50(sorted)
    const ciLow = Number((cw50 - 1).toFixed(1))
    const ciHigh = Number((cw50 + 1).toFixed(1))
    return {
      species,
      cw50: Number(cw50.toFixed(1)),
      confidenceInterval: [ciLow, ciHigh] as [number, number],
      sampleSize: sorted.length,
    }
  })
}

export async function getSpeciesDistribution(
  dateFrom?: string,
  dateTo?: string
): Promise<SpeciesDistributionData[]> {
  const where: Prisma.ObservationWhereInput = { status: 'APPROVED' }
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo)
  }

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
  const where: Prisma.ObservationWhereInput = { status: 'APPROVED' }
  if (speciesId) where.speciesId = speciesId

  const observations = await getPrisma().observation.findMany({
    where,
    select: {
      createdAt: true,
      species: { select: { scientificName: true } },
    },
  })

  const grouped: Record<string, Record<string, number>> = {}

  for (const obs of observations) {
    const species = obs.species.scientificName
    const month = obs.createdAt.toISOString().slice(0, 7)

    if (!grouped[species]) grouped[species] = {}
    if (!grouped[species][month]) grouped[species][month] = 0
    grouped[species][month]++
  }

  const items: TemporalTrendData[] = []
  for (const [species, months] of Object.entries(grouped)) {
    for (const [month, count] of Object.entries(months)) {
      items.push({ month, count, species })
    }
  }

  return items.sort((a, b) => {
    const monthCompare = a.month.localeCompare(b.month)
    return monthCompare !== 0 ? monthCompare : a.species.localeCompare(b.species)
  })
}

// Helper functions

function calculateConditionFactor(cw: number, bw: number): number {
  const K = (bw / Math.pow(cw, 3)) * 100
  return Number(K.toFixed(3))
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function estimateCW50(sorted: { cw: number; isMature: boolean }[]): number {
  const cumulative: { cw: number; proportion: number }[] = []
  let matureCount = 0
  const total = sorted.length

  for (const obs of sorted) {
    if (obs.isMature) matureCount++
    cumulative.push({
      cw: obs.cw,
      proportion: matureCount / total,
    })
  }

  for (let i = 0; i < cumulative.length - 1; i++) {
    if (
      cumulative[i].proportion <= 0.5 &&
      cumulative[i + 1].proportion >= 0.5
    ) {
      const slope =
        (cumulative[i + 1].proportion - cumulative[i].proportion) /
        (cumulative[i + 1].cw - cumulative[i].cw)
      return cumulative[i].cw + (0.5 - cumulative[i].proportion) / slope
    }
  }

  return sorted[Math.floor(sorted.length / 2)]?.cw ?? 0
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
