# AI-Guided Crab Capture - Implementation Plan

> **Status**: Build → Feature Complete
> **Started**: 2026-05-08
> **Agent**: Foundry Hosted Agent (GPT-4o Vision)
> **Species Model**: Fully dynamic — AI detects any crab species; new species auto-created in database

## Architecture

```
Mobile (Guided Capture)
  → Upload photos to server
    → Server: POST /api/v1/analyze/crab
      → Azure Blob Storage (temp analysis bucket)
        → Foundry Hosted Agent (crab-species-analyzer)
          → GPT-4o Vision API
            → Structured JSON response (any species)
              → Server validates + auto-creates unknown species
                → Returns to mobile with species ID
                  → Pre-filled editable form
                    → User reviews/edits
                      → POST /api/v1/observations
```

## Dynamic Species Detection

The app no longer constrains species to a fixed list. The AI identifies whatever crab it sees:
- Known species (pre-seeded): 4 Scylla mud crabs in DB as starting reference
- Unknown species: AI returns `speciesName` + descriptive `speciesId` slug
- Server auto-creates new species record via `upsert` on `speciesName`
- Mobile fetches species dynamically from `GET /api/v1/species` — always up-to-date

## MYR Coin Reference

### Third Series (Current)

| Coin | Diameter |
|------|----------|
| 5 sen | 17.78mm |
| 10 sen | 18.80mm |
| 20 sen | 20.60mm |
| 50 sen | 22.65mm |

### Second Series (1989-2011)

| Coin | Diameter |
|------|----------|
| 5 sen | 16.20mm |
| 10 sen | 19.40mm |
| 20 sen | 23.59mm |
| 50 sen | 27.76mm |

---

## STEP 1: Foundry Hosted Agent `[x]`

Build the AI agent that analyzes crab photos. Test independently before mobile integration.

### Files

| # | File | Status |
|---|------|--------|
| 1.1 | `server/src/services/foundryAgent.ts` | `[x]` System prompt + agent invocation |
| 1.2 | `server/src/utils/sanitize.ts` | `[x]` Input sanitization |

### System Prompt Design

- Species reference: Open-ended — AI identifies any crab species in Malaysian waters
- Size reference: MYR coins for carapace width estimation
- Gender determination: Ventral photo analysis (male/female/unknown)
- Maturity assessment: Visual features + size
- Output: Structured JSON with confidence scores

### Agent Response Contract

```json
{
  "speciesId": "slugified-species-name",
  "speciesName": "Scientific name (Common Name)",
  "confidence": 0.92,
  "estimatedCW": 14.5,
  "estimatedBW": 280,
  "gender": "male | female | unknown",
  "maturationStatus": "mature | immature | unknown",
  "detectedCoin": "50 sen",
  "coinConfidence": 0.88,
  "suggestions": ["Shell pattern consistent with S. serrata"],
  "rawAnalysis": "Full descriptive text..."
}
```

---

## STEP 2: Shared Types `[x]`

### Files

| # | File | Status |
|---|------|--------|
| 2.1 | `shared/src/types/analysis.ts` | `[x]` Analysis types |
| 2.2 | `shared/src/types/observation.ts` | `[x]` Observation types (gender, maturation) |
| 2.3 | `shared/src/types/species.ts` | `[x]` Species response types |

### Types Defined

- [x] `PhotoView` - `'dorsal' | 'ventral' | 'carapace-closeup'`
- [x] `CoinReference` - `{ denomination: string, diameter: number, unit: 'mm' }`
- [x] `CrabAnalysisRequest` - `{ photoUrls: string[], views: PhotoView[], coinType?: string }`
- [x] `CrabAnalysisResult` - species, measurements, coin, confidence, suggestions
- [x] `Gender` - `'male' | 'female' | 'unknown'`
- [x] `MaturationStatus` - `'mature' | 'immature' | 'unknown'`
- [x] `AnalysisStatus` - `'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'`

---

## STEP 3: Server Backend `[x]`

### Files

| # | File | Status |
|---|------|--------|
| 3.1 | `server/src/services/foundryAgent.ts` | `[x]` Blob upload + agent invocation |
| 3.2 | `server/src/services/upload.ts` | `[x]` Azure Blob Storage client |
| 3.3 | `server/src/controllers/analysisController.ts` | `[x]` Upload + analyze handlers |
| 3.4 | `server/src/routes/analysisRoutes.ts` | `[x]` `/api/v1/analyze` routes |
| 3.5 | `server/src/config/index.ts` | `[x]` Foundry config block |
| 3.6 | `server/src/index.ts` | `[x]` Analysis routes registered |

### Endpoints

- [x] `POST /api/v1/analyze/upload` - Batch photo upload (multer, 5 files, 10MB each)
- [x] `POST /api/v1/analyze/crab` - Trigger AI analysis, return structured result

### Config

- [x] `FOUNDRY_PROJECT_ENDPOINT` - Foundry project URL
- [x] `FOUNDRY_AGENT_NAME` - Agent name for invocation
- [x] `FOUNDRY_API_KEY` - API key for authentication

---

## STEP 4: Mobile Services `[x]`

### Files

| # | File | Status |
|---|------|--------|
| 4.1 | `mobile/src/services/api.ts` | `[x]` `analyzeCrab()`, `uploadAnalysisPhotos()` |
| 4.2 | `mobile/src/services/analysisService.ts` | `[x]` Upload → analyze → result orchestration |
| 4.3 | `mobile/src/services/photoService.ts` | `[x]` `assessImageQuality()`, `captureGuidedPhoto()` |

### Service Responsibilities

- [x] `analysisService.analyzeCrab()` - upload photos, call server, return result
- [x] Retry logic with exponential backoff
- [x] Offline queue for failed analyses
- [x] `photoService.assessImageQuality()` - sharpness check
- [x] `photoService.captureGuidedPhoto()` - camera settings for guided capture

---

## STEP 5: Mobile UI `[x]`

### Files

| # | File | Status |
|---|------|--------|
| 5.1 | `mobile/src/components/observation/PhotoGuidanceOverlay.tsx` | `[x]` Camera overlay with guides |
| 5.2 | `mobile/src/screens/observation/GuidedCaptureScreen.tsx` | `[x]` Step-by-step photo wizard |
| 5.3 | `mobile/src/screens/observation/AnalysisLoadingScreen.tsx` | `[x]` Analysis progress UI |
| 5.4 | `mobile/src/screens/observation/AIReviewScreen.tsx` | `[x]` AI results review/edit |

### Guided Capture Steps

1. **Coin Selection** - User picks coin type (5/10/20/50 sen) or "Let AI detect"
2. **Dorsal View** - Camera with overlay guides (coin placement, crab centering)
3. **Ventral View** - Flip crab, same guidance
4. **Carapace Close-up** - Optional, zoom on shell pattern

### Quality Gates per Step

- [x] Coin visible in frame
- [x] Crab centered in frame
- [x] Image not blurry (sharpness threshold)
- [x] Proper angle (dorsal/ventral)
- [x] "Use image picker" alternative button per step

---

## STEP 6: Navigation & Wiring `[x]`

### Files

| # | File | Status |
|---|------|--------|
| 6.1 | `mobile/src/navigation/types.ts` | `[x]` GuidedCapture, AnalysisLoading, AIReview |
| 6.2 | `mobile/src/navigation/MainTabs.tsx` | `[x]` New tab → GuidedCaptureScreen |
| 6.3 | `mobile/src/navigation/AppNavigator.tsx` | `[x]` AnalysisLoading, AIReview stack screens |
| 6.4 | `mobile/src/hooks/useObservation.ts` | `[x]` Accept CrabAnalysisResult pre-filled data |

### Navigation Flow

```
MainTabs "New" → GuidedCaptureScreen
  → (photos captured) → AnalysisLoadingScreen
    → (analysis complete) → AIReviewScreen
      → (submit) → POST /observations → Home
      → (retake) → GuidedCaptureScreen
```

---

## STEP 7: Polish `[x]`

### Edge Cases

- [x] Offline fallback: analysis fails → show manual form with photos
- [x] Blur detection threshold → prompt retake if below threshold
- [x] Coin detection confidence threshold → warn if AI unsure
- [x] Analysis timeout (45s) → show error with retry option
- [x] Retries with exponential backoff
- [x] Unknown species → auto-created in DB, shown in picker

### Type Safety

- [x] `pnpm --filter=@crabwatch/mobile typecheck` passes
- [x] `pnpm --filter=@crabwatch/server typecheck` passes
- [x] `pnpm --filter=@crabwatch/shared typecheck` passes

---

## Progress Summary

| Step | Description | Status | Files |
|------|-------------|--------|-------|
| 1 | Foundry Hosted Agent | ✅ Complete | 2 mod |
| 2 | Shared Types | ✅ Complete | 3 mod |
| 3 | Server Backend | ✅ Complete | 4 new, 4 mod |
| 4 | Mobile Services | ✅ Complete | 2 new, 2 mod |
| 5 | Mobile UI | ✅ Complete | 4 new |
| 6 | Navigation & Wiring | ✅ Complete | 4 mod |
| 7 | Polish | ✅ Complete | - |
| **Total** | | | **10 new, 16 mod** |

## Notes

- `expo-camera` already installed (`~17.0.10`)
- Azure Blob Storage already configured on server
- `expo-image-picker` retained as alternative capture method
- System prompt tone: field-researcher friendly (plain English, honest about uncertainty)
- Coin detection: AI auto-detects from image, user confirms/corrects
- Photo sequence: guided multi-shot (dorsal → ventral → optional close-up)
- Species detection: fully open-ended — AI identifies any crab, server auto-creates unknown species
- `MUD_CRAB_SPECIES` constant in shared is now legacy; species fetched dynamically from API
- Dual coin series (May 10): Third Series (current) and Second Series (1989-2011) supported
- Expanded species (May 10): swimming crabs added (Portunus, Charybdis)
- Body weight estimation (May 10): BW ≈ CW² × 15 (mud crabs), BW ≈ CW² × 10 (swimming crabs)
- Full-screen modal camera capture with view-specific hints
- AIReviewScreen shows coin mismatch when researcher-selected coin differs from AI detection
