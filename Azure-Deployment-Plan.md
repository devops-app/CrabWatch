# CrabWatch — Azure Deployment Plan

All three components (API, Web, Database) deployed to a single Azure resource group. No Vercel, no Terraform, no Docker.

---

## Architecture

```
Resource Group: VSES-CrabWatch-MY-RG  (location: malaysiawest)
├── PostgreSQL Flexible Server  → crabwatch-db
├── App Service Plan            → crabwatch-plan  (B1, Linux)
├── App Service (API)           → crabwatch-api   (Node 22)
├── App Service (Web)           → crabwatch-web   (Node 22)
└── Application Insights        → crabwatch-insights
```

| Component | URL | SKU | Est. Cost |
|-----------|-----|-----|-----------|
| PostgreSQL | `crabwatch-db.postgres.database.azure.com` | Basic B1ms (32 GB) | RM86/mo |
| API | `https://crabwatch-api.azurewebsites.net` | B1 (shared plan) | included |
| Web | `https://crabwatch-web.azurewebsites.net` | B1 (shared plan) | included |
| Application Insights | `crabwatch-insights` | Pay-per-use | ~$0-5 |
| **Total** | | | **~$18-23/mo** |

---

## Pre-Deployment Checklist

### 1. Install Azure CLI

```powershell
winget install Microsoft.AzureCLI
# Or: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows
```

### 2. Generate production secrets

```powershell
# JWT Secret (copy the output)
[guid]::NewGuid().ToString() + "-" + [guid]::NewGuid().ToString()

# Database password (copy the output)
[guid]::NewGuid().ToString()

# FCM VAPID Keys (for push notifications)
cd D:\demo\CrabWatch
npx web-push generate-vapid-keys
# Copy both public and private keys
```

### 3. Verify prerequisites

- [ ] Azure account with active subscription
- [ ] Azure CLI installed and logged in (`az login`)
- [ ] `az account set --subscription "YOUR-SUBSCRIPTION-ID"`
- [ ] JWT Secret generated
- [ ] Database password generated
- [ ] FCM VAPID keys generated (optional, can skip initially)
- [ ] Firebase credentials ready (already in `server/.env`)
- [ ] Azure Storage connection string ready (already in `server/.env`)
- [ ] Azure AI Foundry credentials ready (already in `server/.env`)
- [ ] Resend API key ready (already in `server/.env`)
- [ ] Mapbox token ready (already in `web/.env.local`)

---

# FIRST-TIME DEPLOYMENT

Follow Steps 1 through 9 in order.

---

## Step 1: Create Resource Group

```powershell
az group create `
  --name VSES-CrabWatch-MY-RG `
  --location malaysiawest
```

Verify:
```powershell
az group show --name VSES-CrabWatch-MY-RG --query "{name:name, location:location}"
```

---

## Step 2: PostgreSQL Database

### 2.1 Create server

Replace `YOUR-STRONG-PASSWORD` with the password you generated.

```powershell
az postgres flexible-server create `
  --name crabwatch-db `
  --resource-group VSES-CrabWatch-MY-RG `
  --location malaysiawest `
  --admin-user crabwatchadmin `
  --admin-password "YOUR-STRONG-PASSWORD" `
  --sku-name Standard_B1ms `
  --tier Basic `
  --storage-size 32
```

### 2.2 Create database

```powershell
az postgres flexible-server db create `
  --resource-group VSES-CrabWatch-MY-RG `
  --server-name crabwatch-db `
  --name crabwatch
```

### 2.3 Open firewall (temporary)

```powershell
az postgres flexible-server firewall-rule create `
  --resource-group VSES-CrabWatch-MY-RG `
  --server-name crabwatch-db `
  --name AllowAll `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 255.255.255.255
```

> **IMPORTANT:** After all components are deployed and verified, restrict this to only the App Service outbound IPs. See Step 8.1.

### 2.4 Save your connection string

```
postgresql://crabwatchadmin:YOUR-STRONG-PASSWORD@crabwatch-db.postgres.database.azure.com:5432/crabwatch?sslmode=require
```

---

## Step 3: App Service Plan

Both API and Web share one plan to save cost.

```powershell
az appservice plan create `
  --name crabwatch-plan `
  --resource-group VSES-CrabWatch-MY-RG `
  --sku B1 `
  --is-linux
```

---

## Step 4: Deploy API Server

### 4.1 Create App Service

```powershell
az webapp create `
  --name crabwatch-api `
  --resource-group VSES-CrabWatch-MY-RG `
  --plan crabwatch-plan `
  --runtime "NODE:22-LTS"
```

### 4.2 Set environment variables

Replace all `YOUR-...` placeholders. The `FIREBASE_PRIVATE_KEY` value comes from your existing `server/.env` (line 7).

```powershell
az webapp config appsettings set --name crabwatch-api --resource-group VSES-CrabWatch-MY-RG --settings `
  DATABASE_URL="postgresql://crabwatchadmin:YOUR-STRONG-PASSWORD@crabwatch-db.postgres.database.azure.com:5432/crabwatch?sslmode=require" `
  NODE_ENV="production" `
  JWT_SECRET="YOUR-JWT-SECRET-FROM-STEP-0" `
  FIREBASE_PROJECT_ID="crabwatch-495303" `
  FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@crabwatch-495303.iam.gserviceaccount.com" `
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR-FIREBASE-PRIVATE-KEY-HERE\n-----END PRIVATE KEY-----\n" `
  AZURE_STORAGE_CONNECTION_STRING="YOUR-AZURE-STORAGE-CONNECTION-STRING" `
  AZURE_STORAGE_CONTAINER="crabwatch-uploads" `
  AZURE_STORAGE_BADGE_CONTAINER="crabwatch-badges" `
  FOUNDRY_PROJECT_ENDPOINT="https://wilsontchui-5315-resource.services.ai.azure.com/api/projects/wilsontchui-5315" `
  FOUNDRY_AGENT_NAME="crab-analyzer" `
  FOUNDRY_AGENT_VERSION="3" `
  FOUNDRY_API_KEY="YOUR-FOUNDRY-API-KEY" `
  FOUNDRY_API_VERSION="2025-05-15-preview" `
  RESEND_API_KEY="YOUR-RESEND-API-KEY" `
  FRONTEND_URL="https://crabwatch-web.azurewebsites.net" `
  CORS_ORIGINS="https://crabwatch-web.azurewebsites.net" `
  FCM_VAPID_PRIVATE_KEY="YOUR-VAPID-PRIVATE-KEY" `
  FCM_VAPID_PUBLIC_KEY="YOUR-VAPID-PUBLIC-KEY" `
  ENGAGEMENT_ENABLED="true" `
  MISSIONS_ENABLED="true" `
  SEASONS_ENABLED="true" `
  CAMPAIGNS_ENABLED="true" `
  ABUSE_DETECTION_ENABLED="true" `
  SCM_DO_BUILD_DURING_DEPLOYMENT="1" `
  ORYX_NODE_COMPRESS_NODE_MODULES="" `
  SCM_BUILD_ARGS="-p compress_node_modules=false" `
  WEBSITE_NODE_DEFAULT_VERSION="22"
```

> **Engagement flags:** In production (`NODE_ENV=production`), engagement features default to `false`. Set each `*_ENABLED="true"` explicitly to turn them on. Omit or set to `"false"` to disable.

### 4.3 Build + package server

```powershell
cd D:\demo\CrabWatch

# Install all dependencies
pnpm install --frozen-lockfile

# Build shared + server
pnpm --filter=shared build
pnpm --filter=server build

# Create deployment zip (see Troubleshooting → UTF-16 for encoding fix)
Remove-Item -ErrorAction SilentlyContinue server-deploy.zip
Push-Location server
tar -a -cf ..\server-deploy.zip dist package.json prisma
Pop-Location

# Verify migration files are included
tar -tf server-deploy.zip | Select-String "migration"
```

> Do **not** include `.env` in the zip. Keep all secrets in App Service settings.
> Always use `tar` (not `Compress-Archive`) to avoid backslash path errors in Kudu rsync.

### 4.4 Deploy to Azure

```powershell
az webapp deployment source config-zip `
  --resource-group VSES-CrabWatch-MY-RG `
  --name crabwatch-api `
  --src server-deploy.zip
```

### 4.5 Run database migrations

Via Kudu Debug Console (**SSH** tab, NOT PowerShell tab):
```
https://crabwatch-api.scm.azurewebsites.net/DebugConsole
```

SSH into the container, then run:

```bash
cd /home/site/wwwroot
node /home/site/wwwroot/node_modules/prisma/build/index.js migrate deploy
```

> **IMPORTANT:** Use `node .../prisma/build/index.js` — do NOT use `npx prisma` (downloads Prisma 7.x, incompatible with `@prisma/client@5.x`). The `.bin/prisma` wrapper is a 0-byte placeholder.

### 4.6 Verify API

```powershell
curl https://crabwatch-api.azurewebsites.net/health
```

Expected: `{"status":"ok","timestamp":"2025-05-15T...Z"}`

If you get `{"status":"degraded","database":"unreachable"}`, check:
- `DATABASE_URL` is correct
- Firewall allows App Service outbound IPs
- PostgreSQL server is running

---

## Step 5: Deploy Web App

### 5.1 Create App Service

```powershell
az webapp create `
  --name crabwatch-web `
  --resource-group VSES-CrabWatch-MY-RG `
  --plan crabwatch-plan `
  --runtime "NODE:22-LTS"
```

### 5.2 Set environment variables

```powershell
az webapp config appsettings set --name crabwatch-web --resource-group VSES-CrabWatch-MY-RG --settings `
  BACKEND_URL="https://crabwatch-api.azurewebsites.net" `
  MAPBOX_TOKEN="YOUR-MAPBOX-TOKEN" `
  NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAjMgIfHNtp_8VmVyeGt2rgljA6eLKpMKQ" `
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="crabwatch-495303.firebaseapp.com" `
  NEXT_PUBLIC_FIREBASE_PROJECT_ID="crabwatch-495303" `
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="crabwatch-495303.firebasestorage.app" `
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="591932463898" `
  NEXT_PUBLIC_FIREBASE_APP_ID="1:591932463898:web:f1e1959828958d849daaa3" `
  NEXT_PUBLIC_FCM_VAPID_KEY="YOUR-VAPID-PUBLIC-KEY" `
  NODE_ENV="production" `
  SCM_DO_BUILD_DURING_DEPLOYMENT="false" `
  ENABLE_ORYX_BUILD="false" `
  WEBSITE_NODE_DEFAULT_VERSION="22"
```

Set startup command once:

```powershell
az webapp config set --name crabwatch-web --resource-group VSES-CrabWatch-MY-RG --startup-file "npm start"
```

### 5.3 Build + package web

```powershell
cd D:\demo\CrabWatch

# Build shared first (web depends on it)
pnpm --filter=shared build

# Force clean Next.js build output
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue web\.next

# Set production backend URL before build (rewrites are baked into .next)
$env:BACKEND_URL="https://crabwatch-api.azurewebsites.net"

# Build web
pnpm --filter=web build

# Package runtime folder with real npm node_modules (avoids PNPM symlink issues)
$runtime = "C:\Users\Wilson\AppData\Local\Temp\opencode\web-runtime"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $runtime
New-Item -ItemType Directory -Path $runtime | Out-Null

Copy-Item -Recurse -Force web\.next "$runtime\.next"
Copy-Item -Recurse -Force web\public "$runtime\public"
Copy-Item -Force web\package.json "$runtime\package.json"
Copy-Item -Force web\next.config.mjs "$runtime\next.config.mjs"

Push-Location $runtime
npm install --omit=dev
Pop-Location

Remove-Item -ErrorAction SilentlyContinue web-deploy.zip
Push-Location $runtime
tar -a -cf D:\demo\CrabWatch\web-deploy.zip *
Pop-Location

# Verify zip contents
tar -tf web-deploy.zip | Select-Object -First 10
```

### 5.4 Deploy to Azure

```powershell
az webapp deployment source config-zip `
  --resource-group VSES-CrabWatch-MY-RG `
  --name crabwatch-web `
  --src "D:\demo\CrabWatch\web-deploy.zip"

az webapp restart --resource-group VSES-CrabWatch-MY-RG --name crabwatch-web
```

### 5.5 Verify Web

```powershell
curl https://crabwatch-web.azurewebsites.net/auth/login
```

Expected: HTML response with login page content.

Open in browser: **https://crabwatch-web.azurewebsites.net**

---

## Step 6: Deploy Mobile (Expo EAS)

### 6.1 Initialize EAS project

```powershell
cd D:\demo\CrabWatch\mobile

# Login to Expo
npx eas-cli login

# Initialize project (creates eas.projectId in app.json)
npx eas-cli init
```

### 6.2 Build Android

```powershell
# Build runs in Expo cloud (~10-15 minutes)
npx eas-cli build --platform android --profile production

# Build APK for internal testing (faster, no Play Store required)
npx eas-cli build --platform android --profile preview
```

> **Note:** `eas.json` must have `"image": "ubuntu-22.04-ndk"` for Android builds. Without it, EAS uses Node 18 + pnpm 8.x which will fail with `ERR_PNPM_UNSUPPORTED_ENGINE` (your project requires Node 20+ and pnpm 10+).

### 6.3 Build iOS (requires Apple Developer account)

```powershell
# Requires: macOS or EAS Build, Apple Developer membership ($99/year)
npx eas-cli build --platform ios --profile production
```

If you don't have an Apple Developer account yet, skip iOS and deploy Android first.

### 6.4 Submit to stores (optional)

```powershell
# After build completes
npx eas-cli submit --platform android
npx eas-cli submit --platform ios
```

Or download the `.apk` / `.aab` / `.ipa` from the Expo dashboard and upload manually.

---

## Step 7: Create Admin User

Two options — pick one:

### Option A: Register via web (recommended)

1. Open **https://crabwatch-web.azurewebsites.net/auth/register**
2. Register your account
3. Promote to ADMIN via database:

```powershell
# Connect to Azure PostgreSQL via Azure Data Studio or psql
# Then run:
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

### Option B: Run seed script

```bash
# Via Kudu SSH (NOT PowerShell tab!):
cd /home/site/wwwroot
node /home/site/wwwroot/node_modules/prisma/build/index.js generate
npx tsx prisma/seed.ts
```

> **Note:** `tsx` may not be available in production (devDependency). If it fails, use Option A.

Seed creates:
- `admin@crabwatch.my` (ADMIN)
- `researcher@crabwatch.my` (RESEARCHER)
- `citizen@crabwatch.my` (USER)

All with password from `SEED_PASSWORD` env var (default: `Pa55w.rd`).

---

## Step 8: Post-Deployment Security

### 8.1 Restrict database firewall

Remove the `AllowAll` rule and add only App Service outbound IPs:

```powershell
# Remove temporary rule
az postgres flexible-server firewall-rule delete `
  --resource-group VSES-CrabWatch-MY-RG `
  --server-name crabwatch-db `
  --name AllowAll

# Get App Service outbound IPs
az webapp show `
  --resource-group VSES-CrabWatch-MY-RG `
  --name crabwatch-api `
  --query outboundIpAddresses `
  --output tsv

# Add each IP (or IP range) as a firewall rule
az postgres flexible-server firewall-rule create `
  --resource-group VSES-CrabWatch-MY-RG `
  --server-name crabwatch-db `
  --name "app-service-1" `
  --start-ip-address "X.X.X.X" `
  --end-ip-address "X.X.X.X"
```

### 8.2 Verify HTTPS is enforced

Both App Services have free Azure-managed TLS certificates by default. Verify:

```powershell
# Should redirect HTTP → HTTPS
curl -I http://crabwatch-api.azurewebsites.net
curl -I http://crabwatch-web.azurewebsites.net
```

### 8.3 Enable Application Insights (required)

```powershell
# Create Application Insights
az monitor app-insights component create `
  --app crabwatch-insights `
  --location malaysiawest `
  --resource-group VSES-CrabWatch-MY-RG

# Get the connection string
$INSIGHTS_CS = az monitor app-insights component show `
  --app crabwatch-insights `
  --resource-group VSES-CrabWatch-MY-RG `
  --query connectionString --output tsv

# Enable on API app
az webapp application-insights set `
  --name crabwatch-api `
  --resource-group VSES-CrabWatch-MY-RG `
  --app-insights crabwatch-insights

az webapp config appsettings set `
  --name crabwatch-api `
  --resource-group VSES-CrabWatch-MY-RG `
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="$INSIGHTS_CS"

# Enable on Web app
az webapp application-insights set `
  --name crabwatch-web `
  --resource-group VSES-CrabWatch-MY-RG `
  --app-insights crabwatch-insights

az webapp config appsettings set `
  --name crabwatch-web `
  --resource-group VSES-CrabWatch-MY-RG `
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="$INSIGHTS_CS"
```

---

## Step 9: Verify Everything

| Check | Command | Expected |
|-------|---------|----------|
| API health | `curl https://crabwatch-api.azurewebsites.net/health` | `{"status":"ok"}` |
| Web loads | Open `https://crabwatch-web.azurewebsites.net` | Login page |
| Login works | Login with admin credentials | Dashboard loads |
| API ↔ Web | Submit an observation via web | No CORS errors in browser console |
| Species list | `curl https://crabwatch-api.azurewebsites.net/api/v1/species` | JSON array (no auth needed) |
| AI analysis | Capture photo via mobile/web | Analysis completes |
| Email flow | Trigger password reset | Email arrives (check Resend dashboard) |

---

# SUBSEQUENT DEPLOYMENT (Upgrade)

Run only what changed. All steps assume resources already exist.

---

## Upgrade API Server

```powershell
cd D:\demo\CrabWatch
pnpm --filter=shared build
pnpm --filter=server build

Remove-Item -ErrorAction SilentlyContinue server-deploy.zip
Push-Location server
tar -a -cf ..\server-deploy.zip dist package.json prisma
Pop-Location

az webapp deployment source config-zip --resource-group VSES-CrabWatch-MY-RG --name crabwatch-api --src server-deploy.zip
```

**If you changed the Prisma schema**, run migrations after deploy (Kudu SSH):
```bash
cd /home/site/wwwroot
node /home/site/wwwroot/node_modules/prisma/build/index.js migrate deploy
```

**If you added new env vars**, update app settings:
```powershell
az webapp config appsettings set --name crabwatch-api --resource-group VSES-CrabWatch-MY-RG --settings NEW_VAR="value"
```

## Upgrade Web App

```powershell
cd D:\demo\CrabWatch
pnpm --filter=shared build
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue web\.next
$env:BACKEND_URL="https://crabwatch-api.azurewebsites.net"
pnpm --filter=web build

$runtime = "C:\Users\Wilson\AppData\Local\Temp\opencode\web-runtime"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $runtime
New-Item -ItemType Directory -Path $runtime | Out-Null

Copy-Item -Recurse -Force web\.next "$runtime\.next"
Copy-Item -Recurse -Force web\public "$runtime\public"
Copy-Item -Force web\package.json "$runtime\package.json"
Copy-Item -Force web\next.config.mjs "$runtime\next.config.mjs"

Push-Location $runtime
npm install --omit=dev
tar -a -cf D:\demo\CrabWatch\web-deploy.zip *
Pop-Location

az webapp deployment source config-zip --resource-group VSES-CrabWatch-MY-RG --name crabwatch-web --src "D:\demo\CrabWatch\web-deploy.zip"
az webapp restart --resource-group VSES-CrabWatch-MY-RG --name crabwatch-web
```

## Upgrade Mobile

```powershell
cd D:\demo\CrabWatch\mobile
npx eas-cli build --platform android --profile production
```

## Upgrade Checklist

Before deploying, check if you need to:

- [ ] Run `pnpm --filter=shared build` (always rebuild shared)
- [ ] Run `prisma migrate deploy` (if schema changed)
- [ ] Update App Service env vars (if new config added)
- [ ] Rebuild web with clean `.next` (if routes/rewrites changed)
- [ ] Restart web app after deploy (always restart after web deploy)

---

# TROUBLESHOOTING

### App Service starts but returns 500

```powershell
# Check logs
az webapp log tail --name crabwatch-api --resource-group VSES-CrabWatch-MY-RG

# Check app settings
az webapp config appsettings list --name crabwatch-api --resource-group VSES-CrabWatch-MY-RG --output table
```

### CORS errors in browser

Verify `CORS_ORIGINS` on the API includes the web URL:
```powershell
az webapp config appsettings list --name crabwatch-api --resource-group VSES-CrabWatch-MY-RG --query "[?name=='CORS_ORIGINS']"
```

### Database connection fails

1. Check firewall rule includes App Service outbound IPs
2. Verify `DATABASE_URL` has `?sslmode=require`
3. Check PostgreSQL server status:
```powershell
az postgres flexible-server show --name crabwatch-db --resource-group VSES-CrabWatch-MY-RG --query state
```

### `P3015: Could not find migration file` or `P3009: failed migrations`

**Most common cause: UTF-16 encoding from Windows.**

PowerShell's `tar` can preserve Windows UTF-16 LE encoding. Prisma on Linux expects UTF-8.

**Prevent on Windows (before zipping):**
```powershell
$files = Get-ChildItem -Path server\prisma\migrations -Recurse -Include *.sql,*.toml
foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
        $text = [System.IO.File]::ReadAllText($f.FullName)
        $utf8 = [System.Text.Encoding]::UTF8
        [System.IO.File]::WriteAllText($f.FullName, $text, $utf8)
        Write-Host "Converted $($f.Name) to UTF-8"
    }
}
```

**Fix on server (one-time):**
```bash
cd /home/site/wwwroot
node -e "const fs=require('fs'); let text=fs.readFileSync('prisma/migrations/init/migration.sql','utf8'); text=text.replace(/^\uFEFF/,''); fs.writeFileSync('prisma/migrations/init/migration.sql', text)"
node /home/site/wwwroot/node_modules/prisma/build/index.js migrate reset --force
node /home/site/wwwroot/node_modules/prisma/build/index.js migrate deploy
```

**Alternative:** Use Git to ensure UTF-8 encoding:
```powershell
git add server/prisma/migrations/
git checkout server/prisma/migrations/
```

### `prisma migrate deploy` fails — use `node` directly

The `.bin/prisma` wrapper is a 0-byte placeholder. Always run:
```bash
node /home/site/wwwroot/node_modules/prisma/build/index.js migrate deploy
```

**Do NOT use `npx prisma`** — it downloads the latest Prisma CLI (7.x) which is incompatible with `@prisma/client@5.x`.

### Web loads blank or calls a local/LAN API URL

Most common cause: stale `.next` output built with a local `BACKEND_URL`.

Fix before creating `web-deploy.zip`:
```powershell
cd D:\demo\CrabWatch
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue web\.next
$env:BACKEND_URL="https://crabwatch-api.azurewebsites.net"
pnpm --filter=web build
```

Verify the built rewrite target (must be Azure API URL):
```powershell
Select-String -Path web\.next\required-server-files.json -Pattern '"destination"'
```

### Web startup fails with `Cannot find module 'styled-jsx/package.json'`

Caused by PNPM symlinked `node_modules` layout mismatch in App Service Linux.
Use Step 5.3 packaging exactly (`npm install --omit=dev` inside temp runtime folder) so zip contains real npm dependency tree.

### Next.js build fails on Azure

For the runtime zip approach, Azure should **not** run Oryx build for web. Verify:

```powershell
az webapp config appsettings list --name crabwatch-web --resource-group VSES-CrabWatch-MY-RG --query "[?name=='SCM_DO_BUILD_DURING_DEPLOYMENT' || name=='ENABLE_ORYX_BUILD']"
```

Both should be `false`. If Oryx still runs and fails with `Couldn't find any pages or app directory`, keep Oryx disabled and redeploy the runtime package from Step 5.3.

### `node_modules.tar.gz` in `~/site/wwwroot`

Oryx creates `node_modules.tar.gz` as a compressed backup. The working `node_modules/` is a symlink to `/node_modules`. **Do NOT extract the `.tar.gz`** — it produces 0-byte binary files.

**Permanent fix:** `ORYX_NODE_COMPRESS_NODE_MODULES=""` in app settings (Step 4.2) prevents the archive from being created.

### Kudu rsync fails with backslash path errors

When deploying from Windows, PowerShell's `Compress-Archive` creates paths with backslashes that Kudu's rsync cannot parse. Always use `tar`:

```powershell
tar -a -cf server-deploy.zip dist package.json prisma
```

### EAS build fails — pnpm lockfile version mismatch or engine error

Error: `ERR_PNPM_UNSUPPORTED_ENGINE` or `ERR_PNPM_NO_LOCKFILE`

EAS uses Node 18 + pnpm 8.x but your project requires Node 20+ and pnpm 10+.

**Fix 1 — Set build image (recommended):** In `mobile/eas.json`, add `"image": "ubuntu-22.04-ndk"` to each build profile's `android` section.

**Fix 2 — Specify pnpm version:** Add `packageManager` to root `package.json`:
```json
{ "packageManager": "pnpm@10.33.2" }
```

### EAS build fails — `Cannot find module 'babel-preset-expo'`

Ensure `babel-preset-expo` is in `mobile/package.json` dependencies. Run `pnpm install` and commit the updated `pnpm-lock.yaml` before triggering the build.

### Engagement endpoints return 401 after login

The engagement routes require `resolveUser` middleware to set `req.dbUser`. Verify `engagementRoutes.ts` has:
```typescript
router.use(authMiddleware)
router.use(requireAuth)
router.use(resolveUser)
```

### Engagement features disabled in production

In `NODE_ENV=production`, engagement defaults to `false`. Set the env vars explicitly:
```
ENGAGEMENT_ENABLED=true
MISSIONS_ENABLED=true
SEASONS_ENABLED=true
CAMPAIGNS_ENABLED=true
ABUSE_DETECTION_ENABLED=true
```

---

# REFERENCES

## Cost Summary

| Resource | SKU | Monthly Cost |
|----------|-----|-------------|
| PostgreSQL Flexible Server | Basic B1ms, 32 GB | ~$5 |
| App Service Plan (shared by API + Web) | B1 | ~$13 |
| Application Insights (required) | Pay-per-use | ~$0-5 |
| Storage Account (existing) | Standard LRS | ~$0.50 |
| Azure AI Foundry | Pay-per-call | ~$1-5 |
| Resend | Free tier | $0 (3k emails/mo) |
| Firebase | Free tier | $0 |
| **Total** | | **~$20-25/mo** |

---

## Environment Variables Reference

### API (`crabwatch-api`)

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Azure PostgreSQL conn string | `?sslmode=require` |
| `NODE_ENV` | `production` | |
| `JWT_SECRET` | Generated (Pre-Deploy) | |
| `FIREBASE_*` | Firebase console | project, client email, private key |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Portal | |
| `AZURE_STORAGE_CONTAINER` | `crabwatch-uploads` | Photo uploads |
| `AZURE_STORAGE_BADGE_CONTAINER` | `crabwatch-badges` | Badge images |
| `FOUNDRY_*` | Azure AI Foundry | project endpoint, agent name/version, API key, API version |
| `RESEND_API_KEY` | Resend dashboard | |
| `FRONTEND_URL` | `https://crabwatch-web.azurewebsites.net` | |
| `CORS_ORIGINS` | `https://crabwatch-web.azurewebsites.net` | |
| `FCM_VAPID_*` | Generated (Pre-Deploy) | private + public key |
| `ENGAGEMENT_ENABLED` | `true` | Master toggle |
| `MISSIONS_ENABLED` | `true` | Daily/weekly missions |
| `SEASONS_ENABLED` | `true` | Seasonal leaderboards |
| `CAMPAIGNS_ENABLED` | `true` | Campaign system |
| `ABUSE_DETECTION_ENABLED` | `true` | Anti-abuse detection |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights component | Step 8.3 |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `1` | Oryx build for API |
| `ORYX_NODE_COMPRESS_NODE_MODULES` | (empty) | Prevent .tar.gz |
| `WEBSITE_NODE_DEFAULT_VERSION` | `22` | |

### Web (`crabwatch-web`)

| Variable | Value | Notes |
|----------|-------|-------|
| `BACKEND_URL` | `https://crabwatch-api.azurewebsites.net` | Baked into `.next` at build time |
| `MAPBOX_TOKEN` | Mapbox dashboard | |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase console | |
| `NEXT_PUBLIC_FCM_VAPID_KEY` | Generated (Pre-Deploy) | |
| `NODE_ENV` | `production` | |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | No Oryx build |
| `ENABLE_ORYX_BUILD` | `false` | No Oryx build |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights component | Step 8.3 |
| `WEBSITE_NODE_DEFAULT_VERSION` | `22` | |

### Mobile (EAS Build)

| Variable | Source | Set In |
|----------|--------|--------|
| `EXPO_PUBLIC_API_URL` | — | `eas.json` → `build.production.env` |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase console | `eas.json` → `build.production.env` |

---

## Quick Commands

```powershell
# Check API logs
az webapp log tail --name crabwatch-api --resource-group VSES-CrabWatch-MY-RG

# Check Web logs
az webapp log tail --name crabwatch-web --resource-group VSES-CrabWatch-MY-RG

# List API env vars
az webapp config appsettings list --name crabwatch-api --resource-group VSES-CrabWatch-MY-RG --output table

# List Web env vars
az webapp config appsettings list --name crabwatch-web --resource-group VSES-CrabWatch-MY-RG --output table

# Restart API
az webapp restart --resource-group VSES-CrabWatch-MY-RG --name crabwatch-api

# Restart Web
az webapp restart --resource-group VSES-CrabWatch-MY-RG --name crabwatch-web

# Check PostgreSQL status
az postgres flexible-server show --name crabwatch-db --resource-group VSES-CrabWatch-MY-RG --query state

# Get App Service outbound IPs (for firewall)
az webapp show --resource-group VSES-CrabWatch-MY-RG --name crabwatch-api --query outboundIpAddresses --output tsv
```
