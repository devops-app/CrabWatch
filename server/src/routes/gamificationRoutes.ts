import { Router } from 'express'
import { authMiddleware, requireAuth, resolveUser } from '../middleware/auth'
import { getMyStats, getXPHistoryEndpoint, getLeaderboardEndpoint } from '../controllers/gamificationController'

const router = Router()

router.use(authMiddleware)
router.use(requireAuth)
router.use(resolveUser)

router.get('/stats/me', getMyStats)
router.get('/xp-history', getXPHistoryEndpoint)
router.get('/leaderboard', getLeaderboardEndpoint)

export default router
