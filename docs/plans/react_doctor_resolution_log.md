# React Doctor — Registro de resolución

Continuación del plan `plan_react_doctor`. Baseline al retomar: **80/100, 144 issues, 0 errores**.
Cada hallazgo recibe una decisión explícita en uno de tres buckets: **arreglado**,
**falso positivo** (con evidencia), o **no-op deliberado** (con motivo). Nada se omite
en silencio: un no-op documentado es una decisión, no deuda.

> Verificación por batch: `tsc --noEmit` + `pnpm lint` + `pnpm test` (171 tests).
> `tsc/lint/test` NO prueban comportamiento visual; los fixes de UI se confirman a mano.

---

## 0. Regresiones del commit previo (c9755d6) — PRIORIDAD, ya arregladas

Estas NO eran hallazgos de React Doctor sino daños colaterales del commit P0 del usuario.

| Problema | Causa raíz | Fix | Commit |
|---|---|---|---|
| 7 tests rojos en `actions.test.ts` | El gate `requireAuth()` agregado delega en `requireAnyAdmin()`, ausente del mock de `@/lib/auth` | Agregado `requireAnyAdmin` al mock + valor por defecto en `beforeEach` | `c8ea81d` |
| Build de Vercel roto (`ApunteModal.tsx:464`) | `flatMap` con dos formas de objeto heterogéneas → TS no infería un `U` único | Tipo `SerializedRecurso` (unión discriminada) pasado como genérico a `flatMap` | `fa69292` |
| Videos de YouTube en pantalla negra | El P0 removió `allow-same-origin` del sandbox del iframe (origen opaco → player no arranca) | Restaurado el flag solo en el embed cross-origin de YouTube | `089e823` |

---

## 1. Arreglados (hallazgos de React Doctor)

| Regla | Ubicación | Qué se hizo | Commit |
|---|---|---|---|
| `async-parallel` | `users/edit/[id]/page.tsx:16` | `Promise.all([requireGeneralAdmin(), params])` — el gate sigue resolviendo antes de cualquier query | `410a976` |
| `server-sequential-independent-await` | `historial/page.tsx:27` | `Promise.all([requireAuditViewer(), searchParams])` | `410a976` |
| `prefer-module-scope-pure-function` | `MobileCalendar.tsx:152` | Comparador puro `byFechaHora` movido a module scope | `410a976` |
| `js-tosorted-immutable` | `MobileCalendar.tsx:161` | `[...arr].sort()` → `arr.toSorted()` | `410a976` |
| `js-set-map-lookups` | `QuizRunner.tsx:87` | `selectedBancos.includes()` en loop → `Set.has()` | `410a976` |
| `design-no-em-dash-in-jsx-text` | `QuizRunner.tsx:1076` | Em-dash → dos puntos en copy de usuario | `410a976` |
| `no-permanent-will-change` | `Mascot.tsx:132` | `willChange` atado a `showGlow` (se libera en reposo) | `410a976` |
| `prefer-useReducer` | `ApuntesFeed.tsx:91` | Cluster de paginación (items/hasMore/cursor/loading/error) → `feedReducer` atómico | `8fb2842` |

También: regla `prefer-useReducer` documentada en `AGENTS.md` + `CLAUDE.md` (criterio: interdependencia, no cantidad).

---

## 2. Falsos positivos (con evidencia)

| Regla | Ubicación | Por qué es FP |
|---|---|---|
| `no-array-index-key` / `no-array-index-as-key` | `MobileCalendar.tsx:214` | `DOW_ES = ['D','L','M','M','J','V','S']` — la 'M' se repite; `key={label}` daría keys DUPLICADAS. Lista estática posicional que nunca se reordena → el índice es la identidad correcta |
| `no-array-index-key` / `no-array-index-as-key` | `MobileCalendar.tsx:242` | Grilla fija de 42 celdas con `cell.d` duplicados (días de meses vecinos); posición = identidad estable |
| `no-array-index-key` / `no-array-index-as-key` | `QuizRunner.tsx:864` | El índice ES la semántica de la opción (`index={i}`, `selectedArr.includes(i)`, se manda al backend) |
| `no-array-index-key` | `lib/text.tsx:19,50` | Segmentos posicionales de un `string.split()`, stateless, nunca se reordenan |

---

## 3. No-ops deliberados (con motivo)

| Regla | Conteo | Motivo |
|---|---|---|
| `js-combine-iterations` | 11 | Todas en server components (corren 1 vez/render) o arrays client acotados (~años de carrera). Fusionar cadenas legibles `.filter().map()` en `reduce` imperativo no da ganancia medible y destruye legibilidad. Micro-opt que solo importa en arrays grandes y calientes. |
| `prefer-useReducer` | LoginForm, ApunteModal, EventModal, MapaCorrelativas, MapaCorrelativasMobile, MapaVisualCorrelativas, NosotrosModal | Estado mayormente independiente (inputs controlados + toggles UI sin relación). `useReducer` sería sobreingeniería; el criterio es interdependencia, no cantidad. |
| `prefer-useReducer` | QuizRunner | Es el candidato conceptualmente más fuerte (máquina de estados de 16 valores) PERO está en el componente marcado `no-giant-component` (diferido por el usuario). Su reducer va acoplado a ese refactor. |

---

## 4. Diferido por decisión del usuario

- **`no-giant-component` (12)** — el usuario pidió dejarlo para después. Refactor arquitectónico grande, en commits aislados.

---

## 5. Pendiente (hallazgos genuinos por resolver)

_(se actualiza a medida que avanzan los batches)_

- `prefer-useReducer` → `HistorialList` (cluster de paginación, win genuino igual que ApuntesFeed)
- `prefer-tag-over-role` (4 genuinos: CommissionSelectField:34, MapaCorrelativas:514, MapaCorrelativasMobile:818, AgendaCard:60) — `role` en div → tag semántico
- `prefer-tag-over-role` (4 FP: InstallPWA:17, Modal:123, NosotrosModal:177, Sheet:119) — coinciden con diálogos custom donde `role="dialog"` es ARIA requerido; quitarlo sería regresión a11y
- `prefer-html-dialog` (6) — candidato a no-op: migrar a `<dialog>` nativo regresaría focus-trap/escape/backdrop ya implementados
- `prefer-use-effect-event` (10), `no-prop-callback-in-effect` (5), `exhaustive-deps` (3), `no-fetch-in-effect` (3), `no-event-handler` (4), `no-cascading-set-state` (4), `no-effect-event-handler` (1), `no-derived-useState` (1)
- `rerender-memo-with-default-value` (8), `rerender-state-only-in-handlers` (3), `rerender-lazy-ref-init` (2)
- `no-initialize-state` (6), `only-export-components` (4), `prefer-module-scope-pure-function` (3 restantes), `no-generic-handler-names` (2)
- `js-set-map-lookups` (2 restantes), `js-flatmap-filter` (1)
- `jsx-no-jsx-as-prop` (13) — revisar: muchas en server `page.tsx` pasando JSX a client components (patrón RSC legítimo → probable FP)
- `nextjs-no-client-side-redirect` (1), `server-dedup-props` (1), `no-pass-data-to-parent` (1), `no-flush-sync` (1)
