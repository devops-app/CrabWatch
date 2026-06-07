import { api } from './api'
import { CrabAnalysisRequest, CrabAnalysisResult, PhotoView, AnalysisStatus, ViewDetectionResult } from '@crabwatch/shared'
import { photoService } from './photoService'

export interface AnalysisProgress {
  status: AnalysisStatus
  message: string
  percentage: number
  event?: 'qualityFail' | 'analysisFail'
}

export interface AnalysisResult {
  analysis: CrabAnalysisResult
  blobUrls: string[]
}

type QualityOverrideMap = Partial<Record<PhotoView, { approved: boolean; reason?: string }>>

export const analysisService = {
  async analyzeCrab(
    photoUris: string[],
    views: PhotoView[],
    sessionId: string,
    coinType?: string,
    qualityOverrides?: QualityOverrideMap,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    if (photoUris.length === 0) {
      throw new Error('At least one photo is required')
    }

    if (photoUris.length > 5) {
      throw new Error('Maximum 5 photos allowed')
    }

    try {
      const normalizedPhotoUris = await Promise.all(
        photoUris.map((uri) => photoService.normalizeForAnalysis(uri))
      )

      const qualityChecks = await Promise.all(normalizedPhotoUris.map(async (uri, index) => {
        const quality = await photoService.assessImageQuality(uri)
        const view = views[index] || 'dorsal'
        const override = qualityOverrides?.[view]
        const canOverride = Boolean(override?.approved && (override.reason || '').trim().length >= 5)
        const hasBlockingFailure = quality.blurStatus === 'fail' || quality.brightnessLevel === 'dark'
        return {
          view,
          quality,
          hasBlockingFailure,
          canOverride,
        }
      }))

      const blocked = qualityChecks.filter((q) => q.hasBlockingFailure && !q.canOverride)
      if (blocked.length > 0) {
        const blockedViews = blocked.map((item) => item.view).join(', ')
        const message = `Photo quality check failed for: ${blockedViews}. Retake or provide override reason.`
        onProgress?.({ status: 'error', message, percentage: 0, event: 'qualityFail' })
        throw new Error(message)
      }

      onProgress?.({ status: 'uploading', message: 'Uploading photos...', percentage: 10 })

      const { blobUrls } = await api.uploadAnalysisPhotos(normalizedPhotoUris, sessionId)

      onProgress?.({ status: 'uploading', message: 'Photos uploaded', percentage: 30 })

      onProgress?.({ status: 'analyzing', message: 'Identifying species...', percentage: 50 })

      const analysisRequest: CrabAnalysisRequest = {
        photoUrls: blobUrls,
        views: views.length === blobUrls.length ? views : blobUrls.map(() => 'dorsal'),
        coinType,
      }

      const result = await api.analyzeCrab(analysisRequest)

      const crabCount = Number(result.crabCount ?? 0)
      if (crabCount !== 1) {
        const message = crabCount < 1
          ? 'No crab detected. Retake the photo with exactly one crab in frame.'
          : `Detected ${crabCount} crabs. Retake the photo with exactly one crab in frame.`
        onProgress?.({ status: 'error', message, percentage: 0, event: 'qualityFail' })
        throw new Error(message)
      }

      onProgress?.({ status: 'analyzing', message: 'Estimating size...', percentage: 75 })
      onProgress?.({ status: 'analyzing', message: 'Almost done...', percentage: 90 })

      onProgress?.({ status: 'complete', message: 'Analysis complete!', percentage: 100 })

      return { analysis: result, blobUrls }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Analysis failed'
      const isQualityFail = message.includes('Photo quality check failed')
      onProgress?.({ status: 'error', message, percentage: 0, event: isQualityFail ? 'qualityFail' : 'analysisFail' })
      throw error
    }
  },

  async retryAnalysis(
    photoUris: string[],
    views: PhotoView[],
    sessionId: string,
    coinType?: string,
    qualityOverrides?: QualityOverrideMap,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        onProgress?.({ status: 'uploading', message: `Attempt ${attempt}/3...`, percentage: (attempt - 1) * 5 })
        return await this.analyzeCrab(photoUris, views, sessionId, coinType, qualityOverrides, (progress) => {
          if (onProgress) {
            onProgress({ ...progress, percentage: Math.min(progress.percentage + (attempt - 1) * 5, 100) })
          }
        })
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error('Analysis failed')
        if (lastError.message.includes('Photo quality check failed')) {
          throw lastError
        }
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error('Analysis failed after 3 attempts')
  },

  async detectView(photoUri: string, expectedView: PhotoView): Promise<ViewDetectionResult> {
    const normalizedUri = await photoService.normalizeForAnalysis(photoUri)
    return api.detectView(normalizedUri, expectedView)
  },
}
