import { useEffect, useRef } from 'react'
import { useToast } from './ToastProvider'
import { api } from './api'
import { logger } from './logger'
import { useAuthStore } from './authStore'

interface MyStatsResponse {
  stats: {
    level: number
    title?: string
    currentStreak: number
    recentAchievements?: Array<{ code?: string; id: string }>
  }
}

export function useEngagementToasts() {
  const { addToast } = useToast()
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.user)
  const prevLevelRef = useRef<number | null>(null)
  const prevAchievementsRef = useRef<string[]>([])
  const prevStreakRef = useRef<number | null>(null)
  const initializedRef = useRef(false)
  const networkErrorLoggedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) return

    let timer: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const data = await api.getMyStats() as MyStatsResponse
        const stats = data.stats
        if (!stats) return

        if (!initializedRef.current) {
          prevLevelRef.current = stats.level ?? null
          prevAchievementsRef.current = (stats.recentAchievements || []).map((a) => a.code || a.id)
          prevStreakRef.current = stats.currentStreak ?? null
          initializedRef.current = true
          return
        }

        const currentLevel = stats.level ?? 0
        const currentStreak = stats.currentStreak ?? 0
        const achievementCodes = (stats.recentAchievements || []).map((a) => a.code || a.id)

        if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current) {
          addToast({
            type: 'levelup',
            title: `Level Up! You're now level ${currentLevel}`,
            message: stats.title ? `New title: ${stats.title}` : undefined,
            duration: 8000,
          })
        }

        const newAchievements = achievementCodes.filter(
          (code: string) => !prevAchievementsRef.current.includes(code)
        )
        if (newAchievements.length > 0) {
          addToast({
            type: 'achievement',
            title: `${newAchievements.length} Achievement Unlocked!`,
            message: `You've earned new achievement${newAchievements.length > 1 ? 's' : ''}`,
            duration: 8000,
          })
        }

        if (prevStreakRef.current !== null && currentStreak > prevStreakRef.current && currentStreak > 0) {
          addToast({
            type: 'success',
            title: `Streak: ${currentStreak} day${currentStreak > 1 ? 's' : ''}!`,
            message: 'Keep it going!',
            duration: 5000,
          })
        }

        prevLevelRef.current = currentLevel
        prevAchievementsRef.current = achievementCodes
        prevStreakRef.current = currentStreak
        networkErrorLoggedRef.current = false
      } catch (error) {
        if (error instanceof TypeError) {
          if (!networkErrorLoggedRef.current) {
            logger.warn('useEngagementToasts poll paused: API unreachable')
            networkErrorLoggedRef.current = true
          }
          return
        }
        logger.error('useEngagementToasts poll failed', error)
      }
    }

    poll()
    timer = setInterval(poll, 30000)

    return () => {
      if (timer) clearInterval(timer)
      initializedRef.current = false
    }
  }, [addToast, isAuthenticated])
}
