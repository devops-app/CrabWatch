'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import type { LeaderboardEntryDto } from '@crabwatch/shared'

interface LeaderboardEntry extends LeaderboardEntryDto {
  isMe: boolean
}

interface LeaderboardClientProps {
  initialEntries?: LeaderboardEntryDto[] | null
  initialTotalPages?: number | null
  initialScope?: 'ALL_TIME' | 'SEASONAL' | null
  initialPage?: number | null
  currentUserId?: string
  searchParamsPromise?: Promise<{ scope: 'ALL_TIME' | 'SEASONAL'; page: number }>
}

export function LeaderboardClient({
  initialEntries,
  initialTotalPages,
  initialScope,
  initialPage,
  currentUserId,
  searchParamsPromise,
}: LeaderboardClientProps): React.JSX.Element {
  const t = useTranslations('leaderboard')
  const resolvedScope = initialScope || searchParamsPromise ? '' : 'ALL_TIME'
  const [entries, setEntries] = useState<LeaderboardEntry[]>(
    (initialEntries ?? []).map(e => ({ ...e, isMe: e.userId === currentUserId }))
  )
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState<'ALL_TIME' | 'SEASONAL'>(resolvedScope || 'ALL_TIME')
  const [page, setPage] = useState(initialPage ?? 1)
  const [totalPages, setTotalPages] = useState(initialTotalPages ?? 1)
  const [currentUserIdState, setCurrentUserIdState] = useState<string | undefined>(currentUserId)

  useEffect(() => {
    if (searchParamsPromise && !initialScope) {
      searchParamsPromise.then(sp => {
        setScope(sp.scope)
        setPage(sp.page)
      })
    }
  }, [searchParamsPromise, initialScope])

  useEffect(() => {
    if (!currentUserId) {
      api.getProfile().then(p => setCurrentUserIdState(p.id)).catch(() => {})
    }
  }, [currentUserId])

  const loadLeaderboard = useCallback(async (currentPage: number, signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await api.getLeaderboard({
        scope,
        page: currentPage,
        limit: 50,
        signal,
      }) as { items: LeaderboardEntryDto[]; total: number; limit: number }
      const userId = currentUserIdState
      setEntries((data.items || []).map(e => ({ ...e, isMe: e.userId === userId })))
      setTotalPages(data.total ? Math.ceil(data.total / (data.limit || 50)) : 1)
    } catch {
      logger.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [scope, currentUserIdState])

  useEffect(() => {
    if (!scope) return
    const controller = new AbortController()
    loadLeaderboard(page, controller.signal)
    return () => controller.abort()
  }, [scope, page, loadLeaderboard])

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-ocean-900">{t('title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setScope('ALL_TIME')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              scope === 'ALL_TIME'
                ? 'bg-ocean-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('allTime')}
          </button>
          <button
            onClick={() => setScope('SEASONAL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              scope === 'SEASONAL'
                ? 'bg-ocean-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('seasonal')}
          </button>
        </div>
      </div>

      {(loading && entries.length === 0) ? (
        <div className="card">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 animate-pulse border-b border-gray-100 last:border-0">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg">{t('empty')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
               <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium w-16">{t('rank')}</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">{t('researcher')}</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">{t('level')}</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">XP</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">{t('approved')}</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">{t('streak')}</th>
                  </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      entry.isMe ? 'bg-ocean-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full">
                        {entry.rank === 1 ? (
                          <span className="text-xl">🥇</span>
                        ) : entry.rank === 2 ? (
                          <span className="text-xl">🥈</span>
                        ) : entry.rank === 3 ? (
                          <span className="text-xl">🥉</span>
                        ) : (
                          <span className="text-sm font-bold text-gray-400">{entry.rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-ocean-800">
                        {entry.name}
                        {entry.isMe && (
                          <span className="ml-2 text-xs text-ocean-600 bg-ocean-100 px-2 py-0.5 rounded-full">
                            {t('you')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{entry.title}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-ocean-100 text-ocean-800 rounded-full text-sm font-medium">
                        {t('levelPrefix')}{entry.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-ocean-700">
                      {entry.totalXP.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{entry.approvedCount}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {entry.currentStreak > 0 ? (
                        <span className="text-orange-600 font-medium">
                          🔥 {entry.currentStreak}{t('streakSuffix')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                {t('previous')}
              </button>
              <span className="text-sm text-gray-600">
                {t('pageOf', { page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                {t('next')}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
