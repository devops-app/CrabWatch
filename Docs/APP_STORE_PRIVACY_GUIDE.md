# CrabWatch — App Store Connect: App Privacy Reference

> Use this to complete the **App Privacy** section in App Store Connect.
> Only an **Admin** (or a user with the "App Privacy" role) can fill this in.
> Source of truth: `web/public/legal/en/consent.md` (PDPA 2010 statement).
> Data Controller: **Universiti Malaysia Terengganu (UMT)** · Technical Provider: **Dsigncodehub**

---

## Step 1 — "Does this app collect any data?"

**Yes.**

---

## Step 2 — Data Types

For each type below, App Store Connect asks three questions:
1. **How is the data used?** (App Functionality / Advertising / Product Personalization / Developer Analytics / Other)
2. **Is it linked to the user's identity?** (Yes / No)
3. **Is it used for tracking?** (Yes / No) — *tracking* means linking to other companies' data or sharing for cross-app behavioral advertising.

### ✅ Data the app DOES collect

| Data Type | Used For | Linked to Identity? | Tracking? | Notes |
|---|---|---|---|---|
| **Account Data** (name, email, password) | App Functionality | **Yes** | No | Login, profile, researcher/admin roles |
| **User Content** (photos of crabs) | App Functionality | **Yes** | No | Observation photos uploaded to Azure Blob Storage |
| **Location** (Precise) | App Functionality | **No** | No | GPS tag on each observation; public maps blur coordinates |
| **Diagnostics** (crash logs, usage logs) | App Functionality | **No** | No | App Insights telemetry, error reporting |

> In the App Store Connect UI, select these four data types and answer the sub-questions as shown.
> For **Location**, choose **Precise** (the app records exact GPS coordinates on submission).

### ❌ Data the app does NOT collect (leave unselected)

- Contact Data
- Health or Fitness Data
- Financial Data
- Browsing History / Search History
- Identifiers (advertising ID, etc.)
- Contacts / Email used for marketing
- Sensitive Information

---

## Step 3 — Purpose Questions

- **Is data used for advertising?** → **No**
- **Is data used for product personalization?** → **No**
- **Is data used for developer analytics?** → **No** (App Insights is used for app functionality / debugging, not marketing analytics)
- **Is data used for tracking?** → **No**

---

## Step 4 — Encryption

**"Does this app use encryption that is exempt from export controls?"** → **No**

The app uses standard HTTPS/TLS for all API and blob traffic, which is exempt.
This is already declared in `mobile/app.json`:

```json
"ios": {
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
}
```

> If App Store Connect asks for a statement, use:
> *"The app uses standard HTTPS/TLS 1.2+ encryption for all network communication. No non-exempt encryption is used."*

---

## Step 5 — Age & Content Rating (separate from App Privacy, but required to submit)

- **Age Rating:** **13+** (the Terms require users to be at least 13).
- **Content Rating:** **4+** — no violence, no medical info, no simulated gambling, no alcohol/tobacco, no user-generated content shown publicly without moderation.

---

## Step 6 — Who must do this

- The **App Privacy** section must be completed by an **Admin** in App Store Connect.
- If you are not the Admin, ask them to:
  1. Go to **App Store Connect → Your App → App Privacy**
  2. Follow the table above
  3. Save and submit the privacy declaration

---

## Quick Copy-Paste Summary (for the Admin)

> **Data collected:**
> - Account Data (name, email) — App Functionality, linked to identity
> - User Content (crab photos) — App Functionality, linked to identity
> - Precise Location (GPS) — App Functionality, NOT linked to identity
> - Diagnostics (crash/usage logs) — App Functionality, NOT linked to identity
>
> **Not collected:** contacts, health, financial, browsing, identifiers.
> **Advertising / Personalization / Tracking:** No.
> **Encryption:** Standard HTTPS/TLS (exempt) — `ITSAppUsesNonExemptEncryption = false`.
> **Age:** 13+ · **Content:** 4+
