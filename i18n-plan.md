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
- [ ] Install `i18next` in server
- [ ] Create `server/i18n/` with `en.json` and `ms.json`
- [ ] Translate error messages in controllers, validation errors, email templates
- [ ] Accept `Accept-Language` header, fallback to `en`

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

- [ ] Create Prisma migration
- [ ] Deploy migration to Azure PostgreSQL
- [ ] Run `prisma generate`

### 2.2 Prisma query extension — auto-merge translations

- [ ] Create `server/src/utils/i18n-extend.ts` with Prisma `$extends`
- [ ] Add `$translated(locale)` query mode that:
  - Fetches base record
  - Joins `Translation` where `locale` matches + `resourceType` + `resourceId`
  - Merges translated fields over base fields
  - Falls back to original column if translation missing
- [ ] Apply extension to all Prisma client instances via DI container

### 2.3 Seed Malay translations for existing content

Seed script to bulk-insert Malay translations for:
- [ ] Species: `commonName`, `description`, `keyFeatures`
- [ ] Achievements: `name`, `description`
- [ ] Missions: `name`, `description`
- [ ] LevelConfig: `title`, `description`
- [ ] OnboardingFlow steps: `title`, `description`

Approach: either manual translation file or AI-assisted batch translation script.

### 2.4 API locale propagation

- [ ] Add `Accept-Language` header parsing to a new `localeMiddleware`
- [ ] Attach `req.locale` to request context
- [ ] All list/detail endpoints use `$translated(req.locale)` by default
- [ ] Shared DTOs unchanged — translation happens at the Prisma query layer, DTOs receive merged result

### 2.5 Admin translation UI

- [ ] In admin Species tab: add translation editor panel per species
- [ ] In admin engagement components: add translation fields for achievements, missions, levels
- [ ] Inline edit or modal — save to `Translation` table via new `POST /api/v1/admin/translations` endpoint
- [ ] Show fallback indicator when translation is missing

### 2.6 New admin translation endpoint

- [ ] `POST /api/v1/admin/translations` — create/update translation (upsert on unique constraint)
- [ ] `GET /api/v1/admin/translations?resourceType=X&resourceId=Y&locale=ms` — bulk fetch translations for a record
- [ ] `DELETE /api/v1/admin/translations/:id` — remove translation (falls back to original)

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

- [ ] Migration + deploy
- [ ] On first login: auto-detect from `Accept-Language` (web) or device locale (mobile), set `preferredLocale`
- [ ] Allow manual override in profile/settings
- [ ] Profile update endpoint accepts `preferredLocale`

---

## Phase 4: Polish & Testing

### 4.1 RTL / font considerations
- [ ] Verify Malay text renders correctly (no special font needs — uses Latin script)
- [ ] Test long Malay strings in constrained UI (buttons, labels) — Malay words tend to be longer than English

### 4.2 Date/time/number formatting
- [ ] Web: `next-intl` handles `formatDate`, `formatNumber`, `formatMessage` with locale
- [ ] Mobile: `Intl` API with locale, or `expo-localization` formatters
- [ ] Currency: MYR format consistent across locales

### 4.3 Pluralization
- [ ] Malay has different pluralization rules (e.g., reduplication: "spesies" → "spesies-spesies", but often same form)
- [ ] Configure plural rules in both `next-intl` and `i18next`

### 4.4 Testing
- [ ] Toggle language on web, verify all pages switch
- [ ] Toggle language on mobile, verify all screens switch
- [ ] Verify DB content serves Malay when available, falls back to English
- [ ] Verify AI returns Malay suggestions when locale is `ms`
- [ ] Verify email templates send in correct language
- [ ] Run `tsc --noEmit` for all packages
- [ ] Run `next build` for web
- [ ] Run existing test suite (`npm test`)

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
| Phase 1: UI Static Strings | NOT STARTED | - | - |
| Phase 2: DB Translation Table | NOT STARTED | - | - |
| Phase 3: Dynamic Content | NOT STARTED | - | - |
| Phase 4: Polish & Testing | NOT STARTED | - | - |

### Phase 1 Checklist
- [ ] 1.1 Web — next-intl setup
- [ ] 1.2 Mobile — i18next setup
- [ ] 1.3 Extract static strings — Web (~790 strings)
- [ ] 1.4 Extract static strings — Mobile (~520 strings)
- [ ] 1.5 Language toggle UI
- [ ] 1.6 Server static strings

### Phase 2 Checklist
- [ ] 2.1 Schema migration
- [ ] 2.2 Prisma query extension
- [ ] 2.3 Seed Malay translations
- [ ] 2.4 API locale propagation
- [ ] 2.5 Admin translation UI
- [ ] 2.6 New admin translation endpoint

### Phase 3 Checklist
- [ ] 3.1 AI analysis in Malay
- [ ] 3.2 UserInsight translations
- [ ] 3.3 Notification translations
- [ ] 3.4 Email templates
- [ ] 3.5 User model — preferredLocale

### Phase 4 Checklist
- [ ] 4.1 RTL / font considerations
- [ ] 4.2 Date/time/number formatting
- [ ] 4.3 Pluralization
- [ ] 4.4 Testing
