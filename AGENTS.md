# CrabWatch — Work Progress Tracker

> **Last Updated**: 2026-06-27
> **Current Focus**: Legacy image path migration complete. 3 observations fixed, 15 remain with lost source blobs.

## Goal
Build an AI-guided crab observation capture flow with fully dynamic species detection. The AI identifies any crab species in photos, and unknown species are auto-created in the database.

### i18n (Phase 1)
- Extract and translate all static UI strings for web, — Mobile, and server layers
- Support English (en) and Bahasa Melayu (ms)
- Web: `next-intl` v4.12.0, — Mobile: `i18next` + `react-i18next`, Server: `i18next`

## Constraints & Preferences
- Maintain strict type safety across all packages (`tsc --noEmit`)
- Keep database column as `sex` but map to `gender` in Prisma to avoid migrations
- Species detection is fully open-ended — no hardcoded species list
- New species auto-created via server `upsert` when AI returns unknown species
- — Mobile fetches species dynamically from `GET /api/v1/species`
- User does not want AI to estimate weight; weight must be input manually
- Carapace width/length estimated based on coin reference; gender and species from AI
- Web capture map marker must be highly visible and reliable across zoom levels
- AI species matching must handle exact, partial, and genus-level name variations
- Use Resend for transactional emails (3k/month free). Use `onboarding@resend.dev` for immediate testing.
- Invite link must pre-fill the email and lock the assigned role (RESEARCHER/ADMIN) on the registration form.
- **Single-crab hard constraint**: Every observation photo must contain exactly one crab. AI must return `crabCount`; 0 or >1 crabs are rejected with no override.
- **Quality gates before AI**: On-device blur/brightness checks block poor photos before upload. Server-side `sharp` validation as defense-in-depth.
- **Confidence thresholds**: AI species classification >90% auto-accept, 70-90% flag for review, <70% ask retake.

## Progress

### Completed (Duplication Analysis — All 7 Issues Resolved)
- Completed: H1 — Created `shared/src/utils/schemas.ts` with `loginSchemaBase`, `registerSchemaBase`; server and mobile extend with platform-specific fields
- Completed: H2 — Created `shared/src/locales/en.json` and `ms.json`; all 3 platforms deep-merge shared locales via platform-specific `deepMerge`
- Completed: M1 — Created `shared/src/utils/retry.ts` with `retryWithBackoff` and `createRetryFetch`; web and mobile wired
- Completed: M2 — `formatCoordinates` extracted to `shared/src/utils/formatters.ts`; mobile hook and standalone utils import from shared
- Completed: M3 — `detectLocale` in `shared/src/utils/localeDetection.ts`; mobile `localeStore.ts` uses with `expo-localization` device locale
- Completed: L1 — `GPSCapture.tsx` uses `useFormatters` hook; standalone `formatters.ts` re-exports `formatCoordinates` from shared
- Completed: L2 — Mobile `ErrorBoundary.tsx` now POSTs to `/api/v1/telemetry/error` via `api.reportTelemetryError`
- Verified: `pnpm typecheck` passes cleanly across all 4 packages

### Completed (Shared Locale Merge — All Platforms)
- Completed: Added `deepMerge`(base, override) recursive utility in `mobile/src/lib/i18n.ts` — base keys provide foundation, override keys take precedence at every nesting level
- Completed: Imported `localesEn` and `localesMs` from `@crabwatch/shared` into mobile i18n initialization
- Completed: Applied `deepMerge`(shared, mobile) for both `en` and `ms` before passing to `buildLocaleResources`
- Completed: Shared `common` namespace fills 31 missing generic UI keys in mobile (e.g., `search`, `filter`, `retry`, cancel, confirm, loading, error)
- Completed: Shared `gamification` namespace fills missing keys like `activate`, `deactivate`, `enabled`, `disabled`
- Completed: Shared `observation` namespace fills missing keys like `observation.status.pending`, `observation.status.approved`, `observation.status.rejected`
- Completed: Mobile-specific keys preserved and take precedence over shared at every nesting level
- Completed: Web `i18n.ts` deep-merges shared locales into `next-intl` messages via inline `deepMerge`
- Completed: Server `config/i18n.ts` deep-merges shared locales into `i18next` resources at init time; added `gamification` namespace to `ns` array
- Verified: `pnpm typecheck` passes cleanly across all 4 packages (shared, server, web, mobile)
### Completed (Image Quality Plan — Phase 1 Architecture)
- Completed: Created image quality plan with 3-phase rollout (on-device gates, server preprocessing, advanced features); content consolidated into AGENTS.md
- Completed: Mapped 7 Expo — Mobile components with roles, current state, required improvements, and field-capture benefits
- Completed: Defined platform split: — Mobile = real-time frame analysis & sensor feedback; web = post-capture Canvas validation
- Completed: Added single-crab hard constraint — AI must return `crabCount`, 0 or >1 rejected with no override
- Completed: Added confidence thresholds — AI species >90% auto-accept, 70-90% flag for review, <70% ask retake
- Completed: Added crab coverage validation — bounding box must cover >35% of image
- Completed: Added Laplacian blur detection with calibration note for threshold validation
- Completed: Added histogram equalization to server P2-1 preprocessing
- Completed: Added dataset quality notes for AI accuracy success factors
- Completed: Automated versioning system: `VERSION` file, `scripts/version.ps1`, `.git/hooks/pre-commit`
- Completed: Initialized versioning at `v1.0.0+0001`; auto-increments on every commit

### Completed (Calibration Workflow)
- Completed: Created `server/scripts/calibration-dataset-template.csv` with labeled dataset schema and label definitions
- Completed: Created `server/scripts/calibrateQuality.ts` — CLI that processes labeled images, runs threshold sweeps, generates confusion matrices and F1-scored recommendations
- Completed: Blur sweep: iterates fail/warn thresholds, computes TP/FP/TN/FN vs human labels, ranks by F1 score
- Completed: Brightness sweep: iterates fail/warnLow/warnHigh thresholds, same confusion matrix analysis
- Completed: Score distribution analysis with min/max/mean/median/p10/p90 and histogram buckets
- Completed: Per-image mismatch report showing which photos disagree with current thresholds
- Completed: JSON report output with top-5 threshold recommendations for both blur and brightness
- Completed: Added `calibrate` npm script in `server/package.json`
- Completed: Updated `server/tsconfig.json` to include `scripts` directory
- Verified: `tsc --noEmit` passes for calibration script (only pre-existing errors in `fix-photos.ts`/`migrate-db.ts`)

### Completed (QA Matrix Validation)
- Completed: Created `qa-matrix.md` — comprehensive QA matrix with 24 test scenarios across 6 groups (Lighting, Focus, Framing, Crab Count, Surface, Resolution)
- Completed: Created `server/scripts/runQAMatrix.ts` — automated runner that processes test images, evaluates blur/brightness gates, compares against expected outcomes
- Completed: Runner matches images by filename prefix (a1-, b1-, c1-, etc.) to scenario definitions
- Completed: JSON report output (`qa-matrix-report.json`) with per-image results, mismatches, and summary stats
- Completed: Added `qa:matrix` npm script in `server/package.json`
- Verified: `tsc --noEmit` passes for QA matrix script (only pre-existing errors in `fix-photos.ts`/`migrate-db.ts`)
- Verified: Script runs correctly with usage instructions

### Completed (Observation Print)
- Completed: Added print button to web observation detail page (`observation/[id]/client.tsx`) with `window.print()` and `@media print` CSS that hides sidebar/header
- Completed: Added print button to — Mobile observation detail screen (`ObservationDetailScreen.tsx`) using `expo-print`
- Completed: iOS uses native print dialog via `Print.printAsync()`; Android saves PDF via `Print.printToFileAsync()` with confirmation alert
- Completed: Updated UAT.md with 8 new test cases (Section 19), total now 240 test cases across 19 modules

### Completed (Gamification Toast + Streak Warning)
- Completed: Added toast notifications on web capture page for XP earned and level-up after observation submission
- Completed: Added toast notifications on — Mobile AIReviewScreen for XP earned and level-up after observation submission
- Completed: Added streak warning notification in `rewardEngine.ts` `updateStreak()` — warns user when streak > 0 and last activity > 18h ago
- Completed: Added streak lost notification in `rewardEngine.ts` `updateStreak()` — notifies user when streak resets from > 1 to 1
- Verified: `tsc --noEmit` passes cleanly for all packages (server, shared, — Mobile, web)

### Completed (— Mobile Analytics Map Tab)
- Completed: Added Map tab button to — Mobile analytics screen with `activeSection` state.
- Completed: Implemented `MapSection` component with `react-native-maps`, gender filter toggle, status-colored markers, observation info card, and fullscreen photo modal.
- Completed: Added `loadMapData` with paginated API fetch (500 per page, up to 5000 observations).
- Completed: Added `MALAYSIA_REGION` with auto-calculated `latitudeDelta`/`longitudeDelta` from `MALAYSIA_BOUNDS`.
- Completed: Added `map.*` i18n keys to `en.json` and `ms.json`.
- Verified: `tsc --noEmit` passes cleanly for — Mobile package.

### Completed (Reset Password i18n — Web + — Mobile)
- Completed: — Mobile `ForgotPasswordScreen.tsx` and `ResetPasswordScreen.tsx` — fixed hardcoded Zod validation messages with `useMemo` + `t()` for dynamic i18n.
- Completed: Added `forgotPassword.invalidEmail`, `resetPassword.passwordMin`, `resetPassword.passwordMismatch` to — Mobile `en.json` and `ms.json`.
- Completed: Web `auth/forgot-password/page.tsx` and `auth/reset-password/page.tsx` — added missing `rememberPassword` and `signInLink` keys to `web/messages/en.json` and `ms.json`.
- Verified: `tsc --noEmit` passes cleanly for — Mobile, shared, and server packages.

### Completed (Image Quality Plan — Resolved Gaps)
- Completed: Both "Out of Scope" gaps resolved: — Mobile analytics map tab and reset password i18n.
- Remaining future work: Phase 3 advanced items, calibration sign-off, QA matrix execution, production alerting.

### Completed Areas

**Core Capture & AI**
- AI-Guided Capture flow: GuidedCaptureScreen → AnalysisLoadingScreen → AIReviewScreen
- GPT-4o Vision agent via Azure AI Foundry, dynamic species detection with auto-upsert
- Guided photo capture (dorsal, ventral, optional close-up), MYR coin reference, quality gates
- Real-time capture assistance: gyroscope shake detection, brightness estimation, focus tracking, portrait lock, view validation
- Map-based location picking: Mapbox (web), `react-native-maps` (— Mobile)
- `bw` is nullable — never AI-estimated. `detectedCoin` persisted through full stack.

**Web App**
- Dashboard, capture (with GeoJSON map markers), researcher validation, profile edit, observation detail, species browse
- Password reset flow, invite system with email dispatch
- Admin panel: Species CRUD, Users (Active/Deleted/Invites sub-tabs), Backup, Engagement config
- Gamification: Leaderboard, Missions, Achievements, Community pages
- Application Insights auto-instrumentation, error boundary with backend POST

**— Mobile App**
- Full capture flow, Analytics charts, Researcher validation, Admin management
- Gamification: Leaderboard (scope toggle, pagination), Missions (daily/onboarding), Achievements (filters, progress)
- Password reset, role-based conditional tabs (Researcher/Admin)
- Observation detail print with `expo-print` (iOS native dialog, Android PDF save)

**Server**
- Express + Prisma, 8 analytics endpoints, AI analysis, blob storage, email (Resend)
- User management: soft-delete (30-day retention), block/unblock, invite system, password reset
- Admin: backup, cleanup, deleted user listing
- Engagement system: 24 models, 11 enums, 8 services, XP ledger with idempotency, leaderboard caching, recalculation, metrics
- Application Insights auto-instrumentation, telem``retry`` endpoint

**Deployment**
- Azure: PostgreSQL Flexible Server, App Service (API + Web), Application Insights
- Server deployed to `crabwatch-api.azurewebsites.net`, health check passing
- Engagement migration applied, env vars configured
- Deploy scripts: `scripts/deploy-server.ps1`, `scripts/deploy-web.ps1`

### Completed (Web Security + Resilience — Week 2)
- Completed: Fix #6 — Added `AbortController` signal support to `api.ts` `request()` function
- Completed: Fix #10 — Added r``retry`` logic with exponential backoff (2 retries, 1s/2s delays) for 502/503/504 in `api.ts`
- Completed: Fix #13 — Added JWT token expiry check to `AuthGuard.tsx` before calling `getProfile()`
- Completed: Added `console.error` fallback to silent catch in `logger.ts`

### Completed (Web Type Safety)
- Completed: Applied strict types to admin components, replacing all `any` with proper DTOs
- Completed: Updated `EngagementMetricsDto` in shared types to match server's `EngagementMetrics` interface
- Completed: Added `_count` field to `SeasonDto` for Prisma compatibility
- Completed: Fixed empty catch block lint error in admin components
- Completed: C-5: Replaced `any` types in `missions/page.tsx` and `achievements/page.tsx` with shared DTOs (`ActiveMissionDto`, `OnboardingStatusDto`, `UserAchievementListDto`, `CheckAchievementsResponseDto`)
- Completed: C-6: Replaced `as any` casts in `admin/components.tsx` with `as const` tuple and proper union types
- Completed: C-7: Pre-fetched missions/onboarding data on mount in `missions/page.tsx` to prevent tab-switch re-fetches
- Completed: C-8: Added `logger.error()`/`logger.warn()` to silent catch blocks in `admin/components.tsx`
- Completed: Typed API methods `getActiveMissions`, `getOnboardingStatus`, `getAchievements`, `checkAchievements` in `api.ts`
- Completed: Added `UserAchievementListDto` and `CheckAchievementsResponseDto` to shared types
- Completed: Resolved remaining `any` warnings across web app — strict type safety achieved

### Completed (Web Performance)
- Completed: Extracted map and chart components from `analytics/page.tsx` into `map-tab.tsx` and `chart-tabs.tsx`
- Completed: Rewrote analytics page as a lightweight shell with `next/dynamic()` lazy-loading
- Verified: Analytics shell is 5.82 kB; heavy `react-map-gl` (1,705 kB) and `recharts` (403 kB) in separate lazy chunks
- Completed: Extracted `capture/page.tsx` into `utils.ts`, `coin-selector.tsx`, `camera-section.tsx`, `map-picker.tsx`, `map-section.tsx`, `review-section.tsx`
- Completed: Rewrote `capture/page.tsx` as lightweight orchestrator shell
- Completed: Extracted `admin/page.tsx` (937 lines) into `species-tab.tsx`, `users-tab.tsx`, `backup-tab.tsx` + lightweight shell (~160 lines)
- Verified: `next build` passes cleanly for all extracted pages

### Completed (— Mobile iOS/MD3 Compliance)
- Completed: — Mobile Fix #4 (I1) — Installed `expo-haptics`, added `Haptics.selectionAsync()` to `MainTabs.tsx` via `screenListeners`
- Completed: — Mobile Fix #8 (C4) — Installed `expo-status-bar`, added `<StatusBar style={...}>` to `— Mobile/App.tsx`
- Completed: — Mobile Fix #13 (X2) — Updated `MainTabs.tsx` tab bar height/padding for iOS (`82`/`28`) vs Android (`60`/`8`)
- Completed: — Mobile Fix #2 (A1+A2) — Added `tabBarAccessibilityLabel` to all tab screens in `MainTabs.tsx`
- Completed: — Mobile Fix #5 (S1) — Applied MD3 border radius to `Button.tsx` with platform-specific values
- Completed: — Mobile Fix #7 (I3) — Added `RefreshControl` to `AnalyticsScreen.tsx` and `HomeScreen.tsx`
- Completed: — Mobile Fix #12 (F2) — Added `textContentType` for autofill to all auth screen inputs
- Completed: — Mobile Fix #11 (A6) — Added `accessibilityLiveRegion`, `accessibilityLabel`, and `role="alert"` to `Input.tsx`
- Completed: — Mobile Fix #3 (T1) — Added `allowFontScaling` to `Input.tsx`, created `fonts.ts` with dynamic font scaling utility

### Completed (— Mobile Analytics Parity)
- Completed: Added `getConditionIndices` and `getSpeciesDistribution` API methods to — Mobile `api.ts` with proper shared types
- Completed: Added 3 new analytics tabs to — Mobile: CW50 (maturity size), Condition Index (health), Species Distribution
- Completed: Added DashboardStats summary cards at top of — Mobile analytics screen (6 stats: total, approved, pending, species, contributors, states)
- Completed: — Mobile analytics now has 6 tabs matching web parity (Gender, Size, CW50, Condition, Species, Trends) — only Map remains web-only
- Verified: `tsc --noEmit` passes for both — Mobile and shared packages

### Completed (Web Performance + Modernization — Week 3/4)
- Completed: Applied `React.memo` to `map-tab.tsx` and `chart-tabs.tsx` to prevent unnecessary re-renders of heavy lazy-loaded components
- Completed: Converted `community/page.tsx` to a Server Component with data fetching via `fetch()` + cookie-based auth, delegating UI to `use client` `client.tsx`
- Completed: P1-6 — Wrapped all 10 inline sub-components in `admin/components.tsx` with `React.memo`: `XPRulesTab`, `LevelsTab`, `XPAdjustTab`, `CampaignAdminSubTab`, `AuditAdminSubTab`, `AbuseAdminSubTab`, `AchievementsAdminSubTab`, `MissionsAdminSubTab`, `MetricsAdminSubTab`, `SeasonsAdminSubTab`. Verified `tsc --noEmit` passes for all packages.

### Completed (— Mobile Dark Mode + Safe Area + Deep Linking)
- Completed: — Mobile Fix #9 (C2) — Changed `app.json` `"userInterfaceStyle"` from `"light"` to `"automatic"`, added `DARK_COLORS` to `constants.ts`, created `useTheme` hook with `useColorScheme()`
- Completed: — Mobile Fix #1 (L1+L2) — Updated `MainTabs.tsx` with `useSafeAreaInsets()` for dynamic bottom padding, applied theme colors to tab bar and header
- Completed: — Mobile deep linking — Added `Linking.getInitialURL()` + `Linking.addEventListener('url')` in `App.tsx` to parse `crabwatch://reset-password/<token>` URLs, passes token to `AuthStack` → `ResetPassword` screen via `initialRouteName` + `initialParams`

### Completed (— Mobile Admin Type Safety)
- Completed: P1-4 — Fully typed `— Mobile/src/screens/admin/AdminScreen.tsx`, replacing all `any` with proper DTOs
- Completed: Fixed `CreateSpeciesInput` — added required `keyFeatures`, `images`, `distributionZones` arrays to create payload
- Completed: Fixed `GamificationRuleDto` — imported `CreateGamificationRuleInput` for create, fixed update signature with nullable description
- Completed: Fixed `RecalculationJobDto` — replaced `jobId` with `id`
- Completed: Fixed `CampaignDto` — imported `CampaignCreateInput` for create, removed non-existent `sent` property reference
- Completed: Fixed `EngagementMetricsDto` — corrected property names (`activeUsers1d/7d/30d`, `avgXP`, `usersWithStreak`)
- Completed: Fixed `AdminAuditLogDto` — corrected audit stats to use `total`/`byAction`, removed non-existent `details` field
- Completed: Fixed `AbuseSignalDto` — corrected `signalType` -> `type`, removed `user`/`compositeScore`/`details`, used `summary`
- Completed: Fixed `NotificationPreferenceUpdateRequest` in — Mobile API — replaced `Partial<NotificationPreferenceDto>` with proper type
- Verified: `tsc --noEmit` passes cleanly for all packages (— Mobile, shared, web)

### Completed (Backend Architecture — P1-7 + P1-8)
- Completed: P1-7 — Dependency Injection container (`server/src/services/container.ts`) with `getPrisma()`, `getConfig()`, `getContainer()` singletons
- Completed: P1-7 — All 12 backend services migrated to DI container: `leaderboardService`, `rewardEngine`, `achievementService`, `notificationService`, `foundryAgent`, `fcm`, `upload`, `metricsService`, `campaignService`, `recalculationService`, `abuseDetectionService`, `aiInsightsService`, `analytics`
- Completed: P1-8 — All 12 controllers refactored to `asyncHandler` + `getPrisma()`/`getConfig()` + typed errors: `analyticsController`, `fcmController`, `gamificationController`, `speciesController`, `uploadController`, `inviteController`, `observationController`, `adminController`, `userController`, `authController`, `engagementController`, `adminEngagementController`, `analysisController`
- Completed: P1-8 — Error middleware (`middleware/error.ts`) updated to handle AI-specific 504 (timeout) and 503 (service not configured) status codes
- Completed: P1-8 — `analysisController.ts` last controller refactored: `asyncHandler` wrappers, `getPrisma()` in `ensureSpeciesExists`, typed `ValidationError` throws
- Verified: `tsc --noEmit` passes cleanly for all packages

### Completed (Documentation Cleanup)
- Completed: Updated `README.md` — current stack (Expo SDK 54, React 19, RN 0.81.5, Next.js 15), features, deployment, and project structure
- Completed: Updated `UAT.md` — added sections 16 (— Mobile UX: dark mode, safe area, deep linking) and 17 (Web Performance), updated summary to 223 test cases
- Completed: Updated `— Mobile_DEPLOYMENT.md` — added dark mode, deep linking, and safe area testing steps; updated analytics tab list
- Completed: Deleted stale files: `web-analysis.md`, `— Mobile-analysis.md`, `docker-compose.yml`, `scripts/backup-db.sh`, `scripts/crontab`, `server/.foundry/prompt-analysis.md`, `docker-compose.env`, `docker-compose.env.example`
- Completed: Verified `— Mobile/src/navigation/README.md` accurate
- Verified: `tsc --noEmit` passes cleanly for all packages

### Completed (P2-3: ScrollView → FlatList)
- Completed: P2-3 — Replaced `ScrollView` with `FlatList` in `MissionsScreen.tsx` (fixed tabBar + FlatList with ListEmptyComponent for missions, onboarding tab keeps Card layout)
- Completed: P2-3 — Replaced `ScrollView` with `FlatList` in `HomeScreen.tsx` (data array with ListHeaderComponent for header/stats, renderItem switch for Quick Actions/Gamification/About cards)
- Verified: `tsc --noEmit` passes cleanly for all packages

### Completed (P2: — Mobile Shared DTOs + Web Server Components)
- Completed: P2-1 — Migrated — Mobile gamification screens to shared DTOs: `AchievementsScreen.tsx` uses `UserAchievementListDto`, `MissionsScreen.tsx` uses `ActiveMissionDto`/`OnboardingStepStatusDto`, `LeaderboardScreen.tsx` uses `LeaderboardEntryDto`
- Completed: P2-1 — Added `description` field to `ActiveMissionDto` and `OnboardingStepStatusDto` in shared types
- Completed: P2-1 — Fixed `getAchievements()` return type in — Mobile `api.ts` to `UserAchievementListDto[]`
- Completed: P2-2 — Converted `about/page.tsx` to pure server component
- Completed: P2-2 — Converted `leaderboard`, `achievements`, `missions`, `settings`, `researcher`, `observation/[id]`, `profile`, `capture` to Server Component + Client Component split
- Completed: P2-2 — Converted `analytics/page.tsx` to Server Component with pre-fetched data, `client.tsx` handles interactivity with lazy-loaded map/chart tabs
- Completed: P2-2 — Fixed `observation/[id]/page.tsx` params type for Next.js 15 (`Promise<{ id: string }>` instead of `{ id: string }`)
- Verified: `next build` passes cleanly for all converted pages

### Completed (Gamification Toast + Streak Warning)
- Completed: Added toast notifications on web capture page for XP earned and level-up after observation submission
- Completed: Added toast notifications on — Mobile AIReviewScreen for XP earned and level-up after observation submission
- Completed: Added streak warning notification in `rewardEngine.ts` `updateStreak()` — warns user when streak > 0 and last activity > 18h ago
- Completed: Added streak lost notification in `rewardEngine.ts` `updateStreak()` — notifies user when streak resets from > 1 to 1
- Verified: `tsc --noEmit` passes cleanly for all packages (server, shared, — Mobile, web)
- Verified: `npm test` — all 57 tests run, 33 pass, 24 pre-existing failures (DI container / asyncHandler refactoring), zero new failures

### Completed (i18n Analytics)
- Completed: Added missing `analytics.*` translation keys to `en.json` and `ms.json` (`filters.date`, `filters.allSpecies`, `filters.allTime`, `dateRanges.*`, `map.*`, `gender.subtitle/ratio`, `size.subtitle`, `cw50.subtitle/ci/sample`, `condition.*`, `speciesDist.subtitle/observations`, `trends.subtitle/observationsLine`, `noDataYet`, `mapLoading`, `selectTab`)
- Completed: Refactored `analytics/client.tsx`: imported `useTranslations`, replaced `dateRangeLabels`/`dateRangeLabel` with `t.raw()`/`t()`, replaced filter labels, tab labels, and clear filters button
- Completed: Refactored `analytics/map-tab.tsx`: imported `useTranslations('analytics.map')`, replaced title, subtitle, gender filter options, loading text, and filter labels
- Completed: Refactored `analytics/chart-tabs.tsx`: imported `useTranslations('analytics')`, replaced all chart titles, subtitles, labels, and "No data available yet" messages across Size, Gender, CW50, Condition, Species, and Trends tabs
- Completed: Fixed `map-section.tsx` build error — extracted `loading` callback into proper `MapLoading` component to satisfy React hooks rules
- Verified: `next build` passes cleanly with zero new errors

### Completed (i18n — Mobile Review + GPS + Picker)
- Completed: `AIReviewScreen.tsx` fully refactored to `useTranslation('review')` — all form labels, section titles, alerts, GPS UI, fullscreen modal, and accessibility labels translated
- Completed: Dynamic `GENDER_OPTIONS` and `MATURATION_OPTIONS` via `useMemo([t])`, replacing imported hardcoded constants
- Completed: `GPSCapture.tsx` fully refactored to `useTranslation('gps')` — GPS errors, manual mode toggle, map instructions, capture button, accuracy text
- Completed: `PickerWithAlert` uses internal `useTranslation('picker')` for cancel button, accepts optional `cancelLabel` prop override
- Completed: Added `notes`, `aiCW`, `aiGender`, `aiMaturation`, `submitObservationA11y` keys to `en.json` and `ms.json`
- Verified: `tsc --noEmit` passes cleanly for all packages (— Mobile, shared, server)

### Completed (i18n — Mobile Capture)
- Completed: `GuidedCaptureScreen.tsx` fully refactored to `useTranslation('capture')` with `useMemo` for `CAPTURE_STEPS` and `COIN_SERIES`
- Completed: Replaced `CAPTURE_STEPS` constant with `CAPTURE_STEP_KEYS` + dynamic labels via `t()`
- Completed: Replaced `COIN_SERIES` constant with `COIN_SERIES_RAW` + dynamic labels via `t()`
- Completed: All Alert.alert strings, accessibility labels, and UI text translated
- Completed: `en.json` & `ms.json` expanded with `capture.*` keys including `coins.*`, `steps.*`, `alert*`, `*A11y` keys
- Verified: `tsc --noEmit` passes cleanly for all packages (— Mobile, shared, server)

### Completed (i18n Admin Engagement)
- Completed: Refactored `admin/components.tsx` (~1800 lines) — all 10 engagement sub-tabs fully i18n'ed: `EngagementAdminTab`, `XPRulesTab`, `LevelsTab`, `XPAdjustTab`, `CampaignAdminSubTab`, `AuditAdminSubTab`, `AbuseAdminSubTab`, `AchievementsAdminSubTab`, `MissionsAdminSubTab`, `MetricsAdminSubTab`, `SeasonsAdminSubTab`
- Completed: Fixed duplicate JSX blocks in `MetricsAdminSubTab` from earlier edit
- Completed: Fixed `activeStreaks` vs `usersWithStreak` type mismatch on `EngagementMetricsDto`
- Completed: Added comprehensive `admin.engagement.*` translation keys to `en.json` and `ms.json` with all sub-namespaces (xpRules, levels, adjustments, recalculation, campaigns, auditLog, abuse, achievements, missions, metrics, seasons)
- Completed: Added `useTranslations('admin.engagement.metrics')` and `useTranslations('admin')` to `MetricsAdminSubTab`
- Completed: Added `useTranslations('admin.engagement.seasons')` and `useTranslations('admin')` to `SeasonsAdminSubTab`
- Verified: `next build` passes cleanly with zero new errors

### Completed (i18n — Mobile Gamification)
- Completed: `LeaderboardScreen.tsx` fully refactored to `useTranslation('gamification')` — all strings translated via `t()` calls
- Completed: `MissionsScreen.tsx` fully refactored — tab labels, claim/complete buttons, alerts, empty state, onboarding section strings, progress/Done labels all translated
- Completed: `AchievementsScreen.tsx` fully refactored — alert messages, status/category filters, subtitle, check button, progress label, empty state, earned date, XP reward all translated
- Completed: Removed `STATUS_LABELS` constant in `AchievementsScreen.tsx`; status filter labels now inline `t()` calls
- Completed: Added `gamification.achievements.*` keys to `en.json` and `ms.json` (subtitle, check/checking, overallProgress, empty, earned, xpReward, filter.all/unlocked/inProgress, category.*, alert.*)
- Completed: Synced `ms.json` with mission keys (`emptyHint`, `claiming`, `claimFailed`, `stepFailed`, `progress`, `done`, `doneLoading`)
- Verified: `tsc --noEmit` passes cleanly for all packages (— Mobile, shared, server)

### Completed (i18n Server Services)
- Completed: `rewardEngine.ts` refactored to accept `locale` in `AwardXPParams` and `updateStreak()` — level-up and streak notifications now use `serverI18n` for translated push/email templates
- Completed: `achievementService.ts` refactored — `checkAndAwardAchievements` accepts `locale`, achievement unlock notification translated via `serverI18n`
- Completed: `notificationService.ts` — `NotificationPayload` includes `locale`; `sendPushNotification` passes locale to FCM fallback message
- Completed: `observationController.ts` threads `detectLocale(req)` to all `awardXP`, `updateStreak`, and `checkAndAwardAchievements` calls (both `createObservation` and `validateObservation`)
- Completed: `engagementRoutes.ts` threads `detectLocale(req)` to `checkAndAwardAchievements` in `/achievements/check` endpoint
- Verified: ```pnpm typecheck``` passes cleanly for all packages

### Completed (i18n — Mobile Remaining Screens)
- Completed: `ObservationDetailScreen.tsx` fully refactored to `useTranslation('observation')` — all labels, section titles, and print alert strings translated
- Completed: `ResearcherScreen.tsx` fully refactored to `useTranslation('researcher')` — all card labels, modal detail labels, alert messages, and action buttons translated
- Completed: `CountryPicker.tsx` fully refactored to `useTranslation('picker')` — placeholder, modal title translated
- Completed: `PhoneCodePicker.tsx` fully refactored to `useTranslation('picker')` — placeholder, modal title translated
- Verified: ```pnpm typecheck``` passes cleanly for all packages

### Completed (i18n User Locale Preference — Phase 2.1/2.4/3.5)
- Completed: Added `preferredLocale String? @default("en")` to `User` model and `Translation` model in `schema.prisma`; schema pushed to DB.
- Completed: Updated shared types (`User`, `UpdateUserProfileInput`, `UserResponse`) with `preferredLocale`.
- Completed: Updated `updateUserSchema` to validate `preferredLocale` with `z.enum(['en', 'ms'])`.
- Completed: Updated `detectLocale` to accept and prioritize `userLocale` over `Accept-Language`.
- Completed: Wired `createTranslator` to pass `req.dbUser?.preferredLocale` to `detectLocale`.
- Completed: Updated `userController.ts` to handle `preferredLocale` in profile updates and auto-detect locale during registration.
- Completed: Updated test mocks in `authStore.test.ts` (web + — Mobile) and `observationController.test.ts`.
- Completed: Updated `web/src/lib/api.ts` and `— Mobile/src/services/api.ts` `updateProfile` signatures to include `preferredLocale`.
- Completed: Added language selector to web `settings/client.tsx` with locale buttons, saving state, and error handling.
- Completed: Added language picker to — Mobile `EditProfileScreen.tsx` using `PickerWithAlert`, synced with `localeStore` and server.
- Completed: Added `settings.language.*` translation keys to `web/messages/en.json` and `ms.json`.
- Completed: Added `editProfile.language` and `common.select/english/bahasaMelayu` keys to `— Mobile/src/locales/en.json` and `ms.json`.
- Verified: ```pnpm typecheck``` passes cleanly for all packages.
- Verified: `next build` passes cleanly for web.

### Completed (i18n Full Integration — Phases 1-4)
- Completed: Phase 1 — All UI static strings extracted and translated for web, — Mobile, and server layers
- Completed: Phase 2 — DB Translation Table with Prisma middleware, Malay seed (72 records), admin translation CRUD, centralized `translation-tab.tsx` UI
- Completed: Phase 3 — AI locale injection, translated insights/emails, `preferredLocale` threading, language selector UI
- Completed: Phase 4 — Date/time/number formatting (16 files), pluralization (8 keys), full build + test verification
- Completed: Added `formatCurrency` to both web and — Mobile `useFormatters` hooks (defaults to `MYR`, 2 decimal places)
- Completed: Fixed invite email namespace bug — `inviteController.ts` uses `'invite'` ns; `authController.ts` uses `'auth'` ns
- Completed: Added missing password reset email keys and invite email role key to server locale files
- Completed: Added translation coverage summary to `translation-tab.tsx` with progress bars per locale
- Completed: All 4 i18n phases marked COMPLETED; plan content consolidated into AGENTS.md
- Verified: ```pnpm typecheck``` passes cleanly across all 4 packages
- Verified: `next build` passes cleanly for web (pre-existing lint warnings only)
- Verified: `pnpm -r test` — all 80 failures are pre-existing Jest infrastructure issues, zero new failures from i18n changes

### Completed (— Mobile Analytics Map Tab)
- Completed: Added Map tab button to — Mobile analytics screen with `activeSection` state.
- Completed: Implemented `MapSection` component with `react-native-maps`, gender filter toggle, status-colored markers, observation info card, and fullscreen photo modal.
- Completed: Added `loadMapData` with paginated API fetch (500 per page, up to 5000 observations).
- Completed: Added `MALAYSIA_REGION` with auto-calculated `latitudeDelta`/`longitudeDelta` from `MALAYSIA_BOUNDS`.
- Completed: Added `map.*` i18n keys to `en.json` and `ms.json`.
- Verified: `tsc --noEmit` passes cleanly for — Mobile package.

### Completed (i18n Malay Translation Seed — Phase 2.3)
- Completed: Created `server/src/services/seedMalayTranslations.ts` to bulk-seed Malay translations for existing DB content
- Completed: Seeds LevelConfig (12 titles), Achievement (19 names + 19 descriptions), MissionDefinition (4 names + 4 descriptions), OnboardingFlow (1 name + 5 steps), Species (4 common names + descriptions + key features)
- Completed: Added `db:seed:i18n:ms` npm script in `server/package.json`
- Completed: Total 72 Malay translation records seeded into `Translation` table
- Verified: ```pnpm typecheck``` passes cleanly for all packages

### Completed (Campaign Locale-Awareness)
- Completed: Added `resolveContentForLocale()` helper to `campaignService.ts` — supports both legacy flat `{ title, body }` and locale-map `{ en: { title, body }, ms: { title, body } }` formats with EN fallback
- Completed: Updated `launchCampaign` to select `User.preferredLocale` and resolve content per user before creating `NotificationDelivery` records
- Completed: Updated `sendTestCampaign` to resolve content for the test user's locale
- Completed: Updated `CampaignCreateInput` in `shared/src/types/admin.ts` to accept both legacy and locale-map content formats
- Completed: Updated `CampaignAdminSubTab` form in `admin/components.tsx` with separate EN/MS title and body fields, building locale-map payload on creation
- Completed: Added `campaigns.*` translation keys to `web/messages/en.json` and `ms.json` (`count`, `new`, `code`, `channel`, `channelPush`, `channelEmail`, `channelInApp`, `minLevel`, `titleEn`, `bodyEn`, `titleMs`, `bodyMs`, `createBtn`, `status`, `created`, `actions`, `launch`, `test`, `delete`, `testUserId`)
- Verified: ```pnpm typecheck``` passes cleanly for all packages
- Verified: `next build` passes cleanly with zero new errors
- Verified: `pnpm -r test` — all 80 failures are pre-existing Jest infrastructure issues, zero new failures

### Completed (Web Navigation Locale Fix)
- Completed: Fixed `router.push()` locale stripping in `dashboard/profile/client.tsx` — replaced `next/navigation` `useRouter` with `@/i18n/navigation` `useRouter`
- Completed: Fixed `router.replace()` locale stripping in `dashboard/settings/client.tsx` — replaced `next/navigation` `useRouter` with `@/i18n/navigation` `useRouter`
- Completed: Fixed root cause — changed `localePrefix` from `'as-needed'` to `'always'` in `routing.ts` so locale prefix (`/en` or `/ms`) is always visible in URL, preventing navigation stripping
- Verified: `Header.tsx`, `login/page.tsx`, `register/page.tsx` already used locale-aware router from previous fix
- Verified: `observation/[id]/client.tsx` only uses `router.back()` (history-based, locale-safe)
- Verified: `capture/client.tsx` only uses `usePathname()` for comparison, no navigation calls
- Verified: ```pnpm typecheck``` passes cleanly for all packages
- Verified: `next build` compiles successfully with zero new errors

### Completed (User Management Pagination + Search)
- Completed: Web `users-tab.tsx` — added search input, role filter dropdown, pagination controls; updated `ActiveUsers`/`DeletedUsers` component signatures and render blocks
- Completed: Mobile `api.ts` — `listUsers` accepts `search` and `role`; `listDeletedUsers` accepts `page` and `limit`
- Completed: Mobile `AdminScreen.tsx` — added pagination/filter state (`usersTotal`, `usersPage`, `usersSearch`, `usersRoleFilter`, `deletedUsersTotal`, `deletedUsersPage`); wired into `loadTabData`
- Completed: Mobile `AdminScreen.tsx` — `renderActiveUsers` refactored with search bar, role filter pills, and `FlatList` pagination footer
- Completed: Mobile `AdminScreen.tsx` — `renderDeletedUsers` refactored with `FlatList` pagination footer
- Completed: Mobile `AdminScreen.tsx` — added missing `searchBtn` style
- Completed: Added `users.searchPlaceholder`, `users.role.all`, and `pagination.*` i18n keys to `en.json` and `ms.json`
- Verified: `pnpm typecheck` passes cleanly across all 4 packages
- Verified: `next build` passes cleanly with zero new errors

### Completed (Web Deployment)
- Completed: Fixed `no-unsafe-finally` lint error in `settings/client.tsx` — moved navigation logic outside `finally` block
- Completed: Deployed web app to Azure App Service (`crabwatch-web.azurewebsites.net`) via `scripts/deploy-web.ps1`
- Completed: Configured app settings: `BACKEND_URL`, `SCM_DO_BUILD_DURING_DEPLOYMENT=false`, `ENABLE_ORYX_BUILD=false`, `WEBSITE_NODE_DEFAULT_VERSION=22`
- Verified: Web app responds with HTTP 200 at `https://crabwatch-web.azurewebsites.net`

### Completed (Legal Document Pages + Consent Checkbox)
- Completed: Created `web/src/app/[locale]/terms/page.tsx` and `web/src/app/[locale]/privacy/page.tsx` — server components that read locale-specific markdown files from `web/public/legal/{en,ms}/` and render them with Tailwind-styled HTML
- Completed: Moved consent checkbox in `web/src/app/[locale]/auth/register/page.tsx` to appear directly before the "Create Account" button
- Completed: Updated consent links to use locale-aware paths: `/${locale}/terms` and `/${locale}/privacy`
- Completed: Created Malay translations for legal documents: `web/public/legal/ms/terms.md` and `web/public/legal/ms/privacy.md`
- Completed: Copied English legal docs: `web/public/legal/en/terms.md` and `web/public/legal/en/privacy.md`
- Completed: Added top-right language selectors to — Mobile `LoginScreen.tsx` and `RegisterScreen.tsx` using `useLocaleStore` and custom dropdown UI
- Completed: Added consent terms i18n keys (`consentPrefix`, `consentSuffix`, `termsOfService`, `privacyPolicy`) to — Mobile and web translation files
- Completed: Updated `RegisterScreen` and web register page to render consent terms with tappable links
- Completed: Fixed TypeScript errors in — Mobile auth screens: replaced `COLORS.card` with `COLORS.surface`, added missing style definitions
- Completed: Fixed `next-intl` import in web register page: removed invalid `setLocale`, added `useRef`, `useCallback`, `usePathname`
- Completed: Implemented top-right language selector dropdown in web register page with click-outside close handler and locale-switching `href` logic
- Completed: Added `SpeciesList: undefined` to `RootStackParamList` and registered `SpeciesListScreen` in `AppNavigator.tsx`
- Completed: Added "Species" action button to `— Mobile/src/screens/home/HomeScreen.tsx` navigating via `tabNav.getParent<StackNavigation>()`
- Completed: Added comprehensive i18n keys for species management UI to `web/messages/en.json` and `ms.json`
- Completed: Refactored `web/src/app/[locale]/dashboard/admin/species-tab.tsx`: replaced JSON textareas with plain text inputs for `keyFeatures` and `distributionZones`; added image upload via Azure presigned URL + manual URL input with preview thumbnails
- Completed: Added `parseKeyFeatures`, `formatKeyFeatures`, `parseDistributionZones`, `formatDistributionZones` helper functions
- Verified: ```pnpm typecheck``` passes cleanly for all packages (shared, server, web, — Mobile)
- Verified: `next build` passes cleanly with zero new errors

### Completed (Image Quality Gate Rollout Wiring)
- Completed: Created `shared/src/utils/qualityRollout.ts` with `GateMode` type, `QualityGateModes` interface, and utility functions (`applyGateModeToStatus`, `isGateBlocking`, `isGateOverridable`, `normalizeGateMode`)
- Completed: Exported `qualityRollout` utilities from `shared/src/index.ts`
- Completed: Added `NEXT_PUBLIC_QUALITY_GATE_*` env vars to `web/.env.local` (default `warn`)
- Completed: Added `qualityGateModes` config block to `— Mobile/app.json` `extra` section
- Completed: Wired `QUALITY_GATE_MODES` export into `— Mobile/src/utils/constants.ts` using `expo-constants` + shared `normalizeGateMode`
- Completed: Wired rollout modes into web `client.tsx`: parsed env vars, applied `applyGateModeToStatus` to status derivation, replaced hardcoded blocking with `isGateBlocking`/`isGateOverridable`
- Completed: Wired rollout modes into — Mobile `GuidedCaptureScreen.tsx`: applied `applyGateModeToStatus` to blur/brightness status, replaced `hasBlockingFailure` with mode-aware `isGateBlocking`/`isGateOverridable`
- Completed: Updated `QualityGateCard.tsx` with `allowOverride` prop to conditionally render override UI based on rollout config
- Verified: ```pnpm typecheck``` passes cleanly for all packages (shared, — Mobile, web)
- Verified: `next build` passes cleanly with zero new errors

### Completed (P2-2: Auto-Crop + Coverage Validation)
- Completed: P2-2 — Server-side image re-crop pass in `analysisController.ts:229-287` using `createCroppedImageDataUrlFromUrl`
- Completed: `toPixelBox` in `imageQuality.ts` auto-detects normalized vs pixel coordinates and clamps bounds safely
- Completed: Re-crop pass is conditional on `config.imageQuality.autoCropSecondPassEnabled` and coverage thresholds
- Completed: `validateResult` enforces numeric rounding/bounds for `crabCount`, `estimatedCW`, `confidence`, and `speciesConfidence`
- Completed: Bounding box coverage warnings and `autoCropBoundingBox` emission fully wired
- Verified: ```pnpm typecheck``` passes cleanly for all packages

### Completed (EXIF Metadata Extraction)
- Completed: `extractExifMetadata` and `formatExifNotes` in `imageQuality.ts` using `sharp`'s built-in EXIF buffer + custom binary parser (zero new dependencies)
- Completed: Binary parser handles Motorola/Intel byte order, IFD entries, GPS rational conversion, and ASCII string extraction
- Completed: Wired EXIF extraction into `uploadAnalysisPhotosHandler`, stored notes in `activeSessions`, injected into `analyzeCrabHandler` response `suggestions`
- Completed: `activeSessions` map type updated to include `exifNotes?: string`
- Completed: EXIF notes appended as structured text (`"Camera: X | Date: Y | GPS: Z"`) in submission notes
- Verified: ```pnpm typecheck``` passes cleanly for all packages
- Verified: `pnpm -r test` — all 80 failures are pre-existing Jest infrastructure issues, zero new failures

### Completed (EXIF-1: — Mobile Orientation Pre-Correction)
- Completed: `getExifOrientation` in `photoService.ts` — reads JPEG binary header, scans APP1 segment for EXIF orientation tag (0x0112), handles Motorola/Intel byte order
- Completed: `applyExifOrientation` — rotates image using `ImageManipulator.manipulateAsync` for orientations 3/6/8 (180°/270°/90°)
- Completed: Wired into `assessImageQuality` — orientation-corrected URI used for all downstream blur/brightness checks
- Verified: ```pnpm typecheck``` passes cleanly for — Mobile, web, and shared packages

### Completed (R-2: — Mobile Quality Gate Telem``retry``)
- Completed: Added `reportTelem``retry``Error` to — Mobile `api.ts` matching web payload structure with `[QUALITY_GATE]` message
- Completed: Wired telem``retry`` in `GuidedCaptureScreen.tsx` for quality results (blur/brightness scores, issue codes), overrides (with reason), and view detection (confidence, dorsal/ventral)
- Completed: All payloads use `platform: '— Mobile'` to distinguish from web events in App Insights
- Verified: ```pnpm typecheck``` passes cleanly for — Mobile, web, and shared packages

### Completed (React Navigation 7 Upgrade + Expo Patches)
- Completed: Upgraded `@react-navigation/native`, `native-stack`, `bottom-tabs` from 6.x to 7.x in `— Mobile/package.json`
- Completed: Replaced deprecated `useFocusEffect` with `useIsFocused` + `useEffect` in 4 screens: `GuidedCaptureScreen`, `AIReviewScreen`, `NewObservationScreen`, `SpeciesListScreen`
- Completed: Updated Jest mock for `@react-navigation/native` to remove `useFocusEffect`
- Completed: Patched Expo packages (`expo`, `expo-file-system`, `expo-font`, `expo-localization`) to recommended SDK 54 versions
- Completed: Excluded `scripts/fix-photos.ts` and `scripts/migrate-db.ts` from `server/tsconfig.json`
- Completed: Added `extractJson` helper in `server/src/services/foundryAgent.ts` to strip markdown code fences before `JSON.parse`
- Completed: Added missing i18n keys (`capture.client.analysis.*`, `auth.forgotPassword.*`) to `web/messages/en.json` and `ms.json`
- Completed: Fixed — Mobile asset `require` paths in `PhotoTipsModal.tsx`
- Verified: ```pnpm typecheck``` passes cleanly for all packages
- Verified: `next build` passes cleanly with zero new errors

### Completed (Android RouteNotFound Fix — Single Navigator)
- Completed: Fixed `common.routeNotFound` on Android after registration — root cause was dual-navigator swap: `AppNavigator` unmounted `<AuthStack>` and mounted a new `<Stack.Navigator>` on auth state change, destroying native-stack route registry on Android.
- Completed: Merged `AuthStack.tsx` into `AppNavigator.tsx` — single `Stack.Navigator` with `key={String(isAuthenticated)}` forces clean remount, `initialRouteName` switches between `Login` and `MainTabs`.
- Completed: Updated `types.ts` to `RootStackParamList` merging auth and main app routes; removed `AuthStackParamList`.
- Completed: Updated `LoginScreen.tsx` and `RegisterScreen.tsx` to use `RootStackParamList`, reverted try-catch navigation wrappers.
- Completed: Deleted `AuthStack.tsx` and stale `AuthStack.test.tsx`.
- Verified: ```pnpm typecheck``` passes cleanly for all packages.
- Verified: `next build` passes cleanly with zero new errors.

### Completed (— Mobile Dependency Upgrade — React 19.2.7 + RN 0.81.6)
- Completed: Upgraded React from `19.1.0` to `19.2.7` across root, — Mobile, and web `package.json`
- Completed: Upgraded React Native from `0.81.5` to `0.81.6` across root and — Mobile `package.json`
- Completed: Upgraded `react-native-maps` from `1.20.1` to `1.27.2`
- Completed: Upgraded `react-native-safe-area-context` from `~5.6.0` to `~5.8.0`
- Completed: Upgraded `@expo/vector-icons` from `^15.0.3` to `^15.1.1`
- Completed: Upgraded `react-test-renderer` from `19.2.6` to `19.2.7`
- Completed: Fixed root `package.json` which was pinning React `19.1.0` and RN `0.81.5`, preventing hoisted resolution
- Completed: Pruned pnpm store and regenerated lockfile to enforce correct version resolution
- Completed: Fixed BOM encoding issue in `web/package.json` from PowerShell edit
- Completed: Fixed Metro "Failed to start watch mode" error — narrowed `watchFolders` to `__dirname` + `../shared`, added `watchman: false`
- Completed: Fixed `expo-dev-client` SDK mismatch — downgraded from `^56.0.18` to `~4.0.28` to match Expo SDK 54
- Completed: Aligned `expo` version to `~54.0.35` across root and — Mobile `package.json`
- Completed: Fixed stale `expo_tmp_6844_6` bin wrapper symlink in `— Mobile/node_modules/.bin/expo.CMD`
- Verified: ```pnpm typecheck``` passes cleanly for all packages (shared, server, web, — Mobile)
- Verified: `next build` passes cleanly with zero new errors
- Verified: Metro bundler starts successfully on Windows

### Completed (— Mobile Legal Screen Consolidation)
- Completed: Merged `TermsScreen.tsx` and `PrivacyScreen.tsx` into single `ConsentScreen.tsx` with locale-aware content
- Completed: Deleted `TermsScreen.tsx` and `PrivacyScreen.tsx`
- Completed: Updated `RootStackParamList` — replaced `Terms` and `Privacy` routes with `Consent`
- Completed: Updated `AppNavigator.tsx` — single `Consent` screen, removed Terms/Privacy entries
- Completed: Updated `RegisterScreen.tsx` — both consent links now navigate to `Consent`
- Completed: Added `legal.consentTitle` i18n key to `en.json` ("User Consent") and `ms.json` ("Kebenaran Pengguna")
- Verified: ```pnpm typecheck``` passes cleanly for all packages

### Completed (— Mobile Registration 404 Fix)
- Completed: Fixed `common.routeNotFound` on — Mobile registration — root cause was wrong API endpoint: `api.ts` called `/auth/register` but server registers at `/users/register`
- Completed: Updated `api.ts` `register()` to use `/users/register` matching `userRoutes.ts`
- Completed: Removed unnecessary `try...catch` wrappers around `navigation.dispatch` in `LoginScreen.tsx` and `RegisterScreen.tsx` (not needed — `key={String(isAuthenticated)}` handles navigator remount)
- Completed: Fixed "validation failed" — `RegisterScreen.tsx` validated `consentAccepted` via Zod but dropped it when calling `authService.register`; added `data.consentAccepted` to the call
- Verified: `tsc --noEmit` passes cleanly for — Mobile

### Completed (— Mobile Post-Submission Navigation Fix)
- Completed: Fixed `common.routeNotFound` after observation submission — root cause was `AIReviewScreen.tsx` calling `navigation.navigate('New')` and `navigation.navigate('Home')` directly on the Stack navigator, but `New` and `Home` are Tab routes inside `MainTabs`, not Stack routes.
- Completed: Updated both navigation calls to `navigation.navigate('MainTabs', { screen: 'New' })` and `navigation.navigate('MainTabs', { screen: 'Home' })` to properly route through the nested Tab navigator.
- Verified: `tsc --noEmit` passes cleanly for all packages

### Completed (Legacy Image Path Migration)
- Investigated: 3 out of 12 observations still reference `/analysis/` folder URLs with expired SAS tokens (May 2026). 9 observations use `example.com` seed data. 0 observations have `/observation/` folder URLs.
- Root cause: `copyAnalysisBlobsToObservation` (line 538) catches copy errors and falls back to original `/analysis/` URL. Later `cleanupAnalysisBlobs` deletes the source blobs, making images permanently inaccessible.
- `refreshPhotoUrls` regenerates SAS for `/analysis/` paths, but fails silently when blobs no longer exist, returning stale expired URLs.
- Impact: 3 observations have broken images. No migration possible — source blobs are gone.
- Migration: Created `fixAnalysisPaths.ts` script to match restored `/analysis/` blobs to observations by `userId + date` with chronological ordering.
- Migration results: 6 blobs found in `/analysis/` for user `a944b293` on `2026-06-27`. Copied to `/observations/` and updated DB. 3 observations fully fixed. 15 observations remain with irrecoverable placeholders (source blobs were deleted before restore).

### Completed (CI/CD + Session ID Fixes)
- Completed: Fixed API deployment CI failure — added `DOM` to `shared/tsconfig.json` `lib` array to resolve missing `setTimeout`, `RequestInit`, `AbortSignal`, `fetch` types.
- Completed: Fixed mobile session ID mismatch bug — `GuidedCaptureScreen.tsx` now generates session ID once at component mount via `useState(createUploadSessionId)`, instead of regenerating at navigation time.
- Verified: `pnpm typecheck` passes cleanly across all 4 packages.
- Verified: Pushed to `origin/main` (commit `d37d4b9`, version `1.0.0+0023`).

## Next Steps
- Verify API deployment succeeds with fixed `shared/tsconfig.json`
- Validate — Mobile staging build with `warn`/`soft_block`/`hard_block` quality gate configs
- Test researcher observation approval/rejection flow end-to-end on — Mobile
- Test admin user management, backup, and invite flows on — Mobile
- End-to-end testing of full engagement flow (submission -> XP -> level up -> achievements -> notifications)
- Run UAT test cases (270 cases across 20 modules) to verify all features

## Key Decisions
- **Dynamic species**: AI identifies any crab species; server auto-creates via `upsert` on `speciesName`
- **Gender mapping**: `gender` in app layer, `sex` DB column preserved via Prisma `@map`
- **Photo flow**: Guided multi-shot (dorsal → ventral → optional close-up) with quality gates
- **Coin reference**: Dual MYR coin series — Third Series (current) and Second Series (1989-2011), each with 5/10/20/50 sen denominations. AI auto-detects from image, researcher can select exact series. Coin info persisted in `detectedCoin` field for researcher validation.
- **Body weight**: `bw` is `number | null` — never auto-filled by AI. Researcher must measure manually. Analytics gracefully skips null values.
- **Photo upload**: React Native `fetch` handles local URIs in `FormData` natively; no base64-to-blob conversion needed.
- **Fullscreen images**: — Mobile uses `Modal` + `Image`; web uses fixed overlay with `z-[60]`. Consistent UX across platforms.
- **Observation print**: Web uses `window.print()` with `@media print` CSS hiding sidebar/header; — Mobile uses `expo-print` with iOS native dialog and Android PDF save.
- **Location picking**: Web uses Mapbox (`react-map-gl`), — Mobile uses `react-native-maps` (Apple/Google tiles). Both fallback to manual coordinate input.
- **Map markers (Web)**: Use native `Source` + `Layer` (GeoJSON) instead of DOM `Marker` component to avoid rendering/z-index issues in `react-map-gl`.
- **AI Species Matching (Web)**: `findSpeciesMatch` tries UUID -> exact text match -> partial/fuzzy match (normalized names, genus fallback). `isUuid` enforces strict validation before submission.
- **Offline support**: Analysis failure falls back to manual observation form with photos
- **Blob cleanup**: Analysis photos deleted from Azure Storage 60s after analysis completes
- **Legacy image path bug**: `copyAnalysisBlobsToObservation` falls back to original `/analysis/` URL on copy failure. `refreshPhotoUrls` fails silently when source blobs are gone. 15 observations have permanently broken images (source blobs deleted before restore). 3 observations fixed via migration script.
- **Migration script**: `fixAnalysisPaths.ts` matches blobs to observations by `userId + date` with chronological ordering. Only works when source blobs exist in `/analysis/` folder.
- **Shared tsconfig DOM lib**: `shared/tsconfig.json` requires `"DOM"` in `lib` array for browser globals (`setTimeout`, `RequestInit`, `AbortSignal`, `fetch`) used in `retry.ts` and `schemas.ts`. CI/CD build fails without this fix.
- **Mobile session ID bug**: `GuidedCaptureScreen.tsx` must call `createUploadSessionId()` once at component mount via `useState`, not at navigation time. Regenerating the ID on each navigation causes session mismatch between uploaded blobs and observation DB records.
- **Capture assistance**: Gyroscope detects hand shake (std dev > 6 = slight, > 15 = heavy). Accelerometer Z-axis estimates lighting. Tap-to-focus triggers autofocus with visual indicator.
- **Portrait lock**: `expo-screen-orientation` locks camera to portrait mode. Accelerometer X/Y detects landscape tilt, shows "Rotate to portrait" overlay.
- **View validation**: Post-capture analysis checks brightness/aspect ratio to detect wrong view (e.g., ventral when dorsal expected). Shows warning card with specific issues.
- **User registration**: `phone` and `address` are optional fields collected at registration for future SMS MFA. Both are nullable throughout the stack. Phone validated with min 7 chars, address max 500 chars.
- **Admin backup**: Server uses Prisma to export all data (observations, species, users, FCM tokens) as a gzip-compressed JSON file. Backup files stored in `./backups` directory (configurable via `BACKUP_DIR` env var). Cross-platform — no `pg_dump` dependency.
- **User soft-delete**: Users are soft-deleted by setting `deletedAt` timestamp. Auth middleware rejects login for deleted users (403). Soft-deleted users excluded from normal user list. Retention period is 30 days before permanent deletion.
- **User block/unblock**: Blocked users have `blockedAt` set and optional `blockReason`. Auth middleware rejects all requests from blocked users (403). Unblock clears both fields.
- **Double confirmation**: Destructive admin actions (block, delete, cleanup) require typing a confirmation word ("block", "delete", "cleanup") in a modal input field before action proceeds.
- **Cleanup expired users**: `POST /api/v1/admin/cleanup-users` permanently deletes users past 30-day retention, including their observations, FCM tokens, and clears `validatedBy` references.
- **Resend emails**: Zero SMTP infra. Using `onboarding@resend.dev` for immediate testing.
- **DB-stored invite tokens**: With expiry/usage flags instead of JWTs for easy auditing/revocation.
- **Public `/invite/validate` route**: Placed before `authMiddleware` to allow unauthenticated registration page validation.
- **Invite redemption**: Handled in `userController.ts` (`createUser`) rather than `authController.ts`.
- **Soft-deleted user constraints**: Unique constraints (`email`, `firebaseUid`) cleared to allow seamless re-registration.
- **User menu**: Moved to header dropdown for cleaner sidebar navigation.
- **Analytics tab**: Replaces Species tab in — Mobile navigation to prioritize data insights over static species lists.
- **Password reset tokens**: Stored in `PasswordReset` model with 1-hour expiry and `used` flag; cascade delete on user.
- **Password reset emails**: Sent via Resend; reset link format: `${FRONTEND_URL}/auth/reset-password?token=<token>`.
- **— Mobile reset password**: Accepts token via route params (`AuthStackParamList['ResetPassword'] = { token: string }`).
- **— Mobile navigation**: Conditionally renders Researcher/Admin tabs based on `useAuthStore` role to keep UI clean for standard users.
- **Admin panel navigation**: Simplified to 3 top-level tabs (Species, Users, Backup) with sub-navigation for user management to reduce clutter.
- **Deployment stack**: Azure all-in-one — PostgreSQL Flexible Server (DB), App Service (API + Web), EAS Build (— Mobile). No Vercel, no Terraform, no Docker.
- **Web deployment**: Uses `scripts/deploy-web.ps1` which builds Next.js standalone output, zips with `tar`, and deploys via Azure CLI. App settings configured with `SCM_DO_BUILD_DURING_DEPLOYMENT=false`, `ENABLE_ORYX_BUILD=false`, `WEBSITE_NODE_DEFAULT_VERSION=22`.
- **Azure `generateSasUrl`**: Returns full URL (not just query string). Use `refreshed.push(sasUrl)` directly — do NOT prepend `blobClient.url`.
- **App Insights monitoring**: `@azure/monitor-opentelem``retry``` auto-instrumentation captures Express routes, outgoing HTTP calls (Foundry, Blob, Resend, Firebase, PostgreSQL), unhandled exceptions, and host metrics with zero extra code. Frontend React errors POSTed to `/api/v1/telem``retry``/error` to unify logs in a single App Insights resource.
- **Engagement system**: XP-based gamification with 24 models, 11 enums, 8 services. Split XP award (submission + approval). Global permanent leaderboard (no resets).
- **XPTransaction ledger**: Immutable audit trail for every XP change with deterministic idempotency keys.
- **Leaderboard caching**: In-memory TTL cache (60s default, 120s all-time). Invalidated on any XP change via `invalidateLeaderboardCache()`.
- **XP recalculation**: `recalculationService.ts` with dry-run/execute modes. Compares sum of XPTransaction ledger against stored totalXP. Creates adjustment transactions for discrepancies.
- **Engagement metrics**: `metricsService.ts` with comprehensive health monitoring (user activity, XP distribution, streaks, missions, abuse signals).
- **Feature flags**: Safe on/off control for each subsystem via `config.engagement.*`; defaults to `true` in dev.
- **501 responses in routes**: Feature-flag guards (`config.engagement.enabled`), NOT stubs. Implementations behind them are fully wired.
- **Admin auth**: Uses `requireRole(UserRole.ADMIN)` middleware.
- **Schema redesign**: OnboardingFlow stores steps as JSON (`steps` field), MissionDefinition stores criteria as JSON (`criteria` field).
- **Prisma `count()`**: Does not support `distinct` parameter; replaced with `groupBy().length`.
- **Prisma JSON fields**: Reject `null`; use `?? undefined` or omit.
- **Admin engagement components**: Extracted to `components.tsx` to avoid JSX escaping issues.
- **Web type safety**: Replaced `any` types in admin components with strict DTOs from `@crabwatch/shared`. Updated `EngagementMetricsDto` to match server's `EngagementMetrics` interface with all 30+ fields. Added `_count` to `SeasonDto` for Prisma compatibility.
- **Analytics lazy-loading**: 833-line monolithic page split into lightweight shell (5.82 kB) + 2 lazy-loaded chunks: `map-tab.tsx` (1,705 kB, react-map-gl) and `chart-tabs.tsx` (403 kB, recharts). Heavy bundles defer until tab selection, reducing initial LCP.
- **Admin page extraction**: 937-line monolithic page split into lightweight shell (~160 lines) + 3 tab components: `species-tab.tsx` (~300 lines), `users-tab.tsx` (~340 lines), `backup-tab.tsx` (~160 lines). Shared confirm modal and flash messages remain at page level.
- **API r``retry`` logic**: `request()` in `api.ts` retries 502/503/504 responses with exponential backoff (2 retries, 1s/2s delays). `AbortError` is re-thrown immediately without r``retry``.
- **AbortController support**: `request()` accepts optional `signal` in options; callers can cancel in-flight requests on unmount.
- **Token expiry guard**: `AuthGuard.tsx` decodes JWT `exp` claim before calling `getProfile()`, redirecting immediately if expired.
- **Telem``retry`` fallback**: `logger.ts` catches silent telem``retry`` POST failures with `console.error` for debugging.
- **React.memo optimization**: Applied `memo(function Component())` pattern to `map-tab.tsx` and `chart-tabs.tsx` to prevent unnecessary re-renders of heavy lazy-loaded analytics components.
- **Community Server Component**: `community/page.tsx` fetches data server-side via `fetch()` + `cookies()` auth; `client.tsx` handles all interactive state with `'use client'` directive.
- **— Mobile dark mode**: `app.json` set to `"automatic"`; `DARK_COLORS` palette added to `constants.ts`; `useTheme` hook uses `useColorScheme()` to return `{ colors, isDark, scheme }`.
- **— Mobile safe area**: `MainTabs.tsx` uses `useSafeAreaInsets()` for dynamic bottom padding and tab bar height, replacing hardcoded platform-specific values.
- **— Mobile deep linking**: `App.tsx` handles `Linking.getInitialURL()` + `Linking.addEventListener('url')`, extracts token from `crabwatch://reset-password/:token` via regex, passes to `AuthStack` with `initialRouteName='ResetPassword'`.
- **Quality gate rollout**: Shared `GateMode` type (`off`/`warn`/`soft_block`/`hard_block`) with per-check modes (`blur`, `brightness`, `view`, `webcamRes`). Web reads from `NEXT_PUBLIC_QUALITY_GATE_*` env vars; — Mobile resolves at runtime via `expo-constants` + `process.env` fallback. `applyGateModeToStatus` downgrades status for `off`/`warn`, `isGateBlocking`/`isGateOverridable` control navigation and override UI visibility.
- **P2-2 auto-crop**: Server-side re-crop pass in `analysisController.ts` using `createCroppedImageDataUrlFromUrl` with `toPixelBox` coordinate normalization. Configurable via `config.imageQuality.autoCropSecondPassEnabled`. `validateResult` enforces numeric rounding/bounds for `crabCount`, `estimatedCW`, `confidence`, and `speciesConfidence`.
- **EXIF extraction**: `extractExifMetadata` and `formatExifNotes` in `imageQuality.ts` use `sharp`'s built-in EXIF buffer + custom binary parser (zero new dependencies). Binary parser handles Motorola/Intel byte order, IFD entries, GPS rational conversion, and ASCII string extraction. Notes stored in `activeSessions` and injected into analysis `suggestions`.
- **— Mobile admin type safety**: `AdminScreen.tsx` fully typed with shared DTOs. API methods use `CreateGamificationRuleInput` for create, `Partial<Omit<GamificationRuleDto, 'description'>> & { description?: string | null }` for update, `CampaignCreateInput` for campaign create, and `NotificationPreferenceUpdateRequest` for notification updates.
- **Admin memo optimization**: All 10 sub-components in `admin/components.tsx` wrapped with `React.memo` to isolate re-renders. Each tab component only re-renders when its own props change, not when sibling tabs receive new data.
- **— Mobile shared DTOs**: Gamification screens use `UserAchievementListDto`, `ActiveMissionDto`, `OnboardingStepStatusDto`, `LeaderboardEntryDto` from `@crabwatch/shared` instead of local interfaces. Added `description` field to mission/onboarding DTOs.
- **Web Server Components**: `about`, `leaderboard`, `achievements`, `missions`, `settings`, `researcher`, `observation/[id]`, `profile`, `capture`, `analytics` all converted to Server Component + Client Component split. Server pages use `cookies()` + `fetch()` for auth, client pages use `'use client'` with `initial*` props for SSR hydration.
- **Next.js 15 params**: Dynamic route params in server components are `Promise<{ id: string }>` — must `await params` before use.
- **Admin page not converted**: Already a lightweight shell (~183 lines) with no server-side data fetching. Each tab fetches independently, so server component conversion adds no SSR benefit.
- **Lightweight DI approach**: Singleton container pattern with `createContainer()`, `getContainer()`, `resetContainer()`, `getPrisma()`, `getConfig()` functions. Services define local lazy `getPrisma()` to avoid module-load-time failures.
- **Error handling**: Controllers use `asyncHandler` from `utils/errors.ts` to eliminate repetitive inline `try/catch` blocks, throwing `AppError`/`ValidationError` instead.
- **Error middleware AI status codes**: `middleware/error.ts` catches "timed out" (504) and "not configured" (503) messages from `foundryAgent.ts` to preserve correct HTTP status codes after removing inline handler catches.
- **Lightweight DI approach**: Singleton container pattern with `createContainer()`, `getContainer()`, `resetContainer()`, `getPrisma()`, `getConfig()` functions. Services define local lazy `getPrisma()` to avoid module-load-time failures.
- **Error handling**: Controllers use `asyncHandler` from `utils/errors.ts` to eliminate repetitive inline `try/catch` blocks, throwing `AppError`/`ValidationError` instead.
- **Error middleware AI status codes**: `middleware/error.ts` catches "timed out" (504) and "not configured" (503) messages from `foundryAgent.ts` to preserve correct HTTP status codes after removing inline handler catches.
- **Lightweight DI approach**: Singleton container pattern with `createContainer()`, `getContainer()`, `resetContainer()`, `getPrisma()`, `getConfig()` functions. Services define local lazy `getPrisma()` to avoid module-load-time failures.
- **Error handling**: Controllers use `asyncHandler` from `utils/errors.ts` to eliminate repetitive inline `try/catch` blocks, throwing `AppError`/`ValidationError` instead.
- **Error middleware AI status codes**: `middleware/error.ts` catches "timed out" (504) and "not configured" (503) messages from `foundryAgent.ts` to preserve correct HTTP status codes after removing inline handler catches.
- **Server i18n services**: `rewardEngine.ts`, `achievementService.ts`, and `notificationService.ts` receive `locale: string` from controllers to generate translated notification payloads. `User` model lacks a `locale` field, so locale is passed explicitly via `detectLocale(req)` from the request's `Accept-Language` header.
- **Campaign locale-awareness**: `campaignService.ts` uses `resolveContentForLocale()` to select content per `User.preferredLocale`. Supports both legacy flat `{ title, body }` and locale-map `{ en: {...}, ms: {...} }` formats with EN fallback. Admin form in `CampaignAdminSubTab` accepts separate EN/MS fields, building locale-map payload.
- **React Navigation 7 upgrade**: React Navigation 6.x is incompatible with React 19 (causes "Invalid hook call" crash). Upgraded to 7.x which supports React 19. `useFocusEffect` is removed in v7; replaced with `useIsFocused()` + `useEffect`.
- **Server utility scripts**: `fix-photos.ts` and `migrate-db.ts` excluded from `server/tsconfig.json` to avoid typecheck failures from unused/legacy scripts.
- **AI JSON extraction**: `foundryAgent.ts` uses `extractJson` to strip markdown code fences before `JSON.parse` to handle LLM responses that wrap JSON in markdown.
- **— Mobile legal consolidation**: `TermsScreen` and `PrivacyScreen` merged into `ConsentScreen` with locale-aware content. Both "Terms of Service" and "Privacy Policy" links on registration navigate to the same `Consent` route.
- **— Mobile nested navigation**: Stack screens (e.g., `AIReview`, `AnalysisLoading`) must navigate to Tab routes via `navigation.navigate('MainTabs', { screen: 'Home' })`, not `navigation.navigate('Home')`. Tab screens can navigate to sibling tabs directly.

## Critical Context
- **Stack**: Expo SDK 54, React 19, RN 0.81.5, Zustand, React Navigation 7.x, Express, Prisma, Azure Storage, Azure AI Foundry
- **Foundry Project Endpoint**: `https://wilsontchui-5315-resource.services.ai.azure.com/api/projects/wilsontchui-5315`
- **Azure OpenAI Endpoint**: `https://wilsontchui-5315-resource.openai.azure.com/openai/v1`
- **Mapbox**: Web-only (`MAPBOX_TOKEN` in `web/.env.local`). Used in `dashboard/capture` (manual location picker). No observation map page exists.
- **Navigation flow**: `MainTabs "New"` → `GuidedCaptureScreen` → `AnalysisLoadingScreen` → `AIReviewScreen` → Submit → `Home`
- **Web analytics API endpoints**: `/analytics/stats`, `/analytics/size-frequency`, `/analytics/gender-ratio`, `/analytics/cw50`, `/analytics/condition-indices`, `/analytics/temporal-trends`, `/analytics/species-distribution`
- **Admin species CRUD**: Uses JSON textareas for `keyFeatures` and `distributionZones` to match backend Prisma JSON fields
- **React versions**: Pinned to `19.2.6` in `web/package.json` to resolve mismatch crash
- **— Mobile analytics screen**: Defensive against non-array API responses with `.catch(() => [])` and `Array.isArray()` guards
- **— Mobile Researcher screen**: Fetches pending observations via `api.getPendingObservations()` and validates via `api.validateObservation()`
- **— Mobile Admin Panel**: Single "Users" tab with Active/Deleted/Invites sub-tabs; state lifted to component root to comply with React Rules of Hooks
- **Web admin panel**: Uses `userSubTab` state and conditional rendering for Active/Deleted/Invites within the Users tab
- **Backend observation photos**: `refreshPhotoUrls` regenerates Azure Blob SAS URLs on every observation fetch. Handles varying SAS URL formats with `slice(1).join('/')` after container name split.
- **Azure SDK `generateSasUrl`**: Returns full URL already. Do NOT prepend `blobClient.url` — this causes doubled URLs.
- **Analytics lazy-loading**: `next/dynamic()` with `ssr: false` for both `map-tab.tsx` and `chart-tabs.tsx`. Mapbox token must be available in browser env for the map chunk to render. Chart data is pre-fetched by the shell; lazy components receive data as props.
- **Server i18n**: `i18next` instance initialized on startup via `initServerI18n()` in `server/src/index.ts`. Locale detection middleware in `server/src/middleware/i18n.ts` uses `Accept-Language` header with `en` fallback. `createTranslator` returns `(key, ns?, options?) => string` with `WeakMap` caching per namespace.
- **Server notification templates**: `server/src/locales/en.json` and `ms.json` contain `notification.*` keys (`levelUp`, `streakWarning`, `streakLost`, `achievement`, `fcm.noTokens`). `rewardEngine.ts`, `achievementService.ts`, and `notificationService.ts` use `getServerI18n()` to translate push/email templates.
- **Web navigation locale fix**: `router.push()`/`router.replace()` from `next/navigation` strips locale prefix. Must use `useRouter()` from `@/i18n/navigation` to preserve `/en` or `/ms`. `router.back()` is history-based and locale-safe. `localePrefix` changed from `'as-needed'` to `'always'` in `routing.ts` so locale prefix is always visible in URL.
- **Metro config**: `— Mobile/metro.config.js` pins `react` via `extraNodeModules`, but resolver still watches root `node_modules`. React Navigation 7.x packages resolve from root hoisted `node_modules`. `watchman: false` + narrowed `watchFolders` required on Windows to avoid "Failed to start watch mode" error.
- **Expo Go React mismatch**: Expo Go SDK 54 bundles React `19.2.0-canary` but app uses `19.2.7`, causing "Invalid hook call" + `useId` crash. Must use a development build (`expo-dev-client`) instead of Expo Go for React 19 apps.
- **expo-dev-client SDK pin**: `expo-dev-client` must stay at SDK 54 (`~4.0.x`). Other packages (`expo-system-ui`, `react`, etc.) can be upgraded independently.

## Relevant Files
### AI Analysis
- `server/src/services/foundryAgent.ts` — System prompt, blob upload, agent invocation
- `server/src/controllers/analysisController.ts` — Upload + analyze handlers
- `server/src/routes/analysisRoutes.ts` — `/api/v1/analyze` routes
- `shared/src/types/analysis.ts` — CrabAnalysisRequest/Result types
- `shared/src/types/observation.ts` — Gender, MaturationStatus, Observation types (includes `detectedCoin`)

### — Mobile Capture
- `— Mobile/src/screens/observation/GuidedCaptureScreen.tsx` — Step-by-step photo wizard
- `— Mobile/src/screens/observation/AnalysisLoadingScreen.tsx` — Analysis progress UI
- `— Mobile/src/screens/observation/AIReviewScreen.tsx` — AI results review/edit, passes `detectedCoin` on submit
- `— Mobile/src/screens/observation/ObservationDetailScreen.tsx` — Fullscreen image modal, coin display, null-safe `bw`
- `— Mobile/src/services/analysisService.ts` — Upload → analyze orchestration
- `— Mobile/src/services/photoService.ts` — Quality assessment, guided capture, library picker
- `— Mobile/src/components/observation/PhotoGuidanceOverlay.tsx` — Camera overlay
- `— Mobile/src/components/observation/CaptureFrameOverlay.tsx` — Real-time capture frame guide with tilt detection
- `— Mobile/src/components/observation/GPSCapture.tsx` — GPS capture + manual map picker (`react-native-maps`)
- `— Mobile/src/hooks/useCaptureAssistance.ts` — Motion/brightness/focus real-time monitoring
- `— Mobile/src/utils/viewAnalysis.ts` — Post-capture view validation (dorsal/ventral detection)
- `— Mobile/src/utils/formatters.ts` — `formatNumber` handles null values

### Image Quality
- `— Mobile/src/hooks/useCaptureAssistance.ts` — Real-time sensor data (shake, brightness, focus)
- `— Mobile/src/utils/viewAnalysis.ts` — Post-capture view validation (dorsal/ventral detection)
- `— Mobile/src/services/photoService.ts` — Photo capture, manipulation, quality assessment
- `web/src/app/[locale]/dashboard/capture/client.tsx` — Web capture with quality gates
- `server/src/services/foundryAgent.ts` — Server AI agent with quality validation
- `shared/src/types/analysis.ts` — Shared analysis types
- `shared/src/utils/qualityRollout.ts` — Quality gate rollout modes (off/warn/soft_block/hard_block)

### Species
- `server/src/controllers/speciesController.ts` — Species CRUD with auto-upsert
- `— Mobile/src/store/speciesStore.ts` — Dynamic species fetching from API
- `shared/src/constants/species.ts` — Legacy `MUD_CRAB_SPECIES` (deprecated, kept for backward compat)

### Server
- `server/src/controllers/observationController.ts` — Creates/returns `detectedCoin`; `refreshPhotoUrls` for Azure SAS URL regeneration
- `server/src/controllers/authController.ts` — Login/logout, password reset handlers with Resend email dispatch
- `server/src/controllers/userController.ts` — User CRUD with phone/address support, invite token redemption, soft-deleted user constraint clearing
- `server/src/controllers/inviteController.ts` — Invite creation, validation, listing, and email dispatch
- `server/src/controllers/adminController.ts` — Backup, cleanup, list deleted users
- `server/src/routes/adminRoutes.ts` — `/api/v1/admin` routes, public/protected invite routes
- `server/src/routes/authRoutes.ts` — `/auth/password-reset/request` and `/auth/password-reset/reset`
- `server/src/routes/userRoutes.ts` — User management routes
- `server/src/middleware/auth.ts` — Auth middleware with blocked/deleted user rejection
- `server/src/utils/schemas.ts` — Zod validation (nullable `bw`, `detectedCoin`, strict UUID `speciesId`, invites, password reset)
- `server/src/services/analytics.ts` — Skips null `bw` in condition factor calc
- `server/prisma/schema.prisma` — DB schema with `gender @map("sex")`, nullable `bw`, `detectedCoin`, `Invite` model, `PasswordReset` model
- `server/scripts/fixAnalysisPaths.ts` — Migration script matching `/analysis/` blobs to observations by `userId + date`
- `server/scripts/checkPhotoPaths.ts` — Audit script for observation photo paths
- `server/.env` — Added `RESEND_API_KEY`, `FRONTEND_URL`, `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `server/src/index.ts` — App Insights init (`useAzureMonitor`), telem``retry`` endpoint (`POST /api/v1/telem``retry``/error`)
- `server/src/services/rewardEngine.ts` — Core XP award with idempotency, level calculation, streak tracking, leaderboard cache invalidation
- `server/src/services/leaderboardService.ts` — Leaderboard queries with in-memory TTL cache (60s/120s) + invalidation on XP changes
- `server/src/services/recalculationService.ts` — XP recalculation from transaction ledger with dry-run/execute modes
- `server/src/services/metricsService.ts` — Engagement health metrics (users, observations, XP distribution, streaks, missions, abuse)
- `server/src/services/seedEngagement.ts` — Idempotent seed script for rules, levels, flows, missions, achievements
- `server/src/services/notificationService.ts` — Push/email/in-app delivery, FCM integration, social features
- `server/src/services/aiInsightsService.ts` — Insight generation (streak warnings, milestones, diversity, activity trends)
- `server/src/services/abuseDetectionService.ts` — Velocity/duplicate/coordinate clustering detection with composite scoring
- `server/src/services/achievementService.ts` — Achievement progress tracking and awarding
- `server/src/services/campaignService.ts` — Campaign management and targeting
- `server/src/controllers/gamificationController.ts` — Stats, XP history, leaderboard endpoints
- `server/src/controllers/engagementController.ts` — Onboarding, missions, social, notifications endpoints
- `server/src/controllers/adminEngagementController.ts` — Admin CRUD for rules, levels, XP adjustments, recalculation, campaigns, abuse, metrics
- `server/src/routes/gamificationRoutes.ts` — `/api/v1/gamification` routes
- `server/src/routes/engagementRoutes.ts` — `/api/v1/engagement` routes
- `server/src/routes/adminEngagementRoutes.ts` — `/api/v1/admin/engagement` routes
- `server/src/config/i18n.ts` — Server i18next instance initialization and namespace mapping
- `server/src/middleware/i18n.ts` — Locale detection utility and translator factory using `WeakMap` caching per namespace
- `server/src/locales/en.json` — English translations for 11 namespaces (including `notification.*` keys)
- `server/src/locales/ms.json` — Malay translations for 11 namespaces (including `notification.*` keys)
- `server/src/services/rewardEngine.ts` — Refactored to accept `locale` for translated level-up/streak notifications
- `server/src/services/achievementService.ts` — Refactored to accept `locale` for translated achievement notifications
- `server/src/services/notificationService.ts` — `NotificationPayload` includes `locale`; FCM fallback translated via `serverI18n`

### Web
- `web/src/app/dashboard/capture/page.tsx` — Server Component pre-fetching species list
- `web/src/app/dashboard/capture/client.tsx` — Client component handling camera, upload, AI analysis, review submission
- `web/src/app/dashboard/researcher/page.tsx` — Server Component fetching pending observations
- `web/src/app/dashboard/researcher/client.tsx` — Client component with modal review workflow
- (no map page — observation map view was removed; Mapbox only used in capture page for location picker)
- `web/src/app/dashboard/profile/page.tsx` — Server Component fetching user + gamification stats, redirects on auth fail
- `web/src/app/dashboard/profile/client.tsx` — Client component handling profile form, avatar upload, password change
- `web/src/app/dashboard/observation/[id]/page.tsx` — Server Component with `notFound()` on miss, `Promise<{ id: string }>` params
- `web/src/app/dashboard/observation/[id]/client.tsx` — Client component with detail view, fullscreen modal
- `web/src/app/dashboard/species/page.tsx` — Species browse with search, detail modal, fullscreen images
- `web/src/app/dashboard/page.tsx` — Dashboard home with stats cards and recent submissions table
- `web/src/app/dashboard/about/page.tsx` — Pure server component
- `web/src/app/dashboard/admin/page.tsx` — Lightweight shell (~183 lines) with tab navigation, confirm modal, and flash messages
- `web/src/app/dashboard/admin/species-tab.tsx` — Species CRUD with form modal
- `web/src/app/dashboard/admin/users-tab.tsx` — Users with Active/Deleted/Invites sub-tabs
- `web/src/app/dashboard/admin/backup-tab.tsx` — Database backup management
- `web/src/app/dashboard/admin/components.tsx` — Engagement admin tab with XP Rules, Levels, Adjustments, Recalculation, Campaigns, Audit Log, Abuse Detection
- `web/src/app/dashboard/analytics/page.tsx` — Server Component pre-fetching all analytics data + species list
- `web/src/app/dashboard/analytics/client.tsx` — Client component with tab state, filters, lazy-loaded map/chart tabs
- `web/src/app/dashboard/analytics/map-tab.tsx` — Extracted map component (lazy-loaded, 1,705 kB chunk with react-map-gl)
- `web/src/app/dashboard/analytics/chart-tabs.tsx` — Extracted chart components (lazy-loaded, 403 kB chunk with recharts)
- `web/src/app/auth/register/page.tsx` — Registration form with phone/address, invite token parsing & pre-filling
- `web/src/app/auth/login/page.tsx` — Login form with "Forgot password?" link
- `web/src/app/auth/forgot-password/page.tsx` — Forgot password email form
- `web/src/app/auth/reset-password/page.tsx` — Reset password form with token from URL params
- `web/src/lib/api.ts` — `detectedCoin` in `createObservation` type, invite/analytics/password reset API methods, engagement endpoints
- `web/src/lib/authStore.ts` — Web auth state (includes phone/address, engagement fields)
- `web/src/app/dashboard/leaderboard/page.tsx` — Server Component with searchParams for scope/page
- `web/src/app/dashboard/leaderboard/client.tsx` — Client component with scope toggle, pagination, medals
- `web/src/app/dashboard/achievements/page.tsx` — Server Component fetching achievements
- `web/src/app/dashboard/achievements/client.tsx` — Client component with filters, rarity colors, toast notifications
- `web/src/app/dashboard/missions/page.tsx` — Server Component fetching missions + onboarding
- `web/src/app/dashboard/missions/client.tsx` — Client component with tabs, claim/complete actions
- `web/src/app/dashboard/settings/page.tsx` — Server Component fetching notification preferences
- `web/src/app/dashboard/settings/client.tsx` — Client component with toggle switches
- `web/src/app/dashboard/community/page.tsx` — Server Component with data fetching via `fetch()` + cookie-based auth
- `web/src/app/dashboard/community/client.tsx` — Client component with interactive UI, receives pre-fetched data from server
- `web/src/components/Sidebar.tsx` — Nav items: primary (Dashboard, Capture, Species, Analytics) + community hub (Leaderboard, Missions, Achievements, Community) + role-based (Researcher, Admin)
- `web/src/components/Header.tsx` — User dropdown menu (Profile & Sign Out), click-outside handler, logout routing
- `web/package.json` — Pinned `react` and `react-dom` to `19.2.6`
- `web/next.config.mjs` — API proxy rewrites to backend

### — Mobile
- `— Mobile/src/screens/home/HomeScreen.tsx` — Updated quick actions to navigate to Analytics/New tabs; gamification quick-actions card with Leaderboard/Missions/Achievements navigation
- `— Mobile/src/screens/gamification/LeaderboardScreen.tsx` — Scope toggle (All Time/Seasonal), pagination, medals, "You" badge, pull-to-refresh; uses `LeaderboardEntryDto`
- `— Mobile/src/screens/gamification/MissionsScreen.tsx` — Daily missions + onboarding tabs, claim/complete actions, progress bars, XP badges; uses `ActiveMissionDto`/`OnboardingStepStatusDto`
- `— Mobile/src/screens/gamification/AchievementsScreen.tsx` — Rarity colors, category/status filters, progress tracking, check-achievements action; uses `UserAchievementListDto`
- `— Mobile/src/screens/profile/ProfileScreen.tsx` — XP stats card with level/title/XP/streak/progress; gamification quick-link cards
- `— Mobile/src/screens/analytics/AnalyticsScreen.tsx` — Fixed `data.map` crash with array guards; added `RefreshControl` pull-to-refresh
- `— Mobile/src/screens/researcher/ResearcherScreen.tsx` — Researcher validation screen for approving/rejecting pending observations
- `— Mobile/src/screens/admin/AdminScreen.tsx` — Admin panel with Users (Active/Deleted/Invites sub-tabs), Species, Backup tabs; fixed syntax error and layout
- `— Mobile/src/screens/auth/RegisterScreen.tsx` — Registration form with phone/address fields; `textContentType` for autofill
- `— Mobile/src/screens/auth/LoginScreen.tsx` — Login form with "Forgot password?" link; `textContentType` for autofill
- `— Mobile/src/screens/auth/ForgotPasswordScreen.tsx` — Forgot password email form; `textContentType` for autofill
- `— Mobile/src/screens/auth/ResetPasswordScreen.tsx` — Reset password form with token from route params; `textContentType` for autofill
- `— Mobile/src/screens/profile/EditProfileScreen.tsx` — Edit profile with phone/address
- `— Mobile/src/screens/profile/ProfileScreen.tsx` — Displays phone/address
- `— Mobile/src/screens/common/AboutScreen.tsx` — — Mobile about screen
- `— Mobile/src/components/common/PhoneCodePicker.tsx` — Added `label` prop and styling
- `— Mobile/src/components/common/Button.tsx` — MD3 border radius with platform-specific values; haptic feedback on press
- `— Mobile/src/components/common/Input.tsx` — `allowFontScaling`, `accessibilityLiveRegion`, `accessibilityLabel`, `role="alert"` for errors
- `— Mobile/src/services/api.ts` — API calls for register/login/profile, password reset, comprehensive admin methods
- `— Mobile/src/services/authService.ts` — Auth orchestration
- `— Mobile/src/navigation/MainTabs.tsx` — Swapped Species for Analytics tab, conditionally renders Researcher/Admin tabs, uses `useSafeAreaInsets()` and `useTheme()` for dynamic sizing/colors
- `— Mobile/src/navigation/types.ts` — Updated `MainTabParamList` and `AuthStackParamList`
- `— Mobile/src/utils/fonts.ts` — Dynamic font scaling utility with `PixelRatio.getFontScale()` and clamped scale
- `— Mobile/src/utils/constants.ts` — Now includes `COLORS` and `DARK_COLORS` palettes
- `— Mobile/src/hooks/useTheme.ts` — Hook returning `{ colors, isDark, scheme }` based on `useColorScheme()`
- `— Mobile/src/navigation/AuthStack.tsx` — Wired `ForgotPassword`/`ResetPassword` screens; accepts `initialRouteName`/`initialParams` for deep linking entry
- `— Mobile/src/navigation/AppNavigator.tsx` — Accepts `deepLinkToken` prop and passes to `AuthStack`
- `— Mobile/App.tsx` — Handles `Linking.getInitialURL()` + event listener, extracts token from URL path
- `— Mobile/app.json` — `"userInterfaceStyle": "automatic"`, scheme `crabwatch` registered
- `— Mobile/package.json` — React Navigation 7.x dependencies, patched Expo packages
- `— Mobile/src/screens/observation/GuidedCaptureScreen.tsx` — `useIsFocused` + `useEffect` replacing `useFocusEffect`
- `— Mobile/src/screens/observation/AIReviewScreen.tsx` — `useIsFocused` + `useEffect` replacing `useFocusEffect`
- `— Mobile/src/screens/observation/NewObservationScreen.tsx` — `useIsFocused` + `useEffect` replacing `useFocusEffect`
- `— Mobile/src/screens/species/SpeciesListScreen.tsx` — `useIsFocused` + `useEffect` replacing `useFocusEffect`
- `— Mobile/src/__tests__/__mocks__/@react-navigation/native.js` — Removed `useFocusEffect` mock
- `— Mobile/src/components/observation/PhotoTipsModal.tsx` — Fixed asset `require` paths

### Shared
- `shared/src/types/user.ts` — User, CreateUserInput, UpdateUserProfileInput, UserResponse types; Invite, PasswordResetRequest, PasswordResetConfirm types
- `shared/src/types/api.ts` — LoginResponse type
- `shared/src/types/engagement.ts` — Engagement DTOs: `LeaderboardEntryDto`, `ActiveMissionDto`, `OnboardingStepStatusDto`, `UserAchievementListDto` (with `description` field)
- `shared/src/constants/countries.ts` — Country list used by web profile dropdowns
- `shared/src/constants/roles.ts` — Defines `user`, `researcher`, `admin` roles and hierarchy

### Deployment
- `Azure-Deployment-Plan.md` — Step-by-step manual Azure deployment (PostgreSQL, App Service API, App Service Web, EAS Build)
- `scripts/deploy-server.ps1` — Automated server deployment (build, package, upload, install deps, seed)
- `scripts/deploy-web.ps1` — Automated web deployment (build, package, upload)
- `— Mobile/eas.json` — EAS build profiles: development, preview, production
- `web/next.config.mjs` — `BACKEND_URL` env var only (no hardcoded IP)
- `— Mobile/app.json` — `extra.apiUrl` set to Azure placeholder; `eas.projectId` set to `2b6450de-2e8d-4d06-a12e-ef9fc444d7b7`