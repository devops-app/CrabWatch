export interface AchievementDto {
  id: string
  code: string
  name: string
  description: string
  category: string
  rarity: string
  iconUrl: string | null
  requirements: AchievementCondition[]
  xpReward: number
  isHidden: boolean
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

export interface UserAchievementDto {
  id: string
  achievementId: string
  earnedAt: string
  awardedByAdminId: string | null
  isPublic: boolean
  metadata: Record<string, unknown> | null
  achievement: AchievementDto
}

export interface AchievementCondition {
  field: ConditionField
  operator: ConditionOperator
  value: number
}

export type ConditionOperator = 'gte' | 'lte' | 'eq' | 'gt' | 'lt'

export type ConditionField =
  | 'totalSubmissions'
  | 'approvedCount'
  | 'speciesCount'
  | 'currentStreak'
  | 'longestStreak'
  | 'level'
  | 'totalXP'
  | 'nightObservations'
  | 'weekendObservations'

export interface AchievementProgressDto {
  achievementId: string
  progress: number
  target: number
  unlocked: boolean
}

// Onboarding
export interface OnboardingFlowDto {
  id: string
  code: string
  version: number
  name: string
  active: boolean
  steps: OnboardingStepDto[]
}

export interface OnboardingStepDto {
  key: string
  title: string
  description: string
  actionType: string
  xpReward: number
}

export interface OnboardingStepProgressDto {
  stepKey: string
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED'
  completedAt: string | null
  metadata: Record<string, unknown> | null
}

export interface OnboardingProgressDto {
  flowCode: string
  version: number
  steps: OnboardingStepProgressDto[]
  completionPercentage: number
}

// Missions
export type MissionCadence = 'DAILY' | 'WEEKLY'
export type MissionStatus = 'ASSIGNED' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED'

export interface MissionDto {
  id: string
  code: string
  name: string
  description: string
  cadence: MissionCadence
  criteria: AchievementCondition[]
  xpReward: number
  maxClaimsPerUser: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
}

export interface UserMissionDto {
  id: string
  missionId: string
  assignmentDate: string
  progressValue: number
  targetValue: number
  status: MissionStatus
  completedAt: string | null
  claimedAt: string | null
  mission: MissionDto
}

export interface DailyMissionsDto {
  date: string
  items: UserMissionDto[]
}

// Insights
export type InsightType = 'QUALITY_HINT' | 'NEXT_ACTION' | 'STREAK_RISK' | 'MISSION_NUDGE'

export interface InsightDto {
  id: string
  type: InsightType
  title: string
  body: string
  priority: number
  payload: Record<string, unknown> | null
  expiresAt: string | null
  seenAt: string | null
  actedAt: string | null
  createdAt: string
}

// Notifications
export type NotificationChannel = 'PUSH' | 'EMAIL' | 'IN_APP'

export interface NotificationPreferenceDto {
  id: string
  channel: NotificationChannel
  category: string
  enabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  timezone: string | null
}

// Seasons
export interface SeasonDto {
  id: string
  code: string
  name: string
  startsAt: string
  endsAt: string
  isActive: boolean
  description: string | null
}

export interface UserSeasonStatDto {
  seasonId: string
  totalXP: number
  approvedCount: number
  totalSubmissions: number
  currentStreak: number
}
