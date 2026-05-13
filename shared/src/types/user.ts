import { UserRole } from '../constants/roles'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string | null
  firebaseUid: string
  createdAt: Date
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role?: UserRole
}

export interface UpdateUserProfileInput {
  name?: string
  avatar?: string | null
}

export interface UpdateUserRoleInput {
  role: UserRole
}

export interface UserResponse {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string | null
  createdAt: string
}

export interface UserListResponse {
  users: UserResponse[]
  total: number
  page: number
  limit: number
}
