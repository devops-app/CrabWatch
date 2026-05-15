# CrabWatch — Work Progress Tracker

> **Last Updated**: 2026-05-15
> **Current Focus**: Production deployment preparation

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
### Done
- [x] Removed hardcoded LAN IP from `web/next.config.mjs` fallback (`BACKEND_URL` env var only)
- [x] Removed hardcoded LAN IP from `mobile/app.json` `extra.apiUrl` (replaced with Azure placeholder)
- [x] Created `mobile/eas.json` with development, preview, and production build profiles
- [x] Created `Azure-Deployment-Plan.md` with step-by-step manual deployment instructions
- [x] Updated `README.md` with current API endpoints, DB schema, features, and deployment info
- [x] Updated `mobile/src/navigation/README.md` with current param lists
- [x] Deleted obsolete docs: `PLAN_AI_CAPTURE.md`, `PROJECT.md`, `OPTIMIZATION_PLAN.md`
- [x] AI-Guided Capture flow: GuidedCaptureScreen → AnalysisLoadingScreen → AIReviewScreen
- [x] GPT-4o Vision agent integration via Azure AI Foundry
- [x] Dynamic species detection: AI identifies any crab, server auto-creates unknown species
- [x] Removed hardcoded `MUD_CRAB_SPECIES` constraint — species fetched from API
- [x] Guided photo capture: dorsal, ventral, optional carapace close-up
- [x] MYR coin reference system for size estimation
- [x] Azure Blob Storage for temporary analysis photo storage
- [x] Image quality assessment and blur detection
- [x] Offline fallback: manual form on analysis failure
- [x] Gender terminology update: `sex` → `gender` across all packages
- [x] Prisma mapping: `gender Gender @map("sex")` preserves DB column
- [x] API endpoint rename: `/analytics/sex-ratio` → `/analytics/gender-ratio`
- [x] Foundry Agent system prompt updated with gender terminology
- [x] All packages pass `tsc --noEmit` with strict type safety
- [x] Dual MYR coin series support: Third Series (current) + Second Series (1989-2011)
- [x] Expanded AI species detection: added swimming crabs (Portunus, Charybdis)
- [x] AI body weight estimation formula (BW = CW² x 15 mud crabs, CW² x 10 swimming)
- [x] Full-screen modal camera capture experience
- [x] AIReviewScreen: coin mismatch indicator, photo strip, species auto-match
- [x] Fixed `expo-file-system` deprecation → switched to `/legacy` import
- [x] Fixed Expo Go crash on "Analyze" → removed `fetch('data:base64,...')` + `blob()`, pass local URIs directly
- [x] Removed AI weight estimation from prompt; made `bw` optional/nullable across entire stack
- [x] Fixed `toFixed()` crash in `ProfileScreen.tsx` for null `bw`
- [x] Server analytics skips null `bw` in condition factor calculation
- [x] Web capture page: removed AI `estimatedBW` pre-fill, adjusted validation for nullable `bw`
- [x] Web researcher/map pages: null-safe `bw` rendering with `?? 'N/A'` fallback
- [x] Mobile `AboutScreen` + web `dashboard/about` page with "Made By DsignCodeHub" branding
- [x] Fullscreen image viewing for observations: mobile `ObservationDetailScreen`, web researcher modal, web map popup
- [x] Coin reference persistence: `detectedCoin` field tracked through DB → server → shared types → mobile/web submission → detail views
- [x] Map-based location picking: web capture page (Mapbox), mobile GPSCapture manual mode (`react-native-maps`)
- [x] Real-time capture assistance: motion detection (gyroscope), brightness (accelerometer), focus tracking, frame overlay
- [x] Portrait orientation lock: camera enforces vertical capture with tilt warning overlay
- [x] View validation: post-capture analysis detects wrong dorsal/ventral orientation with warning card
- [x] Web capture map marker: switched from DOM `Marker` to native `Source` + `Layer` (GeoJSON circle layers) for reliable rendering
- [x] Web capture AI species auto-pick: `findSpeciesMatch` with UUID, exact text, and partial/fuzzy matching
- [x] Web capture strict species validation: `isUuid` helper ensures only valid species IDs are submitted
- [x] Web capture species text normalization: `normalizeSpeciesText` for case/punctuation-insensitive AI matching
- [x] Web capture AI badge: updated to trigger on `analysis.speciesName` (not just `speciesId`)
- [x] User registration: added `phone` and `address` fields for future SMS MFA
- [x] Admin panel: manual database backup with `POST /api/v1/admin/backup`
- [x] Admin panel: user soft-delete with 30-day retention period (`DELETE /api/v1/users/:id`)
- [x] Admin panel: user restore within retention window (`POST /api/v1/users/:id/restore`)
- [x] Admin panel: user block/unblock with optional reason (`POST /api/v1/users/:id/block`, `/unblock`)
- [x] Admin panel: cleanup expired users past 30-day retention (`POST /api/v1/admin/cleanup-users`)
- [x] Admin panel: list soft-deleted users with expiry dates (`GET /api/v1/admin/deleted-users`)
- [x] Auth middleware: blocked and deleted users rejected with 403 on all requests
- [x] Admin UI: double confirmation modal for destructive actions (type-to-confirm for block/delete)
- [x] Web profile edit page: `/dashboard/profile` with avatar upload, all profile fields, read-only email
- [x] Web observation detail page: `/dashboard/observation/[id]` with photos, measurements, biological data, location, validation history
- [x] Web species browse page: `/dashboard/species` with searchable grid, detail modal, fullscreen images
- [x] Sidebar nav updated: added Species (🦀) and Profile (👤) items
- [x] Dashboard home page: added "Recent Submissions" table showing latest 5 observations
- [x] Password reset by email: `POST /api/v1/auth/password-reset/request` sends reset link via Resend
- [x] Password reset confirm: `POST /api/v1/auth/password-reset/reset` validates token, updates password
- [x] Web forgot password page: `/auth/forgot-password` with email form and success state
- [x] Web reset password page: `/auth/reset-password?token=<token>` with new password form
- [x] Web login page: added "Forgot password?" link
- [x] Mobile forgot password screen: email form with success state
- [x] Mobile reset password screen: new password form with token from route params
- [x] Mobile login screen: added "Forgot password?" link
- [x] Prisma `PasswordReset` model with token, expiry, cascade delete on user
- [x] Invite system: `Invite` model in Prisma, `createInvite`/`validateInvite`/`listInvites` controllers
- [x] Invite email dispatch via Resend with expiry/usage tracking
- [x] Public `/invite/validate` route for unauthenticated registration page validation
- [x] Invite redemption in `userController.ts` assigns invited role on registration
- [x] Web registration page parses `?invite=<token>`, validates, pre-fills/locks email+role
- [x] Web admin "Invites" tab with send form and history table
- [x] Fixed `server/prisma/schema.prisma` (removed duplicate `Invite` model blocks)
- [x] Fixed Prisma unique constraint error on `firebaseUid` with pre-checks
- [x] Fixed soft-deleted user re-registration: clears `firebaseUid`, reassignes email to `deleted-{id}@deleted.local`
- [x] Fixed "Converting circular structure to JSON" error in `admin/page.tsx` catch blocks
- [x] Added duplicate invite popup in `admin/page.tsx` with `infoOnly` confirm modal
- [x] Fixed `inviteEmail` undefined error in `handleSendInvite` using `String(...)` fallback
- [x] Moved profile/logout to top-right header dropdown; removed Profile from sidebar
- [x] Fixed "Phone Code" -> "Country Code" label across web/mobile
- [x] Widened mobile country code picker width from 80 to 100
- [x] Added `label` prop to `PhoneCodePicker` component
- [x] Replaced web profile country code & country inputs with `<select>` dropdowns from shared `COUNTRIES`
- [x] Updated web profile country code dropdown to show only phone code without country name
- [x] Replaced mobile "Species" tab with "Analytics" tab in `MainTabs.tsx` and `types.ts`
- [x] Created `mobile/src/screens/analytics/AnalyticsScreen.tsx` with Gender Ratio, Size Frequency, Temporal Trends
- [x] Fixed broken `loadAll` callback in `web/src/app/dashboard/analytics/page.tsx` (added missing `Promise.all` destructuring and 6 analytics API calls)
- [x] Wired up Admin Panel Species Guide CRUD: Add/Edit modal form, Delete confirmation, handlers
- [x] Updated `HomeScreen.tsx` quick actions to navigate to `Analytics` and `New` tabs
- [x] Fixed web React version mismatch (`react: 19.1.0` vs `react-dom: 19.2.6`) by pinning both to `19.2.6`
- [x] Fixed mobile analytics crash (`data.map is not a function`) with `.catch(() => [])` and `Array.isArray()` guards
- [x] Created `mobile/src/screens/researcher/ResearcherScreen.tsx` for researcher observation approval/rejection
- [x] Added comprehensive admin API methods to `mobile/src/services/api.ts`
- [x] Created `mobile/src/screens/admin/AdminScreen.tsx` with role-based admin tasks
- [x] Updated `MainTabs.tsx` and `types.ts` to conditionally render Researcher and Admin tabs based on user role
- [x] Fixed mobile `ResearcherScreen.tsx` TextInput import (`RNTextInput`) and rejection confirmation flow
- [x] Restructured mobile Admin Panel: merged "User Management" into single "Users" tab with sub-tabs (Active, Deleted, Invites)
- [x] Restructured web Admin Panel to match mobile: "Users" tab with Active/Deleted/Invites sub-tabs
- [x] Fixed mobile Admin Invites crash: lifted `useState` hooks out of `renderInvites` render function
- [x] Fixed `server/src/controllers/observationController.ts` `refreshPhotoUrls` to correctly parse blob paths from both absolute and relative SAS URLs
- [x] Fixed `AdminScreen.tsx` syntax error (`'return' outside of function`) by removing stray closing brace
- [x] Fixed mobile admin users management layout: subTabBar now anchors at top with proper flex layout
- [x] Fixed `generateSasUrl` returning full URL (not just query string) — reverted doubled URL fix
- [x] Application Insights monitoring: `@azure/monitor-opentelemetry` auto-instrumentation for server and web
- [x] Server: `useAzureMonitor()` init at top of `server/src/index.ts`
- [x] Web: `useAzureMonitor()` init at top of `web/src/app/layout.tsx`
- [x] Enhanced `server/src/middleware/error.ts` with `req.method`/`req.path` context in error logs
- [x] Added `console.warn` for 404s in `notFoundHandler`
- [x] Added 4xx/5xx request logging to `server/src/middleware/performance.ts`
- [x] Added `POST /api/v1/telemetry/error` endpoint in `server/src/index.ts` to capture frontend errors
- [x] Updated `web/src/components/ErrorBoundary.tsx` to POST errors to backend in production
- [x] Updated `Azure-Deployment-Plan.md`: promoted App Insights from optional to required step
- [x] Full documentation update: analyzed entire codebase, updated README, AGENTS, Azure-Deployment-Plan, MOBILE_DEPLOYMENT

### In Progress
- (none)

### Blocked
- Waiting for user to execute Azure deployment steps from `Azure-Deployment-Plan.md`

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

## Next Steps
- Execute Azure deployment steps from `Azure-Deployment-Plan.md`
- Implement mobile deep linking for password reset URLs (`crabwatch://reset-password?token=<token>`)
- Test researcher observation approval/rejection flow end-to-end on mobile
- Test admin user management, backup, and invite flows on mobile
- Investigate web observation image display (SAS URL refresh on server restart)

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

### Web
- `web/src/app/dashboard/capture/page.tsx` — Mapbox location picker (GeoJSON layers), AI species auto-pick (`findSpeciesMatch`), strict UUID validation (`isUuid`), passes `detectedCoin`
- `web/src/app/dashboard/researcher/page.tsx` — Fullscreen photo overlay, coin display
- (no map page — observation map view was removed; Mapbox only used in capture page for location picker)
- `web/src/app/dashboard/profile/page.tsx` — Profile edit with avatar upload, country code & country dropdowns
- `web/src/app/dashboard/observation/[id]/page.tsx` — Observation detail with photos, measurements, biological data, location, validation
- `web/src/app/dashboard/species/page.tsx` — Species browse with search, detail modal, fullscreen images
- `web/src/app/dashboard/page.tsx` — Dashboard home with stats cards and recent submissions table
- `web/src/app/dashboard/admin/page.tsx` — Admin panel UI with 3 tabs (Species, Users with sub-tabs, Backup)
- `web/src/app/dashboard/analytics/page.tsx` — Fixed `loadAll` callback with proper `Promise.all` and API calls
- `web/src/app/auth/register/page.tsx` — Registration form with phone/address, invite token parsing & pre-filling
- `web/src/app/auth/login/page.tsx` — Login form with "Forgot password?" link
- `web/src/app/auth/forgot-password/page.tsx` — Forgot password email form
- `web/src/app/auth/reset-password/page.tsx` — Reset password form with token from URL params
- `web/src/lib/api.ts` — `detectedCoin` in `createObservation` type, invite/analytics/password reset API methods
- `web/src/lib/authStore.ts` — Web auth state (includes phone/address)
- `web/src/components/Header.tsx` — User dropdown menu (Profile & Sign Out), click-outside handler, logout routing
- `web/src/components/Sidebar.tsx` — Nav items including Species (🦀)
- `web/package.json` — Pinned `react` and `react-dom` to `19.2.6`
- `web/next.config.mjs` — API proxy rewrites to backend

### Mobile
- `mobile/src/screens/home/HomeScreen.tsx` — Updated quick actions to navigate to Analytics/New tabs
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
- `mobile/eas.json` — EAS build profiles: development, preview, production
- `web/next.config.mjs` — Removed hardcoded LAN IP; `BACKEND_URL` env var only
- `mobile/app.json` — `extra.apiUrl` set to Azure placeholder; `eas.projectId` empty (set by `eas-cli init`)
