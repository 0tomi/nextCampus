# Plan 008: Unificar el estado derivado del mapa de correlativas (desktop/mobile)

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- src/components/mapa/ src/hooks/ src/lib/domain/mapa/`
> Si los componentes del mapa cambiaron, compará los extractos de "Estado
> actual" contra el código vivo; si la estructura ya no coincide, condición
> de STOP.

## Status

- **Prioridad**: P3
- **Esfuerzo**: M
- **Riesgo**: MED (refactor de componentes grandes sin tests de UI; mitigado porque la lógica extraída es pura y SÍ se testea)
- **Depende de**: 001 (CI como red de seguridad)
- **Categoría**: tech-debt
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

`MapaCorrelativas.tsx` (1136 líneas) y `MapaCorrelativasMobile.tsx`
(1084 líneas) son las dos caras del mapa de correlativas. El commit `473caa9`
ya extrajo la lógica de dominio compartida (`src/lib/domain/mapa/`) y los
hooks de progreso/selección (`useMapaProgress`, `useSubjectSelection`,
`useSuggestedYear`) — el trabajo pesado está hecho. Lo que queda duplicado es
la **capa de estado derivado**: ambos componentes recomputan por su cuenta
filtrado por búsqueda/estado, materias sugeridas, desbloqueos y correlativas
faltantes de la materia seleccionada, combinando los mismos helpers de
dominio con `useMemo`s paralelos. Ya hay drift (mobile tiene `yearFilter` y
`getYearSummaries`; desktop no). Cada fix del mapa hoy se aplica dos veces o
se olvida en una. Este plan termina la convergencia que `473caa9` empezó.

## Estado actual

- Desktop ya tiene la forma objetivo definida internamente:

```ts
// src/components/mapa/MapaCorrelativas.tsx:54-96 (extracto)
type MapaDerivedState = {
  availableSlugs: Set<string>;
  filteredSubjects: SubjectNode[];
  selectedDirectUnlocks: SubjectNode[];
  selectedMissing: string[];
  selectedMissingSubjects: SubjectNode[];
  selectedStatus: SubjectStatus;
  selectedSubject: SubjectNode;
  selectedUnlocks: SubjectNode[];
  subjectsByYear: SubjectsByYear;
  suggestedSubjects: SubjectNode[];
  suggestedYearToComplete: MapaYear | null;
};

export function MapaCorrelativas({ availableSubjectSlugs = ... }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const progress = useMapaProgress();
  const selection = useSubjectSelection(progress);
  const derived = useMapaDerivedState({ availableSubjectSlugs, completed: progress.completed, searchTerm, selection, statusFilter, subjectStatuses: progress.subjectStatuses });
  ...
```

  `useMapaDerivedState` es un hook PRIVADO del archivo desktop (buscarlo más
  abajo en el mismo archivo) que compone `filterSubjects`,
  `getSuggestedSubjects`, `getUnlocks`, `getMissingCorrelatives`,
  `groupSubjectsByYear`, `resolveSubjectSlugs` de
  `src/lib/domain/mapa/subjectQueries.ts`.
- Mobile duplica esa composición inline con sus propios `useMemo` (11 hooks de
  `useState`/`useMemo`/`useCallback` contra 5 del desktop) y suma estado
  propio legítimo: `yearFilter`, `mode` ('plan' | 'ruta'),
  `detailSubjectSlug` (modal de detalle) — ver
  `src/components/mapa/MapaCorrelativasMobile.tsx:60-80`.
- Infra existente a reutilizar (NO recrear):
  - `src/hooks/useMapaProgress.ts`, `src/hooks/useSubjectSelection.ts`,
    `src/hooks/useSuggestedYear.ts` — ya compartidos por ambos.
  - `src/lib/domain/mapa/subjectQueries.ts` — funciones puras, con tests en
    `subjectQueries.test.ts`.
  - Constantes por variante ya separadas en
    `src/lib/domain/mapa/mapaConstants.ts` (`DESKTOP_STATUS_LABELS`,
    `MOBILE_STATUS_LABELS`, etc.) — ese patrón de "lógica común, presentación
    por variante" es el que este plan extiende.
- Regla del repo (AGENTS.md, React State rules): consolidar en `useReducer`
  SOLO grupos de estado interdependientes que cambian en bloque. `searchTerm`,
  `statusFilter` y `yearFilter` son inputs independientes → `useState` está
  bien; NO convertirlos a reducer.
- Tests existentes del dominio: `src/lib/domain/mapa/subjectQueries.test.ts` y
  `unlockLogic.test.ts` — patrón a seguir para el test nuevo.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Tests del dominio mapa | `pnpm test src/lib/domain/mapa` | todos pasan |
| Suite completa | `pnpm test` | todos pasan |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Ver el mapa vivo | `pnpm dev` → http://localhost:3000/mapa | render idéntico al actual |

## Toolkit sugerido para el ejecutor

- Skill `vercel-react-best-practices`
  (`.agents/skills/react-best-practices/SKILL.md`) — memoización y costo de
  renders al mover `useMemo`s.
- Skill `vercel-composition-patterns`
  (`.agents/skills/composition-patterns/SKILL.md`) — estado desacoplado de la
  presentación.

## Alcance

**En alcance**:
- `src/hooks/useMapaState.ts` (crear) — el hook compartido.
- `src/hooks/useMapaState.test.ts` (crear) — tests de la derivación pura.
- `src/components/mapa/MapaCorrelativas.tsx` — consumir el hook, borrar la
  versión privada.
- `src/components/mapa/MapaCorrelativasMobile.tsx` — consumir el hook, borrar
  los `useMemo` duplicados.

**Fuera de alcance** (NO tocar):
- TODO el JSX/markup de ambos componentes — la UI divergente (grid desktop
  vs lista+modal mobile) es intencional y se queda exactamente igual.
- `EventCalendarAdmin.tsx` / `MobileCalendar.tsx` — la auditoría original los
  marcó como duplicados, pero la verificación mostró que son productos
  distintos (CRUD admin vs lectura con sheet de detalle), no copias driftadas.
  No hay nada que unificar ahí.
- `src/lib/domain/mapa/*` — el dominio ya está bien; el hook lo COMPONE, no
  lo modifica.
- `src/components/mapa/MapaCorrelativasVisual*` / `src/app/mapa/visual` (la
  vista visual del mapa) — solo si ya consume los mismos helpers no pasa
  nada; no migrarla en este plan.
- `useMapaProgress` / `useSubjectSelection` / `useSuggestedYear` — se usan
  como están.

## Workflow de git

- Branch: `refactor/mapa-shared-state`
- Conventional Commits sin atribución a IA. Sugerido:
  `refactor(mapa): unificar el estado derivado de desktop y mobile en useMapaState`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Extraer la derivación a una función pura + hook

Crear `src/hooks/useMapaState.ts` con DOS niveles (la función pura hace
testeable la lógica sin renderizar):

```ts
// Función pura: toda la derivación, sin hooks. Es la unión de lo que hoy
// computan useMapaDerivedState (desktop) y los useMemo de mobile.
export function deriveMapaState(input: {
  availableSubjectSlugs: readonly string[]
  completed: ReadonlySet<string>            // ajustar al tipo real de useMapaProgress
  subjectStatuses: Record<string, SubjectStatus>
  selection: ...                            // tipo real de useSubjectSelection
  searchTerm: string
  statusFilter: StatusFilter
  yearFilter: YearFilter                    // 'ALL' en desktop
}): MapaDerivedState & { yearSummaries: YearSummary[] }

// Hook: estado de filtros + memo de la derivación.
export function useMapaState(options: { availableSubjectSlugs?: string[] }) {
  // searchTerm, statusFilter, yearFilter como useState independientes
  // progress = useMapaProgress(); selection = useSubjectSelection(progress)
  // derived = useMemo(() => deriveMapaState(...), [deps])
  // devuelve { progress, selection, derived, filters, actions }
}
```

Los tipos exactos salen de leer `useMapaDerivedState` en el desktop y los
`useMemo` del mobile: la unión de ambos contratos. `yearFilter` y
`yearSummaries` (hoy solo mobile) entran al contrato común; desktop los
ignora hasta que quiera usarlos. Mover también los tipos compartidos
(`StatusFilter`, `MapaDerivedState`, `MapaActions`) al hook nuevo y
exportarlos.

**Verificar**: `pnpm typecheck` → exit 0 (con el hook creado pero aún sin consumidores).

### Paso 2: Tests de la derivación

Crear `src/hooks/useMapaState.test.ts` testeando `deriveMapaState` (función
pura — sin render, mismo estilo que
`src/lib/domain/mapa/subjectQueries.test.ts`). Casos mínimos:

1. Sin filtros → devuelve todas las materias agrupadas por año.
2. `searchTerm` filtra por nombre.
3. `statusFilter: 'LOCKED'` deja solo bloqueadas.
4. `yearFilter: 2` (caso mobile) deja solo materias de ese año.
5. Materia seleccionada → `selectedUnlocks` y `selectedMissingSubjects`
   coinciden con lo que devuelven `getUnlocks`/`getMissingCorrelatives` del
   dominio para esa materia.

**Verificar**: `pnpm test src/hooks/useMapaState.test.ts` → 5 tests pasan.

### Paso 3: Migrar desktop

En `MapaCorrelativas.tsx`: reemplazar `useState`s de filtros +
`useMapaDerivedState` por `useMapaState`, borrar el hook privado y los tipos
movidos. El JSX no cambia — solo de dónde salen los datos.

**Verificar**: `pnpm typecheck && pnpm test` → exit 0. Con `pnpm dev`,
`/mapa` en viewport desktop se ve y se comporta igual (buscar, filtrar por
estado, seleccionar materia, autocompletar año, reset).

### Paso 4: Migrar mobile

En `MapaCorrelativasMobile.tsx`: reemplazar los `useState` de
`searchTerm`/`statusFilter`/`yearFilter` y los `useMemo` de derivación por
`useMapaState`. El estado puramente de UI mobile (`mode`,
`detailSubjectSlug`, `confirmResetOpen`) se queda local en el componente.

**Verificar**: `pnpm typecheck && pnpm test` → exit 0. Con `pnpm dev` en
viewport mobile: modos plan/ruta, filtro por año, búsqueda, modal de detalle
y reset funcionan igual.

### Paso 5: Confirmar la reducción

```bash
wc -l src/components/mapa/MapaCorrelativas.tsx src/components/mapa/MapaCorrelativasMobile.tsx
rg -c "useMemo" src/components/mapa/MapaCorrelativasMobile.tsx
```

**Verificar**: ambos componentes bajaron de tamaño respecto a 1136/1084 y la
derivación duplicada desapareció (los `useMemo` que queden deben ser de
presentación, no de dominio).

### Paso 6: Regresión completa

```bash
pnpm typecheck && pnpm lint && pnpm test
```

**Verificar**: exit 0.

## Plan de tests

- Nuevos: `src/hooks/useMapaState.test.ts` (paso 2, 5 casos sobre la función
  pura), modelados sobre `src/lib/domain/mapa/subjectQueries.test.ts`.
- Regresión: suite completa + verificación manual de ambas variantes en
  `pnpm dev` (pasos 3 y 4 listan los flujos exactos a probar).

## Criterios de done

- [ ] `useMapaState` + `deriveMapaState` existen, con los tipos compartidos
      exportados desde ahí
- [ ] Desktop y mobile consumen el hook; ninguno re-implementa derivación
- [ ] El drift conocido quedó unificado: `yearFilter`/`yearSummaries` viven
      en el contrato común
- [ ] 5 tests nuevos pasan; suite completa en verde
- [ ] El JSX de ambos componentes no cambió de comportamiento (flujos
      manuales de los pasos 3-4 verificados)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` → exit 0
- [ ] `git status`: solo los 4 archivos en alcance
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- Los contratos de derivación de desktop y mobile resultan tener diferencias
  SEMÁNTICAS (no de forma): p. ej. el mismo helper llamado con argumentos
  distintos que producen resultados distintos a propósito. No los unifiques a
  ciegas — reportá la diferencia y esperá decisión.
- `useSubjectSelection` o `useMapaProgress` necesitan cambios de firma para
  que el hook compile — están fuera de alcance; reportá.
- El render de cualquiera de las dos variantes cambia visiblemente en el
  paso 3 o 4 — revertí ese paso y reportá qué dato del contrato no coincidió.
- Te ves tentado a unificar también el JSX en un solo componente con
  branches — NO: la divergencia de UI es deliberada (la vista mobile es otro
  producto de interacción).

## Notas de mantenimiento

- Features nuevas del mapa: la lógica va en `src/lib/domain/mapa/` (pura,
  testeada), la composición en `useMapaState`, y cada variante solo decide
  cómo pintarla. Tres capas, una sola fuente de verdad.
- Si la vista visual (`/mapa/visual`) empieza a duplicar derivación, migrarla
  al mismo hook — quedó explícitamente diferido.
- Revisor: atención a las deps de los `useMemo` movidos — un dep faltante en
  la migración es el bug más probable de este refactor.
