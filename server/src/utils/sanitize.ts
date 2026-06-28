import path from 'path'

export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input) return ''
  const stripped = input.replace(/<[^>]*>/g, '').replace(/\0/g, '')
  return stripped.slice(0, maxLength).trim()
}

export function sanitizeFilename(fileName: string): string {
  const base = path.basename(fileName)
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!sanitized || sanitized.startsWith('.')) {
    throw new Error('Invalid filename')
  }
  return sanitized
}

export function sanitizeText(text: string | undefined | null): string | null {
  if (!text) return null
  return sanitizeInput(text, 500)
}

export function sanitizeHtml(text: string | undefined | null): string | null {
  if (!text) return null
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
