# Verify cache independence in an isolated production build

Run `pnpm test:cache` against an **empty, disposable local Supabase project**.
The runner builds a temporary copy, exercises actual content/logout Server Actions,
and removes its own fixture data on success. It never deploys or purges production.

## Preconditions

- Docker, pnpm, and Playwright Chromium are available.
- Enable the disposable Auth email/password provider (`auth.email.enabled = true`);
  public signup may remain disabled. Fixtures confirm their own admin user without
  sending mail. The runner checks this provider before migrating or seeding.
- A dedicated Supabase CLI project has ID `nextcampus-isr-<lowercase-alphanumeric-id>`.
- Its containers are named `supabase_db_<project-id>` and
  `supabase_kong_<project-id>`, running with **only** `127.0.0.1` port bindings:
  database `56432`, API `56431`. Do not reuse a development/shared project.
- Academic tables and `UserAccount` are empty; migration-seeded catalogs may exist.
- The local database connection uses the local owner role, not an anonymous RLS role.
- Place the following local-only environment values in a private JSON file
  outside the repository, with `chmod 600`. Obtain keys from your dedicated local
  Supabase CLI status output; never copy production environment variables.

```json
{
  "DATABASE_URL": "postgresql://postgres:<local-password>@127.0.0.1:56432/postgres",
  "DIRECT_URL": "postgresql://postgres:<local-password>@127.0.0.1:56432/postgres",
  "NEXT_PUBLIC_SUPABASE_URL": "http://127.0.0.1:56431",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "<local-publishable-key>",
  "SUPABASE_SECRET_KEY": "<local-secret-key>",
  "SUPABASE_STORAGE_BUCKET": "cache-fixture",
  "ADMIN_EMAILS": "cache-fixture@example.test"
}
```

Supabase CLI can publish wildcard ports by default. Confirm actual Docker
bindings, not merely the loopback URLs shown by CLI status. A dedicated Docker
bridge with `com.docker.network.bridge.host_binding_ipv4=127.0.0.1` prevents this.
The runner refuses wildcard/IPv6 exposure or a mismatched container identity.

## Run

```sh
pnpm --config.verify-deps-before-run=false exec playwright install chromium
pnpm test:cache /private/local-env.json nextcampus-isr-yourid
```

The runner:

1. Validates local URLs, ports, private-file permissions and Docker identity.
2. Copies allowlisted project files into a mode-0700 temporary checkout without
   `.env*`, `.git`, existing `.next`, or inherited production/Upstash credentials.
3. Reuses local `node_modules`, applies migrations **only to the guarded DB**, and
   seeds 24 categorized notes, six historical/future events, commissions, an
   administrative Auth account, and private quiz/HTML Storage objects.
4. Generates private-only probe forms and cache-miss counters in that copy.
   No probe endpoint or instrumentation is added to repository `src`.
5. Runs `next build --webpack` (production rendering/cache semantics, predictable
   shared-node_modules resolution), then `next start` on loopback port 3100.
   Playwright uses one worker, no retries and no existing-server reuse.
6. Revokes the fixture session and deletes only its known academic rows, account,
   Auth user and Storage objects on success; removes the temporary checkout.
   It does **not** stop Docker or delete the Supabase project's containers/volumes.

Private logs and the temporary workspace are retained on failure. Do not paste
these logs, credentials, or fixture state into issues. After a scoped correction,
resume that exact fixture without reseeding:

```sh
pnpm test:cache /private/local-env.json nextcampus-isr-yourid \
  --resume /tmp/nextcampus-cache-proof-<runner-id>
```

Resume revalidates container identity and a fingerprint of the same local
configuration. Stop only the dedicated Supabase project when finished; never
use CLI `--all` or remove unrelated Docker containers/networks.

## Evidence and limits

| Runtime assertion | Evidence |
|---|---|
| Recent-note SQL correctness | Real PostgreSQL output matches the full unbounded feed for all 32 year/subject preference subsets and limits 0, 2, 6; tie-heavy/noisy/quiet subjects |
| Mobile payload behavior | Count-only commission rows/options preserve event counts; year calendar retains historical and future events |
| Warm cache reuse | Repeated reads do not increase private reader-miss counters |
| Event action dependencies | Real action refreshes event projections and public subject output; note details, quiz metadata and other year remain warm |
| Linked-note dependencies | Real title edit updates note/detail/recent/event projections; sibling note and quiz stay warm |
| Logout/privacy | Real logout navigation removes controls and protected access; warm academic reader counters remain unchanged; anonymous Storage public URL cannot read private HTML |

Numeric cache profiles, Argentina midnight calculation, structural mutations,
negative-cache invalidation, authorization rejection, compensating rollbacks,
author renames and secondary failures also have unit regressions. They are not
all browser-driven scenarios in this harness. Its private probe uses production
readers and actual actions but does not replace a complete administrative UI test.

Keep ordinary scoped path invalidations until a separate **tag-only** production
experiment proves all affected route variants. This harness does not remove those
paths or claim that current refreshes are exclusively attributable to tags.
Counters/HTML sizes are not Vercel billed ISR write units. Actual savings require
same-project daily usage observation after deployment; compare activity and
CPU/invocation changes over seven days without a global purge.

## Recorded verification

On 2026-10-14, a fresh invocation of the command above completed the full guarded
migration/fixture/production-build/browser/cleanup pipeline: **four Playwright
scenarios passed in 12.9 seconds**. Cleanup readback confirmed zero academic
fixture rows/accounts and zero fixture Auth users. The unit suite passed **352
tests in 49 files**; typecheck, lint and diff checks passed. React Doctor reported
89/100 with no issues. The build-required profile-page presentation helpers were
moved to a plain adjacent module without changing their behavior.
