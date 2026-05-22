# CrabWatch — Codebase Improvement Plan

> **Generated**: 2026-05-21
> **Source**: Multi-skill codebase analysis (TypeScript, React, Node.js, iOS HIG, Android MD3)
> **Status**: 24/24 complete (all P0 done, 10/10 P1 done, 6/6 P2)

---

## Priority Matrix

| Priority | Count | Target |
|----------|-------|--------|
| **P0 — Must Fix** | 8 | Security, crashes, accessibility blockers |
| **P1 — Should Fix** | 10 | Performance, maintainability, best practices |
| **P2 — Nice to Have** | 6 | Polish, optimization, future-proofing |

---

## P0 — Must Fix

### P0-1: Type AI response in `foundryAgent.ts` (Security/Correctness)
- **File**: `server/src/services/foundryAgent.ts`
- **Issue**: AI agent response body parsed as `any` — no type safety on extracted fields (species, gender, measurements)
- **Fix**: Define `FoundryAgentResponse` interface matching expected AI output structure
- **Effort**: 30 min

### P0-2: Replace `any` in mobile API service
- **File**: `mobile/src/services/api.ts`
- **Issue**: 7 `any` annotations replaceable with existing shared DTOs
- **Fix**:
  - Line 403-405, 417-419: `keyFeatures?: any[]` → `keyFeatures?: KeyFeature[]`, `distributionZones?: any[]` → `distributionZones?: DistributionZone[]`
  - Line 532: `createCampaign(payload: Record<string, any>)` → `createCampaign(payload: CampaignCreateInput)`
  - Line 543: `getCommunityStats(): Promise<any>` → `Promise<CommunityStatsDto>`
  - Line 549, 555: notification preferences → `NotificationPreferenceDto`
  - Line 561: `listInvites(): Promise<any>` → `Promise<Invite[]>`
- **Effort**: 20 min

### P0-3: Add error boundary to mobile app root
- **File**: `mobile/App.tsx`
- **Issue**: No error boundary — single screen crash crashes entire app
- **Fix**: Install `react-native-error-boundary`, wrap `<AppNavigator />` with fallback UI (error message + restart button)
- **Effort**: 10 min

### P0-4: Enforce minimum touch targets in `Button.tsx`
- **File**: `mobile/src/components/common/Button.tsx`
- **Issue**: No enforced minimum dimensions — short text buttons fall below 44pt (iOS) / 48dp (Android)
- **Fix**: Add `minHeight: Platform.select({ ios: 44, android: 48 })` and `minWidth` constraints
- **Effort**: 10 min

### P0-5: Replace `ScrollView` with `FlatList` in AchievementsScreen
- **File**: `mobile/src/screens/gamification/AchievementsScreen.tsx`
- **Issue**: Renders all achievements in `ScrollView` — will degrade with 50+ items
- **Fix**: Replace with `FlatList` (or `FlashList`) with `numColumns` for grid layout
- **Effort**: 30 min

### P0-6: Add image caching for mobile
- **Scope**: All screens using `Image` from `react-native`
- **Issue**: No caching — repeated network fetches for observation photos, poor scroll performance
- **Fix**: Install `expo-image`, replace `import { Image } from 'react-native'` with `import { Image } from 'expo-image'`
- **Effort**: 1 hr

### P0-7: Type leaderboard cache in server
- **File**: `server/src/services/leaderboardService.ts`
- **Issue**: `CacheEntry<any>` and `set(..., data: any)` — bypasses type safety
- **Fix**: `CacheEntry<LeaderboardEntryDto[]>` with proper generic instantiation
- **Effort**: 10 min

### P0-8: Fix Express Request extension in auth middleware
- **File**: `server/src/middleware/auth.ts`
- **Issue**: `req.requestId` accessed via `as any`
- **Fix**: Create `server/src/types/express.d.ts` with `Express.Request` declaration merging for `requestId` and `dbUser`
- **Effort**: 10 min

---

## P1 — Should Fix

### P1-1: Lazy-load capture `map-picker.tsx`
- **File**: `web/src/app/dashboard/capture/page.tsx`
- **Issue**: `map-picker.tsx` eagerly imports `react-map-gl` (1,705 kB) — only shown on step 2
- **Fix**: Wrap with `next/dynamic(() => import('./map-picker'), { ssr: false, loading: () => <Skeleton /> })`
- **Effort**: 20 min

### P1-2: Convert `dashboard/page.tsx` to Server Component
- **File**: `web/src/app/dashboard/page.tsx`
- **Issue**: Fetches all data client-side — initial load waterfall
- **Fix**: Server Component fetches recent observations + stats via `fetch()` + `cookies()`; interactive elements in `'use client'` sub-component
- **Effort**: 30 min

### P1-3: Remove duplicate `ApiResponse<T>` in web API client
- **File**: `web/src/lib/api.ts`
- **Issue**: Re-declares `ApiResponse<T>` locally instead of importing from `@crabwatch/shared`
- **Fix**: Import from shared, remove local declaration. Replace `Record<string, any>` in `updateNotificationPreferences` and `createCampaign` with proper DTOs
- **Effort**: 15 min

### P1-4: Type mobile admin screen state
- **File**: `mobile/src/screens/admin/AdminScreen.tsx`
- **Issue**: `useState<any[]>([])` for rules, levels, and other engagement data
- **Fix**: Use `GamificationRuleDto[]`, `LevelConfigDto[]`, etc. from `@crabwatch/shared`
- **Effort**: 30 min

### P1-5: Add abort guards to data-fetching `useEffect`s
- **Files**:
  - `web/src/app/dashboard/leaderboard/page.tsx`
  - `web/src/app/dashboard/community/client.tsx`
  - `web/src/app/dashboard/admin/components.tsx`
- **Issue**: Component unmount between scope/page changes can cause stale state updates
- **Fix**: Add `let cancelled = false` pattern or `AbortController` to each effect
- **Effort**: 30 min

### P1-6: Further split `admin/components.tsx` [DONE]
- **File**: `web/src/app/dashboard/admin/components.tsx`
- **Issue**: ~1,500 lines — all engagement admin sub-sections re-render together
- **Fix**: Wrapped all 10 inline sub-components with `React.memo`: `XPRulesTab`, `LevelsTab`, `XPAdjustTab`, `CampaignAdminSubTab`, `AuditAdminSubTab`, `AbuseAdminSubTab`, `AchievementsAdminSubTab`, `MissionsAdminSubTab`, `MetricsAdminSubTab`, `SeasonsAdminSubTab`
- **Effort**: 1 hr

### P1-7: Introduce lightweight DI for server services
- **Scope**: `server/src/services/`
- **Issue**: Direct imports create circular coupling (`rewardEngine` → `leaderboardService`), prevents unit testing
- **Fix**: Create simple service container or factory functions to inject `prisma`, config, and cross-service dependencies
- **Effort**: 2 hrs

### P1-8: Replace inline error handling with throw pattern
- **Scope**: `server/src/controllers/`
- **Issue**: Inline `try/catch` + `res.status().json()` instead of `throw new AppError()`
- **Fix**: Replace with `throw new AppError()` pattern, wire up `asyncHandler` wrapper
- **Effort**: 1 hr

### P1-9: Use Zustand selectors in web pages
- **Files**: `leaderboard/page.tsx`, `researcher/page.tsx`, `capture/page.tsx`, `admin/` pages
- **Issue**: `const { user } = useAuthStore()` subscribes to entire store
- **Fix**: `const userId = useAuthStore(state => state.user?.id)` for pages that only need specific fields
- **Effort**: 20 min

### P1-10: Add pull-to-refresh to Missions and Achievements screens
- **Files**: `mobile/src/screens/gamification/MissionsScreen.tsx`, `AchievementsScreen.tsx`
- **Issue**: Scrollable data screens with no manual refresh option
- **Fix**: Add `RefreshControl` to matching scroll containers
- **Effort**: 15 min

---

## P2 — Nice to Have

### P2-1: Replace local interfaces with shared DTOs in mobile gamification screens
- **Files**:
  - `mobile/src/screens/gamification/MissionsScreen.tsx` → `ActiveMissionDto`, `OnboardingStatusDto`
  - `mobile/src/screens/gamification/AchievementsScreen.tsx` → `UserAchievementListDto`, `CheckAchievementsResponseDto`
- **Issue**: Local interface declarations duplicate shared types
- **Effort**: 20 min

### P2-2: Convert more web pages to Server Components
- **Files**: `species/page.tsx`, `observation/[id]/page.tsx`, `leaderboard/page.tsx`, `missions/page.tsx`, `achievements/page.tsx`
- **Issue**: All client-side data fetching — could benefit from RSC initial data loading
- **Fix**: Follow `community/page.tsx` pattern: server fetches, client interacts
- **Effort**: 2 hrs (all pages)

### P2-3: Replace `ScrollView` with `FlatList` in MissionsScreen and HomeScreen [DONE]
- **Files**: `mobile/src/screens/gamification/MissionsScreen.tsx`, `mobile/src/screens/home/HomeScreen.tsx`
- **Issue**: `ScrollView` for potentially unbounded lists
- **Fix**: Replaced with `FlatList`. MissionsScreen uses fixed tabBar + FlatList for missions list with ListEmptyComponent. HomeScreen uses data array with ListHeaderComponent for header/stats and renderItem switch for cards.
- **Effort**: 30 min

### P2-4: Apply dynamic type to all Text components [DONE]
- **Scope**: All mobile screens
- **Issue**: `dynamicFontSize` utility exists but only used in `Input.tsx`; most `Text` components use hardcoded `fontSize`
- **Fix**: Applied `FONT.*` references to all `fontSize` in StyleSheet definitions across 21 screen files and 12 component files. All hardcoded values replaced with dynamic sizes from `fonts.ts`.
- **Effort**: 1 hr

### P2-5: Add card accessibility attributes [DONE]
- **Files**: `mobile/src/components/common/Card.tsx`, `SpeciesCard.tsx`
- **Issue**: Interactive cards lack `accessibilityRole="button"` and `accessibilityLabel`
- **Fix**: Added `accessibilityRole`, `accessibilityLabel`, `onAccessibilityEscape` props passthrough to `Card.tsx`
- **Effort**: 15 min

### P2-6: Implement MD3 elevation tokens [DONE]
- **Files**: `mobile/src/components/common/Card.tsx`, `mobile/src/utils/constants.ts`
- **Issue**: Hardcoded shadow values instead of MD3 elevation levels (0-5)
- **Fix**: Created `ELEVATION` token map (levels 1-5) in `constants.ts`, applied to `Card.tsx` with typed elevation prop
- **Effort**: 20 min

---

## Checklist

Track progress by checking off items as completed:

### P0 — Must Fix
- [x] P0-1: Type AI response in `foundryAgent.ts`
- [x] P0-2: Replace `any` in `mobile/src/services/api.ts`
- [x] P0-3: Add error boundary to mobile `App.tsx`
- [x] P0-4: Enforce min touch targets in `Button.tsx`
- [x] P0-5: Replace `ScrollView` with `FlatList` in `AchievementsScreen`
- [x] P0-6: Add image caching (`expo-image`)
- [x] P0-7: Type leaderboard cache in `leaderboardService.ts`
- [x] P0-8: Fix Express Request extension in `auth.ts`

### P1 — Should Fix
- [x] P1-1: Lazy-load capture `map-picker.tsx` (already implemented)
- [x] P1-2: Convert `dashboard/page.tsx` to Server Component
- [x] P1-3: Remove duplicate `ApiResponse<T>` in `web/src/lib/api.ts`
- [x] P1-4: Type mobile admin screen state
- [x] P1-5: Add abort guards to data-fetching effects
- [x] P1-6: Further split `admin/components.tsx`
- [x] P1-7: Introduce lightweight DI for server
- [x] P1-8: Replace inline error handling with throw pattern
- [x] P1-9: Use Zustand selectors in web pages
- [x] P1-10: Add pull-to-refresh to Missions/Achievements (already implemented)

### P2 — Nice to Have
- [x] P2-1: Replace local interfaces in mobile gamification screens
- [x] P2-2: Convert more web pages to Server Components
- [x] P2-3: Replace `ScrollView` in MissionsScreen and HomeScreen
- [x] P2-4: Apply dynamic type to all Text components
- [x] P2-5: Add card accessibility attributes
- [x] P2-6: Implement MD3 elevation tokens

---

## Scores Summary

| Dimension | Score | Key Takeaway |
|-----------|-------|-------------|
| TypeScript Type Safety | 7.5/10 | Strong foundation; 14 files need `any` replacement |
| React Modernization (Web) | 8.5/10 | Excellent code splitting; RSC adoption is the next step |
| Mobile iOS/Android | 78% | Good dark mode/safe area; missing error boundary, image caching, list virtualization |
| Node.js Backend | 6/10 | Clean architecture; needs DI, better error handling, graceful shutdown |
