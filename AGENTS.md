# CrabWatch — Work Progress Tracker

> **Last Updated**: 2026-05-16
> **Current Focus**: Mobile gamification complete — Azure deployment next

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

### In Progress
- (none)

### Blocked
- (none)

### In Progress
- (none)

### Blocked
- (none)

## Next Steps
- Deploy web app to Azure App Service (`scripts/deploy-web.ps1`)
- Build and publish mobile via EAS Build
- Implement mobile deep linking for password reset URLs (`crabwatch://reset-password?token=<token>`)
- Test researcher observation approval/rejection flow end-to-end on mobile
- Test admin user management, backup, and invite flows on mobile
- Investigate web observation image display (SAS URL refresh on server restart)
- End-to-end testing of full engagement flow (submission -> XP -> level up -> achievements -> notifications)

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
- `web/src/app/dashboard/capture/page.tsx` — Mapbox location picker (GeoJSON layers), AI species auto-pick (`findSpeciesMatch`), strict UUID validation (`isUuid`), passes `detectedCoin`
- `web/src/app/dashboard/researcher/page.tsx` — Fullscreen photo overlay, coin display
- (no map page — observation map view was removed; Mapbox only used in capture page for location picker)
- `web/src/app/dashboard/profile/page.tsx` — Profile edit with avatar upload, country code & country dropdowns
- `web/src/app/dashboard/observation/[id]/page.tsx` — Observation detail with photos, measurements, biological data, location, validation
- `web/src/app/dashboard/species/page.tsx` — Species browse with search, detail modal, fullscreen images
- `web/src/app/dashboard/page.tsx` — Dashboard home with stats cards and recent submissions table
- `web/src/app/dashboard/admin/page.tsx` — Admin panel UI with tabs (Species, Users with sub-tabs, Backup, Engagement)
- `web/src/app/dashboard/admin/components.tsx` — Engagement admin tab with XP Rules, Levels, Adjustments, Recalculation, Campaigns, Audit Log, Abuse Detection
- `web/src/app/dashboard/analytics/page.tsx` — Fixed `loadAll` callback with proper `Promise.all` and API calls
- `web/src/app/auth/register/page.tsx` — Registration form with phone/address, invite token parsing & pre-filling
- `web/src/app/auth/login/page.tsx` — Login form with "Forgot password?" link
- `web/src/app/auth/forgot-password/page.tsx` — Forgot password email form
- `web/src/app/auth/reset-password/page.tsx` — Reset password form with token from URL params
- `web/src/lib/api.ts` — `detectedCoin` in `createObservation` type, invite/analytics/password reset API methods, engagement endpoints
- `web/src/lib/authStore.ts` — Web auth state (includes phone/address, engagement fields)
- `web/src/app/dashboard/leaderboard/page.tsx` — Leaderboard page component
- `web/src/app/dashboard/community/page.tsx` — Community page with Insights, Top Contributors, and Stats tabs
- `web/src/components/Sidebar.tsx` — Nav items including Leaderboard, Missions, Community
- `web/src/components/Header.tsx` — User dropdown menu (Profile & Sign Out), click-outside handler, logout routing
- `web/src/components/Sidebar.tsx` — Nav items including Species (🦀)
- `web/package.json` — Pinned `react` and `react-dom` to `19.2.6`
- `web/next.config.mjs` — API proxy rewrites to backend

### Mobile
- `mobile/src/screens/home/HomeScreen.tsx` — Updated quick actions to navigate to Analytics/New tabs; gamification quick-actions card with Leaderboard/Missions/Achievements navigation
- `mobile/src/screens/gamification/LeaderboardScreen.tsx` — Scope toggle (All Time/Seasonal), pagination, medals, "You" badge, pull-to-refresh
- `mobile/src/screens/gamification/MissionsScreen.tsx` — Daily missions + onboarding tabs, claim/complete actions, progress bars, XP badges
- `mobile/src/screens/gamification/AchievementsScreen.tsx` — Rarity colors, category/status filters, progress tracking, check-achievements action
- `mobile/src/screens/profile/ProfileScreen.tsx` — XP stats card with level/title/XP/streak/progress; gamification quick-link cards
- `mobile/src/screens/analytics/AnalyticsScreen.tsx` — Fixed `data.map` crash with array guards
- `mobile/src/screens/researcher/ResearcherScreen.tsx` — Researcher validation screen for approving/rejecting pending observations
- `mobile/src/screens/admin/AdminScreen.tsx` — Admin panel with Users (Active/Deleted/Invites sub-tabs), Species, Backup tabs; fixed syntax error and layout
- `mobile/src/screens/auth/RegisterScreen.tsx` — Registration form with phone/address fields
- `mobile/src/screens/auth/LoginScreen.tsx` — Login form with "Forgot password?" link
- `mobile/src/screens/auth/ForgotPasswordScreen.tsx` — Forgot password email form
- `mobile/src/screens/auth/ResetPasswordScreen.tsx` — Reset password form with token from route params
- `mobile/src/screens/profile/EditProfileScreen.tsx` — Edit profile with phone/address
- `mobile/src/screens/profile/ProfileScreen.tsx` — Displays phone/address
- `mobile/src/screens/common/AboutScreen.tsx` — Mobile about screen
- `mobile/src/components/common/PhoneCodePicker.tsx` — Added `label` prop and styling
- `mobile/src/services/api.ts` — API calls for register/login/profile, password reset, comprehensive admin methods
- `mobile/src/services/authService.ts` — Auth orchestration
- `mobile/src/navigation/MainTabs.tsx` — Swapped Species for Analytics tab, conditionally renders Researcher and Admin tabs based on user role
- `mobile/src/navigation/AuthStack.tsx` — Wired `ForgotPassword` and `ResetPassword` screens
- `mobile/src/navigation/types.ts` — Updated `MainTabParamList` and `AuthStackParamList`

### Shared
- `shared/src/types/user.ts` — User, CreateUserInput, UpdateUserProfileInput, UserResponse types; Invite, PasswordResetRequest, PasswordResetConfirm types
- `shared/src/types/api.ts` — LoginResponse type
- `shared/src/constants/countries.ts` — Country list used by web profile dropdowns
- `shared/src/constants/roles.ts` — Defines `user`, `researcher`, `admin` roles and hierarchy

### Deployment
- `Azure-Deployment-Plan.md` — Step-by-step manual Azure deployment (PostgreSQL, App Service API, App Service Web, EAS Build)
- `scripts/deploy-server.ps1` — Automated server deployment (build, package, upload, install deps, seed)
- `scripts/deploy-web.ps1` — Automated web deployment (build, package, upload)
- `mobile/eas.json` — EAS build profiles: development, preview, production
- `web/next.config.mjs` — `BACKEND_URL` env var only (no hardcoded IP)
- `mobile/app.json` — `extra.apiUrl` set to Azure placeholder; `eas.projectId` empty (set by `eas-cli init`)
