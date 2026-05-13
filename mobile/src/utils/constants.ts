export const API_URL = 'http://localhost:3001/api'

export const MAX_PHOTOS = 5
export const CW_MAX = 50
export const BW_MAX = 5000
export const NOTES_MAX_LENGTH = 1000

export const COLORS = {
  primary: '#0284c7',
  primaryDark: '#0369a1',
  primaryLight: '#7dd3fc',
  secondary: '#0f766e',
  secondaryLight: '#99f6e4',
  accent: '#f59e0b',
  background: '#f0f9ff',
  surface: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  border: '#e2e8f0',
  error: '#ef4444',
  errorLight: '#fee2e2',
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
}

export const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Unknown', value: 'unknown' },
] as const

export const MATURATION_OPTIONS = [
  { label: 'Mature', value: 'mature' },
  { label: 'Immature', value: 'immature' },
  { label: 'Unknown', value: 'unknown' },
] as const

export const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.pending,
  approved: COLORS.approved,
  rejected: COLORS.rejected,
}
