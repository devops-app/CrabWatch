'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/lib/authStore'
import { LeaderboardEntryDto } from '@crabwatch/shared'

interface LeaderboardEntry extends LeaderboardEntryDto {
  isMe: boolean
}

export default function LeaderboardPage(): React.JSX.Element {
  const { user } = useAuthStore()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'ALL_TIME' | 'SEASONAL'>('ALL_TIME')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadLeaderboard()
  }, [scope, page])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const data = await api.getLeaderboard({ scope, page, limit: 50 }) as { entries: LeaderboardEntryDto[]; totalPages: number }
      const userId = user?.id
      setEntries((data.entries || []).map(e => ({ ...e, isMe: e.userId === userId })))
      setTotalPages(data.totalPages || 1)
    } catch {
      logger.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-ocean-900">Leaderboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setScope('ALL_TIME')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              scope === 'ALL_TIME'
                ? 'bg-ocean-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setScope('SEASONAL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              scope === 'SEASONAL'
                ? 'bg-ocean-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Seasonal
          </button>
        </div>
      </div>

      {loading ? (
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
          <p className="text-gray-400 text-lg">No entries yet</p>
          <p className="text-gray-400 text-sm mt-2">Submit your first observation to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium w-16">Rank</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Researcher</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Level</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">XP</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Approved</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Streak</th>
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
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{entry.title}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-ocean-100 text-ocean-800 rounded-full text-sm font-medium">
                        Lv.{entry.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-ocean-700">
                      {entry.totalXP.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{entry.approvedCount}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {entry.currentStreak > 0 ? (
                        <span className="text-orange-600 font-medium">
                          🔥 {entry.currentStreak}d
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
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
