import type { CrabAnalysisResult, PhotoView, SpeciesResponse, ViewDetectionResult } from '@crabwatch/shared'
import { api } from '@/lib/api'

export const CAPTURE_STEPS: Array<{ key: PhotoView; required: boolean }> = [
  { key: 'dorsal', required: true },
  { key: 'ventral', required: true },
  { key: 'carapace-closeup', required: false },
]

export type PhotoMap = Record<PhotoView, string | null>

export interface ReviewFormState {
  speciesId: string
  cw: string
  bw: string
  gender: 'male' | 'female' | 'unknown'
  maturationStatus: 'mature' | 'immature' | 'unknown'
  lat: string
  lng: string
  locationMethod: 'gps' | 'manual'
  notes: string
}

export interface FlashMessage {
  tone: 'success' | 'error' | 'info'
  text: string
}

export type AnalysisStage = 'idle' | 'uploading' | 'identifying' | 'estimating' | 'complete' | 'reviewing'

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function normalizeSpeciesText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function findSpeciesMatch(result: CrabAnalysisResult, options: SpeciesResponse[]): SpeciesResponse | null {
  if (isUuid(result.speciesId)) {
    const byId = options.find((item) => item.id === result.speciesId)
    if (byId) return byId
  }

  const aiCandidates = [result.speciesName, result.speciesId]
    .map((value) => normalizeSpeciesText(value))
    .filter((value) => value && value !== 'unknown' && value !== 'unknown species')

  if (aiCandidates.length === 0) return null

  const exact = options.find((item) => {
    const scientific = normalizeSpeciesText(item.scientificName)
    const common = normalizeSpeciesText(item.commonName)
    return aiCandidates.some((candidate) => candidate === scientific || candidate === common)
  })
  if (exact) return exact

  const partial = options.find((item) => {
    const scientific = normalizeSpeciesText(item.scientificName)
    const common = normalizeSpeciesText(item.commonName)
    return aiCandidates.some((candidate) => {
      const candidateWords = candidate.split(' ').filter(Boolean)
      const genus = candidateWords[0]
      return scientific.includes(candidate) || common.includes(candidate)
        || candidate.includes(scientific) || candidate.includes(common)
        || (genus ? scientific.includes(genus) : false)
    })
  })

  return partial ?? null
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = /data:(.*?);base64/.exec(header)
  const mime = mimeMatch?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], filename, { type: mime })
}

export function normalizeGender(value: string): 'male' | 'female' | 'unknown' {
  const lowered = value.toLowerCase()
  if (lowered === 'male') return 'male'
  if (lowered === 'female') return 'female'
  return 'unknown'
}

export function normalizeMaturation(value: string): 'mature' | 'immature' | 'unknown' {
  const lowered = value.toLowerCase()
  if (lowered === 'mature') return 'mature'
  if (lowered === 'immature') return 'immature'
  return 'unknown'
}

export function getConfidenceTone(confidence: number): { level: 'high' | 'medium' | 'low'; className: string } {
  if (confidence >= 0.8) {
    return { level: 'high', className: 'bg-green-100 text-green-700' }
  }
  if (confidence >= 0.5) {
    return { level: 'medium', className: 'bg-amber-100 text-amber-700' }
  }
  return { level: 'low', className: 'bg-red-100 text-red-700' }
}

export async function analyzeView(
  dataUrl: string,
  expectedView: PhotoView
): Promise<string[]> {
  try {
    const img = document.createElement('img')
    img.src = dataUrl
    await new Promise((resolve) => { img.onload = resolve })
    const aspectRatio = img.width / img.height
    const warnings: string[] = []

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

    return warnings
  } catch {
    return []
  }
}

export async function detectViewAI(
  file: File,
  expectedView: string
): Promise<ViewDetectionResult> {
  return api.detectView(file, expectedView)
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
