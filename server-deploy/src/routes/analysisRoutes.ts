import { Router } from 'express'
import multer from 'multer'
import { uploadAnalysisPhotosHandler, analyzeCrabHandler, detectViewHandler } from '../controllers/analysisController'
import { authMiddleware, requireAuth, resolveUser } from '../middleware/auth'
import { MAX_UPLOAD_SIZE } from '../controllers/uploadController'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, HEIC'))
    }
  },
})

const router: Router = Router()

router.use(authMiddleware)
router.use(requireAuth)
router.use(resolveUser)

router.post('/upload', upload.array('photos', 5), uploadAnalysisPhotosHandler)
router.post('/crab', analyzeCrabHandler)
router.post('/detect-view', upload.single('photo'), detectViewHandler)

export default router
