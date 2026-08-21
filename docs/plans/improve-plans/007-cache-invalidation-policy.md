# Plan 007: Estandarizar y documentar la política de invalidación de cache

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: este plan asume que el plan 006 ya
> se ejecutó (los helpers viven en `src/app/admin/actions/shared.ts`). Si 006
> NO se ejecutó, los helpers están en `src/app/admin/actions.ts` (líneas 61,
> 75 y 486 en `473caa9`) — el plan aplica igual, ajustando rutas. Verificar:
> `rg -ln "revalidateSubjectContent" src/app/admin/`

## Status

- **Prioridad**: P2
- **Esfuerzo**: M
- **Riesgo**: MED (invalidar de menos = datos viejos servidos; invalidar de más = pisar el beneficio del cache — por eso el entregable central es la matriz verificada, no solo código)
- **Depende de**: 006 (recomendado fuerte; ver drift check)
- **Categoría**: tech-debt
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

El repo migró hace poco a Cache Components (`use cache` + tags, commit
`8164107`). Las queries declaran tags con criterio, pero la invalidación
desde las server actions creció ad hoc: cada `revalidate*` invalida un
conjunto distinto de tags y paths sin una regla escrita. Hoy nadie puede
responder "si muto X, ¿qué caches se refrescan?" sin leer todo. Eso ya
costó un bug real (commit `5454c06` "fix(home): serialize latest apuntes
createdAt inside cache"). El entregable: una matriz mutación → tags
verificada contra las queries, helpers consistentes con esa matriz, y la
política documentada para que las actions futuras la sigan. De paso se
elimina una query redundante por mutación.

## Estado actual

- Definición de tags (única fuente):

```ts
// src/lib/queries.ts:203-214
const TAGS = {
  career: 'career',
  categorias: 'categorias-apunte',
  latestApuntes: 'latest-apuntes',
  tiposEvento: 'tipos-evento',
  year: (slug: string) => `year:${slug}`,
  subject: (slug: string) => `subject:${slug}`,
  upcomingEvents: 'upcoming-events',
  periodos: 'periodos',
} as const

export const queryTags = TAGS
```

- Mapa de qué query declara qué tag (verificado en `473caa9` con
  `rg -n "cacheTag" src/lib/queries.ts`):

| Query (línea) | Tags |
|---|---|
| `getCareer` (264) | `career` |
| `getYearBySlug` (309) | `year:<slug>`, `career` |
| queries de materia (361, 429, 563) | `subject:<slug>` |
| categorías de apunte (521) | `categorias` |
| tipos de evento (681) | `tiposEvento` |
| períodos (691) | `periodos` |
| `getUpcomingEventsCrossYear` (716) | `upcomingEvents` |
| `getHomeCalendarEvents` (773) | `upcomingEvents`, `career` |
| `getLatestApuntes` (845) | `latestApuntes`, `career` |

  Además hay tags de storage (`quizBanksCacheTag` en `src/lib/storage.ts`) —
  incluirlos en la matriz al ejecutar.
- Los dos helpers de invalidación actuales (tras el plan 006, en
  `src/app/admin/actions/shared.ts`):

```ts
// actions.ts:75-102 en 473caa9 (extracto)
async function revalidateSubjectContent(subjectSlug: string): Promise<void> {
  revalidateTag(queryTags.subject(subjectSlug))
  revalidateTag(queryTags.upcomingEvents)
  revalidateTag(queryTags.latestApuntes)

  const subject = await prisma.subject.findUnique({   // ← query extra por mutación
    where: { slug: subjectSlug },
    select: { year: { select: { slug: true } }, commissions: { select: { slug: true } } },
  })
  if (subject?.year?.slug) {
    revalidateTag(queryTags.year(subject.year.slug))
    revalidatePath(`/${subject.year.slug}`)
    // ... más revalidatePath por comisión
  }
}

// actions.ts:486-494 en 473caa9
async function revalidatePeriodos(): Promise<void> {
  revalidateTag(queryTags.periodos)
  revalidatePath('/')
  const years = await prisma.academicYear.findMany({ select: { slug: true } })
  for (const year of years) {
    revalidateTag(queryTags.year(year.slug))
    revalidatePath(`/${year.slug}/calendario`)
  }
}
```

- Inconsistencias concretas detectadas en la auditoría: mutaciones de
  años/materias invalidan `career` directamente en sus cuerpos, mientras
  `revalidateSubjectContent` no lo toca (correcto solo si ninguna query
  `career` muestra contenido de materia — FALSO: `getLatestApuntes` y
  `getHomeCalendarEvents` declaran `career` además de su tag propio, lo que
  hoy funciona de casualidad porque también declaran el tag específico).
- `revalidateTag` local exige el perfil `'max'` (Next 16):
  `revalidateTagRaw(tag, 'max')` — actions.ts:61-63. No cambiarlo.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Mapa de tags declarados | `rg -n "cacheTag" src/lib/queries.ts src/lib/storage.ts` | lista completa |
| Mapa de invalidaciones | `rg -n "revalidateTag\|revalidatePath" src/app/admin/` | lista completa |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Build (gate final) | `pnpm build` | exit 0 |

## Toolkit sugerido para el ejecutor

- Skill `next-cache-components` (`.agents/skills/next-cache-components/SKILL.md`)
  — OBLIGATORIA antes de tocar invalidaciones: semántica de `use cache`,
  `cacheTag`, perfiles de `revalidateTag`.
- Skill `vercel-react-best-practices` para el costo de invalidar de más.

## Alcance

**En alcance**:
- `src/app/admin/actions/shared.ts` (o `actions.ts` si 006 no corrió) — los
  helpers `revalidate*`.
- Los call sites de esos helpers dentro de `src/app/admin/actions/` — solo
  para pasar parámetros nuevos y quitar invalidaciones redundantes/faltantes
  según la matriz.
- `docs/decisiones/<fecha>-politica-invalidacion-cache.md` (crear) — la
  matriz y la regla.

**Fuera de alcance** (NO tocar):
- `src/lib/queries.ts` — los tags DECLARADOS quedan como están; este plan
  alinea la invalidación, no el cacheo.
- Tiempos de `cacheLife` — calibrados a propósito (60s/300s/1h con
  comentarios que lo explican).
- `src/app/admin/users/actions.ts`, `src/app/admin/perfil/actions.ts`.
- Cualquier lógica de negocio de las actions.

## Workflow de git

- Branch: `refactor/cache-invalidation-policy`
- Conventional Commits sin atribución a IA. Sugerido:
  `refactor(cache): estandarizar la invalidación por tags y documentar la política`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Construir la matriz real (solo lectura)

Con los dos comandos de mapa, armar una tabla completa:

1. Por cada query con `use cache`: qué tags declara y qué datos muestra.
2. Por cada server action que muta: qué entidades toca y qué tags/paths
   invalida hoy.
3. Cruzarlas: para cada mutación, ¿todas las queries que muestran el dato
   mutado tienen al menos un tag invalidado? Marcar **faltantes** (bug de
   datos viejos) y **sobrantes** (invalidación que ninguna query consume).

Guardar la matriz como borrador del doc del paso 4.

**Verificar**: la matriz cubre las 23 actions del barrel y todas las queries
con `cacheTag` de `queries.ts` + `storage.ts`.

### Paso 2: Alinear los helpers

Según lo que la matriz marque (y solo eso):

- `revalidateSubjectContent`: cambiar la firma a recibir el contexto que el
  caller ya tiene, eliminando el `findUnique` extra:

```ts
type SubjectRevalidationContext = {
  subjectSlug: string
  yearSlug: string
  commissionSlugs: readonly string[]
}
async function revalidateSubjectContent(ctx: SubjectRevalidationContext): Promise<void>
```

  La mayoría de las actions ya cargan la materia (los helpers
  `requireYearAdminForSubjectId`/`...Slug` de `src/lib/auth.ts` y los fetch
  propios de cada action) — pasar los slugs desde ahí. Si algún call site
  realmente no tiene los datos, puede hacer el fetch ÉL antes de llamar (el
  objetivo es que el helper sea puro respecto a la DB, no esconder el costo).
- Agregar lo que la matriz marque como faltante y quitar lo sobrante, cada
  cambio con su justificación en el doc.

**Verificar**: `pnpm typecheck && pnpm test` → exit 0.

### Paso 3: Smoke test manual de los flujos críticos

Con `pnpm dev` y la base local: crear/editar/borrar un evento y un apunte
desde el panel admin, y confirmar que (a) la página de la materia, (b) el
calendario del año y (c) el feed del home reflejan el cambio al recargar
(dentro de la ventana de revalidación o inmediatamente si el tag se invalidó).

**Verificar**: los tres lugares muestran el dato nuevo tras la mutación.

### Paso 4: Documentar la política

Crear `docs/decisiones/<YYYY-MM-DD>-politica-invalidacion-cache.md` siguiendo
el formato del doc existente
(`docs/decisiones/2026-05-29-filtrado-home-server-side.md`): la matriz final,
la regla por alcance (mutación de materia → qué tags; mutación de año → qué
tags; mutación global → qué tags), y la instrucción de que toda action nueva
se ubique en la matriz antes de mergear.

**Verificar**: el doc existe y la matriz coincide con el código mergeado.

### Paso 5: Regresión completa

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Verificar**: exit 0.

## Plan de tests

La invalidación de cache de Next no se testea bien con unit tests (los mocks
de `next/cache` solo verificarían que llamamos lo que llamamos). El gate real
es: (a) la matriz del paso 1 revisada contra el código, (b) el smoke test del
paso 3, (c) la suite existente que cubre el comportamiento de las actions
(`actions.test.ts` debe seguir en verde — si asserts de revalidación
existentes fallan por la firma nueva, actualizar SOLO las llamadas en el
test, no las expectativas de negocio).

## Criterios de done

- [ ] Matriz mutación → tags completa y guardada en `docs/decisiones/`
- [ ] `revalidateSubjectContent` no hace queries a la DB
- [ ] Cero invalidaciones faltantes según la matriz (cada query que muestra
      un dato mutado tiene un tag invalidado por esa mutación)
- [ ] Smoke test del paso 3 pasado (anotar en el reporte qué flujos se
      probaron)
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → exit 0
- [ ] `git status`: solo helpers, call sites y el doc nuevo
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- La matriz revela una invalidación faltante cuyo fix requiere AGREGAR un tag
  a una query de `queries.ts` (fuera de alcance) — reportá el caso con la
  evidencia; que el operador decida si ampliar el alcance.
- Un call site no tiene forma razonable de conocer `yearSlug`/
  `commissionSlugs` sin duplicar una query que ya hace el helper — reportá
  ese caso puntual en vez de forzar la firma nueva en todos lados.
- El smoke test del paso 3 muestra datos viejos DESPUÉS de tu cambio en un
  flujo que antes funcionaba — revertí ese cambio puntual y reportá.
- No tenés base local para el smoke test — entregá hasta el paso 2 y marcá el
  plan como BLOCKED con lo que falta.

## Notas de mantenimiento

- Toda action nueva debe ubicarse en la matriz del doc — el revisor de PRs
  futuros debería pedirlo cuando vea `revalidateTag`.
- Si se agregan tags nuevos a `TAGS`, actualizar la matriz en el mismo PR.
- Relación con el plan 006: los helpers viven en `actions/shared.ts`; si 007
  se ejecutó SIN 006, al ejecutar 006 después hay que mover también la firma
  nueva (trivial, es movimiento de código).
