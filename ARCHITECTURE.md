# Backend Architecture Guide

ProofStell is a competitive whack-a-mole game built on StarkNet. This document is the canonical reference for the NestJS backend: module responsibilities, data/control flows, and cross-module contracts.

---

## Module Map

| Module | Path | Responsibility |
|---|---|---|
| **Auth** | `src/auth` | JWT issue/refresh/revoke, bcrypt hashing, local + JWT Passport strategies |
| **Users** | `src/users` | CRUD, avatar upload, password change |
| **Game** | `src/game` | Game entity management |
| **GameSession** | `src/game-session` | Session lifecycle, score reporting, integrity checks |
| **Leaderboard** | `src/leaderboard` | Score submission, rank calculation, pagination, polling |
| **Badge** | `src/badge` | Badge definitions, achievement evaluation, award issuance |
| **Challenge** | `src/challenge` | Challenge definitions |
| **ScheduledChallenges** | `src/scheduled-challenges` | Daily/scheduled challenge generation, difficulty adjustment, participation |
| **Wallet** | `src/wallet` | ArgentX/Braavos provider abstraction, transaction relay, event emission |
| **Blockchain** | `src/blockchain` | StarkNet/Soroban contract interactions |
| **Mint** | `src/mint` | NFT minting via smart contract |
| **Referral** | `src/refferal` | Referral codes, reward assignment |
| **Notification** | `src/notification` | In-app notification persistence and retrieval |
| **Mail** | `src/mail` | Transactional email via SMTP (nodemailer) |
| **Cache** | `src/cache` | Redis-backed key-value cache, distributed lock |
| **Analytics** | `src/analytics` | Internal event store (TypeORM) |
| **AnalyticsSystem** | `src/analytics-system` | External provider fan-out (PostHog, Mixpanel, Plausible, GA) |
| **Audit** | `src/audit` | Immutable audit-log records with interceptor |
| **Logging** | `src/logging` | Winston structured logging, request/response interceptor |
| **Health** | `src/health` | Startup dependency assertions, liveness probe |
| **Admin** | `src/admin` | Metrics aggregation, admin-only endpoints |
| **Settings** | `src/settings` | Runtime configuration flags |
| **Translation** | `src/translation` | i18n key-value store, locale middleware/guards/interceptors |
| **Security** | `src/security` | JWT revocation service, security-headers middleware |
| **Accessibility** | `src/accessibility` | WCAG helper utilities |
| **RealtimeGateway** | `src/common/gateways` | Socket.IO WebSocket hub (leaderboard, game state, notifications) |
| **Protected** | `src/protected` | Demo of JWT-guarded route |

---

## Request Lifecycle

```
HTTP Client
  │
  ├─ express-request-id    (assigns x-request-id)
  ├─ SecurityHeadersMiddleware  (CSP, HSTS, X-Frame-Options …)
  ├─ ThrottlerGuard        (global 10 req/60 s rate limit)
  ├─ LanguageMiddleware    (reads Accept-Language / ?lang)
  │
  ├─ Route Handler
  │    ├─ JwtAuthGuard / LocalAuthGuard  (Passport)
  │    ├─ RolesGuard / AdminGuard        (RBAC)
  │    ├─ ValidationPipe                 (class-validator, whitelist)
  │    ├─ CacheInterceptor               (Redis read-through)
  │    ├─ LoggingInterceptor             (Winston structured log)
  │    ├─ AuditLogInterceptor            (immutable audit record)
  │    └─ Controller → Service → TypeORM / Redis / StarkNet
  │
  ├─ ClassSerializerInterceptor   (strips @Exclude fields)
  ├─ TranslationInterceptor       (i18n key expansion)
  └─ HttpExceptionFilter / ThrottlerExceptionFilter
```

---

## Data Flow: Score Submission

```
POST /api/v1/leaderboard/submit
  → JwtAuthGuard
  → LeaderboardController.submit()
  → LeaderboardService.submitScore()
      ├─ Persist LeaderboardEntity (TypeORM transaction)
      ├─ Invalidate cache key  (CacheService.del)
      ├─ Emit realtime event   (RealtimeGateway → Socket.IO room)
      ├─ Create notification   (NotificationService)
      └─ Trigger badge check   (AchievementService)
```

---

## Data Flow: Wallet Transaction

```
POST /api/v1/wallet/send-transaction
  → JwtAuthGuard
  → WalletController  (@Body() SendTransactionDto)
  → WalletService.sendTransaction()
      ├─ Resolve provider (ArgentX | Braavos)
      ├─ Check network / switch if needed
      ├─ Attempt send (retry w/ exponential backoff)
      ├─ Emit WalletEvents.TRANSACTION_SENT | REJECTED
      └─ Return tx hash
```

---

## Cross-Module Contracts

- **JWT payload shape** (canonical): `{ sub: userId, email, role }` — set by `JwtStrategy.validate`, consumed by all guards.
- **Cache keys** must be namespaced as `<module>:<entity>:<id>` to avoid collisions.
- **Realtime events** are defined in `src/common/gateways/README.md`; emitters must use the exact event name constants.
- **Audit** is triggered automatically by `AuditLogInterceptor` on any controller decorated with `@AuditLog()`.
- **Notifications** are fire-and-forget; callers must not depend on delivery ordering.

---

## Technology Decisions

| Concern | Choice | Notes |
|---|---|---|
| Framework | NestJS | Module/DI/decorator conventions; all new code follows NestJS idioms |
| ORM | TypeORM + PostgreSQL | Entities in `*.entity.ts`; migrations in `migrations/` |
| Cache | Redis (ioredis via CacheModule) | Also used for distributed locks |
| Auth tokens | JWT (access 15 m, refresh 7 d) | Revocation via token-blacklist in `JwtSecurityService` |
| WebSockets | Socket.IO via `@nestjs/platform-socket.io` | Single `/realtime` namespace |
| Observability | Winston + Prometheus + Loki/Promtail | See [Operational Runbooks](RUNBOOK.md) |
| Blockchain | StarkNet (primary) / Soroban shim | `BlockchainService`, `MintService`, wallet providers |
| Scheduler | `@nestjs/schedule` (cron) | Distributed lock prevents duplicate runs |

---

## Adding a New Module

1. `nest generate module <name>` inside `src/<name>/`.
2. Add the module to `AppModule` imports.
3. Define entities in `<name>/entities/*.entity.ts`; generate a migration (do **not** use `synchronize: true` in production).
4. Use `TypedConfigService` for any env access — never `process.env` directly.
5. Instrument with `@AuditLog()` on mutation endpoints.
6. Emit realtime events via `RealtimeGateway` if clients need live updates.
7. See the [Contributor Checklist](CONTRIBUTING.md#contributor-checklist) before opening a PR.
