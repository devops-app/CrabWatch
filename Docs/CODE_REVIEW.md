# CrabWatch — Code Review

> **Date**: 2026-10-22
> **Scope**: Full monorepo — `server` (Express + Prisma + Azure), `web` (Next.js 15), `mobile` (Expo SDK 54 / RN), `shared`
> **Focus**: Security, authorization, performance, correctness, maintainability
>
> **Fix status (2026-10-22)**: All 🔴 High security (S1–S5), authorization (A1–A4), and 🟠 Performance (P1–P4) findings are addressed on branch `fix/security-issues`. Each finding below carries a **Status** line. `pnpm typecheck` passes across all 4 packages and the server unit suite (12 suites / 140 tests) is green.
>
> **Follow-up (2026-10-23)**: The analytics service + test review (`Review Docs/analytics-service-test-code-review-v2.md`) was cross-referenced against the current code. One real bug (end-date exclusion) was fixed and six test-accuracy findings were addressed; the rest were confirmed invalid or deferred. See the **Analytics Service & Test Review** section.
>
> **Follow-up (2026-10-24)**: The remaining open findings were implemented — race conditions (R1, R3), AI species validation (D1), docs/rate-limit (C1, C2), and maintainability (K1, K2, K3). R2 is moot (endpoint removed in A3). M1 (Redis) and C3 (trust proxy) are deferred as infra decisions. `pnpm typecheck` passes across all 4 packages and the server unit suite (12 suites / 140 tests) is green.

---

## 🔴 Security (High)

### S1 — Web stores JWT in `localStorage`
**File**: `web/src/lib/authStore.ts`

The Zustand `persist` middleware (key `crabwatch-auth`) serializes `token` to `localStorage`, making it readable by any injected script. Any XSS → full account takeover. Mobile does this correctly via `expo-secure-store`.

**Fix**: Move the web token to an `httpOnly` cookie (the server already sets `auth_token` as httpOnly on login) and drop the client-held token from the persisted store.

**Status**: ✅ **Fixed.** Added `partialize: (state) => ({ user: state.user })` to the `persist` config so only the user profile is written to `localStorage` — the JWT is now kept in memory for the active session (sent as a Bearer header) and the httpOnly `auth_token` cookie is the durable mechanism across reloads. The token is no longer readable by XSS. (Mobile already uses `expo-secure-store`.)

### S2 — Invite tokens returned in API response
**File**: `server/src/controllers/inviteController.ts` (`listInvites`)

`listInvites` maps every invite to include `token: i.token`. These are 32-byte redemption tokens; exposing them lets anyone redeem an invite.

**Fix**: Return a masked/partial token (e.g. first 8 chars + `…`) or omit it entirely.

**Status**: ✅ **Fixed.** `listInvites` no longer returns `token` — the field is omitted entirely (stronger than masking). The shared `Invite` type marks `token` optional; it is still returned by the create/resend response where it's needed to build the invite link.

### S3 — 365-day read SAS URLs
**File**: `server/src/controllers/uploadController.ts` (`getUploadUrlHandler`, `uploadPhoto`)

Both handlers mint read SAS URLs valid for **one year**. If a token leaks, the exposure window is a year.

**Fix**: Shorten the TTL (e.g. 1–7 days) and rely on `refreshPhotoUrls`, which already regenerates SAS on every observation fetch.

**Status**: ✅ **Fixed.** Both read-SAS TTLs shortened from 365 days to **1 hour**. This is safe because `refreshPhotoUrls` already regenerates a 1-hour SAS on every observation fetch, so the long-lived token was never required.

### S4 — `data:` URLs bypass the host allowlist
**File**: `server/src/utils/urlValidation.ts` (`isSafeImageUrl`)

`isSafeImageUrl` returns `true` for any `data:` URL before the host check, defeating the intent of the allowlist (used by `foundryAgent.toDataUrl` and `imageQuality.fetchImageBuffer`).

**Fix**: If `data:` isn't a required input, remove the early return. If it is, cap the allowed MIME types and size.

**Status**: ✅ **Fixed.** `isSafeImageUrl` was rewritten:
- `data:` URLs are now restricted to image MIME types (`jpeg|png|webp|heic`) **and** a 20 MB length cap (the 10 MB upload limit is ~13.3 MB base64). `data:text/html` and oversized payloads are rejected.
- Remote URLs must match the **exact** blob origin derived from the configured `BlobEndpoint` (no domain-suffix match, so `evil.blob.core.windows.net` is rejected) **and** must live inside the configured upload container.
- The origin + container prefix are derived from the existing `AZURE_STORAGE_CONNECTION_STRING`, so it works for both production Azure and local Azurite with no extra config.
- Both call sites remain safe: `foundryAgent.toDataUrl` early-returns on `data:` before validation, and `imageQuality.fetchImageBuffer` uses `fetch()` (which supports `data:` URLs).

### S5 — Inconsistent bcrypt cost
**Files**: `server/src/controllers/authController.ts`, `server/src/controllers/userController.ts`

Registration hashes at cost **10**; password reset/change at cost **12**. Same credential, different work factors — weaker accounts created at signup.

**Fix**: Standardize on a single cost (12) across all hashing paths.

**Status**: ✅ **Fixed.** Created a shared helper `server/src/utils/password.ts` exporting `BCRYPT_COST = 12`, `hashPassword`, a timing-safe `verifyPassword` (compares against a pre-computed dummy hash when the stored hash is null, so unknown users take the same time as known ones), and `needsRehash`. All four hashing paths now use it:
- `createUser` (was cost 10) → cost 12
- `resetPassword` / `changeUserPassword` → cost 12
- `login` → transparently re-hashes legacy low-cost hashes on next successful login
Tests updated to assert cost 12.

### False positives (verified, no change needed)

Two findings from the initial pass were re-verified against the route wiring and confirmed to be **false positives** — no code change was made:

- **Invite endpoints "missing authorization"** — `adminRoutes.ts` already applies `requireRole('ADMIN')` to both `createInvite` and `listInvites`. The handlers are only reachable by admins.
- **Upload "anonymous" fallback** — `uploadRoutes.ts` applies `authMiddleware → requireAuth → resolveUser`, so `req.dbUser` is always populated; the `dbUser?.id || 'anon'` fallback is dead code, not an auth bypass.

---

## 🔴 Authorization (High)

### A1 — Analytics endpoints open to every user
**File**: `server/src/routes/analyticsRoutes.ts`

The router applies only `authMiddleware → requireAuth → resolveUser` (no `requireRole`), yet the Swagger on every route says "Researcher/Admin only". Any authenticated `USER` can pull all analytics.

**Fix**: Add `router.use(requireRole('RESEARCHER', 'ADMIN'))`.

**Status**: ✅ **Fixed (docs) — endpoint intentionally left open.** The web `Sidebar` exposes the Analytics page to **all** authenticated users (no role restriction), so adding `requireRole('RESEARCHER', 'ADMIN')` would break the app for standard users. The real defect was the misleading Swagger. All six analytics routes now document `401 Authentication required` and "any authenticated user" instead of the incorrect "Researcher/Admin only" / `403`. If analytics should ever be role-restricted, the web nav must be gated first.

### A2 — Self-validation & re-validation
**File**: `server/src/controllers/observationController.ts` (`validateObservation`)

- Never checks the observation is currently `PENDING` → an approved/rejected record can be re-validated.
- Never blocks a researcher validating their **own** observation → awards `VALIDATION` XP to themselves.

**Fix**: Add `existing.status !== 'PENDING'` guard (409) and `observation.userId === dbUser.id` guard (403).

**Status**: ✅ **Fixed.** Both guards added in `validateObservation` (after the existence check):
- `existing.status !== 'PENDING'` → `409 Conflict` (`observation.alreadyProcessed`) — prevents re-processing/reversing already-validated observations
- `existing.userId === dbUser.id` → `403 Forbidden` (`observation.unauthorized`) — prevents self-approval

### A3 — Mission progress self-exploit
**File**: `server/src/controllers/engagementController.ts` (`updateMissionProgress`)

`POST /engagement/missions/progress` is `requireAuth`-only and accepts an arbitrary `increment`. A user can POST `{ missionCode: 'daily_submit_3', increment: 999 }` and instantly complete the mission and claim its XP without submitting anything. Real progress is already driven server-side in `observationController` (lines 257, 424).

**Fix**: Remove the public increment endpoint, or restrict it to server-verified actions only.

**Status**: ✅ **Fixed.** The public increment endpoint was removed entirely:
- `POST /engagement/missions/progress` route removed from `engagementRoutes.ts`
- `updateMissionProgress` handler removed from `engagementController.ts`
- `updateMissionProgressSchema` removed from `schemas.ts` (and its test block from `schemas.test.ts`)
- Client methods removed from both `web/src/lib/api.ts` and `mobile/src/services/api.ts`

Mission progress is now driven exclusively by server-verified actions in `observationController` (submission + validation).

### A4 — Self role-change / missing existence check
**File**: `server/src/controllers/userController.ts` (`updateUserRole`, `softDeleteUser`)

- `updateUserRole` has no self-check → an admin can demote/delete their own account, locking out admin access.
- Neither `updateUserRole` nor `softDeleteUser` checks the target exists → unknown id → Prisma P2025 → 500 instead of 404.

**Fix**: Add `id === dbUser.id` guard (403) and a `findUnique` existence check (404) before the update.

**Status**: ✅ **Fixed.** `updateUserRole` now enforces, in order:
1. Defensive role validation — unknown role string → `400` (`user.role.invalid`)
2. Self-check — `id === dbUser.id` → `403` (`user.role.self`)
3. Existence check — `findUnique` → `404` (`user.notFound`)
4. **Last-admin guard** — demoting the only active (non-deleted, non-blocked) admin → `409` (`user.role.lastAdmin`)

`softDeleteUser` also gained the `findUnique` existence check (404); it already had the self-check.

---

## 🟠 Performance / Memory (Medium)

### P1 — Unbounded in-memory loads
**Files**: `server/src/services/analytics.ts`, `server/src/controllers/adminController.ts`

- `getDashboardStats` loads up to 50k rows for `statesCovered`.
- `getSizeFrequency` and `getConditionIndices` load **all** approved observations.
- `backupDatabase` / `exportCsv` load all tables/rows + sync gzip.

These will degrade or OOM as data grows.

**Fix**: Push aggregation into SQL (`groupBy`/`count`/`distinct`); stream the backup/CSV to disk.

**Status**: ✅ **Fixed** (with two documented caveats).
- `getSizeFrequency`, `getConditionIndices`, and `getTemporalTrends` now aggregate in SQL (`$queryRaw` with `Prisma.sql` bound parameters — no string concatenation). Only the aggregated rows are returned, never the full observation set. `getConditionIndices` uses `PERCENTILE_CONT`/`STDDEV_POP` in Postgres; `getTemporalTrends` uses `DATE_TRUNC('month', …)`.
- `backupDatabase` streams `JSON → gzip → file` via a `Transform` pipeline with backpressure (`drain`), writing cursor-paginated (1000-row) pages and renaming atomically on success. `exportCsv` streams all three tables the same way, with formula-injection neutralization (`=+-@` prefix) and CSV escaping.
- `getDashboardStats` `statesCovered` read is now **deterministic** (`orderBy: { id: 'asc' }` on the 50k window) but still bounded by the cap. A full fix — persist a normalized `stateCode` at write time and `groupBy` it in SQL — is a schema change and is deferred (tracked here).
- `getCW50` still reads per-observation rows (the cumulative estimator needs them) but the fabricated `cw50 ± 1` confidence interval is replaced by an honest data-derived bracketing interval, and the zero-slope division is guarded. A defensible statistical redesign (logistic regression / bootstrap CI) is deferred (tracked here).
- `getGenderRatio` already used `groupBy` and is unchanged.

### P2 — N+1 in mission jobs
**File**: `server/src/jobs/assignDailyMissions.ts`

For each mission × each user it runs a `findUnique`/`findFirst` + `create`.

**Fix**: Use `createMany` with `skipDuplicates` or a bulk `NOT EXISTS` insert.

**Status**: ✅ **Fixed.** The job now reads users in cursor pages (5000, `orderBy: { id: 'asc' }`) and, per mission, issues a single `createMany({ skipDuplicates: true })` instead of a per-user `findUnique`/`create`. Weekly missions use a UTC Monday `utcWeekStart(now)` anchor so the period is timezone-stable. Errors propagate (no broad `catch` swallowing failures).

### P3 — N+1 in recalculation
**File**: `server/src/services/recalculationService.ts`

One `xPTransaction.findMany` per user.

**Fix**: Batch with a single grouped query (`groupBy: userId`, `_sum: deltaXP`).

**Status**: ✅ **Fixed.** Recalculation now computes every user's correct total in a single `groupBy({ by: ['userId'], _sum: { deltaXP: true } })` — no per-user query. The previous execute path also **corrupted the ledger** by writing an `xPTransaction.create` adjustment row (double-counting on re-run); that is removed. Execute mode now only does `user.update({ totalXP: correctXP })`, and the repaired user list is recorded in the audit `afterState`.

### P4 — Sequential FCM broadcast
**File**: `server/src/controllers/fcmController.ts` (`notifyNewSpecies`)

Loads **all** tokens and sends one-by-one.

**Fix**: Use FCM multicast (500/batch).

**Status**: ✅ **Fixed.** `notifyNewSpecies` pages tokens (1000/cursor) and `sendNewSpeciesAlert` fans out via `messaging.sendEachForMulticast` in 500-token batches, returning an `FcmBroadcastResult` summary (`requested`/`successful`/`failed`/`invalidTokens`). Unregistered/invalid tokens are detected from per-token errors and surfaced for cleanup. (Note: the review's "missing authorization" flag on this route was a false positive — `requireRole` is enforced at the route level.)

---

## 🟠 Analytics Service & Test Review (2026-10-23)

> **Source**: `Review Docs/analytics-service-test-code-review-v2.md` (14 findings). Each was cross-referenced against the current `server/src/services/analytics.ts`, `server/src/services/__tests__/analytics.test.ts`, the Prisma schema, and both clients. Two of the review's own claims were found to be **factually incorrect** (noted below).

### AN1 — End date excluded the final day (real bug)
**File**: `server/src/services/analytics.ts` (`getGenderRatio`, `getSpeciesDistribution`)

`where.createdAt.lte = new Date(dateTo)` pinned the bound to **UTC midnight of the end day**, so every observation created on that day was silently dropped.

**Status**: ✅ **Fixed.** Added a shared `toCreatedAtRange(dateFrom?, dateTo?)` helper that builds a **half-open** range — `gte` = UTC midnight of the start day, `lt` = UTC midnight of the day *after* the end day — and used it in both functions. Tests now assert `lt: new Date('2025-01-01')` for a `2024-12-31` end, and a new `getSpeciesDistribution` date-range test covers the second affected function.

### AN2 — Test-accuracy hardening (F6, F7, F8, F9, F10)
**File**: `server/src/services/__tests__/analytics.test.ts`

- **F8 `statesCovered`** — the loose `>= 1` assertion is now an exact `toBe(2)`. ⚠️ **The review's claimed value of 3 is wrong**: the fixture point `(4.2, 101.9)` matches **no** state rectangle (Pahang's lng range starts at 102.8), so the correct count is 2. Added two edge cases: same-state counts once (`toBe(1)`) and out-of-country → `toBe(0)`.
- **F10 contributor semantics** — pinned that `user.count()` is called with **no filter** (counts all users, not just contributors) plus the `APPROVED`/`PENDING` observation count args, so a future "contributors only" change is deliberate.
- **F7 overflow bin** — renamed to "labels SQL bin 20 as the `20cm+` overflow bucket" and added zero-assertions for non-target bins in both the binning and overflow tests.
- **F6 CW50** — switched to a realistic **overlapping** maturity fixture and strengthened assertions to exact values (`cw50 === 6.5`, CI `[6, 7]`, `lo ≤ cw50 ≤ hi`).
- **F9 ordering** — renamed the two temporal-trends tests to "preserves SQL row order (…)" to reflect that SQL owns ordering.

**Status**: ✅ **Fixed.** `analytics.test.ts` grew from 21 → 24 tests; all pass.

### AN3 — Findings confirmed invalid (no change)
- **F1 "BigInt/Decimal mismatch"** — ❌ **False positive.** Every `COUNT(*)` is cast `::int` → `number`, and `cw`/`bw` are `Float` (`double precision`), so `AVG`/`PERCENTILE_CONT`/`MIN`/`MAX`/`STDDEV_POP` all return `number`. Production already matches the mocks; there is no `JSON.stringify` BigInt risk.
- **F14 single-row `STDDEV` → NULL** — ❌ **Wrong premise.** The query uses `STDDEV_POP`, which returns **0** for a single row (only `STDDEV_SAMP` returns NULL).

### AN4 — Deferred / optional (not implemented)
- **F4** — PostgreSQL integration suite (needs a live/Testcontainers DB; the repo already has an integration pattern).
- **F5** — Return `null` (not `Infinity`) for a male-only ratio and widen `GenderRatioData.ratio` to `number | null`. Low impact: both clients already render non-finite/`null` as "N/A" (web `formatGenderRatio`, mobile `GenderSection`).
- **F11** — Switch `jest.clearAllMocks()` → `resetAllMocks()` + baseline defaults (latent risk only; no leak today).
- **F13** — Typed mocks via `jest-mock-extended` (new dependency).
- **F14** — Remaining coverage gaps (failure paths, whitespace-trim in `toGenderFilter`).

**Verification**: `pnpm typecheck` exit 0 across all 4 packages; server unit suite **12 suites / 140 tests** green (was 137; +3 new analytics tests).

---

## 🟠 Race Conditions (Medium)

### R1 — `createUser` email-uniqueness check-then-create
**File**: `server/src/controllers/userController.ts`

Concurrent duplicate registration → 500 instead of 409.

**Fix**: Rely on the unique constraint and map Prisma P2002 → 409.

**Status**: ✅ **Fixed.** `db.user.create` is now wrapped in a try/catch; a `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` (the unique-constraint race) is mapped to `ConflictError(__('register.emailTaken', 'auth'))` → 409. All other errors re-throw.

### R2 — `updateMissionProgress` completion not atomic
**File**: `server/src/controllers/engagementController.ts`

Two concurrent calls can both pass `!userMission.completedAt`. The `XPTransaction` has an idempotency key, but the separate `user.update({ totalXP: { increment } })` is unprotected → double XP.

**Fix**: Wrap in a transaction keyed on the mission, or use a conditional update (`where: { completedAt: null }`).

**Status**: ✅ **Moot.** The `updateMissionProgress` endpoint was removed in A3 (mission XP self-exploit), so the unprotected `user.update` no longer exists. No code change required.

### R3 — `awardXP` idempotency check-then-create
**File**: `server/src/services/rewardEngine.ts`

A concurrent duplicate can double-award before the unique constraint surfaces.

**Fix**: Use `upsert` or catch P2002 and treat as no-op.

**Status**: ✅ **Fixed.** The `$transaction` is now invoked via a `runTransaction()` helper wrapped in a try/catch; a `P2002` (concurrent duplicate idempotency key) is treated as a no-op — it re-fetches the user and returns the same `{ awarded: false, deltaXP: 0, ... }` shape as the pre-check path, so the first writer wins and no double-award occurs. All other errors re-throw.

---

## 🟠 State / Scaling (Medium)

### M1 — In-memory state breaks horizontal scaling & restarts

| State | Location |
|---|---|
| `sasCache` | `observationController.ts` |
| `activeSessions` | `analysisController.ts` |
| Leaderboard cache | `leaderboardService.ts` |
| Recalculation job map | `recalculationService.ts` |
| Species cache | `utils/cache.ts` |
| `scheduleJob` timers | `index.ts` |

On a multi-instance App Service or after a restart, caches are inconsistent and scheduled mission assignment is lost.

**Fix**: Move to Redis (or DB-backed) if you scale out.

**Status**: ⏸ **Deferred (infra decision).** Requires a Redis (or DB-backed) store and a deployment change; out of scope for this code-only pass. Flagged for a follow-up infra decision.

---

## 🟡 Data Integrity (Medium)

### D1 — AI species name parsed by regex
**File**: `server/src/controllers/analysisController.ts` (`ensureSpeciesExists`)

Derives scientific/common name from the AI's free-text `speciesName`. Malformed output can create junk `Species` rows.

**Fix**: Validate against a strict pattern (e.g. `Genus species`) and quarantine failures for review.

**Status**: ✅ **Fixed.** `ensureSpeciesExists` now extracts the scientific name (the part before the parenthetical common name) and validates it against a strict case-sensitive binomial `^([A-Z][a-z]+ [a-z]+)$` (Capitalized Genus + lowercase epithet). Anything that is not a strict binomial is **quarantined** — logged with the raw `speciesName`/`speciesId` and skipped (no upsert). The previous case-insensitive two-word regex that could admit `scylla serrata` / `Scylla Serrata` is gone.

---

## ⚪ Correctness / Docs (Low)

### C1 — Swagger/code mismatch
- Analytics: Swagger says "Researcher/Admin only" but code has no role check (see A1).
- Observation `update`/`delete`: Swagger says "owner only" but code allows RESEARCHER/ADMIN on any record.

**Status**: ✅ **Fixed.** The analytics Swagger text was corrected in A1 (endpoint intentionally open). The observation `update`/`delete` Swagger summaries now read "owner, or RESEARCHER/ADMIN for any record", matching the actual authorization in `observationController.ts`.

### C2 — `POST /auth/verify` is public, does token crypto, and isn't rate-limited
Minor DoS surface.

**Status**: ✅ **Fixed.** Added a `verifyLimiter` in `index.ts` (15-min window, 30 req/IP in production, 100 in dev, keyed on `req.ip`) applied to `/api/v1/auth/verify`, matching the existing `authLimiter` pattern.

### C3 — `app.set('trust proxy', 'loopback')`
**File**: `server/src/index.ts`

Confirm Azure's front proxy is actually loopback, otherwise `req.ip`-keyed rate limiters may bucket all traffic together or miss the real client IP.

**Status**: ⏸ **Deferred (infra decision).** Requires confirming Azure App Service's front-proxy topology before changing `trust proxy`; a misconfiguration could break `req.ip`-keyed rate limiting. Flagged for a follow-up infra decision.

---

## ⚪ Maintainability (Low)

### K1 — Two FCM code paths
`notificationService.sendPushNotification` does `await import('firebase-admin')` and calls `messaging()` directly (no `UNREGISTERED` token cleanup), while `services/fcm.ts` has the proper handling. Consolidate on the container's firebase instance.

**Status**: ✅ **Fixed.** `sendPushNotification` now calls a new `sendToTokens()` helper in `services/fcm.ts` (container firebase instance) instead of importing `firebase-admin` directly. `sendToTokens` returns per-token results and detects unregistered tokens; `notificationService` then `deleteMany`s the invalid tokens. `isUnregisteredTokenError` was extended to also recognize the direct-send `response.body` `UNREGISTERED` shape.

### K2 — Inline handlers in `engagementRoutes.ts`
Large inline handlers with repeated feature-flag + try/catch boilerplate instead of `asyncHandler`.

**Status**: ✅ **Fixed.** All 11 inline handlers (achievements ×4, insights ×2, social ×2, notification-preferences ×2) were extracted into `asyncHandler`-based controller functions in `engagementController.ts` (`getAchievements`, `getUnlockedAchievements`, `checkAchievements`, `getAchievementProgress`, `getInsights`, `actOnInsight`, `getSocialContributors`, `getSocialStats`, `getNotificationPreferences`, `updateNotificationPreferences`). Each guards the engagement feature flag (501) and resolves the user (401) via a shared `engagementEnabled(res)` helper. `engagementRoutes.ts` is now a thin route table.

### K3 — Duplicated lazy `getPrisma()`/`getConfig()` pattern
The local-init pattern is duplicated across ~10 services; the container already exposes these.

**Status**: ✅ **Fixed.** The local `let _prisma` + `getPrisma()` block was removed from all 10 services (`abuseDetectionService`, `achievementService`, `aiInsightsService`, `analytics`, `campaignService`, `leaderboardService`, `metricsService`, `notificationService`, `recalculationService`, `rewardEngine`) and replaced with the container's `getPrisma()` from `./container`. Now-unused `PrismaClient`/`getContainer` imports were dropped. No circular-import risk — every service already imported from `./container`.

---

## Priority Summary

| Priority | ID | Issue | Status |
|---|---|---|---|
| 🔴 P0 | A3 | Mission XP self-exploit | ✅ Fixed |
| 🔴 P0 | A1 | Analytics missing role check | ✅ Fixed (docs; endpoint intentionally open) |
| 🔴 P0 | A2 | Self-validation / re-validation | ✅ Fixed |
| 🔴 P0 | S1 | Web JWT in localStorage | ✅ Fixed |
| 🔴 P0 | S2 | Invite token leak in API | ✅ Fixed |
| 🔴 P0 | S3 | 365-day SAS URLs | ✅ Fixed |
| 🟠 P1 | A4 | Self role-change / missing 404 | ✅ Fixed |
| 🟠 P1 | S4 | `data:` URL bypass | ✅ Fixed |
| 🟠 P1 | S5 | Inconsistent bcrypt cost | ✅ Fixed |
| 🟠 P1 | P1 | Unbounded in-memory loads | ✅ Fixed (statesCovered + CW50 model caveats noted) |
| 🟠 P1 | AN1 | Analytics end-date excluded final day | ✅ Fixed (half-open range, both functions) |
| 🟠 P1 | AN2 | Analytics test accuracy (F6–F10) | ✅ Fixed (21 → 24 tests) |
| 🟠 P1 | R1 | `createUser` P2002 → 409 | ✅ Fixed |
| 🟠 P1 | R2 | `updateMissionProgress` atomicity | ✅ Moot (endpoint removed in A3) |
| 🟠 P1 | R3 | `awardXP` P2002 no-op | ✅ Fixed |
| 🟠 P1 | M1 | In-memory state / scaling | ⏸ Deferred (infra decision) |
| 🟡 P2 | D1 | AI species name parsing | ✅ Fixed (strict binomial + quarantine) |
| ⚪ P3 | C1 | Swagger/code mismatch | ✅ Fixed |
| ⚪ P3 | C2 | `POST /auth/verify` rate limit | ✅ Fixed |
| ⚪ P3 | C3 | `trust proxy` config | ⏸ Deferred (infra decision) |
| ⚪ P3 | K1 | Two FCM code paths | ✅ Fixed |
| ⚪ P3 | K2 | Inline engagement handlers | ✅ Fixed |
| ⚪ P3 | K3 | Duplicated lazy `getPrisma()` | ✅ Fixed |
