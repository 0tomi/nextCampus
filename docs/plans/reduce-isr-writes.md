# Reduce ISR writes without sacrificing freshness

Approved implementation scope: remove unnecessary shared-cache invalidation,
reduce serialized academic data, and extend only selected aggregate lifetimes.
Savings must be measured; no reduction percentage is promised.

## Diagnostic basis

The accepted diagnosis compared source and deployed commit `394ca97`. Logout
invalidates the root layout even though it changes only the user's session.
Vercel's detailed ISR metrics returned `402` requiring Observability Plus, so the
share of consumption attributable to each behavior remains unconfirmed. The
reported baseline was 43 test files and 292 passing tests.

ISR writes are billed in 8 KB units, not visits or database writes; identical
regenerated output does not incur new write units. See [Vercel's ISR limits and
pricing](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing).

## Ordered work units

### A. Stop invalidating academic content on logout

Remove only the root-layout `revalidatePath` call and import from the sign-out
action. Preserve authentication, Supabase sign-out, cookie handling, and the
client's full navigation to `/`. Add no replacement path or tag invalidation.
Regress successful logout, rejected authentication, and thrown sign-out errors.

### B. Make cache dependencies explicit

Add `subject-content:<slug>`, `apunte:<subjectSlug>:<apunteSlug>`,
`year-meta:<slug>`, `latest-apuntes-year:<slug>`, and `subject-authors:<slug>`.
Keep `subject:<slug>` for identity and structural changes. Register tags derived
from arguments before querying, including negative-cache results.

- Events invalidate subject content, year events, and global events, not unrelated
  apunte details or quiz metadata.
- Apuntes invalidate their detail, subject list, and global/year recent lists.
  Capture previous title, slug, and related-event count before mutations; linked
  title/slug changes and deletions also invalidate affected events.
- Author-name edits invalidate affected author projections and years with events.
  Structural changes cover old/new identities, negative results, recent lists,
  and cascading deletions. Preserve period and quiz-bank tags.
- Extend apunte invalidation context with `apunteSlugs` and
  `affectsRelatedEvents`. Keep helpers query-free and deduplicate invalidations.
- Use immediate `updateTag` after the primary visible write commits, before
  scoring, auditing, or file cleanup. Do not invalidate rejected/rolled-back
  operations; invalidate conservatively if compensation is uncertain.

Keep existing scoped path invalidation until production-mode tests prove tag
propagation. Retain structural paths and exact created, renamed, or deleted
apunte paths. Update cache documentation to describe actual `updateTag` semantics.

### C. Reduce payloads without losing results

Replace mobile year spreads with explicit projections; count-only events carry
`{ commissionId }`. Mobile/modal commissions carry `{ id, slug, nombre }`, not
complete agendas. Keep full event details where displayed or administered.
Remove unused year `calendarEvents` computation and verified-unused calendar
fields (author ID, commission ID/list, year order). Add stable ID tie-breakers.

Fetch recent apuntes with parameterized `ROW_NUMBER()` partitioned by subject,
ordered by `updatedAt DESC, id DESC`, retaining six per subject. Share
`HOME_LATEST_APUNTES_LIMIT = 6` with the adapter; preserve DTOs, dates, and
preference filtering. Do not replace this with a global six-row limit.

### D. Extend only three aggregate lifetimes

After correcting dependencies, set `getHomeCalendarEvents`, `getLatestApuntes`,
and `getLatestApuntesByYear` to `stale: 300`, `revalidate: 1800`, `expire: 3600`.
Keep all other profiles, including `getTodayKeyAR` at `900/3600`. The year's
fifteen-minute date dependency remains; do not infer proportional write savings.

### E. Verify safely, then measure rollout

Use Playwright against a production build on port 3100, one worker, without
server reuse. Provision disposable local Supabase with academic, auth, and
Storage fixtures. Validate local URLs before migrations/seeding. Build in a
temporary checkout without `.env*`, inherited production credentials, or Upstash.
Use `pnpm exec next build` and `next start`; `pnpm build` includes migrations and
must not target a shared database for these tests.

Verify exact tag sets and excluded tags, linked apuntes, identity/author changes,
negative results, cascading deletions, primary-write/secondary-failure ordering,
rollback behavior, stable recent-result equivalence under preferences, mobile
counts, historical/future calendars, midnight transitions, and session privacy.
Require baseline checks and smaller DTOs with unchanged fixture behavior.

Deliver sequentially with conventional commits per validated work unit, including
tests and documentation, without AI attribution. Deploy logout first, then later
units, without a global purge. Compare same-project daily ISR increments over
seven days, noting activity/content edits and CPU/invocations to detect cost shifts.

## Non-goals and constraints

No slug, schema, permission, calendar-history, or preference changes. No paid
Observability upgrade, provider migration, global dynamic rendering, or global
prefetch disabling. Expired proxy cookies and logout error handling are separate
follow-ups, not confirmed ISR causes. This document records approved scope, not
runtime progress or verification status.

## Follow-up: isolate the year day and responsive event payload

The accepted follow-up removes getTodayKeyAR from getYearRouteContext, not by
lengthening that date cache but by streaming the current Argentina day into only
the upcoming-list boundaries. It shares one canonical all-date event projection
across the desktop calendar/upcoming list and mobile agenda, deriving presentation
titles and date filtering at consumption rather than serializing separate lists.
The heavy public readers and all existing scoped invalidations are unchanged.
The year shell can follow its remaining aggregate dependencies (currently 1,800
seconds) while an open page still refreshes at Argentina midnight or tab resume.

Regression coverage includes SSR/static-boundary placement, clock rollover and
cleanup, complete calendar history and a smaller shared event DTO. The isolated
production harness records persisted HTML/RSC sizes and same-data regeneration
hashes separately from streamed auth/date output. This is an implemented
optimization and reproducible measurement path, not a measured billing reduction.

### Follow-up verification status (2026-10-23)

The final guarded production build passed (85 pages); ordinary pnpm check passed
456 tests across 68 files, typecheck and lint, and React Doctor reported 100/100.
The independent browser run finished **4 passed / 1 failed**, not a green full
harness. Year output regeneration passed with byte-identical HTML (65,984 bytes)
and full RSC (43,068 bytes); fixture year lifetimes were 1,800/3,600 seconds.
Linked-note freshness passed in that final run.

The retained failure is ordinary event public-HTML freshness after a real action,
reproduced separately on clean main 83cbeb9 with the same disposable stack and
webpack. The assertion and scoped invalidations remain unchanged. Its root cause
is not confirmed, and it remains a known baseline functional blocker rather than
a merge-ready claim. No equivalent-input before/after payload percentage or
Vercel billing reduction was established. See the testing guide for proof limits.
