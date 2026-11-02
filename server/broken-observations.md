# Unrecoverable Observation Photos — Recovery Report

**Incident date:** 2026-07-04 (all affected blobs dated 2026-07-04)
**Database:** `crabwatch-db.postgres.database.azure.com` (production, remote)
**Storage:** `crabwatch04052026.blob.core.windows.net` / container `crabwatch-uploads`

## Summary

**61 observations** reference the temporary `/analysis/` blob path instead of the permanent
`/observations/` folder. **All 61 are UNRECOVERABLE** — the source images no longer exist in
Azure Storage and no orphaned copies exist in `/observations/`.

| Metric | Count |
|---|---|
| Observations with `/analysis/` photo URLs | **61** |
| Fully missing (all photos gone) | 53 |
| Partially missing (some photos gone) | 8 |
| Total missing photo slots | 171 |
| Source `/analysis/` blobs still in storage | **0 of 171** |
| Orphaned `/observations/` blobs matching a missing photo | **0** |
| **Recoverable** | **0** |
| **Unrecoverable** | **61** |

All 61 observations were created on **2026-07-04** by **5 users**. 56 are `PENDING` and
**5 are `APPROVED`** (approved by a researcher despite having no viewable images).

## Root Cause

Two compounding bugs:

1. **Broken URL fallback** — `createObservation` in
   [`observationController.ts`](src/controllers/observationController.ts) copies each
   `/analysis/` blob to `/observations/` under a temporary ID (`temp_<timestamp>`). When a copy
   fails, the code silently falls back to the **original `/analysis/` URL** and stores it in the
   DB. So the DB ends up holding a mix of good `/observations/` SAS URLs and dead `/analysis/` URLs.

2. **TTL cleanup deleted the sources** — `startCleanupTimer()` in
   [`analysisController.ts`](src/controllers/analysisController.ts) runs every 5 minutes and
   deletes `/analysis/` blobs for sessions idle longer than `ANALYSIS_BLOB_TTL_MS` (default
   **2 hours**). The July 4 source blobs were deleted by this timer before the observations were
   submitted, so the `/analysis/` URLs in the DB now point to blobs that no longer exist.

At runtime, `refreshPhotoUrls` detects the dead `/analysis/` blobs and substitutes
`placeholder://missing`, so the app shows a placeholder — but the underlying image data is gone.

## Why Nothing Could Be Recovered

Three independent checks were run against the **production** database and storage:

1. **Source availability**: For each of the 171 `/analysis/` URLs stored in the DB, a
   `blobExists` check was performed. **Result: 0 of 171 exist.** Every source blob was deleted
   by the TTL timer.

2. **Orphan matching**: All 647 `/observations/` blobs were listed. 536 are referenced by some
   observation; **126 are orphans** (not referenced by any observation). Each orphan was matched
   against the broken observations by `userId + date + photo index`. **Result: 0 orphans match
   any broken observation.** The 126 orphans are all `.heic` files dated **2026-06-25 /
   2026-06-27** belonging to different users — unrelated to the July 4 incident.

3. **Cross-date check**: The 345 blobs still present under `/analysis/` are dated **2026-06-27**
   with different session IDs. **0** of them cross-match the 171 DB URLs (dated 2026-07-04).

Conclusion: there is no surviving copy of any of the 171 missing photos anywhere in storage.

## Unrecoverable Observations (61)

### User `fe921352-4cdf-44f9-a975-3b51eeae0565` — 25 observations (Blue Swimming Crab)

| # | Observation ID | Status | Missing |
|---|---|---|---|
| 1 | `b2b9b011-7bcc-4dd8-b668-2d0a167316c7` | PENDING | 1/3 |
| 2 | `6c62b148-ab35-4529-a19c-05d1d4461f5f` | PENDING | 1/3 |
| 3 | `15a3da3f-50ce-46cd-9e67-c25c7191f999` | PENDING | 1/3 |
| 4 | `6ee98d8d-bd71-4237-b9ed-8223aa4c29ad` | PENDING | 1/3 |
| 5 | `83f6ce7b-25a8-4931-bd1f-7f0d53809efb` | PENDING | 3/3 |
| 6 | `093b1b9c-b0dd-4238-ad6f-d43d9170d3d8` | PENDING | 3/3 |
| 7 | `01cbd910-0caa-4cbe-9bfc-081eac5c69ad` | PENDING | 3/3 |
| 8 | `03d2bea8-2c52-4d3f-9a6c-4c6d28211965` | PENDING | 3/3 |
| 9 | `7176b743-1472-4758-8777-538522aed77e` | PENDING | 3/3 |
| 10 | `96c5cc1c-3586-4c53-8947-b2c3ae1c9e8b` | PENDING | 3/3 |
| 11 | `6b0ca903-9e99-4e0a-bc93-9515d32b23e9` | PENDING | 3/3 |
| 12 | `7ed7fd82-afbc-4898-9870-772fc41970f8` | PENDING | 3/3 |
| 13 | `9bb6c6dd-3ee5-441a-bc73-53001439ee35` | PENDING | 3/3 |
| 14 | `ac060afe-a107-420a-adb8-ade10cb309ca` | PENDING | 3/3 |
| 15 | `5cbc9293-5c59-4e25-b6bd-a4d00b2d9b8c` | PENDING | 3/3 |
| 16 | `5004c26c-3841-4f1b-ac93-97ddb3c4e027` | PENDING | 3/3 |
| 17 | `2af8f9d2-f62e-4bd3-8154-39e8e06eb8b5` | PENDING | 3/3 |
| 18 | `14cca8ae-07ee-49af-a13f-2ff870f91961` | PENDING | 3/3 |
| 19 | `356766a2-4898-43d7-b42c-9cc8e69e5892` | PENDING | 3/3 |
| 20 | `0261c4b4-8f7e-47c8-ab56-bb2a4826c9fa` | PENDING | 3/3 |
| 21 | `dc73fb5f-370c-4e65-88b7-2e5f660a466b` | PENDING | 3/3 |
| 22 | `10a09021-73af-4baa-b1ff-a3d0444b52b2` | PENDING | 3/3 |
| 23 | `ca62edda-f347-4313-83c9-7bb7ba8895dd` | PENDING | 3/3 |
| 24 | `281410d8-1d13-4801-8c41-2e0bc8ef84bb` | PENDING | 3/3 |
| 25 | `befd6278-e88c-40c2-88ae-cf09a1e996f7` | **APPROVED** | 3/3 |

### User `964d42df-431d-4469-9a04-450b62eb29bb` — 23 observations (Orange Mud Crab)

| # | Observation ID | Status | Missing |
|---|---|---|---|
| 1 | `c05a6f2d-6d09-42ca-999e-d2808d62cd40` | PENDING | 3/3 |
| 2 | `634ca082-e03d-4470-92b0-ea6b424da1c9` | PENDING | 3/3 |
| 3 | `f9dfb35f-23ea-432f-939c-13a3170a36ef` | PENDING | 3/3 |
| 4 | `e130e0fb-a60b-41bd-be29-ab604b15e9e2` | PENDING | 3/3 |
| 5 | `3d83ec94-725e-41be-af94-02628e377946` | PENDING | 3/3 |
| 6 | `adf2e4e1-2a36-47ea-b298-3b6d3999b581` | PENDING | 3/3 |
| 7 | `37ab640d-9fce-49fb-89d8-6684ca5da4f8` | PENDING | 3/3 |
| 8 | `2380d826-f047-43df-8aba-0ca78dda27c3` | PENDING | 3/3 |
| 9 | `58122637-e4f3-44c1-ab51-42f97f7e4750` | PENDING | 3/3 |
| 10 | `132b70ee-3ccf-4b3c-8152-4c7f9ae68119` | PENDING | 3/3 |
| 11 | `8224ee4d-e9e0-4ad7-96f4-28c33b8fa7ce` | PENDING | 3/3 |
| 12 | `ce72a507-0826-4458-adef-4adc546951c8` | PENDING | 3/3 |
| 13 | `25cdb3c5-8195-4d61-962e-f6db07546a5f` | PENDING | 3/3 |
| 14 | `7f81d51d-bda7-4eb5-8638-c13b7478006e` | PENDING | 3/3 |
| 15 | `e0a501e9-91a3-4ef1-bc68-61c6c8c6b215` | PENDING | 3/3 |
| 16 | `d2c1adb5-e09a-42fc-9be7-008482d54097` | PENDING | 3/3 |
| 17 | `0c8de6d4-8e3e-4e03-adeb-0e789893e88f` | PENDING | 3/3 |
| 18 | `7c9d810e-496b-4ac2-9fa0-271527ee6b0e` | PENDING | 3/3 |
| 19 | `19725646-ee68-4c7c-87d8-d8f1a42cb688` | PENDING | 3/3 |
| 20 | `3e9b2e20-5579-4ce8-a0a2-fed6494aa6fe` | PENDING | 3/3 |
| 21 | `8d615729-eab2-4476-b57d-88a4e779d6ea` | PENDING | 3/3 |
| 22 | `604f3ae1-02ee-4e20-8479-4275d6e74cbc` | PENDING | 3/3 |
| 23 | `a3234d70-9ae6-44e8-8b1d-99706cb5a35d` | **APPROVED** | 3/3 |

### User `ec231146-a366-4382-b6e2-b0b78883a816` — 9 observations (Purple Mud Crab)

| # | Observation ID | Status | Missing |
|---|---|---|---|
| 1 | `d2c3f1f1-0567-4812-bfb6-8a1ce4ee9019` | PENDING | 2/3 |
| 2 | `426ca172-50ca-47ad-8957-7207095a27f4` | PENDING | 2/3 |
| 3 | `f93d8879-caec-4cdb-83cd-c1bdd56ef256` | PENDING | 2/3 |
| 4 | `f4604894-c0d8-4d56-994d-db3914ec18cf` | PENDING | 2/3 |
| 5 | `7e3aeca3-27fa-4c25-9b0c-6d74fe14bc3e` | PENDING | 3/3 |
| 6 | `7dda252c-33e4-4a16-af14-f34c52db4ade` | PENDING | 3/3 |
| 7 | `30508b95-ee23-4598-b207-a0ad2660b5ac` | PENDING | 3/3 |
| 8 | `25d78f20-e3fe-40db-9c78-9e56dc5cf10c` | PENDING | 3/3 |
| 9 | `f4e21ed8-e46d-4217-a69c-c9946f7ed0a8` | **APPROVED** | 3/3 |

### User `36ed9075-6db4-4636-bf12-0f8de8f109da` — 3 observations (Purple Mud Crab)

| # | Observation ID | Status | Missing |
|---|---|---|---|
| 1 | `800902b7-4e60-4c34-9a8c-4b481bfb493f` | PENDING | 3/3 |
| 2 | `aecae52d-987a-4f2e-b1b2-021706ebb3e3` | **APPROVED** | 3/3 |
| 3 | `ef30c989-f451-40fb-a64a-28a35d8dc357` | **APPROVED** | 3/3 |

### User `83275290-372b-4d97-a36b-5b5a65f2ebda` — 1 observation (Blue Swimming Crab)

| # | Observation ID | Status | Missing |
|---|---|---|---|
| 1 | `8ed6948f-e9fe-4e7a-a58f-6dbf957cf525` | PENDING | 3/3 |

## Recommended Follow-Up (Root-Cause Fixes)

These are **not** part of the recovery (the data is gone) but will prevent recurrence:

1. **Use the real observation ID for the blob copy.** `createObservation` should create the
   observation row first (to get its UUID), then copy `/analysis/` blobs to
   `/observations/<userId>/<date>/<obsId>-<index>.<ext>` — not `temp_<timestamp>`.

2. **Do not fall back to the `/analysis/` URL on copy failure.** If a copy fails, surface the
   error (or retry) rather than persisting a URL that the TTL timer will delete.

3. **Make the TTL cleanup safe.** `startCleanupTimer()` should only delete `/analysis/` blobs
   that have been **successfully copied** to `/observations/` (i.e., are no longer the only
   copy), or the TTL should be extended well beyond the realistic capture→submit window.

4. **Re-review the 5 APPROVED observations** — they were approved by a researcher without any
   viewable images. Consider flagging them for re-validation or marking them as image-missing.
