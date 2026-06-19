import { Router } from 'express'
import multer from 'multer'
import { uploadPhoto, getUploadUrlHandler, MAX_UPLOAD_SIZE } from '../controllers/uploadController'
import { authMiddleware, requireAuth, resolveUser } from '../middleware/auth'
import { uploadUrlSchema } from '../utils/schemas'
import { validate } from '../middleware/validation'

// CVE-2026-5079: Prevent DoS via deeply nested field names in multipart form data
// fieldNestingDepth limits nesting depth to prevent attackers from consuming excessive CPU/memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    // @ts-expect-error - fieldNestingDepth is available in multer 2.2.0+ but types haven't been updated
    fieldNestingDepth: 3,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

const router: Router = Router()

router.use(authMiddleware)
router.use(requireAuth)
router.use(resolveUser)

/**
 * @openapi
 * /api/upload/url:
 *   post:
 *     tags: [Upload]
 *     summary: Get a presigned upload URL for Azure Blob Storage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filename, contentType]
 *             properties:
 *               filename: { type: string }
 *               contentType: { type: string }
 *     responses:
 *       200:
 *         description: Presigned URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadUrl: { type: string }
 *                     blobUrl: { type: string }
 *       400:
 *         description: Validation failed
 */
router.post('/url', validate(uploadUrlSchema), getUploadUrlHandler)

/**
 * @openapi
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a photo file directly
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     url: { type: string }
 *                     filename: { type: string }
 *       400:
 *         description: Upload failed
 */
router.post('/', upload.single('file'), uploadPhoto)

export default router
