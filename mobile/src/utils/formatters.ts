import { formatCoordinates } from '@crabwatch/shared'

export { formatCoordinates }

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(value: number | null, decimals: number = 1): string {
  if (value == null) return 'N/A'
  return value.toFixed(decimals)
}

export function formatConditionFactor(cw: number, bw: number | null): string {
  if (bw == null || cw === 0) return 'N/A'
  const k = bw / Math.pow(cw, 3) * 100
  return formatNumber(k, 2)
}

export function formatGender(sex: string): string {
  const map: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    unknown: 'Unknown',
    MALE: 'Male',
    FEMALE: 'Female',
    UNKNOWN: 'Unknown',
  }
  return map[sex] || sex
}

export function formatMaturationStatus(status: string): string {
  const map: Record<string, string> = {
    mature: 'Mature',
    immature: 'Immature',
    unknown: 'Unknown',
    MATURE: 'Mature',
    IMMATURE: 'Immature',
    UNKNOWN: 'Unknown',
  }
  return map[status] || status
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return map[status] || status
}
