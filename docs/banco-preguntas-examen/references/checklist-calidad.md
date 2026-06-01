# Checklist de calidad

Pasá este checklist antes de entregar el banco. Si algún punto falla, retoque y volvé a revisar.

---

## Estructura del banco

- [ ] Encabezado claro (título, materia, tema, cantidad de preguntas).
- [ ] Variedad de tipos: al menos 3 tipos distintos en bancos de ≥10 preguntas.
- [ ] Preguntas numeradas correlativamente y separadas por `---`.
- [ ] Cobertura amplia del material: ninguna sección quedó sin representación.
- [ ] No hay preguntas duplicadas ni casi-duplicadas (mismo concepto preguntado dos veces).

---

## Cada pregunta

- [ ] **Tipo** declarado explícitamente.
- [ ] **Enunciado** claro, sin ambigüedad ni doble negación, máximo 3–4 líneas salvo casos justificados.
- [ ] Si pregunta por "lo incorrecto" o "lo que NO se cumple", la palabra clave está **en negrita**.
- [ ] Si es selección múltiple, el enunciado indica **cuántas opciones** marcar.
- [ ] Si requiere referencia visual, el campo está completo y describe todo lo necesario en texto (sin asumir que la imagen estará disponible).
- [ ] Opciones de longitud comparable y etiquetadas consistentemente (a, b, c... o 1, 2, 3...).
- [ ] **Una sola respuesta correcta** (o exactamente el conjunto indicado en el enunciado).
- [ ] **Respuesta correcta** declarada explícitamente.
- [ ] **Explicación** presente, de 2–5 oraciones, justifica la correcta y aclara los distractores no obvios.
- [ ] Cada distractor es plausible (ver `references/distractores.md`); ninguno es absurdo ni filtra la respuesta por longitud o redacción.
- [ ] La explicación no introduce datos que no estaban en el material original.

---

## V/F específicamente

- [ ] La afirmación es inequívocamente verdadera o falsa, no interpretable.
- [ ] Cuando es falsa, el error es enseñable (el estudiante aprende algo real al ver la corrección).
- [ ] La afirmación no es trivial: no debería poder responderse por sentido común sin haber estudiado.
- [ ] No abusar: como mucho 25–30% del banco en V/F.

---

## Relacionar específicamente

- [ ] El número de ítems coincide con el número de conceptos, o se indica si sobran conceptos.
- [ ] Ningún ítem podría asociarse legítimamente con dos conceptos distintos.
- [ ] La respuesta correcta muestra todos los pares explícitamente.

---

## Material visual / código

- [ ] Código o salida dentro de un bloque ``` con el lenguaje indicado (php, bash, text, etc.).
- [ ] El código no tiene errores tipográficos involuntarios (salvo que la pregunta sea sobre detectarlos).
- [ ] La descripción textual del diagrama contiene **toda** la información necesaria para responder sin ver la imagen.

---

## Pasada final

Releé el banco completo como si fueras un estudiante que estudió. ¿Las preguntas reflejan los conceptos importantes del material o son trivia accesoria? Si las respuestas a las preguntas se pueden adivinar sin haber leído el material, hay que retocar.
