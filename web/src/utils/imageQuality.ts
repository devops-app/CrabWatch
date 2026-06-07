import {
  calculateLaplacianVariance,
  classifyBlurScore,
  DEFAULT_BLUR_THRESHOLDS,
  rgbaToLuminance,
  type BlurThresholds,
} from '@crabwatch/shared'

export interface WebBlurAssessment {
  score: number
  status: 'fail' | 'warn' | 'pass'
  isBlurry: boolean
}

export function getBlurScoreFromImageData(imageData: ImageData): number {
  const luminance = rgbaToLuminance(imageData.data)
  return calculateLaplacianVariance(luminance, imageData.width, imageData.height)
}

export function assessWebBlur(
  imageData: ImageData,
  thresholds: BlurThresholds = DEFAULT_BLUR_THRESHOLDS,
): WebBlurAssessment {
  const score = getBlurScoreFromImageData(imageData)
  const status = classifyBlurScore(score, thresholds)

  return {
    score,
    status,
    isBlurry: status === 'fail',
  }
}
