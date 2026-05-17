# Crab Analyzer — Prompt Optimization Analysis

> **Agent**: crab-analyzer (v1)
> **Prompt Location**: `server/src/services/foundryAgent.ts` (`SYSTEM_INSTRUCTIONS`, lines 19-82)
> **Analysis Date**: 2026-05-17

---

## Current Prompt Structure

| Section | Lines | Purpose |
|---------|-------|---------|
| Role definition | 1 | Marine biology field research assistant |
| Species identification | 13 | Open-ended species list with 8 common Malaysian species |
| Size reference (coins) | 17 | Dual MYR coin series with exact diameters |
| Gender determination | 4 | Ventral view cues |
| Maturity assessment | 3 | Size and visual feature thresholds |
| Analysis approach | 5 | Step-by-step workflow |
| Output format | 14 | JSON schema definition |
| Quality guardrails | 2 | Honesty about uncertainty |

---

## Identified Optimization Opportunities

### 1. Species Identification — Taxonomic Hierarchy Missing

**Problem**: The species list is flat — no genus-level grouping or decision tree. The AI must compare against all 8 species independently, increasing confusion between similar species (e.g., all 4 Scylla species).

**Impact**: Species misidentification between Scylla siblings (serrata vs olivacea vs paramamosain vs tranquebarica)

**Fix**: Add genus-level grouping with decision criteria:
```
## SCYLLA GENUS DECISION TREE
All Scylla species are mud crabs. Differentiate by:
1. Color: Blue/mottled → serrata | Olive-green → olivacea | Greenish → paramamosain | Light/narrow → tranquebarica
2. Size: tranquebarica (smallest) < paramamosain < serrata ≈ olivacea
3. Shell texture: serrata (mottled pattern) vs olivacea (smoother) vs paramamosain (smooth)
```

### 2. Confidence Scoring — No Calibration Guidance

**Problem**: The prompt says "confidence: 0.0 to 1.0" but gives no guidance on what confidence levels mean. The AI may overconfidently assign 0.95 to uncertain identifications.

**Impact**: Overconfident wrong answers are worse than honest uncertainty

**Fix**: Add confidence calibration rubric:
```
## CONFIDENCE CALIBRATION
- 0.9-1.0: Distinctive features clearly visible, multiple confirming traits
- 0.7-0.9: Key features visible but some ambiguity (e.g., similar genus species)
- 0.5-0.7: Partial visibility, one view only, or subtle distinguishing features
- 0.3-0.5: Poor quality, very limited visibility, unusual angle
- 0.0-0.3: Cannot identify — return speciesId as "unknown"
```

### 3. Size Estimation — No Error Margin or Range

**Problem**: The prompt asks for a single CW estimate but photos have perspective distortion, angle variance, and coin placement distance issues. A single number implies false precision.

**Impact**: Researchers may trust an estimate that's off by 2-3cm due to perspective

**Fix**: Add estimation caveats and suggest range-based thinking:
```
## SIZE ESTIMATION NOTES
- CW estimates from photos have ~15% error due to perspective and angle
- If coin is not adjacent to crab (further in frame), estimate may be 10-20% off
- Note any perspective concerns in suggestions
- Round to nearest 0.5cm for practical field use
```

### 4. Gender Determination — Edge Cases Missing

**Problem**: Only covers male (triangular) vs female (broad) vs unknown. Missing sub-adult males with transitional abdomen shapes, and cases where abdomen is partially visible.

**Impact**: Sub-adult males may be misidentified as female

**Fix**: Add edge case guidance:
```
## GENDER EDGE CASES
- Sub-adult male: abdomen wider than adult male but not fully rounded — classify as "male" with lower confidence
- Partially visible abdomen: if triangular shape is clear even partially, classify as "male" with caveat
- Damaged abdomen: if flap is broken or missing, return "unknown"
```

### 5. Maturity Assessment — CW Threshold Too Rigid

**Problem**: The 8cm CW threshold for maturity is species-dependent. Scylla tranquebarica matures at ~5cm CW while Scylla serrata may not mature until 10cm+.

**Impact**: Smaller species classified as immature when actually mature

**Fix**: Make maturity species-aware:
```
## MATURITY (species-dependent thresholds)
- Scylla serrata/olivacea: mature if CW > 8cm + visual cues
- Scylla paramamosain: mature if CW > 6cm + visual cues
- Scylla tranquebarica: mature if CW > 5cm + visual cues
- Portunus species: mature if CW > 5cm + visual cues
- Always consider visual cues (coloration, claw development, shell ridges) alongside size
```

### 6. Output Format — Missing Field Validation

**Problem**: The JSON schema allows any string for `speciesId` but the backend expects slugified format. No guidance on slugification rules.

**Impact**: Inconsistent speciesId formats (e.g., "Scylla serrata" vs "scylla-serrata")

**Fix**: Add explicit slugification rules:
```
## SPECIES ID FORMAT
- Always lowercase, hyphen-separated: "scylla-serrata", "portunus-pelagicus"
- No spaces, no special characters, no uppercase
- Unknown species: use "unknown" (not "unidentified" or "unknown-species")
```

### 7. View Detection — Missing Ambiguity Handling

**Problem**: The view detection prompt (lines 84-98) doesn't handle photos that are neither clearly dorsal nor ventral (e.g., 45-degree angle, side view).

**Impact**: Misclassification of angled photos

**Fix**: Add angled view handling:
```
## ANGLED VIEWS
- 45-degree or side angle: return "unknown" with reasoning about angle
- Partial dorsal + partial ventral: return whichever view shows more features, note angle in reasoning
```

### 8. Multi-Photo Analysis — No Priority Guidance

**Problem**: When multiple photos are provided, the prompt says "examine all photos together" but doesn't specify which photo takes priority for which field.

**Impact**: Inconsistent use of multi-photo information

**Fix**: Add photo priority rules:
```
## MULTI-PHOTO PRIORITY
- Species ID: dorsal view (primary), ventral (secondary confirmation)
- Gender: ventral view (primary), dorsal (cannot determine)
- Size: photo with clearest coin reference (regardless of view)
- Maturity: combine all views — dorsal for coloration/shell, ventral for abdomen development
```

---

## Recommended `requestedChanges` for `prompt_optimize`

When running the `prompt_optimize` MCP tool, use this as the `requestedChanges` parameter:

```
1. Add genus-level decision tree for Scylla species differentiation (color → size → texture)
2. Add confidence calibration rubric with explicit thresholds for each range
3. Add size estimation error margin guidance (~15% perspective error)
4. Add gender edge cases for sub-adult males and partially visible abdomens
5. Make maturity assessment species-aware with different CW thresholds per species
6. Add explicit speciesId slugification rules (lowercase, hyphen-separated)
7. Add angled view handling for view detection (45-degree, side view)
8. Add multi-photo priority rules (dorsal for species, ventral for gender, best coin for size)
```

---

## Phase 2 Custom Evaluator (Post-Initial Eval)

After the initial built-in eval run reveals specific failure patterns, create a custom evaluator:

```yaml
name: species_detection_accuracy
category: quality
scoringType: ordinal
minScore: 1
maxScore: 5
passThreshold: 3
promptText: |
  Evaluate whether the agent correctly identified the crab species from the photo description.
  ## Query
  {{query}}
  ## Response
  {{response}}
  ## Expected Behavior
  {{expected_behavior}}
  
  Score 5 if species matches expected exactly.
  Score 4 if same genus but wrong species.
  Score 3 if plausible species but wrong (reasonable confusion).
  Score 2 if completely wrong family.
  Score 1 if hallucinated species with no basis in photo description.
  
  Also verify: confidence score is calibrated (high confidence for clear cases, low for ambiguous),
  coin detection matches expected, gender determination follows visual cues correctly.
```

---

## Execution Plan

| Step | Action | Tool | Status |
|------|--------|------|--------|
| 1 | Initialize `.foundry/` workspace | Manual | Done |
| 2 | Create seed dataset (20 cases) | Manual | Done |
| 3 | Discover existing evaluators | `evaluator_catalog_get` | Pending |
| 4 | Run Phase 1 eval (built-in only) | `evaluation_agent_batch_eval_create` | Pending |
| 5 | Analyze failures, cluster patterns | `evaluation_get` | Pending |
| 6 | Optimize prompt with `requestedChanges` | `prompt_optimize` | Pending |
| 7 | Review optimized prompt, sign off | Manual | Pending |
| 8 | Deploy new agent version | `agent_update` | Pending |
| 9 | Re-evaluate with same dataset | `evaluation_agent_batch_eval_create` | Pending |
| 10 | Compare versions | `evaluation_comparison_create` | Pending |
