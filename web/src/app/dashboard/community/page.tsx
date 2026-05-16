'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

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

interface Contributor {
  id: string
  name: string
  avatar: string | null
  approvedCount: number
  totalSubmissions: number
  level: number
  title: string
  totalXP: number
}

export default function CommunityPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'insights' | 'contributors' | 'stats'>('insights')
  const [insights, setInsights] = useState<Insight[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [communityStats, setCommunityStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'insights') {
        const data: any = await api.getInsights()
        setInsights(data || [])
      } else if (activeTab === 'contributors') {
        const data: any = await api.getTopContributors()
        setContributors(data || [])
      } else {
        const data: any = await api.getCommunityStats()
        setCommunityStats(data)
      }
    } catch {
      console.error('Failed to load data')
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
        <h1 className="text-3xl font-bold text-ocean-900">Community</h1>
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
              {tab === 'insights' ? '💡 Insights' : tab === 'contributors' ? '🏅 Top Contributors' : '📊 Stats'}
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
              <p className="text-gray-400 text-lg">No insights right now</p>
              <p className="text-gray-400 text-sm mt-2">Insights appear based on your activity patterns</p>
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`card border-2 border-l-4 ${priorityColor(insight.priority)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">
                    {insight.type === 'STREAK_WARNING' ? '⚠️' :
                     insight.type === 'MILESTONE' ? '🎯' :
                     insight.type === 'SUGGESTION' ? '💡' : '✨'}
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
                  <div className="text-xs text-gray-500">approved</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-600">{contributor.totalXP.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-ocean-800 mb-4">Community Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-ocean-50 rounded-lg">
                <div className="text-3xl font-bold text-ocean-800">{communityStats?.totalUsers || 0}</div>
                <div className="text-sm text-gray-500">Members</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-800">{communityStats?.totalObservations || 0}</div>
                <div className="text-sm text-gray-500">Observations</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-800">{communityStats?.totalSpecies || 0}</div>
                <div className="text-sm text-gray-500">Species</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-3xl font-bold text-amber-800">{communityStats?.totalApproved || 0}</div>
                <div className="text-sm text-gray-500">Approved</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ocean-800 mb-4">Monthly Activity</h2>
            <div className="space-y-2">
              {communityStats?.monthlyActivity?.map((month: any) => (
                <div key={month.month} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20">{month.month}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-ocean-500 h-4 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max(10, (month.count / Math.max(...(communityStats?.monthlyActivity || []).map((m: any) => m.count))) * 100)}%`,
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
