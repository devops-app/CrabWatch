import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { CrabAnalysisRequest, CrabAnalysisResult } from '@crabwatch/shared'
import { analyzeCrabWithAgent, uploadAnalysisPhotos, cleanupAnalysisBlobs, detectView as detectViewAgent } from '../services/foundryAgent'
import prisma from '../config/database'
import { clearCache } from '../utils/cache'
import { sanitizeInput, sanitizeHtml } from '../utils/sanitize'

interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function uploadAnalysisPhotosHandler(
  req: AuthRequest & { files?: MulterFile[] | { [key: string]: MulterFile[] } },
  res: Response
): Promise<void> {
  try {
    const rawFiles = req.files
    const files = Array.isArray(rawFiles) ? rawFiles : Object.values(rawFiles || {}).flat()
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'At least one photo is required' })
      return
    }

    if (files.length > 5) {
      res.status(400).json({ success: false, error: 'Maximum 5 photos allowed' })
      return
    }

    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined
    if (sessionId && !UUID_PATTERN.test(sessionId)) {
      res.status(400).json({ success: false, error: 'sessionId must be a valid UUID' })
      return
    }
    const blobUrls = await uploadAnalysisPhotos(files, {
      userId: req.dbUser?.id || 'anon',
      sessionId,
    })

    res.json({
      success: true,
      data: {
        blobUrls,
        count: blobUrls.length,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload photos'
    console.error('Analysis photo upload error:', error)
    res.status(500).json({ success: false, error: message })
  }
}

async function ensureSpeciesExists(result: CrabAnalysisResult): Promise<void> {
  if (!result.speciesId || result.speciesId === 'unknown') {
    return
  }

  const nameMatch = result.speciesName.match(/^([A-Z][a-z]+\s+[a-z]+)/i)
  const scientificName = sanitizeInput(nameMatch ? nameMatch[1] : result.speciesId, 100)
    .replace(/[^a-zA-Z\s]/g, '').trim()
  const commonMatch = result.speciesName.match(/\(([^)]+)\)/)
  const commonName = sanitizeInput(commonMatch ? commonMatch[1] : result.speciesId.replace(/-/g, ' '), 100)

  if (!scientificName || !commonName) {
    console.warn('ensureSpeciesExists: Invalid species name from AI, skipping upsert')
    return
  }

  const description = sanitizeHtml(`Auto-created from AI analysis. ${result.rawAnalysis || ''}`)

  await prisma.species.upsert({
    where: { scientificName },
    update: {},
    create: {
      scientificName,
      commonName,
      description: description || 'Auto-created from AI analysis.',
      keyFeatures: [],
      images: [],
      distributionZones: [],
    },
  })

  clearCache('species:')
}

export async function analyzeCrabHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { photoUrls, views, coinType }: CrabAnalysisRequest = req.body

    if (!photoUrls || photoUrls.length === 0) {
      res.status(400).json({ success: false, error: 'photoUrls is required (array of blob URLs)' })
      return
    }

    if (photoUrls.length > 5) {
      res.status(400).json({ success: false, error: 'Maximum 5 photos allowed' })
      return
    }

    const validViews = ['dorsal', 'ventral', 'carapace-closeup']
    const validViewList = views?.filter((v: string) => validViews.includes(v)) || ['dorsal']

    const analysisRequest: CrabAnalysisRequest = {
      photoUrls,
      views: validViewList.length === photoUrls.length ? validViewList : Array(photoUrls.length).fill('dorsal'),
      coinType,
    }

    const result: CrabAnalysisResult = await analyzeCrabWithAgent(analysisRequest)

    await ensureSpeciesExists(result)

    res.json({
      success: true,
      data: result,
    })

    const cleanupDelayRaw = process.env.ANALYSIS_BLOB_CLEANUP_DELAY_MS
    const cleanupDelayMs = cleanupDelayRaw != null ? Number(cleanupDelayRaw) : null

    if (cleanupDelayMs != null && Number.isFinite(cleanupDelayMs) && cleanupDelayMs > 0) {
      const blobUrlsToCleanup = photoUrls.filter((url) => !url.includes('/observations/'))
      if (blobUrlsToCleanup.length === 0) {
        return
      }
      setTimeout(() => {
        cleanupAnalysisBlobs(blobUrlsToCleanup).catch(() => {})
      }, cleanupDelayMs)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('Crab analysis error:', error)

    if (message.includes('timed out')) {
      res.status(504).json({ success: false, error: message })
      return
    }

    if (message.includes('not configured') || message.includes('must be configured')) {
      res.status(503).json({ success: false, error: 'AI analysis service not configured' })
      return
    }

    res.status(500).json({ success: false, error: message })
  }
}

export async function detectViewHandler(
  req: AuthRequest & { file?: MulterFile },
  res: Response
): Promise<void> {
  try {
    const { expectedView } = req.body

    if (!expectedView || !['dorsal', 'ventral', 'carapace-closeup'].includes(expectedView)) {
      res.status(400).json({ success: false, error: 'expectedView is required (dorsal, ventral, or carapace-closeup)' })
      return
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'Photo file is required' })
      return
    }

    const result = await detectViewAgent(req.file.buffer, req.file.mimetype, expectedView)
    res.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'View detection failed'
    console.error('View detection error:', error)

    if (message.includes('timed out')) {
      res.status(504).json({ success: false, error: message })
      return
    }

    if (message.includes('not configured') || message.includes('must be configured')) {
      res.status(503).json({ success: false, error: 'AI analysis service not configured' })
      return
    }

    res.status(500).json({ success: false, error: message })
  }
}
