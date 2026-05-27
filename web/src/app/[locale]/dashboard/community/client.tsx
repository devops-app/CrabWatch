'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { InsightDto, ContributorDto, CommunityStatsDto } from '@crabwatch/shared'

interface Insight {
  id: string
  type: string
  title: string
  description: string
  actionText?: string
  actionUrl?: string
  priority: 'low' | 'medium' | 'high'
  expiresAt: string
}

interface CommunityClientProps {
  initialInsights?: InsightDto[] | null
  initialContributors?: ContributorDto[] | null
  initialStats?: CommunityStatsDto | null
}

export function CommunityClient({
  initialInsights,
  initialContributors,
  initialStats,
}: CommunityClientProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'insights' | 'contributors' | 'stats'>('insights')
  const [insights, setInsights] = useState<Insight[]>(
    Array.isArray(initialInsights)
      ? initialInsights.map((d: InsightDto) => ({
          id: d.id,
          type: d.type,
          title: d.title,
          description: d.body,
          priority: d.priority >= 7 ? 'high' : d.priority >= 4 ? 'medium' : 'low',
          expiresAt: d.expiresAt || '',
        }))
      : []
  )
  const [contributors, setContributors] = useState<ContributorDto[]>(
    Array.isArray(initialContributors) ? initialContributors : []
  )
  const [communityStats, setCommunityStats] = useState<CommunityStatsDto | null>(initialStats ?? null)
  const [loading, setLoading] = useState(false)
  const t = useTranslations('community')
  const fmt = useFormatters()

  useEffect(() => {
    const controller = new AbortController()
    if (activeTab === 'insights') {
      refreshInsights(controller.signal)
    } else if (activeTab === 'contributors') {
      refreshContributors(controller.signal)
    } else {
      refreshStats(controller.signal)
    }
    return () => controller.abort()
  }, [activeTab])

  const refreshInsights = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await api.getInsights(signal) as InsightDto[]
      setInsights(
        Array.isArray(data)
          ? data.map((d: InsightDto) => ({
              id: d.id,
              type: d.type,
              title: d.title,
              description: d.body,
              priority: d.priority >= 7 ? 'high' : d.priority >= 4 ? 'medium' : 'low',
              expiresAt: d.expiresAt || '',
            }))
          : []
      )
    } catch (error) {
      if (signal?.aborted) return
      logger.error('Failed to load insights', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshContributors = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await api.getTopContributors(signal) as ContributorDto[]
      setContributors(Array.isArray(data) ? data : [])
    } catch (error) {
      if (signal?.aborted) return
      logger.error('Failed to load contributors', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await api.getCommunityStats(signal) as CommunityStatsDto
      setCommunityStats(data)
    } catch (error) {
      if (signal?.aborted) return
      logger.error('Failed to load community stats', error)
    } finally {
      setLoading(false)
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-ocean-900">{t('title')}</h1>
        <div className="flex gap-2">
          {(['insights', 'contributors', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-ocean-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(['tabs', tab].join('.'))}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 animate-pulse border-b border-gray-100 last:border-0">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'insights' ? (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400 text-lg">{t('noInsights')}</p>
              <p className="text-gray-400 text-sm mt-2">{t('insightsHint')}</p>
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`card border-2 border-l-4 ${priorityColor(insight.priority)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">
                    {insight.type === 'STREAK_WARNING' ? '' :
                     insight.type === 'MILESTONE' ? '' :
                     insight.type === 'SUGGESTION' ? '' : ''}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ocean-800">{insight.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColor(insight.priority)}`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    {insight.actionText && insight.actionUrl && (
                      <a
                        href={insight.actionUrl}
                        className="inline-block mt-3 px-4 py-2 bg-ocean-600 text-white rounded-lg text-sm hover:bg-ocean-700 transition-colors"
                      >
                        {insight.actionText}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'contributors' ? (
        <div className="card">
          <div className="space-y-4">
            {contributors.map((contributor, index) => (
              <div
                key={contributor.id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                  index === 0
                    ? 'border-amber-200 bg-amber-50'
                    : index === 1
                    ? 'border-gray-300 bg-gray-50'
                    : index === 2
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-gray-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  index === 0
                    ? 'bg-amber-100 text-amber-800'
                    : index === 1
                    ? 'bg-gray-200 text-gray-600'
                    : index === 2
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                <div className="w-12 h-12 rounded-full bg-ocean-100 flex items-center justify-center text-xl">
                  {contributor.avatar ? (
                    <img src={contributor.avatar} alt={contributor.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    contributor.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ocean-800">{contributor.name}</h3>
                  <p className="text-sm text-gray-500">{contributor.title} · Level {contributor.level}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-ocean-800">{contributor.approvedCount}</div>
                  <div className="text-xs text-gray-500">{t('approved')}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-600">{fmt.formatCompact(contributor.totalXP)}</div>
                  <div className="text-xs text-gray-500">XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-ocean-800 mb-4">{t('overview')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-ocean-50 rounded-lg">
                <div className="text-3xl font-bold text-ocean-800">{communityStats?.totalUsers || 0}</div>
                <div className="text-sm text-gray-500">{t('members')}</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-800">{communityStats?.totalObservations || 0}</div>
                <div className="text-sm text-gray-500">{t('observations')}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-800">{communityStats?.totalSpecies || 0}</div>
                <div className="text-sm text-gray-500">{t('species')}</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-3xl font-bold text-amber-800">{communityStats?.totalApproved || 0}</div>
                <div className="text-sm text-gray-500">{t('approved')}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ocean-800 mb-4">{t('monthlyActivity')}</h2>
            <div className="space-y-2">
              {communityStats?.monthlyActivity?.map(month => (
                <div key={month.month} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20">{month.month}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-ocean-500 h-4 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max(10, (month.count / Math.max(...(communityStats?.monthlyActivity || []).map((m) => m.count))) * 100)}%`,
                      }}
                    >
                      <span className="text-xs text-white font-medium">{month.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
