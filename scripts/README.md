# Scripts

> Environment setup: [RUNBOOK.md](../RUNBOOK.md)

## bench-db.ts

Measures baseline timings for common database queries (user lookup, session listing) to validate performance before and after schema/query changes.

**Usage:**

```bash
# Set environment variables
export DATABASE_URL="postgres://user:pass@localhost:5432/proofstell"
export BENCH_EMAIL="test@example.com"
export BENCH_USER_ID="<uuid>"

npx ts-node scripts/bench-db.ts
```

**When to run:**
- Before and after adding or modifying indexes in `migrations/`.
- After significant ORM query changes in `LeaderboardService` or `GameSessionService`.

Output is printed to stdout as a timing table. No data is written or deleted.
