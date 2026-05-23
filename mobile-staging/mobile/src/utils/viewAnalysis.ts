import * as ImageManipulator from 'expo-image-manipulator'

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
      [{ resize: { width: 128 } }],
      { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
    )

    const aspectRatio = result.width / result.height
    const warnings: string[] = []
    let confidence = 0.8

    if (expectedView === 'dorsal' || expectedView === 'ventral') {
      if (aspectRatio < 0.6 || aspectRatio > 1.5) {
        warnings.push('Frame too narrow/wide — crab may not be centered')
        confidence = Math.min(confidence, 0.5)
      }
    }

    if (expectedView === 'carapace-closeup') {
      if (aspectRatio > 1.3) {
        warnings.push('Frame too wide — zoom in closer on the shell')
        confidence = Math.min(confidence, 0.5)
      }
    }

    return {
      isLikelyDorsal: true,
      isLikelyVentral: true,
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
