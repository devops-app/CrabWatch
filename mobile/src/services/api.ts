import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import type {
  ApiResponse,
  CreateObservationInput,
  ObservationResponse,
  ObservationListResponse,
  ObservationFilters,
  ValidateObservationInput,
  SpeciesResponse,
  UserResponse,
  DashboardStats,
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  TemporalTrendData,
  UploadResponse,
  CrabAnalysisRequest,
  CrabAnalysisResult,
  ViewDetectionResult,
} from '@crabwatch/shared'

// For Expo Go: use your computer's local IP address
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
// Example: 'http://192.168.1.100:3001/api/v1'
type ExpoConfigExtra = {
  apiUrl?: string
}

const expoExtra = Constants.expoConfig?.extra as ExpoConfigExtra | undefined
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  expoExtra?.apiUrl ??
  'http://localhost:3001/api/v1'

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('auth_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
  } catch {
    throw new Error('Network error. Please check your connection and try again.')
  }

  let data: ApiResponse<T> | null = null
  try {
    data = (await response.json()) as ApiResponse<T>
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}). Please try again.`)
    }
    throw new Error('Invalid server response.')
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || `API error: ${response.status}`)
  }

  return data.data as T
}

export const api = {
  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: UserResponse }> {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  async register(name: string, email: string, password: string): Promise<UserResponse> {
    return apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  },

  async getProfile(): Promise<UserResponse> {
    return apiRequest('/users/me')
  },

  async updateProfile(data: { name?: string; avatar?: string | null }): Promise<UserResponse> {
    return apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async listSpecies(): Promise<SpeciesResponse[]> {
    return apiRequest('/species')
  },

  async getSpecies(id: string): Promise<SpeciesResponse> {
    return apiRequest(`/species/${id}`)
  },

  async createObservation(input: CreateObservationInput): Promise<ObservationResponse> {
    return apiRequest('/observations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
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
    return apiRequest(`/observations${query ? `?${query}` : ''}`)
  },

  async getObservation(id: string): Promise<ObservationResponse> {
    return apiRequest(`/observations/${id}`)
  },

  async getPendingObservations(page?: number): Promise<ObservationListResponse> {
    const params = new URLSearchParams({ status: 'pending' })
    if (page) params.set('page', String(page))
    return apiRequest(`/observations?${params}`)
  },

  async validateObservation(
    id: string,
    input: ValidateObservationInput
  ): Promise<ObservationResponse> {
    return apiRequest(`/observations/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(input),
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

  async getUploadUrl(fileName: string, contentType: string): Promise<UploadResponse> {
    return apiRequest('/upload/url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    })
  },

  async listUsers(page?: number, limit?: number): Promise<{ users: UserResponse[]; total: number }> {
    const p = new URLSearchParams()
    if (page) p.set('page', String(page))
    if (limit) p.set('limit', String(limit))
    const query = p.toString()
    return apiRequest(`/users${query ? `?${query}` : ''}`)
  },

  async updateUserRole(userId: string, role: string): Promise<UserResponse> {
    return apiRequest(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  },

  async analyzeCrab(request: CrabAnalysisRequest): Promise<CrabAnalysisResult> {
    return apiRequest('/analyze/crab', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async uploadAnalysisPhotos(photoUris: string[]): Promise<{ blobUrls: string[]; count: number }> {
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
      } as any)
    })

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
    } as any)

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
}
