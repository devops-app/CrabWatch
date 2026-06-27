# Broken Observations — Missing Photos

> **Generated**: 2026-06-27
> **Total**: 15 observations with 2 out of 3 photos as `placeholder://missing`
> **Root cause**: Source blobs in `/analysis/` deleted before restore. Dorsal photo OK (copied to `/observations/`), ventral + close-up irrecoverable.

| # | ID | Status | Created (UTC) | Observation Link |
|---|---|---|---|---|
| 1 | `2eb0643c-3f6e-4e7e-a274-1a1e8777ec63` | APPROVED | 2026-05-18 07:04:42 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/2eb0643c-3f6e-4e7e-a274-1a1e8777ec63 |
| 2 | `2d8d6ffa-6e91-4692-8d6d-ded0561615bc` | PENDING | 2026-06-27 02:03:57 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/2d8d6ffa-6e91-4692-8d6d-ded0561615bc |
| 3 | `d58d493c-ffb8-4921-a158-3e3cd9758ab6` | PENDING | 2026-06-27 02:03:58 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/d58d493c-ffb8-4921-a158-3e3cd9758ab6 |
| 4 | `cfe6bb31-c98d-41b4-a808-d5aacd5a0a44` | PENDING | 2026-06-27 02:03:58 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/cfe6bb31-c98d-41b4-a808-d5aacd5a0a44 |
| 5 | `1b5d925b-4a78-4997-ad94-9a225957c6ef` | PENDING | 2026-06-27 02:03:59 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/1b5d925b-4a78-4997-ad94-9a225957c6ef |
| 6 | `14b66c3e-7a78-482e-b23d-87cca8f4adae` | PENDING | 2026-06-27 02:03:59 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/14b66c3e-7a78-482e-b23d-87cca8f4adae |
| 7 | `e593a7fd-0fac-4da3-84ef-d93552174006` | PENDING | 2026-06-27 02:04:00 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/e593a7fd-0fac-4da3-84ef-d93552174006 |
| 8 | `f527b15b-8a19-48fe-8096-c68cebeb1c89` | PENDING | 2026-06-27 02:04:01 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/f527b15b-8a19-48fe-8096-c68cebeb1c89 |
| 9 | `4c2e0070-94be-4d5a-b2ad-d37379c04e7a` | PENDING | 2026-06-27 02:04:02 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/4c2e0070-94be-4d5a-b2ad-d37379c04e7a |
| 10 | `c85690d7-9b14-4846-9702-cf048b4e3691` | PENDING | 2026-06-27 02:04:03 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/c85690d7-9b14-4846-9702-cf048b4e3691 |
| 11 | `57650381-cac8-46d6-873f-6881a0f1b74e` | PENDING | 2026-06-27 02:49:14 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/57650381-cac8-46d6-873f-6881a0f1b74e |
| 12 | `24f8c55c-1a51-414e-a0fc-9e459d6fd3d1` | PENDING | 2026-06-27 02:49:15 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/24f8c55c-1a51-414e-a0fc-9e459d6fd3d1 |
| 13 | `0c4df8e8-842d-407d-80fa-3755abc09ddb` | PENDING | 2026-06-27 02:49:15 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/0c4df8e8-842d-407d-80fa-3755abc09ddb |
| 14 | `7794b524-4431-4c5b-8e56-c9d7814768e0` | PENDING | 2026-06-27 02:49:16 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/7794b524-4431-4c5b-8e56-c9d7814768e0 |
| 15 | `778d65e5-6e32-47f0-a4a3-787f97db449f` | PENDING | 2026-06-27 02:52:27 | https://crabwatch-web.azurewebsites.net/en/dashboard/observation/778d65e5-6e32-47f0-a4a3-787f97db449f |

## Photo State Per Observation

Each observation has 3 photo slots:

| Slot | State |
|---|---|
| Dorsal (index 0) | ✅ Valid — copied to `/observations/` with fresh SAS URL |
| Ventral (index 1) | ❌ `placeholder://missing` — source blob deleted |
| Close-up (index 2) | ❌ `placeholder://missing` — source blob deleted |

## User Breakdown

| User ID | Count |
|---|---|
| `a61a5738-b2c4-46ff-b31f-e136577bbe65` | 1 |
| `a944b293-ba32-4626-a47f-a03fc43a1360` | 10 |
| `3b588ca4-9b5b-467c-8ddc-58a47478c632` | 4 |

## Recovery Options

1. **Ask users to re-capture** — ventral and close-up photos are missing; dorsal is intact.
2. **Delete observations** — if data is no longer needed (all 14 PENDING can be safely removed).
3. **Leave as-is** — web/mobile gracefully handle `placeholder://missing` with a fallback UI.
