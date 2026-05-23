import { api } from './api'
import { CrabAnalysisRequest, CrabAnalysisResult, PhotoView, AnalysisStatus, ViewDetectionResult } from '@crabwatch/shared'

export interface AnalysisProgress {
  status: AnalysisStatus
  message: string
  percentage: number
}

export interface AnalysisResult {
  analysis: CrabAnalysisResult
  blobUrls: string[]
}

export const analysisService = {
  async analyzeCrab(
    photoUris: string[],
    views: PhotoView[],
    sessionId: string,
    coinType?: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    if (photoUris.length === 0) {
      throw new Error('At least one photo is required')
    }

    if (photoUris.length > 5) {
      throw new Error('Maximum 5 photos allowed')
    }

    try {
      onProgress?.({ status: 'uploading', message: 'Uploading photos...', percentage: 10 })

      const { blobUrls } = await api.uploadAnalysisPhotos(photoUris, sessionId)

      onProgress?.({ status: 'uploading', message: 'Photos uploaded', percentage: 30 })

      onProgress?.({ status: 'analyzing', message: 'Identifying species...', percentage: 50 })

      const analysisRequest: CrabAnalysisRequest = {
        photoUrls: blobUrls,
        views: views.length === blobUrls.length ? views : blobUrls.map(() => 'dorsal'),
        coinType,
      }

      const result = await api.analyzeCrab(analysisRequest)

      onProgress?.({ status: 'analyzing', message: 'Estimating size...', percentage: 75 })
      onProgress?.({ status: 'analyzing', message: 'Almost done...', percentage: 90 })

      onProgress?.({ status: 'complete', message: 'Analysis complete!', percentage: 100 })

      return { analysis: result, blobUrls }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Analysis failed'
      onProgress?.({ status: 'error', message, percentage: 0 })
      throw error
    }
  },

  async retryAnalysis(
    photoUris: string[],
    views: PhotoView[],
    sessionId: string,
    coinType?: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        onProgress?.({ status: 'uploading', message: `Attempt ${attempt}/3...`, percentage: (attempt - 1) * 5 })
        return await this.analyzeCrab(photoUris, views, sessionId, coinType, (progress) => {
          if (onProgress) {
            onProgress({ ...progress, percentage: Math.min(progress.percentage + (attempt - 1) * 5, 100) })
          }
        })
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error('Analysis failed')
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error('Analysis failed after 3 attempts')
  },

  async detectView(photoUri: string, expectedView: PhotoView): Promise<ViewDetectionResult> {
    return api.detectView(photoUri, expectedView)
  },
}
