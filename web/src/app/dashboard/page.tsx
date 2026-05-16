'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/authStore'
import { DashboardStats, ObservationResponse } from '@crabwatch/shared'
import Link from 'next/link'

export default function DashboardPage(): React.JSX.Element {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<ObservationResponse[]>([])
  const [myStats, setMyStats] = useState<any>(null)
  const [missions, setMissions] = useState<any[]>([])
  const [onboarding, setOnboarding] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])
  const [xpFeed, setXpFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadStats(), loadRecent(), loadMyStats(), loadMissions(), loadOnboarding(), loadInsights(), loadXpFeed()])
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats()
      setStats(data)
    } catch {
      console.error('Failed to load stats')
    }
  }

  const loadRecent = async () => {
    try {
      const data = await api.listObservations({ limit: 5 })
      setRecent(data.observations)
    } catch {
      console.error('Failed to load recent observations')
    }
  }

  const loadMyStats = async () => {
    try {
      const data = await api.getMyStats()
      setMyStats(data.stats)
    } catch {
      // Gamification may not be enabled
    }
  }

  const loadMissions = async () => {
    try {
      const data: any = await api.getActiveMissions()
      setMissions(Array.isArray(data) ? data : [])
    } catch {
      // Gamification may not be enabled
    }
  }

  const loadOnboarding = async () => {
    try {
      const data: any = await api.getOnboardingStatus()
      setOnboarding(data)
    } catch {
      // Gamification may not be enabled
    }
  }

  const loadInsights = async () => {
    try {
      const data: any = await api.getInsights()
      setInsights(Array.isArray(data) ? data : [])
    } catch {
      // Gamification may not be enabled
    }
  }

  const loadXpFeed = async () => {
    try {
      const data: any = await api.getXPHistory({ limit: 10 })
      setXpFeed(Array.isArray(data) ? data : [])
    } catch {
      // Gamification may not be enabled
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded-full mb-2" />
              <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
              <div className="h-6 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.totalObservations ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Total Observations
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-mangrove-600">
              {stats?.approvedObservations ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Approved
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-amber-600">
              {stats?.pendingObservations ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Pending Review
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.totalSpecies ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Species Recorded
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.totalContributors ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Contributors
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.statesCovered ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              States Covered
            </div>
          </div>
        </div>
      )}

      {/* Engagement Stats */}
      {myStats && (
        <div className="card mb-8 bg-gradient-to-r from-ocean-50 to-amber-50 border border-ocean-200">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">Your Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-ocean-600">Lv.{myStats.level}</div>
              <div className="text-sm text-gray-500 mt-1">{myStats.title}</div>
              <div className="text-xs text-gray-400 mt-1">
                {myStats.totalXP.toLocaleString()} XP / {myStats.xpToNextLevel.toLocaleString()} to next
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-ocean-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (myStats.totalXP / myStats.xpToNextLevel) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">🔥 {myStats.currentStreak}</div>
              <div className="text-sm text-gray-500 mt-1">Day Streak</div>
              <div className="text-xs text-gray-400 mt-1">
                Best: {myStats.longestStreak}d
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{myStats.approvedCount}</div>
              <div className="text-sm text-gray-500 mt-1">Approved</div>
              <div className="text-xs text-gray-400 mt-1">
                {myStats.totalSubmissions} total submissions
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/dashboard/leaderboard"
                className="text-ocean-600 hover:underline text-sm font-medium"
              >
                View Leaderboard →
              </Link>
              <div className="text-sm text-gray-500 mt-1">See your rank</div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Daily Missions Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ocean-800">Daily Missions</h2>
            <Link href="/dashboard/missions" className="text-sm text-ocean-600 hover:underline">
              View all →
            </Link>
          </div>
          {missions.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">No missions available today</p>
          ) : (
            <div className="space-y-3">
              {missions.slice(0, 3).map((m) => (
                <div key={m.code || m.key || m.title} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    m.completed ? 'bg-green-100 text-green-700' : m.claimed ? 'bg-ocean-100 text-ocean-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {m.completed ? '✓' : m.claimed ? '⏳' : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ocean-800 truncate">{m.title}</span>
                      <span className="text-xs text-amber-600 font-medium flex-shrink-0">+{m.xpReward} XP</span>
                    </div>
                    {m.claimed && !m.completed && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-ocean-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (m.progress / m.targetCount) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Onboarding Checklist Card */}
        {onboarding && onboarding.steps && onboarding.completedCount < onboarding.totalCount && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ocean-800">Getting Started</h2>
              <Link href="/dashboard/missions" className="text-sm text-ocean-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{onboarding.completedCount}/{onboarding.totalCount} steps</span>
                <span>{onboarding.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-ocean-500 h-2 rounded-full" style={{ width: `${onboarding.progress}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              {onboarding.steps.filter((s: any) => !s.completed).slice(0, 3).map((step: any, idx: number) => (
                <div key={step.step} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-sm text-gray-700 truncate">{step.title}</span>
                  <span className="text-xs text-amber-600 font-medium flex-shrink-0">+{step.xpReward} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights Card */}
        {insights.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ocean-800">Insights</h2>
              <Link href="/dashboard/community" className="text-sm text-ocean-600 hover:underline">
                More →
              </Link>
            </div>
            <div className="space-y-3">
              {insights.slice(0, 3).map((insight: any, idx: number) => {
                const icon = insight.type === 'streak_warning' ? '⚠️' : insight.type === 'milestone' ? '🎉' : insight.type === 'diversity' ? '🌊' : '💡'
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-medium text-ocean-800">{insight.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{insight.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* XP Feed Card */}
        {xpFeed.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ocean-800">Recent XP Activity</h2>
              <Link href="/dashboard/profile" className="text-sm text-ocean-600 hover:underline">
                Full history →
              </Link>
            </div>
            <div className="space-y-2">
              {xpFeed.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 py-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${tx.deltaXP > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {tx.deltaXP > 0 ? '+' : '−'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 truncate">{tx.actionType}</span>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${tx.deltaXP > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.deltaXP > 0 ? '+' : ''}{tx.deltaXP}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/capture" className="card hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">
            Guided Capture
          </h2>
          <p className="text-gray-600">
            Use camera flow for dorsal, ventral, and close-up photos
          </p>
        </Link>

        {(user?.role === 'researcher' || user?.role === 'admin') && (
          <Link href="/dashboard/researcher" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-ocean-800 mb-2">
              Validation Queue
            </h2>
            <p className="text-gray-600">
              Review and validate pending observations
            </p>
          </Link>
        )}

        <Link href="/dashboard/analytics" className="card hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">
            Analytics
          </h2>
          <p className="text-gray-600">
            View population data and trends
          </p>
        </Link>

        {user?.role === 'admin' && (
          <Link href="/dashboard/admin" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-ocean-800 mb-2">
              Admin Panel
            </h2>
            <p className="text-gray-600">
              Manage species, users, and settings
            </p>
          </Link>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="card mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ocean-800">Recent Submissions</h2>
          <Link href="/dashboard/researcher" className="text-sm text-ocean-600 hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No observations yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Species</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Researcher</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">CW</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Gender</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((obs) => (
                  <tr
                    key={obs.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <Link href={`/dashboard/observation/${obs.id}`} className="text-ocean-700 hover:underline font-medium">
                        {obs.species.commonName || obs.species.scientificName}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{obs.user.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{obs.cw.toFixed(1)} cm</td>
                    <td className="py-2.5 px-3 capitalize text-gray-600">{obs.gender}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        obs.status === 'approved' ? 'bg-green-100 text-green-800' :
                        obs.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {obs.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {new Date(obs.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
