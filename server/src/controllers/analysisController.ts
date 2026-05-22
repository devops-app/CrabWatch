import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { CrabAnalysisRequest, CrabAnalysisResult } from '@crabwatch/shared'
import { analyzeCrabWithAgent, uploadAnalysisPhotos, cleanupAnalysisBlobs, detectView as detectViewAgent } from '../services/foundryAgent'
import { getPrisma } from '../services/container'
import { asyncHandler, ValidationError } from '../utils/errors'
import { clearCache } from '../utils/cache'
import { sanitizeInput, sanitizeHtml } from '../utils/sanitize'

export const activeSessions = new Map<string, { sessionId: string; blobUrls: string[]; lastActive: number }>()
const ANALYSIS_BLOB_TTL_MS = Number(process.env.ANALYSIS_BLOB_TTL_MS) || 20 * 60 * 1000
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function startCleanupTimer() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [userId, session] of activeSessions.entries()) {
      if (now - session.lastActive > ANALYSIS_BLOB_TTL_MS) {
        cleanupAnalysisBlobs(session.blobUrls).catch(() => {})
        activeSessions.delete(userId)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}

startCleanupTimer()

export function markAnalysisSessionDone(userId: string): void {
  activeSessions.delete(userId)
}

interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const uploadAnalysisPhotosHandler = asyncHandler(async (
  req: AuthRequest & { files?: MulterFile[] | { [key: string]: MulterFile[] } },
  res: Response
): Promise<void> => {
  const rawFiles = req.files
  const files = Array.isArray(rawFiles) ? rawFiles : Object.values(rawFiles || {}).flat()
  if (!files || files.length === 0) {
    throw new ValidationError('At least one photo is required')
  }

  if (files.length > 5) {
    throw new ValidationError('Maximum 5 photos allowed')
  }

  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined
  if (sessionId && !UUID_PATTERN.test(sessionId)) {
    throw new ValidationError('sessionId must be a valid UUID')
  }
  const blobUrls = await uploadAnalysisPhotos(files, {
    userId: req.dbUser?.id || 'anon',
    sessionId,
  })

  const userId = req.dbUser?.id || 'anon'
  const prevSession = activeSessions.get(userId)
  if (prevSession && prevSession.sessionId !== sessionId) {
    cleanupAnalysisBlobs(prevSession.blobUrls).catch(() => {})
  }
  activeSessions.set(userId, { sessionId: sessionId || prevSession?.sessionId || 'unknown', blobUrls, lastActive: Date.now() })

  res.json({
    success: true,
    data: {
      blobUrls,
      count: blobUrls.length,
    },
  })
})

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

  const db = getPrisma()
  await db.species.upsert({
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

export const analyzeCrabHandler = asyncHandler(async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { photoUrls, views, coinType }: CrabAnalysisRequest = req.body

  if (!photoUrls || photoUrls.length === 0) {
    throw new ValidationError('photoUrls is required (array of blob URLs)')
  }

  if (photoUrls.length > 5) {
    throw new ValidationError('Maximum 5 photos allowed')
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
})

export const detectViewHandler = asyncHandler(async (
  req: AuthRequest & { file?: MulterFile },
  res: Response
): Promise<void> => {
  const { expectedView } = req.body

  if (!expectedView || !['dorsal', 'ventral', 'carapace-closeup'].includes(expectedView)) {
    throw new ValidationError('expectedView is required (dorsal, ventral, or carapace-closeup)')
  }

  if (!req.file) {
    throw new ValidationError('Photo file is required')
  }

  const result = await detectViewAgent(req.file.buffer, req.file.mimetype, expectedView)
  res.json({ success: true, data: result })
})
