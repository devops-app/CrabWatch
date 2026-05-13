# Navigation Types

This folder uses centralized route typing in `types.ts`.

## Param Lists

- `AuthStackParamList`
  - `Login`
  - `Register`

- `MainTabParamList`
  - `Home`
  - `New`
  - `Species`
  - `Profile`

- `RootStackParamList`
  - `MainTabs` (typed with `NavigatorScreenParams<MainTabParamList>`)
  - `SpeciesDetail` (`{ speciesId: string }`)
  - `ObservationDetail` (`{ observation: ObservationResponse }`)
  - `EditProfile`

## Usage

- Stack creation:
  - `createNativeStackNavigator<RootStackParamList>()`
  - `createNativeStackNavigator<AuthStackParamList>()`

- Tab creation:
  - `createBottomTabNavigator<MainTabParamList>()`

- Screen navigation typing:
  - `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`
  - `useRoute<RouteProp<RootStackParamList, 'SpeciesDetail'>>()`

## When adding a screen

1. Add route + params to the correct param list in `types.ts`.
2. Register screen in the appropriate navigator file.
3. Update screen-level `useNavigation`/`useRoute` typings.
4. Run `pnpm --filter=@crabwatch/mobile typecheck`.
