# CrabWatch — Google Play Release Setup

> Target: **Production track** (public release)
> Package: `com.dsigncodehub.crabwatch`
> EAS project: `@dsigncodehub/crabwatch` (project ID `2b6450de-2e8d-4d06-a12e-ef9fc444d7b7`)

---

## Prerequisites (already done)

- [x] App created in Google Play Console
- [x] EAS CLI logged in (`wilsontsui`)
- [x] `eas.json` — `submit.production.android.track` = `production`, `releaseStatus` = `draft`
- [x] `app.json` — `targetSdkVersion` 36 (Google Play requirement for new apps since Aug 2026)
- [x] `mobile/.gitignore` — `google-service-account.json` excluded

---

## Step 1 — Create a Google Play service account

EAS Submit needs a service account key to upload the AAB to Play Console.

1. Go to **Play Console → Users and permissions** (left sidebar, under your app or at account level)
2. Click **Invite new users**
3. Email: create a **Google Cloud service account** first (see below), then invite that service account email
4. Under **App-level permissions**, grant:
   - **Release to production** → *View and edit*
   - **Manage store presence** → *View and edit* (needed for screenshots/listing)
   - **Manage app content** → *View and edit*
5. Click **Send invitation** and accept it from the service account (or it auto-accepts for service accounts)

### Creating the service account (Google Cloud)

1. Go to [Google Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **Create Service Account** → name it e.g. `crabwatch-play-upload` → **Done**
3. (No project roles needed — Play Console permissions come from the invite in step 4)
4. Open the service account → **Keys** tab → **Add key** → **JSON**
5. The downloaded file is your service account key

### ⚠️ Enable the Google Play Android Developer API (required)

The service account's GCP project must have the **Google Play Android Developer API** enabled, or the upload fails with:

```
PERMISSION_DENIED: Google Play Android Developer API has not been used in project <id> before or it is disabled.
```

1. Go to [APIs & Services → Library](https://console.developers.google.com/apis/library) in the **same GCP project** as the service account
2. Search for **Google Play Android Developer API** → **Enable**
3. **Wait ~5 minutes** for propagation before submitting

### Place the key in the workspace

Save the downloaded JSON as:

```
mobile/google-service-account.json
```

> ⚠️ This file is gitignored. Never commit it.

EAS will auto-detect it at `mobile/google-service-account.json` (or you can pass `--service-account` explicitly).

---

## Step 2 — Google Maps API key (for map tiles on Android)

The app uses `react-native-maps` with `PROVIDER_GOOGLE` (analytics map + GPS picker). Without a Maps API key, map tiles render blank on Android.

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create Credentials → API Key**
3. In the same project, enable **Maps SDK for Android** (APIs & Services → Library)
4. Edit the API key → **Application restrictions** → **Android apps**
5. Add:
   - Package name: `com.dsigncodehub.crabwatch`
   - SHA-1 fingerprint: see below
6. Copy the API key

### Getting the SHA-1 fingerprint

For a **production** build, Google generates the app signing key when you first upload the AAB:

1. After the first AAB upload (Step 4 below), go to **Play Console → (app) → Release → Setup → App integrity → App signing**
2. Copy the **SHA-1 certificate fingerprint**
3. Add it to the API key restriction

> **Note:** If you want maps working in dev builds too, you can also add the debug keystore SHA-1 (from EAS → Project settings → Credentials → Android Keystore) as a second restriction entry.

### Add the Maps API key to the app

Add to `mobile/app.json` under `expo.android.config`:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_MAPS_API_KEY"
    }
  }
}
```

> This requires a rebuild after adding. If you'd rather skip maps for the initial release, the app still works — map tiles just show blank. The GPS picker has a manual coordinate fallback.

---

## Step 3 — Store listing assets

Before submitting to production, Play Console requires:

| Asset | Requirement | Status |
|---|---|---|
| App icon | 512×512 | ✅ `mobile/assets/icons/app-icon-1024.png` (EAS auto-generates) |
| Feature graphic | 1024×500 | ❌ Needed |
| Phone screenshots | 1–8, 9:16 (e.g. 1080×1920) | ❌ Needed — place in `images/screenshots/store/` |
| Short description | ≤ 80 chars | ❌ Needed |
| Full description | ≤ 4000 chars | ❌ Needed |
| Privacy policy URL | Required | ✅ `https://crabwatch-web.azurewebsites.net/en/privacy` |
| Content rating | Questionnaire | ❌ Complete in Play Console |
| Data safety | Questionnaire | ❌ Complete in Play Console (see below) |
| App category | Required | Suggest: **Education** or **Science & Weather** |

### Data safety form (Play Console → App content → Data safety)

Based on `APP_STORE_PRIVACY_GUIDE.md`:

| Data type | Collected? | Used for | Linked to identity? |
|---|---|---|---|
| Account data (name, email) | Yes | App functionality | Yes |
| User content (photos) | Yes | App functionality | Yes |
| Location (precise) | Yes | App functionality | No |
| Diagnostics (crash logs) | Yes | App functionality | No |

- **Advertising:** No
- **Tracking:** No
- **Encryption:** Yes (HTTPS/TLS in transit)

---

## Step 4 — Build the production AAB

```powershell
cd c:\Works\CrabWatch\mobile
npx eas-cli build --platform android --profile production --non-interactive
```

- Builds an **AAB** (Android App Bundle) — required for Play Store
- `autoIncrement: true` in `eas.json` handles the version code
- Build takes ~10–20 min
- You'll get a build ID and a download URL

> **First upload note:** The first AAB upload to Play Console establishes the **app signing key**. Google manages this key (Play App Signing). You don't need to provide a keystore — EAS handles signing.

---

## Step 5 — Submit to Google Play

```powershell
cd c:\Works\CrabWatch\mobile
npx eas-cli submit --platform android --profile production --non-interactive
```

This will:
1. Upload the AAB to the **production** track
2. Set release status to **draft** (you review in Play Console before going live)
3. You can then go to **Play Console → Production → Create release** to finalize

### Or submit a specific build:

```powershell
npx eas-cli submit --platform android --profile production --build <BUILD_ID>
```

---

## Step 6 — Review & publish in Play Console

1. Go to **Play Console → Production**
2. Review the draft release (AAB, listing, screenshots)
3. Complete any remaining **App content** sections (content rating, data safety)
4. Click **Review release** → **Start rollout to 100%** (or staged rollout)
5. Google review typically takes **1–7 days** for new apps

---

## Troubleshooting

### "targetSdkVersion must be 36"
Already fixed — `app.json` sets `targetSdkVersion: 36` via `expo-build-properties`.

### "Missing service account key"
Ensure `mobile/google-service-account.json` exists and the service account has Play Console permissions.

### "Maps tiles blank"
Add the Google Maps API key (Step 2) and rebuild.

### "App not found in Play Console"
Verify the package name `com.dsigncodehub.crabwatch` matches exactly in both `app.json` and Play Console.

### Build fails on SDK 36
If `compileSdkVersion: 36` causes issues with any dependency, try `compileSdkVersion: 35` with `targetSdkVersion: 36` (target can be higher than compile in some cases, but 36/36 is the safe default).
