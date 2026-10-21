# App Insights Queries - Quality Gate Telemetry

This helper provides ready-to-run KQL queries for the web capture quality gate telemetry (`category=quality-gate`).

## Scope

- Source: `POST /api/v1/telemetry/error` payloads with `message = "[QUALITY_GATE]"`
- Structured fields logged by server: `event`, `result`, `view`, `inputSource`, `issueCodes`, `blurScore`, `brightness`, `coveragePct`, `overrideUsed`

## 0) Base Dataset (Reusable)

Use this as the base for all queries below:

```kusto
let QualityEvents = traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| extend
    event = tostring(customDimensions.event),
    result = tostring(customDimensions.result),
    view = tostring(customDimensions.view),
    inputSource = tostring(customDimensions.inputSource),
    issueCodesRaw = tostring(customDimensions.issueCodes),
    blurScore = todouble(customDimensions.blurScore),
    brightness = todouble(customDimensions.brightness),
    coveragePct = todouble(customDimensions.coveragePct),
    overrideUsed = tobool(customDimensions.overrideUsed),
    qualityGateVersion = tostring(customDimensions.qualityGateVersion);
QualityEvents
```

## 1) Quality Result Trend (Pass/Warn/Fail)

```kusto
let QualityEvents = traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| where tostring(customDimensions.event) == "quality_result"
| extend result = tostring(customDimensions.result);
QualityEvents
| summarize count() by bin(timestamp, 1d), result
| order by timestamp asc
```

## 2) Fail Rate by Day

```kusto
let QualityEvents = traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| where tostring(customDimensions.event) == "quality_result"
| extend result = tostring(customDimensions.result);
QualityEvents
| summarize
    total = count(),
    fails = countif(result == "fail")
  by bin(timestamp, 1d)
| extend failRatePct = iff(total == 0, 0.0, round(100.0 * todouble(fails) / todouble(total), 2))
| order by timestamp asc
```

## 3) Override Rate by Day

```kusto
let OverrideEvents = traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| where tostring(customDimensions.event) == "quality_override"
| extend overrideUsed = tobool(customDimensions.overrideUsed);
OverrideEvents
| summarize
    overrides = countif(overrideUsed == true),
    totalOverrideEvents = count()
  by bin(timestamp, 1d)
| extend overrideRatePct = iff(totalOverrideEvents == 0, 0.0, round(100.0 * todouble(overrides) / todouble(totalOverrideEvents), 2))
| order by timestamp asc
```

## 4) Top Issue Codes (Last 30 Days)

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| where tostring(customDimensions.event) == "quality_result"
| extend issueCodes = parse_json(tostring(customDimensions.issueCodes))
| mv-expand issueCode = issueCodes
| summarize count() by issueCode = tostring(issueCode)
| order by count_ desc
```

## 5) Breakdown by View and Input Source

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| where tostring(customDimensions.event) == "quality_result"
| extend
    result = tostring(customDimensions.result),
    view = tostring(customDimensions.view),
    inputSource = tostring(customDimensions.inputSource)
| summarize count() by view, inputSource, result
| order by view asc, inputSource asc, result asc
```

## 6) Webcam Low-Resolution Warning Trend

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| where tostring(customDimensions.event) == "webcam_warning"
| summarize count() by bin(timestamp, 1d)
| order by timestamp asc
```

## 7) Median Quality Scores (Operational Baseline)

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate"
| where tostring(customDimensions.event) == "quality_result"
| summarize
    p50Blur = percentile(todouble(customDimensions.blurScore), 50),
    p50Brightness = percentile(todouble(customDimensions.brightness), 50),
    p50Coverage = percentile(todouble(customDimensions.coveragePct), 50)
  by bin(timestamp, 1d)
| order by timestamp asc
```

## Dashboard / Workbook Starter Tiles

Create a workbook named `CrabWatch Quality Gate` with these tiles:

1. **Fail Rate (7d/30d)** - Query #2
2. **Pass/Warn/Fail Trend** - Query #1
3. **Override Rate** - Query #3
4. **Top Issue Codes** - Query #4
5. **By View + Input Source** - Query #5
6. **Webcam Low-Res Warnings** - Query #6
7. **Median Quality Score Baseline** - Query #7

## Suggested Alerts

- Fail rate > 25% over 1 day
- Override rate > 30% over 7 days
- `QUALITY_BLUR_FAIL` jumps > 2x baseline week-over-week
- Webcam warning volume spikes > 50% day-over-day

## Notes

- If your Application Insights environment stores logs under `AppTraces` instead of `traces`, replace `traces` with `AppTraces`.
- Keep query windows aligned with release windows when validating quality gate tuning.

---

## Server Quality Gate (`category=quality-gate-server`)

These queries track server-side pre-AI checks from `analysisController` logs.

### S1) Server Block Trend (Blur vs Brightness)

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate-server"
| where message has "blocked request"
| extend reason = case(
    message has "blur", "blur",
    message has "brightness", "brightness",
    "other"
  )
| summarize count() by bin(timestamp, 1d), reason
| order by timestamp asc
```

### S2) Server Warning Volume

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate-server"
| where message == "Server quality warnings observed"
| summarize count() by bin(timestamp, 1d)
| order by timestamp asc
```

### S3) Server Quality Summary Baseline

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate-server"
| summarize
    avgBlurScore = avg(todouble(customDimensions.avgBlurScore)),
    avgBrightness = avg(todouble(customDimensions.avgBrightness)),
    totalPhotos = sum(toint(customDimensions.photoCount)),
    blurFails = sum(toint(customDimensions.blurFailCount)),
    brightnessFails = sum(toint(customDimensions.brightnessFailCount)),
    blurWarns = sum(toint(customDimensions.blurWarnCount)),
    brightnessWarns = sum(toint(customDimensions.brightnessWarnCount))
  by bin(timestamp, 1d)
| order by timestamp asc
```

### S4) Server Fail/Warning Ratios

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate-server"
| summarize
    photos = sum(toint(customDimensions.photoCount)),
    blurFails = sum(toint(customDimensions.blurFailCount)),
    brightnessFails = sum(toint(customDimensions.brightnessFailCount)),
    blurWarns = sum(toint(customDimensions.blurWarnCount)),
    brightnessWarns = sum(toint(customDimensions.brightnessWarnCount))
  by bin(timestamp, 1d)
| extend
    blurFailRatePct = iff(photos == 0, 0.0, round(100.0 * todouble(blurFails) / todouble(photos), 2)),
    brightnessFailRatePct = iff(photos == 0, 0.0, round(100.0 * todouble(brightnessFails) / todouble(photos), 2)),
    blurWarnRatePct = iff(photos == 0, 0.0, round(100.0 * todouble(blurWarns) / todouble(photos), 2)),
    brightnessWarnRatePct = iff(photos == 0, 0.0, round(100.0 * todouble(brightnessWarns) / todouble(photos), 2))
| order by timestamp asc
```

### S5) Coverage Warning Trend (`event=coverage_warn`)

```kusto
traces
| where timestamp > ago(30d)
| where tostring(customDimensions.category) == "quality-gate-server"
| where tostring(customDimensions.event) == "coverage_warn"
| summarize
    warningCount = count(),
    avgCoveragePct = avg(todouble(customDimensions.crabCoveragePct)),
    minCoveragePct = min(todouble(customDimensions.crabCoveragePct)),
    maxCoveragePct = max(todouble(customDimensions.crabCoveragePct))
  by bin(timestamp, 1d)
| order by timestamp asc
```
