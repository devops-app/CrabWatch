export interface AdminAuditLogDto {
  id: string
  actorType: AuditActorType
  actorId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export type AuditActorType = 'USER' | 'ADMIN' | 'SYSTEM'

export interface AbuseSignalDto {
  id: string
  userId: string
  type: AbuseSignalType
  riskScore: number
  source: string
  summary: string
  metadata: Record<string, unknown> | null
  resolved: boolean
  resolvedByAdminId: string | null
  resolvedAt: string | null
  createdAt: string
}

export type AbuseSignalType =
  | 'VELOCITY'
  | 'DUPLICATE_CONTENT'
  | 'DEVICE_FARM'
  | 'IP_CLUSTER'
  | 'SUSPICIOUS_PATTERN'

export interface RecalculationJobDto {
  id: string
  mode: 'dry-run' | 'execute'
  userId: string | null
  reason: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalUsers: number
  processedUsers: number
  createdAt: string
  completedAt: string | null
}

export interface CampaignDto {
  id: string
  code: string
  name: string
  channel: 'PUSH' | 'EMAIL' | 'IN_APP'
  status: string
  audienceFilter: Record<string, unknown>
  content: Record<string, unknown>
  scheduleAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdByAdminId: string | null
  createdAt: string
  updatedAt: string
}

export interface CampaignCreateInput {
  code: string
  name: string
  channel: string
  audienceFilter: Record<string, unknown>
  content: { title: string; body: string; payload?: Record<string, unknown> } | Record<string, { title: string; body: string; payload?: Record<string, unknown> }>
  scheduleAt?: string
}

export interface AdminXPAdjustmentRequest {
  userId: string
  deltaXP: number
  reason: string
}

export interface AdminManualAwardRequest {
  userId: string
  achievementId: string
  reason: string
}

// Translation CRUD
export interface TranslationDto {
  id: string
  locale: string
  resourceType: string
  resourceId: string
  field: string
  value: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTranslationInput {
  locale: string
  resourceType: string
  resourceId: string
  field: string
  value: string
}

export interface UpdateTranslationInput {
  value: string
}

export interface BulkCreateTranslationInput {
  translations: CreateTranslationInput[]
}

export interface TranslationListFilters {
  locale?: string
  resourceType?: string
  resourceId?: string
  field?: string
  page?: number
  limit?: number
}
