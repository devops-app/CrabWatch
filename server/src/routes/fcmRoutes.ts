import { Router } from 'express'
import {
  registerFcmToken,
  unregisterFcmToken,
  notifyObservationApproved,
  notifyObservationRejected,
  notifyNewSpecies,
} from '../controllers/fcmController'
import { authMiddleware, requireAuth, resolveUser, requireRole } from '../middleware/auth'

const router: Router = Router()

router.use(authMiddleware)

router.post('/register', requireAuth, resolveUser, registerFcmToken)
router.delete('/register', requireAuth, resolveUser, unregisterFcmToken)

router.post('/notify/approved', requireAuth, resolveUser, requireRole('ADMIN', 'RESEARCHER'), notifyObservationApproved)
router.post('/notify/rejected', requireAuth, resolveUser, requireRole('ADMIN', 'RESEARCHER'), notifyObservationRejected)
router.post('/notify/new-species', requireAuth, resolveUser, requireRole('ADMIN'), notifyNewSpecies)

export default router
