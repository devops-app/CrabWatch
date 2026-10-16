/**
 * Base64 decoding for the React Native runtime.
 *
 * Neither `atob` nor `Buffer` is reliably available under Hermes, so this
 * module provides a pure-JS decoder as the final fallback. It is used by the
 * image quality gate (photoService) and view analysis (viewAnalysis), which
 * both need to turn a base64 JPEG payload into raw bytes for pixel sampling.
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * Decode a base64 string to a Uint8Array using only pure JavaScript.
 * Handles standard base64 with `+`/`/` and `=` padding, and ignores
 * whitespace. Returns an empty array for empty/invalid input.
 */
export function base64DecodePureJs(base64: string): Uint8Array {
  const clean = base64.replace(/[\r\n\s]/g, '')
  const len = clean.length
  if (len === 0) return new Uint8Array(0)

  // Upper bound on output length (3 bytes per 4 base64 chars).
  const bytes = new Uint8Array(Math.floor((len * 3) / 4))
  let out = 0

  for (let i = 0; i < len; i += 4) {
    const c1 = BASE64_CHARS.indexOf(clean[i])
    const c2 = BASE64_CHARS.indexOf(clean[i + 1])
    if (c1 === -1 || c2 === -1) break

    const c3 = clean[i + 2] === '=' ? -1 : BASE64_CHARS.indexOf(clean[i + 2])
    const c4 = clean[i + 3] === '=' ? -1 : BASE64_CHARS.indexOf(clean[i + 3])

    bytes[out++] = (c1 << 2) | (c2 >> 4)
    if (c3 !== -1) {
      bytes[out++] = ((c2 & 15) << 4) | (c3 >> 2)
      if (c4 !== -1) {
        bytes[out++] = ((c3 & 3) << 6) | c4
      }
    }
  }

  return out === bytes.length ? bytes : bytes.subarray(0, out)
}

/**
 * Decode a base64 string to a Uint8Array, preferring the native `atob` or
 * Node `Buffer` when present and falling back to the pure-JS decoder.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
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

  return base64DecodePureJs(base64)
}
