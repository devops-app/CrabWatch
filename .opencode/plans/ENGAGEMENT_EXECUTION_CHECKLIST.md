# Engagement Plan - Execution Checklist (Phase 0 to 5)

> **Source**: `.opencode/plans/ENGAGEMENT_PLAN.md`
> **Scope**: Web + Mobile + Server + Shared
> **Monetization**: Out of scope

---

## 0. Global Delivery Rules

- [ ] Keep all engagement logic server-side (no client-side XP math).
- [ ] Use idempotency keys for every reward write path.
- [ ] Add Zod validation for every new request payload.
- [ ] Add audit log entries for every admin mutation endpoint.
- [ ] Keep feature flags default OFF until Phase 1 verification passes.

---

## 1. Migration Order (Concrete)

Run migrations in this exact order to reduce rollback risk.

### Migration 1 - user engagement fields + enums

- [ ] Update `server/prisma/schema.prisma` with enums:
  - `RewardActionType`, `LeaderboardScope`, `MissionCadence`, `MissionStatus`, `ChallengeType`, `NotificationChannel`, `NotificationStatus`, `InsightType`, `AuditActorType`, `AbuseSignalType`
- [ ] Extend `User` with engagement fields:
  - `totalXP`, `level`, `title`, `currentStreak`, `longestStreak`, `lastActiveDate`, `approvedCount`, `totalSubmissions`
- [ ] Create migration:
  - `npx prisma migrate dev --name engagement_01_user_enums`

### Migration 2 - core gamification tables

- [ ] Add models:
  - `GamificationRule`, `LevelConfig`, `XPTransaction`
- [ ] Add indexes/uniques from plan.
- [ ] Create migration:
  - `npx prisma migrate dev --name engagement_02_core_gamification`

### Migration 3 - progression and retention tables

- [ ] Add models:
  - `Achievement`, `UserAchievement`, `OnboardingFlow`, `OnboardingProgress`, `MissionDefinition`, `UserMission`
- [ ] Create migration:
  - `npx prisma migrate dev --name engagement_03_progression`

### Migration 4 - leaderboard seasons + messaging

- [ ] Add models:
  - `Season`, `UserSeasonStat`, `Challenge`, `UserInsight`, `NotificationPreference`, `Campaign`, `NotificationDelivery`
- [ ] Create migration:
  - `npx prisma migrate dev --name engagement_04_seasons_campaigns`

### Migration 5 - governance and abuse operations

- [ ] Add models:
  - `AuditLog`, `AbuseSignal`
- [ ] Add final indexes (query-path oriented):
  - leaderboard, audit feed, abuse queue, user reward history
- [ ] Create migration:
  - `npx prisma migrate dev --name engagement_05_audit_abuse`

### Post-migration

- [ ] Generate Prisma client:
  - `npx prisma generate`
- [ ] Apply to staging:
  - `npx prisma migrate deploy`
- [ ] Snapshot DB and verify zero destructive diffs in production rollout.

---

## 2. Phase 0 - Foundation and Safety Rails

### 2.1 File-by-file tasks

#### `server/prisma/schema.prisma`
- [ ] Add all final enums and models defined in Engagement Plan.
- [ ] Ensure `User.id` relation types remain consistent (`@db.Uuid`).
- [ ] Ensure all audit/abuse and reward indexes are present.

#### `server/src/config/index.ts`
- [ ] Add feature flags:
  - `ENGAGEMENT_ENABLED`
  - `MISSIONS_ENABLED`
  - `SEASONS_ENABLED`
  - `CAMPAIGNS_ENABLED`
  - `ABUSE_DETECTION_ENABLED`

#### `server/src/index.ts`
- [ ] Register seed startup hooks (idempotent).
- [ ] Mount placeholder route modules (return 501 while feature flags are off).

#### `server/src/services/seedEngagement.ts` (new)
- [ ] Seed default `GamificationRule` rows.
- [ ] Seed default `LevelConfig` rows.
- [ ] Seed base onboarding flow v1.
- [ ] Seed daily mission definitions.

#### `shared/src/types/gamification.ts` (new)
- [ ] Add `UserStatsDto`, `XPTransactionDto`, `LeaderboardEntryDto`, `LevelConfigDto`, `GamificationRuleDto`.

#### `shared/src/types/engagement.ts` (new)
- [ ] Add DTOs for onboarding, missions, achievements, insights, notification preferences.

#### `shared/src/types/admin.ts` (new)
- [ ] Add DTOs for `AuditLog`, `AbuseSignal`, recalculation jobs, campaign operations.

#### `shared/src/index.ts`
- [ ] Export the three new shared type modules.

### 2.2 Gate to exit Phase 0

- [ ] All 5 migrations compile locally.
- [ ] Seed script is idempotent (safe on repeated startup).
- [ ] `tsc --noEmit` passes in `shared` and `server`.

---

## 3. Phase 1 - XP, Levels, Leaderboard, Audit Trail

### 3.1 Server implementation tasks

#### `server/src/services/rewardEngine.ts` (new)
- [ ] Implement `awardXP(params)` with transaction + idempotency.
- [ ] Implement `calculateLevel(totalXP)` using active `LevelConfig`.
- [ ] Implement `updateStreak(userId, activeDate)` logic.
- [ ] Implement `getUserStats(userId)`.
- [ ] Emit `XPTransaction` for every reward change.

#### `server/src/services/leaderboardService.ts` (new)
- [ ] Implement all-time leaderboard query.
- [ ] Implement seasonal leaderboard query fallback.
- [ ] Include rank + pagination + current user rank.

#### `server/src/controllers/observationController.ts`
- [ ] On create observation:
  - award `OBSERVATION_SUBMIT`
  - award `FIRST_OBSERVATION` if first
  - award `NEW_SPECIES` if species first-time for user
  - update streak and submission counters
- [ ] On validation:
  - award `OBSERVATION_APPROVED` to submitter on approve
  - award `VALIDATION` to researcher on approve
  - update `approvedCount`

#### `server/src/controllers/gamificationController.ts` (new)
- [ ] `GET /gamification/stats/me`
- [ ] `GET /gamification/xp-history`
- [ ] `GET /gamification/leaderboard`

#### `server/src/controllers/adminEngagementController.ts` (new)
- [ ] Rules CRUD (`/admin/gamification/rules`).
- [ ] Levels CRUD (`/admin/gamification/levels`).
- [ ] Manual XP adjustment endpoint with reason.

#### `server/src/routes/gamificationRoutes.ts` (new)
- [ ] Add auth-protected user routes.

#### `server/src/routes/adminEngagementRoutes.ts` (new)
- [ ] Add admin-only route group for rules/levels/adjustment.

#### `server/src/utils/schemas.ts`
- [ ] Add zod schemas for stats query, leaderboard pagination, adjustment payloads.

### 3.2 Web tasks

#### `web/src/lib/api.ts`
- [ ] Add typed calls for Phase 1 user and admin gamification endpoints.

#### `web/src/app/dashboard/leaderboard/page.tsx` (new)
- [ ] Render rank table and pagination.
- [ ] Highlight current user.

#### `web/src/app/dashboard/profile/page.tsx`
- [ ] Add level/title/XP card.

#### `web/src/app/dashboard/page.tsx`
- [ ] Add compact engagement card and leaderboard link.

#### `web/src/components/Sidebar.tsx`
- [ ] Add `Leaderboard` nav entry.

#### `web/src/app/dashboard/admin/page.tsx`
- [ ] Add `Engagement -> XP Rules` and `Levels` admin sub-tabs.

### 3.3 Mobile tasks

#### `mobile/src/services/api.ts`
- [ ] Add Phase 1 gamification methods.

#### `mobile/src/screens/profile/ProfileScreen.tsx`
- [ ] Show level, title, progress, streak stats.

#### `mobile/src/screens/gamification/LeaderboardScreen.tsx` (new)
- [ ] Render paginated leaderboard list.

#### `mobile/src/navigation/MainTabs.tsx`
- [ ] Add route entry for leaderboard/stats access path.

### 3.4 Gate to exit Phase 1

- [ ] Submit + approve flow updates XP correctly once only.
- [ ] XP history shows one row per awarded event.
- [ ] Admin can edit rule and it affects subsequent events.
- [ ] `tsc --noEmit` passes for `server`, `web`, `mobile`, `shared`.

---

## 4. Phase 2 - Onboarding and Daily Missions

### 4.1 Server tasks

#### `server/src/services/onboardingService.ts` (new)
- [ ] Resolve active flow/version for user.
- [ ] Track step completion idempotently.
- [ ] Return current step state and completion percentage.

#### `server/src/services/missionService.ts` (new)
- [ ] Daily assignment job (timezone-aware date bucket).
- [ ] Event-based mission progress updates.
- [ ] Claim endpoint awarding `MISSION_COMPLETE` XP.

#### `server/src/controllers/engagementController.ts` (new)
- [ ] `GET /engagement/onboarding/me`
- [ ] `POST /engagement/onboarding/steps/:stepKey/complete`
- [ ] `GET /engagement/missions/today`
- [ ] `POST /engagement/missions/:userMissionId/claim`

#### `server/src/routes/engagementRoutes.ts` (new)
- [ ] Mount onboarding and mission routes.

#### `server/src/jobs/assignDailyMissions.ts` (new)
- [ ] Add scheduled mission assignment runner.

### 4.2 Web tasks

#### `web/src/lib/api.ts`
- [ ] Add onboarding and mission APIs.

#### `web/src/app/dashboard/page.tsx`
- [ ] Add onboarding checklist card.
- [ ] Add daily missions card + claim action.

#### `web/src/app/dashboard/missions/page.tsx` (new)
- [ ] Full mission list with status states.

### 4.3 Mobile tasks

#### `mobile/src/services/api.ts`
- [ ] Add onboarding and mission methods.

#### `mobile/src/screens/home/HomeScreen.tsx`
- [ ] Add mission widget and onboarding progress summary.

#### `mobile/src/screens/gamification/MissionsScreen.tsx` (new)
- [ ] Show daily missions, progress, and claim CTA.

### 4.4 Gate to exit Phase 2

- [ ] New user can complete onboarding steps end-to-end.
- [ ] Mission assignment occurs daily and claim awards XP.
- [ ] Duplicate claim attempts are safely rejected.

---

## 5. Phase 3 - Achievements and Seasonal Loop

### 5.1 Server tasks

#### `server/src/services/achievementService.ts` (new)
- [ ] Evaluate achievement condition DSL.
- [ ] Award once per user (`@@unique` guard).
- [ ] Award `ACHIEVEMENT_UNLOCK` XP and create ledger rows.

#### `server/src/services/leaderboardService.ts`
- [ ] Add season-scoped ranking implementation.

#### `server/src/controllers/engagementController.ts`
- [ ] `GET /engagement/achievements`
- [ ] `GET /engagement/achievements/unlocked`
- [ ] `GET /engagement/achievements/:id/progress`

#### `server/src/controllers/adminEngagementController.ts`
- [ ] Achievements CRUD endpoints.
- [ ] Manual award endpoint.
- [ ] Seasons CRUD and `activate` endpoint.

### 5.2 Web tasks

#### `web/src/app/dashboard/achievements/page.tsx` (new)
- [ ] Category filter + locked/unlocked cards + progress bars.

#### `web/src/app/dashboard/leaderboard/page.tsx`
- [ ] Add scope toggle (all-time/seasonal).

#### `web/src/app/dashboard/admin/page.tsx`
- [ ] Add sub-tabs: `Achievements`, `Seasons`.

#### `web/src/components/Sidebar.tsx`
- [ ] Add `Achievements` nav item.

### 5.3 Mobile tasks

#### `mobile/src/screens/gamification/AchievementsScreen.tsx` (new)
- [ ] Category tabs and badge grid with progress.

#### `mobile/src/screens/gamification/LeaderboardScreen.tsx`
- [ ] Add seasonal scope switch.

#### `mobile/src/screens/gamification/StatsScreen.tsx` (new)
- [ ] Personal stats + featured achievements summary.

### 5.4 Gate to exit Phase 3

- [ ] Achievements auto-unlock with correct conditions.
- [ ] Seasonal leaderboard resets by season and preserves all-time.
- [ ] Admin can create/toggle seasonal and hidden achievements.

---

## 6. Phase 4 - Campaigns, Insights, Notification Preferences, Abuse Queue

### 6.1 Server tasks

#### `server/src/services/campaignService.ts` (new)
- [ ] Campaign lifecycle: draft/schedule/start/pause/cancel.
- [ ] Audience filter resolution and delivery creation.

#### `server/src/services/insightService.ts` (new)
- [ ] Generate and rank next-best-action insights.
- [ ] Mark seen/acted events.

#### `server/src/services/abuseDetectionService.ts` (new)
- [ ] Create abuse signals from velocity/duplicate heuristics.
- [ ] Resolve signal flow and admin moderation hooks.

#### `server/src/controllers/engagementController.ts`
- [ ] `GET /engagement/insights/me`
- [ ] `POST /engagement/insights/:id/act`
- [ ] `GET/PATCH /engagement/notification-preferences`

#### `server/src/controllers/adminEngagementController.ts`
- [ ] Campaign endpoints.
- [ ] Abuse queue list + resolve endpoints.
- [ ] Audit log listing endpoint.

### 6.2 Web tasks

#### `web/src/lib/api.ts`
- [ ] Add campaigns, insights, preferences, abuse queue, audit APIs.

#### `web/src/app/dashboard/admin/page.tsx`
- [ ] Add `Campaigns`, `Abuse`, `Audit` sub-tabs.

#### `web/src/app/dashboard/page.tsx`
- [ ] Add insights card and quick actions.

### 6.3 Mobile tasks

#### `mobile/src/services/api.ts`
- [ ] Add insight + notification preference methods.

#### `mobile/src/screens/home/HomeScreen.tsx`
- [ ] Show insights carousel and mission nudges.

#### `mobile/src/screens/profile/ProfileScreen.tsx`
- [ ] Add notification preference entry point.

### 6.4 Gate to exit Phase 4

- [ ] Admin can run a campaign end-to-end (test -> scheduled -> sent).
- [ ] User preferences are respected by delivery pipeline.
- [ ] Abuse queue receives and resolves signals.

---

## 7. Phase 5 - Hardening, Performance, and Rollout

### 7.1 Server tasks

#### `server/src/services/recalculationService.ts` (new)
- [ ] Implement dry-run recalculation.
- [ ] Implement execute mode with checkpointing.
- [ ] Emit audit logs and job status tracking.

#### `server/src/controllers/adminEngagementController.ts`
- [ ] Add recalculation job create/status endpoints.

#### `server/src/services/leaderboardService.ts`
- [ ] Add cache layer for hot leaderboard queries.

#### `server/src/services/rewardEngine.ts`
- [ ] Add defensive metrics counters and failure alarms.

### 7.2 Web tasks

#### `web/src/app/dashboard/admin/page.tsx`
- [ ] Add recalculation dry-run UI and job progress monitor.
- [ ] Add warning modals for high-impact operations.

### 7.3 Mobile tasks

#### `mobile/src/screens/gamification/*`
- [ ] Add pagination + loading optimizations.
- [ ] Add offline read cache for stats/achievements.

### 7.4 Quality and release tasks

- [ ] Run strict type checks:
  - `pnpm -r tsc --noEmit` (or repo-equivalent)
- [ ] Run integration tests for reward idempotency.
- [ ] Run load test on leaderboard and xp-history endpoints.
- [ ] Validate accessibility and reduced-motion behavior on web/mobile.
- [ ] Roll out via feature flags: internal -> 10% -> 50% -> 100%.

### 7.5 Gate to exit Phase 5

- [ ] No duplicate reward incidents under load.
- [ ] p95 API latency for engagement endpoints within target.
- [ ] Retention dashboard and abuse dashboard fully operational.

---

## 8. Endpoint-to-File Implementation Map

Use this as a coding map while implementing.

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
  - `server/src/services/missionService.ts`
- `/api/v1/engagement/onboarding/me`
  - `server/src/controllers/engagementController.ts`
  - `server/src/services/onboardingService.ts`
- `/api/v1/engagement/achievements`
  - `server/src/controllers/engagementController.ts`
  - `server/src/services/achievementService.ts`
- `/api/v1/admin/campaigns/*`
  - `server/src/routes/adminEngagementRoutes.ts`
  - `server/src/controllers/adminEngagementController.ts`
  - `server/src/services/campaignService.ts`
- `/api/v1/admin/security/abuse-signals`
  - `server/src/controllers/adminEngagementController.ts`
  - `server/src/services/abuseDetectionService.ts`
- `/api/v1/admin/audit-logs`
  - `server/src/controllers/adminEngagementController.ts`
  - `server/src/services/auditService.ts` (optional split)

---

## 9. Final Sign-Off Checklist

- [ ] All Phase 0 to 5 checkboxes completed.
- [ ] `ENGAGEMENT_PLAN.md` and implementation align (no scope drift).
- [ ] No monetization endpoints or schema added.
- [ ] Admin controls audited and permission-gated.
- [ ] Deployment playbook updated with migration and rollback steps.
