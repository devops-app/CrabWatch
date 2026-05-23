import { ObservationStatus } from '../constants/statuses'

export type Gender = 'male' | 'female' | 'unknown'
export type MaturationStatus = 'mature' | 'immature' | 'unknown'
export type LocationMethod = 'gps' | 'manual'

export interface Observation {
  id: string
  userId: string
  speciesId: string
  cw: number
  bw: number | null
  gender: Gender
  maturationStatus: MaturationStatus
  lat: number
  lng: number
  locationMethod: LocationMethod
  photos: string[]
  uploadSessionId: string | null
  detectedCoin: string | null
  notes: string | null
  status: ObservationStatus
  validatedBy: string | null
  validatedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
}

export interface CreateObservationInput {
  speciesId: string
  cw: number
  bw: number | null
  gender: Gender
  maturationStatus: MaturationStatus
  lat: number
  lng: number
  locationMethod: LocationMethod
  photos: string[]
  uploadSessionId?: string | null
  detectedCoin?: string | null
  notes?: string
}

export interface ValidateObservationInput {
  status: 'approved' | 'rejected'
  rejectionReason?: string
}

export interface ObservationResponse {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
  }
  speciesId: string
  species: {
    id: string
    scientificName: string
    commonName: string
  }
  cw: number
  bw: number | null
  gender: Gender
  maturationStatus: MaturationStatus
  lat: number
  lng: number
  locationMethod: LocationMethod
  photos: string[]
  uploadSessionId: string | null
  detectedCoin: string | null
  notes: string | null
  status: ObservationStatus
  validatedBy: string | null
  validatedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

export interface ObservationListResponse {
  observations: ObservationResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ObservationFilters {
  speciesId?: string
  status?: ObservationStatus
  userId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}
