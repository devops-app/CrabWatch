# CrabWatch — Azure Deployment Plan

All three components (API, Web, Database) deployed to a single Azure resource group. No Vercel, no Terraform, no Docker.

---

## Architecture

```
Resource Group: crabwatch-prod  (location: southeastasia)
├── PostgreSQL Flexible Server  → crabwatch-db
├── App Service Plan            → crabwatch-plan  (B1, Linux)
├── App Service (API)           → crabwatch-api   (Node 18)
└── App Service (Web)           → crabwatch-web   (Node 18)
```

| Component | URL | SKU | Est. Cost |
|-----------|-----|-----|-----------|
| PostgreSQL | `crabwatch-db.postgres.database.azure.com` | Basic B1ms (32 GB) | ~$5/mo |
| API | `https://crabwatch-api.azurewebsites.net` | B1 (shared plan) | included |
| Web | `https://crabwatch-web.azurewebsites.net` | B1 (shared plan) | included |
| **Total** | | | **~$18/mo** |

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
-pnp "system"; [guid]::NewGuid().ToString() + "-" + [guid]::NewGuid().ToString()

# Database password (copy the output)
-pnp "system"; [guid]::NewGuid().ToString()

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

## Step 1: Create Resource Group

```powershell
az group create `
  --name crabwatch-prod `
  --location southeastasia
```

Verify:
```powershell
az group show --name crabwatch-prod --query "{name:name, location:location}"
```

---

## Step 2: PostgreSQL Database

### 2.1 Create server

Replace `YOUR-STRONG-PASSWORD` with the password you generated.

```powershell
az postgres flexible-server create `
  --name crabwatch-db `
  --resource-group crabwatch-prod `
  --location southeastasia `
  --admin-user crabwatchadmin `
  --admin-password "YOUR-STRONG-PASSWORD" `
  --sku-name Standard_B1ms `
  --tier Basic `
  --storage-size 32
```

### 2.2 Create database

```powershell
az postgres flexible-server db create `
  --resource-group crabwatch-prod `
  --server-name crabwatch-db `
  --name crabwatch
```

### 2.3 Open firewall (temporary)

```powershell
az postgres flexible-server firewall-rule create `
  --resource-group crabwatch-prod `
  --server-name crabwatch-db `
  --name AllowAll `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 255.255.255.255
```

> **IMPORTANT:** After all components are deployed and verified, restrict this to only the App Service outbound IPs. See Step 6.

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
  --resource-group crabwatch-prod `
  --sku B1 `
  --is-linux
```

---

## Step 4: Deploy API Server

### 4.1 Create App Service

```powershell
az webapp create `
  --name crabwatch-api `
  --resource-group crabwatch-prod `
  --plan crabwatch-plan `
  --runtime "NODE:18-LTS"
```

### 4.2 Set environment variables

Replace all `YOUR-...` placeholders. The `FIREBASE_PRIVATE_KEY` value comes from your existing `server/.env` (line 7).

```powershell
az webapp config appsettings set --name crabwatch-api --resource-group crabwatch-prod --settings `
  DATABASE_URL="postgresql://crabwatchadmin:YOUR-STRONG-PASSWORD@crabwatch-db.postgres.database.azure.com:5432/crabwatch?sslmode=require" `
  NODE_ENV="production" `
  JWT_SECRET="YOUR-JWT-SECRET-FROM-STEP-0" `
  PORT="3001" `
  FIREBASE_PROJECT_ID="crabwatch-495303" `
  FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@crabwatch-495303.iam.gserviceaccount.com" `
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR-FIREBASE-PRIVATE-KEY-HERE\n-----END PRIVATE KEY-----\n" `
  AZURE_STORAGE_CONNECTION_STRING="YOUR-AZURE-STORAGE-CONNECTION-STRING" `
  AZURE_STORAGE_CONTAINER="crabwatch-uploads" `
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
  SCM_DO_BUILD_DURING_DEPLOYMENT="false" `
  WEBSITE_NODE_DEFAULT_VERSION="18"
```

### 4.3 Build locally

```powershell
cd D:\demo\CrabWatch

# Install all dependencies
pnpm install --frozen-lockfile

# Build shared + server
pnpm --filter=shared build
pnpm --filter=server build
```

### 4.4 Create deployment package

The server `tsconfig.json` compiles `src/` + `../shared/src` into `dist/`. The runtime needs:
- `dist/` — compiled JavaScript
- `node_modules/` — runtime dependencies (express, prisma, etc.)
- `package.json` — for `node start` command
- `prisma/` — schema + migrations

```powershell
# Remove old zip if exists
Remove-Item -ErrorAction SilentlyContinue server-deploy.zip

# Create zip with all required files
Compress-Archive -Path `
  server\dist, `
  server\node_modules, `
  server\package.json, `
  server\prisma `
  -DestinationPath server-deploy.zip -Force
```

### 4.5 Deploy to Azure

```powershell
az webapp deployment source config-zip `
  --resource-group crabwatch-prod `
  --name crabwatch-api `
  --src server-deploy.zip
```

### 4.6 Run database migrations

Open the Kudu console in your browser:
```
https://crabwatch-api.scm.azurewebsites.net/DebugConsole
```

1. Navigate to `site\wwwroot`
2. Open PowerShell tab
3. Run:
```powershell
npx prisma migrate deploy
```

### 4.7 Verify API

```powershell
curl https://crabwatch-api.azurewebsites.net/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-05-15T...Z"}
```

If you get `{"status":"degraded","database":"unreachable"}`, check:
- DATABASE_URL is correct
- Firewall allows App Service outbound IPs
- PostgreSQL server is running

---

## Step 5: Deploy Web App

### 5.1 Create App Service

```powershell
az webapp create `
  --name crabwatch-web `
  --resource-group crabwatch-prod `
  --plan crabwatch-plan `
  --runtime "NODE:18-LTS"
```

### 5.2 Set environment variables

```powershell
az webapp config appsettings set --name crabwatch-web --resource-group crabwatch-prod --settings `
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
  WEBSITE_NODE_DEFAULT_VERSION="18"
```

### 5.3 Build locally

```powershell
cd D:\demo\CrabWatch

# Build shared first (web depends on it)
pnpm --filter=shared build

# Build web (produces .next/ output)
pnpm --filter=web build
```

### 5.4 Create deployment package

```powershell
Remove-Item -ErrorAction SilentlyContinue web-deploy.zip

Compress-Archive -Path `
  web\.next, `
  web\node_modules, `
  web\package.json, `
  web\public, `
  web\next.config.mjs `
  -DestinationPath web-deploy.zip -Force
```

### 5.5 Deploy to Azure

```powershell
az webapp deployment source config-zip `
  --resource-group crabwatch-prod `
  --name crabwatch-web `
  --src web-deploy.zip
```

### 5.6 Verify Web

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

```powershell
# Via Kudu console (https://crabwatch-api.scm.azurewebsites.net/DebugConsole)
# Navigate to site\wwwroot, open PowerShell:
node -e "require('./dist/prisma/seed').default()"
```

Seed creates:
- `admin@crabwatch.my` (ADMIN)
- `researcher@crabwatch.my` (RESEARCHER)
- `citizen@crabwatch.my` (USER)

All with password from `SEED_PASSWORD` env var (default: `SeedPassword2026!Secure`).

---

## Step 8: Post-Deployment Security

### 8.1 Restrict database firewall

Remove the `AllowAll` rule and add only App Service outbound IPs:

```powershell
# Remove temporary rule
az postgres flexible-server firewall-rule delete `
  --resource-group crabwatch-prod `
  --server-name crabwatch-db `
  --name AllowAll

# Get App Service outbound IPs
az webapp show `
  --resource-group crabwatch-prod `
  --name crabwatch-api `
  --query outboundIpAddresses `
  --output tsv

# Add each IP (or IP range) as a firewall rule
az postgres flexible-server firewall-rule create `
  --resource-group crabwatch-prod `
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

### 8.3 Enable Application Insights (optional)

```powershell
# Create Application Insights
az monitor app-insights component create `
  --app crabwatch-insights `
  --location southeastasia `
  --resource-group crabwatch-prod

# Enable on both apps
az webapp application-insights set `
  --name crabwatch-api `
  --resource-group crabwatch-prod `
  --app-insights crabwatch-insights

az webapp application-insights set `
  --name crabwatch-web `
  --resource-group crabwatch-prod `
  --app-insights crabwatch-insights
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

## Re-Deployment (After Code Changes)

### API Server

```powershell
cd D:\demo\CrabWatch
pnpm --filter=shared build
pnpm --filter=server build

Compress-Archive -Path server\dist,server\node_modules,server\package.json,server\prisma -DestinationPath server-deploy.zip -Force

az webapp deployment source config-zip --resource-group crabwatch-prod --name crabwatch-api --src server-deploy.zip
```

If you changed the Prisma schema, run migrations after deploy:
```powershell
# Via Kudu console
npx prisma migrate deploy
```

### Web App

```powershell
cd D:\demo\CrabWatch
pnpm --filter=shared build
pnpm --filter=web build

Compress-Archive -Path web\.next,web\node_modules,web\package.json,web\public,web\next.config.mjs -DestinationPath web-deploy.zip -Force

az webapp deployment source config-zip --resource-group crabwatch-prod --name crabwatch-web --src web-deploy.zip
```

### Mobile

```powershell
cd D:\demo\CrabWatch\mobile
npx eas-cli build --platform android --profile production
```

---

## Troubleshooting

### App Service starts but returns 500

```powershell
# Check logs
az webapp log tail --name crabwatch-api --resource-group crabwatch-prod

# Check app settings
az webapp config appsettings list --name crabwatch-api --resource-group crabwatch-prod --output table
```

### CORS errors in browser

Verify `CORS_ORIGINS` on the API includes the web URL:
```powershell
az webapp config appsettings list --name crabwatch-api --resource-group crabwatch-prod --query "[?name=='CORS_ORIGINS']"
```

### Database connection fails

1. Check firewall rule includes App Service outbound IPs
2. Verify `DATABASE_URL` has `?sslmode=require`
3. Check PostgreSQL server status:
```powershell
az postgres flexible-server show --name crabwatch-db --resource-group crabwatch-prod --query state
```

### Next.js build fails on Azure

The web app is built **locally** before zip deploy. Azure only runs `next start`. If you see "Cannot find module", verify the `.next/` folder is included in the zip.

### EAS build fails

```powershell
# Check build logs
npx eas-cli build:list

# Rebuild with verbose output
npx eas-cli build --platform android --profile production --non-interactive
```

---

## Cost Summary

| Resource | SKU | Monthly Cost |
|----------|-----|-------------|
| PostgreSQL Flexible Server | Basic B1ms, 32 GB | ~$5 |
| App Service Plan (shared by API + Web) | B1 | ~$13 |
| Application Insights (optional) | Pay-per-use | ~$0-5 |
| Storage Account (existing) | Standard LRS | ~$0.50 |
| Azure AI Foundry | Pay-per-call | ~$1-5 |
| Resend | Free tier | $0 (3k emails/mo) |
| Firebase | Free tier | $0 |
| **Total** | | **~$20-25/mo** |

---

## Environment Variables Reference

### API (`crabwatch-api`)

| Variable | Source | Set In |
|----------|--------|--------|
| `DATABASE_URL` | Azure PostgreSQL | App Service config |
| `NODE_ENV` | — | `production` |
| `JWT_SECRET` | Generated (Step 0) | App Service config |
| `PORT` | — | `3001` |
| `FIREBASE_*` | Firebase console | App Service config |
| `AZURE_STORAGE_*` | Azure Portal | App Service config |
| `FOUNDRY_*` | Azure AI Foundry | App Service config |
| `RESEND_API_KEY` | Resend dashboard | App Service config |
| `FRONTEND_URL` | — | `https://crabwatch-web.azurewebsites.net` |
| `CORS_ORIGINS` | — | `https://crabwatch-web.azurewebsites.net` |
| `FCM_VAPID_*` | Generated (Step 0) | App Service config |

### Web (`crabwatch-web`)

| Variable | Source | Set In |
|----------|--------|--------|
| `BACKEND_URL` | — | `https://crabwatch-api.azurewebsites.net` |
| `MAPBOX_TOKEN` | Mapbox dashboard | App Service config |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase console | App Service config |
| `NEXT_PUBLIC_FCM_VAPID_KEY` | Generated (Step 0) | App Service config |

### Mobile (EAS Build)

| Variable | Source | Set In |
|----------|--------|--------|
| `EXPO_PUBLIC_API_URL` | — | `eas.json` → `build.production.env` |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase console | `eas.json` → `build.production.env` |
