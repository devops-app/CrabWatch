import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { getUserStats } from '../services/rewardEngine'
import { getLeaderboard, getXPHistory } from '../services/leaderboardService'
import { config } from '../config'

export async function getMyStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }

  try {
    const userId = req.dbUser?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const stats = await getUserStats(userId)
    res.json({ success: true, data: { stats } })
  } catch (error) {
    next(error)
  }
}

export async function getXPHistoryEndpoint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }

  try {
    const userId = req.dbUser?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await getXPHistory(userId, page, limit)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function getLeaderboardEndpoint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!config.engagement.enabled) {
    res.status(501).json({ success: false, error: 'Gamification not enabled' })
    return
  }

  try {
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
  } catch (error) {
    next(error)
  }
}
