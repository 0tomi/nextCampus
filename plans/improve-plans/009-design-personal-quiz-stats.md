# Plan 009 (diseño/spike): Estadísticas personales del examen ranked

> **Instrucciones para el ejecutor**: Este es un plan de DISEÑO, no de
> feature: el entregable es un documento de diseño + una query prototipada y
> validada, NO código de producción mergeado. Seguilo paso a paso y honrá las
> condiciones de STOP. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- prisma/schema.prisma src/app/api/quiz/ranked/ src/components/quiz/`
> Si el modelo `RankedQuizAttempt` o las rutas ranked cambiaron, releé esos
> archivos antes de diseñar sobre supuestos viejos.

## Status

- **Prioridad**: P3
- **Esfuerzo**: M (el spike; la feature resultante se estima aparte en el doc)
- **Riesgo**: LOW (no toca producción)
- **Depende de**: ninguno
- **Categoría**: direction
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

El modo ranked ya registra TODO lo necesario para mostrarle al estudiante su
progreso: cada intento guarda porcentaje, aciertos, duración y fecha. Pero la
UI solo muestra el podio global — el estudiante que practica no ve su
historial, su mejor marca ni su tendencia. La motivación de repetir un examen
("mejoré 15 puntos desde la semana pasada") es exactamente el loop de
engagement que un campus de estudio quiere, y acá es UI sobre datos que ya
existen. Este spike define la feature con evidencia antes de gastar en
construirla.

## Estado actual (evidencia, verificada en `473caa9`)

- El dato ya se acumula por intento:

```prisma
// prisma/schema.prisma:224-248 (extracto)
model RankedQuizAttempt {
  id              String   @id @default(cuid())
  subjectId       String
  bankId          String
  bankName        String
  participantName String
  normalizedName  String
  status          RankedQuizAttemptStatus @default(IN_PROGRESS)
  correctAnswers  Int?
  totalQuestions  Int
  percentage      Int?
  durationSeconds Int?
  startedAt       DateTime @default(now())
  finishedAt      DateTime?
  ...
  @@index([subjectId, bankId, normalizedName], map: "RankedQuizAttempt_name_idx")
}
```

  El índice `RankedQuizAttempt_name_idx` ya cubre exactamente la query de
  historial personal (materia + banco + nombre) — señal de que el modelo de
  datos "quería" esta feature.
- La identidad es un nombre auto-declarado: `participantName` se valida en
  `validateParticipantName` (`src/lib/domain/ranked-quiz.ts`) y se normaliza
  a `normalizedName` para dedupe. No hay cuentas de alumno (auth es solo
  admin, by design).
- El ranking global existente como referencia de query y estilo:
  `src/app/api/quiz/ranked/ranking/route.ts` — SQL crudo con
  `row_number() OVER (PARTITION BY "normalizedName" ...)` para "mejor intento
  por persona", filtrando `status = 'VALID'`.
- El flujo del examen y dónde el cliente conoce el nombre del participante:
  los componentes en `src/components/quiz/` (leer `QuizConfigPhase.tsx` y los
  componentes ranked durante el spike para confirmar si el nombre persiste en
  localStorage entre sesiones — eso define cuánta fricción tiene "ver MI
  historial").

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Explorar datos reales | MCP de Supabase (`execute_sql`) o psql contra la base de DEV | filas de `RankedQuizAttempt` |
| Probar la query prototipo | ídem | historial correcto para un nombre de prueba |
| Tests del dominio (si el spike agrega helpers puros) | `pnpm test src/lib/domain/ranked-quiz.test.ts` | pasan |

## Toolkit sugerido para el ejecutor

- Skill `brainstorming` (`.agents/skills/brainstorming/SKILL.md`) — es
  exactamente este tipo de trabajo: intención, usuarios y comportamiento
  antes de código.
- Skill `supabase-postgres-best-practices` para la query de tendencia.
- Regla DURA del repo (AGENTS.md): la redacción de cualquier mockup/copy es
  de cara al usuario, simple y sin tecnicismos. Nada de "attempts",
  "percentile" ni jerga de infraestructura en los textos propuestos.

## Alcance

**En alcance** (entregables del spike):
- `docs/plans/personal-quiz-stats-design.md` (crear) — el documento de diseño.
- Queries prototipo validadas contra la base de dev (van DENTRO del doc).
- Si ayuda a decidir: helpers puros experimentales en un branch descartable.

**Fuera de alcance**:
- Mergear CUALQUIER código de producción (rutas, componentes, schema).
- Cambios al schema de Prisma — si el diseño los necesita, se listan como
  parte del costo en el doc.
- Tocar el ranking global existente.

## Workflow de git

- Branch: `design/personal-quiz-stats`
- Conventional Commits sin atribución a IA. Sugerido:
  `docs(quiz): diseño de estadísticas personales del modo ranked`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Confirmar el comportamiento actual del cliente

Leer `src/components/quiz/` (arrancar por `QuizConfigPhase.tsx` y los
componentes con "Ranked" en el nombre) y responder con evidencia
(`archivo:línea`):

1. ¿El `participantName` persiste en el navegador entre sesiones? ¿Dónde?
2. ¿Qué pantalla muestra hoy el resultado de un intento y el podio?
3. ¿Desde dónde sería natural linkear "mis estadísticas"?

**Verificar**: las tres respuestas citadas en el borrador del doc.

### Paso 2: Prototipar las queries

Contra la base de DEV, escribir y validar:

1. **Historial**: intentos VALID de un `normalizedName` en una materia+banco,
   ordenados por `finishedAt` (debería usar `RankedQuizAttempt_name_idx` —
   confirmar con `EXPLAIN`).
2. **Mejor marca vs último intento**: derivable del historial en JS o con una
   window function como la del ranking existente.
3. **Posición en el ranking** (opcional, evaluar costo): variante de la CTE
   de `ranking/route.ts` que devuelva la posición de UN nombre.

**Verificar**: las queries corren, devuelven lo esperado con datos reales de
dev, y el `EXPLAIN` de (1) usa el índice.

### Paso 3: Escribir el documento de diseño

`docs/plans/personal-quiz-stats-design.md` con estas secciones:

- **Problema y usuario**: el estudiante que repite exámenes no ve su progreso.
- **Decisión clave — identidad**: opciones con honestidad sobre el trade-off:
  (a) historial atado al nombre guardado en el navegador (cero fricción,
  se pierde al cambiar de dispositivo; cualquiera que escriba el mismo nombre
  ve el mismo historial — aceptable porque el ranking ya es público por
  nombre); (b) pedir el nombre para consultar (fricción mínima, mismo nivel
  de "privacidad"). Recomendar una.
- **Superficie de UI propuesta**: dónde vive (ej. en la pantalla de
  resultados post-examen + un acceso desde la página de quiz de la materia),
  con wireframe en texto/ASCII. Qué muestra: lista de intentos (fecha,
  puntaje, tiempo), mejor marca, comparación con el último, y tendencia
  simple. Copy propuesto en español user-friendly.
- **API propuesta**: ruta (ej. `GET /api/quiz/ranked/historial?subject=&bank=&name=`),
  shape de respuesta, y las queries del paso 2.
- **Privacidad**: el historial expone TODOS los intentos de un nombre (no
  solo el mejor, como el ranking actual) — evaluar si mostrar solo los
  propios resultados detallados y nada de terceros, y dejarlo decidido.
- **Estimación de la feature completa** (gruesa, S/M/L por pieza) y **qué NO
  hacer en v1** (gráficos elaborados, percentiles, comparación entre bancos).
- **Preguntas abiertas para el operador** (máximo 3, concretas).

**Verificar**: el doc existe, las queries están pegadas con su EXPLAIN, y un
lector que no vio este plan puede decidir "construir / no construir".

## Plan de tests

No aplica (spike). El doc debe incluir la sección de plan de tests DE LA
FEATURA futura (qué se testea del dominio puro, qué del route — siguiendo los
patrones de `ranked-quiz.test.ts` y `finish/route.test.ts`).

## Criterios de done

- [ ] `docs/plans/personal-quiz-stats-design.md` completo con las 7 secciones
- [ ] Queries validadas contra dev con `EXPLAIN` que confirma el uso del índice
- [ ] Decisión de identidad recomendada con trade-offs explícitos
- [ ] Cero código de producción tocado (`git status` solo muestra el doc)
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- La base de dev no tiene intentos ranked suficientes para validar las
  queries — sembrá datos de prueba SOLO en dev; si no hay base de dev
  accesible, BLOCKED.
- Descubrís en el paso 1 que el nombre NO persiste en el cliente y el flujo
  actual lo pide en cada examen — la decisión de identidad cambia de forma;
  documentalo como hallazgo central y marcá las opciones, no asumas la (a).
- El diseño parece necesitar auth de alumnos — eso contradice el modelo del
  producto (auth solo admin, by design); pará y planteáselo al operador como
  pregunta abierta, no como recomendación.

## Notas de mantenimiento

- Si el plan 005 (techo de duración) se implementa, los intentos
  `duration_exceeded` quedan INVALID — el historial personal debe decidir si
  los muestra (sugerencia: sí, marcados, porque para el estudiante su propio
  intento inválido sigue siendo información útil).
- La feature que salga de este diseño debería entrar por el flujo normal del
  repo (plan propio o SDD), no implementarse desde este spike.
