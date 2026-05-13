# CrabWatch — Crab Conservation Platform

Citizen science platform for tracking and analyzing crab observations in Malaysia.

## Architecture

Monorepo with 4 workspace packages:

```
CrabWatch/
├── shared/          # Shared TypeScript types, constants, and utilities
├── server/          # Express.js API server with Prisma ORM
├── web/             # Next.js web application (App Router)
├── mobile/          # React Native mobile app (Expo SDK 54)
└── infrastructure/  # Terraform configs, Azure Functions, CI/CD
```

## Tech Stack

- **Shared**: TypeScript, Zod validation schemas
- **Server**: Express.js, Prisma ORM, PostgreSQL, Firebase Admin SDK, JWT
- **Web**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Mobile**: React Native, Expo SDK 54, TypeScript, Zustand, React 19
- **AI**: Azure AI Foundry, GPT-4o Vision, Azure Blob Storage

## Setup

```bash
# Install dependencies
pnpm install

# Type check all packages
pnpm -r typecheck

# Lint all packages
pnpm -r lint
```

## Status

- [x] TypeScript compilation (all 4 packages, 0 errors)
- [x] ESLint (all packages, 0 errors)
- [x] Database schema & seed script
- [x] Authentication (JWT fallback for local dev)
- [x] API endpoints with versioning (`/api/v1/`)
- [x] Web dashboard (admin, researcher, user views)
- [x] Mobile app (Expo SDK 54, React 19)
- [x] CI/CD pipelines
- [x] Unit tests (shared: 17, server: 113, web: 58, mobile: 350)
- [x] Integration tests (server: 49)
- [x] E2E tests (Playwright: 60 tests, 60 passing)
- [x] API versioning (v1)
- [x] Response caching
- [x] Rate limiting per endpoint type
- [x] Security hardening (Helmet, CSP, COEP, CORP)
- [x] Mapbox integration (marker clustering, fit-bounds)
- [x] Push notifications (FCM)
- [x] Accessibility (ARIA labels, focus trapping, WCAG checks)
- [x] Performance monitoring
- [x] AI-Guided Crab Capture (GPT-4o Vision analysis)
- [x] Dynamic species detection (AI identifies any crab species)
- [x] Azure Blob Storage (photo upload for analysis)
- [x] Dual MYR coin series (Third + Second Series)
- [x] Body weight estimation (BW formula by crab type)
- [x] Full-screen modal camera capture

## Recent Changes

### May 10, 2026 (Dual Coin Series + Expanded Species)
- Dual MYR coin series support: Third Series (current) and Second Series (1989-2011), each with 5/10/20/50 sen denominations
- Expanded AI species detection: added swimming crabs — Portunus pelagicus, P. sanguinolentus, Charybdis natator, C. feriarius
- AI body weight estimation formula: BW ≈ CW² × 15 for mud crabs, BW ≈ CW² × 10 for swimming crabs
- Full-screen modal camera capture experience with view-specific hints
- AIReviewScreen: coin mismatch indicator (researcher-selected vs AI-detected), photo strip preview, species auto-match
- `extractCoinDenomination` helper normalizes coin type comparison across series
- `useFocusEffect` reloads species list when returning to AIReviewScreen
- Added `FOUNDRY_AGENT_VERSION` and `FOUNDRY_API_VERSION` env vars to config
- Photo service: added `pickGuidedPhotoFromLibrary` for library picker fallback

### May 8, 2026 (AI-Guided Capture + Dynamic Species)
- Implemented AI-guided crab capture flow: GuidedCaptureScreen → AnalysisLoadingScreen → AIReviewScreen
- GPT-4o Vision agent analyzes crab photos and returns structured JSON (species, measurements, gender, maturity)
- **Dynamic species detection**: AI identifies any crab species; unknown species auto-created in database
- Removed hardcoded `MUD_CRAB_SPECIES` constraint — species now fetched dynamically from API
- Added guided photo capture: dorsal view, ventral view, optional carapace close-up
- MYR coin reference system for size estimation (5/10/20/50 sen)
- Server auto-creates species via `upsert` when AI returns unknown species
- Mobile AIReviewScreen shows AI analysis with confidence badge, suggestions, and editable form
- Added `shared/src/types/analysis.ts` for CrabAnalysisRequest/Result types
- Server: `POST /api/v1/analyze/upload` and `POST /api/v1/analyze/crab` endpoints
- Azure Blob Storage integration for temporary analysis photo storage
- Image quality assessment and blur detection in mobile photo service
- Offline fallback: analysis failure shows manual observation form with photos

### May 8, 2026 (Gender Terminology Update)
- Renamed `Sex` → `Gender` type and `SexRatioData` → `GenderRatioData` interface across all packages
- Updated `sex` → `gender` fields on `Observation`, `CreateObservationInput`, `ObservationResponse`, `ConditionIndexData`
- Prisma schema: `gender Gender @map("sex")` to preserve DB column while modernizing app layer
- Renamed API endpoint: `/analytics/sex-ratio` → `/analytics/gender-ratio`
- Updated mobile: `SEX_OPTIONS` → `GENDER_OPTIONS`, `formatSex` → `formatGender`
- Updated Foundry Agent system prompt: `SEX DETERMINATION` → `GENDER DETERMINATION`
- All packages pass `tsc --noEmit` with strict type safety

### May 5, 2026 (Mobile SDK Upgrade)
- Upgraded mobile app from Expo SDK 51 to SDK 54
- Upgraded React from 18.2.0 to 19.0.0
- Upgraded React Native from 0.74.5 to 0.79.2
- Updated all Expo packages to SDK 54 compatible versions
- Configured pnpm `node-linker=hoisted` to fix Metro bundler module resolution
- Added `expo-constants`, `expo-linking`, `@expo/metro-runtime` dependencies

### May 3-4, 2026 (E2E)
- Added Playwright E2E test suite: 60 tests across 6 spec files (all passing)
  - `auth.spec.ts` (18): login, register, redirects, public pages, API login
  - `dashboard.spec.ts` (8): stat cards, role-based cards, navigation
  - `analytics.spec.ts` (7): tab switching, API data validation, role enforcement
  - `validation.spec.ts` (6): observation queue, approve/reject flows, role checks
  - `admin.spec.ts` (9): species/user management, role API, species CRUD
  - `observations.spec.ts` (12): public species API, observation CRUD, profile
- Implemented page object model: LoginPage, RegisterPage, DashboardPage, AnalyticsPage, ResearcherPage, AdminPage
- Replaced Firebase dependency in login with direct JWT token handling
- Auth flow: `playwrightRequest.newContext()` for API calls → localStorage injection → navigate to protected routes
- Fixed auth token handling: `result.data.idToken` → `result.data.token`
- Fixed role casing mismatches between API requests (uppercase) and responses (lowercase)
- Fixed status casing in observations: `'PENDING'` → `'pending'`
- Added `htmlFor` attributes to form labels for Playwright accessibility selectors
- Increased API rate limit from 100 to 1000 requests/15min
- Fixed `register` page `fieldErrors` locator to use `p.text-red-600`
- Fixed gender ratio runtime error: null `ratio` field → conditional rendering with `'N/A'` fallback
- Fixed validation queue pending count regex: `observation\(s\)` → `observations?`
- Fixed analytics card navigation: use exact link name `'Analytics View population'` to avoid strict mode conflict
- Fixed E2E tests to work with only Docker (PostgreSQL) running — services started by user, not auto-started

### May 3, 2026
- Added comprehensive unit tests: 212 passing tests across 3 packages
  - `shared` (17): constants, roles, species, regions, pagination
  - `server` (113): analytics service, auth/validation/error middleware, Zod schemas, 6 controller suites
  - `web` (58): Zustand auth store, API client, Sidebar, Header, AuthGuard, DashboardLayout components
- Added integration tests: 24 server API tests with real PostgreSQL (seed/cleanup helpers)
- Configured Jest + ts-jest for `shared`, `server`, and `web` packages
- Fixed `PATCH /api/users/me` route: added missing `resolveUser` middleware
- Updated CI workflow (`.github/workflows/ci.yml`) with `test-shared` and `test-server` jobs
- Fixed ESLint configs to enable `jest: true` env for test files

### May 2, 2026
- Renamed `CITIZEN` role to `USER` across entire codebase (schema, shared types, controllers, UI, DB)
- Created comprehensive `README.md` with setup, testing, API docs, and seed credentials

### May 2026
- Firebase dev fallback: JWT auth when Firebase credentials are placeholder values
- Database seeding: 3 users (admin/researcher/user), 4 species (Scylla serrata, S. paramamosain, S. olivacea, S. tranquebarica), 3 observations
- Unified ESLint v8 workspace-wide
- Fixed all TypeScript errors across packages
- Added explicit return types to all components and API methods
- Fixed Prisma schema, generated client
- Created CI/CD workflows, Makefile, infrastructure configs

### Key Decisions
- Firebase ID tokens for auth, JWT fallback for local dev
- `@crabwatch/shared` path mapping for dev-time type resolution
- `crypto.randomUUID()` instead of external `uuid` package
- `prisma db push` for non-interactive local setup
- ESLint v8 pinned for `.eslintrc` compatibility with Next.js 14
- Dynamic species detection: AI identifies any crab; server auto-creates unknown species via upsert
- Gender terminology: `gender` in app layer, `sex` DB column preserved via Prisma `@map`
- Dual coin series: Third Series (current) and Second Series (1989-2011) for accurate size estimation
- Body weight estimation: AI calculates BW from CW using species-type formula (mud vs swimming crabs)
