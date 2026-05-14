# CrabWatch — Crab Conservation Platform

Citizen science platform for tracking and analyzing crab observations in Malaysia. Features AI-guided photo capture with dynamic species detection via GPT-4o Vision.

## Architecture

```
CrabWatch/
├── shared/          # Shared TypeScript types, constants, and utilities
├── server/          # Express.js API server with Prisma ORM
├── web/             # Next.js web application (App Router)
├── mobile/          # React Native mobile app (Expo)
└── infrastructure/  # Terraform configs, Azure Functions, CI/CD
```

## Tech Stack

| Layer    | Technologies                                                      |
| -------- | ----------------------------------------------------------------- |
| **Shared** | TypeScript, Zod validation schemas                              |
| **Server** | Express.js, Prisma ORM, PostgreSQL, Firebase Admin SDK, JWT    |
| **Web**    | Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS     |
| **Mobile** | React Native, Expo SDK 54, TypeScript, Zustand, React 19        |
| **AI**     | Azure AI Foundry, GPT-4o Vision, Azure Blob Storage             |
| **Infra**  | Terraform, GitHub Actions                                       |

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL 15+ (local or Docker)
- Docker (optional, for local database)
- Expo Go for SDK 54 (mobile testing)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the database

**Option A: Docker (recommended for local dev)**

```bash
docker run -d --name my-postgres -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 postgres:15

# Create the database
docker exec -i my-postgres psql -U postgres -c "CREATE DATABASE crabwatch;"
```

**Option B: Local PostgreSQL**

```bash
createdb crabwatch
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Update `server/.env` with your database URL:

```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/crabwatch?schema=public"
PORT=3001
JWT_SECRET="development-secret-change-in-production"
```

> **Firebase & Azure**: Firebase is configured for project `crabwatch-495303`. Leave Azure placeholders for local dev. The server uses JWT fallback when Firebase credentials are not configured.

### 4. Generate Prisma client & seed database

```bash
# Generate Prisma client
node server/node_modules/prisma/build/index.js generate --schema=server/prisma/schema.prisma

# Push schema to database
npx prisma db push --schema=server/prisma/schema.prisma

# Seed with sample data
tsx server/prisma/seed.ts
```

### 5. Start development servers

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:server   # API on :3001
pnpm dev:web      # Next.js on :3000
pnpm dev:mobile   # Expo on :8081
```

## Testing

### Manual API Testing

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crabwatch.my","password":"SeedPassword2026!Secure"}'

# Get species (public endpoint)
curl http://localhost:3001/api/v1/species

# Get observations (requires auth token)
curl http://localhost:3001/api/v1/observations \
  -H "Authorization: Bearer <your_token>"

# Get dashboard stats (RESEARCHER/ADMIN only)
curl http://localhost:3001/api/v1/analytics/stats \
  -H "Authorization: Bearer <your_token>"

# Register new user
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"New User","email":"new@example.com","password":"pass123"}'

# Upload photos for AI analysis
curl -X POST http://localhost:3001/api/v1/analyze/upload \
  -H "Authorization: Bearer <your_token>" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg"

# Analyze crab photos
curl -X POST http://localhost:3001/api/v1/analyze/crab \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"photoUrls":["<blob_url_1>","<blob_url_2>"],"views":["dorsal","ventral"]}'
```

### Seed Credentials

All users share the same seed password (set via `SEED_PASSWORD` env var, default: `SeedPassword2026!Secure`):

| Email                      | Role        |
| -------------------------- | ----------- |
| `admin@crabwatch.my`       | ADMIN       |
| `researcher@crabwatch.my`  | RESEARCHER  |
| `citizen@crabwatch.my`     | USER        |

### Seed Data

The seed script creates:
- 3 users (admin, researcher, user)
- 4 species (Scylla serrata, S. paramamosain, S. olivacea, S. tranquebarica)
- 3 sample observations

**Note:** Species are dynamically managed. The AI can identify mud crabs (Scylla spp.) and swimming crabs (Portunus, Charybdis), and unknown species are auto-created in the database. The seed species serve as initial reference data.

### Web App Testing

1. Open `http://localhost:3000`
2. Navigate to `/auth/login`
3. Login with seed credentials above
4. Access dashboard based on role:
   - **ADMIN**: `/dashboard/admin` — Manage users, species, invites, backups
   - **RESEARCHER**: `/dashboard/researcher` — Validate observations, view analytics
   - **USER**: `/dashboard` — Submit observations, view public data

### Mobile App Testing

1. Ensure **Expo Go** is installed for **SDK 54** (iOS App Store / Android Play Store)
2. Run `pnpm dev:mobile`
3. Scan QR code with Expo Go (iOS: use Camera app, Android: scan directly in Expo Go)
4. Login with seed credentials
5. Test AI-Guided Capture: tap "New" tab → select coin series → capture dorsal/ventral photos → AI analysis → review & submit

If mobile startup fails after config or dependency changes, clear Metro cache:

```bash
pnpm --filter=@crabwatch/mobile exec expo start --clear
```

If you hit `App entry not found`, verify:
- `mobile/package.json` has `"main": "index.js"`
- `mobile/app.json` has `"entryPoint": "./index.js"`
- `mobile/index.js` registers the app with `registerRootComponent(App)`

### Automated Checks

```bash
# Type check all packages
pnpm -r typecheck

# Lint all packages
pnpm -r lint

# Fix lint issues
pnpm -r lint:fix
```

### Automated Tests

```bash
# Run all tests (shared + server + web + mobile)
pnpm -r test

# Run tests with coverage
pnpm -r test:coverage

# Run tests in watch mode (development)
pnpm -r test:watch

# Run tests for a specific package
pnpm --filter=shared test
pnpm --filter=server test
pnpm --filter=web test
pnpm --filter=mobile test

# Run E2E tests (requires dev servers running)
pnpm test:e2e         # Run all E2E tests
pnpm test:e2e:ui      # Run with Playwright UI mode
pnpm test:e2e:headed  # Run with visible browser
```

**Test Summary** (587 unit/integration tests + 60 E2E tests, all passing):

| Package  | Unit Tests | Integration Tests | E2E Tests | Total |
| -------- | ---------- | ----------------- | --------- | ----- |
| `shared` | 17         | —                 | —         | 17    |
| `server` | 113        | 49                | —         | 162   |
| `web`    | 58         | —                 | 60        | 118   |
| `mobile` | 350        | —                 | —         | 350   |

> E2E tests authenticate via `playwrightRequest.newContext()` (API calls) and inject tokens into `localStorage`. Start dev servers before running: `pnpm dev:server` and `pnpm dev:web`.

**Test coverage areas**:
- **shared**: Constants (roles, species, regions), pagination utilities
- **server**: Analytics service, auth/validation/error middleware, Zod schemas, controllers (observation, user, species, auth, analytics, upload), full API integration suite
- **web**: Zustand auth store, API client, Sidebar, Header, AuthGuard, DashboardLayout components; Playwright E2E suite (auth flows, dashboard, analytics, admin panel, observation validation, public APIs)
- **mobile**: Utils (formatters, validators, constants), Zustand stores (auth, observation), services (api, auth, location, photo), hooks (useApi, useObservation, useLocation, useAuth), navigation (AppNavigator, MainTabs, AuthStack), common components (Button, Input, Picker, LoadingSpinner, EmptyState, Card, OfflineBanner), screen components (HomeScreen, NewObservationScreen, SpeciesListScreen, SpeciesDetailScreen, ProfileScreen, MapScreen)

## API Endpoints

### Authentication

| Method | Endpoint                        | Auth     | Description                    |
| ------ | ------------------------------- | -------- | ------------------------------ |
| POST   | `/api/v1/auth/login`            | Public   | Login with email/password      |
| POST   | `/api/v1/auth/logout`           | Bearer   | User logout                    |
| POST   | `/api/v1/auth/verify`           | Public   | Verify JWT token               |
| POST   | `/api/v1/auth/password-reset/request` | Public | Request password reset email |
| POST   | `/api/v1/auth/password-reset/reset`   | Public   | Reset password with token    |

### Species

| Method | Endpoint                  | Auth     | Description              |
| ------ | ------------------------- | -------- | ------------------------ |
| GET    | `/api/v1/species`         | Public   | List all species         |
| GET    | `/api/v1/species/:id`     | Public   | Get species details      |
| POST   | `/api/v1/species`         | ADMIN    | Create species           |
| PATCH  | `/api/v1/species/:id`     | ADMIN    | Update species           |
| DELETE | `/api/v1/species/:id`     | ADMIN    | Delete species           |

### Observations

| Method | Endpoint                                  | Auth          | Description                       |
| ------ | ----------------------------------------- | ------------- | --------------------------------- |
| GET    | `/api/v1/observations`                    | Bearer        | List observations                 |
| GET    | `/api/v1/observations/pending`            | RESEARCHER+   | List pending observations         |
| GET    | `/api/v1/observations/:id`                | Bearer        | Get observation details           |
| POST   | `/api/v1/observations`                    | Bearer        | Create observation                |
| PATCH  | `/api/v1/observations/:id/validate`       | RESEARCHER+   | Validate/reject observation       |

### Users

| Method | Endpoint                      | Auth                | Description                  |
| ------ | ----------------------------- | ------------------- | ---------------------------- |
| POST   | `/api/v1/users/register`      | Public              | Register new user            |
| GET    | `/api/v1/users/me`            | Bearer              | Get current user profile     |
| PATCH  | `/api/v1/users/me`            | Bearer              | Update current user profile  |
| GET    | `/api/v1/users`               | ADMIN/RESEARCHER    | List all users               |
| PATCH  | `/api/v1/users/:id/role`      | ADMIN               | Update user role             |
| DELETE | `/api/v1/users/:id`           | ADMIN               | Soft-delete a user           |
| POST   | `/api/v1/users/:id/restore`   | ADMIN               | Restore soft-deleted user    |
| POST   | `/api/v1/users/:id/block`     | ADMIN               | Block a user                 |
| POST   | `/api/v1/users/:id/unblock`   | ADMIN               | Unblock a user               |

### Analytics

| Method | Endpoint                                    | Auth          | Description                     |
| ------ | ------------------------------------------- | ------------- | ------------------------------- |
| GET    | `/api/v1/analytics/stats`                   | RESEARCHER+   | Dashboard statistics            |
| GET    | `/api/v1/analytics/size-frequency`          | RESEARCHER+   | Carapace width frequency        |
| GET    | `/api/v1/analytics/gender-ratio`            | RESEARCHER+   | Male/female ratio by species    |
| GET    | `/api/v1/analytics/condition-indices`       | RESEARCHER+   | Body condition indices          |
| GET    | `/api/v1/analytics/cw50`                    | RESEARCHER+   | CW50 maturity size estimate     |
| GET    | `/api/v1/analytics/temporal-trends`         | RESEARCHER+   | Observation trends over time    |
| GET    | `/api/v1/analytics/species-distribution`    | RESEARCHER+   | Species distribution            |

### AI Analysis

| Method | Endpoint                      | Auth     | Description                       |
| ------ | ----------------------------- | -------- | --------------------------------- |
| POST   | `/api/v1/analyze/upload`      | Bearer   | Upload photos for AI analysis     |
| POST   | `/api/v1/analyze/crab`        | Bearer   | Analyze crab photos with AI       |

### Admin

| Method | Endpoint                              | Auth     | Description                       |
| ------ | ------------------------------------- | -------- | --------------------------------- |
| POST   | `/api/v1/admin/backup`                | ADMIN    | Trigger manual database backup    |
| GET    | `/api/v1/admin/backups`               | ADMIN    | List all backup files             |
| GET    | `/api/v1/admin/backups/:fileName/download` | ADMIN | Download a backup file         |
| DELETE | `/api/v1/admin/backups/:fileName`     | ADMIN    | Delete a backup file              |
| POST   | `/api/v1/admin/cleanup-users`         | ADMIN    | Permanently delete expired users  |
| GET    | `/api/v1/admin/deleted-users`         | ADMIN    | List soft-deleted users           |
| POST   | `/api/v1/admin/invite`                | ADMIN    | Create invite for new user        |
| GET    | `/api/v1/admin/invites`               | ADMIN    | List all invites                  |
| POST   | `/api/v1/admin/invite/validate`       | Public   | Validate invite token             |

### Uploads

| Method | Endpoint                      | Auth     | Description                       |
| ------ | ----------------------------- | -------- | --------------------------------- |
| POST   | `/api/v1/upload/url`          | Bearer   | Get Azure SAS upload URL          |
| POST   | `/api/v1/upload`              | Bearer   | Upload image to server            |

### FCM (Push Notifications)

| Method | Endpoint                      | Auth     | Description                       |
| ------ | ----------------------------- | -------- | --------------------------------- |
| POST   | `/api/v1/fcm/token`           | Bearer   | Register FCM device token         |

### Performance Metrics

| Method | Endpoint                              | Auth     | Description                       |
| ------ | ------------------------------------- | -------- | --------------------------------- |
| GET    | `/api/v1/metrics/performance`         | Public   | Runtime performance metrics       |

## Database Schema

```
User (id, name, email, phoneCode, phoneNumber, addressLine1-3, state, postcode, country,
      role, avatar, password, firebaseUid, deletedAt, blockedAt, blockReason, createdAt)
  ├── role: USER | RESEARCHER | ADMIN
  ├── observations[] → Observation
  ├── validatedObs[] → Observation (as validator)
  ├── fcmToken → FcmToken
  └── passwordResets[] → PasswordReset

Species (id, scientificName, commonName, description, keyFeatures, images, distributionZones)
  └── observations[] → Observation

Observation (id, userId, speciesId, cw, bw, gender, maturationStatus, lat, lng,
             locationMethod, photos, detectedCoin, notes, status, validatedBy, validatedAt,
             rejectionReason, createdAt)
  ├── status: PENDING | APPROVED | REJECTED
  ├── gender: MALE | FEMALE | UNKNOWN (DB column: `sex`, mapped via Prisma)
  ├── maturationStatus: MATURE | IMMATURE | UNKNOWN
  ├── locationMethod: GPS | MANUAL
  ├── user → User
  ├── validator → User
  └── species → Species

Invite (id, email, role, token, expiresAt, used, createdAt)
  └── Single-use invite with expiry for user registration

PasswordReset (id, userId, token, expiresAt, used, createdAt)
  └── Single-use reset token with 1-hour expiry

FcmToken (id, userId, token, createdAt, updatedAt)
  └── Push notification device token
```

## Role Permissions

| Permission                | USER | RESEARCHER | ADMIN |
| ------------------------- | ---- | ---------- | ----- |
| Submit observations       | ✅   | ✅         | ✅    |
| View own observations     | ✅   | ✅         | ✅    |
| View all observations     | ❌   | ✅         | ✅    |
| Validate observations     | ❌   | ✅         | ✅    |
| Manage species            | ❌   | ❌         | ✅    |
| Manage users              | ❌   | ❌         | ✅    |
| View analytics            | ✅   | ✅         | ✅    |

## Project Structure

```
CrabWatch/
├── shared/
│   ├── src/
│   │   ├── types/          # TypeScript interfaces
│   │   ├── constants/      # Roles, status enums
│   │   └── utils/          # Shared utilities
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/         # Database, Firebase, Azure config
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, error handling
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Business logic
│   │   └── utils/          # Zod schemas, helpers
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Seed script
│   └── package.json
├── web/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # API client, hooks
│   │   └── store/          # Zustand state
│   └── package.json
├── mobile/
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── components/     # Reusable components
│   │   ├── hooks/          # Custom hooks
│   │   ├── navigation/     # React Navigation config
│   │   └── store/          # Zustand state
│   └── package.json
└── infrastructure/
    ├── terraform/          # Azure provisioning
    ├── azure-functions/    # Serverless functions
    └── azure-static-webapps/
```

## Environment Variables

### Server (`server/.env`)

| Variable                           | Required | Description                        |
| ---------------------------------- | -------- | ---------------------------------- |
| `DATABASE_URL`                     | Yes      | PostgreSQL connection string       |
| `PORT`                             | No       | Server port (default: 3001)        |
| `JWT_SECRET`                       | No       | JWT signing secret                 |
| `FIREBASE_PROJECT_ID`              | No*      | Firebase project ID                |
| `FIREBASE_CLIENT_EMAIL`            | No*      | Firebase service account email     |
| `FIREBASE_PRIVATE_KEY`             | No*      | Firebase private key               |
| `AZURE_STORAGE_CONNECTION_STRING`  | No*      | Azure blob storage connection      |
| `AZURE_STORAGE_CONTAINER`          | No*      | Azure container name               |
| `FOUNDRY_PROJECT_ENDPOINT`         | No*      | Azure AI Foundry project URL       |
| `FOUNDRY_AGENT_NAME`               | No*      | Foundry agent name (default: crab-analyzer) |
| `FOUNDRY_AGENT_VERSION`            | No       | Foundry agent version              |
| `FOUNDRY_API_KEY`                  | No*      | Foundry API key                    |
| `FOUNDRY_API_VERSION`              | No       | API version (default: 2025-05-15-preview) |
| `RESEND_API_KEY`                   | No*      | Resend API key for email dispatch  |
| `FRONTEND_URL`                     | No*      | Frontend URL for invite/reset links|
| `BACKUP_DIR`                       | No       | Backup directory (default: ./backups) |
| `CORS_ORIGINS`                     | No       | Allowed CORS origins               |
| `NODE_ENV`                         | No       | Environment (development/production)|

> *Optional for local dev with JWT fallback. Required for production.

## Deployment

### Target Stack

- **Web**: Vercel
- **API**: Azure App Service
- **Database**: Azure PostgreSQL
- **Mobile**: Expo EAS

### CI/CD

GitHub Actions workflows are configured in `.github/workflows/`:
- **CI**: Runs lint, typecheck, build, and tests on every push/PR
  - `lint-and-typecheck` — ESLint + TypeScript across all packages
  - `test-shared` — Fast unit tests for shared package
  - `test-server` — Unit + integration tests for server (with PostgreSQL 15 service container)
  - `test-web` — Unit tests for web (Next.js components, stores, API client)
  - `test-mobile` — Unit tests for mobile (Expo components, stores, hooks, navigation)
  - `build-server` / `build-web` / `build-mobile` — Build all packages
- **Deploy**: Provisions Azure infrastructure with Terraform, deploys server and web app

### Manual Deploy

```bash
# Build all packages
pnpm build

# Deploy server
pnpm --filter=server build
# Upload dist/ to your hosting provider

# Deploy web
pnpm --filter=web build
# Deploy .next/ to your static hosting
```

## Troubleshooting

### Prisma client not found

```bash
node server/node_modules/prisma/build/index.js generate --schema=server/prisma/schema.prisma
```

### bcrypt native module errors

```bash
npm rebuild bcrypt
```

### TypeScript path resolution errors

Ensure `@crabwatch/shared` is mapped in `tsconfig.json` paths.

### Database connection refused

Verify PostgreSQL is running:
```bash
docker ps | grep my-postgres
# or
pg_isready -h localhost -p 5432
```

### CORS errors

Add your frontend URL to `CORS_ORIGINS` in `server/.env`:
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:19006,https://yourdomain.com"
```

## Scripts

| Command                   | Description                      |
| ------------------------- | -------------------------------- |
| `pnpm dev`                | Start all dev servers            |
| `pnpm dev:server`         | Start API server (:3001)         |
| `pnpm dev:web`            | Start Next.js app (:3000)        |
| `pnpm dev:mobile`         | Start Expo app (:8081)           |
| `pnpm build`              | Build all packages               |
| `pnpm -r typecheck`       | Type check all packages          |
| `pnpm -r lint`            | Lint all packages                |
| `pnpm -r lint:fix`        | Auto-fix lint issues             |
| `pnpm --filter=server db:seed` | Seed database with sample data |
| `pnpm --filter=server db:studio` | Open Prisma Studio            |
| `pnpm -r test`                    | Run all tests                 |
| `pnpm -r test:coverage`           | Run tests with coverage       |
| `pnpm -r test:watch`              | Run tests in watch mode       |
| `pnpm --filter=mobile test`       | Run mobile tests              |
| `pnpm test:e2e`                   | Run E2E tests                 |
| `pnpm test:e2e:headed`            | Run E2E tests with visible browser |

## Status

- [x] TypeScript compilation (all 4 packages)
- [x] ESLint (all packages, 0 errors)
- [x] Database schema & seed script
- [x] Authentication (Firebase ID tokens + JWT fallback for local dev)
- [x] API endpoints with versioning (`/api/v1/`)
- [x] Web dashboard (admin, researcher, user views)
- [x] Web profile edit, observation detail, species browse pages
- [x] Web password reset flow (forgot/reset pages)
- [x] Mobile app (Expo SDK 54, React 19)
- [x] Mobile analytics, researcher, admin screens
- [x] Mobile password reset flow (forgot/reset screens)
- [x] Full-screen modal camera with guided capture
- [x] CI/CD pipelines
- [x] Unit tests (shared: 17, server: 113, web: 58, mobile: 350)
- [x] Integration tests (server: 49)
- [x] E2E tests (Playwright: 60 tests, all passing)
- [x] Production Firebase configuration
- [x] API versioning (v1)
- [x] Response caching
- [x] Rate limiting per endpoint type
- [x] Security hardening (Helmet, CSP, COEP, CORP)
- [x] Mapbox integration (marker clustering, fit-bounds)
- [x] Push notifications (FCM)
- [x] Accessibility (ARIA labels, focus trapping, WCAG checks)
- [x] Performance monitoring
- [x] AI-Guided Crab Capture (GPT-4o Vision analysis)
- [x] Dynamic species detection (mud crabs + swimming crabs)
- [x] Azure Blob Storage (photo upload for analysis)
- [x] Dual MYR coin series (Third + Second Series 1989-2011)
- [x] Full-screen modal camera capture
- [x] Invite system (token-based, email dispatch via Resend)
- [x] Password reset by email (Resend)
- [x] Admin panel (user management, species CRUD, backup, invites)
- [x] User soft-delete with 30-day retention
- [x] User block/unblock with auth rejection

## License

Private project.
