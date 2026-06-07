import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  calculateLaplacianVariance,
  classifyBlurScore,
  DEFAULT_BLUR_THRESHOLDS,
} from '@crabwatch/shared'

// --- CLI argument parsing ---
interface CliArgs {
  dataset: string
  output: string
  blurFailMin?: number
  blurFailMax?: number
  blurWarnMin?: number
  blurWarnMax?: number
  brightFailMin?: number
  brightFailMax?: number
  brightWarnLowMin?: number
  brightWarnLowMax?: number
  brightWarnHighMin?: number
  brightWarnHighMax?: number
  stepBlur?: number
  stepBright?: number
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dataset: '',
    output: 'calibration-report.json',
  }
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      if (i + 1 >= argv.length) return undefined
      i += 1
      return argv[i]
    }
    switch (arg) {
      case '--dataset':
        args.dataset = next() || ''
        break
      case '--output':
        args.output = next() || 'calibration-report.json'
        break
      case '--blur-fail-min':
        args.blurFailMin = parseInt(next() || '0', 10)
        break
      case '--blur-fail-max':
        args.blurFailMax = parseInt(next() || '200', 10)
        break
      case '--blur-warn-min':
        args.blurWarnMin = parseInt(next() || '100', 10)
        break
      case '--blur-warn-max':
        args.blurWarnMax = parseInt(next() || '800', 10)
        break
      case '--bright-fail-min':
        args.brightFailMin = parseFloat(next() || '0.05')
        break
      case '--bright-fail-max':
        args.brightFailMax = parseFloat(next() || '0.25')
        break
      case '--bright-warn-low-min':
        args.brightWarnLowMin = parseFloat(next() || '0.1')
        break
      case '--bright-warn-low-max':
        args.brightWarnLowMax = parseFloat(next() || '0.5')
        break
      case '--bright-warn-high-min':
        args.brightWarnHighMin = parseFloat(next() || '0.7')
        break
      case '--bright-warn-high-max':
        args.brightWarnHighMax = parseFloat(next() || '0.95')
        break
      case '--step-blur':
        args.stepBlur = parseInt(next() || '25', 10)
        break
      case '--step-bright':
        args.stepBright = parseFloat(next() || '0.02')
        break
    }
  }
  return args
}

// --- CSV parsing ---
interface CalibrationLabel {
  path: string
  blurLabel: 'clear' | 'slight' | 'blurry' | 'extreme'
  brightLabel: 'dark' | 'dim' | 'ok' | 'bright' | 'overexposed'
  coverageLabel: 'ok' | 'low' | 'very_low'
  notes: string
}

function parseCsv(content: string): CalibrationLabel[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const pathIdx = headers.indexOf('path')
  const blurIdx = headers.indexOf('blurlabel')
  const brightIdx = headers.indexOf('brightlabel')
  const coverageIdx = headers.indexOf('coveragelabel')
  const notesIdx = headers.indexOf('notes')

  if (pathIdx === -1 || blurIdx === -1 || brightIdx === -1 || coverageIdx === -1) {
    throw new Error('CSV must have path, blurLabel, brightLabel, coverageLabel columns')
  }

  const results: CalibrationLabel[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue

    const cols = line.split(',').map((c) => c.trim())
    const blurRaw = cols[blurIdx]?.toLowerCase()
    const brightRaw = cols[brightIdx]?.toLowerCase()
    const coverageRaw = cols[coverageIdx]?.toLowerCase()

    const validBlur = ['clear', 'slight', 'blurry', 'extreme']
    const validBright = ['dark', 'dim', 'ok', 'bright', 'overexposed']
    const validCoverage = ['ok', 'low', 'very_low']

    if (!validBlur.includes(blurRaw)) continue
    if (!validBright.includes(brightRaw)) continue
    if (!validCoverage.includes(coverageRaw)) continue

    results.push({
      path: cols[pathIdx],
      blurLabel: blurRaw as CalibrationLabel['blurLabel'],
      brightLabel: brightRaw as CalibrationLabel['brightLabel'],
      coverageLabel: coverageRaw as CalibrationLabel['coverageLabel'],
      notes: notesIdx >= 0 ? (cols[notesIdx] || '') : '',
    })
  }
  return results
}

// --- Image processing ---
interface ImageMetrics {
  path: string
  blurScore: number
  brightness: number
  width: number
  height: number
}

async function assessImage(imagePath: string): Promise<ImageMetrics | null> {
  let buffer: Buffer
  try {
    buffer = fs.readFileSync(imagePath)
  } catch {
    return null
  }

  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (!info.width || !info.height || info.channels < 3) {
    return null
  }

  const luminance = new Uint8Array(info.width * info.height)
  let sum = 0

  for (let i = 0, p = 0; p < luminance.length; p += 1, i += info.channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    luminance[p] = y
    sum += y
  }

  const brightness = luminance.length > 0 ? sum / luminance.length / 255 : 0
  const blurScore = calculateLaplacianVariance(luminance, info.width, info.height)

  return {
    path: imagePath,
    blurScore,
    brightness,
    width: info.width,
    height: info.height,
  }
}

// --- Confusion matrix helpers ---
interface ConfusionMatrix {
  tp: number
  fp: number
  tn: number
  fn: number
}

function computeMetrics(cm: ConfusionMatrix) {
  const precision = cm.tp + cm.fp > 0 ? cm.tp / (cm.tp + cm.fp) : 0
  const recall = cm.tp + cm.fn > 0 ? cm.tp / (cm.tp + cm.fn) : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  const accuracy = cm.tp + cm.fp + cm.tn + cm.fn > 0
    ? (cm.tp + cm.tn) / (cm.tp + cm.fp + cm.tn + cm.fn)
    : 0
  return { precision, recall, f1, accuracy }
}

// Map human blur labels to binary "is blurry" (fail) and "is slightly blurry" (warn)
function blurLabelToStatus(label: CalibrationLabel['blurLabel']): 'pass' | 'warn' | 'fail' {
  switch (label) {
    case 'clear':
      return 'pass'
    case 'slight':
      return 'warn'
    case 'blurry':
      return 'fail'
    case 'extreme':
      return 'fail'
  }
}

function brightLabelToStatus(label: CalibrationLabel['brightLabel']): 'pass' | 'warn' | 'fail' {
  switch (label) {
    case 'ok':
    case 'bright':
      return 'pass'
    case 'dim':
      return 'warn'
    case 'dark':
      return 'fail'
    case 'overexposed':
      return 'warn'
  }
}

function classifyBrightnessThreshold(brightness: number, failThreshold: number, warnLow: number, warnHigh: number): 'fail' | 'warn' | 'pass' {
  if (!Number.isFinite(brightness) || brightness < failThreshold) {
    return 'fail'
  }
  if (brightness < warnLow || brightness > warnHigh) {
    return 'warn'
  }
  return 'pass'
}

// --- Threshold sweep ---
interface ThresholdResult {
  failThreshold: number
  warnThreshold: number
  cm: ConfusionMatrix
  metrics: ReturnType<typeof computeMetrics>
}

interface BrightnessThresholdResult {
  failThreshold: number
  warnLow: number
  warnHigh: number
  cm: ConfusionMatrix
  metrics: ReturnType<typeof computeMetrics>
}

function sweepBlurThresholds(
  data: { blurScore: number; label: 'pass' | 'warn' | 'fail' }[],
  failMin: number,
  failMax: number,
  warnMin: number,
  warnMax: number,
  step: number,
): ThresholdResult[] {
  const results: ThresholdResult[] = []

  for (let fail = failMin; fail <= failMax; fail += step) {
    for (let warn = Math.max(warnMin, fail + step); warn <= warnMax; warn += step) {
      let tp = 0, fp = 0, tn = 0, fn = 0

      for (const d of data) {
        const predicted = classifyBlurScore(d.blurScore, { fail, warn })
        const isFail = predicted === 'fail'
        const labelIsFail = d.label === 'fail'

        if (isFail && labelIsFail) tp++
        else if (isFail && !labelIsFail) fp++
        else if (!isFail && labelIsFail) fn++
        else tn++
      }

      const cm = { tp, fp, tn, fn }
      results.push({
        failThreshold: fail,
        warnThreshold: warn,
        cm,
        metrics: computeMetrics(cm),
      })
    }
  }
  return results
}

function sweepBrightnessThresholds(
  data: { brightness: number; label: 'pass' | 'warn' | 'fail' }[],
  failMin: number,
  failMax: number,
  warnLowMin: number,
  warnLowMax: number,
  warnHighMin: number,
  warnHighMax: number,
  step: number,
): BrightnessThresholdResult[] {
  const results: BrightnessThresholdResult[] = []

  for (let fail = failMin; fail <= failMax + step * 0.5; fail += step) {
    for (let warnLow = Math.max(warnLowMin, fail + step); warnLow <= warnLowMax; warnLow += step) {
      for (let warnHigh = Math.max(warnHighMin, warnLow + step); warnHigh <= warnHighMax; warnHigh += step) {
        let tp = 0, fp = 0, tn = 0, fn = 0

        for (const d of data) {
          const predicted = classifyBrightnessThreshold(d.brightness, fail, warnLow, warnHigh)
          const isFail = predicted === 'fail'
          const labelIsFail = d.label === 'fail'

          if (isFail && labelIsFail) tp++
          else if (isFail && !labelIsFail) fp++
          else if (!isFail && labelIsFail) fn++
          else tn++
        }

        const cm = { tp, fp, tn, fn }
        results.push({
          failThreshold: Math.round(fail * 10000) / 10000,
          warnLow: Math.round(warnLow * 10000) / 10000,
          warnHigh: Math.round(warnHigh * 10000) / 10000,
          cm,
          metrics: computeMetrics(cm),
        })
      }
    }
  }
  return results
}

// --- Distribution analysis ---
interface ScoreDistribution {
  min: number
  max: number
  mean: number
  median: number
  p10: number
  p90: number
  buckets: { range: string; count: number }[]
}

function computeDistribution(values: number[], bucketCount = 10): ScoreDistribution {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p10: 0, p90: 0, buckets: [] }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length
  const median = sorted[Math.floor(sorted.length / 2)]
  const p10 = sorted[Math.floor(sorted.length * 0.1)]
  const p90 = sorted[Math.floor(sorted.length * 0.9)]

  const buckets: ScoreDistribution['buckets'] = []
  const range = max - min || 1
  const bucketSize = range / bucketCount

  for (let i = 0; i < bucketCount; i++) {
    const lo = min + i * bucketSize
    const hi = lo + bucketSize
    const count = sorted.filter((v) => v >= lo && (i === bucketCount - 1 ? v <= hi : v < hi)).length
    buckets.push({
      range: `${lo.toFixed(2)}–${hi.toFixed(2)}`,
      count,
    })
  }

  return { min, max, mean, median, p10, p90, buckets }
}

// --- Report generation ---
interface CalibrationReport {
  timestamp: string
  datasetPath: string
  totalImages: number
  processedImages: number
  failedImages: number
  currentThresholds: {
    blur: { fail: number; warn: number }
    brightness: { fail: number; warnLow: number; warnHigh: number }
  }
  blurDistribution: ScoreDistribution
  brightnessDistribution: ScoreDistribution
  blurRecommendation: {
    recommendedFail: number
    recommendedWarn: number
    f1: number
    precision: number
    recall: number
    accuracy: number
    top5: Array<{ fail: number; warn: number; f1: number; precision: number; recall: number; accuracy: number }>
  } | null
  brightnessRecommendation: {
    recommendedFail: number
    recommendedWarnLow: number
    recommendedWarnHigh: number
    f1: number
    precision: number
    recall: number
    accuracy: number
    top5: Array<{ fail: number; warnLow: number; warnHigh: number; f1: number; precision: number; recall: number; accuracy: number }>
  } | null
  imageResults: Array<{
    path: string
    blurScore: number
    brightness: number
    blurLabel: string
    brightLabel: string
    predictedBlurStatus: string
    predictedBrightStatus: string
    blurMatch: boolean
    brightMatch: boolean
  }>
}

// --- Main ---
async function main() {
  const args = parseArgs(process.argv)

  if (!args.dataset) {
    console.error('Usage: tsx calibrateQuality.ts --dataset <path-to-csv> [--output <report.json>]')
    console.error('')
    console.error('Options:')
    console.error('  --dataset <path>     Path to labeled CSV dataset')
    console.error('  --output <path>      Output report path (default: calibration-report.json)')
    console.error('  --blur-fail-min      Min blur fail threshold to sweep (default: 0)')
    console.error('  --blur-fail-max      Max blur fail threshold to sweep (default: 200)')
    console.error('  --blur-warn-min      Min blur warn threshold to sweep (default: 100)')
    console.error('  --blur-warn-max      Max blur warn threshold to sweep (default: 800)')
    console.error('  --bright-fail-min    Min brightness fail threshold (default: 0.05)')
    console.error('  --bright-fail-max    Max brightness fail threshold (default: 0.25)')
    console.error('  --bright-warn-low-min  Min warn low threshold (default: 0.1)')
    console.error('  --bright-warn-low-max  Max warn low threshold (default: 0.5)')
    console.error('  --bright-warn-high-min Min warn high threshold (default: 0.7)')
    console.error('  --bright-warn-high-max Max warn high threshold (default: 0.95)')
    console.error('  --step-blur          Blur threshold step (default: 25)')
    console.error('  --step-bright        Brightness threshold step (default: 0.02)')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(args.dataset, 'utf-8')
  const labels = parseCsv(csvContent)

  if (labels.length === 0) {
    console.error('No valid labels found in dataset CSV')
    process.exit(1)
  }

  console.log(`Loaded ${labels.length} labeled images from ${args.dataset}`)

  // Resolve image paths
  const datasetDir = path.dirname(args.dataset)
  const processed: Array<{ label: CalibrationLabel; metrics: ImageMetrics }> = []
  let failedCount = 0

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    const fullPath = path.resolve(datasetDir, label.path)
    console.log(`  [${i + 1}/${labels.length}] Processing ${label.path}...`)

    const metrics = await assessImage(fullPath)
    if (!metrics) {
      console.error(`    SKIP: Could not process image`)
      failedCount++
      continue
    }

    processed.push({ label, metrics })
  }

  if (processed.length === 0) {
    console.error('No images could be processed. Check paths and image format.')
    process.exit(1)
  }

  console.log(`\nProcessed ${processed.length}/${labels.length} images (${failedCount} failed)`)

  // Current thresholds performance
  const currentBlurFail = DEFAULT_BLUR_THRESHOLDS.fail
  const currentBlurWarn = DEFAULT_BLUR_THRESHOLDS.warn
  const currentBrightFail = 0.15
  const currentBrightWarnLow = 0.4
  const currentBrightWarnHigh = 0.8

  console.log(`\nCurrent thresholds: blur fail=${currentBlurFail}, warn=${currentBlurWarn}`)
  console.log(`  brightness fail=${currentBrightFail}, warnLow=${currentBrightWarnLow}, warnHigh=${currentBrightWarnHigh}`)

  // Per-image results with current thresholds
  const imageResults = processed.map(({ label, metrics }) => {
    const predBlur = classifyBlurScore(metrics.blurScore, { fail: currentBlurFail, warn: currentBlurWarn })
    const predBright = classifyBrightnessThreshold(metrics.brightness, currentBrightFail, currentBrightWarnLow, currentBrightWarnHigh)
    const labelBlur = blurLabelToStatus(label.blurLabel)
    const labelBright = brightLabelToStatus(label.brightLabel)

    return {
      path: label.path,
      blurScore: Math.round(metrics.blurScore * 100) / 100,
      brightness: Math.round(metrics.brightness * 10000) / 10000,
      blurLabel: label.blurLabel,
      brightLabel: label.brightLabel,
      predictedBlurStatus: predBlur,
      predictedBrightStatus: predBright,
      blurMatch: predBlur === labelBlur,
      brightMatch: predBright === labelBright,
    }
  })

  const blurMatchCount = imageResults.filter((r) => r.blurMatch).length
  const brightMatchCount = imageResults.filter((r) => r.brightMatch).length
  console.log(`\nCurrent thresholds accuracy: blur ${blurMatchCount}/${processed.length}, brightness ${brightMatchCount}/${processed.length}`)

  // Distributions
  const blurScores = processed.map((p) => p.metrics.blurScore)
  const brightnessValues = processed.map((p) => p.metrics.brightness)

  const blurDist = computeDistribution(blurScores)
  const brightDist = computeDistribution(brightnessValues)

  console.log(`\nBlur score distribution: min=${blurDist.min.toFixed(2)}, max=${blurDist.max.toFixed(2)}, mean=${blurDist.mean.toFixed(2)}, median=${blurDist.median.toFixed(2)}`)
  console.log(`Brightness distribution: min=${brightDist.min.toFixed(4)}, max=${brightDist.max.toFixed(4)}, mean=${brightDist.mean.toFixed(4)}, median=${brightDist.median.toFixed(4)}`)

  // Threshold sweeps
  let blurRecommendation: CalibrationReport['blurRecommendation'] = null
  let brightnessRecommendation: CalibrationReport['brightnessRecommendation'] = null

  // Blur sweep
  const blurData = processed.map((p) => ({
    blurScore: p.metrics.blurScore,
    label: blurLabelToStatus(p.label.blurLabel),
  }))

  const blurResults = sweepBlurThresholds(
    blurData,
    args.blurFailMin ?? 0,
    args.blurFailMax ?? 200,
    args.blurWarnMin ?? 100,
    args.blurWarnMax ?? 800,
    args.stepBlur ?? 25,
  )

  const bestBlur = [...blurResults].sort((a, b) => b.metrics.f1 - a.metrics.f1)[0]
  const top5Blur = [...blurResults].sort((a, b) => b.metrics.f1 - a.metrics.f1).slice(0, 5)

  if (bestBlur) {
    blurRecommendation = {
      recommendedFail: bestBlur.failThreshold,
      recommendedWarn: bestBlur.warnThreshold,
      f1: Math.round(bestBlur.metrics.f1 * 10000) / 10000,
      precision: Math.round(bestBlur.metrics.precision * 10000) / 10000,
      recall: Math.round(bestBlur.metrics.recall * 10000) / 10000,
      accuracy: Math.round(bestBlur.metrics.accuracy * 10000) / 10000,
      top5: top5Blur.map((r) => ({
        fail: r.failThreshold,
        warn: r.warnThreshold,
        f1: Math.round(r.metrics.f1 * 10000) / 10000,
        precision: Math.round(r.metrics.precision * 10000) / 10000,
        recall: Math.round(r.metrics.recall * 10000) / 10000,
        accuracy: Math.round(r.metrics.accuracy * 10000) / 10000,
      })),
    }

    console.log(`\nRecommended blur thresholds: fail=${bestBlur.failThreshold}, warn=${bestBlur.warnThreshold}`)
    console.log(`  F1=${bestBlur.metrics.f1.toFixed(4)}, P=${bestBlur.metrics.precision.toFixed(4)}, R=${bestBlur.metrics.recall.toFixed(4)}, Acc=${bestBlur.metrics.accuracy.toFixed(4)}`)
  }

  // Brightness sweep
  const brightData = processed.map((p) => ({
    brightness: p.metrics.brightness,
    label: brightLabelToStatus(p.label.brightLabel),
  }))

  const brightResults = sweepBrightnessThresholds(
    brightData,
    args.brightFailMin ?? 0.05,
    args.brightFailMax ?? 0.25,
    args.brightWarnLowMin ?? 0.1,
    args.brightWarnLowMax ?? 0.5,
    args.brightWarnHighMin ?? 0.7,
    args.brightWarnHighMax ?? 0.95,
    args.stepBright ?? 0.02,
  )

  const bestBright = [...brightResults].sort((a, b) => b.metrics.f1 - a.metrics.f1)[0]
  const top5Bright = [...brightResults].sort((a, b) => b.metrics.f1 - a.metrics.f1).slice(0, 5)

  if (bestBright) {
    brightnessRecommendation = {
      recommendedFail: bestBright.failThreshold,
      recommendedWarnLow: bestBright.warnLow,
      recommendedWarnHigh: bestBright.warnHigh,
      f1: Math.round(bestBright.metrics.f1 * 10000) / 10000,
      precision: Math.round(bestBright.metrics.precision * 10000) / 10000,
      recall: Math.round(bestBright.metrics.recall * 10000) / 10000,
      accuracy: Math.round(bestBright.metrics.accuracy * 10000) / 10000,
      top5: top5Bright.map((r) => ({
        fail: r.failThreshold,
        warnLow: r.warnLow,
        warnHigh: r.warnHigh,
        f1: Math.round(r.metrics.f1 * 10000) / 10000,
        precision: Math.round(r.metrics.precision * 10000) / 10000,
        recall: Math.round(r.metrics.recall * 10000) / 10000,
        accuracy: Math.round(r.metrics.accuracy * 10000) / 10000,
      })),
    }

    console.log(`\nRecommended brightness thresholds: fail=${bestBright.failThreshold}, warnLow=${bestBright.warnLow}, warnHigh=${bestBright.warnHigh}`)
    console.log(`  F1=${bestBright.metrics.f1.toFixed(4)}, P=${bestBright.metrics.precision.toFixed(4)}, R=${bestBright.metrics.recall.toFixed(4)}, Acc=${bestBright.metrics.accuracy.toFixed(4)}`)
  }

  // Build report
  const report: CalibrationReport = {
    timestamp: new Date().toISOString(),
    datasetPath: args.dataset,
    totalImages: labels.length,
    processedImages: processed.length,
    failedImages: failedCount,
    currentThresholds: {
      blur: { fail: currentBlurFail, warn: currentBlurWarn },
      brightness: { fail: currentBrightFail, warnLow: currentBrightWarnLow, warnHigh: currentBrightWarnHigh },
    },
    blurDistribution: blurDist,
    brightnessDistribution: brightDist,
    blurRecommendation,
    brightnessRecommendation,
    imageResults,
  }

  // Write report
  const outputPath = path.resolve(args.output)
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
  console.log(`\nReport written to ${outputPath}`)

  // Summary table for mismatches
  const mismatches = imageResults.filter((r) => !r.blurMatch || !r.brightMatch)
  if (mismatches.length > 0) {
    console.log(`\nMismatches (${mismatches.length}):`)
    for (const m of mismatches) {
      const issues: string[] = []
      if (!m.blurMatch) issues.push(`blur: ${m.blurLabel}->${m.predictedBlurStatus} (score=${m.blurScore})`)
      if (!m.brightMatch) issues.push(`bright: ${m.brightLabel}->${m.predictedBrightStatus} (val=${m.brightness})`)
      console.log(`  ${m.path}: ${issues.join(', ')}`)
    }
  }
}

main().catch((err) => {
  console.error('Calibration failed:', err)
  process.exit(1)
})
