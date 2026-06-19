# Dependabot Security Alerts — CrabWatch

> **Generated**: 2026-06-19
> **Repository**: devops-app/CrabWatch
> **Total Open Alerts**: 20 (14 unique vulnerabilities)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High  | 7     |
| 🟡 Medium | 5    |
| 🟢 Low   | 2     |

---

## High Severity

### 1. multer — Denial of Service via Deeply Nested Field Names

| Field | Value |
|-------|-------|
| **Alert #** | 56, 55 |
| **GHSA** | [GHSA-72gw-mp4g-v24j](https://github.com/advisories/GHSA-72gw-mp4g-v24j) |
| **CVE** | [CVE-2026-5079](https://nvd.nist.gov/vuln/detail/CVE-2026-5079) |
| **CVSS v3** | 7.5 |
| **CWE** | CWE-400 (Uncontrolled Resource Consumption) |
| **Vulnerable Range** | >= 1.0.0, < 2.2.0 |
| **Patch Version** | 2.2.0 |
| **Manifest** | `server/package.json` (direct), `pnpm-lock.yaml` (transitive) |
| **Scope** | Runtime |
| **Relationship** | Direct / Inconclusive |

**Summary**: Multer is vulnerable to a Denial of Service (DoS) via deeply nested field names in multipart form data. The `append-field` dependency parses bracket notation in field names (e.g., `a[b][c]`) with no limit on nesting depth, allowing an attacker to force allocation of deeply nested object structures that consume CPU and memory.

**Remediation**: Upgrade to `2.2.0` and configure `limits.fieldNestingDepth` to the minimum depth required.

---

### 2. @grpc/grpc-js — Server Crash from Malformed HTTP/2 Stream

| Field | Value |
|-------|-------|
| **Alert #** | 37 |
| **GHSA** | [GHSA-5375-pq7m-f5r2](https://github.com/advisories/GHSA-5375-pq7m-f5r2) |
| **CVE** | [CVE-2026-48068](https://nvd.nist.gov/vuln/detail/CVE-2026-48068) |
| **CVSS v3** | 7.5 |
| **CWE** | CWE-248 (Uncaught Exception) |
| **Vulnerable Range** | < 1.9.16 |
| **Patch Versions** | 1.9.16, 1.10.12, 1.11.4, 1.12.7, 1.13.5, 1.14.4 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: An invalid incoming HTTP/2 stream initiation can cause a server process to crash. Affects all servers created using `@grpc/grpc-js`. No workaround available.

**Remediation**: Upgrade to the latest patched version for your major branch.

---

### 3. @grpc/grpc-js — Client/Server Crash from Malformed Compressed Message

| Field | Value |
|-------|-------|
| **Alert #** | 36, 35 |
| **GHSA** | [GHSA-99f4-grh7-6pcq](https://github.com/advisories/GHSA-99f4-grh7-6pcq) |
| **CVE** | [CVE-2026-48069](https://nvd.nist.gov/vuln/detail/CVE-2026-48069) |
| **CVSS v3** | 7.5 |
| **CWE** | CWE-248 (Uncaught Exception), CWE-400 (Uncontrolled Resource Consumption) |
| **Vulnerable Range** | < 1.9.16 |
| **Patch Versions** | 1.9.16, 1.10.12, 1.11.4, 1.12.7, 1.13.5, 1.14.4 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: An invalid incoming compressed message can cause a client or server process to crash. Affects all clients and servers that use `@grpc/grpc-js`. No workaround available.

**Remediation**: Upgrade to the latest patched version for your major branch.

---

### 4. ws — Memory Exhaustion DoS from Tiny Fragments

| Field | Value |
|-------|-------|
| **Alert #** | 48, 47, 46 |
| **GHSA** | [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) |
| **CVE** | [CVE-2026-48779](https://nvd.nist.gov/vuln/detail/CVE-2026-48779) |
| **CVSS v3** | 7.5 |
| **CWE** | CWE-400 (Uncontrolled Resource Consumption), CWE-770 (Allocation Without Limits) |
| **Vulnerable Range** | >= 8.0.0, < 8.21.0 (and other major branches) |
| **Patch Versions** | 8.21.0, 7.5.11, 6.2.4, 5.2.5 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: A high volume of exceptionally small fragments and data chunks can be sent by a peer to force the remote peer into allocating structural wrappers that consume far more memory than the default message-size limit, leading to OOM process termination.

**Remediation**: Upgrade to patched version. Workaround: lower the `maxPayload` option if possible.

---

### 5. protobufjs — DoS Through Unbounded Any Expansion

| Field | Value |
|-------|-------|
| **Alert #** | 54, 45 |
| **GHSA** | [GHSA-wcpc-wj8m-hjx6](https://github.com/advisories/GHSA-wcpc-wj8m-hjx6) |
| **CVE** | [CVE-2026-48712](https://nvd.nist.gov/vuln/detail/CVE-2026-48712) |
| **CVSS v3** | 7.5 |
| **CWE** | CWE-674 (Uncontrolled Recursion) |
| **Vulnerable Range** | <= 7.6.0 and >= 8.0.0, <= 8.4.0 |
| **Patch Versions** | 7.6.1, 8.4.1 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: protobufjs could recurse without a depth limit while converting decoded messages to plain objects or JSON. A crafted protobuf binary payload containing deeply nested `google.protobuf.Any` values could cause the JavaScript call stack to be exhausted.

**Remediation**: Upgrade to 7.6.1+ or 8.4.1+. Workaround: avoid converting untrusted protobuf messages with `Any` values to JSON.

---

### 6. form-data — CRLF Injection in Multipart Field Names

| Field | Value |
|-------|-------|
| **Alert #** | 53, 52 |
| **GHSA** | [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) |
| **CVE** | [CVE-2026-12143](https://nvd.nist.gov/vuln/detail/CVE-2026-12143) |
| **CVSS v3/v4** | 7.5 / 8.7 |
| **CWE** | CWE-93 (CRLF Injection) |
| **Vulnerable Range** | < 2.5.6, >= 3.0.0 < 3.0.5, >= 4.0.0 < 4.0.6 |
| **Patch Versions** | 2.5.6, 3.0.5, 4.0.6 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime + Development |
| **Relationship** | Transitive |

**Summary**: The `field` name passed to `FormData#append` and the `filename` option are concatenated directly into the `Content-Disposition` header with no escaping of CR, LF, or `"`. An application using untrusted input as a field name or filename lets an attacker inject additional headers or smuggle multipart parts.

**Remediation**: Upgrade to patched version. Conditional severity — only affects applications passing attacker-controlled data as field names or filenames.

---

### 7. @grpc/grpc-js — Additional Server Crash (Duplicate of #2)

> Covered by Alert #37 above. Same vulnerability family.

---

## Medium Severity

### 8. tar — File Smuggling via PAX Size Override

| Field | Value |
|-------|-------|
| **Alert #** | 51 |
| **GHSA** | [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh) |
| **CVE** | [CVE-2026-53655](https://nvd.nist.gov/vuln/detail/CVE-2026-53655) |
| **CVSS v4** | 6.9 |
| **CWE** | CWE-436 (Interpretation Conflict) |
| **Vulnerable Range** | <= 7.5.15 |
| **Patch Version** | 7.5.16 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: node-tar applies a PAX extended header's `size=` record to the next header entry of any type, including intermediary metadata headers. An attacker can desynchronize node-tar's stream cursor relative to other tar implementations, enabling file smuggling.

**Remediation**: Upgrade to 7.5.16+.

---

### 9. protobufjs — Schema-Derived Names Shadow Runtime Properties

| Field | Value |
|-------|-------|
| **Alert #** | 44, 42 |
| **GHSA** | [GHSA-f38q-mgvj-vph7](https://github.com/advisories/GHSA-f38q-mgvj-vph7) |
| **CVE** | [CVE-2026-54269](https://nvd.nist.gov/vuln/detail/CVE-2026-54269) |
| **CVSS v3** | 5.3 |
| **CWE** | CWE-674 (Uncontrolled Recursion), CWE-754 (Improper Check) |
| **Vulnerable Range** | <= 7.6.2 and >= 8.0.0, <= 8.5.0 |
| **Patch Versions** | 7.6.3, 8.6.0 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: protobufjs accepted schema-derived names (`hasOwnProperty`, `$type`, `rpcCall`) that could collide with runtime-significant properties, causing deterministic exceptions or recursive calls.

**Remediation**: Upgrade to 7.6.3+ or 8.6.0+. Workaround: do not load schemas from untrusted sources.

---

### 10. js-yaml — Quadratic-Complexity DoS in Merge Key Handling

| Field | Value |
|-------|-------|
| **Alert #** | 50 |
| **GHSA** | [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) |
| **CVE** | [CVE-2026-53550](https://nvd.nist.gov/vuln/detail/CVE-2026-53550) |
| **CVSS v3** | 5.3 |
| **CWE** | CWE-407 (Inefficient Algorithmic Complexity) |
| **Vulnerable Range** | <= 4.1.1 |
| **Patch Version** | 4.2.0 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: A crafted YAML document can trigger algorithmic CPU exhaustion in merge-key processing by repeating the same alias many times in a merge sequence, causing quadratic parse-time behavior.

**Remediation**: Upgrade to 4.2.0+.

---

### 11. @opentelemetry/core — Unbounded Memory in W3C Baggage Propagation

| Field | Value |
|-------|-------|
| **Alert #** | 43 |
| **GHSA** | [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) |
| **CVE** | [CVE-2026-54285](https://nvd.nist.gov/vuln/detail/CVE-2026-54285) |
| **CVSS v3** | 5.3 |
| **CWE** | CWE-770 (Allocation Without Limits) |
| **Vulnerable Range** | < 2.8.0 |
| **Patch Version** | 2.8.0 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: `W3CBaggagePropagator.extract()` does not enforce size limits when parsing inbound `baggage` HTTP headers. Parsing oversized baggage causes memory allocation proportional to header size without a cap.

**Remediation**: Upgrade to 2.8.0+. Workaround: ensure header size limits at the server or gateway level (Node.js default 16 KB mitigates external attacks).

---

### 12. joi — Uncaught RangeError on Deeply Nested Input

| Field | Value |
|-------|-------|
| **Alert #** | 40 |
| **GHSA** | [GHSA-q7cg-457f-vx79](https://github.com/advisories/GHSA-q7cg-457f-vx79) |
| **CVE** | [CVE-2026-48038](https://nvd.nist.gov/vuln/detail/CVE-2026-48038) |
| **CVSS v3** | 5.3 |
| **CWE** | CWE-248 (Uncaught Exception), CWE-400 (Uncontrolled Resource Consumption) |
| **Vulnerable Range** | < 17.13.4, >= 18.0.0 < 18.2.1 |
| **Patch Versions** | 17.13.4, 18.2.1 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Development |
| **Relationship** | Transitive |

**Summary**: Denial of service via untrapped exception when validating user-supplied JSON/object input with recursive `link()` schemas. `validate()` called without `try/catch` in a request handler could crash the process.

**Remediation**: Upgrade to 18.2.1+. Workaround: wrap `validate()` in `try/catch`.

---

## Low Severity

### 13. @babel/core — Arbitrary File Read via sourceMappingURL

| Field | Value |
|-------|-------|
| **Alert #** | 49 |
| **GHSA** | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) |
| **CVE** | [CVE-2026-49356](https://nvd.nist.gov/vuln/detail/CVE-2026-49356) |
| **CVSS v3** | 3.2 |
| **CWE** | CWE-22 (Path Traversal), CWE-200 (Information Exposure) |
| **Vulnerable Range** | <= 7.29.0 |
| **Patch Versions** | 7.29.6, 8.0.0-rc.6 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: Using `@babel/core` to compile maliciously crafted code can allow an attacker to read source maps from the system running Babel. Only affects users who compile untrusted code.

**Remediation**: Upgrade to 7.29.6+. Workaround: set `inputSourceMap: false` in Babel options.

---

### 14. esbuild — Arbitrary File Read on Windows Dev Server

| Field | Value |
|-------|-------|
| **Alert #** | 39 |
| **GHSA** | [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) |
| **CVE** | None |
| **CVSS v3** | 2.5 |
| **CWE** | CWE-22 (Path Traversal) |
| **Vulnerable Range** | >= 0.27.3, < 0.28.1 |
| **Patch Version** | 0.28.1 |
| **Manifest** | `pnpm-lock.yaml` |
| **Scope** | Runtime |
| **Relationship** | Transitive |

**Summary**: The development server contains a path traversal vulnerability on Windows when serving files from `servedir`. Backslash-based paths bypass the forward-slash-only `path.Clean()` normalization, allowing directory traversal outside the configured root.

**Remediation**: Upgrade to 0.28.1+.

---

## Recommended Actions

1. **Immediate (High severity)**:
   - Upgrade `multer` to `2.2.0` in `server/package.json` (direct dependency)
   - Run `pnpm update @grpc/grpc-js ws protobufjs form-data` to patch transitive dependencies

2. **Short-term (Medium severity)**:
   - Run `pnpm update tar js-yaml @opentelemetry/core joi protobufjs`

3. **Low priority**:
   - Run `pnpm update @babel/core esbuild`

4. **Verify**: Run `pnpm dedupe` after upgrades and confirm `pnpm typecheck` passes across all packages.
