import { UserRole } from '../constants/roles'

export interface UserAddress {
 line1: string | null
  line2: string | null
  state: string | null
  postcode: string | null
  country: string | null
}

export interface User {
  id: string
  name: string
  email: string
  phoneCode: string | null
  phoneNumber: string | null
 addressLine1: string | null
  addressLine2: string | null
  state: string | null
  postcode: string | null
  country: string | null
 role: UserRole
  avatar: string | null
  firebaseUid: string
  preferredLocale: string | null
  consentAccepted: boolean
  createdAt: Date
}

export interface CreateUserInput {
  name: string
  email: string
  phoneCode: string
  phoneNumber: string
 addressLine1: string
  addressLine2?: string
  state: string
  postcode: string
  country: string
 password: string
  consentAccepted: boolean
  role?: UserRole
}

export interface UpdateUserProfileInput {
  name?: string
  phoneCode?: string | null
  phoneNumber?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  state?: string | null
  postcode?: string | null
  country?: string | null
  avatar?: string | null
  preferredLocale?: string | null
}

export interface UpdateUserRoleInput {
  role: UserRole
}

export interface UserResponse {
  id: string
  name: string
  email: string
  phoneCode: string | null
  phoneNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  state: string | null
  postcode: string | null
  country: string | null
  role: UserRole
  avatar: string | null
  preferredLocale: string | null
  consentAccepted: boolean
  deletedAt: string | null
  blockedAt: string | null
  blockReason: string | null
  createdAt: string
}

export interface UserListResponse {
  users: UserResponse[]
  total: number
  page: number
  limit: number
  includeDeleted?: boolean
}

export interface BlockUserInput {
  reason?: string
}

export interface BackupResult {
  fileName: string
  filePath: string
  size: number
  timestamp: string
}

export interface BackupFileInfo {
  fileName: string
  size: number
  createdAt: string
}

export interface Invite {
  id: string
  email: string
  role: UserRole
  token: string
  expiresAt: string
  used: boolean
  createdAt: string
}

export interface CreateInviteInput {
  email: string
  role: UserRole
  expiresInHours?: number
}

export interface InviteValidation {
  valid: boolean
  email?: string
  role?: UserRole
  error?: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  password: string
}

export interface DeletedUserResponse {
  id: string
  name: string
  email: string
  role: UserRole
  deletedAt: string
  expiresAt: string
}

export interface DeletedUserListResponse {
  users: DeletedUserResponse[]
  total: number
  page: number
  limit: number
}

// Recalculation result
export interface RecalculationResultDto {
  mode: 'dry-run' | 'execute'
  totalUsers: number
  processedUsers: number
  jobId: string | null
  results: RecalculationUserResult[]
}

export interface RecalculationUserResult {
  userId: string
  currentXP: number
  correctXP: number
  diff: number
}

export interface DeleteAccountResponse {
  message: string
  deletedAt: string
  retentionDays: number
  expiresAt: string
}
