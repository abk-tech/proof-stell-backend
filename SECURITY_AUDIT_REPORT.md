# Security Audit Report

**Report Generated:** 2025-09-06

> Companion checklist: [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
> Architecture context: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. Executive Summary

This report covers a security review of the ProofStell backend, including authentication flows, API input handling, data storage, and dependency hygiene. The findings below represent the state identified during the audit. Each item links to the relevant checklist entry where applicable.

---

## 2. Scope

- **Codebase Analysis:** Static analysis for secrets, dependency vulnerabilities, and code quality.
- **API Security:** Review of all REST and WebSocket endpoints for common vulnerabilities.
- **Data Storage:** Review of entity definitions, logging behaviour, and field-level exposure.
- **Authentication & Authorization:** JWT lifecycle, token revocation, RBAC guard consistency.

---

## 3. Methodology

- **Automated:** `npm audit` (dependency scan), ESLint security rules.
- **Manual:** Code review of auth, guard, wallet, and logging paths.
- **Configuration review:** Env validation schema (`validation.ts`), `main.ts` bootstrap.

---

## 4. Findings

### 4.1 Resolved / Mitigated

| ID | Vulnerability | Status | Resolution |
|---|---|---|---|
| **VULN-001** | Hardcoded Secrets | ✅ Resolved | All secrets are loaded via `TypedConfigService`; `JWT_SECRET` min-length enforced at startup. |
| **VULN-002** | SQL Injection | ✅ Resolved | TypeORM query builder used throughout; no raw SQL string interpolation. |
| **VULN-003** | Broken Authentication (no JWT expiry) | ✅ Resolved | Access tokens expire at 15 min; refresh at 7 days. Server-side revocation via `JwtSecurityService`. |
| **VULN-004** | XSS via unvalidated output | ✅ Resolved | Global `ValidationPipe` + `ClassSerializerInterceptor`; no unescaped user input in responses. |
| **VULN-006** | Debug info in production | ✅ Resolved | Swagger disabled in `production`; `HttpExceptionFilter` suppresses stack traces. |
| **VULN-007** | Missing security headers | ✅ Resolved | `SecurityHeadersMiddleware` applies CSP, HSTS, X-Frame-Options, X-Content-Type-Options globally. |

### 4.2 Open / Needs Verification

| ID | Vulnerability | Severity | Recommendation |
|---|---|---|---|
| **VULN-005** | IDOR — internal IDs in responses | Medium | Audit all DTO `@Expose()` fields; replace numeric IDs with UUIDs where still exposed. |
| **VULN-008** | Vulnerable dependencies | Medium | Run `npm audit --audit-level=high` in CI and block on unresolved high/critical findings. |
| **OPEN-001** | WebSocket auth coverage | Medium | Verify all `@SubscribeMessage` handlers are behind `JwtWsGuard`; unauthenticated events must be explicitly allowlisted. |
| **OPEN-002** | Wallet signed-message replay | Low | Add a nonce or short-lived timestamp to the signed payload to prevent replay attacks. |
| **OPEN-003** | Upload path traversal | Low | Confirm `AvatarUploadInterceptor` validates and normalises the stored filename before writing to disk. |

---

## 5. Remediation Priority

1. Resolve **VULN-008** in CI immediately.
2. Address **OPEN-001** before enabling any public WebSocket endpoint.
3. Audit **VULN-005** and **OPEN-002** in the next sprint.
4. **OPEN-003** is low risk given the static-file serving path, but should be confirmed.

---

## 6. Conclusion

The core authentication, input validation, and header hardening controls are in place. The remaining open items are medium/low severity and addressable in normal sprint work. Continuous `npm audit` in CI is the highest-priority unresolved action.
