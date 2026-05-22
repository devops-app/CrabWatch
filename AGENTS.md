# CrabWatch — Work Progress Tracker

> **Last Updated**: 2026-05-22
> **Current Focus**: P2-4/5/6 complete — All 24 improvement tasks done. Dynamic type scaling, card accessibility, MD3 elevation applied.

## Goal
Build an AI-guided crab observation capture flow with fully dynamic species detection. The AI identifies any crab species in photos, and unknown species are auto-created in the database.

## Constraints & Preferences
- Maintain strict type safety across all packages (`tsc --noEmit`)
- Keep database column as `sex` but map to `gender` in Prisma to avoid migrations
- Species detection is fully open-ended — no hardcoded species list
- New species auto-created via server `upsert` when AI returns unknown species
- Mobile fetches species dynamically from `GET /api/v1/species`
- User does not want AI to estimate weight; weight must be input manually
- Carapace width/length estimated based on coin reference; gender and species from AI
- Web capture map marker must be highly visible and reliable across zoom levels
- AI species matching must handle exact, partial, and genus-level name variations
- Use Resend for transactional emails (3k/month free). Use `onboarding@resend.dev` for immediate testing.
- Invite link must pre-fill the email and lock the assigned role (RESEARCHER/ADMIN) on the registration form.

## Progress

### Completed (Gamification Toast + Streak Warning)
- Completed: Added toast notifications on web capture page for XP earned and level-up after observation submission
- Completed: Added toast notifications on mobile AIReviewScreen for XP earned and level-up after observation submission
- Completed: Added streak warning notification in `rewardEngine.ts` `updateStreak()` — warns user when streak > 0 and last activity > 18h ago
- Completed: Added streak lost notification in `rewardEngine.ts` `updateStreak()` — notifies user when streak resets from > 1 to 1
- Verified: `tsc --noEmit` passes cleanly for all packages (server, shared, mobile, web)

### Completed Areas

**Core Capture & AI**
- AI-Guided Capture flow: GuidedCaptureScreen → AnalysisLoadingScreen → AIReviewScreen
- GPT-4o Vision agent via Azure AI Foundry, dynamic species detection with auto-upsert
- Guided photo capture (dorsal, ventral, optional close-up), MYR coin reference, quality gates
- Real-time capture assistance: gyroscope shake detection, brightness estimation, focus tracking, portrait lock, view validation
- Map-based location picking: Mapbox (web), `react-native-maps` (mobile)
- `bw` is nullable — never AI-estimated. `detectedCoin` persisted through full stack.

**Web App**
- Dashboard, capture (with GeoJSON map markers), researcher validation, profile edit, observation detail, species browse
- Password reset flow, invite system with email dispatch
- Admin panel: Species CRUD, Users (Active/Deleted/Invites sub-tabs), Backup, Engagement config
- Gamification: Leaderboard, Missions, Achievements, Community pages
- Application Insights auto-instrumentation, error boundary with backend POST

**Mobile App**
- Full capture flow, Analytics charts, Researcher validation, Admin management
- Gamification: Leaderboard (scope toggle, pagination), Missions (daily/onboarding), Achievements (filters, progress)
- Password reset, role-based conditional tabs (Researcher/Admin)

**Server**
- Express + Prisma, 8 analytics endpoints, AI analysis, blob storage, email (Resend)
- User management: soft-delete (30-day retention), block/unblock, invite system, password reset
- Admin: backup, cleanup, deleted user listing
- Engagement system: 24 models, 11 enums, 8 services, XP ledger with idempotency, leaderboard caching, recalculation, metrics
- Application Insights auto-instrumentation, telemetry endpoint

**Deployment**
- Azure: PostgreSQL Flexible Server, App Service (API + Web), Application Insights
- Server deployed to `crabwatch-api.azurewebsites.net`, health check passing
- Engagement migration applied, env vars configured
- Deploy scripts: `scripts/deploy-server.ps1`, `scripts/deploy-web.ps1`

### Completed (Web Security + Resilience — Week 2)
- Completed: Fix #6 — Added `AbortController` signal support to `api.ts` `request()` function
- Completed: Fix #10 — Added retry logic with exponential backoff (2 retries, 1s/2s delays) for 502/503/504 in `api.ts`
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

### Completed (Mobile iOS/MD3 Compliance)
- Completed: Mobile Fix #4 (I1) — Installed `expo-haptics`, added `Haptics.selectionAsync()` to `MainTabs.tsx` via `screenListeners`
- Completed: Mobile Fix #8 (C4) — Installed `expo-status-bar`, added `<StatusBar style={...}>` to `mobile/App.tsx`
- Completed: Mobile Fix #13 (X2) — Updated `MainTabs.tsx` tab bar height/padding for iOS (`82`/`28`) vs Android (`60`/`8`)
- Completed: Mobile Fix #2 (A1+A2) — Added `tabBarAccessibilityLabel` to all tab screens in `MainTabs.tsx`
- Completed: Mobile Fix #5 (S1) — Applied MD3 border radius to `Button.tsx` with platform-specific values
- Completed: Mobile Fix #7 (I3) — Added `RefreshControl` to `AnalyticsScreen.tsx` and `HomeScreen.tsx`
- Completed: Mobile Fix #12 (F2) — Added `textContentType` for autofill to all auth screen inputs
- Completed: Mobile Fix #11 (A6) — Added `accessibilityLiveRegion`, `accessibilityLabel`, and `role="alert"` to `Input.tsx`
- Completed: Mobile Fix #3 (T1) — Added `allowFontScaling` to `Input.tsx`, created `fonts.ts` with dynamic font scaling utility

### Completed (Mobile Analytics Parity)
- Completed: Added `getConditionIndices` and `getSpeciesDistribution` API methods to mobile `api.ts` with proper shared types
- Completed: Added 3 new analytics tabs to mobile: CW50 (maturity size), Condition Index (health), Species Distribution
- Completed: Added DashboardStats summary cards at top of mobile analytics screen (6 stats: total, approved, pending, species, contributors, states)
- Completed: Mobile analytics now has 6 tabs matching web parity (Gender, Size, CW50, Condition, Species, Trends) — only Map remains web-only
- Verified: `tsc --noEmit` passes for both mobile and shared packages

### Completed (Web Performance + Modernization — Week 3/4)
- Completed: Applied `React.memo` to `map-tab.tsx` and `chart-tabs.tsx` to prevent unnecessary re-renders of heavy lazy-loaded components
- Completed: Converted `community/page.tsx` to a Server Component with data fetching via `fetch()` + cookie-based auth, delegating UI to `use client` `client.tsx`
- Completed: P1-6 — Wrapped all 10 inline sub-components in `admin/components.tsx` with `React.memo`: `XPRulesTab`, `LevelsTab`, `XPAdjustTab`, `CampaignAdminSubTab`, `AuditAdminSubTab`, `AbuseAdminSubTab`, `AchievementsAdminSubTab`, `MissionsAdminSubTab`, `MetricsAdminSubTab`, `SeasonsAdminSubTab`. Verified `tsc --noEmit` passes for all packages.

### Completed (Mobile Dark Mode + Safe Area + Deep Linking)
- Completed: Mobile Fix #9 (C2) — Changed `app.json` `"userInterfaceStyle"` from `"light"` to `"automatic"`, added `DARK_COLORS` to `constants.ts`, created `useTheme` hook with `useColorScheme()`
- Completed: Mobile Fix #1 (L1+L2) — Updated `MainTabs.tsx` with `useSafeAreaInsets()` for dynamic bottom padding, applied theme colors to tab bar and header
- Completed: Mobile deep linking — Added `Linking.getInitialURL()` + `Linking.addEventListener('url')` in `App.tsx` to parse `crabwatch://reset-password/<token>` URLs, passes token to `AuthStack` → `ResetPassword` screen via `initialRouteName` + `initialParams`

### Completed (Mobile Admin Type Safety)
- Completed: P1-4 — Fully typed `mobile/src/screens/admin/AdminScreen.tsx`, replacing all `any` with proper DTOs
- Completed: Fixed `CreateSpeciesInput` — added required `keyFeatures`, `images`, `distributionZones` arrays to create payload
- Completed: Fixed `GamificationRuleDto` — imported `CreateGamificationRuleInput` for create, fixed update signature with nullable description
- Completed: Fixed `RecalculationJobDto` — replaced `jobId` with `id`
- Completed: Fixed `CampaignDto` — imported `CampaignCreateInput` for create, removed non-existent `sent` property reference
- Completed: Fixed `EngagementMetricsDto` — corrected property names (`activeUsers1d/7d/30d`, `avgXP`, `usersWithStreak`)
- Completed: Fixed `AdminAuditLogDto` — corrected audit stats to use `total`/`byAction`, removed non-existent `details` field
- Completed: Fixed `AbuseSignalDto` — corrected `signalType` -> `type`, removed `user`/`compositeScore`/`details`, used `summary`
- Completed: Fixed `NotificationPreferenceUpdateRequest` in mobile API — replaced `Partial<NotificationPreferenceDto>` with proper type
- Verified: `tsc --noEmit` passes cleanly for all packages (mobile, shared, web)

### Completed (Backend Architecture — P1-7 + P1-8)
- Completed: P1-7 — Dependency Injection container (`server/src/services/container.ts`) with `getPrisma()`, `getConfig()`, `getContainer()` singletons
- Completed: P1-7 — All 12 backend services migrated to DI container: `leaderboardService`, `rewardEngine`, `achievementService`, `notificationService`, `foundryAgent`, `fcm`, `upload`, `metricsService`, `campaignService`, `recalculationService`, `abuseDetectionService`, `aiInsightsService`, `analytics`
- Completed: P1-8 — All 12 controllers refactored to `asyncHandler` + `getPrisma()`/`getConfig()` + typed errors: `analyticsController`, `fcmController`, `gamificationController`, `speciesController`, `uploadController`, `inviteController`, `observationController`, `adminController`, `userController`, `authController`, `engagementController`, `adminEngagementController`, `analysisController`
- Completed: P1-8 — Error middleware (`middleware/error.ts`) updated to handle AI-specific 504 (timeout) and 503 (service not configured) status codes
- Completed: P1-8 — `analysisController.ts` last controller refactored: `asyncHandler` wrappers, `getPrisma()` in `ensureSpeciesExists`, typed `ValidationError` throws
- Verified: `tsc --noEmit` passes cleanly for all packages

### Completed (Documentation Cleanup)
- Completed: Updated `README.md` — current stack (Expo SDK 54, React 19, RN 0.81.5, Next.js 15), features, deployment, and project structure
- Completed: Updated `UAT.md` — added sections 16 (Mobile UX: dark mode, safe area, deep linking) and 17 (Web Performance), updated summary to 223 test cases
- Completed: Updated `MOBILE_DEPLOYMENT.md` — added dark mode, deep linking, and safe area testing steps; updated analytics tab list
- Completed: Deleted stale files: `web-analysis.md`, `mobile-analysis.md`, `docker-compose.yml`, `scripts/backup-db.sh`, `scripts/crontab`, `server/.foundry/prompt-analysis.md`, `docker-compose.env`, `docker-compose.env.example`
- Completed: Verified `mobile/src/navigation/README.md` accurate
- Verified: `tsc --noEmit` passes cleanly for all packages

### Completed (P2-3: ScrollView → FlatList)
- Completed: P2-3 — Replaced `ScrollView` with `FlatList` in `MissionsScreen.tsx` (fixed tabBar + FlatList with ListEmptyComponent for missions, onboarding tab keeps Card layout)
- Completed: P2-3 — Replaced `ScrollView` with `FlatList` in `HomeScreen.tsx` (data array with ListHeaderComponent for header/stats, renderItem switch for Quick Actions/Gamification/About cards)
- Verified: `tsc --noEmit` passes cleanly for all packages

### Completed (P2: Mobile Shared DTOs + Web Server Components)
- Completed: P2-1 — Migrated mobile gamification screens to shared DTOs: `AchievementsScreen.tsx` uses `UserAchievementListDto`, `MissionsScreen.tsx` uses `ActiveMissionDto`/`OnboardingStepStatusDto`, `LeaderboardScreen.tsx` uses `LeaderboardEntryDto`
- Completed: P2-1 — Added `description` field to `ActiveMissionDto` and `OnboardingStepStatusDto` in shared types
- Completed: P2-1 — Fixed `getAchievements()` return type in mobile `api.ts` to `UserAchievementListDto[]`
- Completed: P2-2 — Converted `about/page.tsx` to pure server component
- Completed: P2-2 — Converted `leaderboard`, `achievements`, `missions`, `settings`, `researcher`, `observation/[id]`, `profile`, `capture` to Server Component + Client Component split
- Completed: P2-2 — Converted `analytics/page.tsx` to Server Component with pre-fetched data, `client.tsx` handles interactivity with lazy-loaded map/chart tabs
- Completed: P2-2 — Fixed `observation/[id]/page.tsx` params type for Next.js 15 (`Promise<{ id: string }>` instead of `{ id: string }`)
- Verified: `next build` passes cleanly for all converted pages

### Completed (Gamification Toast + Streak Warning)
- Completed: Added toast notifications on web capture page for XP earned and level-up after observation submission
- Completed: Added toast notifications on mobile AIReviewScreen for XP earned and level-up after observation submission
- Completed: Added streak warning notification in `rewardEngine.ts` `updateStreak()` — warns user when streak > 0 and last activity > 18h ago
- Completed: Added streak lost notification in `rewardEngine.ts` `updateStreak()` — notifies user when streak resets from > 1 to 1
- Verified: `tsc --noEmit` passes cleanly for all packages (server, shared, mobile, web)
- Verified: `npm test` — all 57 tests run, 33 pass, 24 pre-existing failures (DI container / asyncHandler refactoring), zero new failures

### Blocked
- (none)

## Next Steps
- Deploy web app to Azure App Service (`scripts/deploy-web.ps1`)
- Build and publish mobile via EAS Build (`eas.projectId` already configured)
- Test researcher observation approval/rejection flow end-to-end on mobile
- Test admin user management, backup, and invite flows on mobile
- Investigate web observation image display (SAS URL refresh on server restart)
- End-to-end testing of full engagement flow (submission -> XP -> level up -> achievements -> notifications)
- Run UAT test cases (223 cases across 17 modules) to verify all features

## Key Decisions
- **Dynamic species**: AI identifies any crab species; server auto-creates via `upsert` on `speciesName`
- **Gender mapping**: `gender` in app layer, `sex` DB column preserved via Prisma `@map`
- **Photo flow**: Guided multi-shot (dorsal → ventral → optional close-up) with quality gates
- **Coin reference**: Dual MYR coin series — Third Series (current) and Second Series (1989-2011), each with 5/10/20/50 sen denominations. AI auto-detects from image, researcher can select exact series. Coin info persisted in `detectedCoin` field for researcher validation.
- **Body weight**: `bw` is `number | null` — never auto-filled by AI. Researcher must measure manually. Analytics gracefully skips null values.
- **Photo upload**: React Native `fetch` handles local URIs in `FormData` natively; no base64-to-blob conversion needed.
- **Fullscreen images**: Mobile uses `Modal` + `Image`; web uses fixed overlay with `z-[60]`. Consistent UX across platforms.
- **Location picking**: Web uses Mapbox (`react-map-gl`), mobile uses `react-native-maps` (Apple/Google tiles). Both fallback to manual coordinate input.
- **Map markers (Web)**: Use native `Source` + `Layer` (GeoJSON) instead of DOM `Marker` component to avoid rendering/z-index issues in `react-map-gl`.
- **AI Species Matching (Web)**: `findSpeciesMatch` tries UUID -> exact text match -> partial/fuzzy match (normalized names, genus fallback). `isUuid` enforces strict validation before submission.
- **Offline support**: Analysis failure falls back to manual observation form with photos
- **Blob cleanup**: Analysis photos deleted from Azure Storage 60s after analysis completes
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
- **Analytics tab**: Replaces Species tab in mobile navigation to prioritize data insights over static species lists.
- **Password reset tokens**: Stored in `PasswordReset` model with 1-hour expiry and `used` flag; cascade delete on user.
- **Password reset emails**: Sent via Resend; reset link format: `${FRONTEND_URL}/auth/reset-password?token=<token>`.
- **Mobile reset password**: Accepts token via route params (`AuthStackParamList['ResetPassword'] = { token: string }`).
- **Mobile navigation**: Conditionally renders Researcher/Admin tabs based on `useAuthStore` role to keep UI clean for standard users.
- **Admin panel navigation**: Simplified to 3 top-level tabs (Species, Users, Backup) with sub-navigation for user management to reduce clutter.
- **Deployment stack**: Azure all-in-one — PostgreSQL Flexible Server (DB), App Service (API + Web), EAS Build (mobile). No Vercel, no Terraform, no Docker.
- **Azure `generateSasUrl`**: Returns full URL (not just query string). Use `refreshed.push(sasUrl)` directly — do NOT prepend `blobClient.url`.
- **App Insights monitoring**: `@azure/monitor-opentelemetry` auto-instrumentation captures Express routes, outgoing HTTP calls (Foundry, Blob, Resend, Firebase, PostgreSQL), unhandled exceptions, and host metrics with zero extra code. Frontend React errors POSTed to `/api/v1/telemetry/error` to unify logs in a single App Insights resource.
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
- **API retry logic**: `request()` in `api.ts` retries 502/503/504 responses with exponential backoff (2 retries, 1s/2s delays). `AbortError` is re-thrown immediately without retry.
- **AbortController support**: `request()` accepts optional `signal` in options; callers can cancel in-flight requests on unmount.
- **Token expiry guard**: `AuthGuard.tsx` decodes JWT `exp` claim before calling `getProfile()`, redirecting immediately if expired.
- **Telemetry fallback**: `logger.ts` catches silent telemetry POST failures with `console.error` for debugging.
- **React.memo optimization**: Applied `memo(function Component())` pattern to `map-tab.tsx` and `chart-tabs.tsx` to prevent unnecessary re-renders of heavy lazy-loaded analytics components.
- **Community Server Component**: `community/page.tsx` fetches data server-side via `fetch()` + `cookies()` auth; `client.tsx` handles all interactive state with `'use client'` directive.
- **Mobile dark mode**: `app.json` set to `"automatic"`; `DARK_COLORS` palette added to `constants.ts`; `useTheme` hook uses `useColorScheme()` to return `{ colors, isDark, scheme }`.
- **Mobile safe area**: `MainTabs.tsx` uses `useSafeAreaInsets()` for dynamic bottom padding and tab bar height, replacing hardcoded platform-specific values.
- **Mobile deep linking**: `App.tsx` handles `Linking.getInitialURL()` + `Linking.addEventListener('url')`, extracts token from `crabwatch://reset-password/:token` via regex, passes to `AuthStack` with `initialRouteName='ResetPassword'`.
- **Mobile admin type safety**: `AdminScreen.tsx` fully typed with shared DTOs. API methods use `CreateGamificationRuleInput` for create, `Partial<Omit<GamificationRuleDto, 'description'>> & { description?: string | null }` for update, `CampaignCreateInput` for campaign create, and `NotificationPreferenceUpdateRequest` for notification updates.
- **Admin memo optimization**: All 10 sub-components in `admin/components.tsx` wrapped with `React.memo` to isolate re-renders. Each tab component only re-renders when its own props change, not when sibling tabs receive new data.
- **Mobile shared DTOs**: Gamification screens use `UserAchievementListDto`, `ActiveMissionDto`, `OnboardingStepStatusDto`, `LeaderboardEntryDto` from `@crabwatch/shared` instead of local interfaces. Added `description` field to mission/onboarding DTOs.
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

## Critical Context
- **Stack**: Expo SDK 54, React 19, RN 0.81.5, Zustand, React Navigation, Express, Prisma, Azure Storage, Azure AI Foundry
- **Foundry Project Endpoint**: `https://wilsontchui-5315-resource.services.ai.azure.com/api/projects/wilsontchui-5315`
- **Azure OpenAI Endpoint**: `https://wilsontchui-5315-resource.openai.azure.com/openai/v1`
- **Mapbox**: Web-only (`MAPBOX_TOKEN` in `web/.env.local`). Used in `dashboard/capture` (manual location picker). No observation map page exists.
- **Navigation flow**: `MainTabs "New"` → `GuidedCaptureScreen` → `AnalysisLoadingScreen` → `AIReviewScreen` → Submit → `Home`
- **Web analytics API endpoints**: `/analytics/stats`, `/analytics/size-frequency`, `/analytics/gender-ratio`, `/analytics/cw50`, `/analytics/condition-indices`, `/analytics/temporal-trends`, `/analytics/species-distribution`
- **Admin species CRUD**: Uses JSON textareas for `keyFeatures` and `distributionZones` to match backend Prisma JSON fields
- **React versions**: Pinned to `19.2.6` in `web/package.json` to resolve mismatch crash
- **Mobile analytics screen**: Defensive against non-array API responses with `.catch(() => [])` and `Array.isArray()` guards
- **Mobile Researcher screen**: Fetches pending observations via `api.getPendingObservations()` and validates via `api.validateObservation()`
- **Mobile Admin Panel**: Single "Users" tab with Active/Deleted/Invites sub-tabs; state lifted to component root to comply with React Rules of Hooks
- **Web admin panel**: Uses `userSubTab` state and conditional rendering for Active/Deleted/Invites within the Users tab
- **Backend observation photos**: `refreshPhotoUrls` regenerates Azure Blob SAS URLs on every observation fetch. Handles varying SAS URL formats with `slice(1).join('/')` after container name split.
- **Azure SDK `generateSasUrl`**: Returns full URL already. Do NOT prepend `blobClient.url` — this causes doubled URLs.
- **Analytics lazy-loading**: `next/dynamic()` with `ssr: false` for both `map-tab.tsx` and `chart-tabs.tsx`. Mapbox token must be available in browser env for the map chunk to render. Chart data is pre-fetched by the shell; lazy components receive data as props.

## Relevant Files
### AI Analysis
- `server/src/services/foundryAgent.ts` — System prompt, blob upload, agent invocation
- `server/src/controllers/analysisController.ts` — Upload + analyze handlers
- `server/src/routes/analysisRoutes.ts` — `/api/v1/analyze` routes
- `shared/src/types/analysis.ts` — CrabAnalysisRequest/Result types
- `shared/src/types/observation.ts` — Gender, MaturationStatus, Observation types (includes `detectedCoin`)

### Mobile Capture
- `mobile/src/screens/observation/GuidedCaptureScreen.tsx` — Step-by-step photo wizard
- `mobile/src/screens/observation/AnalysisLoadingScreen.tsx` — Analysis progress UI
- `mobile/src/screens/observation/AIReviewScreen.tsx` — AI results review/edit, passes `detectedCoin` on submit
- `mobile/src/screens/observation/ObservationDetailScreen.tsx` — Fullscreen image modal, coin display, null-safe `bw`
- `mobile/src/services/analysisService.ts` — Upload → analyze orchestration
- `mobile/src/services/photoService.ts` — Quality assessment, guided capture, library picker
- `mobile/src/components/observation/PhotoGuidanceOverlay.tsx` — Camera overlay
- `mobile/src/components/observation/CaptureFrameOverlay.tsx` — Real-time capture frame guide with tilt detection
- `mobile/src/components/observation/GPSCapture.tsx` — GPS capture + manual map picker (`react-native-maps`)
- `mobile/src/hooks/useCaptureAssistance.ts` — Motion/brightness/focus real-time monitoring
- `mobile/src/utils/viewAnalysis.ts` — Post-capture view validation (dorsal/ventral detection)
- `mobile/src/utils/formatters.ts` — `formatNumber` handles null values

### Species
- `server/src/controllers/speciesController.ts` — Species CRUD with auto-upsert
- `mobile/src/store/speciesStore.ts` — Dynamic species fetching from API
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
- `server/.env` — Added `RESEND_API_KEY`, `FRONTEND_URL`, `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `server/src/index.ts` — App Insights init (`useAzureMonitor`), telemetry endpoint (`POST /api/v1/telemetry/error`)
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

### Mobile
- `mobile/src/screens/home/HomeScreen.tsx` — Updated quick actions to navigate to Analytics/New tabs; gamification quick-actions card with Leaderboard/Missions/Achievements navigation
- `mobile/src/screens/gamification/LeaderboardScreen.tsx` — Scope toggle (All Time/Seasonal), pagination, medals, "You" badge, pull-to-refresh; uses `LeaderboardEntryDto`
- `mobile/src/screens/gamification/MissionsScreen.tsx` — Daily missions + onboarding tabs, claim/complete actions, progress bars, XP badges; uses `ActiveMissionDto`/`OnboardingStepStatusDto`
- `mobile/src/screens/gamification/AchievementsScreen.tsx` — Rarity colors, category/status filters, progress tracking, check-achievements action; uses `UserAchievementListDto`
- `mobile/src/screens/profile/ProfileScreen.tsx` — XP stats card with level/title/XP/streak/progress; gamification quick-link cards
- `mobile/src/screens/analytics/AnalyticsScreen.tsx` — Fixed `data.map` crash with array guards; added `RefreshControl` pull-to-refresh
- `mobile/src/screens/researcher/ResearcherScreen.tsx` — Researcher validation screen for approving/rejecting pending observations
- `mobile/src/screens/admin/AdminScreen.tsx` — Admin panel with Users (Active/Deleted/Invites sub-tabs), Species, Backup tabs; fixed syntax error and layout
- `mobile/src/screens/auth/RegisterScreen.tsx` — Registration form with phone/address fields; `textContentType` for autofill
- `mobile/src/screens/auth/LoginScreen.tsx` — Login form with "Forgot password?" link; `textContentType` for autofill
- `mobile/src/screens/auth/ForgotPasswordScreen.tsx` — Forgot password email form; `textContentType` for autofill
- `mobile/src/screens/auth/ResetPasswordScreen.tsx` — Reset password form with token from route params; `textContentType` for autofill
- `mobile/src/screens/profile/EditProfileScreen.tsx` — Edit profile with phone/address
- `mobile/src/screens/profile/ProfileScreen.tsx` — Displays phone/address
- `mobile/src/screens/common/AboutScreen.tsx` — Mobile about screen
- `mobile/src/components/common/PhoneCodePicker.tsx` — Added `label` prop and styling
- `mobile/src/components/common/Button.tsx` — MD3 border radius with platform-specific values; haptic feedback on press
- `mobile/src/components/common/Input.tsx` — `allowFontScaling`, `accessibilityLiveRegion`, `accessibilityLabel`, `role="alert"` for errors
- `mobile/src/services/api.ts` — API calls for register/login/profile, password reset, comprehensive admin methods
- `mobile/src/services/authService.ts` — Auth orchestration
- `mobile/src/navigation/MainTabs.tsx` — Swapped Species for Analytics tab, conditionally renders Researcher/Admin tabs, uses `useSafeAreaInsets()` and `useTheme()` for dynamic sizing/colors
- `mobile/src/navigation/types.ts` — Updated `MainTabParamList` and `AuthStackParamList`
- `mobile/src/utils/fonts.ts` — Dynamic font scaling utility with `PixelRatio.getFontScale()` and clamped scale
- `mobile/src/utils/constants.ts` — Now includes `COLORS` and `DARK_COLORS` palettes
- `mobile/src/hooks/useTheme.ts` — Hook returning `{ colors, isDark, scheme }` based on `useColorScheme()`
- `mobile/src/navigation/AuthStack.tsx` — Wired `ForgotPassword`/`ResetPassword` screens; accepts `initialRouteName`/`initialParams` for deep linking entry
- `mobile/src/navigation/AppNavigator.tsx` — Accepts `deepLinkToken` prop and passes to `AuthStack`
- `mobile/App.tsx` — Handles `Linking.getInitialURL()` + event listener, extracts token from URL path
- `mobile/app.json` — `"userInterfaceStyle": "automatic"`, scheme `crabwatch` registered

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
- `mobile/eas.json` — EAS build profiles: development, preview, production
- `web/next.config.mjs` — `BACKEND_URL` env var only (no hardcoded IP)
- `mobile/app.json` — `extra.apiUrl` set to Azure placeholder; `eas.projectId` set to `2b6450de-2e8d-4d06-a12e-ef9fc444d7b7`
