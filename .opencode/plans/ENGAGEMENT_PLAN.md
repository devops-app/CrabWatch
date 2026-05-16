# Engagement System - Implementation Plan

> **Status**: Ready for build
> **Created**: 2026-05-16
> **Priority**: Server foundation -> Web admin -> Mobile parity
> **Scope**: Engagement and retention only (no monetization)

---

## 1) Objective

Increase daily active usage, onboarding completion, and long-term retention across web and mobile by introducing:

- Guided onboarding quests
- Daily missions and healthy streaks
- Configurable XP and achievements
- Seasonal + all-time leaderboard
- Personalized recommendations and lifecycle notifications
- Admin command center with full auditability and abuse controls

This plan is designed to fit the current CrabWatch architecture:

- `server`: Express + Prisma
- `web`: Next.js App Router
- `mobile`: Expo + React Navigation
- `shared`: shared TypeScript contracts

---

## 2) Product Principles

1. **Trust first**: all rewards are server-calculated and auditable.
2. **Healthy motivation**: progression encourages quality and consistency, not spam.
3. **Admin operability**: every major rule is configurable without redeploy.
4. **Cross-platform parity**: one backend contract for web and mobile.
5. **Safe rollouts**: feature flags, dry-run tools, and idempotent award logic.

---

## 3) Final Feature Set

### Core engagement loops

- Onboarding questline (first-week guided success)
- Daily missions (short goals)
- Streaks with limited freeze protection
- XP + levels + titles
- Achievements (hidden + seasonal + manual admin awards)
- Seasonal leaderboard + all-time leaderboard
- In-app reward feed and level-up notifications
- AI-generated "next best action" recommendations

### Admin controls

- Rule engine control (XP, missions, level thresholds)
- Campaign orchestration (push/email/in-app)
- Moderation and abuse detection
- Audit logs for all admin write actions
- Recalculation jobs and dry-run previews

---

## 4) Prisma Schema (Exact Models)

Add the following to `server/prisma/schema.prisma`.

```prisma
enum RewardActionType {
  OBSERVATION_SUBMIT
  OBSERVATION_APPROVED
  FIRST_OBSERVATION
  NEW_SPECIES
  VALIDATION
  STREAK_BONUS
  MISSION_COMPLETE
  ACHIEVEMENT_UNLOCK
  ADMIN_ADJUSTMENT
  ADMIN_REVERSAL
}

enum LeaderboardScope {
  ALL_TIME
  SEASONAL
}

enum MissionCadence {
  DAILY
  WEEKLY
}

enum MissionStatus {
  ASSIGNED
  COMPLETED
  CLAIMED
  EXPIRED
}

enum ChallengeType {
  INDIVIDUAL
  TEAM
}

enum NotificationChannel {
  PUSH
  EMAIL
  IN_APP
}

enum NotificationStatus {
  QUEUED
  SENT
  FAILED
  CANCELLED
}

enum InsightType {
  QUALITY_HINT
  NEXT_ACTION
  STREAK_RISK
  MISSION_NUDGE
}

enum AuditActorType {
  USER
  ADMIN
  SYSTEM
}

enum AbuseSignalType {
  VELOCITY
  DUPLICATE_CONTENT
  DEVICE_FARM
  IP_CLUSTER
  SUSPICIOUS_PATTERN
}

model User {
  id                    String                @id @default(uuid()) @db.Uuid

  // Existing fields remain unchanged...

  // Engagement profile
  totalXP               Int                   @default(0)
  level                 Int                   @default(1)
  title                 String                @default("Crab Scout")
  currentStreak         Int                   @default(0)
  longestStreak         Int                   @default(0)
  lastActiveDate        DateTime?
  approvedCount         Int                   @default(0)
  totalSubmissions      Int                   @default(0)

  // Relations
  xpTransactions        XPTransaction[]
  userAchievements      UserAchievement[]
  userMissions          UserMission[]
  onboardingProgress    OnboardingProgress[]
  seasonStats           UserSeasonStat[]
  insights              UserInsight[]
  notificationPrefs     NotificationPreference[]
  sentNotifications     NotificationDelivery[] @relation("NotificationRecipient")
  adminAuditLogs        AuditLog[]            @relation("AuditActor")
  abuseSignals          AbuseSignal[]
}

model GamificationRule {
  id                    String         @id @default(uuid())
  actionType            RewardActionType
  name                  String
  description           String
  xpReward              Int
  active                Boolean        @default(true)
  startsAt              DateTime?
  endsAt                DateTime?
  maxPerDay             Int?
  maxPerUserPerDay      Int?
  cooldownHours         Int?
  roleScope             Json?          // ["user","researcher","admin"]
  platformScope         Json?          // ["web","mobile","both"]
  metadata              Json?
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  @@unique([actionType, name])
  @@index([active, actionType])
}

model LevelConfig {
  id                    String         @id @default(uuid())
  level                 Int            @unique
  xpThreshold           Int
  title                 String
  description           String?
  active                Boolean        @default(true)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  @@index([active, xpThreshold])
}

model XPTransaction {
  id                    String           @id @default(uuid())
  userId                String           @db.Uuid
  actionType            RewardActionType
  deltaXP               Int
  sourceType            String           // Observation, Mission, Achievement, Admin
  sourceId              String?
  idempotencyKey        String           @unique
  reason                String?
  metadata              Json?
  createdAt             DateTime         @default(now())

  user                  User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([actionType, createdAt])
}

model Achievement {
  id                    String            @id @default(uuid())
  code                  String            @unique
  name                  String
  description           String
  category              String            // OBSERVATION, SPECIES, QUALITY, EXPLORATION, HIDDEN, SEASONAL
  rarity                String            // COMMON, UNCOMMON, RARE, LEGENDARY
  iconUrl               String?
  requirements          Json              // Condition DSL
  xpReward              Int               @default(0)
  isHidden              Boolean           @default(false)
  isActive              Boolean           @default(true)
  startsAt              DateTime?
  endsAt                DateTime?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  userAchievements      UserAchievement[]

  @@index([isActive, category])
}

model UserAchievement {
  id                    String            @id @default(uuid())
  userId                String            @db.Uuid
  achievementId         String
  earnedAt              DateTime          @default(now())
  awardedByAdminId      String?           @db.Uuid
  isPublic              Boolean           @default(true)
  metadata              Json?

  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement           Achievement       @relation(fields: [achievementId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
  @@index([userId, earnedAt])
}

model Season {
  id                    String            @id @default(uuid())
  code                  String            @unique
  name                  String
  startsAt              DateTime
  endsAt                DateTime
  isActive              Boolean           @default(false)
  description           String?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  seasonStats           UserSeasonStat[]

  @@index([isActive, startsAt, endsAt])
}

model UserSeasonStat {
  id                    String            @id @default(uuid())
  seasonId              String
  userId                String            @db.Uuid
  totalXP               Int               @default(0)
  approvedCount         Int               @default(0)
  totalSubmissions      Int               @default(0)
  currentStreak         Int               @default(0)
  updatedAt             DateTime          @updatedAt

  season                Season            @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([seasonId, userId])
  @@index([seasonId, totalXP])
}

model OnboardingFlow {
  id                    String            @id @default(uuid())
  code                  String            @unique
  version               Int
  name                  String
  active                Boolean           @default(true)
  steps                 Json              // Ordered step definitions
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@unique([code, version])
  @@index([active])
}

model OnboardingProgress {
  id                    String            @id @default(uuid())
  userId                String            @db.Uuid
  flowCode              String
  flowVersion           Int
  stepKey               String
  status                String            // PENDING, COMPLETED, SKIPPED
  completedAt           DateTime?
  metadata              Json?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, flowCode, flowVersion, stepKey])
  @@index([userId, flowCode, flowVersion])
}

model MissionDefinition {
  id                    String            @id @default(uuid())
  code                  String            @unique
  name                  String
  description           String
  cadence               MissionCadence
  criteria              Json              // Condition DSL
  xpReward              Int
  maxClaimsPerUser      Int               @default(1)
  active                Boolean           @default(true)
  startsAt              DateTime?
  endsAt                DateTime?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  userMissions          UserMission[]

  @@index([active, cadence])
}

model UserMission {
  id                    String            @id @default(uuid())
  userId                String            @db.Uuid
  missionId             String
  assignmentDate        DateTime
  progressValue         Float             @default(0)
  targetValue           Float             @default(1)
  status                MissionStatus     @default(ASSIGNED)
  completedAt           DateTime?
  claimedAt             DateTime?
  sourceSnapshot        Json?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  mission               MissionDefinition @relation(fields: [missionId], references: [id], onDelete: Cascade)

  @@unique([userId, missionId, assignmentDate])
  @@index([userId, assignmentDate, status])
}

model Challenge {
  id                    String            @id @default(uuid())
  code                  String            @unique
  name                  String
  description           String
  type                  ChallengeType
  criteria              Json
  reward                Json
  startsAt              DateTime
  endsAt                DateTime
  active                Boolean           @default(true)
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
}

model UserInsight {
  id                    String            @id @default(uuid())
  userId                String            @db.Uuid
  type                  InsightType
  title                 String
  body                  String
  priority              Int               @default(50)
  payload               Json?
  expiresAt             DateTime?
  seenAt                DateTime?
  actedAt               DateTime?
  createdAt             DateTime          @default(now())

  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, priority, createdAt])
}

model NotificationPreference {
  id                    String            @id @default(uuid())
  userId                String            @db.Uuid
  channel               NotificationChannel
  category              String            // MISSION, STREAK, ACHIEVEMENT, ANNOUNCEMENT, REMINDER
  enabled               Boolean           @default(true)
  quietHoursStart       String?
  quietHoursEnd         String?
  timezone              String?
  updatedAt             DateTime          @updatedAt

  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, channel, category])
}

model Campaign {
  id                    String             @id @default(uuid())
  code                  String             @unique
  name                  String
  channel               NotificationChannel
  status                String             // DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, CANCELLED
  audienceFilter        Json
  content               Json
  scheduleAt            DateTime?
  startedAt             DateTime?
  completedAt           DateTime?
  createdByAdminId      String?            @db.Uuid
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  deliveries            NotificationDelivery[]
}

model NotificationDelivery {
  id                    String             @id @default(uuid())
  campaignId            String?
  userId                String             @db.Uuid
  channel               NotificationChannel
  category              String
  title                 String
  body                  String
  payload               Json?
  status                NotificationStatus @default(QUEUED)
  sentAt                DateTime?
  failedAt              DateTime?
  failureReason         String?
  createdAt             DateTime           @default(now())

  campaign              Campaign?          @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  user                  User               @relation("NotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([campaignId, status])
}

model AuditLog {
  id                    String            @id @default(uuid())
  actorType             AuditActorType
  actorId               String?           @db.Uuid
  action                String
  resourceType          String
  resourceId            String?
  beforeState           Json?
  afterState            Json?
  reason                String?
  ipAddress             String?
  userAgent             String?
  createdAt             DateTime          @default(now())

  actor                 User?             @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([resourceType, resourceId])
}

model AbuseSignal {
  id                    String            @id @default(uuid())
  userId                String            @db.Uuid
  type                  AbuseSignalType
  riskScore             Int               // 0..100
  source                String
  summary               String
  metadata              Json?
  resolved              Boolean           @default(false)
  resolvedByAdminId     String?           @db.Uuid
  resolvedAt            DateTime?
  createdAt             DateTime          @default(now())

  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([resolved, riskScore, createdAt])
  @@index([userId, createdAt])
}
```

---

## 5) Shared Contract Files

Create these in `shared/src/types`:

- `gamification.ts`
- `engagement.ts`
- `admin.ts`

Export in `shared/src/index.ts`:

```ts
export * from './types/gamification'
export * from './types/engagement'
export * from './types/admin'
```

Required shared interfaces:

- `UserStatsDto`
- `XPTransactionDto`
- `LeaderboardEntryDto`
- `AchievementDto`, `UserAchievementDto`
- `MissionDto`, `UserMissionDto`
- `OnboardingFlowDto`, `OnboardingStepProgressDto`
- `InsightDto`
- `NotificationPreferenceDto`
- `AdminAuditLogDto`
- `AbuseSignalDto`

---

## 6) API Contracts (Exact Endpoint Set)

Base path: `/api/v1`

### 6.1 Authenticated user endpoints

#### Gamification

- `GET /gamification/stats/me`
  - Response: `{ stats: UserStatsDto }`
- `GET /gamification/xp-history?page=1&limit=20`
  - Response: `{ items: XPTransactionDto[], page: number, total: number }`
- `GET /gamification/leaderboard?scope=ALL_TIME|SEASONAL&seasonId=<id>&page=1&limit=50`
  - Response: `{ items: LeaderboardEntryDto[], page: number, total: number, myRank?: number }`

#### Achievements

- `GET /engagement/achievements`
  - Response: `{ items: AchievementDto[] }`
- `GET /engagement/achievements/unlocked`
  - Response: `{ items: UserAchievementDto[] }`
- `GET /engagement/achievements/:id/progress`
  - Response: `{ achievementId: string, progress: number, target: number, unlocked: boolean }`

#### Missions

- `GET /engagement/missions/today`
  - Response: `{ date: string, items: UserMissionDto[] }`
- `POST /engagement/missions/:userMissionId/claim`
  - Response: `{ claimed: true, xpDelta: number, stats: UserStatsDto }`

#### Onboarding

- `GET /engagement/onboarding/me`
  - Response: `{ flowCode: string, version: number, steps: OnboardingStepProgressDto[] }`
- `POST /engagement/onboarding/steps/:stepKey/complete`
  - Request: `{ metadata?: Record<string, unknown> }`
  - Response: `{ completed: true, stats?: UserStatsDto }`

#### Insights and notifications

- `GET /engagement/insights/me`
  - Response: `{ items: InsightDto[] }`
- `POST /engagement/insights/:id/act`
  - Response: `{ ok: true }`
- `GET /engagement/notification-preferences`
  - Response: `{ items: NotificationPreferenceDto[] }`
- `PATCH /engagement/notification-preferences`
  - Request: `{ items: NotificationPreferenceDto[] }`
  - Response: `{ updated: true }`

### 6.2 Admin endpoints

#### Gamification config

- `GET /admin/gamification/rules`
- `POST /admin/gamification/rules`
- `PATCH /admin/gamification/rules/:id`
- `DELETE /admin/gamification/rules/:id`

- `GET /admin/gamification/levels`
- `POST /admin/gamification/levels`
- `PATCH /admin/gamification/levels/:id`
- `DELETE /admin/gamification/levels/:id`

- `POST /admin/gamification/recalculate`
  - Request: `{ mode: 'dry-run' | 'execute', userId?: string, reason: string }`
  - Response: `{ jobId: string, mode: string }`
- `GET /admin/gamification/recalculate/:jobId`

- `POST /admin/gamification/adjust-xp`
  - Request: `{ userId: string, deltaXP: number, reason: string }`

#### Achievements and missions

- `GET /admin/engagement/achievements`
- `POST /admin/engagement/achievements`
- `PATCH /admin/engagement/achievements/:id`
- `DELETE /admin/engagement/achievements/:id`
- `POST /admin/engagement/achievements/:id/award`

- `GET /admin/engagement/missions`
- `POST /admin/engagement/missions`
- `PATCH /admin/engagement/missions/:id`
- `DELETE /admin/engagement/missions/:id`

#### Seasons and campaigns

- `GET /admin/engagement/seasons`
- `POST /admin/engagement/seasons`
- `PATCH /admin/engagement/seasons/:id`
- `POST /admin/engagement/seasons/:id/activate`

- `GET /admin/campaigns`
- `POST /admin/campaigns`
- `PATCH /admin/campaigns/:id`
- `POST /admin/campaigns/:id/send-test`
- `POST /admin/campaigns/:id/start`
- `POST /admin/campaigns/:id/pause`
- `POST /admin/campaigns/:id/cancel`

#### Risk, audit, moderation

- `GET /admin/security/abuse-signals`
- `POST /admin/security/abuse-signals/:id/resolve`
- `GET /admin/audit-logs`

---

## 7) Server Implementation Layout

### New files

- `server/src/services/rewardEngine.ts`
- `server/src/services/missionService.ts`
- `server/src/services/onboardingService.ts`
- `server/src/services/achievementService.ts`
- `server/src/services/leaderboardService.ts`
- `server/src/services/insightService.ts`
- `server/src/services/campaignService.ts`
- `server/src/services/abuseDetectionService.ts`

- `server/src/controllers/gamificationController.ts`
- `server/src/controllers/engagementController.ts`
- `server/src/controllers/adminEngagementController.ts`

- `server/src/routes/gamificationRoutes.ts`
- `server/src/routes/engagementRoutes.ts`
- `server/src/routes/adminEngagementRoutes.ts`

### Existing files to modify

- `server/src/controllers/observationController.ts`
  - call reward engine on submit/approve/reject
  - update streak and mission progress
- `server/src/controllers/userController.ts`
  - include engagement fields in profile response
- `server/src/index.ts`
  - mount routes
  - seed defaults at startup
- `server/src/utils/schemas.ts`
  - add zod validators for all new contracts

### Reward engine guarantees

1. Every award operation wrapped in Prisma transaction.
2. Every operation requires `idempotencyKey`.
3. Every write emits `XPTransaction` and optional `AuditLog`.
4. Level/streak recalculation performed within same transaction.

---

## 8) Web Implementation Plan

### New pages

- `web/src/app/dashboard/leaderboard/page.tsx`
- `web/src/app/dashboard/achievements/page.tsx`
- `web/src/app/dashboard/missions/page.tsx`

### Admin additions

Extend `web/src/app/dashboard/admin/page.tsx` with a new top-level section: `Engagement`:

- Sub-tabs: `XP Rules`, `Levels`, `Achievements`, `Missions`, `Seasons`, `Campaigns`, `Abuse`, `Audit`

### Shared UX requirements

- Progress bar on dashboard/profile
- Reward feed component (last 10 XP events)
- Daily mission card on dashboard
- Toasts for level-up and achievement unlock

### API client updates

Extend `web/src/lib/api.ts` with typed methods for all endpoints in Section 6.

---

## 9) Mobile Implementation Plan

### New screens

- `mobile/src/screens/gamification/LeaderboardScreen.tsx`
- `mobile/src/screens/gamification/AchievementsScreen.tsx`
- `mobile/src/screens/gamification/MissionsScreen.tsx`
- `mobile/src/screens/gamification/StatsScreen.tsx`

### Existing screens to update

- `mobile/src/screens/home/HomeScreen.tsx`
  - show daily mission + streak card
- `mobile/src/screens/profile/ProfileScreen.tsx`
  - show level/title/XP progress
- `mobile/src/navigation/MainTabs.tsx`
  - add navigation entry for engagement surfaces

### Mobile-specific requirements

- Offline-safe mission UI (read-only cache + retry claim)
- Lightweight leaderboard pagination
- Push notification deep links to relevant screens

---

## 10) Admin Control System (Complete)

### Capabilities

1. **User and role control**
   - block/unblock, soft-delete/restore, role changes, session revoke
2. **Engagement control**
   - rules, levels, achievements, missions, season lifecycle
3. **Campaign control**
   - push/email/in-app campaign composer with segment targeting
4. **Moderation and abuse**
   - risk queue, signal triage, action history
5. **Audit and compliance**
   - immutable audit feed for all admin writes

### Permission model

Add granular admin permissions (can be stored in existing role logic + constants):

- `engagement.read`
- `engagement.write`
- `engagement.recalculate`
- `campaigns.write`
- `security.moderate`
- `audit.read`

### Required safeguards

- Mandatory reason for destructive updates and manual XP adjustments
- Dual confirmation for high-impact actions (season activate, mass recalculation)
- Rate limits on admin mutation endpoints

---

## 11) Analytics and Success Metrics

Track and expose:

- DAU, WAU, MAU, stickiness (DAU/MAU)
- Onboarding completion rate by step
- Mission assignment -> completion -> claim funnel
- 1d/7d/30d retention cohorts
- Approval quality trend vs reward changes
- Notification delivery/open/click rates
- Abuse signal volume and resolution SLA

Data flow:

1. Server emits engagement events to DB.
2. Background jobs aggregate daily summaries.
3. Admin dashboards query aggregate tables + raw drill-down endpoints.

---

## 12) Development Phases

### Phase 0 - Foundation and migration safety

- Add Prisma enums/models from Section 4
- Create migration: `npx prisma migrate dev --name engagement_foundation`
- Seed baseline rules, levels, onboarding flow, mission definitions
- Add feature flags (`ENGAGEMENT_ENABLED`, `MISSIONS_ENABLED`, `SEASONS_ENABLED`)

### Phase 1 - XP, levels, leaderboard, audit

- Implement reward engine + idempotency
- Hook submit/approve events from observation controller
- Build stats/leaderboard/xp-history endpoints
- Add admin rule/level CRUD and audit logging

### Phase 2 - Missions and onboarding

- Implement onboarding progress service
- Implement daily mission assignment + claim
- Add mission/onboarding UI on web and mobile home surfaces
- Add notification preferences endpoint and UI

### Phase 3 - Achievements and seasonal loop

- Implement achievement evaluation and unlock flow
- Implement season model lifecycle and seasonal leaderboard
- Add achievements pages/screens and admin CRUD

### Phase 4 - Campaigns, insights, abuse controls

- Campaign manager (push/email/in-app)
- AI insights endpoint + UI cards
- Abuse signals service + moderation queue

### Phase 5 - Hardening and optimization

- Add recalculation jobs (dry-run + execute)
- Add caching for level configs and leaderboard reads
- Run load tests and tune indexes
- Complete accessibility and perf QA

---

## 13) Testing Plan

### Automated

- `tsc --noEmit` across `shared`, `server`, `web`, `mobile`
- Unit tests for reward engine idempotency and streak logic
- Integration tests for mission claim, achievement unlock, admin adjustments
- Authorization tests for admin-only endpoints

### Manual

- Submit/approve/reject observation and verify XP transactions
- Verify daily missions assignment and claim flow
- Verify leaderboard ordering (all-time and seasonal)
- Verify admin rule changes and audit trail
- Verify push/email campaign scheduling lifecycle

---

## 14) Rollout Strategy

1. Deploy backend with flags off.
2. Seed config and validate admin dashboard in staging.
3. Enable for internal users first.
4. Enable for 10% users, monitor abuse and retention signals.
5. Roll out to 100% after 7-day stable metrics.

Rollback:

- Disable feature flags
- Keep ledger/audit data intact
- Use recalculation job if rule bug affected balances

---

## 15) File Inventory

### New documents

- `.opencode/plans/ENGAGEMENT_PLAN.md` (this file)

### New backend files (planned)

- `server/src/services/rewardEngine.ts`
- `server/src/services/missionService.ts`
- `server/src/services/onboardingService.ts`
- `server/src/services/achievementService.ts`
- `server/src/services/leaderboardService.ts`
- `server/src/services/insightService.ts`
- `server/src/services/campaignService.ts`
- `server/src/services/abuseDetectionService.ts`
- `server/src/controllers/gamificationController.ts`
- `server/src/controllers/engagementController.ts`
- `server/src/controllers/adminEngagementController.ts`
- `server/src/routes/gamificationRoutes.ts`
- `server/src/routes/engagementRoutes.ts`
- `server/src/routes/adminEngagementRoutes.ts`

### New shared files (planned)

- `shared/src/types/gamification.ts`
- `shared/src/types/engagement.ts`
- `shared/src/types/admin.ts`

### New web files (planned)

- `web/src/app/dashboard/leaderboard/page.tsx`
- `web/src/app/dashboard/achievements/page.tsx`
- `web/src/app/dashboard/missions/page.tsx`

### New mobile files (planned)

- `mobile/src/screens/gamification/LeaderboardScreen.tsx`
- `mobile/src/screens/gamification/AchievementsScreen.tsx`
- `mobile/src/screens/gamification/MissionsScreen.tsx`
- `mobile/src/screens/gamification/StatsScreen.tsx`

---

## 16) Definition of Done

- Engagement APIs and contracts are implemented and consumed by web/mobile.
- Admin can fully control rules, levels, missions, achievements, seasons, campaigns.
- All reward writes are idempotent and auditable.
- Abuse detection queue is visible and actionable.
- No monetization features are added.
- All packages pass strict type checks.
