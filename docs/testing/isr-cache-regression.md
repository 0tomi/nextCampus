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
| Event action dependencies | Reader refresh/isolation passes; ordinary public subject HTML freshness remains blocked in the final 2026-10-23 run (see caveat below) |
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

## Year shell and same-data output regression

The year route now starts a request-time Argentina-day promise without awaiting it
in the route context. A shared client event provider serializes one all-date event
projection for both responsive layouts. Only the two upcoming-list consumers read
the promise, below their own Suspense boundaries. The initial day is supplied by
the server for SSR/hydration; browser midnight, focus and visibility updates keep
an already-open page current. Calendar history, hero, subject links and headings
remain in the static shell. Other consumers of getTodayKeyAR keep its original
cache profile; no academic reader TTL or invalidation path was weakened.

The isolated harness checks the production prerender manifest for at least 1,800
seconds of year-shell revalidation (rather than the old 900-second daily-date
dependency), checks static shell content, then exercises Next's native on-demand
regeneration protocol against the disposable loopback build. Its local preview
token stays inside that request. It does not replace or bypass the separate real
event/note action freshness assertions.

Next 16.3 retains immutable build seeds under .next/server/app; regenerated output
lives under .next/server/route-cache/APP_PAGE, scoped by the source route hash.
The test derives the actual storage key with the installed Next version's helper,
confirms the scoped HTML publication time advanced, and records SHA-256, byte size
and byte equality for the mutable HTML and _full.segment.rsc artifacts. The
persisted-year-regeneration.json attachment and bounded console report are
measurements, not assertions that framework boundary identifiers must be identical.
The streamed HTTP response is deliberately not hashed: its auth/date resume
boundary is not the persisted static shell.

Unit regressions separately prove the request-day read occurs after the runtime
gate, complete calendar history and lean shared projections, narrow desktop/mobile
Suspense boundaries, Argentina-midnight rollover and listener/timer cleanup.
These checks do not measure Vercel billing or justify removing scoped
revalidatePath freshness protections.

### Current verification caveat (2026-10-23)

The final independent guarded resume completed a production build of **85 pages**.
Browser verification finished **4 passed / 1 failed**: SQL/projection equivalence,
unchanged year output, linked-note freshness and logout/privacy passed; ordinary
event public-HTML freshness failed. The corrected year output test confirmed two
native on-demand regenerations produced byte-identical persisted HTML (65,984
bytes) and full RSC (43,068 bytes), with matching SHA-256 values. Fixture year
routes had 1,800-second revalidation and 3,600-second expiry. These are local
fixture measurements, not Vercel billed sizes.

Ordinary checks passed: **456 tests in 68 files**, typecheck and lint through
pnpm check; React Doctor reported **100/100**. These passing checks do not make
the full browser harness green or establish merge readiness.

The remaining event test refreshed its cached reader/probe data but ordinary
anonymous public HTML retained the old title. A separate clean-main build at
83cbeb9 reproduced the same symptom, so it was not introduced by this change.

#### Root cause and fix (2026-10-23)

A database-free minimal app reproduces the failure on Next 16.3.8, 16.4.2 and
16.5.0-canary.24 with `cacheComponents`, `generateStaticParams`, any
`loading.tsx` above the page, a tagged `"use cache"` reader and an action that
calls `updateTag`/`revalidatePath`:

1. The action correctly expires the concrete route (`/primero/noisy`).
2. On the next request, `next start` treats the expired entry as a miss and
   serves the generic fallback shell (`/primero/[subjectSlug]`) instead of
   regenerating the concrete route.
3. That shell resumes with a read-only Resume Data Cache seeded from the
   build-time concrete prerender. Next only discards seed entries for tags
   revalidated in the same request, so the old title is served indefinitely.

Two independent fixes are applied:

- `patches/next@16.3.8.patch` (pnpm `patchedDependencies`) makes resumed
  requests also check the cache handler's persisted tag expirations before
  reusing a seed entry. Verified with webpack and Turbopack builds; the unpatched
  control stays stale. Re-check or drop the patch on every Next upgrade.
- Subject, commission and note routes no longer export `generateStaticParams`,
  so no concrete prerender seeds their fallback shells. Their pages render from
  the shared static shell plus tagged `"use cache"` readers, which removes their
  per-path ISR entries at the cost of resuming each visit.

The fallback path lives behind `!isMinimalMode`, so Vercel may not exhibit the
same indefinite staleness; that was not verified remotely. The full guarded
harness has **not** been re-run after these fixes. Both public freshness
assertions remain intact.

A paired clean-main/candidate artifact comparison was also attempted, but the two
server processes' reader snapshots differed after mutations. Its byte counts are
not an equivalent-input baseline and support no payload-reduction percentage.
Re-running the guarded harness remains necessary before claiming complete
production verification.
