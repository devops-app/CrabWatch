# CrabWatch — Work Progress Tracker

> **Last Updated**: 2026-05-13
> **Current Focus**: Web capture map marker reliability, AI species auto-pick logic, strict UUID validation

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

## Progress
### Done
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

### In Progress
- (none)

### Blocked
- (none)

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

## Next Steps
- Run Prisma migration: `cd server && npx prisma migrate dev --name add-detected-coin`
- Verify web and mobile submission flows accept `null`/empty `bw` end-to-end

## Critical Context
- **Stack**: Expo SDK 54, React 19, RN 0.81.5, Zustand, React Navigation, Express, Prisma, Azure Storage, Azure AI Foundry
- **Foundry Project Endpoint**: `https://wilsontchui-5315-resource.services.ai.azure.com/api/projects/wilsontchui-5315`
- **Azure OpenAI Endpoint**: `https://wilsontchui-5315-resource.openai.azure.com/openai/v1`
- **Mapbox**: Web-only (`MAPBOX_TOKEN` in `web/.env.local`). Used in `dashboard/map` (observation markers) and `dashboard/capture` (manual location picker).
- **Navigation flow**: `MainTabs "New"` → `GuidedCaptureScreen` → `AnalysisLoadingScreen` → `AIReviewScreen` → Submit → `Home`

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
- `server/src/controllers/observationController.ts` — Creates/returns `detectedCoin`
- `server/src/utils/schemas.ts` — Zod validation (nullable `bw`, `detectedCoin`, strict UUID `speciesId`)
- `server/src/services/analytics.ts` — Skips null `bw` in condition factor calc
- `server/prisma/schema.prisma` — DB schema with `gender @map("sex")`, nullable `bw`, `detectedCoin`

### Web
- `web/src/app/dashboard/capture/page.tsx` — Mapbox location picker (GeoJSON layers), AI species auto-pick (`findSpeciesMatch`), strict UUID validation (`isUuid`), passes `detectedCoin`
- `web/src/app/dashboard/researcher/page.tsx` — Fullscreen photo overlay, coin display
- `web/src/app/dashboard/map/page.tsx` — Fullscreen photo overlay, coin display in popup
- `web/src/lib/api.ts` — `detectedCoin` in `createObservation` type

### About Pages
- `mobile/src/screens/common/AboutScreen.tsx` — Mobile about screen
- `web/src/app/dashboard/about/page.tsx` — Web about page
- `web/src/components/Sidebar.tsx` — "About" nav item
