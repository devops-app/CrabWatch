import { LeaderboardEntryDto, XPTransactionDto } from './gamification'

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

export interface UserAchievementListDto {
  achievementId: string
  code: string
  name: string
  description: string
  category: string
  rarity: string
  iconUrl: string | null
  xpReward: number
  isHidden: boolean
  isUnlocked: boolean
  progress: number
  target: number
  earnedAt: string | null
}

export interface CheckAchievementsResponseDto {
  newlyUnlocked: string[]
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
  description: string | null
  startsAt: string
  endsAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { seasonStats: number }
}

export interface UserSeasonStatDto {
  seasonId: string
  totalXP: number
  approvedCount: number
  totalSubmissions: number
  currentStreak: number
}

// Community
export interface CommunityStatsDto {
  totalUsers: number
  totalObservations: number
  totalSpecies: number
  totalApproved: number
  monthlyActivity: MonthlyActivityEntry[]
}

export interface MonthlyActivityEntry {
  month: string
  count: number
}

export interface ContributorDto {
  id: string
  name: string
  avatar: string | null
  approvedCount: number
  totalSubmissions: number
  level: number
  title: string
  totalXP: number
}

// Onboarding dashboard response
export interface OnboardingStatusDto {
  flowCode: string
  totalCount: number
  completedCount: number
  progress: number
  steps: OnboardingStepStatusDto[]
}

export interface OnboardingStepStatusDto {
  step: string
  key: string
  title: string
  xpReward: number
  completed: boolean
  completedAt: string | null
}

// Active missions dashboard response
export interface ActiveMissionDto {
  id: string
  code: string
  key: string
  title: string
  name: string
  xpReward: number
  claimed: boolean
  completed: boolean
  progress: number
  targetCount: number
}

// Insight dashboard response
export interface DashboardInsightDto {
  id: string
  type: string
  title: string
  message: string
  description: string
}

// Leaderboard response
export interface LeaderboardResponseDto {
  entries: LeaderboardEntryDto[]
  totalPages: number
  currentPage: number
}

// XP History response
export interface XPHistoryResponseDto {
  transactions: XPTransactionDto[]
  totalPages: number
  currentPage: number
}

// Engagement metrics
export interface EngagementMetricsDto {
  totalUsers: number
  activeUsers1d: number
  activeUsers7d: number
  activeUsers30d: number
  dau: number
  wau: number
  mau: number
  stickiness: number
  newUsers7d: number
  newUsers30d: number
  totalObservations: number
  observations7d: number
  observations30d: number
  pendingApproval: number
  approvalRate: number
  avgXP: number
  medianXP: number
  xpDistribution: Array<{ level: number; title: string; count: number }>
  avgStreak: number
  maxStreak: number
  usersWithStreak: number
  streakDistribution: Array<{ bucket: string; count: number }>
  missionsCompleted7d: number
  missionsCompleted30d: number
  missionCompletionRate: number
  totalAchievements: number
  totalUnlocks: number
  avgAchievementsPerUser: number
  activeAbuseSignals: number
  resolvedSignals7d: number
  highRiskUsers: number
  xpTransactions7d: number
  auditLogs7d: number
  leaderboardCacheHits: number
}
