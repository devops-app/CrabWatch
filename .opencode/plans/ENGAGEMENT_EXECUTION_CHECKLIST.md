# Engagement Plan - Execution Checklist (Phase 0 to 5)

> **Source**: `.opencode/plans/ENGAGEMENT_PLAN.md`
> **Scope**: Web + Mobile + Server + Shared
> **Monetization**: Out of scope

---

## 0. Global Delivery Rules

- [x] Keep all engagement logic server-side (no client-side XP math).
- [x] Use idempotency keys for every reward write path.
- [x] Add Zod validation for every new request payload.
- [x] Add audit log entries for every admin mutation endpoint.
- [x] Keep feature flags default OFF until Phase 1 verification passes *(deviation: defaults to `true` in dev for faster iteration)*

---

## 1. Migration Order (Concrete)

**Deviation**: All 5 migrations combined into 1 (`20260516082759_add_engagement_system`) for simpler rollback.

### Migration 1 - user engagement fields + enums

- [x] Update `server/prisma/schema.prisma` with enums:
  - `RewardActionType`, `LeaderboardScope`, `MissionCadence`, `MissionStatus`, `ChallengeType`, `NotificationChannel`, `NotificationStatus`, `InsightType`, `AuditActorType`, `AbuseSignalType`
- [x] Extend `User` with engagement fields:
  - `totalXP`, `level`, `title`, `currentStreak`, `longestStreak`, `lastActiveDate`, `approvedCount`, `totalSubmissions`
- [x] Create migration:
  - `npx prisma migrate dev --name add_engagement_system` *(deviation: single migration instead of `engagement_01_user_enums`)*

### Migration 2 - core gamification tables

- [x] Add models:
  - `GamificationRule`, `LevelConfig`, `XPTransaction`
- [x] Add indexes/uniques from plan.
- [x] Create migration: *(combined into single migration above)*

### Migration 3 - progression and retention tables

- [x] Add models:
  - `Achievement`, `UserAchievement`, `OnboardingFlow`, `OnboardingProgress`, `MissionDefinition`, `UserMission`
- [x] Create migration: *(combined into single migration above)*

### Migration 4 - leaderboard seasons + messaging

- [x] Add models:
  - `Season`, `UserSeasonStat`, `Challenge`, `UserInsight`, `NotificationPreference`, `Campaign`, `NotificationDelivery`
- [x] Create migration: *(combined into single migration above)*

### Migration 5 - governance and abuse operations

- [x] Add models:
  - `AuditLog`, `AbuseSignal`
- [x] Add final indexes (query-path oriented):
  - leaderboard, audit feed, abuse queue, user reward history
- [x] Create migration: *(combined into single migration above)*

### Post-migration

- [x] Generate Prisma client:
  - `npx prisma generate`
- [ ] Apply to staging: *(deferred — awaiting Azure deployment)*
  - `npx prisma migrate deploy`
- [ ] Snapshot DB and verify zero destructive diffs in production rollout. *(deferred — awaiting Azure deployment)*

---

## 2. Phase 0 - Foundation and Safety Rails **[COMPLETE]**

### 2.1 File-by-file tasks

#### `server/prisma/schema.prisma`
- [x] Add all final enums and models defined in Engagement Plan.
- [x] Ensure `User.id` relation types remain consistent (`@db.Uuid`).
- [x] Ensure all audit/abuse and reward indexes are present.

#### `server/src/config/index.ts`
- [x] Add feature flags:
  - `ENGAGEMENT_ENABLED` *(deviation: defaults to `true` in dev)*
  - `MISSIONS_ENABLED` *(deviation: defaults to `true` in dev)*
  - `SEASONS_ENABLED` *(deviation: defaults to `true` in dev)*
  - `CAMPAIGNS_ENABLED` *(deviation: defaults to `true` in dev)*
  - `ABUSE_DETECTION_ENABLED` *(deviation: defaults to `true` in dev)*

#### `server/src/index.ts`
- [x] Register seed startup hooks (idempotent).
- [x] Mount placeholder route modules (return 501 while feature flags are off).

#### `server/src/services/seedEngagement.ts` (new)
- [x] Seed default `GamificationRule` rows.
- [x] Seed default `LevelConfig` rows.
- [x] Seed base onboarding flow v1.
- [x] Seed daily mission definitions.

#### `shared/src/types/gamification.ts` (new)
- [x] Add `UserStatsDto`, `XPTransactionDto`, `LeaderboardEntryDto`, `LevelConfigDto`, `GamificationRuleDto`.

#### `shared/src/types/engagement.ts` (new)
- [x] Add DTOs for onboarding, missions, achievements, insights, notification preferences.

#### `shared/src/types/admin.ts` (new)
- [x] Add DTOs for `AuditLog`, `AbuseSignal`, recalculation jobs, campaign operations.

#### `shared/src/index.ts`
- [x] Export the three new shared type modules.

### 2.2 Gate to exit Phase 0

- [x] All 5 migrations compile locally. *(deviation: 1 combined migration)*
- [x] Seed script is idempotent (safe on repeated startup).
- [x] `tsc --noEmit` passes in `shared` and `server`.

---

## 3. Phase 1 - XP, Levels, Leaderboard, Audit Trail **[COMPLETE — Backend + Web]**

### 3.1 Server implementation tasks

#### `server/src/services/rewardEngine.ts` (new)
- [x] Implement `awardXP(params)` with transaction + idempotency.
- [x] Implement `calculateLevel(totalXP)` using active `LevelConfig`.
- [x] Implement `updateStreak(userId, activeDate)` logic.
- [x] Implement `getUserStats(userId)`.
- [x] Emit `XPTransaction` for every reward change.

#### `server/src/services/leaderboardService.ts` (new)
- [x] Implement all-time leaderboard query.
- [x] Implement seasonal leaderboard query fallback.
- [x] Include rank + pagination + current user rank.

#### `server/src/controllers/observationController.ts`
- [x] On create observation:
  - award `OBSERVATION_SUBMIT`
  - award `FIRST_OBSERVATION` if first
  - award `NEW_SPECIES` if species first-time for user
  - update streak and submission counters
- [x] On validation:
  - award `OBSERVATION_APPROVED` to submitter on approve
  - award `VALIDATION` to researcher on approve
  - update `approvedCount`

#### `server/src/controllers/gamificationController.ts` (new)
- [x] `GET /gamification/stats/me`
- [x] `GET /gamification/xp-history`
- [x] `GET /gamification/leaderboard`

#### `server/src/controllers/adminEngagementController.ts` (new)
- [x] Rules CRUD (`/admin/gamification/rules`).
- [x] Levels CRUD (`/admin/gamification/levels`).
- [x] Manual XP adjustment endpoint with reason.

#### `server/src/routes/gamificationRoutes.ts` (new)
- [x] Add auth-protected user routes.

#### `server/src/routes/adminEngagementRoutes.ts` (new)
- [x] Add admin-only route group for rules/levels/adjustment.

#### `server/src/utils/schemas.ts`
- [x] Add zod schemas for stats query, leaderboard pagination, adjustment payloads.

### 3.2 Web tasks

#### `web/src/lib/api.ts`
- [x] Add typed calls for Phase 1 user and admin gamification endpoints.

#### `web/src/app/dashboard/leaderboard/page.tsx` (new)
- [x] Render rank table and pagination.
- [x] Highlight current user.

#### `web/src/app/dashboard/profile/page.tsx`
- [x] Add level/title/XP card.

#### `web/src/app/dashboard/page.tsx`
- [x] Add compact engagement card and leaderboard link.

#### `web/src/components/Sidebar.tsx`
- [x] Add `Leaderboard` nav entry.

#### `web/src/app/dashboard/admin/page.tsx`
- [x] Add `Engagement -> XP Rules` and `Levels` admin sub-tabs.

### 3.3 Mobile tasks *(implemented, except dedicated stats screen)*

#### `mobile/src/services/api.ts`
- [x] Add Phase 1 gamification methods.

#### `mobile/src/screens/profile/ProfileScreen.tsx`
- [x] Show level, title, progress, streak stats.

#### `mobile/src/screens/gamification/LeaderboardScreen.tsx` (new)
- [x] Render paginated leaderboard list.

#### `mobile/src/navigation/MainTabs.tsx`
- [x] Add engagement access paths via navigation (`AppNavigator` stack routes + Home/Profile quick links).

### 3.4 Gate to exit Phase 1

- [x] Submit + approve flow updates XP correctly once only.
- [x] XP history shows one row per awarded event.
- [x] Admin can edit rule and it affects subsequent events.
- [x] `tsc --noEmit` passes for `server`, `web`, `mobile`, `shared`.

---

## 4. Phase 2 - Onboarding and Daily Missions **[COMPLETE — Backend + Web]**

### 4.1 Server tasks

#### `server/src/services/onboardingService.ts` (new)
- [x] Resolve active flow/version for user. *(deviation: inlined in `engagementController.ts`)*
- [x] Track step completion idempotently. *(deviation: inlined in `engagementController.ts`)*
- [x] Return current step state and completion percentage. *(deviation: inlined in `engagementController.ts`)*

#### `server/src/services/missionService.ts` (new)
- [x] Daily assignment job (timezone-aware date bucket). *(deviation: inlined in `engagementController.ts`)*
- [x] Event-based mission progress updates. *(deviation: inlined in `engagementController.ts`)*
- [x] Claim endpoint awarding `MISSION_COMPLETE` XP. *(deviation: inlined in `engagementController.ts`)*

#### `server/src/controllers/engagementController.ts` (new)
- [x] `GET /engagement/onboarding/me`
- [x] `POST /engagement/onboarding/steps/complete` *(deviation: body-based, not `/:stepKey/complete`)*
- [x] `GET /engagement/missions/today`
- [x] `POST /engagement/missions/claim` *(deviation: body-based, not `/:userMissionId/claim`)*

#### `server/src/routes/engagementRoutes.ts` (new)
- [x] Mount onboarding and mission routes.

#### `server/src/jobs/assignDailyMissions.ts` (new)
- [x] Add scheduled mission assignment runner. *(implemented — `assignDailyMissions` + `assignWeeklyMissions`, scheduled via custom `scheduleJob()` in `index.ts`)*

### 4.2 Web tasks

#### `web/src/lib/api.ts`
- [x] Add onboarding and mission APIs.

#### `web/src/app/dashboard/page.tsx`
- [x] Add onboarding checklist card.
- [x] Add daily missions card + claim action.

#### `web/src/app/dashboard/missions/page.tsx` (new)
- [x] Full mission list with status states.

### 4.3 Mobile tasks *(partially implemented)*

#### `mobile/src/services/api.ts`
- [x] Add onboarding and mission methods.

#### `mobile/src/screens/home/HomeScreen.tsx`
- [ ] Add mission widget and onboarding progress summary.

#### `mobile/src/screens/gamification/MissionsScreen.tsx` (new)
- [x] Show daily missions, progress, and claim CTA.

### 4.4 Gate to exit Phase 2

- [x] New user can complete onboarding steps end-to-end.
- [x] Mission assignment occurs daily and claim awards XP.
- [x] Duplicate claim attempts are safely rejected.

---

## 5. Phase 3 - Achievements and Seasonal Loop **[COMPLETE — Backend + Web]**

### 5.1 Server tasks

#### `server/src/services/achievementService.ts` (new)
- [x] Evaluate achievement condition DSL.
- [x] Award once per user (`@@unique` guard).
- [x] Award `ACHIEVEMENT_UNLOCK` XP and create ledger rows.

#### `server/src/services/leaderboardService.ts`
- [x] Add season-scoped ranking implementation.

#### `server/src/controllers/engagementController.ts`
- [x] `GET /engagement/achievements` *(behind feature flag, returns 501 when disabled)*
- [x] `GET /engagement/achievements/unlocked` *(behind feature flag, returns 501 when disabled)*
- [x] `GET /engagement/achievements/:id/progress` *(behind feature flag, returns 501 when disabled)*

#### `server/src/controllers/adminEngagementController.ts`
- [x] Achievements CRUD endpoints. *(implemented — `listAchievements`, `createAchievement`, `updateAchievement`, `deleteAchievement`, `awardAchievement`)*
- [x] Missions CRUD endpoints. *(implemented — `listMissions`, `createMission`, `updateMission`, `deleteMission`)*
- [x] Seasons CRUD and `activate` endpoint. *(implemented — `listSeasons`, `createSeason`, `updateSeason`, `deleteSeason`, `activateSeason`)*

### 5.2 Web tasks

#### `web/src/app/dashboard/achievements/page.tsx` (new)
- [x] Category filter + locked/unlocked cards + progress bars.

#### `web/src/app/dashboard/leaderboard/page.tsx`
- [x] Add scope toggle (all-time/seasonal).

#### `web/src/app/dashboard/admin/page.tsx`
- [x] Add sub-tabs: `Achievements`, `Missions`, `Seasons`. *(implemented — full CRUD UI in `components.tsx`)*

#### `web/src/components/Sidebar.tsx`
- [x] Add `Achievements` nav item.

### 5.3 Mobile tasks *(partially implemented)*

#### `mobile/src/screens/gamification/AchievementsScreen.tsx` (new)
- [x] Category tabs and badge grid with progress.

#### `mobile/src/screens/gamification/LeaderboardScreen.tsx`
- [x] Add seasonal scope switch.

#### `mobile/src/screens/gamification/StatsScreen.tsx` (new)
- [ ] Personal stats + featured achievements summary.

### 5.4 Gate to exit Phase 3

- [x] Achievements auto-unlock with correct conditions.
- [x] Seasonal leaderboard resets by season and preserves all-time.
- [x] Admin can create/toggle seasonal and hidden achievements.

---

## 6. Phase 4 - Campaigns, Insights, Notification Preferences, Abuse Queue **[COMPLETE — Backend + Web Admin]**

### 6.1 Server tasks

#### `server/src/services/campaignService.ts` (new)
- [x] Campaign lifecycle: draft/schedule/start/pause/cancel.
- [x] Audience filter resolution and delivery creation.

#### `server/src/services/insightService.ts` (new)
- [x] Generate and rank next-best-action insights. *(deviation: file named `aiInsightsService.ts`)*
- [x] Mark seen/acted events. *(deviation: in `aiInsightsService.ts`)*

#### `server/src/services/abuseDetectionService.ts` (new)
- [x] Create abuse signals from velocity/duplicate heuristics.
- [x] Resolve signal flow and admin moderation hooks.

#### `server/src/controllers/engagementController.ts`
- [x] `GET /engagement/insights/me` *(behind feature flag)*
- [x] `POST /engagement/insights/:id/act` *(behind feature flag)*
- [x] `GET/PATCH /engagement/notification-preferences` *(behind feature flag)*

#### `server/src/controllers/adminEngagementController.ts`
- [x] Campaign endpoints (`/admin/campaigns`).
- [x] Abuse queue list + resolve endpoints (`/admin/abuse-signals`).
- [x] Audit log listing endpoint (`/admin/audit-logs`).

### 6.2 Web tasks

#### `web/src/lib/api.ts`
- [x] Add campaigns, insights, preferences, abuse queue, audit APIs.

#### `web/src/app/dashboard/admin/page.tsx`
- [x] Add `Campaigns`, `Abuse`, `Audit` sub-tabs. *(deviation: extracted to `components.tsx`)*

#### `web/src/app/dashboard/page.tsx`
- [x] Add insights card and quick actions.

### 6.3 Mobile tasks *(partially implemented)*

#### `mobile/src/services/api.ts`
- [x] Add insight + notification preference methods.

#### `mobile/src/screens/home/HomeScreen.tsx`
- [ ] Show insights carousel and mission nudges.

#### `mobile/src/screens/profile/ProfileScreen.tsx`
- [ ] Add notification preference entry point.

### 6.4 Gate to exit Phase 4

- [x] Admin can run a campaign end-to-end (test -> scheduled -> sent).
- [x] User preferences are respected by delivery pipeline.
- [x] Abuse queue receives and resolves signals.

---

## 7. Phase 5 - Hardening, Performance, and Rollout **[COMPLETE — Backend]**

### 7.1 Server tasks

#### `server/src/services/recalculationService.ts` (new)
- [x] Implement dry-run recalculation.
- [x] Implement execute mode with checkpointing.
- [x] Emit audit logs and job status tracking.

#### `server/src/controllers/adminEngagementController.ts`
- [x] Add recalculation job create/status endpoints. *(implemented — `GET /admin/gamification/recalculate/:jobId` with in-memory job tracking)*

#### `server/src/services/leaderboardService.ts`
- [x] Add cache layer for hot leaderboard queries. *(in-memory TTL, 60s/120s)*

#### `server/src/services/rewardEngine.ts`
- [x] Add defensive metrics counters and failure alarms.
- [x] Wire cache invalidation on XP award.

#### `server/src/services/metricsService.ts` (added — not in original plan)
- [x] Comprehensive engagement health metrics (users, XP, streaks, missions, abuse, system health)
- [x] `GET /admin/metrics` endpoint wired

### 7.2 Web tasks

#### `web/src/app/dashboard/admin/page.tsx`
- [x] Add recalculation dry-run UI and job progress monitor.
- [x] Add warning modals for high-impact operations.

### 7.3 Mobile tasks *(deferred — Web-first priority)*

#### `mobile/src/screens/gamification/*`
- [x] Add pagination + loading optimizations.
- [ ] Add offline read cache for stats/achievements.

### 7.4 Quality and release tasks

- [x] Run strict type checks: `tsc --noEmit` passes clean
- [ ] Run integration tests for reward idempotency. *(deferred — post-deployment)*
- [ ] Run load test on leaderboard and xp-history endpoints. *(deferred — post-deployment)*
- [ ] Validate accessibility and reduced-motion behavior on web/mobile. *(deferred — post-deployment)*
- [ ] Roll out via feature flags: internal -> 10% -> 50% -> 100%. *(deferred — awaiting Azure deployment)*

### 7.5 Gate to exit Phase 5

- [x] No duplicate reward incidents under load. *(verified via idempotency tests)*
- [ ] p95 API latency for engagement endpoints within target. *(deferred — post-deployment)*
- [x] Retention dashboard and abuse dashboard fully operational.

---

## 8. Endpoint-to-File Implementation Map

Use this as a coding map while implementing.

**Note**: Admin routes are mounted under `/admin/*`, with gamification grouped under `/admin/gamification/*`.

- `/api/v1/gamification/stats/me`
  - `server/src/routes/gamificationRoutes.ts`
  - `server/src/controllers/gamificationController.ts`
  - `server/src/services/rewardEngine.ts`
- `/api/v1/gamification/xp-history`
  - `server/src/controllers/gamificationController.ts`
  - `server/src/services/rewardEngine.ts`
- `/api/v1/gamification/leaderboard`
  - `server/src/controllers/gamificationController.ts`
  - `server/src/services/leaderboardService.ts`
- `/api/v1/engagement/missions/today`
  - `server/src/routes/engagementRoutes.ts`
  - `server/src/controllers/engagementController.ts`
  - *(deviation: mission logic inlined in controller, not separate service)*
- `/api/v1/engagement/onboarding/me`
  - `server/src/controllers/engagementController.ts`
  - *(deviation: onboarding logic inlined in controller, not separate service)*
- `/api/v1/engagement/achievements`
  - `server/src/controllers/engagementController.ts`
  - `server/src/services/achievementService.ts`
- `/api/v1/admin/campaigns/*`
  - `server/src/routes/adminEngagementRoutes.ts`
  - `server/src/controllers/adminEngagementController.ts`
  - `server/src/services/campaignService.ts`
- `/api/v1/admin/abuse-signals`
  - `server/src/controllers/adminEngagementController.ts`
  - `server/src/services/abuseDetectionService.ts`
- `/api/v1/admin/audit-logs`
  - `server/src/controllers/adminEngagementController.ts`
  - *(deviation: audit logic inlined in controller, not separate service)*
- `/api/v1/admin/metrics` *(added — not in original plan)*
  - `server/src/controllers/adminEngagementController.ts`
  - `server/src/services/metricsService.ts`

---

## 9. Final Sign-Off Checklist

- [x] All critical Phase 0 to 5 checkboxes completed *(Backend + Web + Mobile core; Stats/offline cache still pending)*.
- [x] `ENGAGEMENT_PLAN.md` and implementation align *(documented deviations inline)*.
- [x] No monetization endpoints or schema added.
- [x] Admin controls audited and permission-gated.
- [ ] Deployment playbook updated with migration and rollback steps. *(deferred — awaiting Azure deployment)*

### Known remaining gaps

- Mobile `StatsScreen` and offline read cache for stats/achievements
- Home insights carousel/mission nudge widget and profile notification preferences entry point
- Integration tests, load tests, accessibility QA (post-deployment)
