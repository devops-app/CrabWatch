'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import type { UserAchievementListDto, CheckAchievementsResponseDto } from '@crabwatch/shared'

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'bg-gray-100 text-gray-700 border-gray-200',
  UNCOMMON: 'bg-green-100 text-green-700 border-green-200',
  RARE: 'bg-blue-100 text-blue-700 border-blue-200',
  EPIC: 'bg-purple-100 text-purple-700 border-purple-200',
  LEGENDARY: 'bg-amber-100 text-amber-700 border-amber-200',
}

const RARITY_GLOW: Record<string, string> = {
  COMMON: '',
  UNCOMMON: '',
  RARE: 'shadow-blue-200',
  EPIC: 'shadow-purple-200',
  LEGENDARY: 'shadow-amber-200 shadow-lg',
}

const CATEGORY_ICONS: Record<string, string> = {
  OBSERVATION: '🦀',
  SPECIES: '🔬',
  EXPLORATION: '🌊',
  QUALITY: '⭐',
  HIDDEN: '🔮',
}

const CATEGORIES = ['ALL', 'OBSERVATION', 'SPECIES', 'EXPLORATION', 'QUALITY', 'HIDDEN'] as const

interface AchievementsClientProps {
  initialAchievements?: UserAchievementListDto[] | null
}

export function AchievementsClient({
  initialAchievements,
}: AchievementsClientProps): React.JSX.Element {
  const [achievements, setAchievements] = useState<UserAchievementListDto[]>(initialAchievements ?? [])
  const [loading, setLoading] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'in_progress'>('all')
  const [toast, setToast] = useState<string | null>(null)

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length
  const totalCount = achievements.length

  const loadAchievements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getAchievements()
      setAchievements(res)
    } catch (err) {
      logger.error('Failed to load achievements', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialAchievements) return
    loadAchievements()
  }, [initialAchievements, loadAchievements])

  const checkAchievements = useCallback(async () => {
    try {
      const res = await api.checkAchievements() as CheckAchievementsResponseDto
      if (res.newlyUnlocked.length > 0) {
        setToast(`🎉 Unlocked: ${res.newlyUnlocked.join(', ')}`)
        setTimeout(() => setToast(null), 4000)
        loadAchievements()
      }
    } catch (err) {
      logger.error('Failed to check achievements', err)
    }
  }, [loadAchievements])

  useEffect(() => {
    if (achievements.length === 0) {
      loadAchievements()
    }
  }, [loadAchievements, achievements.length])

  const filtered: UserAchievementListDto[] = Array.isArray(achievements)
    ? achievements.filter((a) => {
        if (filterCategory !== 'ALL' && a.category !== filterCategory) return false
        if (filterStatus === 'unlocked' && !a.isUnlocked) return false
        if (filterStatus === 'in_progress' && a.isUnlocked) return false
        return true
      })
    : []

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ocean-900">Achievements</h1>
          <p className="text-ocean-500 mt-1">
            {unlockedCount} of {totalCount} unlocked
          </p>
        </div>
        <button
          onClick={checkAchievements}
          className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors text-sm font-medium"
        >
          Check Progress
        </button>
      </div>

      <div className="mb-6 bg-white rounded-xl p-4 border border-ocean-100 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ocean-700">Overall Progress</span>
          <span className="text-sm text-ocean-500">
            {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-ocean-100 rounded-full h-3">
          <div
            className="bg-ocean-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ocean-500 uppercase">Category</label>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterCategory === cat
                    ? 'bg-ocean-600 text-white'
                    : 'bg-white text-ocean-600 border border-ocean-200 hover:bg-ocean-50'
                }`}
              >
                {cat === 'ALL' ? 'All' : `${CATEGORY_ICONS[cat] || '📌'} ${cat}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ocean-500 uppercase">Status</label>
          <div className="flex gap-2">
            {(['all', 'unlocked', 'in_progress'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-ocean-600 text-white'
                    : 'bg-white text-ocean-600 border border-ocean-200 hover:bg-ocean-50'
                }`}
              >
                {status === 'all' ? 'All' : status === 'unlocked' ? '✓ Unlocked' : '🔄 In Progress'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && achievements.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-ocean-400">
          <p className="text-lg">No achievements match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div
              key={a.achievementId}
              className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                a.isUnlocked
                  ? `border-ocean-200 ${RARITY_GLOW[a.rarity] || ''}`
                  : 'border-ocean-100 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                    a.isUnlocked ? 'bg-ocean-100' : 'bg-ocean-50'
                  }`}
                >
                  {a.isUnlocked ? '🏆' : CATEGORY_ICONS[a.category] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-ocean-900 truncate">{a.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        RARITY_COLORS[a.rarity] || 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {a.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-ocean-500 line-clamp-2">{a.description}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-ocean-400">
                <span>+{a.xpReward} XP</span>
                {a.isUnlocked && a.earnedAt && (
                  <span>
                    Earned {new Date(a.earnedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {!a.isUnlocked && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-ocean-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {Math.min(a.progress, a.target)}/{a.target}
                    </span>
                  </div>
                  <div className="w-full bg-ocean-100 rounded-full h-2">
                    <div
                      className="bg-ocean-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${a.target > 0 ? Math.min((a.progress / a.target) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {a.isUnlocked && (
                <div className="mt-3">
                  <div className="w-full bg-ocean-100 rounded-full h-2">
                    <div className="bg-ocean-500 h-2 rounded-full w-full" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
