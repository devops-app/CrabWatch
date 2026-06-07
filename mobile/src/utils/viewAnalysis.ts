import * as ImageManipulator from 'expo-image-manipulator'
import { decode as decodeJpeg } from 'jpeg-js'

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  const maybeBuffer = (globalThis as unknown as {
    Buffer?: { from: (input: string, encoding: string) => Uint8Array }
  }).Buffer

  if (maybeBuffer?.from) {
    return maybeBuffer.from(base64, 'base64')
  }

  throw new Error('Base64 decoding is not available on this device')
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface ViewAnalysis {
  isLikelyDorsal: boolean
  isLikelyVentral: boolean
  confidence: number
  warnings: string[]
}

/**
 * Analyze captured photo to detect potential issues.
 * Uses aspect ratio checks — catches obvious framing mistakes.
 * Brightness checks removed: raw JPEG byte sampling is unreliable.
 */
export async function analyzeView(
  uri: string,
  expectedView: 'dorsal' | 'ventral' | 'carapace-closeup'
): Promise<ViewAnalysis> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 192 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    )

    const aspectRatio = result.width / result.height
    if (!result.base64) {
      throw new Error('Image sampling did not produce base64 data')
    }

    const jpegBytes = base64ToUint8Array(result.base64)
    const decoded = decodeJpeg(jpegBytes, { useTArray: true })
    const { width, height, data } = decoded

    const startX = Math.floor(width * 0.25)
    const endX = Math.floor(width * 0.75)
    const startY = Math.floor(height * 0.25)
    const endY = Math.floor(height * 0.75)

    const warnings: string[] = []
    let luminanceSum = 0
    let luminanceSqSum = 0
    let saturationSum = 0
    let saturationSqSum = 0
    let samples = 0

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const i = (y * width + x) * 4
        const r = data[i] / 255
        const g = data[i + 1] / 255
        const b = data[i + 2] / 255
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const saturation = max === 0 ? 0 : (max - min) / max
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b

        luminanceSum += luminance
        luminanceSqSum += luminance * luminance
        saturationSum += saturation
        saturationSqSum += saturation * saturation
        samples += 1
      }
    }

    const avgLuminance = samples > 0 ? luminanceSum / samples : 0
    const avgSaturation = samples > 0 ? saturationSum / samples : 0
    const luminanceVariance = samples > 0
      ? Math.max(0, luminanceSqSum / samples - avgLuminance * avgLuminance)
      : 0
    const saturationVariance = samples > 0
      ? Math.max(0, saturationSqSum / samples - avgSaturation * avgSaturation)
      : 0

    const dorsalScore = clamp(
      (0.58 - avgLuminance) * 1.5 +
      (avgSaturation - 0.16) * 1.1 +
      (luminanceVariance - 0.012) * 30 +
      (saturationVariance - 0.008) * 28,
      -1,
      1
    )
    const ventralScore = clamp(
      (avgLuminance - 0.46) * 1.5 +
      (0.22 - avgSaturation) * 1.1 +
      (0.015 - luminanceVariance) * 20 +
      (0.010 - saturationVariance) * 22,
      -1,
      1
    )

    let isLikelyDorsal = dorsalScore >= 0.18
    let isLikelyVentral = ventralScore >= 0.18

    if (expectedView === 'carapace-closeup') {
      isLikelyDorsal = dorsalScore >= 0.05
      isLikelyVentral = ventralScore >= 0.05
    }

    const dominantScore = Math.max(Math.abs(dorsalScore), Math.abs(ventralScore))
    const confidence = clamp(0.45 + dominantScore * 0.45 + (samples > 0 ? 0.08 : 0), 0.45, 0.95)

    if (expectedView === 'dorsal' || expectedView === 'ventral') {
      if (aspectRatio < 0.6 || aspectRatio > 1.5) {
        warnings.push('Frame too narrow/wide — crab may not be centered')
      }
    }

    if (expectedView === 'carapace-closeup') {
      if (aspectRatio > 1.3) {
        warnings.push('Frame too wide — zoom in closer on the shell')
      }
    }

    if (expectedView === 'dorsal' && !isLikelyDorsal) {
      warnings.push('Expected dorsal view, but image appears closer to ventral profile')
    }

    if (expectedView === 'ventral' && !isLikelyVentral) {
      warnings.push('Expected ventral view, but image appears closer to dorsal profile')
    }

    if (confidence < 0.7) {
      warnings.push('Local view check is uncertain — fallback AI view detection recommended')
    }

    return {
      isLikelyDorsal,
      isLikelyVentral,
      confidence,
      warnings,
    }
  } catch {
    return {
      isLikelyDorsal: true,
      isLikelyVentral: true,
      confidence: 0.5,
      warnings: [],
    }
  }
}
