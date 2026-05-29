# Skill Registry

**Agent-facing registry.** Any agent working in this repo MUST consult this registry before a code task, resolve the matching skills, and read the corresponding `SKILL.md` before writing code.

## Project Standards

- **Conventional Commits**: Commits MUST follow conventional commits, for example `feat(ui): ...` or `fix(db): ...`. NEVER include AI attribution or `Co-Authored-By`.
- **Frontend Vocabulary**: The frontend MUST use user-friendly, non-technical vocabulary. Avoid implementation references like "client-only wrapper" or "Server Component".
- **Cursor Pointer**: Interactive buttons and triggers MUST have `cursor-pointer` class/style.
- **Package Manager**: Use `pnpm` for dependency and script commands.
- **No Build By Default**: Do not run a build after changes unless the user explicitly asks.

## User Skills

| Trigger / Context | Skill | Path |
|---|---|---|
| Use when asked to improve accessibility, audit a11y, validate WCAG, screen reader support, keyboard navigation, or make UI accessible. | accessibility | `.agents/skills/accessibility/SKILL.md` |
| Use before creative work: creating features, building components, adding functionality, or modifying behavior. | brainstorming | `.agents/skills/brainstorming/SKILL.md` |
| Use when refactoring components with boolean prop proliferation, compound components, render props, context providers, or reusable component APIs. | vercel-composition-patterns | `.agents/skills/composition-patterns/SKILL.md` |
| Use when building or styling web UI: components, pages, apps, dashboards, HTML/CSS layouts, or visual polish. | frontend-design | `.agents/skills/frontend-design/SKILL.md` |
| Use when making a commit, preparing changes, finishing a task, or completing a feature. | git-commit | `.agents/skills/git-commit/SKILL.md` |
| Use when implementing or reviewing Next.js 16 Cache Components: PPR, `use cache`, cacheLife, cacheTag, updateTag, Suspense for dynamic data, or migration from `unstable_cache`. | next-cache-components | `.agents/skills/next-cache-components/SKILL.md` |
| Use when working on Next.js App Router code: route handlers, RSC boundaries, data fetching, async APIs, metadata, error/loading files, middleware/proxy, image/font optimization, or runtime/bundle decisions. | next-best-practices | `.agents/skills/next-best-practices/SKILL.md` |
| Use when upgrading Next.js, running codemods, migrating major versions, updating React/Next dependencies, or resolving upgrade breaking changes. | next-upgrade | `.agents/skills/next-upgrade/SKILL.md` |
| Use when creating Node.js backend services with Express/Fastify, middleware, error handling, auth, DB integration, REST/GraphQL APIs, or microservices. | nodejs-backend-patterns | `.agents/skills/nodejs-backend-patterns/SKILL.md` |
| Use when making Node.js architecture decisions, choosing frameworks, designing async patterns, reviewing security/deployment tradeoffs, or explaining backend fundamentals. | nodejs-best-practices | `.agents/skills/nodejs-best-practices/SKILL.md` |
| Use when orchestrating phased technical plans with agents, sub-agents, delegation, supervision, or final plan audits. | orquestar-planes | `.agents/skills/orquestar-planes/SKILL.md` |
| Use when explicitly planning implementation work: "planificá", "armá un plan", "antes de implementar", "scope this out", or "break this feature down". | planificar | `.agents/skills/planificar/SKILL.md` |
| Use when creating an interactive HTML artifact for specs, alternatives, mockups, design playgrounds, or HTML-based planning. | planificar-html | `.agents/skills/planificar-html/SKILL.md` |
| Use when writing Prisma Client queries: `findMany`, `create`, `update`, `delete`, filters, operators, `$transaction`, or client configuration. | prisma-client-api | `.agents/skills/prisma-client-api/SKILL.md` |
| Use when running Prisma CLI commands: `prisma init`, `generate`, `migrate`, `db`, `studio`, or `mcp`. | prisma-cli | `.agents/skills/prisma-cli/SKILL.md` |
| Use when configuring Prisma with Postgres/MySQL/SQLite/MongoDB or troubleshooting database connections. | prisma-database-setup | `.agents/skills/prisma-database-setup/SKILL.md` |
| Use when creating or operating Prisma Postgres databases through Console, create-db CLI, Management API/SDK, or programmatic provisioning. | prisma-postgres | `.agents/skills/prisma-postgres/SKILL.md` |
| Use when writing, reviewing, or refactoring React/Next.js code for performance, RSC, data fetching, hooks, rendering, or bundle optimization. | vercel-react-best-practices | `.agents/skills/react-best-practices/SKILL.md` |
| Use when performing security audits, penetration tests, vulnerability scanning, OWASP Top 10 checks, secret detection, or API security testing. | security-pen-testing | `.agents/skills/security-pen-testing/SKILL.md` |
| Use when improving SEO, search optimization, meta tags, structured data, sitemap, or search engine visibility. | seo | `.agents/skills/seo/SKILL.md` |
| Use when doing any Supabase task: Database, Auth, Edge Functions, Realtime, Storage, RLS, supabase-js, `@supabase/ssr`, sessions/JWT/cookies, CLI/MCP, or migrations. | supabase | `.agents/skills/supabase/SKILL.md` |
| Use when writing, reviewing, or optimizing Postgres queries, schema design, or database configuration. | supabase-postgres-best-practices | `.agents/skills/supabase-postgres-best-practices/SKILL.md` |
| Use when styling with Tailwind: responsive layouts, flexbox, grid, spacing, typography, colors, or design systems. | tailwind-css-patterns | `.agents/skills/tailwind-css-patterns/SKILL.md` |
| Use when implementing complex TypeScript type logic: generics, conditional types, mapped types, template literals, utility types, or compile-time safety. | typescript-advanced-types | `.agents/skills/typescript-advanced-types/SKILL.md` |
| Use when defining Zod schemas, string validations, `safeParse`, `z.infer`, or validation error handling. | zod | `.agents/skills/zod/SKILL.md` |

## Compact Rules

### accessibility
- Use semantic HTML before ARIA; add ARIA only when native semantics cannot express the interaction.
- Verify keyboard navigation, focus order, visible focus states, labels, names, and error messaging.
- Check color contrast and reduced-motion behavior for interactive/animated UI.

### brainstorming
- Before creative implementation, clarify intent, constraints, users, and expected behavior.
- Do not jump straight to code when product shape or interaction rules are still ambiguous.
- Keep the output actionable and tied to the current repo, not generic ideation.

### vercel-composition-patterns
- Avoid boolean prop proliferation; create explicit variants or compose children instead.
- Prefer compound components and providers for shared state over monolithic configurable components.
- Keep state management decoupled from UI so providers can swap implementations without changing presentation.

### frontend-design
- Avoid generic AI-looking UI; use distinctive hierarchy, spacing, typography, and purposeful visual language.
- Preserve the repo's existing design system unless the task is explicitly a redesign.
- Ensure desktop and mobile layouts load cleanly and interactive controls feel clickable.

### git-commit
- Commit completed feature, bugfix, refactor, docs, or configuration work before finishing.
- Use Conventional Commits: `<type>(<scope>): <short description>`.
- Never include AI attribution or `Co-Authored-By`.

### next-cache-components
- Use Cache Components only for Next.js 16+ cache/PPR work and pair dynamic data with Suspense boundaries.
- Use `use cache`, `cacheLife`, `cacheTag`, and `updateTag` intentionally; do not cargo-cult caching.
- Prefer explicit cache invalidation and clear boundaries between static, cached, and dynamic work.

### next-best-practices
- Server Components by default; add `use client` only for interactivity, browser APIs, or client hooks.
- Treat route handlers and Server Actions as public endpoints; validate input and authorization inside them.
- Follow App Router file conventions and Next.js async APIs for params, searchParams, cookies, and headers.
- Optimize images, fonts, metadata, error/loading boundaries, runtime choice, and bundle size where relevant.

### next-upgrade
- Detect current Next.js, React, and React DOM versions before choosing an upgrade path.
- Follow official migration guides and codemods; upgrade major versions incrementally when needed.
- Review breaking changes manually after codemods and verify affected app/router/config files.

### nodejs-backend-patterns
- Centralize middleware, validation, auth, and error handling instead of scattering route logic.
- Use explicit API contracts and consistent response/error shapes.
- Keep database, auth, and transport concerns separated enough to test and evolve safely.

### nodejs-best-practices
- Make architecture choices from constraints: runtime, deployment, security, data access, and team ergonomics.
- Prefer correct async flow, explicit error boundaries, and safe resource cleanup over clever abstractions.
- Explain the underlying Node.js concept when tradeoffs matter.

### orquestar-planes
- Break multi-phase plans by risk and domain, then delegate only when delegation adds value.
- Validate each deliverable against the original objective before moving to the next phase.
- Audit the full result at the end and surface remaining risks or blockers.

### planificar
- Use for explicit planning requests, not as a speed bump before straightforward implementation.
- Cover scope, sequence, risks, tradeoffs, verification, and files likely affected.
- Keep the plan implementable and avoid over-engineering.

### planificar-html
- Build standalone HTML artifacts only when the user wants visual/interactive exploration before execution.
- Make the artifact useful for iteration: alternatives, controls, annotations, or mock states.
- Do not treat it as production app code.

### prisma-client-api
- Use typed Prisma Client APIs and prefer narrow `select`/`include` shapes that match UI needs.
- Validate filters and transaction boundaries; avoid accidental N+1 query patterns.
- Use `$transaction` when writes must be atomic.

### prisma-cli
- Use `pnpm` to run Prisma commands in this repo.
- Pick the correct command for the lifecycle: generate, migrate, db push/pull, studio, or MCP.
- Do not run destructive DB commands without explicit user approval.

### prisma-database-setup
- Match Prisma provider, connection string, and schema configuration to the target database.
- Verify environment variables and connection behavior before changing migrations.
- Keep local setup, hosted DB setup, and production credentials clearly separated.

### prisma-postgres
- Use when provisioning or managing Prisma Postgres specifically, not generic Postgres usage.
- Handle service tokens/OAuth and Management API credentials carefully; never commit secrets.
- Prefer documented Console/CLI/API paths over ad-hoc database setup.

### vercel-react-best-practices
- Eliminate waterfalls with parallel fetching, Suspense boundaries, and request deduplication.
- Avoid unnecessary client bundle weight, barrel import costs, and hydration mismatch patterns.
- Do not add `useMemo`/`useCallback` by default; use them only when the rule or repo convention justifies it.

### security-pen-testing
- Only test authorized targets and report findings with severity, reproduction, impact, and remediation.
- Check secrets, dependencies, authz/authn, input validation, OWASP risks, and API behavior.
- Avoid destructive testing unless explicitly approved.

### seo
- Ensure page metadata, titles, descriptions, canonical data, robots behavior, sitemap, and structured data are correct.
- Keep SEO content user-facing and truthful; do not expose implementation details.
- Validate dynamic routes and Open Graph/Twitter metadata when pages are public.

### supabase
- Use Supabase-specific auth/session APIs carefully in Next.js SSR/client boundaries.
- Respect RLS and verify policies when touching database access or auth behavior.
- Never expose service role keys or secrets in client code.

### supabase-postgres-best-practices
- Optimize schema and queries with indexes, constraints, and realistic query plans.
- Prefer Postgres-native integrity over app-only enforcement where practical.
- Watch for RLS, query shape, and migration safety when changing data access.

### tailwind-css-patterns
- Use utility classes consistently and compose responsive layouts with clear spacing and grid/flex rules.
- Keep interactive controls visibly clickable with `cursor-pointer` where applicable.
- Avoid brittle arbitrary values unless they encode an intentional design decision.

### typescript-advanced-types
- Use advanced types to enforce real invariants, not to make simple code harder to read.
- Prefer clear generics, discriminated unions, and utility types over `any` or unsafe casts.
- Keep runtime validation separate from compile-time types when external data is involved.

### zod
- Parse unknown external input with schemas before trusting it.
- Use `safeParse` when returning user-friendly validation errors; use `parse` when exceptions are appropriate.
- Derive TypeScript types with `z.infer` from the schema source of truth.

## Project Conventions

| File | Path | Notes |
|---|---|---|
| AGENTS.md | `AGENTS.md` | Source of truth for repo context, coding rules, skills protocol, and commit rules. |
| CLAUDE.md | `CLAUDE.md` | Symlink to `AGENTS.md`; do not edit separately. |
| GEMINI.md | `GEMINI.md` | Symlink to `AGENTS.md`; do not edit separately. |
| Plan | `docs/plans/actualmente-en-el-repo-graceful-wirth.md` | Tracks the skill auto-invocation hardening work. |

## Inventory Note

This registry reflects the 25 project-level skills currently present under `.agents/skills/`. If another skill is installed later, rerun the skill registry update flow and commit the regenerated registry.
