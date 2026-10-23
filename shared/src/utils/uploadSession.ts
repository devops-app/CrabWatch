/**
 * Generate a unique upload session id (UUID v4) for correlating uploaded
 * analysis blobs with the observation record that consumes them.
 *
 * Uses `crypto.randomUUID()` when available (all modern browsers and Node 19+),
 * falling back to a manual v4 construction from `crypto.getRandomValues` for
 * older runtimes. Shared by web and mobile so both platforms produce
 * identically-shaped session ids.
 */
export function createUploadSessionId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) return randomUuid

  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
