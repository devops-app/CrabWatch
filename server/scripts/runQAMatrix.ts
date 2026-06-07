#!/usr/bin/env tsx
/**
 * QA Matrix Runner — Validates image quality gates against expected outcomes.
 *
 * Usage: npx tsx scripts/runQAMatrix.ts <test-images-dir> [output.json]
 *
 * Test images should be named with group prefix: a1-dark.jpg, b1-blur.jpg, etc.
 * The runner matches filenames to the QA matrix scenarios in qa-matrix.md.
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  calculateLaplacianVariance,
  classifyBlurScore,
  DEFAULT_BLUR_THRESHOLDS,
} from '@crabwatch/shared'

// --- Scenario definitions ---

interface Scenario {
  id: string
  group: string
  name: string
  expectedBlur: 'fail' | 'warn' | 'pass' | 'varies'
  expectedBrightness: 'fail' | 'warn' | 'pass' | 'varies'
}

const SCENARIOS: Scenario[] = [
  // Group A: Lighting
  { id: 'a1', group: 'A', name: 'Very low light (night, no flash)', expectedBlur: 'pass', expectedBrightness: 'fail' },
  { id: 'a2', group: 'A', name: 'Overexposed glare (direct sun)', expectedBlur: 'pass', expectedBrightness: 'warn' },
  { id: 'a3', group: 'A', name: 'Normal daylight, diffused', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'a4', group: 'A', name: 'Indoor artificial light', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'a5', group: 'A', name: 'Backlit subject', expectedBlur: 'pass', expectedBrightness: 'warn' },
  // Group B: Focus
  { id: 'b1', group: 'B', name: 'Motion blur (hand shake)', expectedBlur: 'fail', expectedBrightness: 'pass' },
  { id: 'b2', group: 'B', name: 'Out-of-focus closeup', expectedBlur: 'fail', expectedBrightness: 'pass' },
  { id: 'b3', group: 'B', name: 'Sharp focus, good lighting', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'b4', group: 'B', name: 'Slight softness (acceptable)', expectedBlur: 'warn', expectedBrightness: 'pass' },
  // Group C: Framing (coverage-only, gates are blur/brightness)
  { id: 'c1', group: 'C', name: 'Small juvenile crab (<35% frame)', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'c2', group: 'C', name: 'Large adult crab filling frame', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'c3', group: 'C', name: 'Partial occlusion (hand/tool)', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'c4', group: 'C', name: 'Complex background clutter', expectedBlur: 'pass', expectedBrightness: 'pass' },
  // Group D: Crab count (AI-only, quality gates still run)
  { id: 'd1', group: 'D', name: 'No crab (empty scene)', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'd2', group: 'D', name: 'Exactly one crab', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'd3', group: 'D', name: 'Multiple crabs in frame', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'd4', group: 'D', name: 'Crab + debris resembling crab', expectedBlur: 'pass', expectedBrightness: 'pass' },
  // Group E: Surface & Reflection
  { id: 'e1', group: 'E', name: 'Wet shell reflections', expectedBlur: 'pass', expectedBrightness: 'warn' },
  { id: 'e2', group: 'E', name: 'Dry shell, matte surface', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'e3', group: 'E', name: 'Water surface reflection', expectedBlur: 'pass', expectedBrightness: 'pass' },
  // Group F: Resolution
  { id: 'f1', group: 'F', name: 'Webcam 640x480', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'f2', group: 'F', name: 'Webcam 1280x720', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'f3', group: 'F', name: 'Phone camera (high res)', expectedBlur: 'pass', expectedBrightness: 'pass' },
  { id: 'f4', group: 'F', name: 'Compressed/low-quality JPEG', expectedBlur: 'varies', expectedBrightness: 'pass' },
]

function evaluateBrightness(brightness: number): 'fail' | 'warn' | 'pass' {
  if (!Number.isFinite(brightness) || brightness < 0.15) return 'fail'
  if (brightness < 0.4 || brightness > 0.8) return 'warn'
  return 'pass'
}

async function assessImage(filePath: string): Promise<{
  blurScore: number
  blurStatus: 'fail' | 'warn' | 'pass'
  brightness: number
  brightnessStatus: 'fail' | 'warn' | 'pass'
  width: number
  height: number
}> {
  const sourceBuffer = fs.readFileSync(filePath)
  const { data, info } = await sharp(sourceBuffer)
    .rotate()
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (!info.width || !info.height || info.channels < 3) {
    return {
      blurScore: 0,
      blurStatus: 'fail',
      brightness: 0,
      brightnessStatus: 'fail',
      width: info.width || 0,
      height: info.height || 0,
    }
  }

  // Compute luminance
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
  const blurStatus = classifyBlurScore(blurScore, DEFAULT_BLUR_THRESHOLDS)
  const brightnessStatus = evaluateBrightness(brightness)

  // Get original dimensions
  const metadata = await sharp(sourceBuffer).metadata()

  return {
    blurScore: Math.round(blurScore * 100) / 100,
    blurStatus,
    brightness: Math.round(brightness * 10000) / 10000,
    brightnessStatus,
    width: metadata.width || 0,
    height: metadata.height || 0,
  }
}

function matchScenario(filename: string): Scenario | null {
  const base = path.basename(filename).toLowerCase()
  const match = base.match(/^([a-f])(\d+)/)
  if (!match) return null
  const id = `${match[1]}${match[2]}`
  return SCENARIOS.find((s) => s.id === id) || null
}

function statusMatches(actual: 'fail' | 'warn' | 'pass', expected: 'fail' | 'warn' | 'pass' | 'varies'): boolean {
  if (expected === 'varies') return true
  return actual === expected
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/runQAMatrix.ts <test-images-dir> [output.json]')
    console.error('')
    console.error('Test images should be named with group prefix:')
    console.error('  a1-dark.jpg, b1-blur.jpg, c1-small.jpg, etc.')
    console.error('')
    console.error('See qa-matrix.md for full scenario list.')
    process.exit(1)
  }

  const testDir = path.resolve(args[0])
  const outputFile = args[1] || path.join(process.cwd(), 'qa-matrix-report.json')

  if (!fs.existsSync(testDir)) {
    console.error(`Error: Directory not found: ${testDir}`)
    process.exit(1)
  }

  const files = fs.readdirSync(testDir).filter((f) => {
    const ext = path.extname(f).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].includes(ext)
  }).sort()

  if (files.length === 0) {
    console.error(`Error: No image files found in ${testDir}`)
    process.exit(1)
  }

  console.log(`QA Matrix Runner`)
  console.log(`================`)
  console.log(`Test directory: ${testDir}`)
  console.log(`Images found: ${files.length}`)
  console.log(`Thresholds: blur fail=${DEFAULT_BLUR_THRESHOLDS.fail}, warn=${DEFAULT_BLUR_THRESHOLDS.warn}`)
  console.log(`             brightness fail=<0.15, warn=0.15-0.4 / >0.8, pass=0.4-0.8`)
  console.log(``)

  const results: any[] = []
  let passed = 0
  let failed = 0

  for (const file of files) {
    const filePath = path.join(testDir, file)
    const scenario = matchScenario(file)

    console.log(`Processing: ${file}`)

    try {
      const assessment = await assessImage(filePath)

      let match = true
      const mismatches: string[] = []

      if (scenario) {
        const blurOk = statusMatches(assessment.blurStatus, scenario.expectedBlur)
        const brightOk = statusMatches(assessment.brightnessStatus, scenario.expectedBrightness)

        if (!blurOk) {
          match = false
          mismatches.push(`blur: expected ${scenario.expectedBlur}, got ${assessment.blurStatus}`)
        }
        if (!brightOk) {
          match = false
          mismatches.push(`brightness: expected ${scenario.expectedBrightness}, got ${assessment.brightnessStatus}`)
        }
      }

      if (match) {
        passed++
        console.log(`  ✅ PASS — blur: ${assessment.blurStatus} (${assessment.blurScore}), brightness: ${assessment.brightnessStatus} (${assessment.brightness})`)
      } else {
        failed++
        console.log(`  ❌ MISMATCH — ${mismatches.join('; ')}`)
        console.log(`     blur: ${assessment.blurStatus} (${assessment.blurScore}), brightness: ${assessment.brightnessStatus} (${assessment.brightness})`)
      }

      results.push({
        file,
        group: scenario?.group || '?',
        scenario: scenario?.name || 'Unknown scenario',
        dimensions: `${assessment.width}x${assessment.height}`,
        blurScore: assessment.blurScore,
        blurStatus: assessment.blurStatus,
        brightness: assessment.brightness,
        brightnessStatus: assessment.brightnessStatus,
        expectedBlur: scenario?.expectedBlur || null,
        expectedBrightness: scenario?.expectedBrightness || null,
        match,
        mismatches,
      })
    } catch (error) {
      failed++
      console.log(`  ❌ ERROR — ${error instanceof Error ? error.message : String(error)}`)
      results.push({
        file,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  console.log(``)
  console.log(`Results: ${passed} passed, ${failed} failed/mismatched, ${files.length} total`)

  const report = {
    timestamp: new Date().toISOString(),
    thresholds: {
      blur: DEFAULT_BLUR_THRESHOLDS,
      brightness: { fail: 0.15, warnLow: 0.4, warnHigh: 0.8 },
    },
    testDirectory: testDir,
    totalImages: files.length,
    passed,
    failed,
    results,
  }

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2))
  console.log(``)
  console.log(`Report written to: ${outputFile}`)

  if (failed > 0) {
    console.log(``)
    console.log(`Mismatches found. Consider running calibration:`)
    console.log(`  npm run calibrate <labeled-csv> <test-images-dir>`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
