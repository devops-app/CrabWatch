import { Gender, MaturationStatus } from './observation'

export type PhotoView = 'dorsal' | 'ventral' | 'carapace-closeup'

export interface CoinReference {
  denomination: string
  diameter: number
  unit: 'mm'
}

export interface CrabAnalysisRequest {
  photoUrls: string[]
  views: PhotoView[]
  coinType?: string
  locale?: string
}

export interface CrabAnalysisResult {
  speciesId: string
  speciesName: string
  confidence: number
  speciesConfidence?: number
  estimatedCW: number | null
  estimatedBW: number | null
  gender: Gender
  maturationStatus: MaturationStatus
  detectedCoin: string | null
  coinConfidence: number
  crabCount: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
  autoCropBoundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
  crabCoveragePct?: number
  secondPassApplied?: boolean
  suggestions: string[]
  rawAnalysis: string
}

export const QUALITY_ISSUE_CODES = [
  'QUALITY_BLUR_FAIL',
  'QUALITY_BRIGHTNESS_FAIL',
  'QUALITY_VIEW_FAIL',
  'QUALITY_COVERAGE_WARN',
  'QUALITY_WEBCAM_LOW_RES_WARN',
  'CRAB_COUNT_ZERO_FAIL',
  'CRAB_COUNT_MULTI_FAIL',
  'QUALITY_ORIENTATION_INVALID',
] as const

export type QualityIssueCode = (typeof QUALITY_ISSUE_CODES)[number]

export interface ImageQualityResult {
  blurScore: number
  brightness: number
  isBlurry: boolean
  isTooDark: boolean
  passes: boolean
  issues: QualityIssueCode[]
}

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'

export interface ViewDetectionResult {
  detectedView: 'dorsal' | 'ventral' | 'carapace-closeup' | 'unknown'
  confidence: number
  mismatch: boolean
  message: string
}
