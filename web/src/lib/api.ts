import { useAuthStore } from './authStore'

import type {
  SpeciesResponse,
  UserListResponse,
  User,
  DashboardStats,
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  TemporalTrendData,
  SpeciesDistributionData,
  ConditionIndexAggregatedData,
  ObservationListResponse,
  ObservationResponse,
  CrabAnalysisRequest,
  CrabAnalysisResult,
  Invite,
  InviteValidation,
  BackupResult,
  BackupFileInfo,
  NotificationPreferenceDto,
} from '@crabwatch/shared'

const API_URL = ''

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data: ApiResponse<T> = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed')
  }

  return data.data as T
}

export const api = {
  // Auth
  register: (body: { name: string; email: string; phoneCode?: string; phoneNumber?: string; addressLine1?: string; addressLine2?: string; addressLine3?: string; state?: string; postcode?: string; country?: string; password: string; inviteToken?: string }) =>
    request('/api/v1/users/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string; phoneCode: string | null; phoneNumber: string | null; addressLine1: string | null; addressLine2: string | null; addressLine3: string | null; state: string | null; postcode: string | null; country: string | null; role: string } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  requestPasswordReset: (body: { email: string }) =>
    request('/api/v1/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resetPassword: (body: { token: string; password: string }) =>
    request('/api/v1/auth/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request('/api/v1/auth/logout', {
      method: 'POST',
    }),

  getProfile: () => request<User>('/api/v1/users/me'),

  updateProfile: (body: { name?: string; phoneCode?: string | null; phoneNumber?: string | null; addressLine1?: string | null; addressLine2?: string | null; addressLine3?: string | null; state?: string | null; postcode?: string | null; country?: string | null; avatar?: string | null }) =>
    request<User>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/v1/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Users (admin)
  listUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<UserListResponse> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.search) query.set('search', params.search)
    if (params?.role) query.set('role', params.role)
    return request<UserListResponse>(`/api/v1/users?${query}`)
  },

  updateUserRole: (id: string, role: string) =>
    request(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  softDeleteUser: (id: string) =>
    request(`/api/v1/users/${id}`, {
      method: 'DELETE',
    }),

  restoreUser: (id: string) =>
    request(`/api/v1/users/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  blockUser: (id: string, reason?: string) =>
    request(`/api/v1/users/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unblockUser: (id: string) =>
    request(`/api/v1/users/${id}/unblock`, {
      method: 'POST',
    }),

  backupDatabase: () =>
    request<BackupResult>('/api/v1/admin/backup', {
      method: 'POST',
    }),

  listBackups: () =>
    request<BackupFileInfo[]>('/api/v1/admin/backups'),

  deleteBackup: (fileName: string) =>
    request(`/api/v1/admin/backups/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    }),

  downloadBackup: (fileName: string) =>
    window.open(`/api/v1/admin/backups/${encodeURIComponent(fileName)}/download`, '_blank'),

  cleanupDeletedUsers: () =>
    request<{ deletedCount: number }>('/api/v1/admin/cleanup-users', {
      method: 'POST',
    }),

  listDeletedUsers: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    return request(`/api/v1/admin/deleted-users?${query}`)
  },

  // Invites
  createInvite: (body: { email: string; role: string; expiresInHours?: number }): Promise<{ id: string; email: string; role: string; expiresAt: string; inviteLink: string }> =>
    request<{ id: string; email: string; role: string; expiresAt: string; inviteLink: string }>('/api/v1/admin/invite', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listInvites: (): Promise<Invite[]> =>
    request<Invite[]>('/api/v1/admin/invites'),

  validateInvite: (token: string): Promise<InviteValidation> =>
    request<InviteValidation>('/api/v1/admin/invite/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // Species
  listSpecies: (): Promise<SpeciesResponse[]> => request<SpeciesResponse[]>('/api/v1/species'),

  getSpecies: (id: string) => request(`/api/v1/species/${id}`),

  createSpecies: (body: {
    scientificName: string
    commonName: string
    description: string
    keyFeatures: { trait: string; value: string }[]
    images: string[]
    distributionZones: { name: string; polygon: [number, number][] }[]
  }) =>
    request('/api/v1/species', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSpecies: (
    id: string,
    body: {
      scientificName?: string
      commonName?: string
      description?: string
      keyFeatures?: { trait: string; value: string }[]
      images?: string[]
      distributionZones?: { name: string; polygon: [number, number][] }[]
    }
  ) =>
    request(`/api/v1/species/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteSpecies: (id: string) =>
    request(`/api/v1/species/${id}`, {
      method: 'DELETE',
    }),

  // Observations
  createObservation: (body: {
    speciesId: string
    cw: number
    bw?: number | null
    gender: string
    maturationStatus: string
    lat: number
    lng: number
    locationMethod: string
    photos: string[]
    detectedCoin?: string | null
    notes?: string
  }) =>
    request('/api/v1/observations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listObservations: (params?: {
    page?: number
    limit?: number
    speciesId?: string
    status?: string
    gender?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<ObservationListResponse> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    if (params?.status) query.set('status', params.status)
    if (params?.gender) query.set('gender', params.gender)
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
    if (params?.dateTo) query.set('dateTo', params.dateTo)
    return request<ObservationListResponse>(`/api/v1/observations?${query}`)
  },

  getObservation: (id: string) => request<ObservationResponse>(`/api/v1/observations/${id}`),

  getPendingObservations: (params?: { page?: number; limit?: number; speciesId?: string }): Promise<ObservationListResponse> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<ObservationListResponse>(`/api/v1/observations/pending?${query}`)
  },

  validateObservation: (
    id: string,
    body: { status: 'approved' | 'rejected'; rejectionReason?: string }
  ) =>
    request(`/api/v1/observations/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Upload
  getUploadUrl: (fileName: string, contentType: string) =>
    request('/api/v1/upload/url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    }),

  uploadAnalysisPhotos: async (photos: File[]): Promise<{ blobUrls: string[]; count: number }> => {
    const formData = new FormData()
    photos.forEach((photo) => {
      formData.append('photos', photo)
    })

    const response = await fetch(`${API_URL}/api/v1/analyze/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const data: ApiResponse<{ blobUrls: string[]; count: number }> = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Analysis photo upload failed')
    }

    return data.data as { blobUrls: string[]; count: number }
  },

  analyzeCrab: (body: CrabAnalysisRequest): Promise<CrabAnalysisResult> =>
    request<CrabAnalysisResult>('/api/v1/analyze/crab', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Analytics
  getDashboardStats: (): Promise<DashboardStats> => request<DashboardStats>('/api/v1/analytics/stats'),

  getSizeFrequency: (params?: { speciesId?: string; gender?: string }): Promise<SizeFrequencyData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    if (params?.gender) query.set('gender', params.gender)
    return request<SizeFrequencyData[]>(`/api/v1/analytics/size-frequency?${query}`)
  },

  getGenderRatio: (params?: { speciesId?: string; dateFrom?: string; dateTo?: string }): Promise<GenderRatioData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
    if (params?.dateTo) query.set('dateTo', params.dateTo)
    return request<GenderRatioData[]>(`/api/v1/analytics/gender-ratio?${query}`)
  },

  getConditionIndices: (params?: { speciesId?: string }): Promise<ConditionIndexAggregatedData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<ConditionIndexAggregatedData[]>(`/api/v1/analytics/condition-indices?${query}`)
  },

  getCW50: (params?: { speciesId?: string }): Promise<CW50Data[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<CW50Data[]>(`/api/v1/analytics/cw50?${query}`)
  },

  getTemporalTrends: (params?: { speciesId?: string }): Promise<TemporalTrendData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<TemporalTrendData[]>(`/api/v1/analytics/temporal-trends?${query}`)
  },

  getSpeciesDistribution: (params?: { dateFrom?: string; dateTo?: string }): Promise<SpeciesDistributionData[]> => {
    const query = new URLSearchParams()
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
    if (params?.dateTo) query.set('dateTo', params.dateTo)
    return request<SpeciesDistributionData[]>(`/api/v1/analytics/species-distribution?${query}`)
  },

  // Gamification
  getMyStats: () =>
    request<{ stats: { totalXP: number; level: number; title: string; currentStreak: number; longestStreak: number; approvedCount: number; totalSubmissions: number; xpToNextLevel: number } }>('/api/v1/gamification/stats/me'),

  getXPHistory: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    return request(`/api/v1/gamification/xp-history?${query}`)
  },

  getLeaderboard: (params?: { scope?: string; seasonId?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.scope) query.set('scope', params.scope)
    if (params?.seasonId) query.set('seasonId', params.seasonId)
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    return request(`/api/v1/gamification/leaderboard?${query}`)
  },

  // Admin Gamification
  listGamificationRules: () => request('/api/v1/admin/gamification/rules'),

  createGamificationRule: (body: any) =>
    request('/api/v1/admin/gamification/rules', { method: 'POST', body: JSON.stringify(body) }),

  updateGamificationRule: (id: string, body: any) =>
    request(`/api/v1/admin/gamification/rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteGamificationRule: (id: string) =>
    request(`/api/v1/admin/gamification/rules/${id}`, { method: 'DELETE' }),

  listLevelConfigs: () => request('/api/v1/admin/gamification/levels'),

  createLevelConfig: (body: any) =>
    request('/api/v1/admin/gamification/levels', { method: 'POST', body: JSON.stringify(body) }),

  updateLevelConfig: (id: string, body: any) =>
    request(`/api/v1/admin/gamification/levels/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteLevelConfig: (id: string) =>
    request(`/api/v1/admin/gamification/levels/${id}`, { method: 'DELETE' }),

  adjustXP: (body: { userId: string; deltaXP: number; reason: string }) =>
    request('/api/v1/admin/gamification/adjust-xp', { method: 'POST', body: JSON.stringify(body) }),

  recalculateXP: (body: { mode: 'dry-run' | 'execute'; userId?: string; reason?: string }) =>
    request('/api/v1/admin/gamification/recalculate', { method: 'POST', body: JSON.stringify(body) }),

  // Engagement (Phase 2)
  getActiveMissions: () => request('/api/v1/engagement/missions/today'),

  claimMission: (body: { missionKey: string }) =>
    request('/api/v1/engagement/missions/claim', { method: 'POST', body: JSON.stringify(body) }),

  updateMissionProgress: (body: { missionKey: string; increment?: number }) =>
    request('/api/v1/engagement/missions/progress', { method: 'POST', body: JSON.stringify(body) }),

  getOnboardingStatus: () => request('/api/v1/engagement/onboarding/me'),

  completeOnboardingStep: (body: { step: string }) =>
    request('/api/v1/engagement/onboarding/steps/complete', { method: 'POST', body: JSON.stringify(body) }),

  // Phase 3: Achievements
  getAchievements: () => request('/api/v1/engagement/achievements'),
  getUnlockedAchievements: () => request('/api/v1/engagement/achievements/unlocked'),
  checkAchievements: () => request('/api/v1/engagement/achievements/check'),
  getAchievementProgress: (id: string) => request(`/api/v1/engagement/achievements/${id}/progress`),

  // Phase 3: Social + Notifications
  getInsights: () => request('/api/v1/engagement/insights/me'),
  getTopContributors: () => request('/api/v1/engagement/social/contributors'),
  getCommunityStats: () => request('/api/v1/engagement/social/stats'),
  getNotificationPreferences: () => request<NotificationPreferenceDto[]>('/api/v1/engagement/notification-preferences'),
  updateNotificationPreferences: (body: Record<string, any>) =>
    request<NotificationPreferenceDto[]>('/api/v1/engagement/notification-preferences', { method: 'PATCH', body: JSON.stringify(body) }),

  // Phase 4: Campaigns + Audit (Admin)
  listCampaigns: (status?: string) => request(`/api/v1/admin/campaigns${status ? `?status=${status}` : ''}`),
  getCampaign: (id: string) => request(`/api/v1/admin/campaigns/${id}`),
  createCampaign: (body: Record<string, any>) =>
    request('/api/v1/admin/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  updateCampaignStatus: (id: string, status: string) =>
    request(`/api/v1/admin/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  launchCampaign: (id: string) => request(`/api/v1/admin/campaigns/${id}/launch`, { method: 'POST' }),
  deleteCampaign: (id: string) => request(`/api/v1/admin/campaigns/${id}`, { method: 'DELETE' }),
  getAuditLogs: (params?: { action?: string; resourceType?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.action) q.set('action', params.action)
    if (params?.resourceType) q.set('resourceType', params.resourceType)
    if (params?.limit) q.set('limit', String(params.limit))
    return request(`/api/v1/admin/audit-logs${q.toString() ? `?${q}` : ''}`)
  },
  getAuditLogStats: () => request('/api/v1/admin/audit-logs/stats'),
  getAbuseSignals: () => request('/api/v1/admin/abuse-signals'),
  resolveAbuseSignal: (id: string, note?: string) =>
    request(`/api/v1/admin/abuse-signals/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ note }) }),

  // Admin Achievements
  listAchievements: () => request('/api/v1/admin/achievements'),
  createAchievement: (body: { code: string; name: string; description: string; category: string; rarity?: string; iconUrl?: string; requirements?: any; xpReward?: number; isHidden?: boolean; isActive?: boolean; startsAt?: string; endsAt?: string }) =>
    request('/api/v1/admin/achievements', { method: 'POST', body: JSON.stringify(body) }),
  updateAchievement: (id: string, body: Partial<{ code: string; name: string; description: string; category: string; rarity: string; iconUrl: string; requirements: any; xpReward: number; isHidden: boolean; isActive: boolean; startsAt: string; endsAt: string }>) =>
    request(`/api/v1/admin/achievements/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAchievement: (id: string) =>
    request(`/api/v1/admin/achievements/${id}`, { method: 'DELETE' }),
  awardAchievement: (achievementId: string, userId: string, reason: string) =>
    request(`/api/v1/admin/achievements/${achievementId}/award`, { method: 'POST', body: JSON.stringify({ userId, reason }) }),

  // Admin Missions
  listAdminMissions: () => request('/api/v1/admin/missions'),
  createMission: (body: { code: string; name: string; description: string; cadence: 'DAILY' | 'WEEKLY'; criteria: any; xpReward?: number; maxClaimsPerUser?: number; active?: boolean; startsAt?: string; endsAt?: string }) =>
    request('/api/v1/admin/missions', { method: 'POST', body: JSON.stringify(body) }),
  updateMission: (id: string, body: Partial<{ code: string; name: string; description: string; cadence: 'DAILY' | 'WEEKLY'; criteria: any; xpReward: number; maxClaimsPerUser: number; active: boolean; startsAt: string; endsAt: string }>) =>
    request(`/api/v1/admin/missions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMission: (id: string) =>
    request(`/api/v1/admin/missions/${id}`, { method: 'DELETE' }),

  // Admin Seasons
  listSeasons: () => request('/api/v1/admin/seasons'),
  createSeason: (body: { code: string; name: string; description?: string; startsAt: string; endsAt: string }) =>
    request('/api/v1/admin/seasons', { method: 'POST', body: JSON.stringify(body) }),
  updateSeason: (id: string, body: Partial<{ code: string; name: string; description: string; startsAt: string; endsAt: string }>) =>
    request(`/api/v1/admin/seasons/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSeason: (id: string) =>
    request(`/api/v1/admin/seasons/${id}`, { method: 'DELETE' }),
  activateSeason: (id: string) =>
    request(`/api/v1/admin/seasons/${id}/activate`, { method: 'POST' }),

  // Admin Engagement Metrics
  getEngagementMetrics: () => request('/api/v1/admin/metrics'),

  // Admin Campaign Send-Test
  sendTestCampaign: (id: string, userId: string) =>
    request(`/api/v1/admin/campaigns/${id}/send-test`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // Admin Recalculation Job Status
  getRecalculationJobStatus: (jobId: string) =>
    request(`/api/v1/admin/gamification/recalculate/${jobId}`),
}
