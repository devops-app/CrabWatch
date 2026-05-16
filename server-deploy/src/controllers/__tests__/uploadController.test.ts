const mockBlobService = {
  getContainerClient: jest.fn().mockReturnValue({
    getBlockBlobClient: jest.fn().mockReturnValue({
      generateSasUrl: jest.fn(),
      upload: jest.fn().mockResolvedValue(undefined),
      url: 'https://example.com/blob',
    }),
  }),
}

const mockRes = () => {
  const res: Record<string, unknown> = {}
  res.status = jest.fn().mockReturnThis()
  res.json = jest.fn()
  return res
}

jest.mock('../../services/upload', () => ({
  getBlobService: jest.fn(() => mockBlobService),
}))

import { getUploadUrlHandler, uploadPhoto } from '../../controllers/uploadController'
import { Response } from 'express'
import type { File as MulterFile } from 'multer'
import { AuthRequest } from '../../middleware/auth'

describe('Upload Controller', () => {
  let req: Partial<AuthRequest>
  let res: Record<string, unknown>

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      body: {},
      user: { uid: 'user-1', email: 'test@test.com' },
    }
    res = mockRes()
  })

  describe('getUploadUrlHandler', () => {
    it('should return upload URL with SAS token', async () => {
      mockBlobService.getContainerClient().getBlockBlobClient().generateSasUrl.mockResolvedValue(
        'https://example.com/blob?sig=token'
      )
      req.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' }

      await getUploadUrlHandler(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            uploadUrl: 'https://example.com/blob?sig=token',
            blobUrl: 'https://example.com/blob',
            fileName: expect.stringContaining('-photo.jpg'),
          }),
        })
      )
    })

    it('should return 400 when fileName is missing', async () => {
      req.body = { contentType: 'image/jpeg' }

      await getUploadUrlHandler(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'fileName and contentType are required',
        })
      )
    })

    it('should return 400 when contentType is missing', async () => {
      req.body = { fileName: 'photo.jpg' }

      await getUploadUrlHandler(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should sanitize filename', async () => {
      mockBlobService.getContainerClient().getBlockBlobClient().generateSasUrl.mockResolvedValue(
        'https://example.com/blob?sig=token'
      )
      req.body = { fileName: 'my photo (1).jpg', contentType: 'image/jpeg' }

      await getUploadUrlHandler(req as unknown as AuthRequest, res as unknown as Response)

      const fileName = (res.json as jest.Mock).mock.calls[0][0].data.fileName
      expect(fileName).not.toContain('my photo (1).jpg')
      expect(fileName).toContain('my')
      expect(fileName).toContain('photo')
      expect(fileName).toContain('jpg')
    })

    it('should return 500 on error', async () => {
      mockBlobService.getContainerClient().getBlockBlobClient().generateSasUrl.mockRejectedValue(
        new Error('Azure error')
      )
      req.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' }

      await getUploadUrlHandler(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('uploadPhoto', () => {
    it('should return error when file is missing', async () => {
      req.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' }

      await uploadPhoto(req as unknown as AuthRequest, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'file, fileName, and contentType are required',
        })
      )
    })

    it('should upload file to Azure Blob Storage', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image-data'),
        mimetype: 'image/jpeg',
      }
      req.file = mockFile as MulterFile
      req.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' }

      await uploadPhoto(req as unknown as AuthRequest, res as unknown as Response)

      expect(mockBlobService.getContainerClient().getBlockBlobClient().upload).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      )
    })
  })
})
