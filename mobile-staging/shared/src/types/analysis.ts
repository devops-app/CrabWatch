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
}

export interface CrabAnalysisResult {
  speciesId: string
  speciesName: string
  confidence: number
  estimatedCW: number | null
  estimatedBW: number | null
  gender: Gender
  maturationStatus: MaturationStatus
  detectedCoin: string | null
  coinConfidence: number
  suggestions: string[]
  rawAnalysis: string
}

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'

export interface ViewDetectionResult {
  detectedView: 'dorsal' | 'ventral' | 'carapace-closeup' | 'unknown'
  confidence: number
  mismatch: boolean
  message: string
}
