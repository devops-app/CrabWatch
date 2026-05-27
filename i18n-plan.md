# CrabWatch i18n Implementation Plan

> **Created**: 2026-05-24
> **Primary Target**: Bahasa Melayu (ms)
> **Fallback**: English (en)
> **Strategy**: Translation table (DB) + next-intl (web) + i18next (mobile)

---

## Architecture Decision Summary

| Layer | Approach | Rationale |
|-------|----------|-----------|
| **DB content** | `Translation` table with `locale`/`resourceType`/`resourceId`/`field` | Zero breaking changes, add languages without migrations, admin translates gradually |
| **Web UI** | `next-intl` | Native Next.js 15 + RSC support, SSR hydration, message files |
| **Mobile UI** | `i18next` + `react-i18next` | Mature RN support, runtime locale switch |
| **Server static** | `i18next` (Node.js) | Error messages, email templates, `Accept-Language` header |
| **AI output** | System prompt adjusted per locale | Suggestions and rawAnalysis in user's language; speciesName stays scientific |
| **User preference** | `preferredLocale` on User model | Device locale auto-detect on first launch, manual override in settings |

### What Stays English (never translated)
- Scientific names (`Scylla serrata`) — universal standard
- Species ID slugs (`scylla-serrata`)
- API field names, enum values in DB
- Code/technical identifiers

---

## Phase 1: UI Static Strings (no DB changes)

Extract all hardcoded strings from web and mobile into message files.

### 1.1 Web — next-intl setup
- [ ] Install `next-intl`
- [ ] Create `web/messages/en.json` and `web/messages/ms.json`
- [ ] Configure `next-intl` with locale detection (`Accept-Language` + cookie)
- [ ] Wrap app layout with `NextIntlClientProvider`
- [ ] Create `useTranslations` helper hook to replace string literals

### 1.2 Mobile — i18next setup
- [ ] Install `i18next`, `react-i18next`, `expo-localization`
- [ ] Create `mobile/locales/en.json` and `mobile/locales/ms.json`
- [ ] Initialize i18n with device locale auto-detect, fallback to `en`
- [ ] Wrap app root with `I18nextProvider`
- [ ] Create `useAppTranslation` hook

### 1.3 Extract static strings — Web

| Area | Files | Estimated strings |
|------|-------|-------------------|
| Auth | `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` | ~60 |
| Dashboard | `dashboard/page.tsx`, `Sidebar.tsx`, `Header.tsx` | ~50 |
| Capture | `capture/client.tsx`, `capture/utils.ts`, `capture/coin-selector.tsx`, `capture/camera-section.tsx`, `capture/map-picker.tsx`, `capture/map-section.tsx`, `capture/review-section.tsx` | ~120 |
| Observation | `observation/[id]/client.tsx` | ~40 |
| Species | `species/page.tsx` | ~30 |
| Analytics | `analytics/client.tsx`, `analytics/map-tab.tsx`, `analytics/chart-tabs.tsx` | ~80 |
| Profile | `profile/client.tsx` | ~40 |
| Settings | `settings/client.tsx` | ~30 |
| Researcher | `researcher/client.tsx` | ~40 |
| Gamification | `leaderboard/client.tsx`, `achievements/client.tsx`, `missions/client.tsx`, `community/client.tsx` | ~100 |
| Admin | `admin/page.tsx`, `admin/species-tab.tsx`, `admin/users-tab.tsx`, `admin/backup-tab.tsx`, `admin/components.tsx` | ~150 |
| Shared components | `AuthGuard.tsx`, `ErrorBoundary.tsx`, toasts, modals | ~50 |
| **Web total** | | **~790** |

### 1.4 Extract static strings — Mobile

| Area | Files | Estimated strings |
|------|-------|-------------------|
| Auth | `LoginScreen.tsx`, `RegisterScreen.tsx`, `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx` | ~60 |
| Home | `HomeScreen.tsx` | ~30 |
| Capture flow | `GuidedCaptureScreen.tsx`, `AnalysisLoadingScreen.tsx`, `AIReviewScreen.tsx` | ~80 |
| Observation | `ObservationDetailScreen.tsx` | ~40 |
| Analytics | `AnalyticsScreen.tsx` | ~50 |
| Gamification | `LeaderboardScreen.tsx`, `MissionsScreen.tsx`, `AchievementsScreen.tsx` | ~80 |
| Profile/Settings | `ProfileScreen.tsx`, `EditProfileScreen.tsx` | ~30 |
| Researcher | `ResearcherScreen.tsx` | ~30 |
| Admin | `AdminScreen.tsx` | ~60 |
| Navigation/Shared | `MainTabs.tsx`, `AboutScreen.tsx`, toasts, alerts, `Button.tsx`, `Input.tsx` | ~60 |
| **Mobile total** | | **~520** |

### 1.5 Language toggle UI
- [ ] Web: language selector in `Header.tsx` user dropdown (flag-free, text: "EN / BM")
- [ ] Mobile: language toggle in `EditProfileScreen.tsx` / settings
- [ ] Persist selection: cookie (web), Zustand store + MMKV (mobile)

### 1.6 Server static strings
- [x] Install `i18next` in server (already present in `server/package.json`)
- [x] Create `server/src/locales/` with `en.json` and `ms.json` (11 namespaces)
- [x] Translate error messages in controllers, validation errors, email templates
- [x] Accept `Accept-Language` header, fallback to `en`
- [x] Refactor `rewardEngine.ts`, `achievementService.ts`, `notificationService.ts` for locale-aware notifications

---

## Phase 2: DB Content — Translation Table

### 2.1 Schema migration

```prisma
model Translation {
  id            String   @id @default(uuid())
  locale        String   // "ms", "en", etc.
  resourceType  String   // "Species", "Achievement", "MissionDefinition", "LevelConfig", "OnboardingFlow", "OnboardingStep", "GamificationRule", "Season", "Challenge"
  resourceId    String   // UUID of the source record
  field         String   // "name", "description", "title", "keyFeatures", "steps"
  value         String?  // translated text for scalar fields
  valueJson     Json?    // translated JSON for keyFeatures, steps

  @@unique([locale, resourceType, resourceId, field])
  @@index([locale, resourceType])
}
```

- [x] Create Prisma migration (via `prisma db push`)
- [x] Deploy migration to Azure PostgreSQL
- [x] Run `prisma generate`

### 2.2 Prisma query extension — auto-merge translations

- [x] Create `server/src/utils/i18n-prisma.ts` with Prisma `$use` middleware + `AsyncLocalStorage`
- [x] Middleware intercepts queries for translatable models (Species, Achievement, MissionDefinition, LevelConfig, OnboardingFlow)
- [x] On non-`en` locale, fetches `Translation` records and merges translated fields over base fields
- [x] JSON fields (`keyFeatures`, `steps`) parsed and merged correctly
- [x] Applied via `applyI18nMiddleware(prisma)` in `database.ts`
- [x] Locale activated per-request in `resolveUser` via `translationLocaleStorage.run(locale, ...)`
- [x] `localeMiddleware` exported from `middleware/i18n.ts` for routes without `resolveUser`

### 2.3 Seed Malay translations for existing content

Seed script to bulk-insert Malay translations for:
- [x] Species: `commonName`, `description`, `keyFeatures` (4/5 species translated)
- [x] Achievements: `name`, `description` (19/19 translated)
- [x] Missions: `name`, `description` (4/4 translated)
- [x] LevelConfig: `title`, `description` (12/12 translated)
- [x] OnboardingFlow steps: `title`, `description` (1 flow, 5 steps translated)

Script: `server/src/services/seedMalayTranslations.ts` — run with `npm run db:seed:i18n:ms` in `server/`.
Total: 72 Malay translation records seeded.

### 2.4 API locale propagation

- [x] Add `Accept-Language` header parsing to a new `localeMiddleware` (via `createTranslator` + `detectLocale`)
- [x] Attach `req.locale` to request context (via `req.dbUser.preferredLocale`)
- [x] All list/detail endpoints use `$translated(req.locale)` by default (via Prisma middleware)
- [x] Shared DTOs unchanged — translation happens at the Prisma query layer, DTOs receive merged result

### 2.5 Admin translation UI

- [x] Centralized `admin/translation-tab.tsx` with inline modals for add/edit and bulk import (JSON format)
- [x] Coverage summary with progress bars per locale (green/yellow/red thresholds)
- [x] Fallback indicator when translation is missing (coverage UI shows untranslated fields)

### 2.6 New admin translation endpoint

- [x] `POST /api/v1/admin/translations` — create/update translation (upsert on unique constraint)
- [x] `GET /api/v1/admin/translations?resourceType=X&resourceId=Y&locale=ms` — bulk fetch translations for a record
- [x] `DELETE /api/v1/admin/translations/:id` — remove translation (falls back to original)

---

## Phase 3: Dynamic Content

### 3.1 AI analysis in Malay

- [ ] Modify `foundryAgent.ts` system prompt to accept locale parameter
- [ ] When `locale === "ms"`, append Malay instructions to prompt
- [ ] AI returns `suggestions` and `rawAnalysis` in Malay
- [ ] `speciesName` stays as `"Scientific (English Common)"` — research standard

### 3.2 UserInsight translations

- [ ] `aiInsightsService.ts` — template-based insight generation with locale-aware templates
- [ ] Store insight templates in `server/i18n/` message files
- [ ] `UserInsight.title` and `UserInsight.body` stored in user's `preferredLocale`

### 3.3 Notification translations

- [ ] `notificationService.ts` — resolve notification templates from locale files
- [ ] Push notification `title`/`body` in user's preferred locale
- [ ] Email templates (Resend) — locale-aware subject/body
- [ ] `NotificationDelivery.title` and `body` stored in the locale they were sent in

### 3.4 Email templates (Resend)

- [ ] Duplicate all email templates: invite, password reset, campaign
- [ ] Select template based on recipient's `preferredLocale`
- [ ] Fallback to English if Malay template missing

### 3.5 User model — preferredLocale

```prisma
// Add to User model:
preferredLocale String @default("en")
```

- [x] Migration + deploy (via `prisma db push`)
- [x] On first login: auto-detect from `Accept-Language` (web) or device locale (mobile), set `preferredLocale`
- [x] Allow manual override in profile/settings (web `settings/client.tsx` + mobile `EditProfileScreen.tsx`)
- [x] Profile update endpoint accepts `preferredLocale`

---

## Phase 4: Polish & Testing

### 4.1 RTL / font considerations
- [x] Verify Malay text renders correctly (no special font needs — uses Latin script)
- [x] Test long Malay strings in constrained UI (buttons, labels) — Malay words tend to be longer than English

### 4.2 Date/time/number formatting
- [x] Web: `useFormatters` hook wrapping `next-intl` `useFormatter()` — 16 files migrated
- [x] Mobile: `useFormatters` hook with `Intl` API, locale mapped via `localeStore`
- [x] Currency: `formatCurrency` in both web and mobile, defaults to `MYR` with 2 decimal places

### 4.3 Pluralization
- [x] Malay has different pluralization rules (e.g., reduplication: "spesies" → "spesies-spesies", but often same form)
- [x] Configure plural rules in both `next-intl` (ICU plural syntax) and `i18next` (`_one`/`_other` suffixes)
- [x] 8 keys converted: web `cleanupResult`, mobile `streakDays`, `photoCount` (2x), `cleanupDone`

### 4.4 Testing
- [x] Toggle language on web, verify all pages switch
- [x] Toggle language on mobile, verify all screens switch
- [x] Verify DB content serves Malay when available, falls back to English
- [x] Verify AI returns Malay suggestions when locale is `ms`
- [x] Verify email templates send in correct language
- [x] Run `tsc --noEmit` for all packages — passes cleanly
- [x] Run `next build` for web — passes cleanly
- [x] Run existing test suite (`pnpm -r test`) — 80 pre-existing failures, zero new failures from i18n changes

---

## Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `web/messages/en.json` | 1 | Web English strings |
| `web/messages/ms.json` | 1 | Web Malay strings |
| `mobile/locales/en.json` | 1 | Mobile English strings |
| `mobile/locales/ms.json` | 1 | Mobile Malay strings |
| `server/i18n/en.json` | 1 | Server error messages, emails |
| `server/i18n/ms.json` | 1 | Server Malay messages |
| `server/prisma/schema.prisma` (Translation model) | 2 | DB translation table |
| `server/src/utils/i18n-extend.ts` | 2 | Prisma query extension |
| `server/src/middleware/locale.ts` | 2 | Locale detection middleware |
| `server/src/controllers/translationController.ts` | 2 | Admin translation CRUD |
| `server/src/routes/translationRoutes.ts` | 2 | Translation API routes |
| `server/src/services/seedMalayTranslations.ts` | 2 | Seed script for Malay content |
| `shared/src/types/translation.ts` | 2 | Translation DTOs |
| `mobile/src/i18n.ts` | 1 | i18next initialization |
| `web/src/i18n/request.ts` | 1 | next-intl request config |

## Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `server/prisma/schema.prisma` | 2+3 | Add `Translation` model + `preferredLocale` on `User` |
| `server/src/services/foundryAgent.ts` | 3 | Locale-aware system prompt |
| `server/src/services/aiInsightsService.ts` | 3 | Locale-aware insight templates |
| `server/src/services/notificationService.ts` | 3 | Locale-aware notification/email |
| `server/src/services/container.ts` | 2 | Init i18next, apply Prisma extension |
| `server/src/index.ts` | 2 | Add locale middleware |
| `shared/src/types/engagement.ts` | 2 | Add TranslationDto types |
| `shared/src/types/user.ts` | 3 | Add `preferredLocale` field |
| `web/src/app/layout.tsx` | 1 | next-intl provider |
| `web/src/components/Header.tsx` | 1 | Language selector |
| `web/src/app/dashboard/*/client.tsx` (all) | 1 | Replace strings with `useTranslations` |
| `mobile/App.tsx` | 1 | i18next provider |
| `mobile/src/screens/profile/EditProfileScreen.tsx` | 1 | Language toggle |
| `mobile/src/screens/**/*.tsx` (all) | 1 | Replace strings with `useTranslation` |
| `mobile/src/services/api.ts` | 2 | Pass `Accept-Language` header |
| `web/src/lib/api.ts` | 2 | Pass `Accept-Language` header |

---

## Future Language Readiness

Adding a new language (e.g., Chinese `zh`, Indonesian `id`):
1. Add `zh.json` / `id.json` message files to web, mobile, server
2. Admin translates DB content via translation UI (inserts into `Translation` table with new `locale`)
3. Update language selector dropdown options
4. **Zero schema changes, zero migrations, zero code changes** (other than message files)

---

## Status Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: UI Static Strings | COMPLETED | 2026-05-24 | 2026-05-26 |
| Phase 2: DB Translation Table | COMPLETED | 2026-05-26 | 2026-05-26 |
| Phase 3: Dynamic Content | COMPLETED | 2026-05-26 | 2026-05-26 |
| Phase 4: Polish & Testing | COMPLETED | 2026-05-26 | 2026-05-26 |

### Phase 1 Checklist
- [x] 1.1 Web — next-intl setup
- [x] 1.2 Mobile — i18next setup
- [x] 1.3 Extract static strings — Web (~790 strings)
- [x] 1.4 Extract static strings — Mobile (~520 strings)
- [x] 1.5 Language toggle UI
- [x] 1.6 Server static strings

### Phase 2 Checklist
- [x] 2.1 Schema migration
- [x] 2.2 Prisma query extension (middleware + AsyncLocalStorage)
- [x] 2.3 Seed Malay translations (72 records via `seedMalayTranslations.ts`)
- [x] 2.4 API locale propagation (`detectLocale` + `createTranslator` + `translationLocaleStorage` wired)
- [x] 2.5 Admin translation UI (`admin/translation-tab.tsx` with inline modals + bulk import)
- [x] 2.6 New admin translation endpoint (`POST/GET/DELETE /api/v1/admin/translations`)

### Phase 3 Checklist
- [x] 3.1 AI analysis in Malay (`buildLocaleInstructions()` in `foundryAgent.ts`)
- [x] 3.2 UserInsight translations (`aiInsightsService.ts` with `getServerI18n`)
- [x] 3.3 Notification translations (`notificationService.ts` with `locale` threading)
- [x] 3.4 Email templates (Resend with `notification.email.greeting/body/signoff` keys)
- [x] 3.5 User model — preferredLocale (API + UI complete)

### Phase 4 Checklist
- [x] 4.1 RTL / font considerations (Malay uses Latin script, no special fonts needed)
- [x] 4.2 Date/time/number formatting (`useFormatters` hook in web and mobile, 16 files migrated)
- [x] 4.3 Pluralization (ICU plurals in web, `_one`/`_other` in mobile, 8 keys converted)
- [x] 4.4 Testing (`pnpm build` passes, `next build` passes, `pnpm typecheck` passes, all test failures pre-existing)
