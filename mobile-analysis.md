# CrabWatch Mobile — iOS HIG & Material Design 3 Compliance Audit

**Audit Date:** 2026-05-18
**App Root:** `D:\demo\CrabWatch\mobile\`
**Stack:** Expo SDK 54, React 19, React Native 0.81.5, Zustand, React Navigation
**Scope:** All screens (`mobile/src/screens/`), shared components (`mobile/src/components/`), navigation (`mobile/src/navigation/`), and theming

---

## 1. Executive Summary

| Dimension | Score | Grade |
|---|---|---|
| **iOS Human Interface Guidelines** | **52 / 100** | Needs Improvement |
| **Material Design 3** | **45 / 100** | Needs Improvement |
| **Cross-Platform Consistency** | **60 / 100** | Fair |
| **Accessibility (a11y)** | **30 / 100** | Critical Gaps |

**Overall Assessment:** The app is functional and visually coherent with a consistent custom color palette, but it does not meaningfully adapt to either platform's design language. Dark mode is explicitly disabled, there is no semantic theme system, no haptic feedback, no accessibility labels, and no adaptive layout. The UI feels like a web app rendered in a native shell.

---

## 2. iOS Human Interface Guidelines — Detailed Findings

### 2.1 Layout & Safe Areas

| # | Severity | Finding | File:Line |
|---|---|---|---|
| L1 | Medium | Tab bar height is hardcoded to `60` (px). iOS standard tab bar is 49pt plus safe-area inset. This makes the tab bar taller than expected on iPhone SE and older devices. | `MainTabs.tsx:39` |
| L2 | Medium | Tab bar `paddingBottom: 8` and `paddingTop: 8` are uniform. On iOS, only the bottom needs extra padding for the home indicator; the top should rely on safe area. | `MainTabs.tsx:37-38` |
| L3 | Low | `KeyboardAvoidingView` uses `keyboardVerticalOffset={60}` on iOS. This is a magic number; it should derive from the actual header height or use `useWindowDimensions()` for accuracy. | `LoginScreen.tsx:60`, `RegisterScreen.tsx:92`, `EditProfileScreen.tsx:157` |
| L4 | Low | No use of `useSafeAreaInsets()` anywhere in screen content. Screens rely solely on `SafeAreaView` wrapping, which is correct, but internal content does not account for dynamic insets (e.g., iPad multitasking). | All screen files |

### 2.2 Typography

| # | Severity | Finding | File:Line |
|---|---|---|---|
| T1 | High | No use of `useFontScaling()` or `allowFontScaling` on `TextInput`. Users who increase Dynamic Type in iOS Settings will see truncated or misaligned text. | `Input.tsx:30-38` (TextInput has no `allowFontScaling`) |
| T2 | Medium | Font sizes are hardcoded pixel values (12, 13, 14, 15, 16, 18, 22, 24, 28, 30, 36) with no semantic scale. iOS expects a type hierarchy (Large Title 34pt, Title 28pt, Headline 22pt, Body 17pt, Caption 12pt). | `constants.ts:1-48`, all screen files |
| T3 | Low | `letterSpacing: -1` on login title is a web-style treatment; iOS typography avoids negative letter-spacing on UI text. | `LoginScreen.tsx:151` |

### 2.3 Color & Appearance

| # | Severity | Finding | File:Line |
|---|---|---|---|
| C1 | Critical | Dark mode is explicitly disabled: `"userInterfaceStyle": "light"` in `app.json`. This is a hard violation of modern iOS expectations. Users who enable system dark mode will be forced into a bright interface. | `app.json` |
| C2 | High | All colors are hardcoded hex values in `constants.ts`. No use of `useColorScheme()`, `Appearance.addChangeListener()`, or iOS `UIUserInterfaceStyle`. | `constants.ts:8-30` |
| C3 | Medium | Navigation bar uses `headerStyle: { backgroundColor: '#0284c7' }` on every screen. iOS convention is to use the system navigation bar style (large title, translucent, or large-title scroll-enabled). | `AppNavigator.tsx:32,37,42,57,62,67,72,77`, `MainTabs.tsx:29`, `AuthStack.tsx:14` |
| C4 | Medium | Status bar style is never configured. On iOS, the status bar text color will be the default (dark), which has poor contrast against the `#0284c7` navigation bar. | No file — `StatusBar` component never imported |

### 2.4 Interaction & Feedback

| # | Severity | Finding | File:Line |
|---|---|---|---|
| I1 | High | No `hapticFeedback` on any `TouchableOpacity` or `Button`. iOS users expect subtle impact feedback on button presses, toggles, and destructive actions. | `Button.tsx:36-46`, all `TouchableOpacity` usages |
| I2 | Medium | `activeOpacity={0.7}` on all touchables. iOS convention is to use `activeOpacity={0.8}` or, better, the native `Pressable` with `android_ripple` and no opacity change on iOS. | `Button.tsx:45`, `Card.tsx:36`, `PhoneCodePicker.tsx:62`, `CountryPicker.tsx:54` |
| I3 | Medium | No pull-to-refresh (`RefreshControl`) on any scrollable list. iOS users expect pull-to-refresh on data lists (observations, analytics, leaderboard). | `ProfileScreen.tsx:75`, `AnalyticsScreen.tsx:52`, `HomeScreen.tsx:58` |
| I4 | Low | No long-press context menus. Observation cards in the profile could benefit from a `Pressable` with `onLongPress` for quick actions. | `ProfileScreen.tsx:268-295` |

### 2.5 Navigation

| # | Severity | Finding | File:Line |
|---|---|---|---|
| N1 | Medium | No large-title navigation style. iOS convention for root-level tabs is large titles that collapse on scroll. | `MainTabs.tsx:28-31` |
| N2 | Low | `Alert.alert()` is used for picker dismissal (`PickerWithAlert`). While native on iOS, it interrupts the flow and is not recommended for in-app data selection in modern iOS apps. | `Picker.tsx:51-58` |
| N3 | Low | No swipe-to-go-back gesture customization. The default React Navigation swipe gesture works but is not explicitly enabled or configured. | `AppNavigator.tsx` |

### 2.6 Forms & Inputs

| # | Severity | Finding | File:Line |
|---|---|---|---|
| F1 | Medium | `TextInput` has no `autoFocus` management. On iOS, the keyboard should not auto-open unless explicitly requested. | `Input.tsx:30-38` |
| F2 | Low | No `textContentType` attribute on password fields beyond `secureTextEntry`. iOS expects `textContentType="password"` for password autofill integration with the system keychain. | `LoginScreen.tsx:93-103`, `RegisterScreen.tsx:284-295` |
| F3 | Low | No inline validation feedback beyond `error` text. iOS forms show validation states as the user types (e.g., strength meter for passwords). | `Input.tsx` |

---

## 3. Material Design 3 — Detailed Findings

### 3.1 Color System

| # | Severity | Finding | File:Line |
|---|---|---|---|
| M1 | Critical | No MD3 color roles (primary, onPrimary, primaryContainer, onPrimaryContainer, secondary, tertiary, surface, surfaceVariant, etc.). The app uses a flat 7-color palette that does not map to MD3's 13-role system. | `constants.ts:8-30` |
| M2 | High | No tonal palettes. MD3 requires surfaces at different tonal levels (surface, surfaceVariant, surfaceContainerLow, etc.) to create depth. All surfaces use `#ffffff` or `#f0f9ff`. | All files |
| M3 | Medium | No dynamic color support. MD3 on Android 12+ extracts wallpaper colors for the app theme. This is not implemented. | N/A |

### 3.2 Shape & Elevation

| # | Severity | Finding | File:Line |
|---|---|---|---|
| S1 | Medium | Button `borderRadius: 12` (line 64). MD3 full-width buttons should use `borderRadius: 100` (pill shape). MD3 tonal buttons use `borderRadius: 8`. | `Button.tsx:64` |
| S2 | Medium | Card `borderRadius: 14` (line 53). MD3 cards should use `borderRadius: 12` (small) or `16` (medium). | `Card.tsx:53` |
| S3 | Medium | Input `borderRadius: 10` (line 59). MD3 outlined inputs use `borderRadius: 4`, filled inputs use `borderRadius: 4 4 0 0`. | `Input.tsx:59` |
| S4 | Medium | Elevation is a single `elevation` prop on `Card` with no shadow mapping. MD3 uses 5 elevation levels (0, 1, 2, 3, 4) each with specific shadow color, offset, and blur values. | `Card.tsx:14,22-25,56-59` |
| S5 | Low | `shadowColor: '#000'` with `shadowOpacity: 0.1`. MD3 uses `rgba(0, 0, 0, 0.15)` to `0.30` depending on elevation level. | `Card.tsx:56-59` |

### 3.3 Components

| # | Severity | Finding | File:Line |
|---|---|---|---|
| CM1 | High | No MD3-style ripple effect on Android. `TouchableOpacity` with `activeOpacity` is used universally. MD3 expects `Pressable` with `android_ripple` for authentic Android feedback. | `Button.tsx:37`, all touchables |
| CM2 | Medium | Tab bar does not follow MD3 Navigation Bar spec. MD3 nav bar uses indicator shapes (rounded pill) under the active icon, not color change alone. | `MainTabs.tsx:27-43` |
| CM3 | Medium | No MD3-style FAB (Floating Action Button). The "New Observation" tab could be replaced with an MD3 FAB pattern. | `MainTabs.tsx:56-63` |
| CM4 | Low | Picker uses `Alert.alert()` on Android. MD3 expects a bottom sheet or dropdown menu component. | `Picker.tsx:51-58` |

### 3.4 Typography (MD3)

| # | Severity | Finding | File:Line |
|---|---|---|---|
| TM1 | High | No MD3 type scale (displayLarge, headlineMedium, titleLarge, bodyLarge, labelSmall, etc.). All text uses arbitrary sizes. | All files |
| TM2 | Low | No `fontWeight` mapping to MD3 weights (e.g., label uses Medium 500, body uses Regular 400). | All files |

---

## 4. Accessibility (Cross-Platform)

| # | Severity | Finding | File:Line |
|---|---|---|---|
| A1 | Critical | No `accessibilityLabel` on any `TouchableOpacity` or `Button`. Screen readers (VoiceOver/TalkBack) cannot identify interactive elements. | All files |
| A2 | Critical | No `accessibilityRole` on any component. Buttons should have `role="button"`, links `role="link"`, headers `role="header"`. | All files |
| A3 | High | No `accessibilityHint` on navigation elements. Tab bar icons have no descriptive labels for VoiceOver. | `MainTabs.tsx:45-108` |
| A4 | High | Touch targets are inconsistent. Some `TouchableOpacity` elements (e.g., engagement cards at 44x44 icon) may be below the 44x44pt (iOS) / 48x48dp (Android) minimum. | `ProfileScreen.tsx:484-491` (engagementIcon: 44x44 is minimum but content padding is tight) |
| A5 | Medium | No `importantForAccessibility` on decorative elements (dividers, icons in stat cards). | `ProfileScreen.tsx:383-387` (statDivider) |
| A6 | Medium | Error text in `Input` is not announced to screen readers as an error. Should use `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"`. | `Input.tsx:40` |
| A7 | Low | No `accessibilityState` for disabled buttons. The `Button` component passes `disabled` but does not set `accessibilityState={{ disabled }}`. | `Button.tsx:44` |

---

## 5. Cross-Platform Consistency

| # | Severity | Finding | File:Line |
|---|---|---|---|
| X1 | High | No `Platform.OS` branching for UI differences. The same styles are applied on both iOS and Android, ignoring platform-specific conventions (e.g., iOS rounded tabs vs. Android material tabs). | All files |
| X2 | Medium | Tab bar `height: 60` is too tall for Android (standard 56dp) and too tall for iOS (standard 49pt + safe area). | `MainTabs.tsx:39` |
| X3 | Medium | No adaptive layout for tablets. No use of `useWindowDimensions()` or `Platform.isPad` (Expo). The 2-column stat grid and engagement grid will look sparse on tablets. | `HomeScreen.tsx:184-189`, `ProfileScreen.tsx:471-474` |
| X4 | Low | `gap` CSS property is used extensively. Supported in React Native 0.73+, but some older Android devices may have layout bugs. | `HomeScreen.tsx:187`, `ProfileScreen.tsx:473`, `AnalyticsScreen.tsx:299` |

---

## 6. Top 15 Prioritized Fixes

| # | ID | Fix | Effort | Impact | Files |
|---|---|---|---|---|---|
| **1** | C1 | **Enable dark mode support.** Remove `"userInterfaceStyle": "light"` from `app.json`. Add `useColorScheme()` to `constants.ts` and create light/dark color palettes. | Large | All users | `app.json`, `constants.ts`, all screens |
| **2** | A1+A2 | **Add accessibility labels and roles.** Add `accessibilityLabel` and `accessibilityRole` to all `Button`, `TouchableOpacity`, and `Card` components. | Medium | All a11y users | `Button.tsx`, `Card.tsx`, `Picker.tsx`, all screens |
| **3** | T1 | **Enable Dynamic Type.** Add `allowFontScaling` to all `TextInput` and `Text` components. Use `Dimensions.get('window').fontScale` or `useWindowDimensions()` to clamp extreme scaling. | Small | All a11y users | `Input.tsx`, all screens |
| **4** | I1 | **Add haptic feedback.** Import `* as HapticFeedback` from `react-native` and call `HapticFeedback.trigger('impactLight')` on button press, `selection()` on tab switch, `notificationError()` on validation failure. | Small | All iOS users | `Button.tsx`, `MainTabs.tsx`, `Input.tsx` |
| **5** | S1 | **Fix button border radius for MD3.** Change `Button` borderRadius from `12` to `100` (pill) for primary/secondary variants, `8` for ghost/danger. | Small | All Android users | `Button.tsx:64` |
| **6** | CM1 | **Replace `TouchableOpacity` with `Pressable` for ripples.** Use `Pressable` with `android_ripple` on Android, keep opacity feedback on iOS. Platform-branch the feedback style. | Medium | All Android users | `Button.tsx`, `Card.tsx`, all screens |
| **7** | I3 | **Add pull-to-refresh.** Wrap all `ScrollView` with data lists in `RefreshControl` (iOS) or `react-native-refresh-control` (cross-platform). | Small | All users | `ProfileScreen.tsx`, `AnalyticsScreen.tsx`, `HomeScreen.tsx` |
| **8** | C4 | **Configure status bar.** Import `StatusBar` from `react-native` and set `barStyle="light-content"` where the nav bar is `#0284c7`. | Small | All iOS users | `AppNavigator.tsx`, `MainTabs.tsx`, `AuthStack.tsx` |
| **9** | N1 | **Add iOS large-title navigation.** Set `headerLargeTitle: true` and `headerStyle: { backgroundColor: COLORS.background }` on tab screens. Keep compact headers on detail screens. | Small | All iOS users | `MainTabs.tsx:28-31` |
| **10** | M1 | **Adopt MD3 color roles on Android.** Create a `THEMES` object with `light`/`dark` palettes using MD3 roles (primary, surface, surfaceVariant, etc.). Use `Platform.OS === 'android' ? MD3 : iOS` branching. | Large | All Android users | `constants.ts`, all screens |
| **11** | A6 | **Announce input errors to screen readers.** Add `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"` to error text in `Input`. | Small | All a11y users | `Input.tsx:40` |
| **12** | F2 | **Add `textContentType` for autofill.** Set `textContentType="password"` on password fields, `"none"` on fields that should not autofill. | Small | All iOS users | `LoginScreen.tsx:93`, `RegisterScreen.tsx:284` |
| **13** | X2 | **Platform-specific tab bar height.** Use `Platform.select({ ios: 56, android: 56, default: 60 })` for tab bar height. | Small | All users | `MainTabs.tsx:39` |
| **14** | CM2 | **Add active indicator to tab bar (MD3).** Add a rounded pill indicator below the active tab icon using a custom `tabBarStyle` with a conditional background overlay. | Medium | All Android users | `MainTabs.tsx` |
| **15** | X3 | **Add tablet adaptive layout.** Use `useWindowDimensions()` to detect tablet width (>600pt) and switch 2-column grids to 3-4 columns, increase font sizes, and add sidebar navigation. | Large | Tablet users | `HomeScreen.tsx`, `ProfileScreen.tsx`, `AnalyticsScreen.tsx` |

---

## 7. Platform-Specific Opportunities

### iOS-Only
- **Large Title Navigation:** `headerLargeTitle: true` on tab screens for the signature iOS scroll-collapsing title.
- **In-App Purchase Receipt Validation:** If gamification ever introduces paid features, use `storekit2` (Expo).
- **WidgetKit:** A home screen widget showing today's mission or observation count.
- **ShareSheet:** Use `expo-sharing` or `Share` from `react-native` to let users share observation photos.

### Android-Only
- **Material 3 Dynamic Color:** Use `@react-native-material/core` or custom theming to extract wallpaper colors.
- **Navigation Rail:** On tablets, replace bottom tabs with a vertical navigation rail (MD3 pattern).
- **Quick Settings Tile:** A tile for quick observation capture.

---

## 8. File Inventory (Audited)

| Category | Files |
|---|---|
| Config | `app.json` |
| Theme | `src/utils/constants.ts` |
| Navigation | `src/navigation/AppNavigator.tsx`, `MainTabs.tsx`, `AuthStack.tsx`, `types.ts` |
| Shared Components | `src/components/common/Button.tsx`, `Card.tsx`, `Input.tsx`, `Picker.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx`, `PhoneCodePicker.tsx`, `CountryPicker.tsx` |
| Auth Screens | `src/screens/auth/LoginScreen.tsx`, `RegisterScreen.tsx` |
| Core Screens | `src/screens/home/HomeScreen.tsx`, `src/screens/profile/ProfileScreen.tsx`, `src/screens/profile/EditProfileScreen.tsx`, `src/screens/analytics/AnalyticsScreen.tsx` |
| Observation Screens | `src/screens/observation/GuidedCaptureScreen.tsx`, `AnalysisLoadingScreen.tsx`, `AIReviewScreen.tsx`, `ObservationDetailScreen.tsx`, `NewObservationScreen.tsx` |
| Admin | `src/screens/admin/AdminScreen.tsx` |
| Gamification | `src/screens/gamification/LeaderboardScreen.tsx`, `MissionsScreen.tsx`, `AchievementsScreen.tsx` |
| Researcher | `src/screens/researcher/ResearcherScreen.tsx` |
| Species | `src/screens/species/SpeciesDetailScreen.tsx`, `SpeciesListScreen.tsx` |
| Common | `src/screens/common/AboutScreen.tsx` |

---

## 9. Recommendations Summary

| Phase | Timeline | Fixes | Focus |
|---|---|---|---|
| **Immediate** | Week 1 | 4, 8, 12, 13 | Haptics, status bar, autofill, tab height — small effort, high visible impact |
| **Short-term** | Week 2-3 | 2, 3, 5, 7, 11 | Accessibility labels, Dynamic Type, MD3 border radius, pull-to-refresh, error announcements |
| **Medium-term** | Week 4-6 | 1, 6, 9, 10, 14 | Dark mode, Pressable + ripple, large-title nav, MD3 color roles, active tab indicator |
| **Long-term** | Week 7+ | 15 | Tablet adaptive layout and platform-specific features |

**Highest-leverage single change:** Enable dark mode (Fix #1) — it unlocks the entire theme system and cascades into proper color roles for both iOS and MD3.

**Second-highest:** Add accessibility labels (Fix #2) — binary pass/fail for App Store review compliance on accessibility.
