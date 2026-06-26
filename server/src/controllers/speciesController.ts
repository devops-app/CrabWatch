import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler, NotFoundError } from '../utils/errors'
import { createTranslator } from '../middleware/i18n'
import { getPrisma } from '../services/container'
import { translateSpecies as translateSpeciesText } from '../services/translatorService'
import { SpeciesResponse, KeyFeature, DistributionZone } from '@crabwatch/shared'
import { getFromCache, setCache, clearCache } from '../utils/cache'

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T[]
    } catch {
      return []
    }
  }
  return []
}

function normalizeDistributionZones(zones: unknown[]): DistributionZone[] {
  return zones
    .filter(Boolean)
    .map((z) => {
      if (typeof z === 'string') return { name: z, polygon: [] }
      if (z && typeof z === 'object' && 'name' in z) return { name: String(z.name), polygon: (z as DistributionZone).polygon || [] }
      return { name: String(z), polygon: [] }
    })
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

export const listSpecies = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const cached = getFromCache<SpeciesResponse[]>('species:all')
  if (cached) {
    res.json({ success: true, data: cached })
    return
  }

  const species = await getPrisma().species.findMany({
    orderBy: { scientificName: 'asc' },
  })

  const data: SpeciesResponse[] = species.map((s) => ({
    id: s.id,
    scientificName: s.scientificName,
    commonName: s.commonName,
    description: s.description,
    keyFeatures: parseJsonArray<KeyFeature>(s.keyFeatures),
    images: parseJsonArray<string>(s.images),
    distributionZones: parseJsonArray<DistributionZone>(s.distributionZones),
  }))

  setCache('species:all', data)

  res.json({ success: true, data })
})

export const getSpecies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const { id } = req.params
  const species = await getPrisma().species.findUnique({ where: { id } })

  if (!species) {
    throw new NotFoundError(__('species.notFound', 'species'))
  }

  const data: SpeciesResponse = {
    id: species.id,
    scientificName: species.scientificName,
    commonName: species.commonName,
    description: species.description,
    keyFeatures: parseJsonArray<KeyFeature>(species.keyFeatures),
    images: parseJsonArray<string>(species.images),
    distributionZones: parseJsonArray<DistributionZone>(species.distributionZones),
  }

  res.json({ success: true, data })
})

export const createSpecies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { scientificName, commonName, description, keyFeatures, images, distributionZones } = req.body

  const species = await getPrisma().species.create({
    data: {
      scientificName,
      commonName,
      description,
      keyFeatures: toJson(keyFeatures),
      images: toJson(images),
      distributionZones: toJson(distributionZones),
    },
  })

  clearCache('species:')

  res.status(201).json({
    success: true,
    data: {
      id: species.id,
      scientificName: species.scientificName,
      commonName: species.commonName,
      description: species.description,
      keyFeatures: parseJsonArray<KeyFeature>(species.keyFeatures),
      images: parseJsonArray<string>(species.images),
      distributionZones: parseJsonArray<DistributionZone>(species.distributionZones),
    },
  })
})

export const updateSpecies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { scientificName, commonName, description, keyFeatures, images, distributionZones } = req.body

  const data: Prisma.SpeciesUpdateInput = {
    ...(scientificName && { scientificName }),
    ...(commonName && { commonName }),
    ...(description !== undefined && { description }),
    ...(keyFeatures !== undefined && { keyFeatures: toJson(keyFeatures) }),
    ...(images !== undefined && { images: toJson(images) }),
    ...(distributionZones !== undefined && { distributionZones: toJson(distributionZones) }),
  }

  const species = await getPrisma().species.update({
    where: { id },
    data,
  })

  clearCache('species:')

  res.json({
    success: true,
    data: {
      id: species.id,
      scientificName: species.scientificName,
      commonName: species.commonName,
      description: species.description,
      keyFeatures: parseJsonArray<KeyFeature>(species.keyFeatures),
      images: parseJsonArray<string>(species.images),
      distributionZones: parseJsonArray<DistributionZone>(species.distributionZones),
    },
  })
})

export const deleteSpecies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  await getPrisma().species.delete({ where: { id } })
  clearCache('species:')
  res.json({ success: true, data: null })
})

export const translateSpecies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { to } = req.query
  const targetLocale = typeof to === 'string' ? to : 'ms'

  const species = await getPrisma().species.findUnique({ where: { id } })
  if (!species) {
    throw new NotFoundError('Species not found')
  }

  const translated = await translateSpeciesText({
    speciesId: species.id,
    commonName: species.commonName,
    description: species.description,
    to: targetLocale,
  })

  res.json({ success: true, data: translated })
})
