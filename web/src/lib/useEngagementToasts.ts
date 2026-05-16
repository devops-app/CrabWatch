import { useEffect, useRef } from 'react'
import { useToast } from './ToastProvider'
import { api } from './api'

export function useEngagementToasts() {
  const { addToast } = useToast()
  const prevLevelRef = useRef<number | null>(null)
  const prevAchievementsRef = useRef<string[]>([])
  const prevStreakRef = useRef<number | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const data: any = await api.getMyStats()
        const stats = data.stats
        if (!stats) return

        if (!initializedRef.current) {
          prevLevelRef.current = stats.level ?? null
          prevAchievementsRef.current = (stats.recentAchievements || []).map((a: any) => a.code || a.id)
          prevStreakRef.current = stats.currentStreak ?? null
          initializedRef.current = true
          return
        }

        const currentLevel = stats.level ?? 0
        const currentStreak = stats.currentStreak ?? 0
        const achievementCodes = (stats.recentAchievements || []).map((a: any) => a.code || a.id)

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
      } catch {
        // Gamification may not be enabled
      }
    }

    poll()
    timer = setInterval(poll, 30000)

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [addToast])
}
