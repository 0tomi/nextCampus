# Plan 010 (diseño/spike): Búsqueda global de apuntes para estudiantes

> **Instrucciones para el ejecutor**: Este es un plan de DISEÑO, no de
> feature: el entregable es un documento de diseño + queries prototipadas y
> medidas, NO código de producción mergeado. Seguilo paso a paso y honrá las
> condiciones de STOP. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- prisma/schema.prisma src/app/api/admin/apuntes/search/route.ts src/components/apuntes/`
> Si el modelo `Apunte` o la búsqueda admin cambiaron, releé antes de diseñar.

## Status

- **Prioridad**: P3
- **Esfuerzo**: M (el spike; la feature se estima aparte en el doc)
- **Riesgo**: LOW (no toca producción)
- **Depende de**: ninguno
- **Categoría**: direction
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

Un estudiante que busca material sobre "recursión" tiene que saber de antemano
en qué materia y año está el apunte, y scrollear el feed de esa materia. No
existe ninguna búsqueda para estudiantes — aunque los apuntes tienen título,
descripción, categorías y recursos con nombre, y aunque la búsqueda YA existe
para admins (con otro propósito y permisos). El descubrimiento cross-materia
es de las features con mejor relación valor/datos-ya-existentes del campus.
Este spike decide el motor (Postgres FTS en español vs `ILIKE`/trigram), la
superficie de UI y el costo real, antes de construir.

## Estado actual (evidencia, verificada en `473caa9`)

- La única búsqueda del repo es admin-only y de alcance limitado:

```ts
// src/app/api/admin/apuntes/search/route.ts:13-41 (extracto)
export async function GET(request: Request) {
  const admin = await requireAnyAdmin()
  ...
  const items = await prisma.apunte.findMany({
    where: {
      ...(q ? { titulo: { contains: q, mode: 'insensitive' } } : {}),
      ...
    },
    take: 12,
    ...
```

  Busca solo por `titulo` con `ILIKE`, requiere admin, y respeta el scoping
  por años del admin (`admin.yearIds`). Sirve como referencia de shape, NO
  como base a extender (la búsqueda de estudiantes es pública y sin scoping).
- Campos disponibles del modelo `Apunte` (confirmar en `prisma/schema.prisma`
  durante el spike): `titulo`, `slug`, descripción HTML, relación con
  categorías (`ApunteCategoria`), recursos (`ApunteRecurso` con `nombre`) y
  la materia/año vía `subject`.
- Todo apunte es público por diseño (no existe estado borrador/publicado en
  el schema) — una búsqueda pública no filtra nada de visibilidad.
- El front de apuntes por materia: `src/components/apuntes/` (el feed
  paginado existente, `APUNTES_PAGE_SIZE = 15` en `src/lib/queries.ts:216`).
- Hook existente relacionado: `src/hooks/useApunteSearch.ts` — leerlo durante
  el spike: es el client hook de la búsqueda admin; documentar en el doc si
  conviene generalizarlo o dejarlo quieto.
- Restricción de plataforma: la base es Supabase Postgres — FTS nativo
  (`to_tsvector('spanish', ...)`), `unaccent` y `pg_trgm` están disponibles
  como extensiones; verificar cuáles están habilitadas con el MCP de Supabase
  (`list_extensions`).

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Extensiones habilitadas | MCP Supabase `list_extensions` (o `SELECT * FROM pg_extension`) | lista con/sin unaccent, pg_trgm |
| Prototipar queries | MCP Supabase `execute_sql` contra DEV | resultados rankeados |
| Medir | `EXPLAIN ANALYZE` de cada variante | costos comparables |

## Toolkit sugerido para el ejecutor

- Skill `supabase-postgres-best-practices`
  (`.agents/skills/supabase-postgres-best-practices/SKILL.md`) — OBLIGATORIA:
  FTS, índices GIN, trigram.
- Skill `brainstorming` para la parte de producto.
- Regla DURA del repo (AGENTS.md): copy de cara al usuario, simple, sin
  tecnicismos. La búsqueda se llama "Buscar apuntes", no "full-text search".

## Alcance

**En alcance** (entregables del spike):
- `docs/plans/global-apunte-search-design.md` (crear) — el documento de diseño.
- Queries prototipo + `EXPLAIN ANALYZE` comparando variantes (en el doc).
- Verificación de qué extensiones de Postgres están disponibles en Supabase.

**Fuera de alcance**:
- Mergear código de producción (rutas, componentes, migraciones).
- Habilitar extensiones o crear índices en la base de PRODUCCIÓN.
- Tocar la búsqueda admin existente.
- Cambiar slugs de lo que sea (regla del repo: jamás sin aprobación).

## Workflow de git

- Branch: `design/global-apunte-search`
- Conventional Commits sin atribución a IA. Sugerido:
  `docs(apuntes): diseño de búsqueda global de apuntes`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Inventario del corpus real

Contra la base de DEV: cuántos apuntes hay, distribución de largo de
`titulo`, cuántos tienen descripción HTML no vacía, cuántas categorías y
recursos con nombre. Esto decide si FTS se justifica HOY o si `ILIKE` +
trigram alcanza hasta que el corpus crezca (con cientos de filas, la
diferencia de motor es invisible para el usuario; la diferencia real es
stemming en español: "integrales" debe encontrar "integral").

**Verificar**: números concretos en el borrador del doc.

### Paso 2: Prototipar las 2-3 variantes de motor

Todas contra dev, todas con `EXPLAIN ANALYZE`:

1. **Baseline**: `ILIKE '%q%'` sobre `titulo` + nombres de recursos +
   categorías (lo más parecido a extender lo que existe).
2. **FTS español**: `to_tsvector('spanish', titulo || ' ' || <descripcion_texto>)`
   con `websearch_to_tsquery('spanish', q)` y ranking `ts_rank`. Decidir e
   indicar cómo se le quita el HTML a la descripción (en SQL con regexp, o
   columna generada — anotar el costo de cada opción). Probar con acentos:
   "algoritmo" vs "algorítmo" (acá entra `unaccent` si está disponible).
3. **Trigram** (`pg_trgm` + GIN), si está habilitado: tolera typos, no hace
   stemming.

Comparar: calidad de resultados con 5 búsquedas realistas de estudiante
(palabras de los apuntes reales de dev), costo del índice requerido, y
complejidad de implementación (¿columna generada + índice GIN = migración?).

**Verificar**: tabla comparativa con los EXPLAIN y los resultados de las 5
búsquedas en el doc.

### Paso 3: Escribir el documento de diseño

`docs/plans/global-apunte-search-design.md` con:

- **Problema y usuario**: descubrimiento cross-materia inexistente.
- **Motor recomendado** con la tabla del paso 2 y el criterio (calidad en
  español > elegancia técnica; si el corpus es chico, decir honestamente que
  el baseline alcanza para v1 y FTS es v2).
- **Superficie de UI propuesta**: dónde vive el acceso (ej. ícono de búsqueda
  en el shell, página `/buscar?q=`), resultados agrupados por materia/año,
  estados vacíos con copy user-friendly. Wireframe en texto. Decidir mobile
  (el repo tiene árbol de componentes mobile separado — la búsqueda necesita
  su variante o un diseño que sirva en ambos).
- **API propuesta**: ruta pública (ej. `GET /api/apuntes/search?q=`), shape,
  rate limiting (ya cubierto por el proxy para `/api`), `take` acotado,
  validación Zod del query param (max length como la admin: 120).
- **Cache**: la búsqueda es por definición dinámica — NO entra en `use cache`;
  anotarlo para que nadie la "optimice" mal después.
- **Migraciones requeridas** (si el motor elegido las necesita): listarlas
  como costo, NO ejecutarlas.
- **Estimación de la feature** (S/M/L por pieza: API, UI desktop, UI mobile,
  migración) y qué NO hacer en v1 (autocomplete, búsqueda dentro de PDFs,
  historial de búsquedas).
- **Preguntas abiertas para el operador** (máximo 3).

**Verificar**: un lector que no vio este plan puede decidir construir o no, y
con qué motor.

## Plan de tests

No aplica (spike). El doc debe incluir el plan de tests de la feature futura:
qué se testea del route (validación, shape, límites — patrón:
`src/app/api/admin/historial/route.test.ts`) y casos de calidad de búsqueda
si el motor es FTS (fixtures con acentos y plurales).

## Criterios de done

- [ ] `docs/plans/global-apunte-search-design.md` completo con las 8 secciones
- [ ] Tabla comparativa de motores con `EXPLAIN ANALYZE` reales de dev
- [ ] Las 5 búsquedas de prueba documentadas con sus resultados por variante
- [ ] Extensiones disponibles en Supabase verificadas y anotadas
- [ ] Cero código de producción tocado (`git status` solo muestra el doc)
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- La base de dev tiene tan pocos apuntes que la comparación de motores no es
  informativa — sembrá fixtures realistas SOLO en dev; sin base de dev,
  BLOCKED.
- `pg_trgm`/`unaccent` no se pueden verificar ni habilitar en dev — limitate
  a las variantes disponibles y anotá la limitación.
- El diseño te empuja a cambiar slugs o estructura de rutas existentes —
  pará: regla del repo, lo decide el operador.

## Notas de mantenimiento

- Si se construye la feature, revisar si `useApunteSearch` (admin) y el hook
  nuevo comparten lógica de debounce/estado — candidato a unificar en ese
  momento, no antes.
- El corpus crece con el uso: si v1 sale con el motor baseline, dejar en el
  doc el umbral sugerido (cantidad de apuntes o feedback de calidad) para
  revisitar FTS.
- La feature resultante entra por el flujo normal del repo (plan propio o
  SDD), no se implementa desde este spike.
