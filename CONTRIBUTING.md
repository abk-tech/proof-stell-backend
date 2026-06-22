# Contributing to Proof-Stell Backend

Welcome to the Proof-Stell Backend — the decentralized backend service behind Proof-Stell, a competitive whack-a-mole game built on StarkNet. By leveraging smart contracts, on-chain leaderboards, and wallet-based identity, Proof-Stell offers a fair, fun, and verifiable gaming experience for everyone.

Before you code, read the canonical docs:
- [ARCHITECTURE.md](ARCHITECTURE.md) — module map, request lifecycle, cross-module contracts
- [RUNBOOK.md](RUNBOOK.md) — env vars, migrations, observability, scheduled jobs
- [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) — security requirements for every PR
- [README-config.md](README-config.md) — how to add and access config values

---

## Setup

```bash
git clone https://github.com/Proof-Stell/proof-stell-backend
cd proof-stell-backend
npm install
cp .env.example .env   # fill in required vars (see RUNBOOK.md)
npm run start:dev
```

App: `http://localhost:3000` · Swagger: `http://localhost:3000/api/docs`

---

## Git Workflow

**Branches:**

| Prefix | Purpose |
|---|---|
| `main` | Production-ready releases |
| `develop` | Latest tested features |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation only |
| `chore/*` | Maintenance / tooling |

**Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add leaderboard endpoint
fix: resolve wallet auth bug
docs: update architecture guide
chore: update dependencies
```

---

## Code Style

- Idiomatic TypeScript; strict mode enabled.
- NestJS conventions: service → controller → module layering.
- Use `TypedConfigService` for all env access — never `process.env` directly.
- Run `npm run lint` before committing.

---

## Testing

```bash
npm run test          # unit tests
npm run test:e2e      # end-to-end tests
npm run test:cov      # coverage report
```

- Unit tests live alongside their subjects (`*.spec.ts`).
- E2E tests live in `test/`.
- New features and bug fixes must include corresponding tests.

---

## Contributor Checklist

Use this when your change touches **more than one module**:

### Implementation
- [ ] New module added to `AppModule` imports.
- [ ] Entities have a corresponding migration in `migrations/`; `DB_SYNC` is **not** relied on.
- [ ] `TypedConfigService` used for all env access; new vars added to `validation.ts` and `configuration.ts`.
- [ ] `ValidationPipe`-compatible DTOs (class-validator decorators, `whitelist: true`).
- [ ] Sensitive response fields decorated with `@Exclude()`.

### Security
- [ ] Auth guards applied to all non-public endpoints (`@Public()` used intentionally).
- [ ] Role checks use the canonical `Role` enum, not string literals.
- [ ] No secrets, credentials, or PII committed to source.
- [ ] Cross-module contracts (JWT payload shape, cache key format, realtime event names) respected — see [ARCHITECTURE.md](ARCHITECTURE.md).

### Observability
- [ ] Mutation endpoints decorated with `@AuditLog()`.
- [ ] New cron jobs acquire a `DistributedLockService` lock before running.
- [ ] Errors are logged with enough context to diagnose in production.

### Documentation
- [ ] `ARCHITECTURE.md` updated if module responsibilities or data flows changed.
- [ ] Feature-level README updated (or created) linking to the canonical docs above.
- [ ] `RUNBOOK.md` updated for new env vars, scheduled jobs, or operational considerations.

---

## Opening a Pull Request

1. Create a branch from `develop` (not `main`).
2. Follow the PR template at `.github/pull_request_template.md`.
3. Ensure `npm run lint` and `npm run test` pass locally.
4. Reference the issue number in the PR description (`Closes #N`).

---

**ProofStell Backend — Powering decentralized gaming.**
