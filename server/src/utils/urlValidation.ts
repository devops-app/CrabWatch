import { getConfig } from '../services/container'

/**
 * Decide whether an image URL is safe to load/render.
 *
 * Security model:
 *  - `data:` URLs are only ever used for in-memory image previews (e.g. the AI
 *    analysis pipeline). They are restricted to image MIME types and a hard
 *    length cap so a malicious or oversized `data:` payload (e.g.
 *    `data:text/html` or a 200 MB base64 blob) can't be smuggled through.
 *  - Remote URLs must match the **exact** blob origin derived from the
 *    configured `BlobEndpoint` (no domain-suffix match, so
 *    `evil.blob.core.windows.net` is rejected) and must live inside the
 *    configured upload container.
 *
 * The origin + container prefix are derived from the existing
 * `AZURE_STORAGE_CONNECTION_STRING`, so this works for both the production
 * Azure account and local Azurite (dev) without any extra configuration.
 */

// data: URLs should only ever be local image previews — keep the cap generous
// enough for the 10 MB upload limit (~13.3 MB base64) but bounded.
const MAX_DATA_URL_LENGTH = 20 * 1024 * 1024
const DATA_IMAGE_RE = /^data:image\/(?:jpeg|png|webp|heic);base64,/

interface BlobBase {
  origin: string
  pathPrefix: string
}

let cachedBlobBase: BlobBase | null | undefined

function getBlobBase(): BlobBase | null {
  if (cachedBlobBase !== undefined) return cachedBlobBase

  const cs = getConfig().azureStorage.connectionString
  if (!cs) {
    cachedBlobBase = null
    return null
  }

  const match = cs.match(/BlobEndpoint=([^;]+)/i)
  if (!match) {
    cachedBlobBase = null
    return null
  }

  let endpoint: URL
  try {
    endpoint = new URL(match[1])
  } catch {
    cachedBlobBase = null
    return null
  }

  // BlobEndpoint pathname is `/` for a real Azure account but
  // `/<account>` for Azurite. The container always follows it.
  const base = endpoint.pathname.replace(/\/+$/, '')
  const pathPrefix = `${base}/${getConfig().azureStorage.containerName}/`

  cachedBlobBase = { origin: endpoint.origin, pathPrefix }
  return cachedBlobBase
}

export function isSafeImageUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false

  // data: URLs — allow only image types with a length cap.
  if (url.startsWith('data:')) {
    return url.length <= MAX_DATA_URL_LENGTH && DATA_IMAGE_RE.test(url)
  }

  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }

  // No embedded credentials for blob URLs.
  if (u.username || u.password) return false

  const base = getBlobBase()
  if (!base) return false

  // Exact origin match (no suffix) + must be inside the upload container.
  return u.origin === base.origin && u.pathname.startsWith(base.pathPrefix)
}
