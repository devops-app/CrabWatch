import { Router } from 'express'
import {
  registerFcmToken,
  unregisterFcmToken,
  notifyObservationApproved,
  notifyObservationRejected,
  notifyNewSpecies,
} from '../controllers/fcmController'
import { authMiddleware, requireAuth, resolveUser, requireRole } from '../middleware/auth'
import { registerFcmTokenSchema, notifyFcmSchema } from '../utils/schemas'
import { validate } from '../middleware/validation'

const router: Router = Router()

router.use(authMiddleware)

router.post('/register', requireAuth, resolveUser, validate(registerFcmTokenSchema), registerFcmToken)
router.delete('/register', requireAuth, resolveUser, unregisterFcmToken)

router.post('/notify/approved', requireAuth, resolveUser, requireRole('ADMIN', 'RESEARCHER'), validate(notifyFcmSchema), notifyObservationApproved)
router.post('/notify/rejected', requireAuth, resolveUser, requireRole('ADMIN', 'RESEARCHER'), validate(notifyFcmSchema), notifyObservationRejected)
router.post('/notify/new-species', requireAuth, resolveUser, requireRole('ADMIN'), notifyNewSpecies)

export default router
