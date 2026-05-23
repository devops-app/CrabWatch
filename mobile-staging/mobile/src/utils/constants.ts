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

export const DARK_COLORS = {
  primary: '#7dd3fc',
  primaryDark: '#0284c7',
  primaryLight: '#0369a1',
  secondary: '#99f6e4',
  secondaryLight: '#0f766e',
  accent: '#fbbf24',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textLight: '#64748b',
  border: '#334155',
  error: '#f87171',
  errorLight: '#7f1d1d',
  success: '#4ade80',
  successLight: '#14532d',
  warning: '#fbbf24',
  warningLight: '#78350f',
  pending: '#fbbf24',
  approved: '#4ade80',
  rejected: '#f87171',
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

// MD3 Elevation tokens
export const ELEVATION = {
  1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
} as const
