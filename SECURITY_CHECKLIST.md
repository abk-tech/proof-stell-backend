# Security Checklist

> For detailed findings see [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md).
> For auth architecture see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Authentication & Authorization

- [x] **(VULN-003)** JWTs have a bounded expiration — access tokens 15 min, refresh tokens 7 days (configurable via `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL`).
- [x] **(VULN-003)** Token revocation is enforced: `JwtSecurityService` maintains a server-side blacklist; `JwtStrategy.validate` calls `assertTokenIsActive` on every request.
- [x] Roles (`player`, `admin`) are enforced by `RolesGuard` using the `@Roles()` decorator; the canonical payload shape is `{ id, email, role }` from `JwtStrategy`.
- [x] **(VULN-001)** No hardcoded secrets — all credentials are loaded from environment variables via `TypedConfigService`.
- [x] Auth endpoints are protected against brute force: `AUTH_MAX_FAILED_ATTEMPTS` (default 5) with a `AUTH_LOCKOUT_DURATION_SECONDS` (default 900) lockout window.
- [ ] Review all WebSocket event handlers for authentication — they must use the gateway's `JwtWsGuard`.

## 2. API Security

- [x] **(VULN-002)** TypeORM query builder is used for all database access — no raw SQL string interpolation.
- [x] **(VULN-004)** Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` rejects unknown or invalid input on every endpoint.
- [x] **(VULN-005)** Internal auto-increment IDs are not exposed; entities use UUIDs in public-facing responses.
- [x] CSRF is mitigated by requiring the `Authorization: Bearer` header (not cookie-based auth).
- [x] Rate limiting: global `ThrottlerGuard` at 10 req / 60 s per IP. Tighten per-route limits on auth endpoints as needed.
- [x] CORS origins are env-driven (`ALLOWED_ORIGINS`); no wildcard `*` in production.
- [x] `SecurityHeadersMiddleware` applies `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` globally.

## 3. Data Storage

- [x] Passwords hashed with bcrypt (salt rounds configured by `BCRYPT_SALT_ROUNDS`, default 12).
- [x] Database access is controlled by `DATABASE_URL`; credentials must never appear in source code.
- [x] `LoggingInterceptor` redacts `password`, `token`, `refreshToken`, and similar PII fields from logs.
- [x] `ClassSerializerInterceptor` + `@Exclude()` strips sensitive entity fields from HTTP responses.
- [ ] Confirm field-level encryption for any stored PII beyond passwords (e.g. wallet addresses at rest).

## 4. File Uploads

- [x] Avatar uploads go through `AvatarUploadInterceptor` which limits file type (image only) and size.
- [x] Uploaded files are served from `public/avatars` with `Cache-Control` and safe content headers.
- [ ] Verify that upload paths cannot be traversed outside the `public/avatars` directory.

## 5. Codebase & Dependencies

- [x] **(VULN-008)** Run `npm audit` in CI; block on high/critical findings.
- [x] Static analysis (SonarQube or equivalent) is recommended in CI.
- [x] **(VULN-006)** Swagger UI is disabled in `NODE_ENV=production`.
- [x] Error messages in production do not expose stack traces — `HttpExceptionFilter` returns a controlled response shape.

## 6. StarkNet / Wallet Security

- [x] `STARKNET_PRIVATE_KEY` is loaded from env only; never logged or returned in responses.
- [x] Wallet transaction retries use exponential backoff to avoid duplicate submissions.
- [ ] Confirm replay-attack protection on signed messages (nonce or timestamp in the signed payload).

---

_Review this checklist before each release. Update findings in [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)._
