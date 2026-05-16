import { Response } from 'express'
import { BlobSASPermissions } from '@azure/storage-blob'
import { AuthRequest } from '../middleware/auth'
import { randomUUID } from 'crypto'
import { getBlobService } from '../services/upload'
import { sanitizeInput } from '../utils/sanitize'

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function getUploadUrlHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fileName, contentType } = req.body
    if (!fileName || !contentType) {
      res.status(400).json({ success: false, error: 'fileName and contentType are required' })
      return
    }

    const dbUser = req.dbUser
    const safeContentType = sanitizeInput(contentType, 50)
    if (!ALLOWED_CONTENT_TYPES.includes(safeContentType)) {
      res.status(400).json({ success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP' })
      return
    }

    const safeFileName = `${dbUser?.id || 'anon'}/${randomUUID()}-${sanitizeInput(fileName, 100).replace(/[^a-zA-Z0-9._-]/g, '')}`
    const service = getBlobService()
    const containerClient = service.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
    )
    const blobClient = containerClient.getBlockBlobClient(safeFileName)

    const sasUrl = await blobClient.generateSasUrl({
      expiresOn: new Date(Date.now() + 15 * 60 * 1000),
      permissions: 'w' as unknown as BlobSASPermissions,
    })

    res.json({
      success: true,
      data: {
        uploadUrl: sasUrl,
        blobUrl: blobClient.url,
        fileName: safeFileName,
      },
    })
  } catch (error: unknown) {
    console.error('Get upload URL error:', error)
    res.status(500).json({ success: false, error: 'Failed to generate upload URL' })
  }
}

export async function uploadPhoto(req: AuthRequest & { file?: MulterFile }, res: Response): Promise<void> {
  try {
    const file = req.file
    const fileName = req.body.fileName
    const contentType = req.body.contentType || file?.mimetype

    if (!file || !fileName || !contentType) {
      res.status(400).json({ success: false, error: 'file, fileName, and contentType are required' })
      return
    }

    const dbUser = req.dbUser
    const safeContentType = sanitizeInput(contentType, 50)
    if (!ALLOWED_CONTENT_TYPES.includes(safeContentType)) {
      res.status(400).json({ success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP' })
      return
    }

    const fileBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer)
    if (fileBuffer.length > MAX_UPLOAD_SIZE) {
      res.status(400).json({ success: false, error: `File too large. Maximum size: ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` })
      return
    }

    const safeFileName = `${dbUser?.id || 'anon'}/${randomUUID()}-${sanitizeInput(fileName, 100).replace(/[^a-zA-Z0-9._-]/g, '')}`
    const service = getBlobService()
    const containerClient = service.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
    )
    const blobClient = containerClient.getBlockBlobClient(safeFileName)

    await blobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: { blobContentType: safeContentType },
    })

    res.json({
      success: true,
      data: {
        blobUrl: blobClient.url,
        fileName: safeFileName,
      },
    })
  } catch (error: unknown) {
    console.error('Direct upload error:', error)
    res.status(500).json({ success: false, error: 'Failed to upload file' })
  }
}
