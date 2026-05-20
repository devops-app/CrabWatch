# CrabWatch — User Acceptance Test (UAT)

> **Version**: 1.0
> **Date**: 2026-05-17
> **Scope**: Full end-to-end testing across Web, Mobile, and Server
> **Seed Password**: `Pa55w.rd` (all seeded accounts)

---

## Test Accounts

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | `admin@crabwatch.my` | `Pa55w.rd` | ADMIN |
| Researcher | `researcher@crabwatch.my` | `Pa55w.rd` | RESEARCHER |
| Citizen | `citizen@crabwatch.my` | `Pa55w.rd` | USER |

---

## Test Result Legend

| Symbol | Meaning |
|--------|---------|
| PASS | Test case passed |
| FAIL | Test case failed |
| BLOCKED | Cannot execute (dependency not ready) |
| N/A | Not applicable to platform |

---

## 1. Authentication & Registration

### 1.1 User Registration

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| AUTH-001 | Register with valid data | 1. Navigate to registration page<br>2. Fill all required fields with valid data<br>3. Password >= 8 chars<br>4. Phone >= 7 chars<br>5. Address line 1 required<br>6. Submit | Account created, redirected to dashboard/home, role = USER | | |
| AUTH-002 | Register with invite token | 1. Open invite link (`/auth/register?token=<token>`)<br>2. Pre-filled email visible and locked<br>3. Fill remaining fields<br>4. Submit | Account created with invited role (RESEARCHER/ADMIN), token marked as used | | |
| AUTH-003 | Register with expired invite | 1. Open invite link with expired token | Error: "This invite has expired" | | |
| AUTH-004 | Register with used invite | 1. Open invite link with already-used token | Error: "This invite has already been used" | | |
| AUTH-005 | Register with email mismatch | 1. Open invite link for `a@b.com`<br>2. Change email to `c@d.com`<br>3. Submit | Error: "Email does not match the invite" | | |
| AUTH-006 | Register with existing email | 1. Register with email of active account | Error: "An account with this email already exists" | | |
| AUTH-007 | Register with short password | 1. Enter password < 8 chars | Validation error on password field | | |
| AUTH-008 | Register with short phone | 1. Enter phone < 7 chars | Error: "Phone number must be at least 7 digits" | | |
| AUTH-009 | Register with missing required fields | 1. Leave name/address/state/postcode/country empty | Validation errors on each missing field | | |
| AUTH-010 | Re-register after soft-delete | 1. Admin soft-deletes user<br>2. User registers with same email | New account created successfully, old account email reassigned | | |

### 1.2 Login

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| AUTH-011 | Login with valid credentials | 1. Enter valid email + password<br>2. Submit | Redirected to dashboard/home, JWT issued (7-day expiry) | | |
| AUTH-012 | Login with wrong password | 1. Enter valid email + wrong password | Error: "Invalid credentials" (401) | | |
| AUTH-013 | Login with invalid email | 1. Enter non-existent email | Error: "Invalid credentials" (401) | | |
| AUTH-014 | Login with short password | 1. Enter password < 6 chars | Validation error on password field | | |
| AUTH-015 | Login as soft-deleted user | 1. Admin soft-deletes account<br>2. Attempt login | Error: "Account has been deleted" (403) | | |
| AUTH-016 | Login as blocked user | 1. Admin blocks account<br>2. Attempt login | Error: "Account has been suspended" (403) | | |
| AUTH-017 | Logout | 1. Click Sign Out from header menu | Session cleared, redirected to login | | |

### 1.3 Password Reset

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| AUTH-018 | Request password reset | 1. Click "Forgot password?"<br>2. Enter valid email<br>3. Submit | Message: "If the email exists, a reset link has been sent"<br>Email received with reset link | | |
| AUTH-019 | Request reset for non-existent email | 1. Enter non-existent email | Same success message (silent fail for security) | | |
| AUTH-020 | Reset with valid token | 1. Open reset link from email<br>2. Enter new password >= 8 chars<br>3. Submit | Password updated, can login with new password | | |
| AUTH-021 | Reset with expired token | 1. Wait > 1 hour after token creation<br>2. Attempt reset | Error: "Invalid or expired reset token" (400) | | |
| AUTH-022 | Reset with reused token | 1. Reset password successfully<br>2. Reopen same reset link | Error: "Invalid or expired reset token" (400) | | |
| AUTH-023 | Reset with short password | 1. Enter password < 8 chars | Validation error on password field | | |
| AUTH-024 | Change password (logged in) | 1. Enter current password + new password >= 8 chars<br>2. Submit | Password updated, can login with new password | | |
| AUTH-025 | Change password with wrong current | 1. Enter wrong current password | Error: "Current password is incorrect" (400) | | |
| AUTH-026 | Change password same as current | 1. Enter same password for current and new | Error: "New password must be different from current password" (400) | | |

---

## 2. Profile Management

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| PROF-001 | View profile | 1. Navigate to profile page | Name, email, role, phone, address, avatar, observation count displayed | | |
| PROF-002 | Update name | 1. Edit name (1-100 chars)<br>2. Save | Name updated, persisted on reload | | |
| PROF-003 | Update phone | 1. Enter phone code (max 5 chars) + number (7-20 chars)<br>2. Save | Phone updated | | |
| PROF-004 | Update address | 1. Fill address fields<br>2. Save | Address updated (line1-3, state, postcode, country) | | |
| PROF-005 | Upload avatar | 1. Select image file<br>2. Save | Avatar displayed in profile and header | | |
| PROF-006 | Clear nullable fields | 1. Set phone/address fields to null/empty<br>2. Save | Fields cleared without error | | |
| PROF-007 | Name too long | 1. Enter name > 100 chars | Validation error | | |

---

## 3. AI-Guided Capture Flow

### 3.1 Guided Photo Capture (Mobile)

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| CAP-001 | Full guided capture | 1. Tap "New" tab<br>2. Capture dorsal photo with coin reference<br>3. Capture ventral photo<br>4. Optionally capture close-up | All photos captured with quality gates passed | N/A | |
| CAP-002 | Coin reference detection | 1. Place MYR coin next to crab<br>2. Capture photo | Coin detected, info persisted in `detectedCoin` field | N/A | |
| CAP-003 | Portrait mode lock | 1. Rotate device to landscape | "Rotate to portrait" overlay shown | N/A | |
| CAP-004 | Shake detection | 1. Shake hand while capturing | Shake warning shown (std dev > 6 = slight, > 15 = heavy) | N/A | |
| CAP-005 | Low brightness warning | 1. Capture in dim lighting | Brightness warning shown | N/A | |
| CAP-006 | Tap-to-focus | 1. Tap on crab in viewfinder | Focus indicator appears, autofocus triggered | N/A | |
| CAP-007 | View validation (wrong view) | 1. Capture ventral when dorsal expected | Warning card with specific issues shown | N/A | |
| CAP-008 | GPS capture | 1. Allow location permission<br>2. Capture location | GPS coordinates recorded, method = GPS | N/A | |
| CAP-009 | Manual location pick | 1. Open map picker<br>2. Drop pin on map | Coordinates recorded, method = MANUAL | N/A | |

### 3.2 Web Capture with Map

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| CAP-010 | Map-based location pick | 1. Navigate to capture page<br>2. Click on Mapbox map | Marker placed at clicked coordinates | | N/A |
| CAP-011 | Map marker visibility | 1. Zoom in/out on map | Marker remains visible and properly positioned at all zoom levels | | N/A |
| CAP-012 | AI species auto-match | 1. AI returns species name<br>2. Species dropdown populated | `findSpeciesMatch` tries UUID -> exact -> partial/fuzzy match | | N/A |
| CAP-013 | Species UUID validation | 1. Enter invalid UUID as speciesId | Validation error — strict UUID format required | | N/A |
| CAP-014 | Upload photos via library | 1. Select photos from file picker<br>2. Upload | Photos uploaded to blob storage | | N/A |

### 3.3 Analysis & Review

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| CAP-015 | Analysis loading | 1. Submit photos for analysis | Loading screen with progress indicators shown | | |
| CAP-016 | AI review — correct results | 1. Review AI-detected species, gender, maturation<br>2. Values are correct | All fields pre-filled correctly | | |
| CAP-017 | AI review — edit fields | 1. AI returns incorrect species<br>2. Manually select correct species from dropdown | Species updated, saved on submit | | |
| CAP-018 | AI review — weight not filled | 1. Check weight field | Weight is empty/null — never auto-filled by AI | | |
| CAP-019 | Analysis failure fallback | 1. Simulate AI failure | Falls back to manual observation form with photos | | |
| CAP-020 | Blob cleanup | 1. Complete analysis | Analysis photos deleted from Azure Storage after 60s | | |

---

## 4. Observation Submission

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| OBS-001 | Submit valid observation | 1. Fill all required fields<br>2. speciesId = valid UUID<br>3. cw > 0 and <= 50<br>4. gender = MALE/FEMALE/UNKNOWN<br>5. maturation = MATURE/IMMATURE/UNKNOWN<br>6. lat -90 to 90, lng -180 to 180<br>7. At least 1 photo URL<br>8. Submit | Observation created (201), status = PENDING | | |
| OBS-002 | Submit with null weight | 1. Leave weight empty<br>2. Submit | Observation created successfully, bw = null | | |
| OBS-003 | Submit with weight | 1. Enter weight > 0 and <= 5000<br>2. Submit | Observation created, weight saved | | |
| OBS-004 | Submit with cw > 50 | 1. Enter cw = 51 | Validation error | | |
| OBS-005 | Submit with bw > 5000 | 1. Enter bw = 5001 | Validation error | | |
| OBS-006 | Submit with invalid lat/lng | 1. Enter lat = 91 or lng = 181 | Validation error | | |
| OBS-007 | Submit with notes | 1. Enter notes (max 1000 chars)<br>2. Submit | Notes saved, sanitized | | |
| OBS-008 | Submit with detected coin | 1. Enter detected coin info (max 200 chars)<br>2. Submit | Coin info saved | | |
| OBS-009 | New species auto-upsert | 1. AI returns unknown species name<br>2. Submit observation | Server auto-creates species via upsert, observation linked | | |
| OBS-010 | XP awarded on submit | 1. Submit observation as citizen | XP awarded for `OBSERVATION_SUBMIT`, streak updated | | |
| OBS-011 | First observation bonus | 1. Submit first-ever observation | XP awarded for `FIRST_OBSERVATION`, onboarding step completed | | |
| OBS-012 | New species bonus | 1. Submit observation of species user has never recorded | XP awarded for `NEW_SPECIES` | | |

---

## 5. Observation Management

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| OBS-013 | View own observations | 1. Login as citizen<br>2. View observation list | Only own observations visible | | |
| OBS-014 | Researcher sees all | 1. Login as researcher<br>2. View observation list | All observations visible | | |
| OBS-015 | Admin sees all | 1. Login as admin<br>2. View observation list | All observations visible | | |
| OBS-016 | Filter by species | 1. Select species filter | Only matching observations shown | | |
| OBS-017 | Filter by status | 1. Select PENDING/APPROVED/REJECTED | Only matching status shown | | |
| OBS-018 | Filter by gender | 1. Select MALE/FEMALE/UNKNOWN | Only matching gender shown | | |
| OBS-019 | Filter by date range | 1. Set dateFrom and dateTo | Only observations within range shown (dateTo includes end of day) | | |
| OBS-020 | Pagination | 1. Navigate through pages | Correct observations per page, page navigation works | | |
| OBS-021 | Observation detail | 1. Click observation | Photos, measurements, biological data, location, validation info displayed | | |
| OBS-022 | Fullscreen image | 1. Click observation photo | Fullscreen overlay/modal with image | | |
| OBS-023 | SAS URL refresh | 1. View observation with photos | Photos load with fresh SAS URLs (valid for 1 hour) | | |
| OBS-024 | USER cannot view other's observation | 1. Login as citizen<br>2. Access another user's observation detail URL | Error: "Access denied" (403) | | |
| OBS-025 | Observation not found | 1. Access non-existent observation ID | Error: "Observation not found" (404) | | |

---

## 6. Researcher Validation

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| RES-001 | View pending observations | 1. Login as researcher<br>2. Navigate to validation page | All PENDING observations listed | | |
| RES-002 | Approve observation | 1. Select pending observation<br>2. Click Approve | Status = APPROVED, validatedBy = researcher ID, validatedAt set | | |
| RES-003 | Reject observation | 1. Select pending observation<br>2. Enter rejection reason<br>3. Click Reject | Status = REJECTED, reason saved | | |
| RES-004 | Reject without reason | 1. Select pending observation<br>2. Click Reject (no reason) | Rejection succeeds (reason is optional) | | |
| RES-005 | Rejection reason max length | 1. Enter reason > 500 chars | Validation error | | |
| RES-006 | XP on approval | 1. Researcher approves observation | Author gets `OBSERVATION_APPROVED` XP, researcher gets `VALIDATION` XP | | |
| RES-007 | Push notification on approval | 1. Author has FCM token registered<br>2. Researcher approves observation | Push notification sent to author | | |
| RES-008 | Push notification on rejection | 1. Author has FCM token registered<br>2. Researcher rejects observation | Push notification with rejection reason sent to author | | |
| RES-009 | USER cannot validate | 1. Login as citizen<br>2. Attempt to call validation API | Error: "Insufficient permissions" (403) | | |
| RES-010 | Filter pending by species | 1. Select species filter on pending list | Only matching species shown | | |

---

## 7. Species Management

### 7.1 Species Browse (All Users)

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| SPEC-001 | Browse species list | 1. Navigate to species page | All species displayed with scientific and common names | | N/A |
| SPEC-002 | Search species | 1. Enter search term | Filtered results for matching species | | N/A |
| SPEC-003 | Species detail modal | 1. Click species | Scientific name, common name, description, key features, distribution zones, images shown | N/A | N/A |
| SPEC-004 | Dynamic species from API | 1. Mobile fetches species from `GET /api/v1/species` | Species list populated from backend (no hardcoded list) | N/A | |

### 7.2 Admin Species CRUD

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| SPEC-005 | Create species | 1. Login as admin<br>2. Fill scientific name, common name, description<br>3. Add key features (JSON: trait/value pairs)<br>4. Add image URLs<br>5. Add distribution zones (JSON: name + polygon)<br>6. Submit | Species created (201) | | |
| SPEC-006 | Update species | 1. Edit existing species fields<br>2. Save | Species updated | | |
| SPEC-007 | Delete species | 1. Delete species | Species removed | | |
| SPEC-008 | Create with missing required fields | 1. Leave scientific name empty | Validation error | | |
| SPEC-009 | Invalid image URL | 1. Enter invalid URL in images array | Validation error | | |
| SPEC-010 | USER cannot manage species | 1. Login as citizen<br>2. Attempt species CRUD API calls | Error: "Insufficient permissions" (403) | | |

---

## 8. Analytics

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| ANAL-001 | Overview stats | 1. Navigate to analytics | Total observations, species count, user count displayed | | |
| ANAL-002 | Size frequency chart | 1. View size frequency | Carapace width distribution histogram rendered | | |
| ANAL-003 | Gender ratio | 1. View gender ratio | Male/Female/Unknown breakdown displayed | | |
| ANAL-004 | CW50 display | 1. View CW50 metric | Carapace width at 50% maturation shown | | |
| ANAL-005 | Condition indices | 1. View condition indices | Condition factor calculations displayed (null bw observations skipped) | | |
| ANAL-006 | Temporal trends | 1. View temporal trends | Observation count over time chart rendered | | |
| ANAL-007 | Species distribution | 1. View species distribution | Observation count per species displayed | | |
| ANAL-008 | Defensive against bad data | 1. API returns non-array response | App handles gracefully (no crash, `.catch(() => [])` guards) | N/A | |

---

## 9. Admin Panel

### 9.1 User Management

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| ADM-001 | List active users | 1. Login as admin<br>2. Users tab > Active sub-tab | All active users listed with name, email, role | | |
| ADM-002 | Search users | 1. Enter search term (name or email) | Filtered results shown | | |
| ADM-003 | Filter users by role | 1. Select role filter | Only matching role shown | | |
| ADM-004 | Update user role | 1. Change user role to RESEARCHER/ADMIN | Role updated, persisted | | |
| ADM-005 | Soft-delete user | 1. Click delete on user<br>2. Type confirmation word "delete"<br>3. Confirm | User soft-deleted, `deletedAt` set, `expiresAt` shown, `retentionDays: 30` | | |
| ADM-006 | Cannot delete self | 1. Admin attempts to delete own account | Error: "Cannot delete your own account" (400) | | |
| ADM-007 | Restore soft-deleted user | 1. Deleted sub-tab<br>2. Click restore on user within 30 days | User restored, `deletedAt` cleared | | |
| ADM-008 | Cannot restore expired user | 1. User deleted > 30 days ago<br>2. Attempt restore | Error: "User has exceeded retention period and cannot be restored" (400) | | |
| ADM-009 | Block user | 1. Click block on user<br>2. Type confirmation word "block"<br>3. Optional: enter reason (max 500 chars)<br>4. Confirm | User blocked, `blockedAt` set, cannot login | | |
| ADM-010 | Cannot block self | 1. Admin attempts to block own account | Error: "Cannot block your own account" (400) | | |
| ADM-011 | Unblock user | 1. Click unblock on blocked user | `blockedAt` and `blockReason` cleared, can login | | |
| ADM-012 | Already blocked | 1. Attempt to block already-blocked user | Error: "User is already blocked" (400) | | |
| ADM-013 | Cleanup expired users | 1. Click cleanup<br>2. Type confirmation word "cleanup"<br>3. Confirm | Users past 30-day retention permanently deleted, `deletedCount` returned | | |
| ADM-014 | List deleted users | 1. Deleted sub-tab | Soft-deleted users listed with `expiresAt` | | |
| ADM-015 | Pagination on user list | 1. Navigate through user pages | Correct users per page (default 20) | | |

### 9.2 Invite Management

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| ADM-016 | Create invite | 1. Invites sub-tab<br>2. Enter email, select role (RESEARCHER/ADMIN)<br>3. Optional: set expiry (1-8760 hours, default 168)<br>4. Submit | Invite created, email sent to invitee | | |
| ADM-017 | Invite email received | 1. Check invitee inbox | Email from `CrabWatch <onboarding@resend.dev>` with registration link containing token | | |
| ADM-018 | Validate invite (public) | 1. Call `GET /api/v1/invite/validate?token=<token>` | Token status returned (no auth required) | | |
| ADM-019 | List invites | 1. Invites sub-tab | All invites listed with email, role, expiry, used status | | |
| ADM-020 | Invite max expiry | 1. Set expiry > 8760 hours | Validation error | | |
| ADM-021 | Invite min expiry | 1. Set expiry < 1 hour | Validation error | | |

### 9.3 Backup Management

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| ADM-022 | Create backup | 1. Backup tab<br>2. Click Create Backup | Gzip-compressed JSON file created in `./backups`, filename: `crabwatch_backup_YYYYMMDD_HHMMSS.json.gz` | | |
| ADM-023 | List backups | 1. View backup list | Backups listed with filename, size, creation date (newest first) | | |
| ADM-024 | Download backup | 1. Click download on backup | File downloaded | | |
| ADM-025 | Delete backup | 1. Click delete on backup | Backup removed from disk | | |
| ADM-026 | Backup contents | 1. Download and decompress backup | JSON contains observations, species, users, fcmTokens | | |

---

## 10. Gamification & Engagement

### 10.1 Leaderboard

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| GAM-001 | View leaderboard | 1. Navigate to leaderboard page | Users ranked by totalXP, with level and title | | |
| GAM-002 | Scope toggle | 1. Toggle between All Time / Seasonal | Leaderboard updates to selected scope | N/A | |
| GAM-003 | Current user position | 1. View leaderboard | Current user's position highlighted ("You" badge on mobile) | | |
| GAM-004 | Pagination | 1. Navigate through pages | Correct users per page (default 50) | | |
| GAM-005 | Pull-to-refresh (mobile) | 1. Pull down on leaderboard | Leaderboard refreshes | N/A | |
| GAM-006 | Medal display | 1. Top 3 users | Gold/Silver/Bronze medals shown | N/A | |
| GAM-007 | Gamification disabled | 1. Set `ENGAGEMENT_ENABLED=false`<br>2. Access leaderboard API | Error: "Gamification not enabled" (501) | | |

### 10.2 Missions

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| GAM-008 | View active missions | 1. Navigate to missions page | Active missions listed with progress bars and XP rewards | | |
| GAM-009 | Daily missions tab | 1. Switch to daily missions | Only daily cadence missions shown | N/A | |
| GAM-010 | Onboarding missions tab | 1. Switch to onboarding | Onboarding flow missions shown | N/A | |
| GAM-011 | Claim mission | 1. Click claim on mission | Mission claimed, progress tracking starts | | |
| GAM-012 | Mission completion | 1. Complete mission requirements (e.g., submit N observations)<br>2. Progress reaches target | Mission marked COMPLETED, XP awarded with `MISSION_COMPLETE` action type | | |
| GAM-013 | Mission idempotency | 1. Complete same mission twice in one day | XP only awarded once (idempotency key: `mission:<userId>:<missionId>:<date>`) | | |
| GAM-014 | Missions disabled | 1. Set `MISSIONS_ENABLED=false`<br>2. Access missions API | Error: "Missions not enabled" (501) | | |

### 10.3 Achievements

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| GAM-015 | View achievements | 1. Navigate to achievements page | Achievements listed with rarity colors, progress tracking | | |
| GAM-016 | Filter by category | 1. Select category filter | Only matching category shown | N/A | |
| GAM-017 | Filter by status | 1. Select earned/unearned filter | Only matching status shown | N/A | |
| GAM-018 | Auto-award achievement | 1. Complete achievement criteria (e.g., 10 observations) | Achievement auto-unlocked, XP awarded | | |
| GAM-019 | Check achievements | 1. Tap "Check Achievements" | Progress recalculated, any earned achievements unlocked | N/A | |

### 10.4 Onboarding

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| GAM-020 | View onboarding status | 1. Navigate to onboarding | All active flows with step-by-step progress, percentage shown | | |
| GAM-021 | Auto-complete onboarding step | 1. Submit first observation | `first_observation` step auto-completed | | |
| GAM-022 | Manual complete step | 1. Call complete step API with valid step key | Step marked complete | | |
| GAM-023 | Complete invalid step | 1. Call complete step with non-existent key | Error: "Onboarding step not found" (404) | | |

### 10.5 XP System

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| GAM-024 | XP awarded on observation submit | 1. Submit observation | XP added based on active `GamificationRule` for `OBSERVATION_SUBMIT` | | |
| GAM-025 | XP awarded on approval | 1. Researcher approves observation | Author receives XP for `OBSERVATION_APPROVED` | | |
| GAM-026 | XP awarded on validation | 1. Researcher validates observation | Researcher receives XP for `VALIDATION` | | |
| GAM-027 | First observation bonus | 1. Submit first-ever observation | XP for `FIRST_OBSERVATION` awarded (one-time) | | |
| GAM-028 | New species bonus | 1. Submit observation of new species | XP for `NEW_SPECIES` awarded | | |
| GAM-029 | Streak tracking | 1. Submit observation on consecutive days | `currentStreak` increments, streak bonus XP awarded | | |
| GAM-030 | Streak reset | 1. Skip a day, then submit | `currentStreak` reset to 1, no streak bonus | | |
| GAM-031 | Level up | 1. Accumulate XP past level threshold | Level and title updated, AuditLog entry created | | |
| GAM-032 | XP history | 1. View XP transaction history | All XP transactions listed with action type, delta, timestamp | | |
| GAM-033 | Idempotency | 1. Same action triggers twice (e.g., double-submit) | XP only awarded once | | |
| GAM-034 | Leaderboard cache refresh | 1. Award XP<br>2. View leaderboard within 60s | Leaderboard may show cached data (60s TTL default, 120s all-time) | | |

### 10.6 Community Page (Web)

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| GAM-035 | Insights tab | 1. Navigate to community > Insights | AI-generated insights displayed (streak warnings, milestones, diversity, activity trends) | | N/A |
| GAM-036 | Top contributors tab | 1. Navigate to community > Top Contributors | Top contributors listed | | N/A |
| GAM-037 | Stats tab | 1. Navigate to community > Stats | Engagement statistics displayed | | N/A |

---

## 11. Admin Engagement Management

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| ADMG-001 | View XP rules | 1. Engagement admin > XP Rules | All gamification rules listed with action type, XP amount, active status | | N/A |
| ADMG-002 | Create XP rule | 1. Add new rule with action type, XP amount, time window | Rule created, audit logged | | N/A |
| ADMG-003 | Update XP rule | 1. Edit existing rule | Rule updated, audit logged | | N/A |
| ADMG-004 | Delete XP rule | 1. Delete rule | Rule removed (204), audit logged | | N/A |
| ADMG-005 | View level configs | 1. Engagement admin > Levels | All level configs listed with XP threshold, level, title | | N/A |
| ADMG-006 | Create level config | 1. Add new level with XP threshold, level number, title | Level created, audit logged | | N/A |
| ADMG-007 | Manual XP adjustment | 1. Enter userId, deltaXP (+/-), reason<br>2. Submit | XP adjusted, transaction created, leaderboard cache invalidated | | N/A |
| ADMG-008 | XP recalculation (dry-run) | 1. Select mode = dry-run<br>2. Execute | Discrepancies reported, no changes applied | | N/A |
| ADMG-009 | XP recalculation (execute) | 1. Select mode = execute<br>2. Execute | Discrepancies corrected, adjustment transactions created, cache invalidated | | N/A |
| ADMG-010 | View audit log | 1. Engagement admin > Audit Log | All engagement-related actions listed with actor, action, resource, timestamps | | N/A |
| ADMG-011 | View abuse detection | 1. Engagement admin > Abuse Detection | Abuse signals listed with user, type, severity, score | | N/A |
| ADMG-012 | Create achievement | 1. Enter code, name, description, category<br>2. Submit | Achievement created with defaults (rarity=common, xpReward=0, isHidden=false, isActive=true) | | N/A |
| ADMG-013 | Manual award achievement | 1. Select achievement, enter userId and reason<br>2. Submit | Achievement awarded to user | | N/A |
| ADMG-014 | Duplicate achievement award | 1. Award same achievement to same user twice | Error: "User already has this achievement" (409) | | N/A |
| ADMG-015 | Create mission definition | 1. Enter code, name, description, cadence, criteria (JSON)<br>2. Submit | Mission created with defaults (xpReward=0, maxClaimsPerUser=1, active=true) | | N/A |
| ADMG-016 | Create season | 1. Enter code, name, startsAt, endsAt<br>2. Submit | Season created with `isActive: false` | | N/A |
| ADMG-017 | Activate season | 1. Activate a season | Season activated, all other active seasons deactivated (only one active at a time) | | N/A |
| ADMG-018 | View engagement metrics | 1. Engagement admin > Metrics | Health metrics displayed: user activity, XP distribution, streaks, missions, abuse signals | | N/A |
| ADMG-019 | RESEARCHER cannot access engagement admin | 1. Login as researcher<br>2. Access engagement admin API | Error: "Insufficient permissions" (403) | | N/A |

---

## 12. Abuse Detection

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| ABUSE-001 | Velocity detection (1h, medium) | 1. Submit > 10 observations in 1 hour | Medium severity signal created, score = min(100, count * 2) |
| ABUSE-002 | Velocity detection (1h, high) | 1. Submit > 20 observations in 1 hour | High severity signal created, score = min(100, count * 3) |
| ABUSE-003 | Velocity detection (24h, high) | 1. Submit > 50 observations in 24 hours | High severity signal created, score = min(100, count * 1.5) |
| ABUSE-004 | Duplicate detection | 1. Submit > 3 observations with same species within 10m distance in 1 hour | Duplicate signal created, severity based on count (> 10 = high) |
| ABUSE-005 | Coordinate clustering | 1. Submit > 10 observations in 7 days where > 80% share same coordinates (4 decimal precision) | Clustering signal created |
| ABUSE-006 | Critical risk auto-action | 1. Composite score >= 80 | `FLAG_FOR_REVIEW` + `DISABLE_XP_AWARDS` applied |
| ABUSE-007 | High risk auto-action | 1. Composite score >= 60 | `FLAG_FOR_REVIEW` applied |
| ABUSE-008 | Low risk no action | 1. Composite score < 30 | No auto-actions |

---

## 13. Dashboard & Navigation

| ID | Test Case | Steps | Expected Result | Web | Mobile |
|----|-----------|-------|-----------------|-----|--------|
| DASH-001 | Dashboard home | 1. Login, view dashboard | Stats cards and recent submissions table displayed | | N/A |
| DASH-002 | Sidebar navigation | 1. Click sidebar items | Correct pages loaded (Dashboard, Capture, Species, Analytics, Leaderboard, Missions, Community, Profile, Admin) | N/A | N/A |
| DASH-003 | Header user menu | 1. Click avatar in header | Dropdown with Profile and Sign Out | N/A | N/A |
| DASH-004 | Mobile bottom tabs | 1. Navigate bottom tabs | Home, Analytics, New tab work correctly | N/A | |
| DASH-005 | Researcher tab (mobile) | 1. Login as researcher | Researcher tab visible in navigation | N/A | |
| DASH-006 | Admin tab (mobile) | 1. Login as admin | Admin tab visible in navigation | N/A | |
| DASH-007 | No researcher/admin tab for USER | 1. Login as citizen | Researcher and Admin tabs hidden | N/A | |
| DASH-008 | Gamification quick-actions | 1. View home screen | Leaderboard/Missions/Achievements quick-action cards visible | N/A | |
| DASH-009 | Profile XP stats card | 1. View profile | Level, title, totalXP, currentStreak, XP to next level displayed | N/A | |

---

## 14. Error Handling & Edge Cases

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| ERR-001 | Unauthenticated API access | 1. Call protected endpoint without token | 401 "Authentication required" |
| ERR-002 | Insufficient permissions | 1. USER calls admin endpoint | 403 "Insufficient permissions" |
| ERR-003 | Server misconfigured (no JWT_SECRET) | 1. Start server without JWT_SECRET | 401 "Server misconfigured: JWT_SECRET not set" |
| ERR-004 | Web error boundary | 1. Trigger React error on web | Error boundary catches error, POSTs to `/api/v1/telemetry/error` |
| ERR-005 | SAS URL refresh failure | 1. Simulate blob storage unavailable during refresh | Original URL preserved (graceful degradation) |
| ERR-006 | Notes sanitization | 1. Submit observation with HTML/JS in notes | Sanitized via `sanitizeText()`, no script execution |
| ERR-007 | Rejection reason sanitization | 1. Researcher rejects with HTML in reason | Sanitized before storage |
| ERR-008 | Case-insensitive email | 1. Register with `User@Example.com`, login with `user@example.com` | Login succeeds |
| ERR-009 | Enum case insensitivity | 1. Submit observation with `gender: "male"` (lowercase) | Uppercased to `MALE` before storage |
| ERR-010 | Double confirmation bypass | 1. Attempt destructive admin action without typing confirmation word | Action blocked until correct word entered |

---

## 15. Deployment & Health

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| DEP-001 | Server health check | 1. GET `https://crabwatch-api.azurewebsites.net/health` | 200 OK |
| DEP-002 | Server deployed | 1. Run `scripts/deploy-server.ps1` | Server built, packaged, deployed, dependencies installed, DB seeded |
| DEP-003 | Web deployed | 1. Run `scripts/deploy-web.ps1` | Web built, packaged, deployed to Azure App Service |
| DEP-004 | API proxy (web) | 1. Web app calls API via `/api/*` | Requests proxied to `BACKEND_URL` via Next.js rewrites |
| DEP-005 | App Insights telemetry | 1. Trigger API requests and errors | Requests and errors captured in Application Insights |
| DEP-006 | Telemetry endpoint | 1. POST to `/api/v1/telemetry/error` | Frontend errors logged to App Insights |

---

## 16. Mobile UX (Dark Mode, Safe Area, Deep Linking)

### 16.1 Dark Mode

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| UX-001 | Light mode default | 1. Device in light mode | App uses light color palette |
| UX-002 | Switch to dark mode | 1. Toggle device to dark mode | All screens update to dark palette |
| UX-003 | Tab bar dark mode | 1. View tab bar in dark mode | Tab icons and labels visible on dark background |
| UX-004 | Status bar adapts | 1. Toggle between light/dark | Status bar content visible (light/dark style) |
| UX-005 | All screens dark safe | 1. Navigate all screens in dark mode | No inverted/invisible text |

### 16.2 Safe Area

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| UX-006 | iPhone notch/home indicator | 1. Run on iPhone with notch | Tab bar not obscured by home indicator |
| UX-007 | Android without notch | 1. Run on Android device | Tab bar renders at normal bottom position |
| UX-008 | Orientation change | 1. Rotate to landscape then back | Layout re-adjusts correctly |

### 16.3 Deep Linking

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| UX-009 | Cold start deep link | 1. App not running, open `crabwatch://reset-password/<token>` | App opens to ResetPassword screen with token pre-filled |
| UX-010 | Background deep link | 1. App in background, open deep link | App foregrounds to ResetPassword screen |
| UX-011 | Invalid deep link token | 1. Open link with invalid token | ResetPassword screen shows error on submit |
| UX-012 | Unknown URL scheme | 1. Open `crabwatch://unknown/path` | App opens to default home/login |

---

## 17. Web Performance & Modernization

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| PERF-001 | Analytics lazy-loading | 1. Open analytics page | Shell loads fast; map/chart chunks load on tab selection |
| PERF-002 | Community Server Component | 1. Open `/dashboard/community` | Data fetched server-side via `fetch()` + cookies |
| PERF-003 | Community client interactivity | 1. Interact with community page | Client component handles likes, comments, etc. |
| PERF-004 | Admin page extraction | 1. Open admin page | Lightweight shell loads; tab components render on selection |

---

## Execution Summary Template

| Module | Total | Pass | Fail | Blocked | N/A |
|--------|-------|------|------|---------|-----|
| 1. Auth & Registration | 26 | | | | |
| 2. Profile Management | 7 | | | | |
| 3. Capture Flow | 20 | | | | |
| 4. Observation Submission | 12 | | | | |
| 5. Observation Management | 13 | | | | |
| 6. Researcher Validation | 10 | | | | |
| 7. Species Management | 10 | | | | |
| 8. Analytics | 8 | | | | |
| 9. Admin Panel | 26 | | | | |
| 10. Gamification | 23 | | | | |
| 11. Admin Engagement | 19 | | | | |
| 12. Abuse Detection | 8 | | | | |
| 13. Dashboard & Navigation | 9 | | | | |
| 14. Error Handling | 10 | | | | |
| 15. Deployment & Health | 6 | | | | |
| 16. Mobile UX | 12 | | | | |
| 17. Web Performance | 4 | | | | |
| **TOTAL** | **223** | | | | |
