# Planes de mejora — auditoría `/improve`

Generados el 2026-06-11 sobre el commit `473caa9` por una auditoría completa
del repo (corrección, seguridad, performance, tests, deuda técnica,
dependencias, DX, docs y dirección de producto). Cada plan es autocontenido:
un ejecutor sin contexto previo puede tomarlo y ejecutarlo. Ejecutar en el
orden de abajo salvo que las dependencias digan otra cosa. Cada ejecutor:
leer el plan COMPLETO antes de empezar, honrar sus condiciones de STOP, y
actualizar su fila al terminar.

## Orden de ejecución y estado

| Plan | Título | Prioridad | Esfuerzo | Depende de | Estado |
|------|--------|-----------|----------|------------|--------|
| [001](001-ci-pipeline.md) | Pipeline de CI (typecheck, lint, tests) | P1 | S | — | DONE (2026-06-11, commits `bcabb1c` + `93fa41e`) |
| [002](002-evento-fecha-index.md) | Índice sobre `Evento.fecha` | P1 | S | 001 (rec.) | DONE (2026-06-12, commits `b7b81d9` + `2b9a6ca`) |
| [003](003-dx-quick-wins.md) | Quick wins DX (`pnpm verify`, README, archivar yamls) | P2 | S | — | DONE (2026-06-12, commit `3f8a743`) |
| [004](004-rate-limit-fail-closed.md) | Rate limit de login admin fail-closed en producción | P1 | S | 001 (rec.) | TODO |
| [005](005-ranked-server-side-guards.md) | Techo de duración server-side en el ranked | P2 | S | 001 (rec.) | TODO |
| [006](006-split-admin-actions.md) | Partir `admin/actions.ts` por dominio | P2 | L | 001 | TODO |
| [007](007-cache-invalidation-policy.md) | Política de invalidación de cache | P2 | M | 006 | TODO |
| [008](008-mapa-shared-state-hook.md) | Estado derivado compartido del mapa | P3 | M | 001 | TODO |
| [009](009-design-personal-quiz-stats.md) | (Diseño) Estadísticas personales de quiz | P3 | M | — | TODO |
| [010](010-design-global-apunte-search.md) | (Diseño) Búsqueda global de apuntes | P3 | M | — | TODO |

Valores de estado: `TODO` | `IN PROGRESS` | `DONE` | `BLOCKED (motivo en una línea)` | `REJECTED (razón en una línea)`

## Notas de dependencias

- **001 va primero**: es la red de seguridad de todo lo demás. Los refactors
  (006, 007, 008) se seleccionaron sin la pata de tests nuevos, así que el CI
  corriendo la suite existente es el único gate automatizado que los protege.
- **007 requiere 006**: 007 modifica los helpers `revalidate*` que 006 mueve a
  `actions/shared.ts`. Si se ejecuta 007 sin 006, su drift check explica cómo
  adaptar rutas — pero el orden natural es 006 → 007.
- **004 tiene una decisión operativa**: antes de mergear, confirmar que
  producción tiene las vars de Upstash configuradas (si no, el merge bloquea
  el login admin hasta configurarlas — está en sus condiciones de STOP).
- 002, 003, 005 son independientes entre sí. 009 y 010 son spikes de diseño
  sin dependencias de código.
- **002 deja una migración pendiente de aplicar en producción**
  (`pnpm db:deploy`) — el deploy de Vercel no aplica migraciones.

## Registro de ejecución

- **001 (2026-06-11)**: implementado con un desvío aprobado por el operador:
  su condición de STOP "tests rotos preexistentes" se disparó —
  `HomeGlobalCalendar.test.tsx` usaba un fixture con fecha fija
  (`2026-06-10`) que expiró al pasar el día. Se arregló congelando el reloj
  del test (`vi.useFakeTimers` con `toFake: ['Date']`), commit `bcabb1c`. El
  workflow quedó en `93fa41e` con pnpm **11** (no 9 como decía el borrador
  del plan: `pnpm-workspace.yaml` usa settings de pnpm 11 como `allowBuilds`).
  Patrón a evitar en tests futuros: fixtures de fecha fija sin reloj
  congelado cuando el componente filtra contra "hoy".
- **Cierre de deuda post-001 (2026-06-11)**: a pedido del operador se cerró la
  deuda de toolchain destapada al implementar 001: el workflow quedó en
  Node 24 LTS (`1ea6ff2`), se removieron los 6 warnings de lint — imports sin
  uso y dos hooks muertos en `NosotrosModal` que el `<dialog>` nativo ya
  reemplaza (`577c79c`) — y se actualizó `@types/node` a 24 quitando el campo
  `pnpm.onlyBuiltDependencies` de `package.json` que pnpm 11 ignoraba con
  WARN (`d95fcae`). `pnpm lint` queda en cero warnings: mantenerlo así.
- **002 (2026-06-12)**: implementado (`b7b81d9`). El índice
  `Evento_fecha_hora_idx` quedó verificado con `EXPLAIN ANALYZE`: Index Scan
  + Incremental Sort, 0.16 ms. La migración ya está aplicada en la base única
  (dev = prod, confirmado por el operador) — NO queda pendiente ningún
  `db:deploy`. Durante la ejecución se disparó la condición de STOP de drift:
  `prisma migrate dev` estaba ROTO en el repo desde el 2026-06-04 por una
  fila huérfana en `_prisma_migrations` (`20260603120000_add_periodo_academico`,
  renombrada localmente a `20260604030000` después de aplicada). Se eliminó
  la fila huérfana (solo bookkeeping, snapshot previo: id `bc0808de-...`,
  checksum `1305e8d4...`) y la regla "no renombrar migraciones aplicadas"
  quedó documentada en `docs/prisma-migrations.md` (`2b9a6ca`).
- **003 (2026-06-12)**: implementado (`3f8a743`) con una mejora sobre el plan:
  `verify` arranca con `pnpm db:generate` para que no falle en un clone
  fresco sin el cliente Prisma generado (gotcha documentada en el plan 001).
  Queda: `db:generate → typecheck → lint → test → build`. La cadena completa
  se corrió y pasó (incluido el build, que validó además los planes 001-002 y
  el cierre de deuda). Los dos `plan-*.yaml` del root fueron a
  `docs/plans/plans-done/` con `git mv` (historial preservado).

## Hallazgos auditados y NO seleccionados (sin plan, registrados para no re-auditar)

El operador eligió no planificarlos en esta ronda — siguen siendo válidos:

- **Tests para `src/app/admin/users/actions.ts`** (253 líneas de gestión de
  usuarios admin sin ningún test). Candidato natural a primera pieza si se
  retoma la pata de testing.
- **Suite E2E de flujos core** (hoy hay UN solo spec de Playwright:
  `tests/e2e/modals/nosotros-modal.spec.ts`). Login admin, quiz ranked y CRUD
  de eventos/apuntes no tienen cobertura end-to-end.
- **`getLatestApuntes()` sin límite** (`src/lib/queries.ts:843`): trae toda la
  tabla a propósito (el comentario explica por qué: que ningún año quede sin
  apuntes en el home). El fix correcto no es un `take` ciego sino una ventana
  por año. Revisitar cuando el volumen de apuntes crezca.
- **PWA offline** (`public/sw.js` tiene un handler `fetch` vacío; el botón de
  instalar ya está en el hero). Opción de dirección no elegida.
- **Notificaciones push de eventos del calendario**. Opción de dirección no
  elegida (esfuerzo L, requiere infraestructura de push).

## Hallazgos considerados y RECHAZADOS en el vetting (no re-auditar)

- **Spoofing de `X-Forwarded-For` para evadir rate limits**: el deploy es
  Vercel, que sobreescribe ese header con la IP real — no explotable en esta
  plataforma. Solo relevante si algún día se self-hostea.
- **IDOR en `/api/apuntes/recursos/[recursoId]/preview`**: no existe estado
  borrador/publicado en el schema — todo apunte es público por diseño, no hay
  nada privado que filtrar. La ruta además ya aplica un CSP sandbox estricto
  y correcto.
- **CSRF en server actions admin**: Next.js App Router valida origin/host de
  los POST de server actions por defecto; no hay configuración custom que lo
  desactive.
- **`esbuild` en `dependencies` "debería ser devDependency"**: falso —
  `compileReactArtifact` (`src/lib/domain/apunte-artifact.ts`) lo usa en
  runtime dentro de un server action (compilación de artifacts al subirlos).
  Está donde corresponde.
- **Vitest con `environment: 'node'` "rompe los tests de componentes"**:
  falso — los tests de componentes usan `renderToStaticMarkup`
  deliberadamente (testean markup estático, no interacción). Es una elección
  coherente; lo que falta es cobertura de interacción, que es el hallazgo de
  E2E de arriba, no un bug de config.
- **Validez del ranked manipulable por `clientInvalidated`**: parcialmente
  falso — el flag solo puede INVALIDAR un intento, nunca forzar uno válido
  (`finish/route.ts:82` exige además `!attempt.invalidatedAt`). El residuo
  real (sin techo de tiempo server-side) sí se planificó: plan 005.
