---
name: banco-preguntas-examen
description: Genera bancos de preguntas tipo examen, cuestionarios de práctica y material de autoevaluación a partir de contenido de estudio (apuntes, lecturas, presentaciones, código, diagramas). Úsala siempre que el usuario pida "preguntas para estudiar", "cuestionario", "banco de preguntas", "preguntas tipo parcial/final", "multiple choice", "flashcards", "preguntas de práctica", "autoevaluación", "simulacro de examen" o cualquier formulación equivalente, incluso si no menciona explícitamente la palabra "examen". También aplica cuando el usuario adjunta material y pide "armame preguntas sobre esto" o "evaluame con esto".
---

# Banco de preguntas para examen

Esta skill convierte material de estudio en bancos de preguntas pedagógicamente útiles, con el estilo y la rigurosidad de los parciales universitarios reales. El objetivo es discriminar entre quien estudió y quien no, no producir preguntas que se adivinen de memoria.

## Cuándo y cómo arrancar

Antes de escribir la primera pregunta, asegurate de tener lo siguiente. Si falta algo crítico, preguntá una sola vez y proseguí con supuestos razonables si no llega respuesta.

1. **El material o tema concreto.** Sin material, las preguntas son genéricas. Si el usuario solo da un tema amplio ("redes", "sistemas operativos"), pedile apuntes, capítulo o subtemas específicos.
2. **Cantidad de preguntas.** Default: 10–15 si no se aclara.
3. **Tipos preferidos.** Si no aclara, mezclá variedad (ver `references/tipos-de-preguntas.md`).
4. **Nivel de dificultad.** Default: nivel parcial universitario de grado. Ajustá si el usuario indica primer año o final integrador.

## Workflow

1. **Identificar conceptos clave del material**: definiciones, términos técnicos, relaciones entre ideas, ejemplos, datos numéricos y puntos enfatizados por el autor.
2. **Mapear material a tipo de pregunta**. Cada parte sugiere un tipo natural:
   - Definiciones, taxonomías, enumeraciones cerradas → opción única con distractores terminológicos.
   - Conceptos con ejemplos → relacionar.
   - Afirmaciones invertibles, mitos comunes → Verdadero/Falso.
   - Listas de propiedades o características → selección múltiple (con cantidad fija).
   - Código, salida de comandos, diagramas → práctica con referencia visual.
3. **Cubrir el material completo**, no solo el primer tercio ni lo más vistoso. Las secciones del temario deberían tener todas alguna representación.
4. **Escribir cada pregunta** usando el formato canónico de más abajo y siguiendo `references/distractores.md` para construir las opciones incorrectas.
5. **Incluir la explicación de la respuesta correcta** en cada pregunta. Obligatorio, sin excepciones — es lo que convierte el banco en herramienta de estudio.
6. **Pasar el checklist** (`references/checklist-calidad.md`) antes de entregar.
7. **Guardar el banco** como `.md` en `/mnt/user-data/outputs/` con nombre descriptivo (ej: `banco_redes_capa_enlace.md`).

## Formato canónico

```markdown
## Pregunta N

**Tipo:** [Opción única | Selección múltiple | Verdadero/Falso | Relacionar | Práctica con código | Práctica con referencia visual]

**Enunciado:** [Texto del enunciado. Si es selección múltiple, indicar cantidad: "Seleccione 3 opciones".]

**Referencia visual:** [Solo si aplica. Descripción textual del diagrama, captura o código. Si es código o salida, incluir en bloque ```.]

**Opciones:**

- a. [Opción]
- b. [Opción]
- c. [Opción]
- d. [Opción]

**Respuesta correcta:** [Letra(s) o valor]

**Explicación:** [Por qué la respuesta es correcta y, brevemente, por qué los distractores no lo son. 2–5 oraciones.]

---
```

Para V/F, las opciones son `Verdadero` y `Falso`. Para relacionar, ver plantilla en `assets/plantilla.md`.

## Principios que no se negocian

- **Una sola respuesta inequívoca** (o el conjunto exacto solicitado). Si dudás entre dos opciones como correctas, la pregunta está mal redactada.
- **Lenguaje del material**. Usá los términos exactos que aparecen en los apuntes. Si dice "exclusión mutua", no escribas "acceso excluyente".
- **Cero capciosidad**. La dificultad está en el conocimiento evaluado, nunca en la redacción del enunciado. Sin dobles negaciones, sin esconder la pregunta real en una subordinada, sin información irrelevante para confundir.
- **No inventar datos.** Si el material no dice cuándo se creó Laravel, no inventes el año. Las preguntas se construyen sobre el contenido provisto.
- **Variedad cognitiva**. Mezclá: definir, identificar, comparar, aplicar, interpretar, predecir resultado. No solo memorización.

## Referencias auxiliares

No están cargadas por defecto para no inflar contexto. Consultalas cuando corresponda:

- `references/tipos-de-preguntas.md` — Los 6 tipos principales con ejemplo y criterio de uso.
- `references/distractores.md` — Patrones para construir distractores plausibles.
- `references/checklist-calidad.md` — Verificación final antes de entregar.

## Empaquetar el resultado

Por defecto entregá el banco como `.md` en `/mnt/user-data/outputs/`. Si piden JSON estructurado (para importar a una plataforma e-learning):

```bash
python /path/to/skill/scripts/empaquetar.py --input banco.md --output banco.json --format json
```

El script también valida que cada pregunta tenga los campos requeridos, así que es útil correrlo como verificación final aunque la entrega sea en markdown.
