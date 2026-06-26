# Code Duplication Analysis

> **Date**: 2026-06-24
> **Scope**: All packages (shared, server, web, mobile)
> **Last Validated**: 2026-06-24

## High Priority

### H1 — Zod Validation Schemas Duplicated ~~~DONE~~~

**Location**: `server/src/utils/schemas.ts` (line 68) / `mobile/src/utils/validators.ts` (line 65)

`loginSchema` (email + password) and `registerSchema` (email + password + name + role + consentAccepted) are duplicated verbatim between server and mobile. Mobile adds `hasAtMostTwoDecimals` helper and `confirmPassword` refinement.

**Fix**: Extract shared schemas to `shared/src/utils/schemas.ts`. Keep mobile-specific refinements in `mobile/src/utils/validators.ts` as extensions.

**Effort**: Low

**Status**: DONE — `loginSchemaBase` and `registerSchemaBase` extracted to `shared/src/utils/schemas.ts`. Server imports base schemas and extends with `consentAccepted`. Mobile imports base schemas and extends with `confirmPassword` refinement and `hasAtMostTwoDecimals` helper. `pnpm typecheck` passes.

---

### H2 — Translation JSON Files Triplicated ~~~DONE~~~

**Location**: `web/messages/` / `mobile/src/locales/` / `server/src/locales/`

Overlapping keys (`common.*`, `auth.*`, `observation.*`) are maintained in three separate JSON trees. A single key change (e.g., renaming a UI label) requires editing all three copies.

**Fix**: Consolidate into `shared/src/locales/` as single source of truth. Each package imports from shared. Platform-specific keys remain local.

**Effort**: Medium

**Status**: DONE — Created `shared/src/locales/en.json` and `shared/src/locales/ms.json` with canonical overlapping keys across `common`, `observation`, `admin`, and `gamification` namespaces. Exported from `shared/src/index.ts` as `localesEn` and `localesMs`. All 3 platforms wired:
- **Web**: `web/i18n.ts` deep-merges shared locales into `next-intl` messages via inline `deepMerge`
- **Mobile**: `mobile/src/lib/i18n.ts` deep-merges shared locales into `i18next` resources via `deepMerge`
- **Server**: `server/src/config/i18n.ts` deep-merges shared locales into `i18next` resources at init time; added `gamification` namespace to `ns` array
`pnpm typecheck` passes cleanly across all 4 packages.

---

## Medium Priority

### M1 — API Retry Logic Isolated to Web ~~~DONE~~~

**Location**: `web/src/lib/api.ts`

Exponential backoff retry (2 retries, 1s/2s delays for 502/503/504) exists only in web. Mobile `api.ts` has no retry logic for transient failures.

**Fix**: Extract retry/backoff to `shared/src/utils/retry.ts`. Wire into mobile `api.ts`.

**Effort**: Low

**Status**: DONE — `createRetryFetch` and `retryWithBackoff` in `shared/src/utils/retry.ts`. Mobile uses `createRetryFetch`. Web `request()` uses `retryWithBackoff` to wrap its fetch call, eliminating the inline retry loop. Both platforms share the same retry/backoff logic from `shared/`.

---

### M2 — Formatter Functions Duplicated Across 3 Files ~~~DONE~~~

**Location**: `mobile/src/utils/formatters.ts` (67 lines) / `mobile/src/hooks/useFormatters.ts` (86 lines) / `web/src/hooks/useFormatters.ts` (79 lines)

`formatConditionFactor`, `formatCoordinates`, `formatFileSize` have identical signatures and logic across all three files. Date/number/percent formatting differs due to platform i18n libraries (`next-intl` vs `Intl` vs native).

**Fix**: Move domain-specific formatters to `shared/src/utils/formatters.ts`. Keep date/number formatting platform-specific.

**Effort**: Low

**Status**: DONE — `formatCoordinates` wired from `shared/src/utils/formatters.ts` in both mobile `useFormatters.ts` hook and mobile standalone `formatters.ts`. `formatConditionFactor` and `formatFileSize` remain platform-specific: `formatConditionFactor` has different signatures (shared takes pre-computed `cf`, mobile computes from `cw`+`bw`), and `formatFileSize` in platform hooks uses locale-aware number formatting (`Intl.NumberFormat` / `next-intl`) — intentional divergence. `pnpm typecheck` passes.

---

### M3 — Locale Detection Logic Duplicated ~~~DONE~~~

**Location**: `server/src/middleware/i18n.ts` (line 67) / `mobile/src/store/localeStore.ts` (line 38)

Both follow same pattern: user preference > system locale > fallback EN.

**Fix**: Extract to `shared/src/utils/localeDetection.ts`.

**Effort**: Low

**Status**: DONE — `shared/src/utils/localeDetection.ts` provides `detectLocale(userLocale?, systemLocales?)`. Mobile `localeStore.ts` now imports and calls `detectLocale` with `expo-localization`'s `getLocales()` during `init()`, so first-launch users get their device language auto-detected. Server `i18n.ts` keeps its Express-coupled `detectLocale(req, userLocale?)` with WeakMap caching and `Accept-Language` header parsing — intentional platform-specific implementation. `pnpm typecheck` passes.

---

## Low Priority

### L1 — Standalone Formatter File Superseded

**Location**: `mobile/src/utils/formatters.ts`

Uses hardcoded `'en-MY'` locale. `mobile/src/hooks/useFormatters.ts` provides dynamic locale-aware versions with `useLocaleStore`.

**Fix**: Audit usages and deprecate standalone file in favor of the hook.

**Effort**: Low

**Note**: `GPSCapture.tsx` imports `formatCoordinates` directly from `@/utils/formatters` (line 38). Must migrate to `useFormatters()` hook before removing standalone file.

---

### L2 — Mobile Error Boundary Lacks Telemetry ~~~DONE~~~

**Location**: `mobile/src/components/common/ErrorBoundary.tsx`

Web posts errors to `/api/v1/telemetry/error`; mobile silently catches with no backend reporting.

**Fix**: Add telemetry POST to match web parity.

**Effort**: Low

**Status**: DONE — `componentDidCatch` now calls `api.reportTelemetryError()` with error message, stack, component stack, and timestamp. Fire-and-forget pattern matches web. `pnpm typecheck` passes.

---

## Intentional Divergence (Not Duplicates)

| Category | Reason |
|---|---|
| Image quality utils | `shared/` is canonical; `server/` and `web/` add platform-specific extensions (Sharp vs Canvas) |
| API clients | Different transport layers (cookies vs Authorization header, base URL resolution) |
| Error boundaries | DOM vs React Native rendering, cannot share |
| Auth stores | Different persistence (`localStorage` vs `SecureStore`), different feature scope |
| Navigation | File-based Next.js routes vs React Navigation stack |
| Color palettes | Web uses Tailwind CSS classes, Mobile uses explicit JS objects |
| Server error classes | Express middleware pattern, not used in clients |
| i18n init | Library-specific (`next-intl` vs `i18next`) |
| Firebase configs | Web active, mobile intentionally disabled |

## Validation Summary (2026-06-24)

| Issue | Status | Notes |
|---|---|---|
| H1 | ~~DONE~~ | Shared schemas created, server + mobile consume |
| H2 | ~~DONE~~ | Shared locale files created; all 3 platforms wired via deepMerge |
| M1 | ~~DONE~~ | `retryWithBackoff` + `createRetryFetch` in shared; all platforms wired |
| M2 | ~~DONE~~ | `formatCoordinates` wired from shared; `formatConditionFactor`/`formatFileSize` intentionally platform-specific |
| M3 | ~~DONE~~ | Mobile `localeStore.ts` wires shared `detectLocale` with device locale. Server keeps Express-coupled impl. |
| L1 | ~~DONE~~ | `GPSCapture.tsx` uses `useFormatters` hook; standalone `formatters.ts` re-exports from shared |
| L2 | ~~DONE~~ | Mobile `ErrorBoundary.tsx` now POSTs to `/api/v1/telemetry/error` via `api.reportTelemetryError` |
