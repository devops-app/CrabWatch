// Azure Blob Storage I/O for the Foundry analysis flow: photo upload, SAS
// generation, best-effort cleanup, and copying analysis blobs into the
// permanent observation folder.
import { randomUUID } from 'crypto'
import { isSafeImageUrl } from '../../utils/urlValidation'
import { BlobSASPermissions, BlockBlobClient } from '@azure/storage-blob'
import { getBlobService } from '../upload'
import { buildAnalysisBlobPath } from '../../utils/blobPath'
import logger from '../../utils/logger'

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

/**
 * Convert an image URL (or data URL) into a base64 data URL for the agent.
 * Remote URLs are validated against SSRF rules and fetched with a 12s timeout.
 */
export async function toDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }
  if (!isSafeImageUrl(imageUrl)) {
    throw new Error(`Blocked unsafe image URL: ${imageUrl.slice(0, 100)}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(imageUrl, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis image fetch timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function uploadAnalysisPhotos(
  files: MulterFile[],
  options?: {
    userId?: string
    sessionId?: string
  }
): Promise<string[]> {
  if (!files || files.length === 0) {
    throw new Error('No files provided')
  }

  const service = getBlobService()
  const containerClient = service.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  )

  const blobUrls: string[] = []
  const userId = options?.userId || 'anon'
  const sessionId = options?.sessionId || randomUUID()

  for (const [index, file] of files.entries()) {
    if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}`)
    }

    const blobPath = buildAnalysisBlobPath(userId, sessionId, index, file.originalname, file.mimetype)
    const blobClient = containerClient.getBlockBlobClient(blobPath)

    await blobClient.upload(file.buffer, file.buffer.length, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    })

    const readSasUrl = await blobClient.generateSasUrl({
      startsOn: new Date(Date.now() - 2 * 60 * 1000),
      expiresOn: new Date(Date.now() + 60 * 60 * 1000),
      permissions: BlobSASPermissions.parse('r'),
    })

    blobUrls.push(readSasUrl)
  }

  return blobUrls
}

export async function cleanupAnalysisBlobs(blobUrls: string[]): Promise<void> {
  const service = getBlobService()
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'

  for (const url of blobUrls) {
    try {
      const blobName = extractBlobName(url, containerName)
      if (blobName) {
        const containerClient = service.getContainerClient(containerName)
        const blockBlobClient = containerClient.getBlockBlobClient(blobName)
        await blockBlobClient.delete()
      }
    } catch {
      // Best effort cleanup - don't fail if cleanup fails
    }
  }
}

export interface BlobCopyResult {
  /** New SAS URLs for the observation (may include original URLs for failed copies) */
  observationUrls: string[]
  /** Original analysis blob URLs that were successfully copied and can be safely cleaned up */
  cleanedUpUrls: string[]
}

async function downloadBlobWithRetry(
  sourceBlobClient: BlockBlobClient,
  maxRetries: number = 2
): Promise<Buffer> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const download = await sourceBlobClient.download()
      const chunks: Buffer[] = []
      for await (const chunk of download.readableStreamBody!) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      return Buffer.concat(chunks)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000
        logger.warn(
          { attempt, maxRetries, delayMs: delay, error: lastError.message },
          'copyAnalysisBlobsToObservation: download retry'
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError || new Error('Download failed after retries')
}

export async function copyAnalysisBlobsToObservation(
  blobUrls: string[],
  userId: string,
  observationId: string
): Promise<BlobCopyResult> {
  const service = getBlobService()
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  const containerClient = service.getContainerClient(containerName)

  const observationUrls: string[] = []
  const cleanedUpUrls: string[] = []

  for (const url of blobUrls) {
    try {
      const sourceBlobName = extractBlobName(url, containerName)
      if (!sourceBlobName) {
        observationUrls.push(url)
        continue
      }

      const dateStr = new Date().toISOString().slice(0, 10)
      const ext = sourceBlobName.split('.').pop() || 'jpg'
      const destBlobName = `observations/${userId}/${dateStr}/${observationId}-${observationUrls.length}.${ext}`

      const sourceBlobClient = containerClient.getBlockBlobClient(sourceBlobName)
      const destBlobClient = containerClient.getBlockBlobClient(destBlobName)

      const buffer = await downloadBlobWithRetry(sourceBlobClient)

      const extToType: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' }
      const contentType = extToType[ext.toLowerCase()] || 'image/jpeg'

      await destBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      })

      const sasUrl = await destBlobClient.generateSasUrl({
        startsOn: new Date(Date.now() - 2 * 60 * 1000),
        expiresOn: new Date(Date.now() + 60 * 60 * 1000),
        permissions: BlobSASPermissions.parse('r'),
      })

      observationUrls.push(sasUrl)
      cleanedUpUrls.push(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.warn(
        { sourceUrl: url, userId, observationId, error: errorMessage },
        'copyAnalysisBlobsToObservation: copy failed — falling back to original /analysis/ URL'
      )
      observationUrls.push(url)
    }
  }

  return { observationUrls, cleanedUpUrls }
}

function extractBlobName(url: string, containerName: string): string | null {
  try {
    const parsed = new URL(url)
    const marker = `/${containerName}/`
    const idx = parsed.pathname.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length))
  } catch {
    const marker = `${containerName}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    const tail = url.slice(idx + marker.length)
    return tail.split('?')[0] || null
  }
}
