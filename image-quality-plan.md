# Image Quality Pipeline — Improvement Plan

> **Created**: 2026-05-30
> **Scope**: Mobile (Expo) + Web (Next.js) capture screens + Server preprocessing
> **Goal**: Add real, measurable quality gates before photos reach the AI to reduce wasted AI calls, improve species classification accuracy, and give researchers actionable feedback.

> **Implementation Status (Updated)**: 2026-06-01

- Completed: `P1-1`, `P1-2`, `P1-3`, `P1-4`, `P1-5`, `P1-6`, `P2-1`, `P2-2`, `P2-3`, `EXIF-1`, `R-2`
- Remaining: rollout feature flags, calibration workflow, QA matrix execution, alerting/dashboard hardening
- R-2 (mobile telemetry): Completed — `reportTelemetryError` added to mobile `api.ts`, `emitQualityTelemetry` wired in `GuidedCaptureScreen.tsx` for quality results and overrides

---

## Capture Context — Mobile vs Web

### Mobile — Field Capture

User is in the field, holding phone, photographing live crabs at the capture site.

- **Strengths**: Excellent camera sensors, native autofocus/exposure/flash, gyroscope + accelerometer, GPS, haptic feedback, `expo-camera` frame sampling
- **Weaknesses**: Small screen, variable field lighting, user movement (boat/walking), one-handed operation
- **Strategy**: Real-time guidance *before* the shutter. Shake warnings, brightness feedback, framing overlay, focus confirmation. User needs to know "is this shot good?" while still holding the crab.

### Web — Lab / Office Review

User is at a desk (laptop, desktop, or Surface), photographing crabs that are already captured — likely in a bucket, tray, or tank. Also supports file upload and drag-and-drop.

- **Strengths**: Large screen for quality judgment, precise mouse interactions, stable surface, controlled indoor lighting, Canvas API for pixel analysis
- **Weaknesses**: Poor webcam quality (720p at best), no gyroscope/accelerometer, no native camera controls (can't trigger autofocus/adjust exposure), `getUserMedia` API is limited, crab fills less of the frame
- **Strategy**: Post-capture validation *before* upload. User takes/uploads photo, gets immediate quality score card, can retake or override. The large screen lets the user judge quality visually — automated checks are a safety net.

### Key Differences

| Aspect | Mobile | Web |
|---|---|---|
| **When to check** | Real-time, before shutter | After capture, before upload |
| **Blur** | Laplacian on captured photo | Laplacian on Canvas pixel data |
| **Brightness** | Frame sampling from camera preview | Pixel analysis from captured image |
| **Shake** | Gyroscope (already works) | Not applicable — desk is stable |
| **Focus** | Tap-to-focus with visual confirmation | Not controllable — rely on camera auto-focus |
| **Framing** | Overlay guide on live camera | Grid overlay on preview, optional drag-to-crop |
| **Input method** | Camera only | Camera OR file upload OR drag-and-drop |
| **Feedback** | Inline warnings, haptic, retake button | Quality score card with pass/fail per check |
| **Crab detection** | Not feasible on-device (too heavy) | Could use lightweight TF.js model in browser |

---

## Expo Mobile Components — Required, Improvements & Benefits

### Component Breakdown

Each component in the mobile capture pipeline plays a specific role. Below maps what each does now, what's needed to improve it, and the field-capture benefit.

| # | Component | Role | Current State | Required Improvement | Field-Capture Benefit |
|---|---|---|---|---|---|
| 1 | `useCaptureAssistance.ts` | Hook providing real-time sensor data (shake, brightness, focus) to the capture overlay | Accelerometer Z-axis for brightness (broken), Gyroscope for shake (works), tap-to-focus tracking (works) | Replace accelerometer brightness with `expo-camera` frame sampling → compute real pixel luminance at 64x64 resolution. Keep gyroscope shake. Add focus confirmation callback from camera. | Accurate lighting feedback lets field users know to move to shade/sun or use flash. Eliminates misleading "too dark/bright" warnings caused by phone tilt. Reduces retakes caused by poor lighting. |
| 2 | `viewAnalysis.ts` | Post-capture utility that checks whether a photo matches the expected view (dorsal/ventral) | Aspect-ratio-only checks — always returns `true` for both dorsal and ventral | Add pixel-based color distribution heuristics: compute color variance, average luminance, and brightness gradient from the center region of the photo. Dorsal = darker + more color variation; Ventral = lighter + more uniform. Return confidence score, not boolean. | Catches flipped or misoriented crabs before upload. In the field, a researcher handling a crab one-handed may accidentally photograph the wrong side. On-device detection prevents wasting AI tokens and network bandwidth on wrong-view photos. |
| 3 | `photoService.ts` | Photo capture, manipulation, and quality assessment service | Uses compression-ratio heuristic to detect blur (compress at 10%, compare file sizes — unreliable across devices) | Integrate Laplacian variance blur detection on captured photos before upload. Downsize to 256x256, apply 3x3 Laplacian kernel, compute variance. Threshold: <100 = blurry, 100-400 = acceptable, >400 = sharp. | Prevents blurry submissions that waste AI tokens and produce unreliable species classification. Field users get immediate "photo is blurry, retake" feedback instead of discovering the problem 12+ seconds later after AI returns poor results. |
| 4 | `CaptureFrameOverlay.tsx` | Real-time camera overlay with animated corner brackets that reflect capture readiness | Static framing guide with animations driven by `isReady`, `shakeLevel`, `brightnessLevel`, `isFocused` states from `useCaptureAssistance` | Wire overlay to improved sensor hooks: real brightness from frame sampling, valid shake detection, focus confirmation. Add dynamic color states (green = ready, amber = warning, red = critical) and animation intensity based on quality thresholds. | Instant visual cues reduce user hesitation in the field. Color-coded corners communicate "hold steady" or "move to better light" without requiring the user to read text — critical when handling a live crab one-handed. |
| 5 | `PhotoGuidanceOverlay.tsx` | Step-by-step instruction overlay per view type (dorsal, ventral, carapace-closeup) with coin tap zone | Static i18n instruction steps, no dynamic quality warnings | Add dynamic quality warning section that appears when thresholds fail (e.g., "Image too dark — move to brighter area", "Wrong view detected — show the crab's back"). Integrate with `viewAnalysis` results post-capture. | Contextual guidance prevents repeat framing mistakes. In the field, a researcher may not realize the coin is too small or the crab is oriented incorrectly until after analysis. Inline warnings catch these issues before the user moves to the next step. |
| 6 | `analysisService.ts` | Orchestrates photo upload and AI analysis with progress callbacks | Direct upload → analyze flow; enforces 1–5 photo limits; streams progress (`uploading` → `analyzing` → `complete`) | Add pre-upload quality gate interceptor that runs all checks (blur, brightness, view) before `uploadAnalysisPhotos` is called. If any check fails, emit a `qualityFail` event with specific issues instead of proceeding to upload. | Blocks poor photos before network and AI calls, saving bandwidth (critical in remote field locations with weak signal) and reducing latency. Researcher gets immediate feedback to retake instead of waiting for upload + AI to fail. |
| 7 | `GuidedCaptureScreen.tsx` | Main capture orchestrator — manages camera, overlays, step navigation, and state | Orchestrates camera, overlays, and step-by-step flow. No quality enforcement — user can proceed with any photo. | Integrate a quality state machine: after capture, run quality checks, gate the "Next" button until either (a) all checks pass, or (b) user explicitly overrides with "Submit Anyway". Wire to `QualityGateCard` UI component. Maintain `PhotoTipsModal` as optional guidance. | Enforces quality standards while preserving user control. Field researchers can override when conditions are genuinely poor (e.g., cloudy day, small crab), but are made aware of the trade-off. Reduces the rate of low-quality observations entering the dataset. |

### Integration Flow

```
useCaptureAssistance.ts  →  real-time sensor data
       ↓
CaptureFrameOverlay.tsx  ←  animated visual feedback (color + animation states)
PhotoGuidanceOverlay.tsx ←  step instructions + dynamic warnings
       ↓  (shutter pressed)
photoService.ts          →  Laplacian blur check on captured photo
viewAnalysis.ts          →  color heuristic view detection
       ↓
GuidedCaptureScreen.tsx  →  quality state machine gates "Next" button
       ↓  (all pass or user overrides)
analysisService.ts       →  pre-upload gate interceptor, then upload + AI
```

---

## Current State Summary

### Mobile

| Check | Component | Status |
|---|---|---|
| Shake detection | `useCaptureAssistance.ts` (Gyroscope) | Works |
| Brightness | `useCaptureAssistance.ts` (frame-sampled image luminance) | Works |
| Focus | `GuidedCaptureScreen.tsx` (tap-to-focus) | Works, no confirmation |
| Blur detection | `photoService.ts` (Laplacian variance) | Works |
| View detection | `viewAnalysis.ts` (jpeg-js pixel heuristics: luminance/saturation/variance scoring + AI fallback when confidence <0.7 or mismatch) | Works |
| Framing overlay | `CaptureFrameOverlay.tsx` | Good UI, no enforcement |
| Guidance overlay | `PhotoGuidanceOverlay.tsx` | Static text; quality warnings shown in quality card flow |
| Pre-upload gate | `analysisService.ts` | Works |
| Quality enforcement | `GuidedCaptureScreen.tsx` | Works with override reason gating |

### Web (capture/client.tsx)

| Check | Implementation | Status |
|---|---|---|
| All quality checks | Canvas-based blur/brightness/framing gate in capture flow | Works |
| Webcam quality detection | Stream resolution warning (<1280x720) | Works |
| Upload validation | Camera, file upload, and drag/drop run through same gate | Works |

### Server (foundryAgent.ts + imageQuality.ts)

| Check | Implementation | Status |
|---|---|---|
| View detection | AI-based `detectView` — single photo to Foundry | Works but costs AI call + ~12s latency |
| Species classification | GPT-4o Vision via Foundry agent | Works well |
| Crab count validation | Enforced in `analysisController.ts` with hard-fail codes | Works |
| Pre-upload quality gate | Server-side blur/brightness validation before AI call | Works |
| Auto-crop re-crop pass | `createCroppedImageDataUrlFromUrl` with `toPixelBox` normalization | Works |
| EXIF metadata extraction | `sharp` EXIF buffer + custom binary parser, injected into submission notes | Works |

---

## Architecture — Current vs. Target

### Current Flow
```
Photo (mobile or web) -> Upload -> AI (view detect + species + measurements) -> Results
```
**Problem**: Every photo, regardless of quality, triggers expensive AI calls. Blurry/dark/wrong-view photos waste time, tokens, and frustrate researchers.

### Target Flow — Mobile (Real-Time Guidance)
```
Vision Camera -> Live Frame Analysis (on-device, real-time)
  - Brightness (pixel luminance from frame sample)
  - Shake (gyroscope — already works)
  - Focus ring overlay (tap-to-focus confirmation)
  - Framing guide overlay

Shutter -> Photo

Post-Capture Quality Checks (<500ms)
  - Blur detection (Laplacian variance)
  - Brightness (average luminance)
  - View detection (dorsal vs ventral heuristics)

  [FAIL -> Show quality card, retake]
  [PASS -> continue]

Upload + AI Analysis -> AI returns species, measurements, crabCount, boundingBox

AI Validation
  - crabCount == 1 -> proceed (hard constraint)
  - crabCount == 0 -> reject, "No crab detected"
  - crabCount > 1 -> reject, "Multiple crabs — photograph one at a time"
  - speciesConfidence < 70% -> warn, ask retake
  - boundingBox coverage < 35% -> warn, crab too small

Results
```

### Target Flow — Web (Post-Capture Validation)
```
Camera / File Upload / Drag-and-Drop -> Preview

Quality Analysis on Canvas (<500ms)
  - Blur detection (Laplacian variance)
  - Brightness (average luminance)
  - Framing (aspect ratio + subject fill)

Webcam Detection
  - If webcam stream is low res (<1280x720), show warning
  - Recommend phone photo upload instead

Quality Score Card
  [FAIL -> Show specific issues, retake or "Submit Anyway"]
  [PASS -> continue]

Upload + AI Analysis -> AI returns species, measurements, crabCount, boundingBox

AI Validation
  - crabCount == 1 -> proceed (hard constraint)
  - crabCount == 0 -> reject, "No crab detected"
  - crabCount > 1 -> reject, "Multiple crabs — photograph one at a time"
  - speciesConfidence < 70% -> warn, ask retake
  - boundingBox coverage < 35% -> warn, crab too small

Results
```

---

## Phase 1 — On-Device Quality Gates (Week 1-2)

### MOBILE

#### P1-1: Real Brightness Detection (Mobile Only)

**Problem**: Accelerometer Z-axis is not a light sensor. Need actual pixel luminance.

**Solution**: Use `expo-camera` preview frame sampling to compute average brightness in real-time.

- Sample camera frames at reduced resolution (64x64)
- Compute average luminance from pixel data
- Replace accelerometer-based brightness in `useCaptureAssistance.ts`
- Thresholds: dark (<0.15), low (0.15-0.4), good (0.4-0.8), bright (>0.8)

**Files**: `useCaptureAssistance.ts`, `GuidedCaptureScreen.tsx`
**Dependencies**: `expo-camera` (already installed)

#### P1-3: View Detection Heuristics (Mobile Only)

**Problem**: `viewAnalysis.ts` always returns `true` for both dorsal and ventral.

**Solution**: Color distribution heuristics to distinguish dorsal vs ventral.

- Dorsal: typically darker, more color variation, patterns
- Ventral: typically lighter, more uniform, white/cream tones
- Compute color variance and average brightness from center region
- Combined with AI `detectView` as a fallback (only run AI if heuristic is uncertain)

**Files**: `viewAnalysis.ts`
**Dependencies**: None new

### WEB

#### P1-4: Web Quality Gate (Web Only)

**Problem**: No client-side validation on web capture. Every photo goes straight to the AI.

**Solution**: Implement Canvas-based quality checks after capture, before upload.

- **Blur**: Laplacian variance on Canvas pixel data
- **Brightness**: Average luminance from pixel data
- **Framing**: Aspect ratio validation, subject fill percentage
- **Webcam warning**: Detect if webcam stream is low resolution (<1280x720), show warning recommending phone upload
- Applies to all input methods: camera capture, file upload, drag-and-drop

**Files**: New `web/src/utils/imageQuality.ts`, `capture/client.tsx`
**Dependencies**: None new — Canvas API is built-in

#### P1-6: Webcam Resolution Detection (Web Only)

**Problem**: Many webcams are 640x480 or 1280x720 — poor quality for species classification.

**Solution**: When user selects camera input, check stream resolution and show a warning card if below threshold.

- Check `MediaStreamTrack.getSettings().width/height`
- Threshold: warn if width < 1280 or height < 720
- Warning: "Your webcam resolution is low. For best results, take photos with your phone and upload them."
- Non-blocking — user can still proceed

**Files**: `capture/client.tsx`
**Dependencies**: None new — `getUserMedia` API already in use

### SHARED

#### P1-2: Real Blur Detection (Shared — Mobile + Web)

**Problem**: Compression ratio heuristic is unreliable. Need Laplacian variance.

**Solution**: Implement Laplacian variance on a downsized thumbnail.

- Resize to 256x256
- Apply 3x3 Laplacian kernel
- Compute variance of result
- Threshold: variance < 100 = blurry, 100-400 = acceptable, >400 = sharp

**Calibration note**: These thresholds are starting points. JavaScript Laplacian at 256x256 produces different magnitudes than OpenCV on full-resolution images. Run threshold calibration against a sample set of known good/poor field photos before hardcoding final values.

**Mobile**: Use `expo-image-manipulator` to resize, then run Laplacian on pixel data.

**Web**: Use Canvas API to read pixel data and compute Laplacian variance directly in JavaScript.

**Shared**: Core algorithm lives in `shared/src/utils/imageQuality.ts`, platform-specific pixel extraction wraps it.

**Files**: New `shared/src/utils/imageQuality.ts`, update `photoService.ts`, new `web/src/utils/imageQuality.ts`
**Dependencies**: None new — use existing Canvas (web) and ImageManipulator (mobile)

### UI — BOTH PLATFORMS

#### P1-5: Quality Gate UI Feedback (Mobile + Web, Platform-Specific UI)

**Problem**: When a photo fails quality, user gets no specific feedback.

**Solution**: Platform-appropriate quality result component.

**Mobile**: Inline quality card after capture, before "Next" button. Shows pass/fail icons per check, specific advice, "Retake" and "Submit Anyway" buttons. Integrated into existing `GuidedCaptureScreen` flow.

**Web**: Quality score card overlay on the preview image. Larger preview visible behind the card. Each check with pass/fail indicator. "Retake" to go back, "Upload Anyway" to override. Non-modal — doesn't block the preview.

**i18n keys**: `quality.*` namespace in both mobile and web locale files

**Files**: New `mobile/src/components/observation/QualityGateCard.tsx`, update `GuidedCaptureScreen.tsx`, update `capture/client.tsx`

---

## Phase 2 — Server Preprocessing (Week 3-4)

### P2-1: Server-Side Quality Gate + Preprocessing

**Problem**: Client-side checks can be bypassed or fail silently. Server should validate before AI call.

**Solution**: Add `sharp` library to server pipeline.

- Resize to thumbnail, compute blur/brightness server-side
- Reject photos that fail minimum thresholds with specific error
- Apply histogram equalization to improve contrast in low-light photos before AI call
- Only pass quality-validated photos to Foundry AI

**Files**: New `server/src/utils/imageQuality.ts`, update `analysisController.ts`
**Dependencies**: `sharp` (npm install)

### P2-2: Auto-Crop + Crab Coverage Validation — ✅ COMPLETED

**Problem**: Photos include background, sky, mud — extra pixels confuse AI and waste tokens. Also, crab may be too small in frame for accurate classification.

**Solution**: Use AI bounding box coordinates to auto-crop and validate minimum coverage.

- Ask GPT-4o Vision to return `boundingBox` in analysis JSON (no new deps, requires prompt change)
- Validate crab occupies >35% of image area — warn if too small
- Server-side re-crop pass using `createCroppedImageDataUrlFromUrl` with `toPixelBox` coordinate normalization
- Configurable via `config.imageQuality.autoCropSecondPassEnabled`

**Files**: `foundryAgent.ts`, `shared/src/types/analysis.ts`, `analysisController.ts`, `server/src/utils/imageQuality.ts`
**Dependencies**: None new

### EXIF-1: EXIF Metadata Extraction for Submission Notes — ✅ COMPLETED

**Problem**: Camera metadata (device model, timestamp, GPS) is lost when photos are uploaded. Researchers want this information preserved in submission notes for provenance and field logging.

**Solution**: Extract EXIF metadata from uploaded photos using `sharp`'s built-in EXIF buffer + custom binary parser (zero new dependencies).

- `sharp(imageBuffer).metadata()` retrieves the EXIF buffer
- Custom binary parser handles Motorola/Intel byte order, IFD entries, GPS rational conversion, and ASCII string extraction
- Stores structured notes as `"Camera: X | Date: Y | GPS: Z"` format
- Injected into `result.suggestions` for client display in submission notes

**Files**: `server/src/utils/imageQuality.ts` (`extractExifMetadata`, `formatExifNotes`), `server/src/controllers/analysisController.ts`
**Dependencies**: None new — uses existing `sharp` v0.34.5

### R-2: Mobile Quality Gate Telemetry — ✅ COMPLETED

**Problem**: Web capture emits quality gate telemetry via `emitQualityTelemetry` → `reportTelemetryError` → `/api/v1/telemetry/error`. Mobile uses identical gate logic but has no telemetry emission, creating a blind spot for monitoring gate effectiveness on the platform where most field captures happen.

**Solution**: Add `reportTelemetryError` to mobile `api.ts` matching web payload structure. Wire telemetry into `GuidedCaptureScreen.tsx` for:
- Quality assessment results (blur/brightness scores, issue codes, overall status)
- Quality override events (when user approves a failed photo with reason)
- View detection results (confidence, dorsal/ventral classification)

All payloads use `[QUALITY_GATE]` message with `platform: 'mobile'` to distinguish from web events in App Insights.

**Files**: `mobile/src/services/api.ts` (`reportTelemetryError`), `mobile/src/screens/observation/GuidedCaptureScreen.tsx` (telemetry calls)
**Dependencies**: None new — reuses existing `/api/v1/telemetry/error` endpoint

### P2-3: Crab Count Validation (Hard Constraint)

**Problem**: No check that exactly one crab is in the photo before sending to AI. Multiple crabs confuse species classification and measurement. Zero crabs waste AI tokens entirely.

**Solution**: Require GPT-4o Vision to return `crabCount` in every analysis response. Enforce strict single-crab rule.

- **0 crabs** → reject with "No crab detected — please retake"
- **1 crab** → proceed
- **>1 crabs** → reject with "Multiple crabs detected — please photograph only one crab at a time"

This is a **hard constraint** — no override allowed. Every observation photo must contain exactly one crab.

**Files**: Update `foundryAgent.ts` system prompt, `shared/src/types/analysis.ts`, `analysisController.ts`
**Dependencies**: None new

---

## Phase 3 — Advanced (Future)

### P3-1: Real-time Crab Detection (Mobile)

Use `expo-camera` frame processor with a lightweight TensorFlow.js model to detect crab presence in real-time before shutter.

**Dependencies**: `@react-native-ml-kit/image-labeling` or custom TFLite model

### P3-2: Drag-to-Crop (Web)

On a large screen with mouse, let the user drag a crop box to reframe the photo before submission. Addresses the "crab too small in frame" problem common with webcams.

**Dependencies**: Lightweight crop library or custom Canvas implementation

### P3-3: Auto-segmentation mask

Generate a segmentation mask to isolate crab from background, improving AI focus and reducing token usage.

### P3-4: Quality scoring dashboard

Track photo quality metrics over time — average blur scores, rejection rates, per-user quality trends.

---

## Dependencies

| Package | Platform | Purpose | Status |
|---|---|---|---|
| `sharp` | Server | Image processing, blur/brightness analysis | Installed |
| `expo-camera` | Mobile | Frame sampling for brightness | Already installed |
| Canvas API | Web | Pixel analysis for blur/brightness | Built-in |
| `getUserMedia` | Web | Webcam resolution detection | Already in use |

---

## Confidence Thresholds

Both AI responses and on-device quality checks use confidence thresholds to determine accept/reject/warn.

### AI Species Classification

| Confidence | Action |
|---|---|
| >90% | Accept — auto-fill species, proceed to review |
| 70-90% | Show possible match — flag for researcher review, allow manual override |
| <70% | Ask user to retake — classification too uncertain |

### Quality Gate Checks

| Check | Threshold | Action |
|---|---|---|
| Blur (Laplacian) | <100 = fail, 100-400 = warn, >400 = pass | Fail blocks upload; warn shows advisory |
| Brightness | <0.15 = fail, 0.15-0.4 = warn, 0.4-0.8 = pass, >0.8 = warn | Fail blocks; warn shows advisory |
| Crab count | 0 = fail, 1 = pass, >1 = fail | Hard constraint — no override |
| Crab coverage | <35% = warn, >35% = pass | Warn only — user can proceed |

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
  issues: string[]         // Human-readable issue codes (for i18n lookup)
}

// AI analysis response — add crabCount and boundingBox
export interface CrabAnalysisResult {
  // ... existing fields ...
  crabCount: number        // Number of crabs detected (hard constraint: must be 1)
  boundingBox?: {          // Optional — for auto-crop and coverage validation
    x: number
    y: number
    width: number
    height: number
  }
  speciesConfidence: number // 0-1 confidence score for species classification
}
```

---

## Operational Hardening Additions

### Calibration Protocol (Before Hard Thresholds)

Run a short calibration cycle before enforcing final blur/brightness limits in production.

- **Sample target**: at least 300 photos total (mobile + web), balanced across pass/fail edge cases.
- **Device mix**: include low/mid/high-tier Android, iPhone, and at least 2 common webcams.
- **Field conditions**: daylight, low light, backlight, wet shell glare, muddy/sandy backgrounds.
- **Labeling rubric**: each photo labeled by 2 reviewers as `usable`, `warn`, or `reject`; resolve disagreements with tie-break review.
- **Promotion path**: `dev thresholds` -> `pilot thresholds (warn-only)` -> `prod thresholds (block where required)`.
- **Recalibration trigger**: rerun calibration whenever false reject rate exceeds 5% for two consecutive weeks.

### Normalized Error Codes (Cross-Platform)

Use stable machine-readable error codes so mobile/web/server display consistent UX and analytics.

- `QUALITY_BLUR_FAIL`
- `QUALITY_BRIGHTNESS_FAIL`
- `QUALITY_VIEW_FAIL`
- `QUALITY_COVERAGE_WARN`
- `QUALITY_WEBCAM_LOW_RES_WARN`
- `CRAB_COUNT_ZERO_FAIL`
- `CRAB_COUNT_MULTI_FAIL`
- `QUALITY_ORIENTATION_INVALID`

Map codes to localized messages through existing i18n keys rather than hardcoded text.

### Image Orientation + Metadata Normalization

Normalize orientation before all quality checks to avoid false negatives.

- Apply EXIF orientation correction before blur/brightness/view analysis.
- Strip or normalize metadata consistently across mobile, web upload, and server preprocessing.
- Ensure width/height used in coverage checks are post-orientation values.

### Performance Budgets

Set explicit budgets so quality gates do not degrade UX.

- **Mobile live sampling**: <= 10 Hz frame sampling, low-res analysis only.
- **Mobile post-capture checks**: <= 200 ms target, <= 500 ms hard ceiling.
- **Web Canvas checks**: <= 500 ms target on mid-tier laptop.
- **Server preprocessing**: <= 300 ms per image median.
- **Fallback behavior**: on timeout, convert hard block checks to `warn` except single-crab constraint.

### Rollout Strategy (Feature Flags + A/B)

Roll out in stages to reduce risk.

- Stage 1: telemetry-only (no UI warnings).
- Stage 2: warn-only UI with override.
- Stage 3: soft block for critical failures.
- Stage 4: hard block for enforced rules.
- Gate each stage behind feature flags per platform (mobile/web/server).
- Keep one-click rollback per gate family (blur, brightness, view, crabCount).

### Telemetry Schema (Quality ROI Tracking)

Track quality outcomes end-to-end to verify impact.

- `qualityGateVersion`
- `platform` (`mobile` | `web` | `server`)
- `blurScore`, `brightnessScore`, `viewConfidence`, `coveragePct`
- `result` (`pass` | `warn` | `fail`)
- `issueCodes[]`
- `overrideUsed`, `overrideReason`
- `aiSpeciesConfidence`, `aiCrabCount`, `analysisAccepted`
- `deviceClass` and input source (`camera`, `upload`, `dragdrop`)

### Override Governance

Preserve user flexibility while preventing abuse.

- Require a reason when overriding failed quality gates.
- Log override actor, timestamp, issue codes, and eventual AI outcome.
- Monitor per-user override rate; alert on sustained high rates (for example >30% over 7 days).
- Keep hard constraint non-overridable: `crabCount !== 1` remains reject.

### Validation Test Matrix (Required)

Add a repeatable QA matrix for quality pipeline validation.

- Very low light, overexposed glare, motion blur, out-of-focus closeup.
- Wet shell reflections and specular highlights.
- Small juvenile crab (<35% frame) and large adult crab.
- Partial occlusion (hand/tool), complex background clutter.
- No crab, one crab, and multiple crabs.
- Webcam 640x480, 1280x720, and phone-upload comparisons.

### Implementation Notes (Runtime Efficiency)

- Web: run Laplacian and heavy pixel operations in a Web Worker when possible.
- Mobile: keep analysis off hot render paths; throttle sensor-derived state updates.
- Share pure scoring utilities in `shared` and keep platform wrappers minimal.

---

## Implementation Order

1. ✅ P2-3: Crab count validation (hard constraint, policy-critical, highest server priority)
2. ✅ P1-2: Blur detection (shared utility, highest impact)
3. ✅ P1-1: Real brightness on mobile (fixes broken accelerometer approach)
4. ✅ P1-4: Web quality gate (brings web to parity with mobile)
5. ✅ P1-6: Webcam resolution detection (web-only, low effort, sets expectations)
6. ✅ P1-3: View detection heuristics (mobile-only, reduces AI calls)
7. ✅ P1-5: Quality gate UI feedback (both platforms, user experience)
8. ✅ P2-1: Server-side quality gate + preprocessing (defense in depth)
9. ✅ P2-2: Auto-crop + coverage validation (re-crop pass with coordinate normalization)
10. ✅ EXIF-1: EXIF metadata extraction for submission notes (sharp-based, zero new deps)
11. Operational hardening: calibration, telemetry, rollout flags, override governance

### Completion Snapshot

- Done: `P2-3`, `P1-2`, `P1-1`, `P1-4`, `P1-6`, `P1-3`, `P1-5`, `P2-1`, `P2-2`, `EXIF-1`, `R-2`
- Not started: Phase 3 advanced items
- Operational hardening still open: feature flags/warn-only rollout controls, calibration sign-off, QA matrix sign-off, production alerting thresholds

---

## Success Metrics

- Reduce AI analysis calls for poor-quality photos by >50%
- Reduce average analysis time by eliminating failed retries
- Improve species classification confidence by reducing noisy inputs
- Provide researchers with specific, actionable feedback on retakes
- Achieve >95% single-crab compliance through hard constraint enforcement
- Reduce multi-crab and zero-crab AI calls to near-zero

---

## Definition of Done (Per Phase)

### Phase 1 — On-Device Quality Gates

- Mobile and web quality checks run locally and return structured `pass` / `warn` / `fail` outputs.
- Blur and brightness checks use real pixel analysis (no accelerometer brightness, no compression-size blur heuristic).
- Quality UI is visible in both mobile and web capture flows with clear retake/override actions.
- All quality issues use normalized error codes and localized message mapping.
- Feature flags exist for each gate family (`blur`, `brightness`, `view`, `webcamRes`) with warn-only mode supported.
- Performance budgets are met in QA on representative devices.

### Phase 2 — Server Preprocessing + Enforcement — ✅ COMPLETED

- Server runs preprocessing and quality validation before AI inference for all uploads.
- `crabCount` is required in AI response, and `crabCount !== 1` is rejected with non-overridable hard constraint.
- Bounding box/coverage handling is wired and validated with post-orientation dimensions.
- Server returns stable error codes and client-safe messages for quality failures.
- End-to-end tests confirm poor photos are blocked server-side even if client checks are bypassed.
- Telemetry captures gate outcomes and AI acceptance/rejection status.
- Auto-crop re-crop pass with `toPixelBox` coordinate normalization is wired and configurable.
- EXIF metadata extraction with binary parser injects camera/date/GPS notes into submission suggestions.

### Phase 3 — Advanced Improvements

- Advanced features (real-time detection, drag-to-crop, segmentation) are behind feature flags.
- Each feature includes measurable impact metrics (accuracy uplift, reject reduction, latency impact).
- No regression to capture latency or crash rate vs Phase 2 baseline.
- Rollback path documented and verified for each advanced capability.

### Operational Readiness (Global)

- Calibration dataset completed and signed off (device mix + field-condition coverage).
- Thresholds promoted through `dev -> pilot -> production` with documented rationale.
- Dashboard/reporting tracks: fail rate, warn rate, override rate, false reject rate, AI confidence distribution.
- Alerting configured for abnormal patterns (for example high override rate or sudden fail spikes).
- QA matrix scenarios executed and recorded before each production promotion.

## Dataset Quality Notes

AI classification accuracy depends entirely on what researchers capture. The quality gates help, but dataset diversity is equally important:

- **Lighting variety**: different times of day, indoor/outdoor, cloudy/sunny
- **Crab state**: wet vs dry, molting vs hard-shell, juvenile vs adult
- **Size range**: small juveniles to large adults
- **Camera diversity**: different phone models, webcams, resolutions
- **Backgrounds**: mud, sand, bucket, tray, tank, natural habitat

The quality gates ensure each photo is technically sound. Dataset diversity ensures the AI generalizes across real-world conditions.

---

## Out of Scope — Known Gaps

These items exist but are not part of the image quality pipeline. They should be tracked separately and addressed in their own workstreams.

### Resolved Gaps

- ~~**Web reset password page not translated**~~ — RESOLVED. Both `auth/forgot-password/page.tsx` and `auth/reset-password/page.tsx` use `useTranslations()` with full i18n coverage in `en.json`/`ms.json`. Added missing `rememberPassword` and `signInLink` keys.
- ~~**Analytics map view missing on mobile**~~ — RESOLVED. Mobile analytics now has a Map tab with `react-native-maps`, status-colored markers, observation info card, fullscreen photo modal, gender filter, and paginated API fetch (up to 5000 observations).

### Remaining

- Phase 3 advanced items (real-time crab detection, drag-to-crop, segmentation mask) — future work
- Operational hardening: calibration sign-off, QA matrix execution, production alerting thresholds
