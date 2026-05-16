import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
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

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

export async function listSpecies(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const cached = getFromCache<SpeciesResponse[]>('species:all')
    if (cached) {
      res.json({ success: true, data: cached })
      return
    }

    const species = await prisma.species.findMany({
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
  } catch (error: unknown) {
    console.error('List species error:', error)
    res.status(500).json({ success: false, error: 'Failed to list species' })
  }
}

export async function getSpecies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const species = await prisma.species.findUnique({ where: { id } })

    if (!species) {
      res.status(404).json({ success: false, error: 'Species not found' })
      return
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
  } catch (error: unknown) {
    console.error('Get species error:', error)
    res.status(500).json({ success: false, error: 'Failed to get species' })
  }
}

export async function createSpecies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { scientificName, commonName, description, keyFeatures, images, distributionZones } = req.body

    const species = await prisma.species.create({
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
  } catch (error: unknown) {
    console.error('Create species error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create species'
    res.status(400).json({ success: false, error: message || 'Failed to create species' })
  }
}

export async function updateSpecies(req: AuthRequest, res: Response): Promise<void> {
  try {
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

    const species = await prisma.species.update({
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
  } catch (error: unknown) {
    console.error('Update species error:', error)
    res.status(500).json({ success: false, error: 'Failed to update species' })
  }
}

export async function deleteSpecies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    await prisma.species.delete({ where: { id } })
    clearCache('species:')
    res.json({ success: true, data: null })
  } catch (error: unknown) {
    console.error('Delete species error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete species' })
  }
}
