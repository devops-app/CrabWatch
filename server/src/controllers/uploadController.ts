import { Response } from 'express'
import { BlobSASPermissions } from '@azure/storage-blob'
import { AuthRequest } from '../middleware/auth'
import { randomUUID } from 'crypto'
import { asyncHandler, AppError } from '../utils/errors'
import { createTranslator } from '../middleware/i18n'
import { getBlobService } from '../services/upload'
import { sanitizeInput } from '../utils/sanitize'
import { buildObservationBlobPath } from '../utils/blobPath'

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

export const getUploadUrlHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  const { fileName, contentType, sessionId, photoIndex } = req.body
  if (!fileName || !contentType) {
    throw new AppError(__('upload.fileNameContentTypeRequired', 'upload'), 400)
  }

  const dbUser = req.dbUser
  const safeContentType = sanitizeInput(contentType, 50)
  if (!ALLOWED_CONTENT_TYPES.includes(safeContentType)) {
    throw new AppError(__('upload.invalidFileType', 'upload'), 400)
  }

  const blobPath = sessionId
    ? buildObservationBlobPath(dbUser?.id || 'anon', sessionId, photoIndex ?? 0, fileName, safeContentType)
    : `${dbUser?.id || 'anon'}/${randomUUID()}-${sanitizeInput(fileName, 100).replace(/[^a-zA-Z0-9._-]/g, '')}`

  const service = getBlobService()
  const containerClient = service.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  )
  const blobClient = containerClient.getBlockBlobClient(blobPath)

  const sasUrl = await blobClient.generateSasUrl({
    expiresOn: new Date(Date.now() + 15 * 60 * 1000),
    permissions: 'w' as unknown as BlobSASPermissions,
  })

  const readSasUrl = await blobClient.generateSasUrl({
    expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    permissions: 'r' as unknown as BlobSASPermissions,
  })

  res.json({
    success: true,
    data: {
      uploadUrl: sasUrl,
      blobUrl: blobClient.url,
      readUrl: readSasUrl,
      fileName: blobPath,
    },
  })
})

export const uploadPhoto = asyncHandler(async (req: AuthRequest & { file?: MulterFile }, res: Response) => {
  const __ = createTranslator(req)
  const file = req.file
  const fileName = req.body.fileName
  const contentType = req.body.contentType || file?.mimetype
  const { sessionId, photoIndex } = req.body

  if (!file || !fileName || !contentType) {
    throw new AppError(__('upload.fileRequired', 'upload'), 400)
  }

  const dbUser = req.dbUser
  const safeContentType = sanitizeInput(contentType, 50)
  if (!ALLOWED_CONTENT_TYPES.includes(safeContentType)) {
    throw new AppError(__('upload.invalidFileType', 'upload'), 400)
  }

  const fileBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer)
  if (fileBuffer.length > MAX_UPLOAD_SIZE) {
    throw new AppError(__('upload.fileTooLarge', 'upload', { maxSize: MAX_UPLOAD_SIZE / 1024 / 1024 }), 400)
  }

  const blobPath = sessionId
    ? buildObservationBlobPath(dbUser?.id || 'anon', sessionId, photoIndex ?? 0, fileName, safeContentType)
    : `${dbUser?.id || 'anon'}/${randomUUID()}-${sanitizeInput(fileName, 100).replace(/[^a-zA-Z0-9._-]/g, '')}`

  const service = getBlobService()
  const containerClient = service.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  )
  const blobClient = containerClient.getBlockBlobClient(blobPath)

  await blobClient.upload(fileBuffer, fileBuffer.length, {
    blobHTTPHeaders: { blobContentType: safeContentType },
  })

  const readSasUrl = await blobClient.generateSasUrl({
    expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    permissions: 'r' as unknown as BlobSASPermissions,
  })

  res.json({
    success: true,
    data: {
      blobUrl: blobClient.url,
      readUrl: readSasUrl,
      fileName: blobPath,
    },
  })
})
