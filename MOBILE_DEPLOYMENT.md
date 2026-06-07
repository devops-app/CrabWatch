# CrabWatch — Mobile App Guide

## Local Testing

### Prerequisites

1. **Node.js** >= 20.0.0
2. **pnpm** >= 8.0.0
3. **PostgreSQL** running (Docker or local)
4. **Expo Go** app installed for **SDK 54** (iOS App Store / Android Play Store)

### Step 1: Start the Backend Server

The mobile app needs the API server running locally:

```powershell
# From project root
pnpm install
pnpm --filter=server db:push
pnpm --filter=server db:seed
pnpm dev:server
```

Server should be running on `http://localhost:3001`. All API endpoints are versioned under `/api/v1/`.

### Step 2: Configure Environment

The mobile app already has a `.env` file with Firebase credentials. Verify the API URL:

```env
# mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

> **Important for physical devices:** `localhost` on your phone refers to the phone itself, not your computer. If testing on a physical device, replace with your machine's LAN IP:
> ```env
> EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api/v1
> ```
> Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

### Step 3: Start the Expo Dev Server

```powershell
cd mobile
pnpm dev
```

If Metro cache looks stale after dependency/config changes:

```powershell
# from project root
pnpm --filter=@crabwatch/mobile exec expo start --clear
```

This starts Metro bundler on port `8081` and prints a QR code.

### Step 4: Open on Your Device

1. **iOS**: Open the **Camera app** (not Expo Go), point it at the QR code, tap the notification banner
2. **Android**: Open **Expo Go**, scan the QR code directly
3. The app will load on your device

### Alternative: Run on Simulator/Emulator

**iOS Simulator (macOS only):**
```powershell
pnpm dev:ios
```

**Android Emulator:**
```powershell
pnpm dev:android
```

### Step 5: Test the App

1. **Login** — Use seed credentials:
    - `admin@crabwatch.my` / `Pa55w.rd`
    - `researcher@crabwatch.my` / `Pa55w.rd`
    - `citizen@crabwatch.my` / `Pa55w.rd`

> Password is controlled by `SEED_PASSWORD` env var (default: `Pa55w.rd`).

> **Note:** All API calls go through `/api/v1/` endpoints. The mobile app's `.env` should have `EXPO_PUBLIC_API_URL` including the versioned base path (e.g., `http://192.168.1.x:3001/api/v1` for physical devices).

2. **Test key flows:**
   - Home screen — view stats cards and quick actions
   - AI-Guided Capture — tap "New" tab → select coin series (Third/Second) → dorsal/ventral photos → AI analysis → review & submit
   - Analytics — view Gender Ratio, Size Frequency, CW50, Condition Index, Species Distribution, Temporal Trends charts, and Map tab with geographic distribution
   - Profile — view/edit user profile, view XP stats card
   - Logout — verify logout redirects to login screen

3. **Test dark mode:**
   - Toggle device between light/dark mode — verify all screens adapt
   - Check tab bar, status bar, and all screens for correct colors

4. **Test deep linking:**
   - Open `crabwatch://reset-password/<token>` from terminal or another app
   - Verify app opens to ResetPassword screen with token pre-filled
   - Test with app in foreground, background, and not running

5. **Test safe area:**
   - On iPhone with notch: verify tab bar not obscured by home indicator
   - On Android: verify tab bar at normal bottom position

8. **Test analytics map tab:**
   - Navigate to Analytics > Map tab — verify map renders centered on Malaysia
   - Verify status-colored markers (approved/pending/rejected)
   - Toggle gender filter — verify map updates
   - Tap marker — verify observation info card appears with species, gender, date, location
   - Tap photo in card — verify fullscreen photo modal opens

6. **Test dynamic type scaling (iOS):**
    - Go to Settings → Display & Brightness → Text Size
    - Increase text size to Large or Extra Large
    - Navigate through all screens and verify text scales appropriately
    - Verify no text overflow or layout breaking at maximum scale (2x cap)
    - On Android: verify text size remains at base values (no dynamic scaling)

7. **Test MD3 elevation:**
    - Navigate to screens with Card components (Home, Profile, Leaderboard, etc.)
    - Verify cards have consistent shadow/elevation
    - Test in both light and dark mode to verify shadows render correctly

3. **Role-based tabs (visible based on user role):**
   - **RESEARCHER**: "Researcher" tab — approve/reject pending observations
   - **ADMIN**: "Admin" tab — manage users, species, invites, and backups

6. **Test error handling:**
   - Disconnect network — verify offline banner appears
   - Invalid login — verify error messages display
   - Submit empty observation — verify form validation
   - AI analysis failure — verify fallback to manual observation form

### Troubleshooting

**Cannot connect to API server:**
```powershell
# Verify server is running
curl http://localhost:3001/health

# Check firewall allows localhost connections
# For physical devices, use your LAN IP instead of localhost
```

**Expo Go SDK version mismatch:**
- If you see "project is incompatible with this version of Expo Go", your Expo Go version doesn't match the project's SDK (54)
- Uninstall Expo Go and reinstall the latest version from the App Store / Play Store
- Alternatively, upgrade your project: `npx expo upgrade`

**Metro bundler won't start:**
```powershell
# Clear cache and restart
npx expo start -c
```

**App entry not found / app not registered:**
- Ensure `mobile/package.json` uses `"main": "index.js"`
- Ensure `mobile/app.json` uses `"entryPoint": "./index.js"`
- Ensure `mobile/index.js` registers the app root:

```javascript
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
```

- Then restart with cache clear:

```powershell
pnpm --filter=@crabwatch/mobile exec expo start --clear
```

**Known Expo SDK 54 warnings:**
- `SafeAreaView has been deprecated`: migrate imports from `react-native` to `react-native-safe-area-context`
- `ImagePicker.MediaTypeOptions has been deprecated`: use `ImagePicker.MediaType` (or an array of media types)

**Module resolution errors:**
```powershell
# Ensure workspace dependencies are linked
pnpm install
```

**Camera/Location permissions denied:**
- Grant permissions in device settings or when prompted by the app
- iOS: Settings > Privacy > Camera/Location > CrabWatch

**App crashes on launch:**
```powershell
# Clear Expo cache and restart
rm -rf node_modules/.cache
npx expo start -c
```

---

## Publishing to App Stores

### Prerequisites
- **Android**: Google Play Developer account ($25 one-time fee)
- **iOS**: Apple Developer Program ($99/year)

### Build with EAS

```powershell
cd mobile

# Login and init (first time only)
npx eas-cli login
npx eas-cli init

# Build for stores
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production

# Build for internal testing (APK, no store required)
npx eas-cli build --platform android --profile preview
```

See `mobile/eas.json` for build profiles (development, preview, production).

---

## Development Tips

- **Hot reload:** Changes to JS/TS files reload automatically in Expo Go
- **React DevTools:** Install React DevTools extension for debugging
- **Clear Metro cache** after dependency/config changes: `pnpm --filter=@crabwatch/mobile exec expo start --clear`
