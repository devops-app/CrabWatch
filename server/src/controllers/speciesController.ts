import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { BlobSASPermissions } from '@azure/storage-blob'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler, NotFoundError } from '../utils/errors'
import { createTranslator } from '../middleware/i18n'
import { getPrisma } from '../services/container'
import { getBlobService } from '../services/upload'
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

async function refreshSpeciesImageUrls(images: string[]): Promise<string[]> {
  const refreshed: string[] = []
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  const service = getBlobService()
  const containerClient = service.getContainerClient(containerName)

  for (const url of images) {
    if (!url.includes('?sv=')) {
      refreshed.push(url)
      continue
    }

    try {
      const afterContainer = url.split(`${containerName}/`)
      if (afterContainer.length < 2) {
        refreshed.push(url)
        continue
      }
      const blobPath = afterContainer.slice(1).join('/')
      const decodedName = decodeURIComponent(blobPath.split('?')[0])
      const blobClient = containerClient.getBlockBlobClient(decodedName)
      const sasUrl = await blobClient.generateSasUrl({
        startsOn: new Date(Date.now() - 2 * 60 * 1000),
        expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        permissions: BlobSASPermissions.parse('r'),
      })
      refreshed.push(sasUrl)
    } catch {
      refreshed.push(url)
    }
  }
  return refreshed
}

export const refreshSpeciesImages = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const speciesList = await getPrisma().species.findMany()

  let updated = 0
  for (const species of speciesList) {
    const images = parseJsonArray<string>(species.images)
    if (images.length === 0) continue

    const refreshed = await refreshSpeciesImageUrls(images)
    const changed = refreshed.some((url, i) => url !== images[i])

    if (changed) {
      await getPrisma().species.update({
        where: { id: species.id },
        data: { images: toJson(refreshed) },
      })
      updated++
    }
  }

  clearCache('species:')

  res.json({
    success: true,
    data: {
      totalSpecies: speciesList.length,
      updated,
    },
  })
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
    keyFeatures: parseJsonArray<KeyFeature>(species.keyFeatures),
    distributionZones: parseJsonArray<DistributionZone>(species.distributionZones),
    to: targetLocale,
  })

  res.json({ success: true, data: translated })
})
