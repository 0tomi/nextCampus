# Diseño: estadísticas personales del examen Ranked

Fecha: 2026-06-15  
Estado: spike validado, listo para decidir si se implementa

## 1. Problema y usuario

El examen Ranked ya guarda puntaje, respuestas correctas, duración y fecha de
cada intento. Sin embargo, quien vuelve a practicar solo ve el resultado
actual y el top general. No puede responder preguntas simples como:

- ¿Mejoré desde la última vez?
- ¿Cuál fue mi mejor resultado?
- ¿Cuánto tardé?
- ¿En qué posición estoy con mi mejor intento?

La propuesta agrega una vista personal por materia, banco y nombre de
participante. No requiere cuentas de estudiantes ni cambia el funcionamiento
del ranking.

## 2. Evidencia del comportamiento actual

### Persistencia del nombre

El nombre sí persiste entre sesiones del navegador:

- `src/components/quiz/QuizProvider.tsx:80-91` lee
  `nextcampus:quiz-ranked:name` desde `localStorage`, lo valida y lo carga en
  el estado.
- `src/components/quiz/QuizProvider.tsx:215-232` vuelve a validar el nombre al
  iniciar y lo guarda después de crear el intento.
- `src/components/quiz/QuizConfigPhase.tsx:192-217` muestra el nombre guardado
  como la identidad con la que se participará.

### Pantallas actuales

- `src/components/quiz/QuizResultsPhase.tsx:10-50` muestra el resultado del
  intento terminado y si participa o no en el top.
- `src/components/quiz/QuizConfigPhase.tsx:220-260` muestra el top del banco
  elegido antes de comenzar.

### Accesos naturales

1. **Principal:** una tarjeta debajo del resultado Ranked, porque ahí la
   comparación tiene más valor.
2. **Secundario:** un enlace “Ver mi progreso” debajo del top del banco, para
   consultar el historial sin rendir otro examen.

## 3. Decisión clave: identidad

### Opción A — usar el nombre guardado en este navegador

El sistema consulta automáticamente con el nombre ya guardado. Es la opción
recomendada para la primera versión.

**Ventajas**

- Cero pasos adicionales después de un examen.
- Reutiliza la identidad y la normalización existentes.
- Mantiene el producto sin cuentas de estudiantes.

**Límites**

- El acceso se pierde al borrar los datos del navegador o cambiar de
  dispositivo.
- Otra persona que escriba el mismo nombre puede consultar el mismo historial.
- No debe presentarse como información privada o verificada.

### Opción B — pedir el nombre cada vez que se consulta

Reduce la dependencia del navegador, pero agrega fricción y conserva el mismo
límite de privacidad: conocer el nombre alcanza para consultar.

### Recomendación

Usar la **opción A**, con una acción “Usar otro nombre”. La pantalla debe decir
“Tu progreso con este nombre”, no “Tu cuenta” ni “Tus datos privados”. El
ranking ya publica nombre y resultado; esta propuesta amplía la profundidad
de la consulta, pero no crea una identidad autenticada.

No se recomienda agregar autenticación de alumnos para esta feature: cambiaría
el modelo del producto y su costo sería desproporcionado.

## 4. Superficie de UI propuesta

### Resultado posterior al examen

```text
┌─────────────────────────────────────────────┐
│ Resultado                            80%    │
│ 8 de 10 respuestas correctas                │
│                                             │
│ Tu progreso con este nombre                 │
│ Mejor marca        90%                      │
│ Último intento     80%  ·  8 min 30 s       │
│ Cambio             10 puntos menos          │
│ Posición actual    2.º                      │
│                                             │
│ [Ver mis intentos]  [Volver a empezar]      │
└─────────────────────────────────────────────┘
```

### Historial expandido

```text
Mis intentos · Estudiante Spike

15 jun 2026     80%     8/10     8 min 30 s
08 jun 2026     90%     9/10     9 min
01 jun 2026     70%     7/10     10 min

Tu mejor resultado fue 90%.
[Usar otro nombre]
```

### Copy propuesto

- Título: **Tu progreso con este nombre**
- Estado positivo: **Mejoraste 10 puntos desde tu intento anterior.**
- Estado negativo: **Esta vez obtuviste 10 puntos menos. Podés volver a
  intentarlo.**
- Sin comparación: **Este es tu primer resultado guardado en este banco.**
- Sin historial: **Todavía no hay resultados válidos con este nombre.**
- Aclaración breve: **El progreso se busca con el nombre que usás en Ranked.**

La tendencia de v1 es textual y compara los dos intentos válidos más recientes.
No necesita gráficos.

## 5. API y consultas propuestas

### Ruta

`GET /api/quiz/ranked/history?subject=<slug>&bank=<id>&name=<nombre>`

La ruta debe:

1. Validar los parámetros con Zod.
2. Resolver el slug de materia a su `subjectId`.
3. Normalizar el nombre con el mismo helper del inicio del Ranked.
4. Devolver solo campos de rendimiento; nunca respuestas ni identificadores
   internos de preguntas.
5. Limitar el historial, por ejemplo a los 20 intentos más recientes.

### Respuesta

```json
{
  "participantName": "Estudiante Spike",
  "summary": {
    "bestPercentage": 90,
    "bestDurationSeconds": 540,
    "latestPercentage": 80,
    "latestDurationSeconds": 510,
    "changeVsPrevious": -10,
    "position": 2
  },
  "attempts": [
    {
      "correctAnswers": 8,
      "totalQuestions": 10,
      "percentage": 80,
      "durationSeconds": 510,
      "finishedAt": "2026-06-15T10:08:30.000Z"
    }
  ]
}
```

### Query 1 — historial

```sql
SELECT
  "participantName",
  "correctAnswers",
  "totalQuestions",
  "percentage",
  "durationSeconds",
  "finishedAt"
FROM "RankedQuizAttempt"
WHERE "subjectId" = $1
  AND "bankId" = $2
  AND "normalizedName" = $3
  AND "status" = 'VALID'
  AND "finishedAt" IS NOT NULL
ORDER BY "finishedAt" DESC
LIMIT 20;
```

La consulta se validó con tres intentos temporales dentro de una transacción.
Devolvió, en orden, 80%, 90% y 70% para las fechas 15, 8 y 1 de junio de 2026.
La transacción se revirtió y se confirmó que no quedaron filas de prueba.

#### Hallazgo del `EXPLAIN`

El índice existente `RankedQuizAttempt_name_idx` no cubre el orden ni el
estado. En la base real, PostgreSQL eligió:

```text
Index Scan Backward using "RankedQuizAttempt_status_idx"
  Index Cond: status = 'VALID' AND finishedAt IS NOT NULL
  Filter: subjectId = ... AND bankId = ... AND normalizedName = ...
Execution Time: 0.050 ms
```

El tiempo actual es bajo porque solo existe un intento válido, pero el plan
escala recorriendo todos los intentos válidos antes de filtrar por persona.
Para producción se recomienda agregar, en la implementación futura:

```sql
CREATE INDEX "RankedQuizAttempt_history_idx"
ON "RankedQuizAttempt" (
  "subjectId",
  "bankId",
  "normalizedName",
  "finishedAt" DESC
)
WHERE "status" = 'VALID' AND "finishedAt" IS NOT NULL;
```

El índice se creó únicamente dentro de una transacción de prueba. El
`EXPLAIN` resultante confirmó:

```text
Index Scan using "RankedQuizAttempt_history_spike_idx"
  Index Cond: subjectId = ... AND bankId = ... AND normalizedName = ...
Execution Time: 1.287 ms
```

Después se ejecutó `ROLLBACK`; el schema productivo no cambió.

### Query 2 — mejor marca, último intento y cambio

```sql
WITH history AS (
  SELECT "percentage", "durationSeconds", "finishedAt"
  FROM "RankedQuizAttempt"
  WHERE "subjectId" = $1
    AND "bankId" = $2
    AND "normalizedName" = $3
    AND "status" = 'VALID'
    AND "finishedAt" IS NOT NULL
),
ranked AS (
  SELECT *,
    row_number() OVER (
      ORDER BY "percentage" DESC, "durationSeconds" ASC, "finishedAt" DESC
    ) AS best_rank,
    row_number() OVER (ORDER BY "finishedAt" DESC) AS latest_rank
  FROM history
)
SELECT
  max("percentage") FILTER (WHERE best_rank = 1) AS best_percentage,
  max("durationSeconds") FILTER (WHERE best_rank = 1) AS best_duration_seconds,
  max("percentage") FILTER (WHERE latest_rank = 1) AS latest_percentage,
  max("durationSeconds") FILTER (WHERE latest_rank = 1) AS latest_duration_seconds,
  max("percentage") FILTER (WHERE latest_rank = 1)
    - max("percentage") FILTER (WHERE latest_rank = 2) AS change_vs_previous
FROM ranked;
```

Resultado validado: mejor marca 90%, último intento 80%, mejor tiempo asociado
540 segundos y cambio de -10 puntos.

En producción también puede derivarse este resumen en TypeScript a partir de
las 20 filas del historial. Para v1 se recomienda hacerlo en el dominio puro:
evita una segunda consulta y deja la regla fácil de testear.

### Query 3 — posición personal

```sql
WITH best_attempts AS (
  SELECT
    "normalizedName",
    "percentage",
    "durationSeconds",
    "finishedAt",
    row_number() OVER (
      PARTITION BY "normalizedName"
      ORDER BY "percentage" DESC, "durationSeconds" ASC, "finishedAt" DESC
    ) AS personal_rank
  FROM "RankedQuizAttempt"
  WHERE "subjectId" = $1
    AND "bankId" = $2
    AND "status" = 'VALID'
    AND "finishedAt" IS NOT NULL
),
leaderboard AS (
  SELECT *,
    row_number() OVER (
      ORDER BY "percentage" DESC, "durationSeconds" ASC, "finishedAt" DESC
    ) AS position
  FROM best_attempts
  WHERE personal_rank = 1
)
SELECT position, "percentage", "durationSeconds"
FROM leaderboard
WHERE "normalizedName" = $3;
```

La variante devolvió la posición 2 para los datos temporales. Su costo es
similar al ranking global porque calcula la mejor marca de cada nombre. Se
puede incluir en v1, pero debe medirse otra vez cuando la tabla crezca.

## 6. Privacidad y límites

Decisión para v1:

- La API devuelve únicamente intentos **válidos** del nombre solicitado.
- No devuelve respuestas, preguntas, motivos internos de invalidación ni
  datos de otros participantes.
- Un intento inválido sigue mostrando su resultado en la pantalla donde se
  terminó, pero no altera mejor marca, tendencia ni historial.
- La interfaz aclara que la búsqueda depende del nombre usado en Ranked.
- Se aplica rate limit a la ruta para reducir enumeración automatizada.

Esta solución no ofrece privacidad fuerte: alguien que conoce el nombre puede
consultar sus resultados. Es coherente con el ranking público actual, pero
debe quedar explícito. Si más adelante se necesita privacidad real, hace falta
una identidad verificable; no alcanza con ocultar el parámetro en la UI.

## 7. Estimación, alcance de v1 y plan de tests

### Estimación gruesa

| Pieza | Tamaño | Trabajo |
|---|---:|---|
| Migración del índice parcial | S | Prisma migration, deploy y `EXPLAIN` |
| Dominio de resumen/tendencia | S | helper puro y tipos |
| Route handler de historial | M | validación, query, posición y rate limit |
| Estado y carga en `QuizProvider` | M | nombre, banco, loading y errores |
| UI de resumen + historial | M | resultado, acceso desde configuración y responsive |
| Verificación integral | S | tests, smoke desktop/mobile y build previo a merge |

Estimación total: **M**.

### Qué no hacer en v1

- Gráficos elaborados.
- Percentiles o comparaciones con otros estudiantes.
- Comparar resultados entre bancos diferentes.
- Sincronizar el nombre entre dispositivos.
- Crear cuentas de estudiantes.
- Mostrar intentos inválidos dentro de la tendencia.

### Plan de tests de la feature futura

**Dominio**

- Mejor intento por porcentaje, luego menor duración y luego fecha.
- Último intento y diferencia contra el anterior.
- Historial con cero, uno y varios intentos.
- Los intentos inválidos no participan.

**Route handler**

- Rechaza materia, banco o nombre inválidos.
- Normaliza el nombre igual que el inicio Ranked.
- Devuelve solo intentos válidos de la materia y banco solicitados.
- No mezcla personas con nombres normalizados distintos.
- Limita la cantidad y mantiene orden descendente por fecha.
- Calcula o incorpora la posición correcta.
- Maneja materia inexistente y rate limit.

**UI**

- Carga automática con el nombre guardado.
- Estados de carga, vacío y error con copy simple.
- Resultado con mejora, retroceso y primer intento.
- Cambio de nombre y actualización al cambiar de banco.
- Verificación responsive y navegación por teclado.

### Preguntas abiertas para el operador

1. ¿La posición personal debe entrar en v1 o alcanza con mejor marca y
   tendencia?
2. ¿El historial debe mostrar 10 o 20 intentos recientes?
3. ¿“Usar otro nombre” reemplaza el nombre guardado inmediatamente o recién al
   comenzar el próximo Ranked?

## Recomendación final

**Construir una v1 acotada.** Los datos y la identidad de navegador ya
existen, la propuesta agrega un loop claro de mejora y no requiere cuentas.
La implementación debe incluir el índice parcial antes de exponer la ruta de
historial.
