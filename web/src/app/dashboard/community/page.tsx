import { cookies } from 'next/headers'
import { CommunityClient } from './client'
import { InsightDto, ContributorDto, CommunityStatsDto } from '@crabwatch/shared'

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

export default async function CommunityPage(): Promise<React.JSX.Element> {
  const [insights, contributors, stats] = await Promise.all([
    fetchServer<InsightDto[]>('/api/v1/engagement/insights/me'),
    fetchServer<ContributorDto[]>('/api/v1/engagement/social/contributors'),
    fetchServer<CommunityStatsDto>('/api/v1/engagement/social/stats'),
  ])

  return (
    <CommunityClient
      initialInsights={insights || []}
      initialContributors={contributors || []}
      initialStats={stats}
    />
  )
}
