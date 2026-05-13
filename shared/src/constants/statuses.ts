export type ObservationStatus = 'pending' | 'approved' | 'rejected'

export const OBSERVATION_STATUSES: Record<ObservationStatus, string> = {
  pending: 'Pending — Awaiting researcher review',
  approved: 'Approved — Validated and included in analytics',
  rejected: 'Rejected — Failed validation',
}
