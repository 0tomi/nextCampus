# Plan: Eliminar sobre-ingeniería y deuda técnica en nextCampus

## Contexto

Auditoría de arquitectura ejecutada con la skill `improve-codebase-architecture` (3 agentes Explore sobre datos/lib, UI/hooks y rutas/actions/auth). Objetivo del usuario: **eliminar sobre-ingeniería, eliminar deuda técnica y dejar una arquitectura más clara y human-readable**.

Diagnóstico global: la base está sana en lo estructural (no hay capa repositorio innecesaria sobre Prisma, las pages son finas con patrón `*-route-context.ts` + `*RoutePage.tsx`, el dominio puro en `src/lib/domain/` está testeado). La deuda real es puntual y concentrada:

- ~155 LOC de queries muertas y una ruta API sin consumidores.
- Doble chequeo de auth en ~15 server actions y 16 bloques `catch` copy-pasteados con 3 formas de error distintas.
- Invalidación de caché mitad centralizada (helpers en `shared.ts`) y mitad inline ad hoc (`subjects.ts`, `years.ts`), con un wrapper que shadowea el nombre `revalidateTag` de Next.
- 6 resolvers de scope casi idénticos en `auth.ts` (~230 LOC) que además son el authorization boundary y **no tienen tests**.
- Pares de adapters casi duplicados en `lib/domain` y passthroughs de un solo consumidor.
- Cero primitivas de formulario: 180 `<button>` inline, el mismo className de label repetido 14×, de input 10×, en 7 modales admin.
- God-components: complejo ApunteModal (~1.26K LOC entre 4 archivos, con 2 hooks de un solo consumidor), EventModal con 9 `useState` interdependientes (viola la regla `prefer-useReducer` del repo), ApunteRecursoView (789 LOC multiplicado por un prop `variant`), y ~30 sub-componentes presentacionales re-implementados en cada uno de los 3 archivos del mapa.

Decisiones del usuario (grill):
1. **Refactor + tests**: al colapsar los resolvers de auth, testear el resolver genérico y los guards.
2. **Primitivas UI con shadcn/ui**, adaptadas al tema oscuro actual.
3. **Eliminar ambas superficies API**: `/api/quiz/banks` (muerta) y el round-trip a `/api/admin/me` (hidratar desde server render).
4. **Todo en este plan**, god-components incluidos, en orden.

## Reglas transversales (aplican a TODAS las fases)

- El agente ejecutor de cada fase DEBE leer `.atl/skill-registry.md` y cargar las skills indicadas en la fase antes de escribir código.
- Al cerrar cada fase: `pnpm typecheck` + tests afectados (`pnpm test`), y un commit **Conventional Commits** sin atribución a IA (skill `git-commit`). Un commit por fase como mínimo; ítems independientes grandes pueden ir en commits separados.
- `pnpm build` completo SOLO al final del plan (Fase 8), no por fase.
- NO cambiar slugs de rutas. NO tocar el schema de Prisma ni correr migraciones (la DB es única: dev ES prod).
- Frontend: vocabulario user-friendly, nada técnico de cara al usuario; botones con `cursor-pointer`.
- Cambios de comportamiento visual: cero. Todo esto es refactor; la UI debe quedar pixel-igual salvo donde se indique.

---

## Fase 1 — Código muerto (riesgo cero)

**Objetivo:** borrar lo que no tiene consumidores. Verificar con `rg` cada símbolo antes de borrar.

Tareas:
1. `src/lib/queries.ts`: eliminar `getAdminSubjectBySlug` (~líneas 579–677, ~99 LOC) y `getUpcomingEventsCrossYear` (~líneas 745–800, ~56 LOC). Ambas con cero consumidores; la segunda fue superseded por `getHomeCalendarEvents`.
2. Eliminar `src/app/api/quiz/banks/route.ts` (ningún `fetch` la consume).
3. `src/lib/auth.ts`: eliminar el alias `canAdminManageYear = adminCanManageYear` (línea ~325). Evaluar el alias `requireAdmin = requireAnyAdmin`: si tiene consumidores, migrarlos a `requireAnyAdmin` y borrar el alias.
4. Quitar `export` a los tipos usados solo internamente: `QuizBankContributionRevocation` (storage), `ContributionBatchRevoke` (contributions), `ChangelogEntryDTO/ChangelogPageDTO` (changelog), `DriveParsed` (recursos), `RecordAuditInput` (audit), `SlugifyOptions` (slug).

**Skills sugeridas:** `git-commit`.
**Verificación:** `pnpm typecheck && pnpm test`. Commit `refactor(cleanup): eliminar queries, ruta api y aliases sin consumidores`.

---

## Fase 2 — Server actions: auth doble, errores unificados, consistencia

**Objetivo:** una sola forma de escribir una action: scope-guard → Zod → prisma → invalidar → audit → error shape único.

Archivos: `src/app/admin/actions/{eventos,apuntes,subjects,years,periodos,quiz,session,shared}.ts`, `src/app/admin/users/actions.ts`, `src/app/admin/perfil/actions.ts`, `src/app/admin/actions.ts` (barrel).

Tareas:
1. **Eliminar el doble chequeo de auth**: quitar el `await requireAuth()` / `requireAuth('academic')` inicial en toda action donde inmediatamente sigue un `requireYearAdminFor*` (que ya invoca `requireAnyAdmin()` internamente). ~15 call sites (ej: `apuntes.ts:321,327`, `eventos.ts:130,140`, `quiz.ts:34,44`, `subjects.ts:58,60`). Verificar caso por caso que el scope helper impone un chequeo igual o más fuerte.
2. **Helper único de errores** en `shared.ts`: `actionError(err, fallback): { ok: false, message }` que maneje `ZodError`, `ActionInputError` y genérico. Reemplazar los 16 bloques `catch` inline y los dos `errorMessage()` locales (`users/actions.ts:61`, `perfil/actions.ts:19,61`). Colapsar `ProfileActionError` en `ActionInputError`.
3. **Consistencia raw-vs-wrapper**: donde existe el patrón `createEvento` (raw, lanza) + `createEventoAction` (envuelve), aplicarlo también a `updateEventoAction` y a `periodos.ts` que hoy lo inlinean.
4. **Barrel**: exportar `createCategoriaAction` desde `actions.ts` y actualizar el import profundo en `PeriodoManager.tsx:12`.

**Skills sugeridas:** `next-best-practices`, `zod`, `git-commit`.
**Verificación:** `pnpm typecheck && pnpm test` (en especial `actions.test.ts` y `perfil/actions.test.ts` deben seguir en verde). Commit `refactor(actions): unificar guards de auth y manejo de errores`.

---

## Fase 3 — Invalidación de caché centralizada

**Objetivo:** que toda invalidación pase por helpers por entidad; cero secuencias inline de tags.

Archivos: `src/app/admin/actions/{shared,subjects,years}.ts`, `src/lib/queries.ts`, `src/lib/storage.ts`.

Tareas:
1. Renombrar el wrapper `revalidateTag` de `shared.ts` (que en realidad llama `updateTag` de Next) a `invalidateTag`, para dejar de shadowear el nombre del framework. Actualizar consumidores.
2. Crear `revalidateYearContent` en `shared.ts` y rutear por helpers: `createSubjectAction` (hoy inlinea en `subjects.ts:120–124`) y todo `years.ts` (líneas ~93–94, 174–182, 308–315) que hoy repiten a mano `career + year(...) + subject(...) + quizBanksCacheTag(...)`.
3. Mover `quizBanksCacheTag` de `storage.ts:12` a la tabla `TAGS` de `queries.ts` (o re-exportarla desde ahí), para que todo el vocabulario de tags viva en un solo lugar.
4. Verificar `TAGS.categorias` y `TAGS.tiposEvento`: se setean en lectura (`queries.ts:521,681`) pero ninguna action los invalida. Si esas entidades se editan en runtime, agregar la invalidación que falta; si son seed-only, documentarlo con un comentario de una línea junto al tag.

**Skills sugeridas:** `next-cache-components`, `next-best-practices`, `git-commit`.
**Verificación:** `pnpm typecheck && pnpm test`. Revisar manualmente (grep) que no quede ningún `updateTag`/`revalidateTag` inline fuera de `shared.ts`. Commit `refactor(cache): centralizar invalidacion por entidad y vocabulario de tags`.

---

## Fase 4 — Profundizar el authorization boundary + tests

**Objetivo:** colapsar los 6 resolvers casi idénticos de `src/lib/auth.ts` (líneas ~391–619, ~230 LOC) en un resolver genérico, y testear el boundary que hoy no tiene red.

Tareas:
1. `requireYearAdminForSubjectId/SubjectSlug/AgendaId/EventoId/CommissionId/ApunteId` comparten la forma: `requireAnyAdmin()` → `prisma.<entidad>.findUnique` con select anidado hasta `year` → mapear a scope → `requireYearAdminForScope`. Colapsar en un resolver table-driven (config por entidad: modelo + select + mapper), manteniendo los 6 nombres exportados como wrappers finos de una línea para no tocar a los 27 archivos consumidores. Cuidado con preservar los tipos de scope (uniones discriminadas).
2. Deduplicar `AdminClientUser` (línea ~281) que restatea todos los campos de `AdminUser` — derivarlo con `Pick`/mapped type.
3. **Tests (vitest)**: cubrir el resolver genérico y los guards (`requireAnyAdmin`, `requireGeneralAdmin`, `requireAcademicManager`, `requireAuditViewer`, `ensureCanManageContribution`): admin general pasa, admin de año correcto pasa, admin de año ajeno rechaza, entidad inexistente rechaza, sin sesión rechaza. Mockear Prisma siguiendo el patrón de mocking que ya usa `src/app/admin/actions.test.ts`.

**Skills sugeridas:** `typescript-advanced-types`, `prisma-client-api`, `supabase` (sesión/SSR), `git-commit`.
**Verificación:** `pnpm typecheck && pnpm test` con los tests nuevos en verde. Commit `refactor(auth): resolver generico de scopes por entidad con tests del boundary`.

---

## Fase 5 — Adelgazar adapters de `lib/domain` y selects compartidos

**Objetivo:** eliminar pares casi duplicados y passthroughs de un solo consumidor; los adapters que quedan deben concentrar lógica real.

Archivos: `src/lib/domain/{year-page-adapters,home-page-adapters,event-adapters}.ts` (+ sus tests), `src/app/[yearSlug]/year-route-context.ts`, `src/app/[yearSlug]/[subjectSlug]/SubjectRoutePage.tsx`, `src/lib/queries.ts`.

Tareas:
1. Fusionar `buildYearOverviewEvents` / `buildYearCalendarEvents` (idénticas salvo el separador del título) en una función parametrizada. Ídem `buildHomeUpcomingEvents` / `buildHomeCalendarEvents` (misma forma reduce-map-filter; una agrega filtro upcoming + slice).
2. Inline de los passthroughs triviales de un solo consumidor de `year-page-adapters.ts` (`buildYearAdminData`, `getYearDisplayIndex`, `buildYearDrawerYears`) dentro de `year-route-context.ts`. Actualizar/eliminar sus tests correspondientes.
3. Mover los 3 adapters inline de `SubjectRoutePage.tsx` (`toSubjectEvents`/`toMobileEvents`/`toEventSummaryItems`, líneas ~38–74) a `event-adapters.ts`, que ya es el seam compartido de eventos.
4. En `queries.ts`: extraer un `relatedApunteSelect` compartido + helper de serialización de fechas y aplicarlos a `getHomeCalendarEvents` / `getLatestApuntes` / `getLatestApuntesByYear` (el patrón ya existe como `apunteCardSelect`/`serializeApunteCard`, solo está sin aplicar ahí).

**Skills sugeridas:** `prisma-client-api`, `typescript-advanced-types`, `vercel-react-best-practices`, `git-commit`.
**Verificación:** `pnpm typecheck && pnpm test` (tests de adapters ajustados, no borrados si cubren lógica que sobrevive). Commit `refactor(domain): fusionar adapters duplicados e inline de passthroughs`.

---

## Fase 6 — Primitivas de formulario con shadcn/ui

**Objetivo:** una capa de primitivas (`Button`, `Input`, `Label`/`Field`, error de form) basada en shadcn/ui, adaptada al tema oscuro actual, y migrar los 7 modales admin. **Cero cambio visual.**

Decisión del usuario: shadcn/ui (no hand-rolled). Hay MCP de shadcn disponible (`mcp__shadcn__*`) y la skill `vercel:shadcn`.

Tareas:
1. Inicializar shadcn en el repo (Tailwind 4 ya está). Instalar solo lo necesario: `button`, `input`, `label` (y `textarea`/`select` si los modales los usan). NO instalar componentes que dupliquen primitivas propias sanas: `ui/Modal` (nativo `<dialog>`, 10 consumidores), `DarkCard` (22 consumidores), `Sheet`, `AlertDialog` se quedan.
2. Ajustar las variantes/tokens de las primitivas para reproducir exactamente el estilo actual de los modales (label `text-xs font-semibold uppercase tracking-widest text-white/40`, input `bg-surface-0 border-white/10 …`, submit blanco, cancel ghost, banner de error rose). Crear un `FormError` propio si shadcn no trae equivalente directo.
3. Migrar los 7 modales admin: `ApunteModal`, `YearModal`, `SubjectModal`, `CommissionModal`, `EventModal`, `QuizBankModal`, `PeriodoManager`. Reemplazar el markup label/input/error/submit repetido (14×/10×/6×/3×/3×) por las primitivas.
4. Todos los botones con `cursor-pointer` (regla del repo; verificar que la variante base lo incluya).

**Skills sugeridas:** `vercel:shadcn` (+ MCP shadcn), `tailwind-css-patterns`, `composition-patterns`, `accessibility`, `git-commit`.
**Verificación:** `pnpm typecheck && pnpm test`; levantar `pnpm dev` y revisar visualmente los 7 modales (deben verse idénticos). Commit `refactor(ui): primitivas de formulario shadcn y migracion de modales admin`.

---

## Fase 7 — Descomponer god-components

**Objetivo:** bajar los 4 focos de complejidad UI usando las primitivas de la Fase 6. Sin cambios de comportamiento.

Sub-tareas (pueden ser agentes/commits separados, en este orden):

**7a. Complejo ApunteModal (~1.26K LOC en 4 archivos).**
- Inline/co-locar `src/hooks/useApunteRecursos.ts` (183 LOC) y `src/hooks/useAutoApunteCategories.ts` (172 LOC) — ambos single-consumer — como el reducer del modal (regla `prefer-useReducer`: es un grupo de estado interdependiente de un solo feature).
- Descomponer `admin/apunte/RecursoRow.tsx` (507 LOC, single-consumer) en piezas junto al modal.

**7b. EventModal (587 LOC, 13 props, 9 useState interdependientes).**
- Consolidar el draft (`titulo`, `selectedTipoId`, `selectedSubjectId`, `selectedCommissionId`, `selectedApuntes`, `apunteQuery`, `newApunteOpen`, `apuntesOpen`, …) en un `useReducer` (regla explícita del repo).
- Separar los modos create / edit / quick-add para achicar la interfaz de 13 props.
- Inline de `src/hooks/useApunteSearch.ts` (51 LOC, single-consumer) si queda más claro co-locado.

**7c. ApunteRecursoView (789 LOC).**
- Dividir por tipo de recurso: `DriveEmbed`, `YouTubeEmbed`, `ImageResource`, `ExternalLink`, `GithubResource`, etc. El prop `variant: 'card' | 'wide' | 'content-card'` deja de multiplicar branches: pasa a estilos/contexto. OJO: mantener el lazy-load de YouTube (commit reciente `590c3a9`).

**7d. Piezas compartidas del mapa.**
- Extraer a `src/components/mapa/pieces/` los sub-componentes re-implementados en `MapaCorrelativas.tsx` (1067), `MapaCorrelativasMobile.tsx` (1068) y `MapaVisualCorrelativas.tsx` (519): `StatusPill`, `FactGrid`/`MiniFact`, `RelationGroup`, `getSubjectGuidance`.
- Unificar los 3 sets `DESKTOP_/MOBILE_/VISUAL_STATUS_LABELS` de `src/lib/domain/mapa/mapaConstants.ts:30-42` en uno.
- NO fusionar los tres archivos del mapa entre sí (son presentaciones genuinamente divergentes, solo ~142 líneas de overlap real) ni tocar el trío de hooks `useMapaState`/`useMapaProgress`/`useMapaViewport` (capas, no duplicación).

**Además:** eliminar el round-trip a `/api/admin/me` — hidratar `AdminSessionProvider` desde `getAdminClientSession()` en el server render (el comentario en `auth.ts:300` ya admite que el payload es idéntico) y borrar la ruta.

**Qué NO tocar (los audits lo marcaron como sano):** la familia calendar (3 engines genuinamente distintos), `SubjectRoutePage` (server component de ensamblado, ya descompuesto internamente), `Mascot.tsx`, `queries.ts` como módulo único, la ausencia de capa repositorio sobre Prisma.

**Skills sugeridas:** `composition-patterns`, `vercel-react-best-practices`, `react-doctor`, `tailwind-css-patterns`, `git-commit`.
**Verificación:** `pnpm typecheck && pnpm test`; smoke visual con `pnpm dev` de: subir/editar apunte, crear/editar evento, vista de recursos de un apunte, mapa desktop/mobile/visual, sesión admin (por el cambio de `/api/admin/me`). Un commit por sub-tarea.

---

## Fase 8 — Auditoría final

**Objetivo:** validar el conjunto contra el objetivo original antes de dar por cerrado el plan.

Tareas:
1. `pnpm verify` (generate → typecheck → lint → test → build) — el único punto del plan donde se corre build, porque es pre-merge a main.
2. Correr la skill `react-doctor` sobre el árbol de componentes tocado.
3. Correr `/code-review` sobre el diff acumulado de la rama.
4. Chequeo de regresión del objetivo: grep de que no queden `requireAuth()` redundantes, `catch` inline con ZodError fuera de `actionError`, invalidaciones inline de tags, ni imports a los símbolos borrados.
5. Reporte final al usuario: LOC eliminadas, módulos profundizados, cobertura nueva del auth boundary, y cualquier riesgo residual.

**Skills sugeridas:** `react-doctor`, `code-review` (o `judgment-day` si el usuario quiere review adversarial), `git-commit`.

---

## Notas para el orquestador

- Las fases son secuenciales: 1→2→3 comparten archivos de actions; 6 debe preceder a 7 (los modales reutilizan las primitivas). 4 y 5 son independientes entre sí y podrían paralelizarse si se ejecutan en worktrees separados, pero ambas tras la Fase 3.
- Cada agente ejecutor recibe: la sección de su fase completa, las "Reglas transversales", y la instrucción de leer `.atl/skill-registry.md` + las skills sugeridas antes de codear.
- Si un agente encuentra que un símbolo marcado como muerto SÍ tiene consumidores, no lo borra: lo reporta al orquestador.
- Presupuesto de duda: ante ambigüedad visual (Fase 6/7), la regla es "pixel-igual a lo actual"; ante ambigüedad de tipos (Fase 4), la regla es "los 27 consumidores de auth.ts no se tocan".
