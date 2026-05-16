export type UserRole = 'user' | 'researcher' | 'admin'

export const USER_ROLES: Record<UserRole, string> = {
  user: 'User — Submit observations, view public dashboard',
  researcher: 'Researcher — Validate observations, access analytics',
  admin: 'Admin — Manage species guide, users, and system settings',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  researcher: 1,
  admin: 2,
}
