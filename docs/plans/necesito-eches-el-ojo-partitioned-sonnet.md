# Plan: Trocear big components + cerrar warnings de useRef (React Doctor)

## Context

React Doctor está hoy en **52→80/100**; los errores y la mayoría de los warnings ya
se cerraron (ver `docs/plans/react_doctor_resolution_log.md`). Quedan dos familias
pendientes que este plan ataca:

1. **`no-giant-component` ×12** — el objetivo principal del usuario: *destrozar* los 12
   componentes gigantes. No alcanza con partirlos en archivos chicos: hay que
   descomponerlos en **componentes y hooks reutilizables**, reduciendo el acoplamiento y
   la duplicación (hoy hay lógica copy-pasteada literal entre los 3 `Mapa*`).
2. **Warnings de "prefer useRef"** — repartidos en 3 reglas (`rerender-state-only-in-handlers` ×2,
   `rerender-lazy-ref-init` ×2, y los `no-initialize-state` ×10 que se resuelven en el mismo
   movimiento). El usuario delega el criterio: migrar solo lo que de verdad lo amerita.

Resultado esperado: `no-giant-component` ×12 → **0**, warnings de ref cerrados o
documentados como decisión, **171 tests** y `pnpm lint` en verde, sin regresiones visuales.

---

## Cómo se evaluó cada decisión (traza de skills — auditable)

Cada decisión cita la regla concreta que la respalda. Skills usadas:

- **vercel/react-best-practices** → reglas `rerender-state-only-in-handlers`,
  `rerender-use-ref-transient-values`, `rerender-lazy-state-init`, `rerender-no-inline-components`,
  `rerender-derived-state-no-effect`, `rendering-hoist-jsx`.
- **composition-patterns** → `patterns-explicit-variants`, `architecture-compound-components`,
  `architecture-avoid-boolean-props`, `patterns-children-over-render-props`, `react19-no-forwardref`.
- **next-best-practices** → `rsc-boundaries` (server/client split, props serializables),
  `data-patterns` (minimizar serialización), `suspense-boundaries`.
- **nodejs-best-practices** → **N/A declarado**. El scope es frontend puro: descomponer
  componentes cliente + migraciones de hook. No se toca ninguna Server Action, `lib/auth`
  ni firma de backend (extraer la serialización client-side de ApunteModal NO cambia el
  contrato del action). Si durante la ejecución algo tocara backend, se carga la skill.

Stack confirmado: **React 19.2.4 / Next 16.2.6** → se usa `use()` en vez de `useContext`,
`ref` como prop normal (sin `forwardRef`, regla `react19-no-forwardref`) y `useSyncExternalStore`.

---

## Parte A — Veredictos de useRef (criterio aplicado)

**Discriminador único** (de `rerender-use-ref-transient-values`): *un ref solo ahorra un
render si el valor se actualiza POR SEPARADO del estado que sí se renderiza.* Si co-actualiza
con estado renderizado, el re-render ocurre igual y el ref no aporta.

| Ubicación | Regla R.Doctor | Veredicto | Por qué |
|---|---|---|---|
| `Mascot.tsx:31` `prefersReducedMotion` | `rerender-state-only-in-handlers` | **MIGRAR a ref** | Verificado: se lee solo en `triggerHop` (línea 93), nunca en JSX. Valor aislado → el ref elimina un render espurio. Inicializar leyendo `matchMedia` lazy (`rerender-lazy-state-init` aplicado a ref). |
| `ApunteModal.tsx:202` `autoSelectedCategoriaIdsRef` | `rerender-lazy-ref-init` | **FIX lazy-init** | Ya es ref; solo cambiar `useRef(new Set())` → `useRef<Set<string>\|null>(null); if(!ref.current) ref.current = new Set()`. |
| `ApuntesFeed.tsx:144` `cardRefs` | `rerender-lazy-ref-init` | **FIX lazy-init** | Mismo patrón con `new Map()`. Sigue siendo ref. |
| `HistorialList.tsx:66` `nextCursor` | `rerender-state-only-in-handlers` | **NO migrar a ref → reducer** | **La regla es engañosa acá**: `nextCursor` co-actualiza en la MISMA transición atómica que `items`/`hasMore`/`loading` (todas salen del mismo `page`, línea 105), que SÍ se renderizan → el ref no ahorra ningún render. Fragmentar el cluster entre ref+state lo acopla más. Se pliega al reducer de paginación espejando `ApuntesFeed` (commit `8fb2842`), regla `prefer-useReducer` de AGENTS.md. Era el próximo paso ya documentado en el log. |
| `no-initialize-state` ×5 en mapa (`MapaCorrelativas:78,79`, `MapaVisualCorrelativas:142,143`, `MapaSidebar:28`) | `no-initialize-state` / `rerender-derived-state-no-effect` | **Resolver con `useMapaHydration()`** | No es un tema de ref: es `useState`+`useEffect` de montaje. Se cierra con un hook `useSyncExternalStore` (ver Parte B, cluster Mapa). Mobile ya lo hace bien → patrón probado en el repo. |
| `useInstallPrompt.ts:73-76` ×4 | `no-initialize-state` | **Documentar / evaluar FP** | Son valores set por eventos del navegador (`beforeinstallprompt`), genuinamente nulos al inicio. Candidato a `useSyncExternalStore`; si no, dejar no-op documentado. Fuera del foco de big-components. |

---

## Parte B — Descomposición de los 12 big components

Principio rector (advisor + objetivo del usuario): **reducir acoplamiento**. Por eso NO se
mete `Context`/compound en todos lados. Se matchea el patrón al reuso real:
- **Duplicación literal de lógica** → funciones puras a `lib/domain/` + hooks compartidos.
- **UI repetida** → componentes de presentación reutilizables (`children` > render props,
  regla `patterns-children-over-render-props`).
- **Variantes** → componentes explícitos, no props booleanas (`patterns-explicit-variants`,
  `architecture-avoid-boolean-props`).
- **Context/compound** → SOLO donde hay estado compartido entre hermanos (Quiz).

Por cada pieza extraída se declara **server | client** (regla `rsc-boundaries`).

### Cluster 1 — Mapa de correlativas (el de mayor duplicación: 3 archivos, ~2400 líneas)

`MapaCorrelativas.tsx` (680), `MapaCorrelativasMobile.tsx` (1046), `MapaVisualCorrelativas.tsx` (679), `MapaSidebar.tsx`.

**Hoy hay 3 copias literales** de: `getSubjectName`, `getUnlocks`, `getMissingCorrelatives`,
`removeSubjectAndDependents`, `handleToggleSubject`, `saveProgress`, `suggestedYearToComplete`,
y la hidratación de progreso. Esto es el corazón del refactor.

**Extracciones a `src/lib/domain/mapa/`** (respeta la screaming-architecture ya existente —
ahí ya viven `correlativasData.ts`, `unlockLogic.ts`, `types.ts`):
- `subjectQueries.ts` (funciones puras, **sin React**): `getSubjectName`, `getUnlocks`,
  `getMissingCorrelatives`, `removeSubjectAndDependents`. Testeables unitariamente.
- `mapaConstants.ts`: consolidar `YEAR_NAMES`/`YEAR_LABELS`/`STATUS_LABELS`/`STATUS_STYLES`
  hoy dispersas y divergentes en los 3 archivos.

**Hooks compartidos en `src/hooks/`** (junto a `usePreferences.ts`):
- `useMapaProgress()` — **linchpin del cluster**. Única fuente de verdad: `useSyncExternalStore`
  suscrito a `MAPA_PROGRESS_UPDATED_EVENT` (ya emitido por `lib/mapaProgress.ts`) + `storage`.
  Expone `{ completed, isHydrated, toggleSubject, autocompleteYear, reset }`. Esto **mata los 5
  `no-initialize-state` del cluster de una** y mantiene las 3 vistas sincronizadas. Absorbe
  `handleToggleSubject` + `saveProgress`. (cliente)
- `useSuggestedYear(completed)` — el `useMemo` duplicado en desktop+mobile. (cliente)

**Componentes de presentación reutilizables** (`src/components/mapa/`):
- `RelationBadges.tsx` — unifica `RelationList` (MapaCorrelativas:641) y `RelationCloud`
  (MapaVisualCorrelativas:640), casi idénticos. Props por `children`/datos, no booleanos.
- `SubjectStatusBadge.tsx`, `MapaMetricCard.tsx`, `ProgressCircle.tsx` — primitivos visuales
  repetidos.
- El SVG/grafo de `MapaVisualCorrelativas` (nodos + edges + cámara): extraer
  `useMapaViewport()` (pan/zoom/drag — el `dragRef`+`isDragging` se colapsa en un solo ref,
  regla `rerender-use-ref-transient-values`) y componentes `MapaGraphCanvas` / `MapaNode` /
  `MapaEdges`.

**Resultado**: cada `Mapa*` queda como un orquestador delgado que compone hooks + piezas.
RSC: los 3 son y siguen `'use client'` (interactividad). `availableSubjectSlugs` ya llega
serializado del padre server → no se rompe ningún borde. **Nota**: `MapaCorrelativasMobile:498`
tiene un `server-dedup-props` (pasa `missing` + `subject`); si se reescribe el archivo,
aprovechar para pasar solo `subject` y derivar `missing` en cliente.

### Cluster 2 — Modales admin

`ApunteModal.tsx` (1010), `EventModal.tsx` (574), `NosotrosModal.tsx` (353).

El primitivo `src/components/ui/Modal.tsx` ya existe y resuelve overlay/scroll-lock/escape/
focus-trap. `ApunteModal` y `EventModal` ya lo reusan ✓.

- **`CollapsibleFormSection`** está **duplicado idéntico** en ApunteModal (115-163) y
  EventModal (526-574) → extraer a `src/components/ui/CollapsibleFormSection.tsx`.
- **`ApunteModal`** (el más grande): extraer `RecursoRow` (~220 líneas, hoy interno) a
  `src/components/admin/apunte/RecursoRow.tsx`; mover la auto-inferencia de categorías
  (useMemo+useEffect+useCallback acoplados, 217-301) a `useAutoInferredCategories()`; mover
  validación+serialización JSON (441-507) a un helper puro `serializeApunteForm()`
  (`lib/domain/apuntes/`). Fix del ref lazy-init (Parte A).
- **`EventModal`**: extraer la búsqueda async debounced de apuntes (156-188) a
  `useApunteSearch()`; `detectEventType` (191-223) es función pura → a `lib/domain/eventos/`.
  El `useState` inicializado vía effect (línea 85) se pasa a inicializador de `useState`
  (regla `no-initialize-state`).
- **`NosotrosModal`** (semi-fork resuelto): **NO** forzarlo al primitivo `Modal` — tiene
  transiciones/glow propias (mounted→visible→hidden). Extraer `useModalTransition()` con esa
  máquina de timers; el resto (header, ranking, contactos) a sub-componentes presentacionales.
  El `no-effect-event-handler:82` se mueve al handler correspondiente.

### Cluster 3 — Quiz (único caso de estado compartido entre fases → compound)

`QuizRunner.tsx` (1181) — máquina de estados clara `config → running → done` con ~13 `useState`.

- **`useReducer`** para el cluster atómico (`phase`/`preguntas`/`index`/`answers`/`resultados`/
  `loading`/`error`/timer). Es el candidato más fuerte de `prefer-useReducer` (lo dice el log).
  Acciones explícitas: `START`, `ANSWER`, `VERIFY`, `NEXT/PREV`, `FINISH`, `RESET`, `TICK`.
- **Componentes por fase** (`patterns-explicit-variants`, NO booleanos):
  `QuizConfigPhase.tsx`, `QuizRunningPhase.tsx`, `QuizResultsPhase.tsx` en `src/components/quiz/`.
- Sub-componentes ya internos → archivos propios: `OptionButton`, `UnitBreakdown`, `AnswerSummary`.
- Hooks: `useExamTimer(enabled, durationSeconds, onExpire)` y
  `useQuizKeyboardShortcuts(...)` (los dos `useEffect` grandes, 252 y 289).
- Estado compartido entre fases → `QuizProvider` con `use(QuizContext)`
  (`architecture-compound-components`). Es el ÚNICO cluster donde se justifica.

### Cluster 4 — Mobile shell + secciones

`MobileShell.tsx` (480), `MobileYear.tsx` (393), `MobileCalendar.tsx` (411).

- **`MobileShell`**: extraer `useDrawer()` (estado `drawer` + `openRef` + listeners de
  teclado/swipe). El `openRef` como espejo de `open` para listeners de larga vida es
  **correcto** (`advanced-event-handler-refs`) — se mantiene.
- **`MobileYear`** → secciones presentacionales: `MobileYearHero`, `MobileYearEvents`,
  `MobileYearSubjects`.
- **`MobileCalendar`** → `CalendarGrid` + `CalendarEventList` + hooks `useCalendarNavigation()`
  (cursor/goPrev/goNext) y `useCalendarGrid()` (construcción de la grilla, 138-152).
  `byFechaHora`/`sameDay` → `lib/` puro.
- El `useState` inicializado vía effect (`MobileCalendar`/`MobileShell`/`MobileYear`) → pasar
  inicializador directo a `useState`.

### Cluster 5 — SubjectRoutePage (Server Component — cuidar el borde RSC)

`SubjectRoutePage.tsx` (380) **es Server Component** y delega a hijos. Riesgo (regla
`rsc-boundaries`): al partir, NO introducir un `'use client'` que arrastre data server al
cliente ni infle el bundle.

- Separar render desktop/mobile en `SubjectDesktopView` (server) y dejar `MobileSubject`
  (client, ya existe) — sin convertir el page en client.
- Extraer las secciones del desktop (Hero / Events / Quiz / Apuntes) a sub-componentes
  **server** salvo las que ya son client (`ApuntesFeed`, `SubjectEventsSection`).
- `GoogleDriveIcon` está **duplicado** aquí (34-43) y en `MobileYear` (39-49) → consolidar en
  `src/components/ui/GoogleDriveIcon.tsx`. Idem el bloque Drive/Playlist → `ExternalResourceLinks`.

### Cluster 6 — Mascot (animación)

`Mascot.tsx` (476).
- `prefersReducedMotion` → **ref** (Parte A). `isHopping`/`glowColor`/`showGlow` **quedan
  state** (se renderizan).
- Extraer el SVG inline (~340 líneas) a `MascotSVG.tsx` (`rendering-hoist-jsx`: es estático) y
  la lógica de `triggerHop`/timers/vibración a `useMascotAnimation()`.

---

## Orden de ejecución (batches; commit Conventional por batch, sin atribución IA)

1. **Mapa** — el de mayor ROI (mata 5 `no-initialize-state` + ~290 líneas duplicadas).
   `lib/domain/mapa/*` → `useMapaProgress` → componentes presentacionales → adelgazar los 3 `Mapa*`.
2. **Quiz** — reducer + provider + fases + hooks.
3. **Modales** — `CollapsibleFormSection` compartido + descomponer ApunteModal/EventModal/NosotrosModal.
4. **Mobile + SubjectRoutePage** — `useDrawer`, secciones, consolidar duplicados, cuidar borde RSC.
5. **Mascot** — SVG + hook + ref.
6. **Limpieza de refs** — fixes lazy-init (ApunteModal/ApuntesFeed) + HistorialList al reducer.

Cada componente refactorizado debe terminar **por debajo del umbral de `no-giant-component`**
y como orquestador que compone piezas (no como archivo grande movido de lugar).

---

## Test Plan / Verificación

Después de **cada batch**:
- `pnpm lint` y `pnpm test` (deben quedar **171** verdes; sumar tests unitarios para las
  funciones puras nuevas en `lib/domain/mapa/subjectQueries.ts`).
- `npx -y react-doctor@latest . --verbose` → confirmar que `no-giant-component` baja y que no
  aparecen regresiones (`rerender-no-inline-components` por componentes mal extraídos).
- **Chequeo visual manual** (tsc/lint/test NO cubren lo visual, lo dice el log):
  - Mapa: marcar/desmarcar materia, cascada de correlativas, reset, pan/zoom del visual,
    sync entre vistas, persistencia al recargar.
  - Quiz: flujo completo practica y examen, timer, atajos de teclado, resultados.
  - Modales: abrir/cerrar, focus-trap, escape, submit; sub-modal de ApunteModal dentro de EventModal.
  - Mobile: drawer (swipe + teclado), navegación de calendario, detail sheet.
  - Botones con `cursor-pointer` (regla del proyecto).

**Métrica de cierre**: react-doctor `no-giant-component` ×12 → **0**, warnings de ref cerrados o
con decisión documentada, 171+ tests verdes, sin regresión visual.

## Fuera de scope (se documentan, no se tocan acá)

- `useInstallPrompt.ts` (valores por evento del navegador — evaluar FP).
- `MobileCalendar.tsx:85` y demás warnings menores ya catalogados en el log como FP/no-op.
- No correr `pnpm build` salvo pedido explícito.
