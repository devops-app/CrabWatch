import type { ImageQualityResult } from '../types/analysis'

export interface BlurThresholds {
  fail: number
  warn: number
}

export const DEFAULT_BLUR_THRESHOLDS: BlurThresholds = {
  fail: 100,
  warn: 400,
}

export type BlurStatus = 'fail' | 'warn' | 'pass'

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 255) return 255
  return Math.round(value)
}

export function rgbaToLuminance(rgba: Uint8Array | Uint8ClampedArray): Uint8Array {
  const pixelCount = Math.floor(rgba.length / 4)
  const luma = new Uint8Array(pixelCount)

  for (let i = 0, p = 0; p < pixelCount; p += 1, i += 4) {
    const r = rgba[i]
    const g = rgba[i + 1]
    const b = rgba[i + 2]
    luma[p] = clampByte(0.299 * r + 0.587 * g + 0.114 * b)
  }

  return luma
}

export function calculateLaplacianVariance(
  grayscale: Uint8Array,
  width: number,
  height: number,
): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 3 || height < 3) {
    return 0
  }

  const expectedPixels = width * height
  if (grayscale.length < expectedPixels) {
    return 0
  }

  let responseCount = 0
  let sum = 0
  let sumSquares = 0

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const centerIdx = y * width + x

      const center = grayscale[centerIdx]
      const top = grayscale[centerIdx - width]
      const bottom = grayscale[centerIdx + width]
      const left = grayscale[centerIdx - 1]
      const right = grayscale[centerIdx + 1]

      const laplacian = top + bottom + left + right - 4 * center

      responseCount += 1
      sum += laplacian
      sumSquares += laplacian * laplacian
    }
  }

  if (responseCount === 0) {
    return 0
  }

  const mean = sum / responseCount
  const variance = sumSquares / responseCount - mean * mean
  return Number.isFinite(variance) ? Math.max(0, variance) : 0
}

export function classifyBlurScore(
  score: number,
  thresholds: BlurThresholds = DEFAULT_BLUR_THRESHOLDS,
): BlurStatus {
  if (!Number.isFinite(score) || score < thresholds.fail) {
    return 'fail'
  }

  if (score < thresholds.warn) {
    return 'warn'
  }

  return 'pass'
}

export function buildImageQualityResult(params: {
  blurScore: number
  brightness: number
  isTooDark: boolean
  issues: ImageQualityResult['issues']
  thresholds?: BlurThresholds
}): ImageQualityResult {
  const status = classifyBlurScore(params.blurScore, params.thresholds)
  return {
    blurScore: params.blurScore,
    brightness: params.brightness,
    isBlurry: status === 'fail',
    isTooDark: params.isTooDark,
    passes: status !== 'fail' && !params.isTooDark,
    issues: params.issues,
  }
}
