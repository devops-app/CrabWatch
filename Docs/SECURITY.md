# CrabWatch — Security Policy

> **Classification**: Enterprise-Grade Research Platform
> **Jurisdiction**: Malaysia (PDPA 2010)
> **Last Reviewed**: 2026-06-24
> **Owner**: CrabWatch Engineering Team

---

## 1. Reporting a Vulnerability

Responsible disclosure is strongly encouraged.

| Channel | Details |
|---------|---------|
| **Email** | security@crabwatch.dsigncodehub.com |
| **Response SLA** | Acknowledgement within 48 hours; remediation plan within 5 business days |
| **Coordinated Disclosure** | Vulnerabilities will not be made public until a patch is available and deployed |

**In scope**: API server, web application, mobile application, deployment pipelines, Azure infrastructure, Prisma schema, shared type contracts.

**Out of scope**: Third-party SaaS platforms (Resend, Firebase Console, Mapbox), browser vulnerabilities, social engineering, denial-of-service against Azure infrastructure.

---

## 2. OWASP Top 10 Compliance Matrix

| # | OWASP Category | Status | Implementation |
|---|---|---|---|
| A01 | Broken Access Control | **Mitigated** | Role-based middleware (`requireRole`, `requirePermission`) enforces ADMIN/RESEARCHER/USER boundaries. Admin endpoints guarded by `requireRole(UserRole.ADMIN)`. Granular permission matrix via `AdminPermission` enum — `engagement.read`, `engagement.write`, `engagement.recalculate`, `campaigns.write`, `security.moderate`, `audit.read`. See `server/src/middleware/auth.ts`. |
| A02 | Cryptographic Failures | **Mitigated** | Passwords hashed with `bcrypt` (cost factor 10–12). JWT tokens signed with server-side secret; production enforces `JWT_SECRET` env var at startup. HSTS enabled in production (`maxAge: 31536000`, `includeSubDomains`). All Azure communication over TLS 1.2+. Password reset tokens single-use with 1-hour expiry. |
| A03 | Injection | **Mitigated** | Prisma ORM provides parameterized queries — no raw SQL interpolation. Zod schemas (`server/src/utils/schemas.ts`) validate all request payloads before processing. Helmet `noSniff` and `xssFilter` enabled. CSP policy active in production. |
| A04 | Insecure Design | **Mitigated** | Feature flags gate engagement subsystems (`config.engagement.*`). Soft-delete with 30-day retention prevents accidental data loss. Single-crab hard constraint enforced by AI (`crabCount` validation). Quality gates prevent low-quality data ingestion. Throttle on destructive admin actions with double-confirmation. |
| A05 | Security Misconfiguration | **Mitigated** | Helmet configures 11 security headers. CORS restricted to `CORS_ORIGINS` allowlist. Swagger docs disabled in production. Rate limiting applied per-route tier. `trust proxy` enabled for accurate IP identification behind Azure reverse proxy. |
| A06 | Vulnerable & Outdated Components | **Monitored** | Dependencies managed via pnpm with lockfile. GitHub Dependabot configured for automated vulnerability alerts. `pnpm typecheck` gate enforced before deployment. pnpm overrides applied for known transitive vulnerabilities. |
| A07 | Identification & Authentication Failures | **Mitigated** | Dual auth: Firebase ID token verification + JWT fallback. Rate-limited login (20 req/15min production). Blocked users rejected at middleware (403). Soft-deleted users blocked from authentication. Password reset tokens stored in DB with 1-hour expiry and `used` flag. JWT expiry checked client-side before API calls. |
| A08 | Software & Data Integrity Failures | **Mitigated** | Zod validation schemas on all input. Prisma migrations enforce schema constraints. XP transactions use idempotency keys for immutability. Leaderboard cache invalidated on any XP mutation. Next.js standalone build prevents arbitrary code execution. |
| A09 | Security Logging & Monitoring Failures | **Mitigated** | Azure Application Insights auto-instrumentation captures all routes, HTTP calls, exceptions, and host metrics. Structured logging with request IDs. Frontend errors POSTed to `/api/v1/telemetry/error`. Quality gate telemetry for image analysis pipeline. Abuse detection service for velocity/duplicate/coordinate clustering. |
| A10 | Server-Side Request Forgery | **Mitigated** | No server-side URL fetching from user-controlled input. Azure Blob SAS URLs generated server-side with time-limited access. AI agent invocation uses pre-configured Foundry endpoint — no user-supplied URLs. |

---

## 3. Azure Cloud Security

### 3.1 Infrastructure

| Service | Security Controls |
|---------|-------------------|
| **PostgreSQL Flexible Server** | VNet-integrated; private endpoint for database access; SSL enforced (`sslmode=require`); automated backups with 35-day retention; geo-redundant backup storage |
| **App Service (API)** | Custom domain with TLS; deployment slot support; CORS restricted; rate limiting; trusted proxy mode for accurate IP logging; Application Insights auto-instrumentation |
| **App Service (Web)** | Standalone Next.js build; no serverless functions; `BACKEND_URL` configured via app settings (not hardcoded); `SCM_DO_BUILD_DURING_DEPLOYMENT=false` prevents build-time secret exposure |
| **Storage Account** | Blob containers for observation photos and achievement badges; SAS URLs with expiration; analysis photos auto-deleted 60s post-processing; container-level access policies |
| **Application Insights** | OpenTelemetry auto-instrumentation; custom telemetry for frontend errors and quality gate events; correlated request tracing across server and client |
| **Azure AI Foundry** | Pre-configured agent endpoint; API key scoped to project; no user-supplied model parameters; GPT-4o Vision for image analysis only |

### 3.2 Network Security

- All public endpoints served over HTTPS
- Azure Front Door / WAF recommended for production DDoS protection and Layer 7 filtering
- CORS origins explicitly allowlisted (`CORS_ORIGINS` env var)
- No direct database exposure to public internet — VNet integration required
- Azure Storage firewall restricts blob access to trusted networks

### 3.3 Identity & Access

- Azure AD used for deployment identity (Azure CLI / GitHub Actions)
- Service principals for CI/CD with least-privilege role assignments
- Managed identity recommended for App Service → Key Vault / Storage access
- Firebase Admin SDK for mobile authentication with short-lived ID tokens

---

## 4. Secrets Management

### 4.1 Secret Inventory

| Secret | Current Storage | Target Storage | Rotation Policy |
|--------|-----------------|----------------|-----------------|
| `DATABASE_URL` | Azure App Settings | Azure Key Vault reference | Quarterly or on credential compromise |
| `JWT_SECRET` | Azure App Settings | Azure Key Vault reference | Annually or on suspected exposure |
| `FIREBASE_PRIVATE_KEY` | Azure App Settings | Azure Key Vault reference | Annually via Firebase console |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure App Settings | Managed identity (recommended) | Quarterly |
| `FOUNDRY_API_KEY` | Azure App Settings | Azure Key Vault reference | Per Azure Foundry policy |
| `RESEND_API_KEY` | Azure App Settings | Azure Key Vault reference | Annually |
| `MAPBOX_TOKEN` | Web env var (client-side) | Web app settings | Annually |
| `FCM_SERVER_KEY` | Azure App Settings | Azure Key Vault reference | Per Firebase policy |

### 4.2 Practices

- **No secrets in source code**: All secrets loaded via environment variables at runtime
- **`.env` files excluded**: `server/.env` and `web/.env.local` are `.gitignore`d; template files contain placeholder values only
- **GitHub Secrets**: CI/CD pipelines consume secrets from GitHub repository settings — never from workflow files or commit history
- **Azure App Settings**: Production secrets stored as App Service configuration — encrypted at rest by Azure
- **Startup validation**: Process exits on missing production secrets (`JWT_SECRET`, `DATABASE_URL`)

### 4.3 Azure Key Vault Integration (Recommended for Production)

```
App Service (Managed Identity)
  └── Key Vault Reference → DATABASE_URL
  └── Key Vault Reference → JWT_SECRET
  └── Key Vault Reference → FOUNDRY_API_KEY
  └── Key Vault Reference → RESEND_API_KEY
```

**Implementation steps**:
1. Create Key Vault with soft-delete and purge protection enabled
2. Assign App Service managed identity `Key Vault Secrets User` role
3. Store secrets in Key Vault with expiration policies
4. Replace App Service config values with Key Vault references: `@Microsoft.KeyVault(VaultName=<vault>;SecretName=<name>)`
5. Enable Key Vault diagnostic settings → Application Insights for audit trail

---

## 5. RBAC Enforcement

### 5.1 Role Hierarchy

```
ADMIN (full access)
  └── All AdminPermission keys
      ├── engagement.read / engagement.write / engagement.recalculate
      ├── campaigns.write
      ├── security.moderate
      └── audit.read

RESEARCHER (data validation)
  └── Observation approval/rejection
  └── Access to researcher dashboard and validation queue
  └── No admin permissions

USER (standard)
  └── Observation submission
  └── Profile management
  └── Gamification participation
  └── No admin or researcher permissions
```

### 5.2 Enforcement Points

| Layer | Mechanism |
|-------|-----------|
| **Auth Middleware** | `authMiddleware` validates Firebase ID token or JWT; `resolveUser` loads DB role, checks `blockedAt`/`deletedAt` |
| **Role Guard** | `requireRole(UserRole.ADMIN)` blocks non-admin access to all `/api/v1/admin/*` routes |
| **Permission Guard** | `requirePermission(...keys)` enforces granular admin permissions via `RolePermissions` matrix |
| **Soft Delete** | `deletedAt` users receive 403 on all authenticated requests |
| **Block** | `blockedAt` users receive 403 with `userSuspended` message |
| **Invite System** | Role pre-assigned in invite token; cannot be elevated by client |

### 5.3 Privilege Escalation Prevention

- Role field is server-controlled; client cannot set or modify `role` via profile update
- Invite links encode role server-side; registration honours the assigned role
- Admin actions require explicit `requireRole` or `requirePermission` middleware — no implicit access

---

## 6. API Security

### 6.1 Authentication

- Firebase ID token verified server-side on every mobile request
- JWT fallback for web sessions with expiry validation
- Auth cookie support for web (`getAuthCookie` fallback in middleware)
- Token expiry checked client-side in `AuthGuard` before API calls

### 6.2 Rate Limiting

| Endpoint Group | Production Limit | Development Limit | Window |
|----------------|-----------------|-------------------|--------|
| `/auth/login`, `/users/register` | 20 requests | 100 requests | 15 minutes |
| `/analytics/*` | 100 requests | 300 requests | 15 minutes |
| `/admin/engagement/*` | 60 requests | 200 requests | 15 minutes |
| All other `/api/*` | 500 requests | 1000 requests | 15 minutes |

All limits enforced via `express-rate-limit` with `trust proxy` enabled.

### 6.3 Input Validation

- Zod schemas validate all request bodies, query parameters, and path parameters
- Strict UUID validation for `speciesId` and observation references
- Nullable fields explicitly declared — no implicit coercion
- File upload size limits enforced at the route level

### 6.4 CORS Policy

- Origins explicitly allowlisted via `CORS_ORIGINS` environment variable
- Preflight requests validated before allowed origins
- Credentials (cookies, auth headers) only accepted from allowed origins

---

## 7. CI/CD Security Scanning

### 7.1 Current Controls

| Stage | Control |
|-------|---------|
| **Pre-commit** | Version bump hook auto-increments build number; `.git/hooks/pre-commit` enforces `VERSION` file consistency |
| **Type Checking** | `pnpm typecheck` enforces strict TypeScript across all 4 packages (server, shared, web, mobile) |
| **Build Gate** | `next build` must pass before web deployment; mobile EAS Build validates TypeScript compilation |
| **Dependency Alerts** | GitHub Dependabot monitors all package managers; vulnerability alerts reviewed and remediated |
| **Secret Exclusion** | `.gitignore` blocks `.env`, `.env.local`, `*.pem`, `*.key`, and certificate files |

### 7.2 Recommended Enhancements

| Tool | Purpose | Priority |
|------|---------|----------|
| **GitHub Advanced Security (CodeQL)** | Automated code scanning for secret detection, injection patterns, and vulnerability classes | High |
| **`pnpm audit` in CI** | Automated dependency vulnerability checks on every PR | High |
| **GitHub Secret Scanning + Push Protection** | Prevents accidental secret commits at push time | High |
| **Branch Protection Rules** | Require PR reviews, passing status checks, and linear history on `main` | High |
| **Snyk / Snyk Open Source** | Deep dependency scanning with automated fix PRs | Medium |
| **Commit Signing** | Require GPG/SSH-signed commits for production branch | Medium |
| **Supply Chain SBOM** | Generate Software Bill of Materials via `cyclonedx-npm` or `node_modules` audit | Low |

---

## 8. Supply Chain Security

### 8.1 Dependency Management

- **Package manager**: pnpm with strict lockfile — deterministic installs, no phantom dependencies
- **Hoisting**: Single `node_modules` hoist across monorepo; version mismatches resolved at root
- **Overrides**: `pnpm overrides` applied for known transitive vulnerabilities (e.g., `@babel/core`, `esbuild`)
- **Peer dependencies**: Explicitly declared; no implicit resolution

### 8.2 Risk Mitigation

- Lockfile committed and reviewed in PRs — unexpected dependency changes are flagged
- `pnpm typecheck` across all packages catches breaking API changes from dependency updates
- No `eval()`, `Function()`, or dynamic `require()` in production code paths
- Third-party AI responses parsed with defensive JSON extraction (markdown fence stripping)

---

## 9. PDPA Malaysia Compliance

### 9.1 Applicable Provisions

CrabWatch processes personal data of users in Malaysia. The **Personal Data Protection Act 2010 (PDPA)** applies to all data collection, storage, and processing activities within and originating from Malaysia.

### 9.2 Data Processing Principles

| PDPA Principle | Implementation |
|----------------|---------------|
| **Processing Condition** | Explicit consent obtained at registration via mandatory checkbox with Terms of Service and Privacy Policy links |
| **Notice** | Privacy policy published at `/privacy` (bilingual: EN/MS); purpose of data collection stated at point of capture |
| **Purpose** | Data collected exclusively for crab observation research; no secondary use without additional consent |
| **Disclosure** | Data not disclosed to third parties without consent, except as required by law. AI analysis (Azure Foundry) processes images server-side within Azure Malaysia/West Europe region — no external data sharing |
| **Access** | Users can view and edit their profile data via web and mobile settings pages |
| **Correction** | Users can update name, email, phone, address, and language preference through profile settings |
| **Retention** | Soft-deleted users retained for 30 days before permanent deletion. Observation photos cleaned 60s after AI analysis. Backup files retained per admin policy |
| **Security** | Encryption in transit (TLS 1.2+), password hashing (bcrypt), access control (RBAC), audit logging (Application Insights) |

### 9.3 Personal Data Inventory

| Data Element | Collected | Purpose | Retention | PDPA Category |
|--------------|-----------|---------|-----------|---------------|
| Name | Registration | User identification | Account lifetime | Personal data |
| Email | Registration | Authentication, password reset, invites | Account lifetime | Personal data |
| Phone | Registration (optional) | Future SMS MFA | Account lifetime | Personal data |
| Address | Registration (optional) | Researcher location context | Account lifetime | Personal data |
| GPS coordinates | Observation capture | Observation geotagging | Observation lifetime | Sensitive (location) |
| Photos | Observation capture | AI species detection, research record | Observation lifetime | Personal data |
| Device tokens (FCM) | App install | Push notifications | Until uninstalled | Technical data |
| Language preference | Settings | Localization | Account lifetime | Technical data |
| Gamification stats | System-generated | Engagement tracking | Account lifetime | Derived data |

### 9.4 Data Subject Rights

| Right | Mechanism |
|-------|-----------|
| **Right to Access** | Profile page displays all user data; API returns user data via authenticated endpoints |
| **Right to Correction** | Profile edit page; `PATCH /api/v1/users/profile` |
| **Right to Erasure** | Account deletion; 30-day soft-delete grace period; permanent cleanup via admin endpoint cascades to observations, FCM tokens, gamification records |
| **Right to Withdraw Consent** | Account deletion removes all personal data and associated observations |

### 9.5 Cross-Border Data Transfer

- Primary data residency: Azure (West Europe / Southeast Asia region)
- AI processing (Azure Foundry) occurs within Azure tenant boundary
- No data transferred outside Azure ecosystem for processing

---

## 10. Mobile App Security

### 10.1 Authentication

- Firebase Authentication for mobile identity; ID token verified server-side on every request
- JWT fallback for web-based sessions
- Tokens stored in `expo-secure-store` (iOS Keychain / Android Keystore)
- No plaintext credential storage on device
- Token refresh handled transparently by Firebase SDK

### 10.2 Data in Transit

- All API calls over HTTPS to Azure App Service
- Deep links (`crabwatch://reset-password/<token>`) carry password reset tokens — single-use, 1-hour expiry
- No sensitive data passed via navigation params beyond short-lived tokens
- API retry logic with exponential backoff for transient failures (502/503/504)

### 10.3 Data at Rest

- `expo-secure-store` for authentication tokens (encrypted platform storage)
- Zustand stores hold transient state only — no credentials persisted to disk
- Observation photos uploaded immediately to Azure Blob — not cached long-term on device
- EXIF metadata extracted server-side; not stored on device after upload

### 10.4 Platform-Specific Controls

| Control | iOS | Android |
|---------|-----|---------|
| Certificate pinning | Not implemented (planned for v2) | Not implemented (planned for v2) |
| Jailbreak/root detection | Not implemented | Not implemented |
| Backup encryption | iOS default (DeviceManagement) | Android default (keystore-backed) |
| Permission model | Camera, Photos, Location — declared in `app.json` | Same permissions via Android manifest generation |
| Secure storage | Keychain via `expo-secure-store` | Android Keystore via `expo-secure-store` |

### 10.5 Deep Link Security

- `crabwatch://reset-password/<token>` scheme registered in `app.json`
- Token validated server-side on use; single-use with 1-hour expiry
- No sensitive data exposed in URL beyond the short-lived token

---

## 11. Data Classification

| Classification | Description | Examples | Controls |
|----------------|-------------|----------|----------|
| **Public** | Non-sensitive, publishable data | Species reference data, analytics aggregates | No restrictions |
| **Internal** | Operational data, not for public release | Gamification config, admin audit logs, engagement metrics | Authenticated access |
| **Confidential** | User-identifiable data | User profiles, emails, phone numbers, addresses, GPS coordinates | RBAC, encryption in transit, access logging |
| **Restricted** | Credentials and cryptographic material | `JWT_SECRET`, `FIREBASE_PRIVATE_KEY`, database passwords, API keys | Key Vault, never in source code, rotation policy |

---

## 12. Security Headers

Configured via Helmet in production:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' <backend>` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Embedder-Policy` | `require-corp` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |

---

## 13. Threat Model

### 13.1 STRIDE Analysis

| Threat | Scenario | Mitigation |
|--------|----------|------------|
| **Spoofing** | Attacker impersonates authenticated user | Firebase ID token verification; JWT signature validation; token expiry enforcement |
| **Tampering** | Modified observation data in transit | HTTPS enforcement; server-side Zod validation; immutable XP ledger |
| **Repudiation** | User denies submitting observation | Application Insights audit trail; XPTransaction idempotency keys; admin audit logs |
| **Information Disclosure** | Exposure of user data or secrets | RBAC; encrypted storage; `.gitignore` for secrets; Key Vault for production |
| **DoS** | Flooding analysis endpoint | Rate limiting per route tier; Azure App Service scaling; blob cleanup for analysis photos |
| **Elevation of Privilege** | User escalates to admin role | Role is server-controlled; invite system pre-assigns roles; `requireRole` middleware on all admin routes |

### 13.2 Attack Surface

| Entry Point | Risk | Controls |
|-------------|------|----------|
| Public API (`/api/v1/*`) | Medium | Rate limiting, auth middleware, input validation, CORS |
| Web app (Next.js) | Low | CSP headers, CSRF via SameSite cookies, server-side rendering |
| Mobile app (Expo) | Low | Firebase auth, secure storage, HTTPS-only API calls |
| Azure Blob Storage | Low | SAS URLs with expiry, server-side URL generation, 60s photo cleanup |
| AI Foundry Agent | Low | Pre-configured endpoint, no user-supplied parameters, project-scoped API key |

---

## 14. Incident Response

### 14.1 Severity Classification

| Level | Criteria | Response Time |
|-------|----------|---------------|
| **Critical** | Active data breach; authentication bypass; production outage; restricted secret exposure | Immediate; 1-hour containment |
| **High** | Authenticated vulnerability; data exposure risk; privilege escalation; PDPA-notifiable event | 4 hours |
| **Medium** | Non-authenticated vulnerability; limited impact; dependency vulnerability with known exploit | 24 hours |
| **Low** | Informational; best-practice deviation; theoretical vulnerability without exploit path | Next sprint |

### 14.2 Response Procedure

1. **Detect** — Application Insights alerts, GitHub security alerts, Dependabot notifications, responsible disclosure
2. **Triage** — Classify severity; assign responder; assess PDPA notification requirements
3. **Contain** — Revoke compromised credentials; disable affected endpoints; rollback deployment; block affected users
4. **Remediate** — Patch code; update dependencies; rotate secrets; apply configuration changes
5. **Verify** — Run typecheck, build, and test gates; deploy patch; validate fix in staging
6. **Notify** — If personal data affected, notify affected users within 72 hours per PDPA requirements; log incident in audit trail
7. **Post-mortem** — Document root cause, timeline, affected data, and preventive controls; update this document if controls gap identified

---

## 15. Compliance Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TLS 1.2+ enforced | Done | Azure App Service default; HSTS header |
| Password hashing | Done | bcrypt cost 10–12 |
| JWT token expiry | Done | Token expiry check in `AuthGuard`; server-side validation |
| Rate limiting | Done | 4 tiers via `express-rate-limit` |
| CORS allowlist | Done | `CORS_ORIGINS` env var |
| CSP headers | Done | Helmet in production |
| RBAC enforcement | Done | `requireRole` + `requirePermission` middleware |
| Audit logging | Done | Application Insights auto-instrumentation |
| Data retention policy | Done | 30-day soft-delete; 60s photo cleanup |
| Consent at registration | Done | Checkbox with Terms + Privacy links (bilingual) |
| Secrets out of source | Done | `.gitignore`; env var loading; no hardcoded credentials |
| Swagger disabled in production | Done | `config.nodeEnv !== 'production'` guard |
| Input validation | Done | Zod schemas on all endpoints |
| Dependency lockfile | Done | pnpm lockfile committed and enforced |
| Branch protection on main | Pending | GitHub repository settings |
| Dependency scanning in CI | Pending | Add `pnpm audit` step to pipeline |
| Azure Key Vault integration | Pending | Recommended for production |
| Certificate pinning (mobile) | Pending | Planned for v2 |
| Supply chain SBOM | Pending | Evaluate `cyclonedx-npm` integration |

---

*This document is maintained by the CrabWatch engineering team. For questions, updates, or security concerns, contact the project maintainer or use the responsible disclosure channel in Section 1.*
