/**
 * Pure, dependency-free math for live camera-frame quality analysis.
 *
 * The core functions here are **worklet-safe**: they take only primitive /
 * typed-array arguments, allocate no closures over non-shareable state, and
 * import nothing. That lets `downsampleBgraToLuminance` run directly on the
 * VisionCamera frame-processor thread (a "worklet"), where the raw pixel
 * buffer is available.
 *
 * The heavier classification (blur / brightness / framing status) is run on the
 * JS thread by the `useLiveFrameQuality` hook, where normal module imports
 * (e.g. the shared `classifyBrightness`) are available.
 *
 * IMPORTANT — advisory only:
 * The live check downsamples the frame to a small grid, so its absolute blur
 * scores are NOT on the same scale as the post-capture gate (which scores a
 * 256px JPEG). The live thresholds below are therefore deliberately lenient
 * and calibrated for the downsampled grid. The live view only drives the
 * overlay chips / frame glow; the post-capture `QualityGateCard` remains the
 * authoritative enforcement point.
 */

/** Edge length (in pixels) of the square luminance grid we downsample to. */
export const LIVE_GRID_SIZE = 128

/** Minimum interval (ms) between live quality samples pushed to the UI. */
export const LIVE_SAMPLE_INTERVAL_MS = 330 // ~3 Hz

export interface LiveFrameMetrics {
  /** Laplacian variance of the downsampled grid (sharpness proxy). */
  blurScore: number
  /** Mean luminance, normalized 0-1. */
  brightness: number
  /** Center/edge energy ratio, 0-1 (higher = more detail in the center). */
  framingScore: number
}

export type LiveGateStatus = 'fail' | 'warn' | 'pass'

export interface LiveFrameQuality {
  blurScore: number
  brightness: number
  framingScore: number
  blurStatus: LiveGateStatus
  brightnessStatus: LiveGateStatus
  framingStatus: LiveGateStatus
  /** Worst of the three statuses. */
  overallStatus: LiveGateStatus
  /** True when no status is 'fail' (used to tint the frame green). */
  ready: boolean
}

/**
 * Live blur thresholds, calibrated for the downsampled grid (NOT the same
 * scale as the post-capture gate). Kept lenient so the live view never traps
 * the user — it only nudges.
 */
export const LIVE_BLUR_THRESHOLDS = {
  fail: 40,
  warn: 120,
} as const

/**
 * Live framing threshold. `framingScore` is a center/edge energy ratio in
 * 0-1; below this we gently suggest re-centering. Framing is advisory and
 * never 'fail'.
 */
export const LIVE_FRAMING_WARN_BELOW = 0.42

/**
 * Downsample a BGRA pixel buffer (VisionCamera `pixelFormat: 'rgb'` yields
 * interleaved [B, G, R, A]) into a square grayscale luminance grid.
 *
 * Uses nearest-neighbour sampling with `bytesPerRow` to respect any row
 * padding the native buffer may have.
 *
 * @returns a `Uint8Array` of length `gridSize * gridSize`, or `null` if the
 *   input dimensions are invalid.
 */
export function downsampleBgraToLuminance(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  bytesPerRow: number,
  gridSize: number,
): Uint8Array | null {
  'worklet'
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  if (!Number.isFinite(bytesPerRow) || bytesPerRow < width * 4) {
    return null
  }
  if (buffer.byteLength < bytesPerRow * height) {
    return null
  }

  const bytes = new Uint8ClampedArray(buffer)
  const grid = new Uint8Array(gridSize * gridSize)

  for (let gy = 0; gy < gridSize; gy += 1) {
    const sy = Math.min(height - 1, Math.floor((gy + 0.5) * (height / gridSize)))
    const rowOffset = sy * bytesPerRow
    for (let gx = 0; gx < gridSize; gx += 1) {
      const sx = Math.min(width - 1, Math.floor((gx + 0.5) * (width / gridSize)))
      const i = rowOffset + sx * 4
      const b = bytes[i]
      const g = bytes[i + 1]
      const r = bytes[i + 2]
      grid[gy * gridSize + gx] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    }
  }

  return grid
}

/**
 * Laplacian variance over a square grayscale grid — a sharpness proxy that
 * mirrors the shared `calculateLaplacianVariance` (4-neighbour Laplacian).
 * Higher = sharper.
 */
export function laplacianVariance(grid: Uint8Array, size: number): number {
  'worklet'
  if (size < 3 || grid.length < size * size) return 0

  let count = 0
  let sum = 0
  let sumSquares = 0

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const centerIdx = y * size + x
      const center = grid[centerIdx]
      const top = grid[centerIdx - size]
      const bottom = grid[centerIdx + size]
      const left = grid[centerIdx - 1]
      const right = grid[centerIdx + 1]

      const laplacian = top + bottom + left + right - 4 * center
      count += 1
      sum += laplacian
      sumSquares += laplacian * laplacian
    }
  }

  if (count === 0) return 0
  const mean = sum / count
  const variance = sumSquares / count - mean * mean
  return Number.isFinite(variance) ? Math.max(0, variance) : 0
}

/** Mean luminance of the grid, normalized to 0-1. */
export function meanLuminance(grid: Uint8Array, size: number): number {
  'worklet'
  const total = size * size
  if (total === 0 || grid.length < total) return 0
  let sum = 0
  for (let i = 0; i < total; i += 1) sum += grid[i]
  return sum / total / 255
}

/**
 * Center/edge energy ratio for a framing proxy.
 *
 * Computes the mean absolute Laplacian response in the inner 50% box versus
 * the outer border ring. A subject (crab) centered in the frame produces
 * strong local edges in the center, pushing the ratio toward 1. A subject
 * pushed to the edge (or an empty center) lowers it.
 *
 * @returns a value in 0-1; ~0.5 is neutral.
 */
export function centerEdgeEnergyRatio(grid: Uint8Array, size: number): number {
  'worklet'
  if (size < 8 || grid.length < size * size) return 0.5

  const innerStart = Math.floor(size * 0.25)
  const innerEnd = Math.ceil(size * 0.75)

  let centerEnergy = 0
  let centerCount = 0
  let edgeEnergy = 0
  let edgeCount = 0

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const centerIdx = y * size + x
      const center = grid[centerIdx]
      const laplacian =
        Math.abs(
          grid[centerIdx - size] +
            grid[centerIdx + size] +
            grid[centerIdx - 1] +
            grid[centerIdx + 1] -
            4 * center,
        )

      const inCenter = x >= innerStart && x < innerEnd && y >= innerStart && y < innerEnd
      if (inCenter) {
        centerEnergy += laplacian
        centerCount += 1
      } else {
        edgeEnergy += laplacian
        edgeCount += 1
      }
    }
  }

  const centerMean = centerCount > 0 ? centerEnergy / centerCount : 0
  const edgeMean = edgeCount > 0 ? edgeEnergy / edgeCount : 0
  const denom = centerMean + edgeMean
  if (denom <= 0) return 0.5
  return centerMean / denom
}

/** Compute the raw (unclassified) metrics from a downsampled grid. */
export function computeLiveFrameMetrics(grid: Uint8Array, size: number): LiveFrameMetrics {
  'worklet'
  return {
    blurScore: laplacianVariance(grid, size),
    brightness: meanLuminance(grid, size),
    framingScore: centerEdgeEnergyRatio(grid, size),
  }
}

function classifyLiveBlur(score: number): LiveGateStatus {
  if (!Number.isFinite(score) || score < LIVE_BLUR_THRESHOLDS.fail) return 'fail'
  if (score < LIVE_BLUR_THRESHOLDS.warn) return 'warn'
  return 'pass'
}

function classifyLiveFraming(score: number): LiveGateStatus {
  // Advisory only — framing never 'fail'.
  if (!Number.isFinite(score) || score < LIVE_FRAMING_WARN_BELOW) return 'warn'
  return 'pass'
}

function worstStatus(a: LiveGateStatus, b: LiveGateStatus): LiveGateStatus {
  if (a === 'fail' || b === 'fail') return 'fail'
  if (a === 'warn' || b === 'warn') return 'warn'
  return 'pass'
}

/**
 * Classify raw metrics into a full live quality result. Runs on the JS thread
 * (uses the shared brightness classifier so live and post-capture agree on
 * dark/low/bright handling).
 */
export function classifyLiveFrameMetrics(
  metrics: LiveFrameMetrics,
  classifyBrightness: (brightness: number) => LiveGateStatus,
): LiveFrameQuality {
  const blurStatus = classifyLiveBlur(metrics.blurScore)
  const brightnessStatus = classifyBrightness(metrics.brightness)
  const framingStatus = classifyLiveFraming(metrics.framingScore)

  const overallStatus = worstStatus(worstStatus(blurStatus, brightnessStatus), framingStatus)

  return {
    blurScore: metrics.blurScore,
    brightness: metrics.brightness,
    framingScore: metrics.framingScore,
    blurStatus,
    brightnessStatus,
    framingStatus,
    overallStatus,
    ready: overallStatus !== 'fail',
  }
}
