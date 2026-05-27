import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError } from '../utils/errors'
import { getConfig } from '../services/container'
import { createTranslator } from '../middleware/i18n'
import { getUserStats } from '../services/rewardEngine'
import { getLeaderboard, getXPHistory } from '../services/leaderboardService'

export const getMyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  if (!getConfig().engagement.enabled) {
    res.status(501).json({ success: false, error: __('engagement.notEnabled', 'engagement') })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new AppError(__('common.auth.required', 'common'), 401)
  }

  const stats = await getUserStats(userId)
  res.json({ success: true, data: { stats } })
})

export const getXPHistoryEndpoint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  if (!getConfig().engagement.enabled) {
    res.status(501).json({ success: false, error: __('engagement.notEnabled', 'engagement') })
    return
  }

  const userId = req.dbUser?.id
  if (!userId) {
    throw new AppError(__('common.auth.required', 'common'), 401)
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20

  const result = await getXPHistory(userId, page, limit)
  res.json({ success: true, data: result })
})

export const getLeaderboardEndpoint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const __ = createTranslator(req)
  if (!getConfig().engagement.enabled) {
    res.status(501).json({ success: false, error: __('engagement.notEnabled', 'engagement') })
    return
  }

  const scope = (req.query.scope as 'ALL_TIME' | 'SEASONAL') || 'ALL_TIME'
  const seasonId = req.query.seasonId as string | undefined
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 50
  const currentUserId = req.dbUser?.id

  const result = await getLeaderboard({
    scope,
    seasonId,
    page,
    limit,
    currentUserId,
  })

  res.json({ success: true, data: result })
})
