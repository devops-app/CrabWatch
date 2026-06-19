# Navigation Types

This folder uses centralized route typing in `types.ts`.

## Param Lists

- `RootStackParamList` — single unified stack containing all auth and main app routes
  - `Login`
  - `Register`
  - `ForgotPassword`
  - `ResetPassword` (`{ token: string }`)
  - `Terms`
  - `Privacy`
  - `MainTabs` (typed with `NavigatorScreenParams<MainTabParamList>`)
  - `SpeciesList`
  - `SpeciesDetail` (`{ speciesId: string }`)
  - `ObservationDetail` (`{ observation: ObservationResponse }`)
  - `EditProfile`
  - `AnalysisLoading` (`{ photos: string[]; views: PhotoView[]; sessionId: string; coinType?: string; qualityOverrides?: ... }`)
  - `AIReview` (`{ analysis: CrabAnalysisResult; photos: string[]; views: PhotoView[]; sessionId: string; coinType?: string; blobUrls?: string[] }`)
  - `About`
  - `Leaderboard`
  - `Missions`
  - `Achievements`
  - `NotificationSettings`
  - `ProfileSettings`

- `MainTabParamList`
  - `Home`
  - `New`
  - `Analytics`
  - `Researcher` (conditional — RESEARCHER/ADMIN role only)
  - `Admin` (conditional — ADMIN role only)
  - `Profile`

## Architecture

`AppNavigator` uses a single `Stack.Navigator<RootStackParamList>` with `key={String(isAuthenticated)}` to force clean remount on auth state change. `initialRouteName` switches between `Login` and `MainTabs` based on auth state. This avoids Android native-stack's `common.routeNotFound` error caused by conditional navigator swapping.

## Usage

- Stack creation:
  - `createNativeStackNavigator<RootStackParamList>()`

- Tab creation:
  - `createBottomTabNavigator<MainTabParamList>()`

- Screen navigation typing:
  - `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`
  - `useRoute<RouteProp<RootStackParamList, 'SpeciesDetail'>>()`

## When adding a screen

1. Add route + params to `RootStackParamList` in `types.ts`.
2. Register screen in `AppNavigator.tsx`.
3. Update screen-level `useNavigation`/`useRoute` typings.
4. Run `pnpm --filter=@crabwatch/mobile typecheck`.
