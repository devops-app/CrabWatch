import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../../middleware/auth'

const setIntervalSpy = jest
  .spyOn(global, 'setInterval')
  .mockImplementation(((() => ({}) as unknown) as typeof setInterval))
const clearIntervalSpy = jest
  .spyOn(global, 'clearInterval')
  .mockImplementation(((() => undefined) as unknown) as typeof clearInterval)

const mockAnalyzeCrabWithAgent = jest.fn()
const mockUploadAnalysisPhotos = jest.fn()
const mockCleanupAnalysisBlobs = jest.fn()
const mockDetectViewAgent = jest.fn()

jest.mock('../../services/foundryAgent', () => ({
  analyzeCrabWithAgent: (...args: unknown[]) => mockAnalyzeCrabWithAgent(...args),
  uploadAnalysisPhotos: (...args: unknown[]) => mockUploadAnalysisPhotos(...args),
  cleanupAnalysisBlobs: (...args: unknown[]) => mockCleanupAnalysisBlobs(...args),
  detectView: (...args: unknown[]) => mockDetectViewAgent(...args),
}))

const mockGetPrisma = jest.fn(() => ({
  species: {
    upsert: jest.fn(),
  },
}))

const mockGetConfig = jest.fn(() => ({
  imageQuality: {
    coverageWarnThresholdPct: 35,
    autoCropSecondPassEnabled: false,
  },
}))

jest.mock('../../services/container', () => ({
  getPrisma: () => mockGetPrisma(),
  getConfig: () => mockGetConfig(),
}))

const mockAssessServerImageQualityFromUrl = jest.fn()
const mockGetImageDimensionsFromUrl = jest.fn()
const mockComputeBoundingBoxCoveragePct = jest.fn()
const mockComputeAutoCropBoundingBox = jest.fn()
const mockCreateCroppedImageDataUrlFromUrl = jest.fn()

jest.mock('../../utils/imageQuality', () => ({
  assessServerImageQualityFromUrl: (...args: unknown[]) => mockAssessServerImageQualityFromUrl(...args),
  getImageDimensionsFromUrl: (...args: unknown[]) => mockGetImageDimensionsFromUrl(...args),
  computeBoundingBoxCoveragePct: (...args: unknown[]) => mockComputeBoundingBoxCoveragePct(...args),
  computeAutoCropBoundingBox: (...args: unknown[]) => mockComputeAutoCropBoundingBox(...args),
  createCroppedImageDataUrlFromUrl: (...args: unknown[]) => mockCreateCroppedImageDataUrlFromUrl(...args),
}))

const mockLoggerInfo = jest.fn()
const mockLoggerWarn = jest.fn()

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}))

jest.mock('../../middleware/i18n', () => ({
  detectLocale: () => 'en',
  createTranslator: () => (key: string, _ns?: string, options?: { coverage?: number }) => {
    if (key === 'analysis.coverage.warn') {
      return `Coverage warning ${options?.coverage ?? 'n/a'}%`
    }
    if (key === 'analysis.coverage.secondPassApplied') {
      return 'Applied focused crop analysis to improve species confidence.'
    }
    return key
  },
}))

jest.mock('../../utils/cache', () => ({
  clearCache: jest.fn(),
}))

import { analyzeCrabHandler } from '../analysisController'

function createResponse(): Response {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe('analysisController PR6.1', () => {
  let req: Partial<AuthRequest>
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      body: {
        photoUrls: ['https://example.com/image-1.jpg'],
        views: ['dorsal'],
      },
      dbUser: {
        preferredLocale: 'en',
      } as any,
    }

    res = createResponse()
    next = jest.fn()

    mockAssessServerImageQualityFromUrl.mockResolvedValue({
      blurScore: 500,
      brightness: 0.5,
      blurStatus: 'pass',
      brightnessStatus: 'pass',
      issues: [],
    })

    mockAnalyzeCrabWithAgent.mockResolvedValue({
      speciesId: 'unknown',
      speciesName: 'Unknown Species',
      confidence: 0.7,
      speciesConfidence: 0.7,
      estimatedCW: null,
      estimatedBW: null,
      gender: 'unknown',
      maturationStatus: 'unknown',
      detectedCoin: null,
      coinConfidence: 0,
      crabCount: 1,
      boundingBox: {
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      },
      suggestions: [],
      rawAnalysis: '',
    })

    mockGetImageDimensionsFromUrl.mockResolvedValue({ width: 1000, height: 1000 })
    mockComputeAutoCropBoundingBox.mockReturnValue({
      x: 0.08,
      y: 0.08,
      width: 0.24,
      height: 0.24,
    })
    mockCreateCroppedImageDataUrlFromUrl.mockResolvedValue('data:image/jpeg;base64,ZmFrZQ==')
  })

  afterAll(() => {
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('adds crabCoveragePct and low-coverage warning suggestion', async () => {
    mockComputeBoundingBoxCoveragePct.mockReturnValue(20)

    analyzeCrabHandler(req as AuthRequest, res, next)
    await flushAsync()

    expect(next).not.toHaveBeenCalled()
    expect(mockComputeBoundingBoxCoveragePct).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          crabCoveragePct: 20,
          autoCropBoundingBox: {
            x: 0.08,
            y: 0.08,
            width: 0.24,
            height: 0.24,
          },
          suggestions: expect.arrayContaining(['Coverage warning 20%']),
        }),
      })
    )
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'quality-gate-server',
        event: 'coverage_warn',
        crabCoveragePct: 20,
      }),
      'Server coverage warning from AI bounding box'
    )
  })

  it('sets crabCoveragePct without warning when coverage >= 35%', async () => {
    mockComputeBoundingBoxCoveragePct.mockReturnValue(42)

    analyzeCrabHandler(req as AuthRequest, res, next)
    await flushAsync()

    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          crabCoveragePct: 42,
          suggestions: [],
        }),
      })
    )
  })

  it('returns validation error when pre-AI blur gate fails', async () => {
    mockAssessServerImageQualityFromUrl.mockResolvedValue({
      blurScore: 10,
      brightness: 0.5,
      blurStatus: 'fail',
      brightnessStatus: 'pass',
      issues: ['QUALITY_BLUR_FAIL'],
    })

    analyzeCrabHandler(req as AuthRequest, res, next)
    await flushAsync()

    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
    const err = (next as jest.Mock).mock.calls[0][0] as { code?: string; statusCode?: number }
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('QUALITY_BLUR_FAIL')
  })

  it('does not crash when coverage enrichment lookup fails (best-effort fallback)', async () => {
    mockGetImageDimensionsFromUrl.mockRejectedValue(new Error('Dimension read failed'))

    analyzeCrabHandler(req as AuthRequest, res, next)
    await flushAsync()

    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          speciesName: 'Unknown Species',
        }),
      })
    )

    const payload = (res.json as jest.Mock).mock.calls[0][0].data as {
      crabCoveragePct?: number
      suggestions?: string[]
    }
    expect(payload.crabCoveragePct).toBeUndefined()
    expect(payload.suggestions).toEqual([])
  })

  it('applies optional second-pass analysis when low coverage flag is enabled and confidence improves', async () => {
    mockGetConfig.mockReturnValue({
      imageQuality: {
        coverageWarnThresholdPct: 35,
        autoCropSecondPassEnabled: true,
      },
    })

    mockComputeBoundingBoxCoveragePct.mockReturnValue(20)
    mockAnalyzeCrabWithAgent
      .mockResolvedValueOnce({
        speciesId: 'unknown',
        speciesName: 'Unknown Species',
        confidence: 0.55,
        speciesConfidence: 0.55,
        estimatedCW: null,
        estimatedBW: null,
        gender: 'unknown',
        maturationStatus: 'unknown',
        detectedCoin: null,
        coinConfidence: 0,
        crabCount: 1,
        boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        suggestions: [],
        rawAnalysis: '',
      })
      .mockResolvedValueOnce({
        speciesId: 'scylla-serrata',
        speciesName: 'Scylla serrata (Mud Crab)',
        confidence: 0.84,
        speciesConfidence: 0.84,
        estimatedCW: 8.5,
        estimatedBW: null,
        gender: 'male',
        maturationStatus: 'mature',
        detectedCoin: '20 sen',
        coinConfidence: 0.9,
        crabCount: 1,
        suggestions: ['Improved focus around crab body'],
        rawAnalysis: 'focused',
      })

    analyzeCrabHandler(req as AuthRequest, res, next)
    await flushAsync()

    expect(next).not.toHaveBeenCalled()
    expect(mockAnalyzeCrabWithAgent).toHaveBeenCalledTimes(2)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          speciesId: 'scylla-serrata',
          crabCoveragePct: 20,
          secondPassApplied: true,
          autoCropBoundingBox: expect.any(Object),
          suggestions: expect.arrayContaining([
            'Improved focus around crab body',
            'Applied focused crop analysis to improve species confidence.',
          ]),
        }),
      })
    )
  })
})
