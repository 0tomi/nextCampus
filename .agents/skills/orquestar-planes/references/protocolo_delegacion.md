# Protocolo de Delegación

Una delegación efectiva pasa al sub-agente lo necesario para ejecutar bien sin tener que adivinar nada esencial. Sobra el resto. La delegación es **autocontenida**: no hay archivo de estado que consultar — todo lo que la fase necesita viaja en el mensaje.

---

## Lo que sí debe llevar la delegación

1. **Sub-agente objetivo** — backend / frontend / datos / infra / qa.
2. **Qué hacer** — el contenido operativo completo de la fase, no solo el nombre. Tiene que poder ejecutarse leyendo solo este mensaje.
3. **Restricciones globales que aplican** — inline, con su contenido, no por referencia. Solo las que tocan a esta fase.
4. **Archivos en alcance** — qué puede tocar y qué está fuera de alcance, con razón breve cuando importe. El orquestador stagea y valida contra este alcance, así que tiene que ser preciso.
5. **Criterio de cierre** — condición verificable que marca la fase como terminada.
6. **Criticidad** — crítica o estándar. Le dice al sub-agente qué nivel de rigor se va a aplicar al revisarlo.
7. **Skills a aplicar** (si aplica) — nombre + **ruta al SKILL.md** + instrucción de leerla antes de empezar. Ver el bloque abajo. Si nada aplica, omitir la sección.
8. **Sub-agentes auxiliares disponibles** (si aplica) — sdd-explore / sdd-archive cuando la fase los puede aprovechar. Ver `auxiliares.md`.
9. **El contrato** — bloque fijo con las reglas de la relación: no commitear, apego al plan, desviaciones justificadas, deuda. Ver abajo.
10. **Si es re-delegación tras rechazo**: motivo del rechazo previo, qué corregir, qué del intento anterior sí está bien (ver `supervision.md`).
11. **Contexto del historial** (si sirve): las `Notas para fases siguientes` que dejaron los cierres anteriores relevantes, o la indicación de leerlas con `git log --grep="^Plan: {nombre}"`.

Lo que **no** hace falta agregar: prohibiciones obvias ("no rompas el repo") ni listas de cosas que el sub-agente claramente entiende solo.

---

## El contrato (bloque fijo de toda delegación)

```
Reglas de esta delegación:

- NO commitees, no stagees, no toques el índice de git. Trabajá sobre el
  worktree y entregá. El commit lo hago yo si tu entrega pasa validación.

- Apegate al plan: alcance, supuestos y criterio de cierre tal como están
  acá. Si necesitás desviarte — porque algo lo destrababa, porque el plan
  no cubría un caso — la desviación tiene que venir JUSTIFICADA en tu
  reporte: qué te desvió, por qué no había alternativa dentro del alcance.
  Una desviación sin justificación sólida se rechaza con todo el entregable.
  Una desviación oculta es peor: se descubre en el diff y degrada la
  confianza en todo tu reporte.

- No dejes deuda evitable: TODOs, tests pendientes o atajos que podés
  resolver dentro de esta fase, se resuelven en esta fase. Solo es
  aceptable deuda con razón estructural (depende de una fase posterior,
  excede el alcance definido) y declarada en el reporte.

- Si el contexto no te alcanza para ejecutar, decilo en el reporte en vez
  de inventar: eso es un problema de delegación, no tuyo.
```

---

## Bloque de skills: usar o justificar

Cuando hay skills que aplican a la fase, el bloque es imperativo y con rutas — un nombre suelto no se carga y no se usa:

```
Skills a aplicar en esta fase:

  - {nombre} ({ruta al SKILL.md})
    Por qué aplica: {razón concreta ligada a la tarea}

Antes de empezar, leé el SKILL.md de cada una y aplicalas durante la
tarea. Si en algún punto decidís no seguir lo que una skill indica,
anotalo en el campo "Skills aplicadas" de tu reporte con la razón.
No seguirla sin justificarlo cuenta como desviación del plan.
```

De dónde salen las skills:

- **El plan ya las trae por fase**: transcribirlas con su razón. El planificador ya evaluó fit; no segundo-adivinarlo salvo que la skill no exista en el entorno o el contexto real del repo la vuelva inaplicable.
- **El plan no las trae**: relevar una vez, antes de la primera delegación, lo disponible en el entorno (lista del cliente tipo `<available_skills>`, `.claude/skills/`, `.agents/skills/`, o donde el repo las tenga — nombres y descripciones alcanzan). Después, por fase, evaluar si alguna calza con el trabajo a delegar.

Si ninguna aplica de verdad, **omitir la sección entera**. No inventar skills no verificadas en el entorno; no sumar skills "por las dudas" — el sub-agente lee la lista como indicación legítima del orquestador, y un nombre sin valor es ruido que inunda su contexto.

Si la fase es de frontend y existe `DESIGN.md` en el repo, tratarlo como una skill más:

```
Antes de implementar componentes, leé DESIGN.md. Mantené la paleta,
tipografía y patrones definidos ahí. Si necesitás algo que no cubre,
reportalo en lugar de improvisar.
```

---

## Formato de respuesta esperado del sub-agente

```
Cambios realizados: ...
Archivos tocados: ...
Supuestos usados: ...
Apego al plan: completo | desviaciones — qué, por qué, por qué no había
               alternativa dentro del alcance
Skills aplicadas: {skill}: cómo se aplicó | no seguí {skill} en X porque...
Deuda dejada: ninguna | ítems con su razón estructural (marcar bloqueantes)
Bloqueos / inconsistencias: ninguno | ...
Suficiencia de contexto: sí | no — qué faltó
Notas para el siguiente agente: ...
```

`Archivos tocados` no es decorativo: el orquestador lo contrasta contra `git status` en la validación. Un archivo modificado que el reporte no menciona es una desviación oculta.

Si el sub-agente reporta "contexto insuficiente", el problema fue de delegación, no de ejecución. El orquestador re-delega ampliando el contexto, no penaliza al sub-agente.

---

## Dominios

- **Backend**: lógica de servidor, contratos de API, validaciones, jobs.
- **Frontend**: UI, estado cliente, formularios. Si existe `DESIGN.md`, manda.
- **Datos**: migraciones, esquemas, índices, seeds.
- **Infra**: deploy, pipelines, configuración, observabilidad.
- **QA**: tests unitarios, integración, e2e, cobertura.

Una fase mezcla dominios solo cuando hay buena razón. Por defecto, una fase = un dominio. Si una fase del plan original mezcla, dividirla antes de delegar (y acordarlo con el usuario si cambia el plan de forma visible).

---

## Re-delegación

El procedimiento completo (registro del motivo, diagnóstico de responsable, qué pasar en el nuevo prompt, límite de tres intentos) vive en `supervision.md` — un solo dueño para no divergir.
