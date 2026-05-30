# Image Quality Pipeline — Improvement Plan

> **Created**: 2026-05-30
> **Scope**: Mobile (Expo) + Web (Next.js) capture screens + Server preprocessing
> **Goal**: Add real, measurable quality gates before photos reach the AI to reduce wasted AI calls, improve species classification accuracy, and give researchers actionable feedback.

---

## Current State

### Mobile (GuidedCaptureScreen)

| Check | Implementation | Status |
|---|---|---|
| Shake detection | Gyroscope std-dev in `useCaptureAssistance.ts` | Works well |
| Brightness | Accelerometer Z-axis in `useCaptureAssistance.ts` | Broken — accelerometer has nothing to do with ambient light |
| Focus | Manual tap-to-focus in `GuidedCaptureScreen` | Works but no auto-focus confirmation |
| Blur detection | Compression ratio heuristic in `photoService.assessImageQuality()` | Unreliable — compresses at 10% and compares file sizes |
| View detection | Aspect ratio only in `viewAnalysis.ts` | Broken — `isLikelyDorsal`/`isLikelyVentral` always return `true` |
| Framing | `CaptureFrameOverlay` visual guide | Good UI, no enforcement |
| Crab detection | None | Missing entirely |

### Web (capture/client.tsx)

| Check | Implementation | Status |
|---|---|---|
| All quality checks | None — relies on AI to catch issues | No client-side validation before upload |

### Server (foundryAgent.ts)

| Check | Implementation | Status |
|---|---|---|
| View detection | AI-based `detectView` — single photo to Foundry | Works but costs AI call + ~12s latency |
| Species classification | GPT-4o Vision via Foundry agent | Works well |
| Pre-upload quality gate | None | Poor quality photos waste AI calls |

---

## Architecture — Current vs. Target

### Current Flow
```
Vision Camera -> Photo -> Upload -> AI (view detect + species + measurements) -> Results
```
**Problem**: Every photo, regardless of quality, triggers expensive AI calls. Blurry/dark/wrong-view photos waste time, tokens, and frustrate researchers.

### Target Flow
```
Vision Camera
  |
  +-> Real-time Frame Analysis (on-device)
  |     - Brightness (pixel luminance)
  |     - Shake (gyroscope — already works)
  |     - Focus ring overlay
  |
  +-> Shutter -> Photo
  |
  +-> Image Quality Checks (on-device, <500ms)
  |     - Blur detection (Laplacian variance)
  |     - Brightness (average luminance)
  |     - Framing validation (aspect ratio + crab presence)
  |     - View detection (dorsal vs ventral heuristics)
  |
  |     [FAIL -> Show specific feedback, retake]
  |     [PASS -> continue]
  |
  +-> Upload + AI Analysis
  |
  +-> Auto Crop / Segmentation (server, Phase 2)
  |
  +-> Species Classification
  |
  +-> Results + Measurements
```

---

## Phase 1 — On-Device Quality Gates (Week 1-2)

### P1-1: Real Brightness Detection (Mobile)

**Problem**: Accelerometer Z-axis is not a light sensor. Need actual pixel luminance.

**Solution**: Use `expo-camera` preview frame sampling to compute average brightness in real-time.

- Sample camera frames at reduced resolution (64x64)
- Compute average luminance from pixel data
- Replace accelerometer-based brightness in `useCaptureAssistance.ts`
- Thresholds: dark (<0.15), low (0.15-0.4), good (0.4-0.8), bright (>0.8)

**Files**: `useCaptureAssistance.ts`, `GuidedCaptureScreen.tsx`
**Dependencies**: `expo-camera` (already installed)

### P1-2: Real Blur Detection (Mobile + Web)

**Problem**: Compression ratio heuristic is unreliable. Need Laplacian variance.

**Solution**: Implement Laplacian variance on a downsized thumbnail.

- Resize to 256x256
- Apply 3x3 Laplacian kernel
- Compute variance of result
- Threshold: variance < 100 = blurry, 100-400 = acceptable, >400 = sharp

**Mobile**: Use `expo-image-manipulator` to resize, then run Laplacian on pixel data via a small WebAssembly module or native calculation.

**Web**: Use Canvas API to read pixel data and compute Laplacian variance directly in JavaScript.

**Files**: New `shared/src/utils/imageQuality.ts`, `photoService.ts`, `capture/client.tsx`
**Dependencies**: None new — use existing Canvas (web) and ImageManipulator (mobile)

### P1-3: View Detection Heuristics (Mobile)

**Problem**: `viewAnalysis.ts` always returns `true` for both dorsal and ventral.

**Solution**: Color distribution heuristics to distinguish dorsal vs ventral.

- Dorsal: typically darker, more color variation, patterns
- Ventral: typically lighter, more uniform, white/cream tones
- Compute color variance and average brightness from center region
- Combined with AI `detectView` as a fallback (only run AI if heuristic is uncertain)

**Files**: `viewAnalysis.ts`
**Dependencies**: None new

### P1-4: Web Quality Gate

**Problem**: No client-side validation on web capture.

**Solution**: Implement the same quality checks as mobile using Canvas API.

- Blur: Laplacian variance on Canvas
- Brightness: average luminance from pixel data
- Framing: aspect ratio validation
- Show inline warnings before upload

**Files**: New `web/src/utils/imageQuality.ts`, `capture/client.tsx`
**Dependencies**: None new — Canvas API is built-in

### P1-5: Quality Gate UI Feedback

**Problem**: When a photo fails quality, user gets no specific feedback.

**Solution**: Add a quality result modal/card that shows:

- Which checks passed/failed with icons
- Specific actionable advice (e.g., "Photo too dark — move to brighter area")
- "Retake" and "Submit Anyway" buttons
- i18n support for all messages

**Files**: New `mobile/src/components/observation/QualityGateCard.tsx`, update `GuidedCaptureScreen.tsx`
**Files**: Update `capture/client.tsx` for web quality feedback
**i18n keys**: `quality.*` namespace in both mobile and web locale files

---

## Phase 2 — Server Preprocessing (Week 3-4)

### P2-1: Server-Side Quality Gate

**Problem**: Client-side checks can be bypassed or fail silently. Server should validate before AI call.

**Solution**: Add `sharp` library to server pipeline.

- Resize to thumbnail, compute blur/brightness server-side
- Reject photos that fail minimum thresholds with specific error
- Only pass quality-validated photos to Foundry AI

**Files**: New `server/src/utils/imageQuality.ts`, update `analysisController.ts`
**Dependencies**: `sharp` (npm install)

### P2-2: Auto-Crop / Crab Segmentation

**Problem**: Photos include background, sky, mud — extra pixels confuse AI and waste tokens.

**Solution**: Use a lightweight object detection model to find crab bounding box, then auto-crop.

- Option A: Server-side with `sharp` + simple edge detection (fast, less accurate)
- Option B: Ask GPT-4o Vision to return bounding box coordinates in analysis JSON (no new deps, but requires prompt change)
- Option C: Dedicated segmentation model (most accurate, heaviest)

**Recommendation**: Start with Option B — add `boundingBox` field to AI response, use for future auto-crop.

**Files**: Update `foundryAgent.ts` system prompt, `shared/src/types/analysis.ts`
**Dependencies**: None new for Option B

### P2-3: Crab Presence Detection

**Problem**: No check that a crab is actually in the photo before sending to AI.

**Solution**: Add simple crab presence check.

- Option A: Ask AI in the existing view detection call to also confirm crab presence
- Option B: Color/texture heuristics (hard, unreliable)
- Option C: Small on-device ML model (heavy, complex)

**Recommendation**: Option A — extend `detectView` to also return `hasCrab: boolean`.

**Files**: Update `foundryAgent.ts` `VIEW_DETECTION_INSTRUCTIONS`, `shared/src/types/analysis.ts`
**Dependencies**: None new

---

## Phase 3 — Advanced (Future)

### P3-1: Real-time Crab Detection (Mobile)

Use `expo-camera` frame processor with a lightweight TensorFlow.js model to detect crab presence in real-time before shutter.

**Dependencies**: `@react-native-ml-kit/image-labeling` or custom TFLite model

### P3-2: Auto-segmentation mask

Generate a segmentation mask to isolate crab from background, improving AI focus and reducing token usage.

### P3-3: Quality scoring dashboard

Track photo quality metrics over time — average blur scores, rejection rates, per-user quality trends.

---

## Dependencies

| Package | Platform | Purpose | Status |
|---|---|---|---|
| `sharp` | Server | Image processing, blur/brightness analysis | Not installed |
| `expo-camera` | Mobile | Frame sampling for brightness | Already installed |
| Canvas API | Web | Pixel analysis for blur/brightness | Built-in |

---

## Shared Types Updates

```typescript
// shared/src/types/analysis.ts — add

export interface ImageQualityResult {
  blurScore: number        // Laplacian variance
  brightness: number       // Average luminance 0-1
  isBlurry: boolean
  isTooDark: boolean
  passes: boolean          // Overall gate result
  issues: string[]         // Human-readable issues
}
```

---

## Implementation Order

1. P1-2: Blur detection (shared utility, highest impact)
2. P1-1: Real brightness on mobile (fixes broken accelerometer approach)
3. P1-4: Web quality gate (brings web to parity with mobile)
4. P1-3: View detection heuristics (reduces AI calls)
5. P1-5: Quality gate UI feedback (user experience)
6. P2-1: Server-side quality gate (defense in depth)
7. P2-3: Crab presence detection (extends existing AI call)
8. P2-2: Auto-crop bounding box (future optimization)

---

## Success Metrics

- Reduce AI analysis calls for poor-quality photos by >50%
- Reduce average analysis time by eliminating failed retries
- Improve species classification confidence by reducing noisy inputs
- Provide researchers with specific, actionable feedback on retakes
