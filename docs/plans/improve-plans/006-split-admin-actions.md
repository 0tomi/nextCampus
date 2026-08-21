# Plan 006: Partir src/app/admin/actions.ts (2055 líneas) en módulos por dominio

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- src/app/admin/actions.ts src/app/admin/actions.test.ts`
> Si `actions.ts` cambió desde `473caa9`, los números de línea de este plan
> corren — re-inventariá los exports con
> `rg -n "^export (async )?function|^export interface|^export type" src/app/admin/actions.ts`
> antes de seguir. Si la estructura general ya no coincide (p. ej. alguien ya
> empezó a partir el archivo), condición de STOP.

## Status

- **Prioridad**: P2
- **Esfuerzo**: L
- **Riesgo**: MED (mover server actions tiene reglas de compilación propias; mitigado porque el split es mecánico y hay tests + build como gates)
- **Depende de**: 001 (CI como red de seguridad — este refactor se eligió sin agregar tests nuevos)
- **Categoría**: tech-debt
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

`src/app/admin/actions.ts` tiene 2055 líneas y 23 server actions exportadas
que cubren TODOS los dominios del panel admin: eventos, períodos académicos,
apuntes, bancos de quiz, años, materias/comisiones y sesión. Es el segundo
archivo más editado del repo (10 cambios en los últimos 100 commits): cada
feature nueva lo toca, cada review carga con todo el contexto, y es un cuello
de botella de merges. El split por dominio baja el costo de cada cambio
futuro. **Restricción dura: ningún import existente puede romperse** — el
archivo actual queda como barrel de re-exports.

## Estado actual

- `src/app/admin/actions.ts` — `'use server'` en la línea 1. Inventario de
  exports en `473caa9` (verificar con el comando del drift check):

| Dominio | Exports (línea) |
|---|---|
| eventos | `createEvento` (217), `createEventoAction` (281), `updateEventoFechaAction` (300), `updateEventoAction` (345), `deleteEvento` (435) |
| periodos | `createPeriodoAction` (537), `updatePeriodoAction` (556), `deletePeriodo` (598), `export interface PeriodoActionState` (505) |
| apuntes | `createApunteAction` (904), `updateApunteAction` (1049), `deleteApunteAction` (1200) |
| quiz | `uploadQuizBankAction` (1260), `deleteQuizBankAction` (1327) |
| years | `createYearAction` (1409), `updateYearAction` (1508), `deleteYearAction` (1620), `getYearDeleteImpactAction` (1672) |
| subjects | `createSubjectAction` (1733), `createCommissionAction` (1832), `updateSubjectAction` (1901), `deleteSubjectAction` (1992), `getSubjectDeleteImpactAction` (2036) |
| sesión | `signOutAction` (2050) |

- Helpers privados compartidos (NO exportados hoy), al tope del archivo:
  - `revalidateTag(tag)` (línea 61) — wrapper de `revalidateTagRaw(tag, 'max')`
    con el perfil de cacheLife que exige Next 16.
  - `requireAuth(scope)` (línea 69) — despacha a
    `requireGeneralAdmin`/`requireAcademicManager`/`requireAnyAdmin`.
  - `revalidateSubjectContent(subjectSlug)` (línea 75) — invalidación de cache
    por materia (el plan 007 la modifica DESPUÉS de este plan).
  - `revalidatePeriodos()` (línea 486) — invalidación de períodos.
  - `ActionInputError` (línea 104), `optionalEntityIdSchema` (línea 106) y
    más schemas/helpers Zod repartidos entre las funciones — inventariarlos al
    ejecutar: cada uno va al módulo del dominio que lo usa, o a `shared.ts` si
    lo usan dos o más dominios.
- El comentario-contrato del archivo (línea 65): "Toda escritura: auth
  específico (general o por año) -> Zod -> sanitize." — preservarlo en
  `shared.ts`.
- Tests existentes: `src/app/admin/actions.test.ts` importa desde
  `@/app/admin/actions` — con el barrel deben pasar SIN editarlos (son el
  gate de regresión).
- **Reglas de compilación de server actions (Next 16)**:
  - Un archivo con `'use server'` solo puede exportar funciones async (los
    `export type`/`export interface` se borran en compilación y están OK).
  - Cada archivo nuevo que defina actions DEBE empezar con `'use server'`.
  - Re-exportar server actions desde un barrel está permitido.
  - `shared.ts` NO debe llevar `'use server'` (exporta clases, schemas y
    helpers sync — con la directiva, eso es error de build).
- AGENTS.md exige `pnpm build` antes de mergear a `main`; para este plan es
  obligatorio porque los errores de boundaries client/server solo los
  reproduce el build.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Inventario de exports | `rg -n "^export" src/app/admin/actions.ts` | lista completa |
| Quién importa las actions | `rg -ln "@/app/admin/actions'" src` | lista de consumidores (NO deben editarse) |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests de actions | `pnpm test src/app/admin/actions.test.ts` | todos pasan |
| Suite completa | `pnpm test` | todos pasan |
| Build autoritativo | `pnpm build` | exit 0 (necesita `.env` local completo) |

## Toolkit sugerido para el ejecutor

- Skill `next-best-practices` (`.agents/skills/next-best-practices/SKILL.md`)
  — reglas de Server Actions y boundaries RSC.
- Estándares del proyecto (`.atl/skill-registry.md`): Conventional Commits sin
  atribución a IA; pnpm.

## Alcance

**En alcance**:
- `src/app/admin/actions.ts` — queda como barrel de re-exports.
- `src/app/admin/actions/shared.ts` (crear) — helpers comunes, SIN `'use server'`.
- `src/app/admin/actions/{eventos,periodos,apuntes,quiz,years,subjects,session}.ts` (crear) — cada uno CON `'use server'`.

**Fuera de alcance** (NO tocar):
- TODOS los consumidores: componentes, páginas y tests que importan
  `@/app/admin/actions` siguen importando exactamente igual.
- `src/app/admin/users/actions.ts` y `src/app/admin/perfil/actions.ts` — son
  archivos separados que ya están bien.
- El CUERPO de las funciones: este plan mueve código, NO lo cambia. Cero
  cambios de lógica, validación, mensajes o invalidación (eso es el plan 007).
- `src/lib/queries.ts`, `src/lib/auth.ts`, `src/lib/storage.ts`.
- Slugs de rutas o entidades (regla del repo: jamás sin aprobación).

## Workflow de git

- Branch: `refactor/split-admin-actions`
- Un commit por dominio movido (historia revisable), Conventional Commits sin
  atribución a IA. Ejemplos:
  - `refactor(admin): extraer helpers compartidos de actions a shared.ts`
  - `refactor(admin): mover actions de eventos a actions/eventos.ts`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

El orden es: shared primero, después un dominio por vez, verificando cada uno.
El barrel se va construyendo a medida que se mueve.

### Paso 1: Crear `shared.ts` con los helpers comunes

Crear `src/app/admin/actions/shared.ts` (sin `'use server'`) y mover ahí:
`revalidateTag` (wrapper), `requireAuth` + tipo `AdminAuthScope`,
`revalidateSubjectContent`, `revalidatePeriodos`, `ActionInputError`,
`optionalEntityIdSchema`, y todo helper/schema usado por MÁS de un dominio
(inventariar con búsquedas de cada símbolo dentro de `actions.ts`).
Exportarlos (pasan de privados a exportados — son imports internos del
paquete `actions/`, no API pública). En `actions.ts`, importar desde
`./actions/shared` y borrar las definiciones locales. Conservar los
comentarios existentes (el contrato "auth -> Zod -> sanitize", el comentario
del perfil 'max' de revalidateTag, etc.).

**Verificar**: `pnpm typecheck && pnpm test src/app/admin/actions.test.ts` → exit 0.

### Paso 2: Mover el dominio eventos

Crear `src/app/admin/actions/eventos.ts` con `'use server'` en la línea 1.
Mover las 5 funciones de eventos (tabla de arriba) con sus schemas/helpers
privados exclusivos. Importar lo compartido desde `./shared`. En
`actions.ts`, borrar lo movido y agregar:

```ts
export {
  createEvento,
  createEventoAction,
  updateEventoFechaAction,
  updateEventoAction,
  deleteEvento,
} from './actions/eventos'
```

**Verificar**: `pnpm typecheck && pnpm test src/app/admin/actions.test.ts` → exit 0.

### Pasos 3-8: Repetir para cada dominio restante

Mismo procedimiento, un dominio por paso, en este orden: `periodos` (incluye
`export interface PeriodoActionState`, re-exportado con `export type { PeriodoActionState }`),
`apuntes`, `quiz`, `years`, `subjects`, `session` (`signOutAction`).

**Verificar después de CADA dominio**: `pnpm typecheck && pnpm test src/app/admin/actions.test.ts` → exit 0.

### Paso 9: Estado final del barrel

Al terminar, `src/app/admin/actions.ts` debe contener ÚNICAMENTE la directiva
`'use server'` (mantenerla: garantiza que cualquier export del barrel siga
tratándose como action), los bloques `export { ... } from './actions/<dominio>'`
y los `export type { ... }`. Sin lógica, sin imports de prisma/zod.

**Verificar**:
```bash
rg -c "async function" src/app/admin/actions.ts   # → 0 matches (exit code 1)
wc -l src/app/admin/actions.ts                     # → menos de ~60 líneas
```

### Paso 10: Regresión completa + build

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Verificar**: exit 0 en TODO. El build es obligatorio acá: los errores de
`'use server'` mal ubicado (export sync en archivo con directiva, etc.) solo
aparecen en build. Si el entorno no tiene `.env` para el build, condición de
STOP (pedir al operador que lo corra él).

## Plan de tests

Sin tests nuevos: el plan es movimiento de código sin cambio de
comportamiento. Gate de regresión: `src/app/admin/actions.test.ts` intacto y
en verde tras cada paso, suite completa + build al final. Si algún test
importa un símbolo que hoy no está exportado (helper privado), condición de
STOP — no agrandar la API pública para esquivarlo.

## Criterios de done

- [ ] 7 módulos de dominio + `shared.ts` creados; cada módulo de actions
      empieza con `'use server'`; `shared.ts` NO la tiene
- [ ] `actions.ts` es solo re-exports (verificación del paso 9)
- [ ] NINGÚN archivo consumidor editado:
      `git diff --name-only` solo muestra `src/app/admin/actions.ts` y
      `src/app/admin/actions/*`
- [ ] `actions.test.ts` pasa SIN modificaciones
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → exit 0
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- `pnpm build` falla con un error de server actions que no resolvés moviendo
  la directiva o el export al archivo correcto en UN intento — reportá el
  error completo en vez de iterar a ciegas.
- Encontrás un helper privado usado por 4+ dominios con lógica no trivial
  (más que un wrapper): reportalo como candidato a `src/lib/` en vez de
  decidir solo.
- Un consumidor importa de `@/app/admin/actions` algo que NO está en el
  inventario de este plan — el archivo driftó; re-inventariá y si la
  diferencia es grande, reportá.
- Te ves tentado a "mejorar" una función mientras la movés (renombrar,
  cambiar un mensaje, ajustar un schema) — NO. Mover, nada más.
- El build no se puede correr por falta de `.env` — entregá hasta el paso 9 y
  reportá que falta el gate autoritativo.

## Notas de mantenimiento

- El plan 007 (política de invalidación de cache) modifica
  `actions/shared.ts` — por eso 006 va ANTES.
- Convención a futuro: toda action admin nueva nace en su módulo de dominio y
  se re-exporta del barrel; no volver a engordar `actions.ts`.
- Revisor: el diff ideal de cada commit es "código borrado en actions.ts +
  el mismo código agregado en actions/<dominio>.ts" — cualquier línea que no
  sea movimiento 1:1 merece pregunta.
