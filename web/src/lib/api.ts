const API_URL = ''

import type {
  SpeciesResponse,
  UserListResponse,
  DashboardStats,
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  TemporalTrendData,
  SpeciesDistributionData,
  ConditionIndexAggregatedData,
  ObservationListResponse,
  CrabAnalysisRequest,
  CrabAnalysisResult,
} from '@crabwatch/shared'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
  register: (body: { name: string; email: string; password: string }) =>
    request('/api/v1/users/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request('/api/v1/auth/logout', {
      method: 'POST',
    }),

  getProfile: () => request('/api/v1/users/me'),

  updateProfile: (body: { name?: string; avatar?: string | null }) =>
    request('/api/v1/users/me', {
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

  getObservation: (id: string) => request(`/api/v1/observations/${id}`),

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
}
