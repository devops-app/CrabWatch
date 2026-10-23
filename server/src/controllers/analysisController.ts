import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { CrabAnalysisRequest, CrabAnalysisResult } from '@crabwatch/shared'
import { analyzeCrabWithAgent, uploadAnalysisPhotos, cleanupAnalysisBlobs, detectView as detectViewAgent } from '../services/foundryAgent'
import type { ExifMetadata } from '../utils/imageQuality'
import { getConfig, getPrisma } from '../services/container'
import { asyncHandler, ValidationError } from '../utils/errors'
import { detectLocale } from '../middleware/i18n'
import { clearCache } from '../utils/cache'
import { sanitizeInput, sanitizeHtml } from '../utils/sanitize'
import { createTranslator } from '../middleware/i18n'
import {
  assessServerImageQualityFromUrl,
  getImageDimensionsFromUrl,
  computeBoundingBoxCoveragePct,
  computeAutoCropBoundingBox,
  createCroppedImageDataUrlFromUrl,
  extractExifMetadata,
  formatExifNotes,
} from '../utils/imageQuality'
import logger from '../utils/logger'

export const activeSessions = new Map<string, { sessionId: string; blobUrls: string[]; lastActive: number; exifNotes?: string }>()
// Generous TTL: the user may review/edit AI results for a long time before
// submitting. If the blobs are deleted before submit, the copy falls back to a
// dead /analysis/ URL (permanent 404). 2h covers realistic field-review
// sessions; active sessions are still cleaned up on submit or supersede.
const ANALYSIS_BLOB_TTL_MS = Number(process.env.ANALYSIS_BLOB_TTL_MS) || 2 * 60 * 60 * 1000
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function startCleanupTimer() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [userId, session] of activeSessions.entries()) {
      if (now - session.lastActive > ANALYSIS_BLOB_TTL_MS) {
        logger.info(
          { userId, sessionId: session.sessionId, blobCount: session.blobUrls.length },
          'Analysis blob cleanup timer: deleting expired analysis blobs'
        )
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
  const __ = createTranslator(req)
  const rawFiles = req.files
  const files = Array.isArray(rawFiles) ? rawFiles : Object.values(rawFiles || {}).flat()
  if (!files || files.length === 0) {
    throw new ValidationError(__('analysis.photo.required', 'analysis'))
  }

  if (files.length > 5) {
    throw new ValidationError(__('analysis.photo.tooMany', 'analysis'))
  }

  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined
  if (sessionId && !UUID_PATTERN.test(sessionId)) {
    throw new ValidationError(__('analysis.sessionInvalid', 'analysis'))
  }
  const blobUrls = await uploadAnalysisPhotos(files, {
    userId: req.dbUser?.id || 'anon',
    sessionId,
  })

  const exifResults = await Promise.all(files.map((f) => extractExifMetadata(f.buffer)))
  const exifNotes = exifResults.map(formatExifNotes).filter((n): n is string => Boolean(n)).join('; ')

  const userId = req.dbUser?.id || 'anon'
  const prevSession = activeSessions.get(userId)
  if (prevSession && prevSession.sessionId !== sessionId) {
    cleanupAnalysisBlobs(prevSession.blobUrls).catch(() => {})
  }
  activeSessions.set(userId, { sessionId: sessionId || prevSession?.sessionId || 'unknown', blobUrls, lastActive: Date.now(), exifNotes: exifNotes || undefined })

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

  // D1: The AI returns "Scientific name (Common Name)". Extract the scientific
  // name (the part before the parenthetical common name) and validate it is a
  // strict binomial: Capitalized Genus + lowercase species epithet. The previous
  // regex was case-insensitive and matched any two words, so malformed AI output
  // (e.g. "scylla serrata", "Scylla Serrata") could pollute the species table.
  // Anything that is not a strict binomial is quarantined (logged + skipped).
  const scientificPart = result.speciesName.split('(')[0].trim()
  const binomialMatch = scientificPart.match(/^([A-Z][a-z]+ [a-z]+)/)
  if (!binomialMatch) {
    logger.warn(
      { speciesName: result.speciesName, speciesId: result.speciesId },
      'ensureSpeciesExists: AI species name is not a strict "Genus species" binomial, quarantining (skipping upsert)'
    )
    return
  }

  const scientificName = sanitizeInput(binomialMatch[1], 100).trim()
  const commonMatch = result.speciesName.match(/\(([^)]+)\)/)
  const commonName = sanitizeInput(commonMatch ? commonMatch[1] : result.speciesId.replace(/-/g, ' '), 100)

  if (!scientificName || !commonName) {
    logger.warn({ scientificName, commonName }, 'ensureSpeciesExists: Invalid species name from AI, skipping upsert')
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
  const __ = createTranslator(req)
  const { photoUrls, views, coinType }: CrabAnalysisRequest = req.body

  // Keep the analysis session alive while the user reviews/edits AI results.
  // The TTL clock otherwise only advances on upload, so a user who uploads and
  // then spends >TTL reviewing before submitting would have their /analysis/
  // blobs deleted mid-review, causing the submit-time copy to fall back to a
  // dead /analysis/ URL (permanent 404). Refreshing here extends the window.
  const userId = req.dbUser?.id || 'anon'
  const activeSession = activeSessions.get(userId)
  if (activeSession) {
    activeSession.lastActive = Date.now()
  }

  if (!photoUrls || photoUrls.length === 0) {
    throw new ValidationError(__('analysis.photoUrls.required', 'analysis'))
  }

  if (photoUrls.length > 5) {
    throw new ValidationError(__('analysis.photo.tooMany', 'analysis'))
  }

  const validViews = ['dorsal', 'ventral', 'carapace-closeup']
  const validViewList = views?.filter((v: string) => validViews.includes(v)) || ['dorsal']

  const analysisRequest: CrabAnalysisRequest = {
    photoUrls,
    views: validViewList.length === photoUrls.length ? validViewList : Array(photoUrls.length).fill('dorsal'),
    coinType,
    locale: detectLocale(req, req.dbUser?.preferredLocale ?? null),
  }

  const qualityResults = await Promise.all(analysisRequest.photoUrls.map((url) => assessServerImageQualityFromUrl(url)))
  const qualitySummary = {
    source: 'server',
    category: 'quality-gate-server',
    photoCount: analysisRequest.photoUrls.length,
    blurFailCount: qualityResults.filter((result) => result.blurStatus === 'fail').length,
    blurWarnCount: qualityResults.filter((result) => result.blurStatus === 'warn').length,
    brightnessFailCount: qualityResults.filter((result) => result.brightnessStatus === 'fail').length,
    brightnessWarnCount: qualityResults.filter((result) => result.brightnessStatus === 'warn').length,
    avgBlurScore:
      qualityResults.length > 0
        ? Math.round((qualityResults.reduce((sum, result) => sum + result.blurScore, 0) / qualityResults.length) * 100) / 100
        : 0,
    avgBrightness:
      qualityResults.length > 0
        ? Math.round((qualityResults.reduce((sum, result) => sum + result.brightness, 0) / qualityResults.length) * 10000) / 10000
        : 0,
  }

  if (qualitySummary.blurWarnCount > 0 || qualitySummary.brightnessWarnCount > 0) {
    logger.info(qualitySummary, 'Server quality warnings observed')
  }

  if (qualityResults.some((result) => result.blurStatus === 'fail')) {
    logger.warn(qualitySummary, 'Server quality gate blocked request: blur fail')
    throw new ValidationError(__('analysis.quality.blurFail', 'analysis'), undefined, 'QUALITY_BLUR_FAIL')
  }

  if (qualityResults.some((result) => result.brightnessStatus === 'fail')) {
    logger.warn(qualitySummary, 'Server quality gate blocked request: brightness fail')
    throw new ValidationError(__('analysis.quality.brightnessFail', 'analysis'), undefined, 'QUALITY_BRIGHTNESS_FAIL')
  }

  let result: CrabAnalysisResult = await analyzeCrabWithAgent(analysisRequest)

  if (result.crabCount === 0) {
    throw new ValidationError(__('analysis.crabCount.zero', 'analysis'), undefined, 'CRAB_COUNT_ZERO_FAIL')
  }

  if (result.crabCount > 1) {
    throw new ValidationError(__('analysis.crabCount.multiple', 'analysis'), undefined, 'CRAB_COUNT_MULTI_FAIL')
  }

  if (result.boundingBox && analysisRequest.photoUrls[0]) {
    try {
      const dimensions = await getImageDimensionsFromUrl(analysisRequest.photoUrls[0])
      if (dimensions) {
        const config = getConfig()
        const coverageWarnThresholdPct = Math.max(1, config.imageQuality.coverageWarnThresholdPct || 35)
        const autoCropBoundingBox = computeAutoCropBoundingBox(result.boundingBox, dimensions)
        if (autoCropBoundingBox) {
          result.autoCropBoundingBox = autoCropBoundingBox
        }

        const coverage = computeBoundingBoxCoveragePct(result.boundingBox, dimensions)
        if (coverage != null) {
          result.crabCoveragePct = coverage
          if (coverage < coverageWarnThresholdPct) {
            result.suggestions = [
              ...(result.suggestions || []),
              __('analysis.coverage.warn', 'analysis', { coverage }),
            ]

            logger.info(
              {
                source: 'server',
                category: 'quality-gate-server',
                event: 'coverage_warn',
                crabCoveragePct: coverage,
                thresholdPct: coverageWarnThresholdPct,
              },
              'Server coverage warning from AI bounding box'
            )

            if (config.imageQuality.autoCropSecondPassEnabled && autoCropBoundingBox) {
              const croppedPhotoDataUrl = await createCroppedImageDataUrlFromUrl(
                analysisRequest.photoUrls[0],
                autoCropBoundingBox,
              )

              if (croppedPhotoDataUrl) {
                const secondPassRequest: CrabAnalysisRequest = {
                  ...analysisRequest,
                  photoUrls: [
                    croppedPhotoDataUrl,
                    ...analysisRequest.photoUrls.slice(1),
                  ],
                }

                const secondPassResult = await analyzeCrabWithAgent(secondPassRequest)
                const firstSpeciesConfidence = result.speciesConfidence ?? result.confidence ?? 0
                const secondSpeciesConfidence = secondPassResult.speciesConfidence ?? secondPassResult.confidence ?? 0

                if (secondPassResult.crabCount === 1 && secondSpeciesConfidence >= firstSpeciesConfidence) {
                  result = {
                    ...secondPassResult,
                    boundingBox: result.boundingBox,
                    autoCropBoundingBox,
                    crabCoveragePct: coverage,
                    secondPassApplied: true,
                    suggestions: [
                      ...(secondPassResult.suggestions || []),
                      __('analysis.coverage.secondPassApplied', 'analysis'),
                    ],
                  }

                  logger.info(
                    {
                      source: 'server',
                      category: 'quality-gate-server',
                      event: 'coverage_second_pass_applied',
                      crabCoveragePct: coverage,
                      firstSpeciesConfidence,
                      secondSpeciesConfidence,
                    },
                    'Server low-coverage second-pass analysis applied'
                  )
                } else {
                  logger.info(
                    {
                      source: 'server',
                      category: 'quality-gate-server',
                      event: 'coverage_second_pass_skipped',
                      crabCoveragePct: coverage,
                      firstSpeciesConfidence,
                      secondSpeciesConfidence,
                      secondPassCrabCount: secondPassResult.crabCount,
                    },
                    'Server low-coverage second-pass analysis skipped'
                  )
                }
              }
            }
          }
        }
      }
    } catch {
      // Coverage enrichment is best-effort and should not block analysis flow
    }
  }

  await ensureSpeciesExists(result)

  const session = activeSessions.get(req.dbUser?.id || 'anon')
  if (session?.exifNotes) {
    result = {
      ...result,
      suggestions: [...(result.suggestions || []), session.exifNotes],
    }
  }

  res.json({
    success: true,
    data: result,
  })
})

export const detectViewHandler = asyncHandler(async (
  req: AuthRequest & { file?: MulterFile },
  res: Response
): Promise<void> => {
  const __ = createTranslator(req)
  const { expectedView } = req.body

  if (!expectedView || !['dorsal', 'ventral', 'carapace-closeup'].includes(expectedView)) {
    throw new ValidationError(__('analysis.view.invalid', 'analysis'))
  }

  if (!req.file) {
    throw new ValidationError(__('analysis.photo.fileRequired', 'analysis'))
  }

  const result = await detectViewAgent(req.file.buffer, req.file.mimetype, expectedView)
  res.json({ success: true, data: result })
})
