# CrabWatch — Data Analysis Framework

> **Version**: 1.0.0  
> **Last Updated**: 2026-06-22  
> **Status**: Reference document — maps current implementation and identifies gaps

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
3. [Analytics Pipeline Architecture](#3-analytics-pipeline-architecture)
4. [Statistical Methods](#4-statistical-methods)
5. [API Endpoints](#5-api-endpoints)
6. [Client-Layer Visualizations](#6-client-layer-visualizations)
7. [Engagement & Gamification Metrics](#7-engagement--gamification-metrics)
8. [Known Gaps & Limitations](#8-known-gaps--limitations)
9. [Recommended Enhancements](#9-recommended-enhancements)

---

## 1. Overview

CrabWatch collects citizen-science crab observations via mobile and web apps. Each observation records morphological measurements, geolocation, species identification (AI-assisted), and photographic evidence. The analytics layer transforms approved observations into ecological insights across seven dimensions:

| Dimension | Purpose | Key Metric |
|---|---|---|
| Dashboard Stats | Program health at a glance | Total/approved/pending counts, species richness, geographic coverage |
| Size Frequency | Population size structure | Carapace width histogram (21 bins) |
| Gender Ratio | Sex structure per species | Male:Female ratio |
| Condition Index | Individual health / body condition | Fulton's K variant: `K = (BW / CW³) × 100` |
| CW50 | Size at 50% maturity | Cumulative proportion interpolation |
| Species Distribution | Community composition | Relative abundance by species |
| Temporal Trends | Seasonal / monthly patterns | Observation count over time |

**Analytics gate**: Every query filters `status = APPROVED`. Pending and rejected observations are excluded from all computations.

---

## 2. Data Model

### 2.1 Observation Model

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | String (UUID) | No | Primary key |
| `userId` | String (UUID) | No | FK → `User` |
| `speciesId` | String | No | FK → `Species` |
| `cw` | Float | No | Carapace width (cm) — required, never AI-estimated |
| `bw` | Float | **Yes** | Body weight (g) — manual input only, never AI-estimated |
| `gender` | Enum | No | `MALE` / `FEMALE` / `UNKNOWN` (DB column: `sex`) |
| `maturationStatus` | Enum | No | `MATURE` / `IMMATURE` / `UNKNOWN` |
| `lat` | Float | No | Latitude |
| `lng` | Float | No | Longitude |
| `locationMethod` | Enum | No | `GPS` / `MANUAL` |
| `photos` | JSON (String[]) | No | Azure Blob SAS URLs |
| `detectedCoin` | String | Yes | MYR coin reference for scale |
| `notes` | String | Yes | Researcher/AI notes (includes EXIF metadata) |
| `status` | Enum | No | `PENDING` / `APPROVED` / `REJECTED` |
| `validatedBy` | String (UUID) | Yes | FK → `User` (researcher who approved) |
| `validatedAt` | DateTime | Yes | Approval/rejection timestamp |
| `rejectionReason` | String | Yes | Reason for rejection |
| `createdAt` | DateTime | No | Observation creation timestamp |
| `uploadSessionId` | String | Yes | Links to analysis session |

### 2.2 Supporting Models

**Species** — `id`, `scientificName` (unique), `commonName`, `description`, `keyFeatures` (JSON), `images` (JSON), `distributionZones` (JSON)

**User** — `id`, `name`, `email`, `role` (`USER`/`RESEARCHER`/`ADMIN`), `totalXP`, `level`, `currentStreak`, `longestStreak`, `approvedCount`, `totalSubmissions`, `preferredLocale`, `lastActiveDate`

### 2.3 Database Indexes

The `Observation` model has 8 indexes optimized for analytics queries:

```
[userId]
[speciesId]
[status]
[createdAt]
[validatedBy]
[status, speciesId]
[status, createdAt]
[speciesId, status]
```

---

## 3. Analytics Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                │
│                                                                 │
│  PostgreSQL (Prisma)                                            │
│       ↓  .findMany() / .groupBy() / .count()                    │
│  analytics.ts  (aggregations, formulas, state geocoding)        │
│       ↓  typed DTOs                                             │
│  analyticsController.ts  (query parsing, pagination clamping)   │
│       ↓  { success: true, data: ... }                           │
│  analyticsRoutes.ts  (Express router, auth middleware)          │
│       ↓  HTTP JSON                                              │
│  ┌──────────────────────┬──────────────────────┐               │
│  ↓                      ↓                      ↓               │
│  Web (Next.js)        Mobile (Expo)       Future consumers     │
│  recharts + mapbox    native views         (CSV export, etc.)  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Server Layer

| File | Role |
|---|---|
| `server/src/services/analytics.ts` | Core computations — all 7 analytics functions + helpers |
| `server/src/controllers/analyticsController.ts` | Query param parsing, pagination clamping (1–100), response wrapping |
| `server/src/routes/analyticsRoutes.ts` | Express router, `authMiddleware` → `requireAuth` → `resolveUser` |

### 3.2 Web Client Layer

| File | Role |
|---|---|
| `web/src/app/[locale]/dashboard/analytics/page.tsx` | Server Component — pre-fetches all data via `cookies()` auth |
| `web/src/app/[locale]/dashboard/analytics/client.tsx` | Client Component — tab state, filters, date range selectors |
| `web/src/app/[locale]/dashboard/analytics/map-tab.tsx` | Lazy-loaded (1,705 kB) — Mapbox via `react-map-gl`, grid clustering |
| `web/src/app/[locale]/dashboard/analytics/chart-tabs.tsx` | Lazy-loaded (403 kB) — `recharts` bar/pie/line charts |

### 3.3 Mobile Client Layer

| File | Role |
|---|---|
| `mobile/src/screens/analytics/AnalyticsScreen.tsx` | 6-tab analytics with native views, pull-to-refresh |
| `mobile/src/services/api.ts` | API client matching web methods |

---

## 4. Statistical Methods

### 4.1 Dashboard Stats

```typescript
// Parallel counts
totalObservations    = COUNT(*)
approvedObservations = COUNT(*) WHERE status = 'APPROVED'
pendingObservations  = COUNT(*) WHERE status = 'PENDING'
totalSpecies         = COUNT(DISTINCT speciesId)
totalContributors    = COUNT(DISTINCT userId)
statesCovered        = COUNT(DISTINCT state)  // via getStateFromCoords()
```

**State geocoding**: Uses hardcoded bounding boxes for 16 Malaysian states/territories. Simple rectangle containment check — no polygon boundaries.

**Limitation**: Fetches up to 50,000 rows into application memory for state mapping. No database-level geospatial query.

### 4.2 Size Frequency Distribution

- **Bins**: 21 fixed bins — `0-1cm` through `19-20cm` + `20cm+`
- **Algorithm**: `Math.floor(cw)` → bin key assignment
- **Filters**: Optional `speciesId`, `gender` (MALE/FEMALE)
- **Output**: `{ sizeBin, count }[]` sorted by bin order

### 4.3 Gender Ratio

- **Method**: Prisma `groupBy(['speciesId', 'gender'])` with `_count`
- **Ratio formula**: `ratio = male / female`
- **Edge cases**:
  - `female = 0, male > 0` → `Infinity`
  - `female = 0, male = 0` → `0`
- **Filters**: Optional `speciesId`, `dateFrom`, `dateTo`
- **Output**: `{ species, male, female, unknown, ratio }[]`

### 4.4 Condition Index (Fulton's K Variant)

**Per-observation formula** (`analytics.ts:321-324`):
```
K = (BW / CW³) × 100
```
Where `BW` = body weight (g), `CW` = carapace width (cm).

**Aggregation per species**:
| Metric | Method |
|---|---|
| `meanConditionFactor` | Arithmetic mean |
| `medianConditionFactor` | Linear interpolation at p=50 |
| `minConditionFactor` / `maxConditionFactor` | Min/max of sorted array |
| `stdDevConditionFactor` | **Population** standard deviation (÷ N, not N-1) |
| `meanCW` / `meanBW` | Arithmetic mean |

**Null handling**: Observations with `bw == null` are silently skipped.

**Limitation**: Uses population std dev (biased estimator for sample data). Should use Bessel's correction (÷ N-1).

### 4.5 CW50 (Carapace Width at 50% Maturity)

**Filters**: `status = APPROVED`, `maturationStatus IN (MATURE, IMMATURE)`, `gender IN (MALE, FEMALE)`

**Algorithm** (`analytics.ts:336-362`):
1. Sort observations by `cw` ascending
2. Walk sorted array, accumulate `matureCount / totalCount` as cumulative proportion
3. Find the pair where proportion crosses 0.5
4. Linearly interpolate CW at exactly 50% maturity:
   ```
   CW50 = CW[i] + (0.5 - proportion[i]) / slope
   where slope = (proportion[i+1] - proportion[i]) / (CW[i+1] - CW[i])
   ```
5. Fallback: median CW if no crossing found

**Confidence interval**: Hardcoded `±1 cm` around CW50 — not statistically derived.

**Limitation**: CI is a placeholder. Proper approach would use logistic regression or bootstrap resampling.

### 4.6 Species Distribution

- **Method**: Prisma `groupBy(['speciesId'])` with `_count`
- **Filters**: Optional `dateFrom`, `dateTo`
- **Output**: `{ speciesId, species, commonName, count }[]` sorted by count descending

### 4.7 Temporal Trends

- **Method**: Groups by `(species, YYYY-MM)` from `createdAt`
- **Filters**: Optional `speciesId`
- **Output**: `{ month, count, species }[]` sorted by month then species
- **Limitation**: No gap-filling for months with zero observations. No year-over-year comparison.

### 4.8 Percentile Helper

Linear interpolation method (`analytics.ts:326-334`):
```
index = (p / 100) × (length - 1)
result = sorted[lower] + (sorted[upper] - sorted[lower]) × (index - lower)
```

---

## 5. API Endpoints

All endpoints are prefixed `/api/v1/analytics` and require authentication.

| Method | Path | Query Params | Return Type | Description |
|---|---|---|---|---|
| GET | `/stats` | — | `DashboardStats` | Program health summary |
| GET | `/size-frequency` | `speciesId?`, `gender?` | `SizeFrequencyData[]` | Carapace width histogram |
| GET | `/gender-ratio` | `speciesId?`, `dateFrom?`, `dateTo?` | `GenderRatioData[]` | Sex ratio per species |
| GET | `/condition-indices` | `speciesId?` | `ConditionIndexAggregatedData[]` | Health metrics per species |
| GET | `/cw50` | `speciesId?` | `CW50Data[]` | Size at 50% maturity |
| GET | `/species-distribution` | `dateFrom?`, `dateTo?` | `SpeciesDistributionData[]` | Relative abundance |
| GET | `/temporal-trends` | `speciesId?` | `TemporalTrendData[]` | Monthly observation trends |

### 5.1 Shared TypeScript Types

Defined in `shared/src/types/analytics.ts`:

```typescript
interface DashboardStats {
  totalObservations: number
  approvedObservations: number
  pendingObservations: number
  totalSpecies: number
  totalContributors: number
  statesCovered: number
}

interface SizeFrequencyData {
  sizeBin: string
  count: number
}

interface GenderRatioData {
  species: string
  male: number
  female: number
  unknown: number
  ratio: number
}

interface ConditionIndexAggregatedData {
  species: number
  count: number
  meanConditionFactor: number
  medianConditionFactor: number
  minConditionFactor: number
  maxConditionFactor: number
  stdDevConditionFactor: number
  meanCW: number
  meanBW: number
}

interface CW50Data {
  species: string
  cw50: number
  confidenceInterval: [number, number]
  sampleSize: number
}

interface SpeciesDistributionData {
  speciesId: string
  species: string
  commonName: string
  count: number
}

interface TemporalTrendData {
  month: string
  count: number
  species: string
}
```

**Dead type**: `SpawningHotspotData` is defined but has no corresponding endpoint or service implementation.

---

## 6. Client-Layer Visualizations

### 6.1 Web (Next.js + Recharts + Mapbox)

| Tab | Chart Type | Library | Data Source |
|---|---|---|---|
| Dashboard Stats | Summary cards | Tailwind | `DashboardStats` |
| Size | `BarChart` | recharts | `SizeFrequencyData[]` (21 bins) |
| Gender | `PieChart` | recharts | `GenderRatioData[]` (male/female/unknown) |
| CW50 | `BarChart` + error bars | recharts | `CW50Data[]` with CI |
| Condition | `BarChart` | recharts | `ConditionIndexAggregatedData[]` |
| Species | `PieChart` | recharts | `SpeciesDistributionData[]` |
| Trends | `LineChart` (multi-series) | recharts | `TemporalTrendData[]` by species |
| Map | Interactive map + clusters | react-map-gl | Raw observations, grid-based clustering |

### 6.2 Mobile (Expo + React Native)

| Tab | View Type | Data Source |
|---|---|---|
| Dashboard Stats | Summary cards | `DashboardStats` |
| Size | Native bar chart | `SizeFrequencyData[]` |
| Gender | Native pie chart | `GenderRatioData[]` |
| CW50 | Native bar chart | `CW50Data[]` |
| Condition | Native bar chart | `ConditionIndexAggregatedData[]` |
| Species | Native pie chart | `SpeciesDistributionData[]` |
| Trends | Native line chart | `TemporalTrendData[]` |
| Map | `react-native-maps` + markers | Paginated observation data (500/page, max 5000) |

---

## 7. Engagement & Gamification Metrics

The engagement system tracks user participation and can feed into data quality analysis.

### 7.1 Metrics Service

`server/src/services/metricsService.ts` provides comprehensive health monitoring:

| Category | Metrics |
|---|---|
| User Activity | DAU, WAU, MAU, stickiness rate, new user counts (7d/30d) |
| Observation Velocity | Submissions (7d/30d), approval rate |
| XP Distribution | Mean/median XP, level distribution |
| Streaks | Users with active streak, average streak length |
| Missions | Completion rate, claim rate |
| Achievements | Unlock rate per achievement |
| Abuse Signals | Velocity, duplicate content, device farm, IP cluster, suspicious pattern |
| System Health | Cache hit rate, leaderboard freshness |

### 7.2 AI Insights Service

`server/src/services/aiInsightsService.ts` generates personalized `Insight` objects:

| Type | Trigger |
|---|---|
| `STREAK_WARNING` | Streak > 0, last activity > 18h ago |
| `LEVEL_UP` | User crosses XP threshold |
| `MILESTONE` | Submission count milestones |
| `SEASONAL` | Seasonal activity patterns |

**Note**: Insights are gamification-focused, not ecological. No anomaly detection on observation data.

### 7.3 XP Ledger

- `XPTransaction` model: immutable audit trail with deterministic idempotency keys
- Split XP award: submission (partial) + approval (remainder)
- Leaderboard: in-memory TTL cache (60s default, 120s all-time)

---

## 8. Known Gaps & Limitations

### 8.1 Statistical

| # | Issue | Severity | Detail |
|---|---|---|---|
| S1 | CW50 CI hardcoded | High | Always `±1 cm` — no statistical derivation. Needs logistic regression or bootstrap. |
| S2 | Population std dev | Medium | Condition factor uses N denominator. Should use N-1 (Bessel's correction) for sample data. |
| S3 | No sample size thresholds | Medium | CW50 and condition index computed even with n=2. No minimum sample warnings. |
| S4 | Gender ratio `Infinity` | Low | `female=0` produces `Infinity` ratio. Client may not handle gracefully. |

### 8.2 Performance

| # | Issue | Severity | Detail |
|---|---|---|---|
| P1 | Dashboard stats fetches 50K rows | High | `getDashboardStats` loads all approved observations into memory for state mapping. No DB-level geospatial query. |
| P2 | No caching layer | Medium | All analytics computed on every request. No TTL cache for expensive aggregations. |
| P3 | Pagination parameter ignored | Medium | `_pagination` accepted but unused in 5 of 7 endpoints. |
| P4 | No query result limits | Low | `getSizeFrequency`, `getTemporalTrends` fetch all matching rows with no `take` limit. |

### 8.3 Data Quality

| # | Issue | Severity | Detail |
|---|---|---|---|
| D1 | State geocoding approximate | Medium | Simple bounding boxes — coastal states with irregular borders will have misclassifications. |
| D2 | Temporal trends are flat | Medium | No gap-filling for months with zero observations. No year-over-year comparison. |
| D3 | No ecological anomaly detection | Medium | AI insights focus on gamification, not data quality or ecological patterns. |
| D4 | No data validation post-approval | Low | No checks for out-of-range CW/BW values after observation is approved. |

### 8.4 Missing Features

| # | Feature | Impact |
|---|---|---|
| F1 | CSV/Excel export | Researchers cannot download data for external analysis |
| F2 | Advanced statistics | No regression, correlation, ANOVA, or time-series decomposition |
| F3 | Geospatial analysis | No kernel density estimation, hotspot mapping, or spatial autocorrelation |
| F4 | Spawning hotspot detection | `SpawningHotspotData` type exists but no implementation |
| F5 | Real-time/streaming | All analytics are pull-based, no WebSocket or SSE updates |
| F6 | Cross-species comparison | No statistical tests to compare metrics across species |
| F7 | Seasonal decomposition | No trend vs. seasonal vs. residual breakdown |
| F8 | Data provenance tracking | No audit trail for how analytics results were computed |

---

## 9. Recommended Enhancements

### 9.1 Phase 1 — Statistical Rigor (Quick Wins)

| Task | Effort | Description |
|---|---|---|
| CW50 logistic regression | Medium | Replace cumulative proportion with proper logistic regression (`logit(p) = a + b*CW`) to estimate CW50 with statistically valid confidence intervals |
| Bessel's correction | Trivial | Change `variance / count` to `variance / (count - 1)` in condition factor std dev |
| Sample size warnings | Small | Add `minSampleSize` thresholds (e.g., CW50 ≥ 10, CI ≥ 20) with warning flags in response |
| Gender ratio cap | Trivial | Cap ratio at a reasonable maximum (e.g., 999) or return `null` when `female = 0` |

### 9.2 Phase 2 — Performance

| Task | Effort | Description |
|---|---|---|
| Dashboard stats optimization | Medium | Replace in-memory state mapping with PostgreSQL `postgis` extension or pre-computed state column |
| Analytics result caching | Medium | Add in-memory TTL cache (60s–5min) for analytics results, keyed by `(endpoint, filters)` |
| Pagination enforcement | Small | Implement `_limit`/`_offset` in endpoints that currently ignore pagination |
| Query result limits | Small | Add `take: 10000` to unbounded `findMany` queries |

### 9.3 Phase 3 — Advanced Analytics

| Task | Effort | Description |
|---|---|---|
| Spawning hotspot detection | Large | Implement `SpawningHotspotData` endpoint — kernel density estimation on mature female observations, grouped by month |
| CSV/Excel export | Medium | Add `GET /export/observations` with date range, species, and field selection. Stream as CSV or xlsx. |
| Temporal gap-filling | Small | Fill missing months with `count: 0` for continuous line charts. Add year-over-year delta. |
| Cross-species ANOVA | Large | Compare condition factors and size distributions across species with statistical significance testing |
| Seasonal decomposition | Large | STL decomposition of temporal trends into trend, seasonal, and residual components |

### 9.4 Phase 4 — Geospatial & Ecological

| Task | Effort | Description |
|---|---|---|
| Polygon-based state geocoding | Medium | Replace bounding boxes with actual Malaysian state GeoJSON polygons |
| Spatial autocorrelation | Large | Moran's I test for spatial clustering of observations, species, or condition factors |
| Habitat suitability modeling | Large | MaxEnt-style modeling using environmental covariates and observed presence data |
| Real-time dashboards | Medium | WebSocket/SSE push for live observation counts and approval status updates |

### 9.5 Phase 5 — Data Quality & Provenance

| Task | Effort | Description |
|---|---|---|
| Outlier detection | Medium | Automated flagging of CW/BW values outside species-specific expected ranges (e.g., >3σ from mean) |
| Duplicate detection | Medium | Spatial-temporal clustering to flag potential duplicate submissions (same location, same day, similar CW) |
| Analytics audit log | Small | Log analytics query parameters and result checksums for reproducibility |
| Data quality dashboard | Medium | Admin view showing approval rate by user, rejection reasons, AI confidence distribution |

---

## Appendix A: Malaysian State Bounding Boxes

Current hardcoded bounds in `getStateFromCoords()`:

| State | Lat Range | Lng Range |
|---|---|---|
| Perlis | 6.4 – 6.9 | 100.1 – 100.4 |
| Kedah | 5.6 – 6.8 | 100.2 – 101.3 |
| Pulau Pinang | 5.2 – 5.6 | 100.2 – 100.4 |
| Perak | 4.6 – 6.8 | 100.7 – 101.3 |
| Kelantan | 5.9 – 6.2 | 102.2 – 102.6 |
| Terengganu | 4.9 – 5.9 | 102.8 – 103.2 |
| Pahang | 3.5 – 5.0 | 102.8 – 103.7 |
| Selangor | 2.8 – 3.5 | 101.1 – 101.8 |
| Kuala Lumpur | 3.0 – 3.2 | 101.6 – 101.8 |
| Putrajaya | 2.9 – 3.0 | 101.6 – 101.7 |
| Negeri Sembilan | 2.4 – 2.9 | 101.7 – 102.2 |
| Melaka | 2.1 – 2.4 | 101.8 – 102.2 |
| Johor | 1.3 – 2.5 | 102.8 – 104.3 |
| Sabah | 4.3 – 7.1 | 116.0 – 119.0 |
| Sarawak | 0.9 – 4.4 | 109.7 – 115.5 |
| Labuan | 4.9 – 5.0 | 115.0 – 115.3 |

**Note**: Overlapping bounding boxes (e.g., Kedah/Perak, KL/Selangor) are resolved by iteration order — first match wins.

---

## Appendix B: File Map

| Layer | File | Lines | Purpose |
|---|---|---|---|
| DB | `server/prisma/schema.prisma` | 565 | Full schema, 24 models, 11 enums |
| Service | `server/src/services/analytics.ts` | 396 | All 7 analytics computations + helpers |
| Controller | `server/src/controllers/analyticsController.ts` | — | Query parsing, response wrapping |
| Routes | `server/src/routes/analyticsRoutes.ts` | — | Express router, auth middleware |
| Types | `shared/src/types/analytics.ts` | 72 | Shared TypeScript interfaces |
| Web page | `web/src/app/[locale]/dashboard/analytics/page.tsx` | — | Server Component, pre-fetches data |
| Web client | `web/src/app/[locale]/dashboard/analytics/client.tsx` | — | Tab state, filters, date ranges |
| Web map | `web/src/app/[locale]/dashboard/analytics/map-tab.tsx` | — | Lazy-loaded Mapbox visualization |
| Web charts | `web/src/app/[locale]/dashboard/analytics/chart-tabs.tsx` | — | Lazy-loaded recharts visualizations |
| Mobile | `mobile/src/screens/analytics/AnalyticsScreen.tsx` | — | 6-tab analytics with native views |
| Metrics | `server/src/services/metricsService.ts` | — | Engagement health metrics |
| Insights | `server/src/services/aiInsightsService.ts` | — | Gamification insights |
