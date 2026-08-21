# Plan 005: Techo de duración server-side para el examen ranked

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- src/app/api/quiz/ranked/finish/route.ts src/lib/domain/ranked-quiz.ts src/lib/domain/ranked-quiz.test.ts src/app/api/quiz/ranked/finish/route.test.ts`
> Si alguno cambió, compará los extractos de "Estado actual" contra el código
> vivo; si no coinciden, tratalo como condición de STOP.

## Status

- **Prioridad**: P2
- **Esfuerzo**: S
- **Riesgo**: LOW (el guard solo afecta la validez para el ranking, nunca la corrección)
- **Depende de**: 001 (recomendado)
- **Categoría**: security
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

El modo ranked compite por porcentaje y, a igual porcentaje, por menor
duración. Hoy la única señal anti-trampa es `clientInvalidated`: el cliente se
auto-reporta si salió de pantalla completa. Esa señal está bien diseñada en un
sentido (solo puede **invalidar**, nunca forzar validez — ver extracto abajo),
pero es voluntaria: un cliente modificado simplemente no la manda. Lo que el
server SÍ puede verificar solo es el tiempo: un intento que quedó abierto
horas (persona que arrancó, estudió con el examen abierto, y entregó) no
debería competir en el ranking. Este plan agrega ese guard. Contexto asumido y
correcto por diseño: la identidad es un nombre auto-declarado
(`participantName`) — el ranking de un campus abierto es honor-system y este
plan NO intenta cambiar eso, solo elimina la ventaja verificable.

## Estado actual

- El cálculo de validez al entregar:

```ts
// src/app/api/quiz/ranked/finish/route.ts:80-95 (extracto)
const finishedAt = new Date()
const durationSeconds = Math.max(0, Math.round((finishedAt.getTime() - attempt.startedAt.getTime()) / 1000))
const validForRanking = !attempt.invalidatedAt && parsed.data.clientInvalidated !== true

await prisma.rankedQuizAttempt.update({
  where: { id: attempt.id },
  data: {
    status: validForRanking ? 'VALID' : 'INVALID',
    ...
    invalidReason: validForRanking ? attempt.invalidReason : attempt.invalidReason ?? 'client_invalidated',
    invalidatedAt: validForRanking ? attempt.invalidatedAt : attempt.invalidatedAt ?? finishedAt,
  },
})
```

  Nota: `durationSeconds` ya se calcula server-side con `attempt.startedAt`
  (timestamp creado por el server en `start`). No hay NINGÚN chequeo de techo.
- El dominio ranked vive en `src/lib/domain/ranked-quiz.ts` y exporta
  constantes y helpers puros (`RANKED_MIN_QUESTIONS`, `RANKED_TOP_LIMIT`,
  `getRankedQuestionCount`, `validateParticipantName`). Tiene su test:
  `src/lib/domain/ranked-quiz.test.ts`.
- El intento guarda `totalQuestions` (`prisma/schema.prisma:237`), disponible
  en `attempt` dentro de `finish`.
- El ranking solo considera `status = 'VALID'`
  (`src/app/api/quiz/ranked/ranking/route.ts:50`), así que marcar INVALID
  excluye del ranking sin tocar esa query.
- La respuesta de `finish` ya devuelve `ranked.validForRanking` y
  `ranked.invalidReason` al cliente (líneas 97-107) — la UI existente ya sabe
  mostrar intentos no válidos para ranking (es el mismo camino que
  `client_invalidated`).
- Defensa en profundidad ya presente (no duplicar): `src/proxy.ts` aplica
  rate limit por IP a todo `/api` cuando Redis está configurado; las
  respuestas se siguen corrigiendo server-side contra el banco real.
- Test del route existente como patrón: `src/app/api/quiz/ranked/finish/route.test.ts`.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Tests del dominio | `pnpm test src/lib/domain/ranked-quiz.test.ts` | todos pasan |
| Tests del route | `pnpm test src/app/api/quiz/ranked/finish/route.test.ts` | todos pasan |
| Suite completa | `pnpm test` | todos pasan |
| Typecheck | `pnpm typecheck` | exit 0 |

## Toolkit sugerido para el ejecutor

- Regla del repo (AGENTS.md / `.atl/skill-registry.md`): redacción frontend
  user-friendly. El `invalidReason` es un código interno, pero si la UI lo
  traduce a texto, el texto nuevo debe ser claro y sin tecnicismos (ej.
  "El intento superó el tiempo máximo y no entra al ranking").
- Skill `zod` (`.agents/skills/zod/SKILL.md`) si hay que tocar el schema del
  body (no debería hacer falta).

## Alcance

**En alcance**:
- `src/lib/domain/ranked-quiz.ts` — constante + helper puro del techo.
- `src/lib/domain/ranked-quiz.test.ts` — tests del helper.
- `src/app/api/quiz/ranked/finish/route.ts` — aplicar el guard.
- `src/app/api/quiz/ranked/finish/route.test.ts` — tests del guard en el route.

**Fuera de alcance** (NO tocar):
- `src/app/api/quiz/ranked/start/route.ts` — la creación de intentos queda
  igual (ya está cubierta por el rate limit del proxy).
- `src/app/api/quiz/ranked/ranking/route.ts` — el ranking ya filtra por VALID.
- El mecanismo `clientInvalidated` — se mantiene tal cual (su semántica es
  correcta: solo invalida).
- `prisma/schema.prisma` — no hace falta ningún campo nuevo.
- La identidad por `participantName` — by design, no "arreglarla".
- Componentes de UI del quiz — solo si la traducción del nuevo
  `invalidReason` vive en un mapa de mensajes existente; si requiere más que
  agregar una entrada a un mapa, reportar en vez de tocar UI.

## Workflow de git

- Branch: `fix/ranked-duration-ceiling`
- Conventional Commits sin atribución a IA. Sugerido:
  `fix(quiz): invalidar para el ranking los intentos que superan el tiempo máximo`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Helper puro en el dominio

En `src/lib/domain/ranked-quiz.ts` agregar:

```ts
// Presupuesto generoso por pregunta. Un ranked real ronda 1-2 min por
// pregunta; 5 min por pregunta + margen fijo solo excluye intentos que
// quedaron abiertos mucho más tiempo del que un examen honesto puede durar.
export const RANKED_SECONDS_PER_QUESTION_BUDGET = 300
export const RANKED_DURATION_GRACE_SECONDS = 600

export function getRankedMaxDurationSeconds(totalQuestions: number): number {
  return totalQuestions * RANKED_SECONDS_PER_QUESTION_BUDGET + RANKED_DURATION_GRACE_SECONDS
}

export function isRankedDurationExceeded(durationSeconds: number, totalQuestions: number): boolean {
  return durationSeconds > getRankedMaxDurationSeconds(totalQuestions)
}
```

Seguir el estilo del archivo (funciones puras exportadas, sin side effects).

**Verificar**: `pnpm typecheck` → exit 0.

### Paso 2: Aplicar el guard en finish

En `src/app/api/quiz/ranked/finish/route.ts`, después del cálculo de
`durationSeconds` (línea 81) y antes del `update`, incorporar el techo a la
validez y al motivo:

```ts
const durationExceeded = isRankedDurationExceeded(durationSeconds, attempt.totalQuestions)
const validForRanking =
  !attempt.invalidatedAt && parsed.data.clientInvalidated !== true && !durationExceeded
```

y en `data` del update, elegir el motivo con prioridad: si ya había
`invalidReason` previo se conserva; si no, `'duration_exceeded'` cuando
`durationExceeded`, si no `'client_invalidated'`. Mantener la lógica existente
de `invalidatedAt` (se conserva el previo o se setea `finishedAt`). El
response (`ranked.invalidReason`) debe reflejar el mismo motivo.

Importante: el intento se sigue **corrigiendo y devolviendo completo** — el
guard solo afecta `status`/validez para el ranking, nunca los `resultados`.

**Verificar**: `pnpm typecheck` → exit 0.

### Paso 3: Tests del dominio

En `src/lib/domain/ranked-quiz.test.ts` (seguir el estilo de los tests ya
presentes en el archivo):

1. `getRankedMaxDurationSeconds(10)` → `10 * 300 + 600 = 3600`.
2. `isRankedDurationExceeded(3600, 10)` → `false` (el límite exacto no excede).
3. `isRankedDurationExceeded(3601, 10)` → `true`.

**Verificar**: `pnpm test src/lib/domain/ranked-quiz.test.ts` → pasan.

### Paso 4: Tests del route

En `src/app/api/quiz/ranked/finish/route.test.ts`, copiando el patrón de
mocks ya usado en ese archivo (mock de prisma, de `getSubjectQuizMeta` y de
`readQuizBank`):

1. Intento con `startedAt` muy viejo (p. ej. `Date.now() - 24h`) →
   la respuesta tiene `ranked.validForRanking === false` y
   `ranked.invalidReason === 'duration_exceeded'`, y el `update` de prisma
   recibió `status: 'INVALID'`.
2. Intento dentro del presupuesto → `validForRanking === true`,
   `status: 'VALID'` (regresión).
3. Intento dentro del presupuesto pero con `clientInvalidated: true` →
   `invalidReason === 'client_invalidated'` (la semántica vieja sigue intacta).

**Verificar**: `pnpm test src/app/api/quiz/ranked/finish/route.test.ts` → pasan.

### Paso 5: Regresión completa

```bash
pnpm typecheck && pnpm lint && pnpm test
```

**Verificar**: exit 0.

## Plan de tests

Los de los pasos 3 y 4. Patrón estructural: los archivos de test ya
existentes en las mismas rutas. Casos: techo exacto (no excede), techo + 1
(excede), intento viejo invalida con motivo correcto, intento normal sigue
VALID, `clientInvalidated` conserva su semántica.

## Criterios de done

- [ ] `isRankedDurationExceeded` existe en el dominio, pura y testeada
- [ ] `finish` invalida con `invalidReason: 'duration_exceeded'` cuando se
      supera el techo, y el intento igual devuelve sus resultados corregidos
- [ ] Los tres tests nuevos del route pasan + suite completa en verde
- [ ] `pnpm typecheck && pnpm lint && pnpm test` → exit 0
- [ ] `git status`: solo los 4 archivos en alcance
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- El test existente de `finish/route.test.ts` no permite controlar
  `startedAt` del intento mockeado — reportá cómo está armado el mock en vez
  de reestructurar el archivo de test entero.
- La UI muestra el `invalidReason` crudo al usuario (buscá
  `invalidReason` en `src/components/quiz/`): si traducirlo requiere más que
  agregar una entrada a un mapa de mensajes existente, frenás y reportás —
  tocar UI de quiz está fuera de alcance.
- Te ves tentado a agregar validaciones extra (límite de intentos por nombre,
  captcha, etc.) — NO: están explícitamente fuera de alcance.

## Notas de mantenimiento

- Si se cambia `getRankedQuestionCount` o el formato del examen (más/menos
  preguntas), el presupuesto se adapta solo porque depende de
  `totalQuestions`.
- Posible falso positivo asumido: alguien que deja la pestaña abierta horas y
  entrega igual pierde validez de ranking — es el comportamiento deseado; el
  resultado corregido se le muestra igual.
- Futuro relacionado (diferido): `RankedQuizAttempt` en estado `IN_PROGRESS`
  nunca se limpia; si la tabla crece, un cleanup de intentos abandonados es
  el siguiente paso natural y este techo define qué es "abandonado".
