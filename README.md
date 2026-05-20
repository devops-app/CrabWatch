# CrabWatch

AI-guided crab observation capture with fully dynamic species detection. The AI identifies any crab species in photos, and unknown species are auto-created in the database.

## Stack

| Package | Version |
|---------|---------|
| React Native | 0.81.5 |
| Expo | SDK 54 |
| React | 19 |
| Next.js | 15 (App Router) |
| Node.js | 22 |
| Express | 4.x |
| Prisma | 5.x |
| PostgreSQL | 15 (Azure Flexible Server)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start backend (port 3001)
pnpm dev:server

# Start web (port 3000)
pnpm dev:web

# Start mobile (Expo Go)
pnpm dev:mobile
```

## Features

### AI-Guided Capture
- Guided multi-shot photo capture (dorsal, ventral, optional close-up) with quality gates
- MYR coin reference for size estimation (Third and Second Series)
- Real-time capture assistance: gyroscope shake detection, brightness estimation, focus tracking, portrait lock, view validation
- GPT-4o Vision via Azure AI Foundry for species, gender, and maturation detection
- Dynamic species detection — unknown species auto-created via server upsert
- Map-based location picking: Mapbox (web), react-native-maps (mobile)

### Observation Management
- Full CRUD with photo management, measurements, and biological data
- Researcher validation flow: approve/reject pending observations
- Soft-delete with 30-day retention, block/unblock users
- Azure Blob Storage for photo storage with SAS URL refresh

### Analytics
- Gender ratio, size frequency, CW50, condition indices, species distribution, temporal trends
- Dashboard summary stats: total observations, approved, pending, species, contributors, states
- Lazy-loaded heavy components (map, charts) for fast initial load

### Gamification & Engagement
- XP-based system with split award (submission + approval)
- Global leaderboard with caching and recalculation
- Daily/onboarding missions with progress tracking
- Achievements with rarity, categories, and auto-award
- Streak tracking with bonus XP
- Abuse detection: velocity, duplicate, coordinate clustering

### User Management
- Registration with phone/address, invite system with role locking
- Password reset via Resend email (1-hour expiry tokens)
- Admin panel: species CRUD, user management, invites, backups, engagement config
- Soft-delete with 30-day retention, cleanup expired users

### Web App
- Next.js 15 App Router with Server Components
- Dashboard, capture, researcher validation, profile, observation detail, species browse
- Admin panel with species, users, backup, and engagement tabs
- Gamification: leaderboard, missions, achievements, community
- Application Insights auto-instrumentation, error boundary
- React.memo optimizations, lazy-loaded analytics

### Mobile App
- Full capture flow with guided camera, quality gates, and AI analysis
- Analytics with 6 tabs matching web parity
- Gamification: leaderboard (scope toggle, pagination), missions, achievements
- Dark mode support with automatic system theme detection
- Safe area handling for notched devices
- Deep linking for password reset (`crabwatch://reset-password/:token`)
- Role-based conditional tabs (Researcher/Admin)

## Deployment

### Azure (Production)
- PostgreSQL Flexible Server (DB)
- App Service (API + Web, shared B1 plan)
- Application Insights (telemetry)
- Scripts: `scripts/deploy-server.ps1`, `scripts/deploy-web.ps1`

### Mobile
- EAS Build for Android/iOS
- Config: `mobile/eas.json` (development, preview, production profiles)
- Project ID: `2b6450de-2e8d-4d06-a12e-ef9fc444d7b7`

See `Azure-Deployment-Plan.md` for detailed deployment steps.

## Testing

See `UAT.md` for comprehensive end-to-end test cases (223 test cases across 17 modules).

Seed accounts (password: `Pa55w.rd`):
- `admin@crabwatch.my` (ADMIN)
- `researcher@crabwatch.my` (RESEARCHER)
- `citizen@crabwatch.my` (USER)

## Project Structure

```
CrabWatch/
  server/        # Express + Prisma backend
  web/           # Next.js 15 web app
  mobile/        # Expo SDK 54 mobile app
  shared/        # Shared TypeScript types and constants
  scripts/       # Deployment scripts
```
