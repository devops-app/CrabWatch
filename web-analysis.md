# CrabWatch Web App — Best-Practice Audit Report

**Scope:** `D:\demo\CrabWatch\web\src\` (27 client files, 3 config files)
**Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS, Zustand
**Date:** 2026-05-18

---

## 1. Category Scores (0-10)

| Category | Score | Rationale |
|---|---|---|
| **TypeScript Type Safety** | **5/10** | Strict tsconfig is good, but 8 `: any` declarations in `api.ts` defeat the purpose. `authStore.ts` duplicates a `User` interface instead of importing from `@crabwatch/shared`. Zero `as any` casts is a positive. |
| **React Modernization** | **4/10** | 27 files declare `'use client'` (correct for App Router), but zero usage of `React.memo`, zero `React.lazy`, zero `AbortController`, and zero React 19 hooks (`useActionState`, `useOptimistic`, `use`). `useMemo`/`useCallback` used sparingly (37 instances) but only in a handful of files. |
| **Error Handling & Resilience** | **4/10** | `ErrorBoundary.tsx:39` and `profile/page.tsx:68` swallow errors silently. `logger.ts:21` has a bare `catch` for telemetry (acceptable but could log to `console.error` as fallback). No retry logic, no request cancellation, no interceptor pattern in `api.ts`. |
| **Performance** | **3/10** | Two pages (`admin/page.tsx` at 937 lines, `capture/page.tsx` at 1067 lines) are monolithic and never lazy-loaded. `next/dynamic` is used in only 2 files. No `React.memo` anywhere. No `AbortController` to cancel stale fetches. No code-splitting for heavy route components. |
| **Security** | **6/10** | CSP headers present but weakened by `'unsafe-inline'` and `'unsafe-eval'` for scripts. No `dangerouslySetInnerHTML`. `AuthGuard.tsx` verifies session on mount with role enforcement. `credentials: 'include'` + Bearer token in API client. No CSRF tokens (mitigated by Bearer auth). |

**Overall: 4.4 / 10**

---

## 2. Line-Level Findings

### TypeScript Type Safety

| File | Line | Issue | Severity |
|---|---|---|---|
| `web/src/lib/api.ts` | 467 | `createGamificationRule: (body: any) =>` — raw `any` parameter | High |
| `web/src/lib/api.ts` | 470 | `updateGamificationRule: (id: string, body: any) =>` — raw `any` parameter | High |
| `web/src/lib/api.ts` | 481 | `createLevelConfig: (body: any) =>` — raw `any` parameter | High |
| `web/src/lib/api.ts` | 484 | `updateLevelConfig: (id: string, body: any) =>` — raw `any` parameter | High |
| `web/src/lib/api.ts` | 576 | `requirements?: any` inside campaign type | Medium |
| `web/src/lib/api.ts` | 592 | `requirements: any` inside campaign type | Medium |
| `web/src/lib/api.ts` | 615 | `criteria: any` inside mission type | Medium |
| `web/src/lib/api.ts` | 629 | `criteria: any` inside mission type | Medium |
| `web/src/lib/authStore.ts` | 5-27 | Local `User` interface duplicates `@crabwatch/shared` types — risk of drift | Medium |

### React Modernization

| File | Line | Issue | Severity |
|---|---|---|---|
| (all 27 files) | 1 | All pages declare `'use client'` — no Server Components used anywhere | Medium |
| (all files) | — | Zero `React.memo` across entire codebase | Low |
| (all files) | — | Zero `AbortController` — no request cancellation | Medium |
| (all files) | — | Zero React 18+ hooks (`useTransition`, `useDeferredValue`, `useActionState`, `useOptimistic`) | Low |
| `analytics/page.tsx` | 4 | `next/dynamic` used only here and `admin/page.tsx` — good but limited scope | Info |

### Error Handling & Resilience

| File | Line | Issue | Severity |
|---|---|---|---|
| `web/src/components/ErrorBoundary.tsx` | 39 | `.catch(() => {})` swallows telemetry POST failure silently | Medium |
| `web/src/lib/logger.ts` | 21 | Bare `catch` on telemetry — no fallback `console.error` | Low |
| `web/src/app/dashboard/profile/page.tsx` | 68 | `api.getMyStats()...catch(() => {})` — silently drops stats load failure | Medium |
| `web/src/components/AuthGuard.tsx` | 42 | Bare `catch` on session verify — acceptable (logs nothing) | Low |
| `web/src/lib/api.ts` | — | No retry logic for transient network failures | Medium |
| `web/src/lib/api.ts` | — | No request interceptor for centralized error handling | Low |

### Performance

| File | Lines | Issue | Severity |
|---|---|---|---|
| `web/src/app/dashboard/capture/page.tsx` | 1067 | Monolithic page: camera, map, form, AI upload all in one component | High |
| `web/src/app/dashboard/admin/page.tsx` | 937 | Monolithic page: species CRUD, user management, backup, engagement tabs | High |
| (all files) | — | No `React.memo` on any component — unnecessary re-renders on parent state changes | Medium |
| `web/src/app/dashboard/admin/page.tsx` | 8-11 | `EngagementAdminTab` lazy-loaded via `next/dynamic` — good | Positive |
| `web/src/app/dashboard/analytics/page.tsx` | 4 | `MapTab` and `ChartTabs` lazy-loaded — good | Positive |

### Security

| File | Line | Issue | Severity |
|---|---|---|---|
| `web/next.config.mjs` | 33 | CSP: `"script-src 'self' 'unsafe-inline' 'unsafe-eval'"` — defeats XSS protections | High |
| `web/next.config.mjs` | 35 | CSP: `"style-src 'self' 'unsafe-inline'"` — expected for Tailwind, but worth noting | Low |
| `web/next.config.mjs` | 28 | `Permissions-Policy: camera=(), microphone=()` — blocks camera/mic at HTTP level; conflicts with capture flow | Medium |
| `web/src/components/AuthGuard.tsx` | 29-46 | Session verification on mount — good, but no token expiry check | Low |
| `web/src/lib/api.ts` | — | `credentials: 'include'` — cookies sent on every request; ensure SameSite=Lax/Strict on server | Info |

---

## 3. Top 15 Fixes (Ranked by Impact)

| # | Fix | File(s) | Effort | Impact |
|---|---|---|---|---|
| **1** | **Replace 8 `: any` in `api.ts` with proper DTOs from `@crabwatch/shared`** | `api.ts:467,470,481,484,576,592,615,629` | Small | Eliminates all type-unsafe API call sites; catches shape mismatches at compile time |
| **2** | **Remove `'unsafe-eval'` from CSP `script-src`** | `next.config.mjs:33` | Medium | `'unsafe-eval'` allows arbitrary code execution; remove and fix any `new Function()` / `eval()` calls |
| **3** | **Fix `Permissions-Policy: camera=()` to allow camera** | `next.config.mjs:28` | Small | Currently blocks camera at the HTTP header level; the capture page needs `camera=(self)` |
| **4** | **Extract `capture/page.tsx` (1067 lines) into sub-components** | `capture/page.tsx` | Large | Split into: `CameraSection`, `MapSection`, `CoinSelector`, `ReviewSection`, `SubmissionForm`. Reduces bundle and improves readability |
| **5** | **Extract `admin/page.tsx` (937 lines) into sub-components** | `admin/page.tsx` | Large | Split into: `SpeciesTab`, `UsersTab`, `BackupTab` components. The engagement tab is already lazy-loaded |
| **6** | **Add `AbortController` to `api.ts` fetch wrapper** | `api.ts` | Medium | Cancel in-flight requests on component unmount; prevents state updates on unmounted components and wasted bandwidth |
| **7** | **Import `User` type from `@crabwatch/shared` in `authStore.ts`** | `authStore.ts:5-27` | Small | Eliminates duplicate type definition; prevents drift between shared types and local auth state |
| **8** | **Replace silent `.catch(() => {})` in `ErrorBoundary.tsx:39` with `console.error` fallback** | `ErrorBoundary.tsx:39` | Small | Telemetry failures should at least log to console for debugging; never silently swallow |
| **9** | **Replace silent `.catch(() => {})` in `profile/page.tsx:68` with user feedback** | `profile/page.tsx:68` | Small | Stats load failure should show a toast or error state, not disappear silently |
| **10** | **Add retry logic (exponential backoff) to `api.ts` for transient failures** | `api.ts` | Medium | Network blips, 502/503/504 responses should auto-retry 1-2 times before surfacing errors |
| **11** | **Apply `React.memo` to frequently-re-rendered list items** | `researcher/page.tsx`, `species/page.tsx`, `leaderboard/page.tsx` | Small | Observation cards, species cards, and leaderboard rows re-render on any parent state change |
| **12** | **Lazy-load `capture/page.tsx`'s `react-map-gl` dependency** | `capture/page.tsx` | Medium | `react-map-gl` is ~1.7 MB; wrap map section in `next/dynamic()` so it only loads when user opens the map picker |
| **13** | **Add token expiry check to `AuthGuard.tsx`** | `AuthGuard.tsx:29-46` | Small | Check token `exp` claim before calling `getProfile()`; redirect immediately if expired instead of waiting for 401 |
| **14** | **Add `useTransition` for non-urgent state updates** | `analytics/page.tsx`, `capture/page.tsx` | Medium | Filter changes, tab switches, and date range updates should use `useTransition` to keep the UI responsive |
| **15** | **Convert at least one page to a Server Component** | `species/page.tsx`, `leaderboard/page.tsx` | Medium | Species list and leaderboard data can be fetched server-side; reduces client JS and improves initial load |

---

## 4. Summary of Strengths

- **Strict TypeScript config** (`strict: true`, `skipLibCheck: true`, `moduleResolution: bundler`) — solid foundation
- **Zero `as any` casts** — the `: any` issue is contained to 8 lines in `api.ts`, not scattered throughout
- **`next/dynamic` already in use** for analytics map/charts and admin engagement tab — pattern is established
- **CSP headers present** with reasonable allowlists for Azure Blob, Mapbox, and Firebase
- **AuthGuard** implements session verification + role-based routing with cleanup
- **ErrorBoundary** wraps the app with proper fallback UI and telemetry reporting
- **`useMemo`/`useCallback`** used correctly in the files that need them (analytics, capture, researcher)

---

## 5. Recommended Priority Order

| Phase | Timeline | Fixes | Focus |
|---|---|---|---|
| **Week 1** (Quick wins) | Immediate | 1, 3, 7, 8, 9 | Type safety, camera permission, duplicate types, silent error swallows |
| **Week 2** (Security + resilience) | Short-term | 2, 6, 10, 13 | CSP hardening, request cancellation, retry logic, token expiry |
| **Week 3** (Performance) | Medium-term | 4, 5, 11, 12 | Extract monolithic pages, memoization, lazy-load map in capture |
| **Week 4** (Modernization) | Long-term | 14, 15 | React 19 hooks (`useTransition`), Server Components |

**Highest-leverage single change:** Fix the 8 `: any` in `api.ts` (Fix #1) — small effort, eliminates all type-unsafe API call sites, and establishes the pattern for proper DTO usage across the codebase.

**Second-highest:** Remove `'unsafe-eval'` from CSP (Fix #2) — closes a significant security hole that allows arbitrary code execution in the browser.
