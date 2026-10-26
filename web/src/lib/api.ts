import { retryWithBackoff, API_ROUTES } from '@crabwatch/shared'
import { useAuthStore } from './authStore'

import type {
  ApiResponse,
  SpeciesResponse,
  SpeciesTranslation,
  UserListResponse,
  User,
  DashboardStats,
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  ActiveMissionDto,
  OnboardingStatusDto,
  UserAchievementListDto,
  CheckAchievementsResponseDto,
  TemporalTrendData,
  SpeciesDistributionData,
  ConditionIndexAggregatedData,
  ObservationListResponse,
  ObservationResponse,
  CrabAnalysisRequest,
  CrabAnalysisResult,
  ViewDetectionResult,
  Invite,
  InviteValidation,
  BackupResult,
  BackupFileInfo,
  NotificationPreferenceDto,
  NotificationPreferenceUpdateRequest,
  GamificationRuleDto,
  LevelConfigDto,
  CreateGamificationRuleInput,
  CreateLevelConfigInput,
  AchievementCondition,
  CampaignDto,
  CampaignCreateInput,
} from '@crabwatch/shared'

// Same-origin proxy: the Next.js server rewrites `/api/v1/*` to the backend.
// Route paths come from the shared API_ROUTES map (relative, no `/api/v1`).
const API_URL = '/api/v1'

function getLocaleFromPath(): string {
  if (typeof window === 'undefined') return 'en'
  const match = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/)
  return match ? match[1] : 'en'
}

async function request<T>(endpoint: string, options: RequestInit & { signal?: AbortSignal } = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const { signal, ...fetchOptions } = options

  return retryWithBackoff(async () => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': getLocaleFromPath(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
    })

    if ([502, 503, 504].includes(response.status)) {
      throw new Error('Request failed')
    }

    const data: ApiResponse<T> = await response.json()

    if (!response.ok || !data.success) {
      const details = (data as any).details
      const msg = details ? `${data.error}: ${JSON.stringify(details)}` : (data.error || 'Request failed')
      throw new Error(msg)
    }

    return data.data as T
  })
}

export const api = {
  // Auth
  register: (body: {
    name: string
    email: string
    phoneCode?: string
    phoneNumber?: string
    addressLine1?: string
    addressLine2?: string
    consentAccepted?: boolean
    state?: string
    postcode?: string
    country?: string
    password: string
    inviteToken?: string
  }) =>
    request(API_ROUTES.users.register, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{
      token: string
      user: {
        id: string
        name: string
        email: string
        phoneCode: string | null
        phoneNumber: string | null
        addressLine1: string | null
        addressLine2: string | null
        consentAccepted: boolean
        state: string | null
        postcode: string | null
        country: string | null
        role: string
      }
    }>(API_ROUTES.auth.login, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  requestPasswordReset: (body: { email: string }) =>
    request(API_ROUTES.auth.passwordResetRequest, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resetPassword: (body: { token: string; password: string }) =>
    request(API_ROUTES.auth.passwordResetReset, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request(API_ROUTES.auth.logout, {
      method: 'POST',
    }),

  getProfile: () => request<User>(API_ROUTES.users.me),

  updateProfile: (body: {
    name?: string
    phoneCode?: string | null
    phoneNumber?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    state?: string | null
    postcode?: string | null
    country?: string | null
    avatar?: string | null
    preferredLocale?: 'en' | 'ms' | null
  }) =>
    request<User>(API_ROUTES.users.me, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>(API_ROUTES.users.mePassword, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteMyAccount: () =>
    request<{ success: boolean; data: { id: string; name: string; email: string; deletedAt: string | null; expiresAt: string; retentionDays: number } }>(API_ROUTES.users.me, {
      method: 'DELETE',
    }),

  // Users (admin)
  listUsers: (params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
  }): Promise<UserListResponse> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.search) query.set('search', params.search)
    if (params?.role) query.set('role', params.role)
    return request<UserListResponse>(`${API_ROUTES.users.list}?${query}`)
  },

  updateUserRole: (id: string, role: string) =>
    request(API_ROUTES.users.role(id), {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  softDeleteUser: (id: string) =>
    request(API_ROUTES.users.byId(id), {
      method: 'DELETE',
    }),

  restoreUser: (id: string) =>
    request(API_ROUTES.users.restore(id), {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  blockUser: (id: string, reason?: string) =>
    request(API_ROUTES.users.block(id), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unblockUser: (id: string) =>
    request(API_ROUTES.users.unblock(id), {
      method: 'POST',
    }),

  backupDatabase: () =>
    request<BackupResult>(API_ROUTES.admin.backup, {
      method: 'POST',
    }),

  listBackups: () => request<BackupFileInfo[]>(API_ROUTES.admin.backups),

  deleteBackup: (fileName: string) =>
    request(API_ROUTES.admin.backupById(encodeURIComponent(fileName)), {
      method: 'DELETE',
    }),

  downloadBackup: (fileName: string) =>
    window.open(`${API_ROUTES.admin.backupDownload(encodeURIComponent(fileName))}`, '_blank'),

  exportCsv: (table: 'observations' | 'species' | 'users') =>
    window.open(`${API_ROUTES.admin.exportCsv}?table=${encodeURIComponent(table)}`, '_blank'),

  cleanupDeletedUsers: () =>
    request<{ deletedCount: number }>(API_ROUTES.admin.cleanupUsers, {
      method: 'POST',
    }),

  listDeletedUsers: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    return request(`${API_ROUTES.admin.deletedUsers}?${query}`)
  },

  // Invites
  createInvite: (body: {
    email: string
    role: string
    expiresInHours?: number
  }): Promise<{ id: string; email: string; role: string; expiresAt: string; inviteLink: string }> =>
    request<{ id: string; email: string; role: string; expiresAt: string; inviteLink: string }>(
      API_ROUTES.admin.invite,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  listInvites: (): Promise<Invite[]> => request<Invite[]>(API_ROUTES.admin.invites),

  validateInvite: (token: string): Promise<InviteValidation> =>
    request<InviteValidation>(API_ROUTES.admin.inviteValidate, {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // Species
  listSpecies: (): Promise<SpeciesResponse[]> => request<SpeciesResponse[]>(API_ROUTES.species.list),

  getSpecies: (id: string) => request(API_ROUTES.species.byId(id)),

  translateSpecies: (id: string, to: string) =>
    request<SpeciesTranslation>(`${API_ROUTES.species.translate(id)}?to=${to}`),

  createSpecies: (body: {
    scientificName: string
    commonName: string
    description: string
    keyFeatures: { trait: string; value: string }[]
    images: string[]
    distributionZones: { name: string; polygon: [number, number][] }[]
  }) =>
    request(API_ROUTES.species.list, {
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
    },
  ) =>
    request(API_ROUTES.species.byId(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteSpecies: (id: string) =>
    request(API_ROUTES.species.byId(id), {
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
    uploadSessionId?: string | null
    detectedCoin?: string | null
    notes?: string
  }) =>
    request(API_ROUTES.observations.list, {
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
    return request<ObservationListResponse>(`${API_ROUTES.observations.list}?${query}`)
  },

  getObservation: (id: string) => request<ObservationResponse>(API_ROUTES.observations.byId(id)),

  getPendingObservations: (params?: {
    page?: number
    limit?: number
    speciesId?: string
  }): Promise<ObservationListResponse> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<ObservationListResponse>(`${API_ROUTES.observations.pending}?${query}`)
  },

  validateObservation: (
    id: string,
    body: { status: 'approved' | 'rejected'; rejectionReason?: string },
  ) =>
    request(API_ROUTES.observations.validate(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  updateObservation: (
    id: string,
    body: {
      speciesId?: string
      cw?: number
      bw?: number | null
      gender?: string
      maturationStatus?: string
      lat?: number
      lng?: number
      locationMethod?: string
      photos?: string[]
      detectedCoin?: string | null
      notes?: string | null
      status?: 'PENDING'
    },
  ) =>
    request<ObservationResponse>(API_ROUTES.observations.byId(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteObservation: (id: string) =>
    request(API_ROUTES.observations.byId(id), {
      method: 'DELETE',
    }),

  // Upload
  getUploadUrl: (fileName: string, contentType: string, sessionId?: string, photoIndex?: number) =>
    request(API_ROUTES.upload.url, {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType, sessionId, photoIndex }),
    }),

   uploadSinglePhoto: async (file: File, fileName?: string): Promise<{ blobUrl: string; readUrl: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', fileName || file.name)

    const response = await fetch(`${API_URL}${API_ROUTES.upload.single}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const data: ApiResponse<{ blobUrl: string; readUrl: string }> = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload failed')
    }

    return data.data as { blobUrl: string; readUrl: string }
  },

  uploadAnalysisPhotos: async (photos: File[], sessionId?: string): Promise<{ blobUrls: string[]; count: number }> => {
    const formData = new FormData()
    photos.forEach((photo) => {
      formData.append('photos', photo)
    })
    if (sessionId) {
      formData.append('sessionId', sessionId)
    }

    const response = await fetch(`${API_URL}${API_ROUTES.analyze.upload}`, {
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
    request<CrabAnalysisResult>(API_ROUTES.analyze.crab, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Analytics
  getDashboardStats: (): Promise<DashboardStats> =>
    request<DashboardStats>(API_ROUTES.analytics.stats),

  getSizeFrequency: (params?: {
    speciesId?: string
    gender?: string
  }): Promise<SizeFrequencyData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    if (params?.gender) query.set('gender', params.gender)
    return request<SizeFrequencyData[]>(`${API_ROUTES.analytics.sizeFrequency}?${query}`)
  },

  getGenderRatio: (params?: {
    speciesId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<GenderRatioData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
    if (params?.dateTo) query.set('dateTo', params.dateTo)
    return request<GenderRatioData[]>(`${API_ROUTES.analytics.genderRatio}?${query}`)
  },

  getConditionIndices: (params?: {
    speciesId?: string
  }): Promise<ConditionIndexAggregatedData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<ConditionIndexAggregatedData[]>(`${API_ROUTES.analytics.conditionIndices}?${query}`)
  },

  getCW50: (params?: { speciesId?: string }): Promise<CW50Data[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<CW50Data[]>(`${API_ROUTES.analytics.cw50}?${query}`)
  },

  getTemporalTrends: (params?: { speciesId?: string }): Promise<TemporalTrendData[]> => {
    const query = new URLSearchParams()
    if (params?.speciesId) query.set('speciesId', params.speciesId)
    return request<TemporalTrendData[]>(`${API_ROUTES.analytics.temporalTrends}?${query}`)
  },

  getSpeciesDistribution: (params?: {
    dateFrom?: string
    dateTo?: string
  }): Promise<SpeciesDistributionData[]> => {
    const query = new URLSearchParams()
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
    if (params?.dateTo) query.set('dateTo', params.dateTo)
    return request<SpeciesDistributionData[]>(`${API_ROUTES.analytics.speciesDistribution}?${query}`)
  },

  // Gamification
  getMyStats: () =>
    request<{
      stats: {
        totalXP: number
        level: number
        title: string
        currentStreak: number
        longestStreak: number
        approvedCount: number
        totalSubmissions: number
        xpToNextLevel: number
      }
    }>(API_ROUTES.gamification.myStats),

  getXPHistory: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    return request(`${API_ROUTES.gamification.xpHistory}?${query}`)
  },

  getLeaderboard: (params?: {
    scope?: string
    seasonId?: string
    page?: number
    limit?: number
    signal?: AbortSignal
  }) => {
    const query = new URLSearchParams()
    if (params?.scope) query.set('scope', params.scope)
    if (params?.seasonId) query.set('seasonId', params.seasonId)
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    return request(`${API_ROUTES.gamification.leaderboard}?${query}`, { signal: params?.signal })
  },

  // Admin Gamification
  listGamificationRules: () => request(API_ROUTES.admin.gamificationRules),

  createGamificationRule: (body: CreateGamificationRuleInput) =>
    request(API_ROUTES.admin.gamificationRules, { method: 'POST', body: JSON.stringify(body) }),

  updateGamificationRule: (id: string, body: Partial<CreateGamificationRuleInput>) =>
    request(API_ROUTES.admin.gamificationRuleById(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteGamificationRule: (id: string) =>
    request(API_ROUTES.admin.gamificationRuleById(id), { method: 'DELETE' }),

  listLevelConfigs: () => request(API_ROUTES.admin.gamificationLevels),

  createLevelConfig: (body: CreateLevelConfigInput) =>
    request(API_ROUTES.admin.gamificationLevels, { method: 'POST', body: JSON.stringify(body) }),

  updateLevelConfig: (id: string, body: Partial<CreateLevelConfigInput>) =>
    request(API_ROUTES.admin.gamificationLevelById(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteLevelConfig: (id: string) =>
    request(API_ROUTES.admin.gamificationLevelById(id), { method: 'DELETE' }),

  adjustXP: (body: { userId: string; deltaXP: number; reason: string }) =>
    request(API_ROUTES.admin.gamificationAdjustXp, { method: 'POST', body: JSON.stringify(body) }),

  recalculateXP: (body: { mode: 'dry-run' | 'execute'; userId?: string; reason?: string }) =>
    request(API_ROUTES.admin.gamificationRecalculate, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Engagement (Phase 2)
  getActiveMissions: () => request<ActiveMissionDto[]>(API_ROUTES.engagement.missionsToday),

  claimMission: (body: { missionKey: string }) =>
    request(API_ROUTES.engagement.missionsClaim, { method: 'POST', body: JSON.stringify({ missionCode: body.missionKey }) }),

  getOnboardingStatus: () => request<OnboardingStatusDto>(API_ROUTES.engagement.onboardingMe),

  completeOnboardingStep: (body: { step: string }) =>
    request(API_ROUTES.engagement.onboardingStepComplete, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Phase 3: Achievements
  getAchievements: () => request<UserAchievementListDto[]>(API_ROUTES.engagement.achievements),
  getUnlockedAchievements: () => request(API_ROUTES.engagement.achievementsUnlocked),
  checkAchievements: () =>
    request<CheckAchievementsResponseDto>(API_ROUTES.engagement.achievementsCheck),
  getAchievementProgress: (id: string) => request(API_ROUTES.engagement.achievementProgress(id)),

  // Phase 3: Social + Notifications
getInsights: (signal?: AbortSignal) => request(API_ROUTES.engagement.insightsMe, { signal }),

  getTopContributors: (signal?: AbortSignal) => request(API_ROUTES.engagement.socialContributors, { signal }),

  getCommunityStats: (signal?: AbortSignal) => request(API_ROUTES.engagement.socialStats, { signal }),

  getNotificationPreferences: () =>
    request<NotificationPreferenceDto[]>(API_ROUTES.engagement.notificationPreferences),
  updateNotificationPreferences: (body: NotificationPreferenceUpdateRequest) =>
    request<NotificationPreferenceDto[]>(API_ROUTES.engagement.notificationPreferences, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Phase 4: Campaigns + Audit (Admin)
  listCampaigns: (status?: string) =>
    request(`${API_ROUTES.admin.campaigns}${status ? `?status=${status}` : ''}`),
  getCampaign: (id: string) => request(API_ROUTES.admin.campaignById(id)),
  createCampaign: (body: CampaignCreateInput) =>
    request(API_ROUTES.admin.campaigns, { method: 'POST', body: JSON.stringify(body) }),
  updateCampaignStatus: (id: string, status: string) =>
    request(API_ROUTES.admin.campaignStatus(id), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  launchCampaign: (id: string) =>
    request(API_ROUTES.admin.campaignLaunch(id), { method: 'POST' }),
  deleteCampaign: (id: string) => request(API_ROUTES.admin.campaignById(id), { method: 'DELETE' }),
  getAuditLogs: (params?: { action?: string; resourceType?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.action) q.set('action', params.action)
    if (params?.resourceType) q.set('resourceType', params.resourceType)
    if (params?.limit) q.set('limit', String(params.limit))
    return request(`${API_ROUTES.admin.auditLogs}${q.toString() ? `?${q}` : ''}`)
  },
  getAuditLogStats: () => request(API_ROUTES.admin.auditLogStats),
  getAbuseSignals: () => request(API_ROUTES.admin.abuseSignals),
  resolveAbuseSignal: (id: string, note?: string) =>
    request(API_ROUTES.admin.abuseSignalResolve(id), {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    }),

  // Admin Achievements
  listAchievements: () => request(API_ROUTES.admin.achievements),
  createAchievement: (body: {
    code: string
    name: string
    description: string
    category: string
    rarity?: string
    iconUrl?: string
    requirements?: AchievementCondition[]
    xpReward?: number
    isHidden?: boolean
    isActive?: boolean
    startsAt?: string
    endsAt?: string
  }) => request(API_ROUTES.admin.achievements, { method: 'POST', body: JSON.stringify(body) }),
  updateAchievement: (
    id: string,
    body: Partial<{
      code: string
      name: string
      description: string
      category: string
      rarity: string
      iconUrl: string
      requirements: AchievementCondition[]
      xpReward: number
      isHidden: boolean
      isActive: boolean
      startsAt: string
      endsAt: string
    }>,
  ) => request(API_ROUTES.admin.achievementById(id), { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAchievement: (id: string) =>
    request(API_ROUTES.admin.achievementById(id), { method: 'DELETE' }),
  awardAchievement: (achievementId: string, userId: string, reason: string) =>
    request(API_ROUTES.admin.achievementAward(achievementId), {
      method: 'POST',
      body: JSON.stringify({ userId, reason }),
    }),

  // Admin Missions
  listAdminMissions: () => request(API_ROUTES.admin.missions),
  createMission: (body: {
    code: string
    name: string
    description: string
    cadence: 'DAILY' | 'WEEKLY'
    criteria: AchievementCondition[]
    xpReward?: number
    maxClaimsPerUser?: number
    active?: boolean
    startsAt?: string
    endsAt?: string
  }) => request(API_ROUTES.admin.missions, { method: 'POST', body: JSON.stringify(body) }),
  updateMission: (
    id: string,
    body: Partial<{
      code: string
      name: string
      description: string
      cadence: 'DAILY' | 'WEEKLY'
      criteria: AchievementCondition[]
      xpReward: number
      maxClaimsPerUser: number
      active: boolean
      startsAt: string
      endsAt: string
    }>,
  ) => request(API_ROUTES.admin.missionById(id), { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMission: (id: string) => request(API_ROUTES.admin.missionById(id), { method: 'DELETE' }),

  // Admin Seasons
  listSeasons: () => request(API_ROUTES.admin.seasons),
  createSeason: (body: {
    code: string
    name: string
    description?: string
    startsAt: string
    endsAt: string
  }) => request(API_ROUTES.admin.seasons, { method: 'POST', body: JSON.stringify(body) }),
  updateSeason: (
    id: string,
    body: Partial<{
      code: string
      name: string
      description: string
      startsAt: string
      endsAt: string
    }>,
  ) => request(API_ROUTES.admin.seasonById(id), { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSeason: (id: string) => request(API_ROUTES.admin.seasonById(id), { method: 'DELETE' }),
  activateSeason: (id: string) =>
    request(API_ROUTES.admin.seasonActivate(id), { method: 'POST' }),

  // Admin Engagement Metrics
  getEngagementMetrics: () => request(API_ROUTES.admin.metrics),

  // Admin Campaign Send-Test
  sendTestCampaign: (id: string, userId: string) =>
    request(API_ROUTES.admin.campaignSendTest(id), {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Admin Recalculation Job Status
  getRecalculationJobStatus: (jobId: string) =>
    request(API_ROUTES.admin.gamificationRecalcJob(jobId)),
  // View Detection (capture)
  detectView: async (photo: File, expectedView: string): Promise<ViewDetectionResult> => {
    const token = useAuthStore.getState().token
    const formData = new FormData()
    formData.append('photo', photo, `photo-${Date.now()}.jpg`)
    formData.append('expectedView', expectedView)

    const response = await fetch(`${API_URL}${API_ROUTES.analyze.detectView}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    const data: ApiResponse<ViewDetectionResult> = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'View detection failed')
    }
    return data.data as ViewDetectionResult
  },

  // FCM Token Registration (notifications)
  registerFcmToken: (fcmToken: string) =>
    request(API_ROUTES.fcm.register, {
      method: 'POST',
      body: JSON.stringify({ fcmToken }),
    }),

  // Telemetry Error Reporting (ErrorBoundary / logger)
  reportTelemetryError: (body: {
    message: string
    stack?: string
    componentStack?: string
    error?: unknown
    timestamp?: string
    url?: string
  }) =>
    fetch(`${API_URL}${API_ROUTES.telemetry.error}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      /* telemetry failure should never crash the app */
    }),

  // Admin Translations
  listTranslations: (params?: {
    locale?: string
    resourceType?: string
    resourceId?: string
    field?: string
    page?: number
    limit?: number
  }) => {
    const query = new URLSearchParams()
    if (params?.locale) query.set('locale', params.locale)
    if (params?.resourceType) query.set('resourceType', params.resourceType)
    if (params?.resourceId) query.set('resourceId', params.resourceId)
    if (params?.field) query.set('field', params.field)
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())

    const token = useAuthStore.getState().token
    return fetch(`${API_URL}${API_ROUTES.admin.translations}${query.toString() ? `?${query}` : ''}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then(async (response) => {
      const payload = await response.json() as ApiResponse<unknown> & {
        pagination?: { page: number; limit: number; total: number; totalPages: number }
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Request failed')
      }
      return {
        data: Array.isArray(payload.data) ? payload.data : [],
        pagination: payload.pagination || { page: params?.page || 1, limit: params?.limit || 50, total: 0, totalPages: 1 },
      }
    })
  },
  getTranslation: (id: string) =>
    request(API_ROUTES.admin.translationById(id)),
  createTranslation: (body: {
    locale: string
    resourceType: string
    resourceId: string
    field: string
    value: string
  }) =>
    request(API_ROUTES.admin.translations, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateTranslation: (
    id: string,
    body: { value: string },
  ) =>
    request(API_ROUTES.admin.translationById(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteTranslation: (id: string) =>
    request(API_ROUTES.admin.translationById(id), {
      method: 'DELETE',
    }),
  bulkCreateTranslations: (body: {
    translations: {
      locale: string
      resourceType: string
      resourceId: string
      field: string
      value: string
    }[]
  }) =>
    request(API_ROUTES.admin.translationsBulk, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  upsertTranslation: (body: {
    locale: string
    resourceType: string
    resourceId: string
    field: string
    value: string
  }) =>
    request(API_ROUTES.admin.translationsUpsert, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getTranslatableModels: () =>
    request(API_ROUTES.admin.translationsModels),
}
