export interface UserStatsDto {
  totalXP: number
  level: number
  title: string
  currentStreak: number
  longestStreak: number
  approvedCount: number
  totalSubmissions: number
  xpToNextLevel: number
}

export interface XPTransactionDto {
  id: string
  actionType: RewardActionType
  deltaXP: number
  sourceType: string
  sourceId: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type RewardActionType =
  | 'OBSERVATION_SUBMIT'
  | 'OBSERVATION_APPROVED'
  | 'FIRST_OBSERVATION'
  | 'NEW_SPECIES'
  | 'VALIDATION'
  | 'STREAK_BONUS'
  | 'MISSION_COMPLETE'
  | 'ACHIEVEMENT_UNLOCK'
  | 'ADMIN_ADJUSTMENT'
  | 'ADMIN_REVERSAL'

export interface LeaderboardEntryDto {
  rank: number
  userId: string
  name: string
  avatar: string | null
  level: number
  title: string
  totalXP: number
  approvedCount: number
  currentStreak: number
}

export interface LevelConfigDto {
  id: string
  level: number
  xpThreshold: number
  title: string
  description: string | null
  active: boolean
}

export interface GamificationRuleDto {
  id: string
  actionType: RewardActionType
  name: string
  description: string
  xpReward: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
  maxPerDay: number | null
  maxPerUserPerDay: number | null
  cooldownHours: number | null
  roleScope: string[] | null
  platformScope: string[] | null
  metadata: Record<string, unknown> | null
}

export interface CreateGamificationRuleInput {
  actionType: RewardActionType
  name: string
  description: string | null
  xpReward: number
  active: boolean
}

export interface CreateLevelConfigInput {
  level: number
  title: string
  xpThreshold: number
  description: string | null
  active: boolean
}

export type LeaderboardScope = 'ALL_TIME' | 'SEASONAL'
