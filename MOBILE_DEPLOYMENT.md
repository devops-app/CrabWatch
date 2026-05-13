# CrabWatch — Mobile App Guide

## Local Testing

### Prerequisites

1. **Node.js** >= 18.0.0
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
EXPO_PUBLIC_API_URL=http://localhost:3001
```

> **Important for physical devices:** `localhost` on your phone refers to the phone itself, not your computer. If testing on a physical device, replace with your machine's LAN IP:
> ```env
> EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
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
    - `admin@crabwatch.my` / `SeedPassword2026!Secure`
    - `researcher@crabwatch.my` / `SeedPassword2026!Secure`
    - `citizen@crabwatch.my` / `SeedPassword2026!Secure`

> **Note:** All API calls go through `/api/v1/` endpoints. The mobile app's `.env` should have `EXPO_PUBLIC_API_URL` pointing to your server (e.g., `http://192.168.1.x:3001` for physical devices).

2. **Test key flows:**
   - Home screen — view species list and stats
   - AI-Guided Capture — tap "New" tab → select coin series (Third/Second) → dorsal/ventral photos → AI analysis → review & submit
   - Manual Observation — fallback form when AI analysis fails or is unavailable
   - Map — view observation locations (requires Mapbox token)
   - Profile — view/edit user profile
   - Logout — verify logout redirects to login screen

3. **Test error handling:**
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

### Apple App Store

**Requirements:**
- Apple Developer Program membership ($99/year)
- Mac computer (or use EAS Build cloud)

**Option A: EAS Build (Recommended — no Mac needed)**
```powershell
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure EAS
npx eas build:configure

# 4. Build for iOS
npx eas build --platform ios

# 5. Submit to App Store Connect
npx eas submit --platform ios
```

**Option B: Local Build (requires Mac + Xcode)**
```powershell
# 1. Build iOS archive
npx expo run:ios --configuration Release

# 2. Open Xcode > Archive > Distribute App > App Store Connect
```

**App Store Connect Setup:**
1. Create app record at https://appstoreconnect.apple.com
2. Fill in app name, description, screenshots, privacy policy URL
3. Upload build via EAS or Xcode
4. Submit for review (takes 24-48 hours)

### Google Play Store

**Requirements:**
- Google Play Developer account ($25 one-time fee)
- Android SDK (or use EAS Build cloud)

**Option A: EAS Build (Recommended)**
```powershell
# 1. Build for Android
npx eas build --platform android

# 2. Submit to Google Play Console
npx eas submit --platform android
```

**Option B: Local Build (requires Android Studio)**
```powershell
# 1. Build Android app bundle
npx expo run:android --configuration Release

# 2. Upload app.aab to Google Play Console
```

**Google Play Console Setup:**
1. Create app record at https://play.google.com/console
2. Fill in app details, screenshots, privacy policy
3. Upload build via EAS or Play Console
4. Submit for review (takes 1-7 days)

---

## Development Tips

- **Hot reload:** Changes to JS/TS files reload automatically in Expo Go
- **React DevTools:** Install React DevTools extension for debugging
- **Expo Dev Client:** For more control, build a dev client:
  ```powershell
  npx expo run:ios --dev-client
  npx expo run:android --dev-client
  ```
- **Environment-specific config:** Use `app.config.js` for different configs per environment
