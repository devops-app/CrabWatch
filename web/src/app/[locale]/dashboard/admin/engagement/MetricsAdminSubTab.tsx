'use client'

import { useState, useEffect, memo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { EngagementMetricsDto } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './types'

export const MetricsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const tMetrics = useTranslations('admin.engagement.metrics')
  const tAdmin = useTranslations('admin')
  const fmt = useFormatters()
  const [metrics, setMetrics] = useState<EngagementMetricsDto | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const data = await api.getEngagementMetrics()
      setMetrics(data as EngagementMetricsDto)
    } catch { logger.error('Failed to load metrics') }
    finally { setLoading(false) }
  }
  useEffect(() => { loadMetrics() }, [])

  if (loading) return <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>
  if (!metrics) return <p className="text-gray-400 py-8 text-center">{tMetrics('noMetrics')}</p>

  const m = metrics

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-ocean-800">{tMetrics('healthTitle')}</h3>
        <button onClick={loadMetrics} className="text-sm text-ocean-600 hover:underline">{tMetrics('refresh')}</button>
      </div>

      {/* User Engagement */}
      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('userEngagement')}</h4>
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-ocean-800">{m.totalUsers}</div>
          <div className="text-xs text-gray-500">{tMetrics('totalUsers')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{m.dau}</div>
          <div className="text-xs text-gray-500">{tMetrics('dau')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{m.wau}</div>
          <div className="text-xs text-gray-500">{tMetrics('wau')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600">{m.mau}</div>
          <div className="text-xs text-gray-500">{tMetrics('mau')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${m.stickiness >= 20 ? 'text-green-600' : m.stickiness >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{m.stickiness}%</div>
          <div className="text-xs text-gray-500">{tMetrics('stickiness')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{m.newUsers7d}</div>
          <div className="text-xs text-gray-500">{tMetrics('new7d')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-teal-600">{m.newUsers30d}</div>
          <div className="text-xs text-gray-500">{tMetrics('new30d')}</div>
        </div>
      </div>

      {/* Observation Metrics */}
      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('observations')}</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-ocean-800">{m.totalObservations}</div>
          <div className="text-xs text-gray-500">{tMetrics('total')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{m.observations7d}</div>
          <div className="text-xs text-gray-500">{tMetrics('last7d')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{m.observations30d}</div>
          <div className="text-xs text-gray-500">{tMetrics('last30d')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{m.pendingApproval}</div>
          <div className="text-xs text-gray-500">{tMetrics('pending')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-ocean-600">{m.approvalRate}%</div>
          <div className="text-xs text-gray-500">{tMetrics('approvalRate')}</div>
        </div>
      </div>

      {/* XP & Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('xpDistribution')}</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-800">{fmt.formatCompact(Math.round(m.avgXP))}</div>
              <div className="text-xs text-gray-500">{tMetrics('avgXP')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{fmt.formatCompact(Math.round(m.medianXP))}</div>
              <div className="text-xs text-gray-500">{tMetrics('medianXP')}</div>
            </div>
          </div>
          {m.xpDistribution?.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr className="border-b">
                <th className="text-left py-1 px-2 text-gray-500">{tMetrics('level')}</th>
                <th className="text-left py-1 px-2 text-gray-500">{tMetrics('title')}</th>
                <th className="text-right py-1 px-2 text-gray-500">{tMetrics('users')}</th>
              </tr></thead>
              <tbody>{m.xpDistribution.map((d: { level: number; title: string; count: number }) => (
                <tr key={d.level} className="border-b">
                  <td className="py-1 px-2 font-bold">{d.level}</td>
                  <td className="py-1 px-2">{d.title}</td>
                  <td className="py-1 px-2 text-right">{d.count}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('streakMetrics')}</h4>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{fmt.formatNumber(m.avgStreak, 1)}</div>
              <div className="text-xs text-gray-500">{tMetrics('avgStreak')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{m.maxStreak}</div>
              <div className="text-xs text-gray-500">{tMetrics('maxStreak')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{m.usersWithStreak}</div>
              <div className="text-xs text-gray-500">{tMetrics('activeStreaks')}</div>
            </div>
          </div>
          {m.streakDistribution?.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr className="border-b">
                <th className="text-left py-1 px-2 text-gray-500">{tMetrics('range')}</th>
                <th className="text-right py-1 px-2 text-gray-500">{tMetrics('users')}</th>
              </tr></thead>
              <tbody>{m.streakDistribution.map((d: { bucket: string; count: number }, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-1 px-2">{d.bucket}</td>
                  <td className="py-1 px-2 text-right">{d.count}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
     </div>

     {/* Missions & Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('missions')}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{m.missionsCompleted7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('completed7d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{m.missionsCompleted30d}</div>
              <div className="text-xs text-gray-500">{tMetrics('completed30d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-600">{m.missionCompletionRate}%</div>
              <div className="text-xs text-gray-500">{tMetrics('completionRate')}</div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('achievements')}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-800">{m.totalAchievements}</div>
              <div className="text-xs text-gray-500">{tMetrics('available')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{m.totalUnlocks}</div>
              <div className="text-xs text-gray-500">{tMetrics('totalUnlocks')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{m.avgAchievementsPerUser}</div>
              <div className="text-xs text-gray-500">{tMetrics('perUser')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Abuse & System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('abuseDetection')}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{m.activeAbuseSignals}</div>
              <div className="text-xs text-gray-500">{tMetrics('openSignals')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{m.resolvedSignals7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('resolved7d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{m.highRiskUsers}</div>
              <div className="text-xs text-gray-500">{tMetrics('highRiskUsers')}</div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('systemHealth')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-800">{m.xpTransactions7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('xpTransactions7d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{m.auditLogs7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('auditLogs7d')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
MetricsAdminSubTab.displayName = 'MetricsAdminSubTab'
