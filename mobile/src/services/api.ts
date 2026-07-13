import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { createRetryFetch } from '@crabwatch/shared'
import type {
  ApiResponse,
  CreateObservationInput,
  ObservationResponse,
  ObservationListResponse,
  ObservationFilters,
  ValidateObservationInput,
  UpdateObservationInput,
  SpeciesResponse,
  SpeciesTranslation,
  CreateSpeciesInput,
  UpdateSpeciesInput,
  UserResponse,
  Invite,
  DashboardStats,
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  ConditionIndexAggregatedData,
  SpeciesDistributionData,
  TemporalTrendData,
  UploadResponse,
  CrabAnalysisRequest,
  CrabAnalysisResult,
  ViewDetectionResult,
  GamificationRuleDto,
  CreateGamificationRuleInput,
  LevelConfigDto,
  CampaignDto,
  CampaignCreateInput,
  AdminAuditLogDto,
  AbuseSignalDto,
  EngagementMetricsDto,
  RecalculationJobDto,
  UserStatsDto,
  XPHistoryResponseDto,
  LeaderboardEntryDto,
  LeaderboardResponseDto,
  ActiveMissionDto,
  OnboardingStatusDto,
  UserAchievementListDto,
  CheckAchievementsResponseDto,
  AchievementProgressDto,
  InsightDto,
  ContributorDto,
  CommunityStatsDto,
  NotificationPreferenceDto,
  NotificationPreferenceUpdateRequest,
} from '@crabwatch/shared'

// For Expo Go: use your computer's local IP address
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
// Example: 'http://192.168.1.100:3001/api/v1'
type ExpoConfigExtra = {
  apiUrl?: string
}

const expoExtra = Constants.expoConfig?.extra as ExpoConfigExtra | undefined
const API_VERSION_PATH = '/api/v1'

function normalizeApiBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '')
  if (trimmed.length === 0) {
    return `http://localhost:3001${API_VERSION_PATH}`
  }

  return trimmed.endsWith(API_VERSION_PATH) ? trimmed : `${trimmed}${API_VERSION_PATH}`
}

const API_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ??
  expoExtra?.apiUrl ??
  'http://localhost:3001/api/v1'
)

const retryFetch = createRetryFetch({
  maxRetries: 2,
  retryableStatuses: [502, 503, 504],
  backoffMs: (attempt) => Math.pow(2, attempt - 1) * 1000,
})

const HTTP_URL_PATTERN = /^https?:\/\//i
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

function isHttpUrl(value: string): boolean {
  return HTTP_URL_PATTERN.test(value)
}

function normalizePhotoUrlForDevice(url: string): string {
  if (!isHttpUrl(url)) return url

  try {
    const parsed = new URL(url)
    if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
      return url
    }

    const apiParsed = new URL(API_URL)
    parsed.hostname = apiParsed.hostname
    return parsed.toString()
  } catch {
    return url
  }
}

function normalizeObservationPhotos(observation: ObservationResponse): ObservationResponse {
  return {
    ...observation,
    photos: observation.photos.map(normalizePhotoUrlForDevice),
  }
}

function normalizeObservationListPhotos(list: ObservationListResponse): ObservationListResponse {
  return {
    ...list,
    observations: list.observations.map(normalizeObservationPhotos),
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('auth_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const fullUrl = `${API_URL}${endpoint}`
  try {
    return await retryFetch<T>(fullUrl, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
  } catch (err) {
    console.error('[API] Fetch failed:', { url: fullUrl, error: err })
    if (err instanceof Error) {
      throw new Error(err.message || `Network error. Please check your connection and try again. (URL: ${fullUrl})`)
    }
    throw new Error(`Network error. Please check your connection and try again. (URL: ${fullUrl})`)
  }
}

export const api = {
  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: UserResponse }> {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

 async register(name: string, email: string, password: string, phoneCode?: string, phoneNumber?: string, addressLine1?: string, addressLine2?: string, state?: string, postcode?: string, country?: string, consentAccepted?: boolean): Promise<UserResponse> {
    return apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phoneCode, phoneNumber, addressLine1, addressLine2, state, postcode, country, password, consentAccepted }),
    })
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return apiRequest('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiRequest('/auth/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },

  async getProfile(): Promise<UserResponse> {
    return apiRequest('/users/me')
  },

  async updateProfile(data: { name?: string; phoneCode?: string | null; phoneNumber?: string | null; addressLine1?: string | null; addressLine2?: string | null; state?: string | null; postcode?: string | null; country?: string | null; avatar?: string | null; preferredLocale?: 'en' | 'ms' | null }): Promise<UserResponse> {
    return apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiRequest('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  async deleteMyAccount(): Promise<{ success: boolean; data: { id: string; name: string; email: string; deletedAt: string | null; expiresAt: string; retentionDays: number } }> {
    return apiRequest('/users/me', {
      method: 'DELETE',
    })
  },

  async registerFcmToken(fcmToken: string): Promise<{ registered: boolean }> {
    return apiRequest('/fcm/register', {
      method: 'POST',
      body: JSON.stringify({ fcmToken }),
    })
  },

  async unregisterFcmToken(): Promise<{ unregistered: boolean }> {
    return apiRequest('/fcm/register', {
      method: 'DELETE',
    })
  },

  async listSpecies(): Promise<SpeciesResponse[]> {
    return apiRequest('/species')
  },

  async getSpecies(id: string): Promise<SpeciesResponse> {
    return apiRequest(`/species/${id}`)
  },

  async translateSpecies(id: string, to: string): Promise<SpeciesTranslation> {
    return apiRequest(`/species/${id}/translate?to=${to}`)
  },

  async createObservation(input: CreateObservationInput): Promise<ObservationResponse> {
    const localPhotos = input.photos.filter((photo) => !isHttpUrl(photo))
    let uploadedLocalPhotoUrls: string[] = []

    if (localPhotos.length > 0) {
      const { blobUrls } = await api.uploadAnalysisPhotos(localPhotos, input.uploadSessionId || undefined)
      uploadedLocalPhotoUrls = blobUrls
    }

    let uploadedLocalPhotoIndex = 0
    const normalizedPhotos = input.photos.map((photo) => {
      if (isHttpUrl(photo)) return photo

      const uploaded = uploadedLocalPhotoUrls[uploadedLocalPhotoIndex]
      uploadedLocalPhotoIndex += 1

      if (!uploaded) {
        throw new Error('Failed to upload one or more photos before submission.')
      }

      return uploaded
    })

    const created = await apiRequest<ObservationResponse>('/observations', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        photos: normalizedPhotos,
      }),
    })

    return normalizeObservationPhotos(created)
  },

  async listObservations(filters?: ObservationFilters): Promise<ObservationListResponse> {
    const params = new URLSearchParams()
    if (filters?.speciesId) params.set('speciesId', filters.speciesId)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.userId) params.set('userId', filters.userId)
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))

    const query = params.toString()
    const data = await apiRequest<ObservationListResponse>(`/observations${query ? `?${query}` : ''}`)
    return normalizeObservationListPhotos(data)
  },

  async getObservation(id: string): Promise<ObservationResponse> {
    const data = await apiRequest<ObservationResponse>(`/observations/${id}`)
    return normalizeObservationPhotos(data)
  },

  async getPendingObservations(page?: number): Promise<ObservationListResponse> {
    const params = new URLSearchParams({ status: 'pending' })
    if (page) params.set('page', String(page))
    const data = await apiRequest<ObservationListResponse>(`/observations?${params}`)
    return normalizeObservationListPhotos(data)
  },

  async validateObservation(
    id: string,
    input: ValidateObservationInput
  ): Promise<ObservationResponse> {
    const data = await apiRequest<ObservationResponse>(`/observations/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })

    return normalizeObservationPhotos(data)
  },

  async updateObservation(
    id: string,
    input: UpdateObservationInput
  ): Promise<ObservationResponse> {
    const data = await apiRequest<ObservationResponse>(`/observations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })

    return normalizeObservationPhotos(data)
  },

  async deleteObservation(id: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/observations/${id}`, {
      method: 'DELETE',
    })
  },

  async getDashboardStats(): Promise<DashboardStats> {
    return apiRequest('/analytics/stats')
  },

  async getSizeFrequency(params?: {
    speciesId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<SizeFrequencyData[]> {
    const p = new URLSearchParams()
    if (params?.speciesId) p.set('speciesId', params.speciesId)
    if (params?.dateFrom) p.set('dateFrom', params.dateFrom)
    if (params?.dateTo) p.set('dateTo', params.dateTo)
    const query = p.toString()
    return apiRequest(`/analytics/size-frequency${query ? `?${query}` : ''}`)
  },

  async getGenderRatio(params?: {
    speciesId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<GenderRatioData[]> {
    const p = new URLSearchParams()
    if (params?.speciesId) p.set('speciesId', params.speciesId)
    if (params?.dateFrom) p.set('dateFrom', params.dateFrom)
    if (params?.dateTo) p.set('dateTo', params.dateTo)
    const query = p.toString()
    return apiRequest(`/analytics/gender-ratio${query ? `?${query}` : ''}`)
  },

  async getCW50(speciesId?: string): Promise<CW50Data[]> {
    const p = new URLSearchParams()
    if (speciesId) p.set('speciesId', speciesId)
    const query = p.toString()
    return apiRequest(`/analytics/cw50${query ? `?${query}` : ''}`)
  },

  async getTemporalTrends(params?: {
    speciesId?: string
    year?: string
  }): Promise<TemporalTrendData[]> {
    const p = new URLSearchParams()
    if (params?.speciesId) p.set('speciesId', params.speciesId)
    if (params?.year) p.set('year', params.year)
    const query = p.toString()
    return apiRequest(`/analytics/temporal-trends${query ? `?${query}` : ''}`)
  },

  async getConditionIndices(speciesId?: string): Promise<ConditionIndexAggregatedData[]> {
    const p = new URLSearchParams()
    if (speciesId) p.set('speciesId', speciesId)
    const query = p.toString()
    return apiRequest(`/analytics/condition-indices${query ? `?${query}` : ''}`)
  },

  async getSpeciesDistribution(params?: {
    dateFrom?: string
    dateTo?: string
  }): Promise<SpeciesDistributionData[]> {
    const p = new URLSearchParams()
    if (params?.dateFrom) p.set('dateFrom', params.dateFrom)
    if (params?.dateTo) p.set('dateTo', params.dateTo)
    const query = p.toString()
    return apiRequest(`/analytics/species-distribution${query ? `?${query}` : ''}`)
  },

  async getUploadUrl(fileName: string, contentType: string, sessionId?: string, photoIndex?: number): Promise<UploadResponse> {
    return apiRequest('/upload/url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType, sessionId, photoIndex }),
    })
  },

  async uploadSinglePhoto(uri: string, fileName: string, contentType: string): Promise<{ readUrl: string }> {
    const token = await SecureStore.getItemAsync('auth_token')
    const formData = new FormData()
    formData.append('file', {
      uri,
      name: fileName,
      type: contentType,
    } as unknown as File)
    formData.append('fileName', fileName)
    formData.append('contentType', contentType)

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed (${response.status}). Please try again.`)
    }

    const data: ApiResponse<{ readUrl: string; blobUrl: string; fileName: string }> = (await response.json()) as ApiResponse<{ readUrl: string; blobUrl: string; fileName: string }>
    if (!data.data) throw new Error('Upload returned no data')
    return { readUrl: data.data.readUrl }
  },

  async listUsers(page?: number, limit?: number, search?: string, role?: string): Promise<{ users: UserResponse[]; total: number }> {
    const p = new URLSearchParams()
    if (page) p.set('page', String(page))
    if (limit) p.set('limit', String(limit))
    if (search) p.set('search', search)
    if (role) p.set('role', role)
    const query = p.toString()
    return apiRequest(`/users${query ? `?${query}` : ''}`)
  },

  async updateUserRole(userId: string, role: string): Promise<UserResponse> {
    return apiRequest(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  },

  async softDeleteUser(userId: string): Promise<{ message: string }> {
    return apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    })
  },

  async restoreUser(userId: string): Promise<{ message: string }> {
    return apiRequest(`/users/${userId}/restore`, {
      method: 'POST',
    })
  },

  async blockUser(userId: string, reason?: string): Promise<{ message: string }> {
    return apiRequest(`/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  async unblockUser(userId: string): Promise<{ message: string }> {
    return apiRequest(`/users/${userId}/unblock`, {
      method: 'POST',
    })
  },

  async listDeletedUsers(page?: number, limit?: number): Promise<{ users: UserResponse[]; total: number }> {
    const p = new URLSearchParams()
    if (page) p.set('page', String(page))
    if (limit) p.set('limit', String(limit))
    const query = p.toString()
    return apiRequest(`/admin/deleted-users${query ? `?${query}` : ''}`)
  },

  async cleanupDeletedUsers(): Promise<{ deletedCount: number; users: UserResponse[]; retentionDays: number }> {
    return apiRequest('/admin/cleanup-users', {
      method: 'POST',
    })
  },

  async backupDatabase(): Promise<{ fileName: string; filePath: string; size: number; timestamp: string }> {
    return apiRequest('/admin/backup', {
      method: 'POST',
    })
  },

  async listBackups(): Promise<{ fileName: string; size: number; timestamp: string }[]> {
    return apiRequest('/admin/backups')
  },

  async createInvite(email: string, role: string, expiresInHours?: number): Promise<{ token: string; expiresAt: string }> {
    return apiRequest('/admin/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role, expiresInHours }),
    })
  },

  async listInvites(): Promise<Invite[]> {
    return apiRequest('/admin/invites')
  },

  async createSpecies(data: CreateSpeciesInput): Promise<SpeciesResponse> {
    return apiRequest('/species', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateSpecies(id: string, data: UpdateSpeciesInput): Promise<SpeciesResponse> {
    return apiRequest(`/species/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteSpecies(id: string): Promise<{ message: string }> {
    return apiRequest(`/species/${id}`, {
      method: 'DELETE',
    })
  },

  // Admin Engagement - XP Rules
  async listGamificationRules(): Promise<GamificationRuleDto[]> {
    return apiRequest('/admin/gamification/rules')
  },

  async createGamificationRule(payload: CreateGamificationRuleInput): Promise<GamificationRuleDto> {
    return apiRequest('/admin/gamification/rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateGamificationRule(id: string, payload: Partial<Omit<GamificationRuleDto, 'description'>> & { description?: string | null }): Promise<GamificationRuleDto> {
    return apiRequest(`/admin/gamification/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async deleteGamificationRule(id: string): Promise<void> {
    await apiRequest(`/admin/gamification/rules/${id}`, {
      method: 'DELETE',
    })
  },

  // Admin Engagement - Level Configs
  async listLevelConfigs(): Promise<LevelConfigDto[]> {
    return apiRequest('/admin/gamification/levels')
  },

  async createLevelConfig(payload: Omit<LevelConfigDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<LevelConfigDto> {
    return apiRequest('/admin/gamification/levels', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateLevelConfig(id: string, payload: Partial<LevelConfigDto>): Promise<LevelConfigDto> {
    return apiRequest(`/admin/gamification/levels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async deleteLevelConfig(id: string): Promise<void> {
    await apiRequest(`/admin/gamification/levels/${id}`, {
      method: 'DELETE',
    })
  },

  async adjustXP(payload: { userId: string; deltaXP: number; reason: string }): Promise<UserStatsDto> {
    return apiRequest('/admin/gamification/adjust-xp', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async recalculateXP(payload: { mode: 'dry-run' | 'execute'; userId?: string; reason?: string }): Promise<RecalculationJobDto> {
    return apiRequest('/admin/gamification/recalculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getRecalculationJobStatus(jobId: string): Promise<RecalculationJobDto> {
    return apiRequest(`/admin/gamification/recalculate/${jobId}`)
  },

  async listCampaigns(status?: string): Promise<CampaignDto[]> {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    const query = p.toString()
    return apiRequest(`/admin/campaigns${query ? `?${query}` : ''}`)
  },

  async createCampaign(payload: CampaignCreateInput): Promise<CampaignDto> {
    return apiRequest('/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async launchCampaign(id: string): Promise<CampaignDto> {
    return apiRequest(`/admin/campaigns/${id}/launch`, {
      method: 'POST',
    })
  },

  async sendTestCampaign(id: string, userId: string): Promise<{ sent: boolean }> {
    return apiRequest(`/admin/campaigns/${id}/send-test`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  async deleteCampaign(id: string): Promise<void> {
    await apiRequest(`/admin/campaigns/${id}`, {
      method: 'DELETE',
    })
  },

  async getAuditLogs(params?: { action?: string; resourceType?: string; limit?: number }): Promise<AdminAuditLogDto[]> {
    const p = new URLSearchParams()
    if (params?.action) p.set('action', params.action)
    if (params?.resourceType) p.set('resourceType', params.resourceType)
    if (params?.limit) p.set('limit', String(params.limit))
    const query = p.toString()
    return apiRequest(`/admin/audit-logs${query ? `?${query}` : ''}`)
  },

  async getAuditLogStats(): Promise<{ total: number; byAction: Record<string, number>; byResourceType: Record<string, number> }> {
    return apiRequest('/admin/audit-logs/stats')
  },

  async getAbuseSignals(): Promise<AbuseSignalDto[]> {
    return apiRequest('/admin/abuse-signals')
  },

  async resolveAbuseSignal(id: string, note?: string): Promise<AbuseSignalDto> {
    return apiRequest(`/admin/abuse-signals/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    })
  },

  async getEngagementMetrics(): Promise<EngagementMetricsDto> {
    return apiRequest('/admin/metrics')
  },

  async analyzeCrab(request: CrabAnalysisRequest): Promise<CrabAnalysisResult> {
    return apiRequest('/analyze/crab', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async uploadAnalysisPhotos(photoUris: string[], sessionId?: string): Promise<{ blobUrls: string[]; count: number }> {
    const token = await SecureStore.getItemAsync('auth_token')
    const formData = new FormData()

    photoUris.forEach((uri, index) => {
      const fileName = uri.split('/').pop() || `photo-${index}.jpg`
      const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
      let mimeType = 'image/jpeg'
      if (ext === 'png') mimeType = 'image/png'
      else if (ext === 'webp') mimeType = 'image/webp'
      else if (ext === 'heic' || ext === 'heif') mimeType = 'image/heic'

      formData.append('photos', {
        uri,
        name: fileName,
        type: mimeType,
      } as unknown as File)
    })

    if (sessionId) {
      formData.append('sessionId', sessionId)
    }

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let response: Response
    try {
      response = await fetch(`${API_URL}/analyze/upload`, {
        method: 'POST',
        headers,
        body: formData,
      })
    } catch {
      throw new Error('Network error. Please check your connection and try again.')
    }

    let data: ApiResponse<{ blobUrls: string[]; count: number }> | null = null
    try {
      data = (await response.json()) as ApiResponse<{ blobUrls: string[]; count: number }>
    } catch {
      if (!response.ok) {
        throw new Error(`Upload failed (${response.status}). Please try again.`)
      }
      throw new Error('Invalid server response.')
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Upload error: ${response.status}`)
    }

  return data.data!
  },

  async detectView(photoUri: string, expectedView: string): Promise<ViewDetectionResult> {
    const token = await SecureStore.getItemAsync('auth_token')
    const formData = new FormData()

    const fileName = photoUri.split('/').pop() || 'photo.jpg'
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
    let mimeType = 'image/jpeg'
    if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'webp') mimeType = 'image/webp'
    else if (ext === 'heic' || ext === 'heif') mimeType = 'image/heic'

    formData.append('photo', {
      uri: photoUri,
      name: fileName,
      type: mimeType,
    } as unknown as File)

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let response: Response
    try {
      response = await fetch(`${API_URL}/analyze/detect-view`, {
        method: 'POST',
        headers,
        body: formData,
      })
    } catch {
      throw new Error('Network error. Please check your connection and try again.')
    }

    let data: ApiResponse<ViewDetectionResult> | null = null
    try {
      data = (await response.json()) as ApiResponse<ViewDetectionResult>
    } catch {
      if (!response.ok) {
        throw new Error(`Detection failed (${response.status}). Please try again.`)
      }
      throw new Error('Invalid server response.')
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Detection error: ${response.status}`)
    }

    return data.data!
  },

  // Gamification
  async getMyStats(): Promise<{ stats: { totalXP: number; level: number; title: string; currentStreak: number; longestStreak: number; approvedCount: number; totalSubmissions: number; xpToNextLevel: number } }> {
    return apiRequest('/gamification/stats/me')
  },

  async getXPHistory(params?: { page?: number; limit?: number }): Promise<XPHistoryResponseDto> {
    const p = new URLSearchParams()
    if (params?.page) p.set('page', String(params.page))
    if (params?.limit) p.set('limit', String(params.limit))
    const query = p.toString()
    return apiRequest(`/gamification/xp-history${query ? `?${query}` : ''}`)
  },

  async getLeaderboard(params?: { scope?: string; seasonId?: string; page?: number; limit?: number }): Promise<LeaderboardResponseDto> {
    const p = new URLSearchParams()
    if (params?.scope) p.set('scope', params.scope)
    if (params?.seasonId) p.set('seasonId', params.seasonId)
    if (params?.page) p.set('page', String(params.page))
    if (params?.limit) p.set('limit', String(params.limit))
    const query = p.toString()
    const raw = await apiRequest<{ items: LeaderboardEntryDto[]; page: number; limit: number; total: number; myRank?: number }>(`/gamification/leaderboard${query ? `?${query}` : ''}`)
    return {
      entries: raw.items,
      totalPages: Math.ceil(raw.total / raw.limit),
      currentPage: raw.page,
    }
  },

  // Engagement - Missions
  async getActiveMissions(): Promise<ActiveMissionDto[]> {
    return apiRequest('/engagement/missions/today')
  },

  async claimMission(body: { missionKey: string }): Promise<{ claimed: boolean; xpAwarded: number }> {
    return apiRequest('/engagement/missions/claim', {
      method: 'POST',
      body: JSON.stringify({ missionCode: body.missionKey }),
    })
  },

  async updateMissionProgress(body: { missionKey: string; increment?: number }): Promise<{ progress: number }> {
    return apiRequest('/engagement/missions/progress', {
      method: 'POST',
      body: JSON.stringify({ missionCode: body.missionKey, increment: body.increment }),
    })
  },

  // Engagement - Onboarding
  async getOnboardingStatus(): Promise<OnboardingStatusDto> {
    return apiRequest('/engagement/onboarding/me')
  },

  async completeOnboardingStep(body: { step: string }): Promise<{ completed: boolean }> {
    return apiRequest('/engagement/onboarding/steps/complete', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  // Engagement - Achievements
  async getAchievements(): Promise<UserAchievementListDto[]> {
    return apiRequest('/engagement/achievements')
  },

  async getUnlockedAchievements(): Promise<UserAchievementListDto> {
    return apiRequest('/engagement/achievements/unlocked')
  },

  async checkAchievements(): Promise<CheckAchievementsResponseDto> {
    return apiRequest('/engagement/achievements/check')
  },

  async getAchievementProgress(id: string): Promise<AchievementProgressDto> {
    return apiRequest(`/engagement/achievements/${id}/progress`)
  },

  // Engagement - Social
  async getInsights(): Promise<InsightDto[]> {
    return apiRequest('/engagement/insights/me')
  },

  async getTopContributors(): Promise<ContributorDto[]> {
    return apiRequest('/engagement/social/contributors')
  },

  async getCommunityStats(): Promise<CommunityStatsDto> {
    return apiRequest('/engagement/social/stats')
  },

  // Engagement - Notifications
  async getNotificationPreferences(): Promise<NotificationPreferenceDto> {
    return apiRequest('/engagement/notification-preferences')
  },

  async updateNotificationPreferences(body: NotificationPreferenceUpdateRequest): Promise<NotificationPreferenceDto> {
    return apiRequest('/engagement/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  // Telemetry — fire-and-forget, never crashes the app
  reportTelemetryError: (body: {
    message: string
    stack?: string
    componentStack?: string
    error?: unknown
    timestamp?: string
    url?: string
  }) =>
    fetch(`${API_URL}/api/v1/telemetry/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      /* telemetry failure should never crash the app */
    }),
}
