# Engagement System - Implementation Plan

> **Status**: Phase 0-5 Complete (Backend + Web), Mobile Core Gamification Implemented (Stats pending)
> **Created**: 2026-05-16
> **Last Updated**: 2026-05-16
> **Priority**: Server foundation -> Web admin -> Mobile parity
> **Scope**: Engagement and retention only (no monetization)
>
> **Deviations from original plan** (see bottom of each section):
> - Feature flags default `true` in dev (plan: `false`) — intentional for faster iteration
> - Single migration (`add_engagement_system`) instead of 5 — simpler rollback
> - Admin routes mounted under `/admin/*` with grouped `/gamification/*` endpoints (plan: scattered paths)
> - `missionService`/`onboardingService` inlined in controller (plan: separate files)
> - `aiInsightsService.ts` instead of `insightService.ts`
> - `community/page.tsx` added (not in plan) — combines insights + social + stats
> - Mobile gamification implemented for Leaderboard/Missions/Achievements; `StatsScreen` still pending

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
- `GET /engagement/achievements/check` *(added — bulk progress check)*
  - Response: `{ items: AchievementProgressDto[] }`

#### Missions

- `GET /engagement/missions/today`
  - Response: `{ date: string, items: UserMissionDto[] }`
- `POST /engagement/missions/claim` *(changed from `/:userMissionId/claim` — body-based)*
  - Request: `{ userMissionId: string }`
  - Response: `{ claimed: true, xpDelta: number, stats: UserStatsDto }`
- `POST /engagement/missions/progress` *(added — event-based progress update)*

#### Onboarding

- `GET /engagement/onboarding/me`
  - Response: `{ flowCode: string, version: number, steps: OnboardingStepProgressDto[] }`
- `POST /engagement/onboarding/steps/complete` *(changed from `/:stepKey/complete` — body-based)*
  - Request: `{ stepKey: string, metadata?: Record<string, unknown> }`
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

#### Social *(added — not in original plan)*

- `GET /engagement/social/contributors`
  - Response: `{ items: TopContributorDto[] }`
- `GET /engagement/social/stats`
  - Response: `{ stats: SocialStatsDto }`

### 6.2 Admin endpoints

**Note**: Admin routes are mounted under `/admin/*`, with gamification grouped under `/admin/gamification/*`.

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
  - Response: `{ mode: string, results: RecalculationResult[] }`
- `GET /admin/gamification/recalculate/:jobId` *(implemented — in-memory job status tracking)*

- `POST /admin/gamification/adjust-xp`
  - Request: `{ userId: string, deltaXP: number, reason: string }`

#### Achievements *(implemented — backend only, web admin UI deferred)*

- `GET /admin/achievements`
- `POST /admin/achievements`
- `PATCH /admin/achievements/:id`
- `DELETE /admin/achievements/:id`
- `POST /admin/achievements/:id/award`

#### Missions *(implemented — backend only, web admin UI deferred)*

- `GET /admin/missions`
- `POST /admin/missions`
- `PATCH /admin/missions/:id`
- `DELETE /admin/missions/:id`

#### Seasons *(implemented — backend only, web admin UI deferred)*

- `GET /admin/seasons`
- `POST /admin/seasons`
- `PATCH /admin/seasons/:id`
- `DELETE /admin/seasons/:id`
- `POST /admin/seasons/:id/activate`

#### Campaigns *(path changed from `/admin/campaigns/*`)*

- `GET /admin/campaigns`
- `POST /admin/campaigns`
- `PATCH /admin/campaigns/:id/status` *(unified — replaces separate start/pause/cancel)*
- `POST /admin/campaigns/:id/launch` *(renamed from `start`)*
- `GET /admin/campaigns/:id` *(added — single campaign detail)*
- `DELETE /admin/campaigns/:id` *(added — campaign deletion)*
- `POST /admin/campaigns/:id/send-test` *(implemented)*

#### Risk, audit, moderation *(path changed from `/admin/security/*`, `/admin/audit-logs`)*

- `GET /admin/abuse-signals`
- `PATCH /admin/abuse-signals/:id/resolve` *(changed from POST)*
- `GET /admin/audit-logs`
- `GET /admin/audit-logs/stats` *(added — summary stats)*

#### Metrics *(added — not in original plan)*

- `GET /admin/metrics`
  - Response: `{ metrics: EngagementMetricsDto }`

---

## 7) Server Implementation Layout

### New files

- `server/src/services/rewardEngine.ts`
- `server/src/services/missionService.ts` *(deviation: inlined in `engagementController.ts`)*
- `server/src/services/onboardingService.ts` *(deviation: inlined in `engagementController.ts`)*
- `server/src/services/achievementService.ts`
- `server/src/services/leaderboardService.ts`
- `server/src/services/aiInsightsService.ts` *(deviation: plan said `insightService.ts`)*
- `server/src/services/campaignService.ts`
- `server/src/services/abuseDetectionService.ts`
- `server/src/services/notificationService.ts` *(added — not in plan)*
- `server/src/services/recalculationService.ts` *(added — Phase 5 hardening)*
- `server/src/services/metricsService.ts` *(added — Phase 5 hardening)*
- `server/src/services/seedEngagement.ts`

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
- `web/src/app/dashboard/community/page.tsx` *(added — combines insights, social contributors, and stats)*

### Admin additions

Extend `web/src/app/dashboard/admin/page.tsx` with a new top-level section: `Engagement`:

- Sub-tabs: `XP Rules`, `Levels`, `Adjustments`, `Recalculation`, `Campaigns`, `Audit Log`, `Abuse Detection`
- `Achievements`, `Missions`, `Seasons` admin sub-tabs *(implemented — full CRUD with create/edit/delete forms)*
- Admin engagement components extracted to `web/src/app/dashboard/admin/components.tsx` *(deviation: plan said inline in admin/page.tsx)*

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

- `mobile/src/screens/gamification/LeaderboardScreen.tsx` *(implemented)*
- `mobile/src/screens/gamification/AchievementsScreen.tsx` *(implemented)*
- `mobile/src/screens/gamification/MissionsScreen.tsx` *(implemented)*
- `mobile/src/screens/gamification/StatsScreen.tsx` *(pending)*

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

### Phase 0 - Foundation and migration safety **[COMPLETE]**

- Add Prisma enums/models from Section 4
- Create migration: `npx prisma migrate dev --name add_engagement_system` *(deviation: single migration instead of 5)*
- Seed baseline rules, levels, onboarding flow, mission definitions
- Add feature flags (`ENGAGEMENT_ENABLED`, `MISSIONS_ENABLED`, `SEASONS_ENABLED`) *(deviation: defaults to `true` in dev)*

### Phase 1 - XP, levels, leaderboard, audit **[COMPLETE]**

- Implement reward engine + idempotency
- Hook submit/approve events from observation controller
- Build stats/leaderboard/xp-history endpoints
- Add admin rule/level CRUD and audit logging
- Web: leaderboard page, dashboard engagement card, profile stats

### Phase 2 - Missions and onboarding **[COMPLETE — Backend + Web + Mobile Core]**

- Implement onboarding progress service *(deviation: inlined in engagementController.ts)*
- Implement daily mission assignment + claim
- Add mission/onboarding UI on web home surfaces
- Add notification preferences endpoint and UI
- Mobile missions UI *(implemented in `MissionsScreen.tsx`; onboarding tab included)*

### Phase 3 - Achievements and seasonal loop **[COMPLETE — Backend + Web + Mobile Core]**

- Implement achievement evaluation and unlock flow
- Implement season model lifecycle and seasonal leaderboard
- Add achievements pages on web *(admin CRUD deferred)*
- Mobile achievements screen *(implemented in `AchievementsScreen.tsx`)*

### Phase 4 - Campaigns, insights, abuse controls **[COMPLETE — Backend + Web Admin]**

- Campaign manager (push/email/in-app)
- AI insights endpoint + UI cards *(community page)*
- Abuse signals service + moderation queue
- Notification service *(added — not in original plan)*

### Phase 5 - Hardening and optimization **[COMPLETE — Backend]**

- Add recalculation jobs (dry-run + execute) via `recalculationService.ts`
- Add caching for leaderboard reads (in-memory TTL, 60s/120s)
- Add `metricsService.ts` for engagement health monitoring
- Add `GET /admin/metrics` endpoint
- Wire cache invalidation in `rewardEngine.ts` and admin XP adjustments
- Load tests, accessibility, perf QA *(deferred — post-deployment)*

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

### New backend files (created)

- `server/src/services/rewardEngine.ts`
- `server/src/services/achievementService.ts`
- `server/src/services/leaderboardService.ts`
- `server/src/services/aiInsightsService.ts` *(plan: `insightService.ts`)*
- `server/src/services/campaignService.ts`
- `server/src/services/abuseDetectionService.ts`
- `server/src/services/notificationService.ts` *(added)*
- `server/src/services/recalculationService.ts` *(added)*
- `server/src/services/metricsService.ts` *(added)*
- `server/src/services/seedEngagement.ts`
- `server/src/controllers/gamificationController.ts`
- `server/src/controllers/engagementController.ts`
- `server/src/controllers/adminEngagementController.ts`
- `server/src/routes/gamificationRoutes.ts`
- `server/src/routes/engagementRoutes.ts`
- `server/src/routes/adminEngagementRoutes.ts`

### Backend files NOT created (plan deviation)

- `server/src/services/missionService.ts` *(inlined in engagementController.ts)*
- `server/src/services/onboardingService.ts` *(inlined in engagementController.ts)*
- `server/src/jobs/assignDailyMissions.ts` *(implemented — scheduled via custom scheduler in `index.ts`)*

### New shared files (planned)

- `shared/src/types/gamification.ts`
- `shared/src/types/engagement.ts`
- `shared/src/types/admin.ts`

### New web files (created)

- `web/src/app/dashboard/leaderboard/page.tsx`
- `web/src/app/dashboard/achievements/page.tsx`
- `web/src/app/dashboard/missions/page.tsx`
- `web/src/app/dashboard/community/page.tsx` *(added)*
- `web/src/app/dashboard/admin/components.tsx` *(extracted from admin/page.tsx)*

### New mobile files

- `mobile/src/screens/gamification/LeaderboardScreen.tsx` *(implemented)*
- `mobile/src/screens/gamification/AchievementsScreen.tsx` *(implemented)*
- `mobile/src/screens/gamification/MissionsScreen.tsx` *(implemented)*
- `mobile/src/screens/gamification/StatsScreen.tsx` *(pending)*

---

## 16) Definition of Done

### Current State (Phase 0-5 Backend + Web + Mobile Core)

- [x] Engagement APIs implemented and consumed by web
- [x] Admin can fully control rules, levels, achievements, missions, seasons, campaigns, abuse signals, audit logs
- [x] All reward writes are idempotent and auditable
- [x] Abuse detection queue is visible and actionable
- [x] No monetization features are added
- [x] All packages pass strict type checks (`tsc --noEmit`)
- [x] Leaderboard caching with TTL (60s/120s) + invalidation on XP changes
- [x] XP recalculation with dry-run/execute modes
- [x] Engagement metrics endpoint for health monitoring

### Remaining (deferred)

- [ ] Mobile `StatsScreen` and deeper mobile parity polish
- [ ] Load tests, accessibility, perf QA (post-deployment)
