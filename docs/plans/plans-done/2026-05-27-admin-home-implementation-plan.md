# Plan de implementación: perfil admin y mejoras del home

## Referencia visual

- Mock opcional: `docs/plans/2026-05-27-admin-home-improvements.html`
- Usarlo como referencia si ayuda con layout/copy. No es fuente obligatoria de verdad técnica.
- Para `/admin/perfil`, priorizar la estética real de `/admin`: `DashboardShell`, `AdminSidebar`, `bg-surface-0/1/2`, `border-white/5`, radios `md/lg`, `font-display`, badges tipo sidebar.

## Goal

Implementar una sección de perfil dentro de `/admin` para que cualquier admin pueda cambiar su correo y contraseña, abrir `/admin` a admins normales sin exponer gestión de usuarios/historial, y mejorar el home con eventos más claros, últimos apuntes y un toggle admin para años ocultos.

## Non-goals

- No rediseñar completo el home ni el panel admin.
- No cambiar el modelo de roles existente (`ADMIN_GENERAL`, `ADMIN_CAMPUS`).
- No agregar signup público ni recuperación de contraseña.
- No ejecutar `pnpm build`; en este proyecto no se corre build desde agentes.
- No usar Playwright para validar este plan salvo que el usuario lo pida explícitamente.

## Assumptions

- `ADMIN_GENERAL` puede gestionar usuarios e historial; `ADMIN_CAMPUS` solo debe ver `Mi perfil` dentro de `/admin`.
- El cambio de contraseña debe pedir contraseña actual, nueva contraseña y confirmación.
- El cambio de correo se aplica al admin autenticado, nunca a un `userId` recibido desde el cliente.
- Las tarjetas clickeables de eventos y apuntes no deben verse como links subrayados.
- El toggle “Mostrar años ocultos” es un estado local para admins; no modifica preferencias en cookie/localStorage.

## Affected Surface

| Estado | Archivo |
| --- | --- |
| Modify | `src/app/admin/page.tsx` |
| Modify | `src/app/admin/AdminSidebar.tsx` |
| Create | `src/app/admin/perfil/page.tsx` |
| Create | `src/app/admin/perfil/actions.ts` |
| Create | `src/app/admin/perfil/ProfileForm.tsx` |
| Review/Maybe Modify | `src/lib/auth.ts` |
| Modify | `src/lib/queries.ts` |
| Modify | `src/app/page.tsx` |
| Modify | `src/components/home/HomeGlobalCalendar.tsx` |
| Modify | `src/components/home/HomeYearsGrid.tsx` |
| Maybe Modify | `src/components/calendar/EventCalendar.tsx` |
| Maybe Modify | `src/components/mobile/home/MobileHome.tsx` |
| Review/Maybe Modify | tests near `src/lib/auth.test.ts`, `src/lib/supabase/auth-errors.test.ts`, component-adjacent tests if existing |

## Risks

- Auth consistency: changing email must keep Supabase Auth and `UserAccount.email` synchronized.
- Authorization leakage: opening `/admin` to `ADMIN_CAMPUS` must not expose `/admin/users` or `/admin/historial`.
- Home filtering: latest notes and events must respect existing user preferences.
- UX regression: clickable cards must remain card-like, not underlined links.
- Cache invalidation: new/updated note queries should use existing cache tags consistently.

## Sizing

Overall size: **M**. It touches auth, admin routing, server actions, home queries and multiple UI components, but no schema migration should be needed.

## Phase 1: Admin Access And Navigation

Goal: Allow all active admins into `/admin`, while keeping privileged sections visible and accessible only to general admins.

Tasks:

- Update `src/app/admin/page.tsx`:
  - Use `getAdminUser()` as today.
  - Redirect unauthenticated users to `/admin/login`.
  - Redirect `admin.canCreateUsers` or `ADMIN_GENERAL` to `/admin/users`.
  - Redirect `ADMIN_CAMPUS` to `/admin/perfil`.
- Update `src/app/admin/AdminSidebar.tsx`:
  - Add item `Mi perfil` pointing to `/admin/perfil`.
  - Use `useAdminSession()` or existing client session helpers to decide which items render.
  - Render `Mi perfil` for all admins.
  - Render `Usuarios` and `Historial` only when `admin.canCreateUsers` is true.
  - Keep the current sidebar component and badge language. Add a profile badge that fits the existing gradients.
- Keep `src/app/admin/users/page.tsx`, `src/app/admin/users/create/page.tsx`, `src/app/admin/users/edit/[id]/page.tsx`, and `src/app/admin/historial/page.tsx` protected with `requireGeneralAdmin()`.

Validation:

- Anonymous visit to `/admin` redirects to `/admin/login`.
- General admin visit to `/admin` redirects to `/admin/users`.
- Campus admin visit to `/admin` redirects to `/admin/perfil`.
- Campus admin sidebar only shows `Mi perfil`.
- General admin sidebar shows `Mi perfil`, `Usuarios`, and `Historial`.

Recommended skills:

- `next-best-practices` for App Router route/page boundaries.
- `vercel-react-best-practices` if refactoring client sidebar behavior.

## Phase 2: Admin Profile Page

Goal: Create `/admin/perfil` following the current `/admin` visual system and allowing self-service email/password updates.

Tasks:

- Create `src/app/admin/perfil/page.tsx`:
  - Require any admin with `requireAnyAdmin()`.
  - Render inside existing `DashboardShell` from `src/app/admin/layout.tsx`; do not create a separate shell.
  - Use `font-display`, `text-violet-200/70` style eyebrow, `text-white/55` helper copy, and card styles like `/admin/users`.
  - Show current email, role label, and assigned years summary.
- Create `src/app/admin/perfil/ProfileForm.tsx` as a client component:
  - Use `useActionState` and `useFormStatus`, matching `AdminUserForm` patterns.
  - Split into two visually separate cards: `Correo` and `Contraseña`.
  - Email card fields: current email readonly, new email.
  - Password card fields: current password, new password, confirm new password.
  - Buttons must include `cursor-pointer`.
  - Visible copy must be user-friendly. Do not mention Supabase, service role, server actions, DB, JWT, backend, frontend, or infrastructure.
- Create `src/app/admin/perfil/actions.ts`:
  - Use `zod` schemas for validation.
  - Use `requireAnyAdmin()` at the top of every action.
  - Never accept target user id from form data.
  - Email update action:
    - Validate email and normalize lowercase.
    - Check `UserAccount.email` uniqueness excluding current account.
    - Update Supabase Auth for `admin.authUserId` using server-only admin client.
    - Update `UserAccount.email` in Prisma.
    - If Prisma update fails after Auth update, attempt best-effort rollback of Auth email.
    - Record audit log if there is an existing suitable audit action; otherwise add a clear action constant.
    - Revalidate `/admin/perfil` and any user/admin paths that show this email.
  - Password update action:
    - Validate current password, new password min length, confirmation match.
    - Prefer session-scoped Supabase `auth.updateUser({ password, currentPassword })` with the authenticated server client, since project uses `@supabase/supabase-js@2.106.0`.
    - If type/API friction appears, use a server-only fallback with `auth.admin.updateUserById(admin.authUserId, { password })`, but keep the current-password verification requirement if feasible.
    - Record audit log with `passwordChanged: true`, without storing password values.

Validation:

- Invalid email shows a friendly error.
- Duplicate email shows a friendly error.
- Password mismatch shows a friendly error.
- Password shorter than 8 chars shows a friendly error.
- Campus admin can load and submit `/admin/perfil`.
- Campus admin still cannot load `/admin/users` or `/admin/historial`.
- No secret/service-role client imports appear in client components.

Recommended skills:

- `supabase` for auth update details.
- `zod` for form schemas and friendly validation.
- `nextjs-supabase-auth` if session/client auth behavior needs extra care.

## Phase 3: Home Calendar Improvements

Goal: Make global home events easier to identify and navigate.

Tasks:

- Update `src/lib/queries.ts` in `getHomeCalendarEvents()`:
  - Include enough year metadata for display: at minimum `year.nombre`; if available/needed, include `year.orden`.
- Update mapping in `src/app/page.tsx`:
  - Pass `yearNombre` or `yearLabel` into `homeCalendarEvents`.
- Update `src/components/home/HomeGlobalCalendar.tsx`:
  - Add year tag to each upcoming event card.
  - Make the whole event card clickable via `Link` to `buildSubjectHref({ yearSlug, subjectSlug, commissionSlug })`.
  - Ensure card links have `text-decoration: none` equivalent through Tailwind/no underline styling.
  - Keep the current card visual style; do not redesign the section.
  - Preserve existing preference filtering for years, subjects and commissions.
- Optional: update expanded calendar click behavior:
  - If `EventCalendar` already supports `onEventClick`, pass a handler from `HomeGlobalCalendar` to navigate to the subject route.
  - If navigation from client component is needed, use `useRouter()` from `next/navigation`.

Validation:

- Event cards show event type, year, subject and date.
- Clicking an event card navigates to the subject/commission route.
- Hidden years/subjects/commissions do not show events.
- Empty state remains unchanged.

Recommended skills:

- `next-best-practices` for client navigation boundaries.
- `vercel-react-best-practices` for keeping client state minimal.

## Phase 4: Latest Notes Section

Goal: Add a useful “Últimos apuntes subidos” section below the calendar.

Tasks:

- Add query in `src/lib/queries.ts`, likely `getLatestApuntes(limit = 6)`:
  - Query `prisma.apunte.findMany({ orderBy: { createdAt: 'desc' }, take: limit })`.
  - Select `id`, `titulo`, `createdAt`, `subject.slug`, `subject.nombre`, `subject.year.slug`, `subject.year.nombre`, and `subject.id` if needed for preferences.
  - Use `unstable_cache` with a new cache tag, for example `latest-apuntes`.
  - Ensure note creation/update/delete actions revalidate this tag if current actions only revalidate subject/career tags.
- Update `src/app/page.tsx`:
  - Fetch latest notes in the existing `Promise.all`.
  - Pass notes to a new or existing home component.
- Create `src/components/home/HomeLatestApuntes.tsx` or colocate only if minimal:
  - Client component if it needs preference filtering via `usePreferences`.
  - Filter out notes whose year/subject are hidden.
  - Display up to 6, but layout should naturally show 4 on common desktop width and wrap responsively.
  - Cards navigate to the subject route with `buildSubjectHref`.
  - Cards must not look like underlined links.
  - Copy should be friendly: “Últimos apuntes subidos”, “Material nuevo para repasar”.
- Consider mobile:
  - Either add the section to `MobileHome` in the same pass or explicitly leave it desktop-only only if user accepts. Recommended: include mobile, because home already has mobile-specific rendering.

Validation:

- Latest notes appear below calendar on desktop.
- Notes respect hidden year/subject preferences.
- Clicking a note opens its subject.
- Empty state is friendly when no notes exist or all are filtered.
- Creating/updating/deleting notes refreshes the section after cache revalidation.

Recommended skills:

- `next-best-practices` for cached query and revalidation.
- `vercel-react-best-practices` for client filtering without unnecessary memoization.

## Phase 5: Admin Toggle For Hidden Years

Goal: Let admins temporarily see hidden years in the home list without changing the user's preferences.

Tasks:

- Update `src/components/home/HomeYearsGrid.tsx`:
  - Use existing `useAdminAccess()`/`AdminControls` to determine if the viewer is an admin.
  - Add local state `showHiddenYears`, default `false`.
  - Compute visible years as:
    - Normal users: current behavior.
    - Admin with `showHiddenYears=false`: current behavior.
    - Admin with `showHiddenYears=true`: include hidden years, but still mark them visually as hidden.
  - Place button beside the existing `AddYearButton` area, not below the grid.
  - Button copy: `Mostrar años ocultos` / `Ocultar años ocultos`.
  - Do not write to preferences.
  - Hidden years shown through this toggle should be visually subdued but usable.
- Ensure both dense grid and low-subject card section paths handle hidden years consistently.
- Consider mobile equivalent in `src/components/mobile/home/YearCarousel.tsx` only if admin home mobile controls already support comparable add-year UI. If not, leave a note in implementation summary.

Validation:

- Non-admins never see the toggle.
- Admins see the toggle next to add-year controls.
- Toggle defaults off after refresh.
- Toggling does not change localStorage or cookie preferences.
- Hidden years appear only while toggle is on.

Recommended skills:

- `vercel-react-best-practices` for local state and conditional rendering.

## Phase 6: Tests And Verification

Goal: Prove the feature works without over-testing implementation details.

Tasks:

- Add/update unit tests where existing test structure makes sense:
  - Auth helper tests if adding role/capability logic.
  - Zod schema tests for profile form validation if schemas are exported or easy to test.
  - Query tests only if this repo already tests query helpers; otherwise skip.
- Run targeted checks:
  - `pnpm lint`
  - `pnpm test` if test suite is stable and relevant.
- Do not run `pnpm build`.
- Do not use Playwright unless the user explicitly asks.
- Manually inspect code for frontend copy rule:
  - No mentions of Supabase/Auth/DB/server/client/framework in visible UI strings.
  - Buttons include `cursor-pointer` when clickable.

Validation:

- Lint passes or failures are unrelated and documented.
- Tests pass or failures are unrelated and documented.
- Authorization checks are server-side, not only UI gates.

## Execution Notes

- Implement in order. Do not start home changes before `/admin/perfil` access and sidebar behavior are correct.
- Keep edits minimal. Prefer existing components/styles over new abstractions.
- Do not add backwards-compatibility paths unless a real persisted behavior requires it.
- Preserve user changes in the working tree; do not revert unrelated files.
- If asked to commit after implementation, use Conventional Commits and no AI attribution.

## Suggested Final Handoff Summary

When implementation is done, report:

- What changed in admin access/profile.
- What changed in home calendar/latest notes/hidden years.
- What validations ran.
- Any decisions made differently from this plan and why.
