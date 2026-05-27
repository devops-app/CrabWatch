'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import type { DashboardStats, ObservationResponse, UserStatsDto, ActiveMissionDto, OnboardingStatusDto, DashboardInsightDto, XPTransactionDto } from '@crabwatch/shared'

interface DashboardClientProps {
  userRole: string | undefined
  stats: DashboardStats | null
  recent: ObservationResponse[]
  myStats: UserStatsDto | null
  missions: ActiveMissionDto[]
  onboarding: OnboardingStatusDto | null
  insights: DashboardInsightDto[]
  xpFeed: XPTransactionDto[]
}

export function DashboardClient({
  userRole,
  stats,
  recent,
  myStats,
  missions,
  onboarding,
  insights,
  xpFeed,
}: DashboardClientProps): React.JSX.Element {
  const t = useTranslations('dashboard')
  const fmt = useFormatters()

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">{t('title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <div className="text-3xl font-bold text-ocean-600">
            {stats?.totalObservations ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t('totalObservations')}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold text-mangrove-600">
            {stats?.approvedObservations ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t('approved')}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold text-amber-600">
            {stats?.pendingObservations ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t('pending')}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold text-ocean-600">
            {stats?.totalSpecies ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t('speciesRecorded')}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold text-ocean-600">
            {stats?.totalContributors ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t('contributors')}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-3xl font-bold text-ocean-600">
            {stats?.statesCovered ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {t('states')}
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      {myStats && (
        <div className="card mb-8 bg-gradient-to-r from-ocean-50 to-amber-50 border border-ocean-200">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">{t('yourProgress')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-ocean-600">Lv.{myStats.level}</div>
              <div className="text-sm text-gray-500 mt-1">{myStats.title}</div>
              <div className="text-xs text-gray-400 mt-1">
                {t('xpToNext', { current: fmt.formatCompact(myStats.totalXP), next: fmt.formatCompact(myStats.xpToNextLevel) })}
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
              <div className="text-sm text-gray-500 mt-1">{t('dayStreak')}</div>
              <div className="text-xs text-gray-400 mt-1">
                {t('bestStreak', { count: myStats.longestStreak })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{myStats.approvedCount}</div>
              <div className="text-sm text-gray-500 mt-1">{t('approved')}</div>
              <div className="text-xs text-gray-400 mt-1">
                {t('totalSubmissions', { count: myStats.totalSubmissions })}
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/dashboard/leaderboard"
                className="text-ocean-600 hover:underline text-sm font-medium"
              >
                {t('viewLeaderboard')}
              </Link>
              <div className="text-sm text-gray-500 mt-1">{t('seeYourRank')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Daily Missions Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ocean-800">{t('dailyMissions')}</h2>
            <Link href="/dashboard/missions" className="text-sm text-ocean-600 hover:underline">
              {t('viewAll')}
            </Link>
          </div>
          {missions.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">{t('noMissionsToday')}</p>
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
              <h2 className="text-lg font-semibold text-ocean-800">{t('gettingStarted')}</h2>
              <Link href="/dashboard/missions" className="text-sm text-ocean-600 hover:underline">
                {t('viewAll')}
              </Link>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{t('stepsCompleted', { done: onboarding.completedCount, total: onboarding.totalCount })}</span>
                <span>{onboarding.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-ocean-500 h-2 rounded-full" style={{ width: `${onboarding.progress}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              {onboarding.steps.filter(s => !s.completed).slice(0, 3).map((step, idx) => (
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
              <h2 className="text-lg font-semibold text-ocean-800">{t('insights')}</h2>
              <Link href="/dashboard/community" className="text-sm text-ocean-600 hover:underline">
                {t('more')}
              </Link>
            </div>
            <div className="space-y-3">
              {insights.slice(0, 3).map((insight, idx) => {
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
              <h2 className="text-lg font-semibold text-ocean-800">{t('recentXpActivity')}</h2>
              <Link href="/dashboard/profile" className="text-sm text-ocean-600 hover:underline">
                {t('fullHistory')}
              </Link>
            </div>
            <div className="space-y-2">
              {xpFeed.map(tx => (
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
            {t('guidedCapture')}
          </h2>
          <p className="text-gray-600">
            {t('guidedCaptureDesc')}
          </p>
        </Link>

        {(userRole === 'researcher' || userRole === 'admin') && (
          <Link href="/dashboard/researcher" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-ocean-800 mb-2">
              {t('validationQueue')}
            </h2>
            <p className="text-gray-600">
              {t('validationQueueDesc')}
            </p>
          </Link>
        )}

        <Link href="/dashboard/analytics" className="card hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">
            {t('analytics')}
          </h2>
          <p className="text-gray-600">
            {t('analyticsDesc')}
          </p>
        </Link>

        {userRole === 'admin' && (
          <Link href="/dashboard/admin" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-ocean-800 mb-2">
              {t('adminPanel')}
            </h2>
            <p className="text-gray-600">
              {t('adminPanelDesc')}
            </p>
          </Link>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="card mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ocean-800">{t('recentSubmissions')}</h2>
          <Link href="/dashboard/researcher" className="text-sm text-ocean-600 hover:underline">
            {t('viewAll')}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">{t('noObservations')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('tableSpecies')}</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('tableResearcher')}</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('tableCw')}</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('tableGender')}</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('tableStatus')}</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('tableDate')}</th>
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
                    <td className="py-2.5 px-3 text-gray-600">{fmt.formatNumber(obs.cw, 1)} cm</td>
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
                      {fmt.formatDate(new Date(obs.createdAt))}
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
