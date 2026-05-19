import { sanitizeInput } from './sanitize'

function inferExtensionFromContentType(contentType?: string): string {
  if (!contentType) return '.jpg'

  const normalized = contentType.toLowerCase()
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return '.jpg'
  if (normalized === 'image/png') return '.png'
  if (normalized === 'image/webp') return '.webp'
  if (normalized === 'image/heic' || normalized === 'image/heif') return '.heic'

  return '.jpg'
}

function normalizeExtension(fileName: string, contentType?: string): string {
  const safeName = sanitizeInput(fileName, 100).replace(/[^a-zA-Z0-9._-]/g, '')
  const hasDot = safeName.includes('.')
  const ext = hasDot ? safeName.slice(safeName.lastIndexOf('.')).toLowerCase() : ''

  if (ext && /^\.[a-z0-9]{2,6}$/.test(ext)) {
    return ext
  }

  return inferExtensionFromContentType(contentType)
}

export function buildObservationBlobPath(
  userId: string,
  sessionId: string,
  photoIndex: number,
  fileName: string,
  contentType?: string
): string {
  const dateStr = new Date().toISOString().slice(0, 10)
  const ext = normalizeExtension(fileName, contentType)
  return `observations/${userId}/${dateStr}/${sessionId}-${photoIndex}${ext}`
}
