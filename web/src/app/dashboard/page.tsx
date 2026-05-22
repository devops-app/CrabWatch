import { cookies } from 'next/headers'
import { DashboardClient } from './client'
import type { DashboardStats, ObservationResponse, UserStatsDto, ActiveMissionDto, OnboardingStatusDto, DashboardInsightDto, XPTransactionDto, User } from '@crabwatch/shared'

const API_BASE = process.env.BACKEND_URL || 'https://crabwatch-api.azurewebsites.net'

async function fetchServer<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json() as T
  } catch {
    return null
  }
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const [user, stats, observations, myStatsRes, missions, onboarding, insights, xpFeed] = await Promise.all([
    fetchServer<User>('/api/v1/users/me'),
    fetchServer<DashboardStats>('/api/v1/analytics/stats'),
    fetchServer<{ observations: ObservationResponse[] }>('/api/v1/observations?limit=5'),
    fetchServer<{ stats: UserStatsDto }>('/api/v1/gamification/stats/me'),
    fetchServer<ActiveMissionDto[]>('/api/v1/engagement/missions/today'),
    fetchServer<OnboardingStatusDto>('/api/v1/engagement/onboarding/me'),
    fetchServer<DashboardInsightDto[]>('/api/v1/engagement/insights/me'),
    fetchServer<XPTransactionDto[]>('/api/v1/gamification/xp/history?limit=10'),
  ])

  return (
    <DashboardClient
      userRole={user?.role}
      stats={stats}
      recent={observations?.observations || []}
      myStats={myStatsRes?.stats || null}
      missions={Array.isArray(missions) ? missions : []}
      onboarding={onboarding}
      insights={Array.isArray(insights) ? insights : []}
      xpFeed={Array.isArray(xpFeed) ? xpFeed : []}
    />
  )
}
