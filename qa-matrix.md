# CrabWatch — Image Quality QA Matrix

> **Purpose**: Repeatable validation of the image quality pipeline before each production promotion.
> **Run**: `cd server && npx tsx scripts/runQAMatrix.ts <test-images-dir>`

---

## Quality Gate Thresholds (Current)

| Gate | Metric | Fail | Warn | Pass |
|------|--------|------|------|------|
| **Blur** | Laplacian variance | <100 | 100–400 | >400 |
| **Brightness** | Avg luminance (0–1) | <0.15 | 0.15–0.4 or >0.8 | 0.4–0.8 |
| **Crab Count** | AI detection | 0 or >1 | — | exactly 1 |
| **Coverage** | BBox / image area % | — | <35% | >35% |

## Rollout Modes

| Mode | Gate Effect |
|------|-------------|
| `off` | Gate disabled — always pass |
| `warn` | Gate runs but never blocks — advisory only |
| `soft_block` | Gate blocks but user can override with reason |
| `hard_block` | Gate blocks, no override (crab count is always hard) |

---

## Test Matrix

### Group A: Lighting Conditions

| # | Scenario | Expected Blur | Expected Brightness | Notes |
|---|----------|--------------|-------------------|-------|
| A1 | Very low light (night, no flash) | pass | **fail** (<0.15) | Should block upload |
| A2 | Overexposed glare (direct sun, white washout) | pass | **warn** (>0.8) | Advisory only |
| A3 | Normal daylight, diffused | pass | pass | Baseline pass |
| A4 | Indoor artificial light, moderate | pass | pass or warn (low) | Depends on intensity |
| A5 | Backlit subject (sun behind crab) | pass | **warn** (low) or **fail** | Edge case — may need retake |

### Group B: Focus & Sharpness

| # | Scenario | Expected Blur | Expected Brightness | Notes |
|---|----------|--------------|-------------------|-------|
| B1 | Motion blur (hand shake during capture) | **fail** (<100) | — | Should block upload |
| B2 | Out-of-focus closeup (macro, shallow DOF miss) | **fail** or **warn** | — | Depends on severity |
| B3 | Sharp focus, good lighting | pass | pass | Baseline pass |
| B4 | Slight softness (acceptable quality) | **warn** (100-400) | pass | Advisory only |

### Group C: Subject Framing & Coverage

| # | Scenario | Expected Coverage | Expected Crab Count | Notes |
|---|----------|------------------|-------------------|-------|
| C1 | Small juvenile crab (<35% frame) | **warn** (<35%) | 1 | Advisory — user can proceed |
| C2 | Large adult crab filling frame | pass (>35%) | 1 | Ideal |
| C3 | Partial occlusion (hand/tool in frame) | varies | 1 | May confuse AI count |
| C4 | Complex background clutter | varies | 1 | May confuse AI count |

### Group D: Crab Count (Hard Constraint)

| # | Scenario | Expected Crab Count | Expected Outcome | Notes |
|---|----------|-------------------|-----------------|-------|
| D1 | No crab (empty beach, water only) | 0 | **REJECT** | No override |
| D2 | Exactly one crab | 1 | **PASS** | Proceed to review |
| D3 | Multiple crabs in frame | >1 | **REJECT** | No override |
| D4 | Crab + debris that looks like crab | varies | AI-dependent | Edge case — review needed |

### Group E: Surface & Reflection

| # | Scenario | Expected Blur | Expected Brightness | Notes |
|---|----------|--------------|-------------------|-------|
| E1 | Wet shell reflections (specular highlights) | pass | pass or warn (high) | Highlights may skew brightness |
| E2 | Dry shell, matte surface | pass | pass | Baseline |
| E3 | Water surface reflection in photo | varies | varies | May confuse AI |

### Group F: Resolution & Source

| # | Scenario | Expected Outcome | Notes |
|---|----------|-----------------|-------|
| F1 | Webcam 640×480 upload | Gate runs, may flag low res | Web-only — `webcamRes` gate |
| F2 | Webcam 1280×720 upload | Gate runs, should pass | Web baseline |
| F3 | Phone camera upload (high res) | Gate runs, should pass | Mobile baseline |
| F4 | Compressed/low-quality JPEG | May affect blur score | Compression artifacts |

---

## Execution Protocol

1. **Prepare test images**: Collect representative photos for each scenario in Groups A–F.
2. **Run matrix**: `cd server && npx tsx scripts/runQAMatrix.ts <test-images-dir>`
3. **Review results**: Compare actual gate outcomes against expected outcomes in this document.
4. **Record mismatches**: Any scenario where actual ≠ expected is a calibration candidate.
5. **Calibrate**: Use `npm run calibrate` with labeled dataset to adjust thresholds.
6. **Sign-off**: All scenarios must match expected outcomes before production promotion.

---

## Result Format

The runner outputs a JSON report (`qa-matrix-report.json`) with:

```json
{
  "timestamp": "2026-05-31T...",
  "thresholds": { "blur": { "fail": 100, "warn": 400 }, "brightness": { "fail": 0.15, "warnLow": 0.4, "warnHigh": 0.8 } },
  "totalImages": 12,
  "passed": 10,
  "failed": 2,
  "results": [
    {
      "file": "a1-dark.jpg",
      "group": "A",
      "scenario": "Very low light",
      "blurScore": 450,
      "blurStatus": "pass",
      "brightness": 0.08,
      "brightnessStatus": "fail",
      "expectedBlur": "pass",
      "expectedBrightness": "fail",
      "match": true
    }
  ]
}
```
