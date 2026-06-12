# Plan 002: Agregar índice sobre Evento.fecha para las queries de calendario

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- prisma/schema.prisma src/lib/queries.ts`
> Si alguno cambió, compará los extractos de "Estado actual" contra el código
> vivo; si no coinciden, tratalo como condición de STOP.

## Status

- **Prioridad**: P1
- **Esfuerzo**: S
- **Riesgo**: LOW
- **Depende de**: 001 (recomendado, no bloqueante)
- **Categoría**: perf
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

`getUpcomingEventsCrossYear()` es la query del feed "próximos eventos" del
home (cacheada solo 60 segundos, así que pega a la DB seguido) y filtra
`Evento` por rango de fecha **sin índice sobre `fecha`**. Hoy la tabla es
chica y Postgres resuelve con un scan; a medida que se cargan cuatrimestres de
eventos, ese scan crece linealmente en la query más frecuente del sitio. El
fix es un índice aditivo: bajo riesgo, beneficio permanente.

## Estado actual

- La query (la única que filtra `Evento` por `fecha` sin pasar por `agendaId`):

```ts
// src/lib/queries.ts:714-725 (extracto)
export async function getUpcomingEventsCrossYear(limit = 6) {
  'use cache'
  cacheTag(TAGS.upcomingEvents)
  cacheLife({ revalidate: 60 })

  const rows = await prisma.evento.findMany({
    where: { fecha: { gte: arTodayBoundary() } },
    orderBy: eventoOrderBy,   // [{ fecha: 'asc' }, { hora: { sort: 'asc', nulls: 'first' } }]
    take: limit,
    ...
```

- El modelo `Evento` tiene índices, pero ninguno incluye `fecha`:

```prisma
// prisma/schema.prisma:187-189
@@index([agendaId])
@@index([tipoEventoId])
@@index([createdByUserId])
```

- El patrón exacto es `WHERE fecha >= X ORDER BY fecha ASC, hora ASC NULLS FIRST LIMIT n`.
  Un índice compuesto `[fecha, hora]` cubre el filtro Y el orden, permitiendo
  a Postgres leer las primeras `n` filas del índice sin sort. Un índice solo
  `[fecha]` también sirve (el sort por `hora` dentro de un mismo día es
  barato), pero `[fecha, hora]` es estrictamente mejor para este patrón y
  cuesta lo mismo de mantener.
- Workflow de migraciones del repo (leer entero antes del paso 2):
  `docs/prisma-migrations.md`. Puntos clave: las migraciones usan `DIRECT_URL`
  (puerto 5432, conexión directa), el runtime usa `DATABASE_URL` (pooler
  6543); **nunca** usar `prisma db push` para producción; producción se aplica
  con `pnpm db:deploy` (= `prisma migrate deploy`).
- Las migraciones del repo se escriben con timestamp + nombre descriptivo, ej.
  `prisma/migrations/20260606120000_add_subject_links/`.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Crear migración + aplicar en dev | `pnpm db:migrate --name add_evento_fecha_index` | migración creada en `prisma/migrations/`, aplicada, cliente regenerado |
| Estado de migraciones | `pnpm exec prisma migrate status` | "Database schema is up to date" |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Validar formato del schema | `pnpm exec prisma format` | sin cambios inesperados |

## Toolkit sugerido para el ejecutor

- Skill `prisma-cli` (`.agents/skills/prisma-cli/SKILL.md`) si hay dudas con
  `migrate dev` / `migrate deploy`.
- Skill `supabase-postgres-best-practices`
  (`.agents/skills/supabase-postgres-best-practices/SKILL.md`) para criterios
  de indexado en Postgres.

## Alcance

**En alcance**:
- `prisma/schema.prisma` — agregar UNA línea de índice al modelo `Evento`.
- `prisma/migrations/<timestamp>_add_evento_fecha_index/migration.sql` — generada por Prisma.

**Fuera de alcance** (NO tocar):
- `src/lib/queries.ts` — la query no cambia; el índice la acelera solo.
- Cualquier otro índice o modelo del schema (incluidos los de
  `RankedQuizAttempt`, que ya están bien).
- Slugs de cualquier entidad — regla del repo: NO cambiar slugs sin aprobación
  explícita del usuario.
- RLS / `prisma/rls-lock-down.sql`.

## Workflow de git

- Branch: `perf/evento-fecha-index`
- Conventional Commits sin atribución a IA. Mensaje sugerido:
  `perf(db): indexar Evento.fecha para el feed de próximos eventos`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Agregar el índice al schema

En `prisma/schema.prisma`, en el modelo `Evento`, junto a los índices
existentes (líneas 187-189 en `473caa9`), agregar:

```prisma
@@index([fecha, hora])
```

**Verificar**: `pnpm exec prisma format` → exit 0 y el schema queda válido.

### Paso 2: Generar y aplicar la migración en dev

Leer `docs/prisma-migrations.md` completo. Confirmar a qué base apunta
`DIRECT_URL` en el `.env` local (debe ser la base de desarrollo). Luego:

```bash
pnpm db:migrate --name add_evento_fecha_index
```

**Verificar**: existe `prisma/migrations/<timestamp>_add_evento_fecha_index/migration.sql`
y su contenido es solo un `CREATE INDEX` sobre `"Evento" ("fecha", "hora")` —
nada más. `pnpm exec prisma migrate status` → "up to date".

### Paso 3: Confirmar que el índice se usa

Contra la base de dev (psql, Supabase SQL editor, o el MCP de Supabase con
`execute_sql`):

```sql
EXPLAIN ANALYZE
SELECT id FROM "Evento"
WHERE "fecha" >= CURRENT_DATE
ORDER BY "fecha" ASC, "hora" ASC NULLS FIRST
LIMIT 6;
```

**Verificar**: el plan menciona `Index Scan` (o `Index Only Scan`) usando
`Evento_fecha_hora_idx`. Nota: con MUY pocas filas Postgres puede elegir
`Seq Scan` por costo — eso NO es un fallo del índice; si pasa, validar con
`SET enable_seqscan = off;` antes del EXPLAIN y confirmar que el índice existe
y es usable, luego volver a `SET enable_seqscan = on;`.

### Paso 4: Regresión

```bash
pnpm typecheck && pnpm test
```

**Verificar**: exit 0, todos los tests pasan (el índice no cambia
comportamiento, esto detecta cualquier efecto colateral del regenerado del
cliente).

## Plan de tests

No requiere tests nuevos: un índice no cambia semántica. La verificación
funcional es el `EXPLAIN ANALYZE` del paso 3 más la suite existente intacta.

## Criterios de done

- [ ] `prisma/schema.prisma` tiene `@@index([fecha, hora])` en `Evento`
- [ ] La migración existe y contiene solo el `CREATE INDEX`
- [ ] `pnpm exec prisma migrate status` → up to date en dev
- [ ] `pnpm typecheck` y `pnpm test` → exit 0
- [ ] `git status`: solo `schema.prisma` y la carpeta de la migración
- [ ] Fila actualizada en `plans/improve-plans/README.md`
- [ ] Nota para el operador: aplicar en producción con `pnpm db:deploy`
      (el ejecutor NO aplica a producción)

## Condiciones de STOP

- `DIRECT_URL` local apunta a la base de producción — frená y pedile al
  operador una base de dev.
- `prisma migrate status` reporta migraciones pendientes ANTES de la tuya —
  la base local está atrasada; reportá en vez de aplicar todo junto sin aviso.
- La migración generada contiene CUALQUIER cosa además del `CREATE INDEX`
  (drops, alters de columnas) — drift entre schema y base; no apliques.
- Cualquier cambio que implique tocar slugs.

## Notas de mantenimiento

- Si más adelante aparece una query que filtra por `agendaId` + rango de
  `fecha` como camino caliente (ej. calendario por comisión con paginación
  server-side), considerar `@@index([agendaId, fecha])`; hoy esas queries
  cargan la agenda completa vía relación, así que no hace falta.
- Producción: la migración queda pendiente hasta que alguien corra
  `pnpm db:deploy` con `DIRECT_URL` de producción (workflow documentado en
  `docs/prisma-migrations.md`). El deploy de Vercel NO aplica migraciones.
