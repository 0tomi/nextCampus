---
name: orquestar-planes
description: Orquestar planes técnicos por fases con sub-agentes especializados. Usar cuando hay un plan con múltiples fases o dominios y se necesita delegar, supervisar y auditar la ejecución. El orquestador delega tareas, valida cada entregable y al final del plan audita el conjunto contra el objetivo original. Activadores típicos - "orquestar agentes", "plan de fases", "delegación técnica", "sub-agentes", "memoria de plan", o cualquier descomposición de trabajo en fases coordinadas.
---

# Orquestación de Planes con Sub-Agentes

> Referencias (cargar cuando aplique):
> - `references/engram_ops.md` — API de Engram y persistencia del plan
> - `references/protocolo_delegacion.md` — qué incluir en cada delegación
> - `references/supervision.md` — criticidad, validación, re-delegación, auditoría final
> - `references/auxiliares.md` — sdd-explore y sdd-archive

---

## Las dos responsabilidades

El orquestador **delega y vigila**. Distribuye tareas, sí, pero también verifica que cada fase quedó bien hecha y que el plan completo siga siendo coherente con su objetivo. La vigilancia es activa: no alcanza con que cada fase pase su validación individual; el conjunto debe seguir teniendo sentido al final.

---

## Cuándo activar

- Plan explícito con fases definidas.
- Trabajo técnico que cruza dominios o capas.
- Riesgo real de desalineación si nadie coordina.

No activar para brainstorming, tareas de una sola capa, o cambios menores que no necesitan delegación.

---

## Flujo

1. **Indexar el plan en Engram** antes de delegar nada. Una observación por fase, una para meta, una para restricciones globales, una para el estado del plan. Cada fase se clasifica como **crítica** o **estándar** (criterios en `supervision.md`).

2. **Delegar una fase a la vez**. La delegación lleva: contexto suficiente para ejecutar, IDs reales de Engram para que el sub-agente consulte la fuente completa, skills aplicables que conozcas del entorno, y la criticidad declarada. Plantilla en `protocolo_delegacion.md`.

3. **Validar el entregable** según criticidad: las críticas se validan antes de delegar la siguiente; las estándar pueden agruparse de a 2. Detalle en `supervision.md`.

4. **Registrar el cierre en Engram**: estado de fase + estado global, secuencialmente (Engram no acepta escrituras paralelas — ver `engram_ops.md`).

5. **Auditoría final** cuando todas las fases cierran: cobertura del objetivo, consistencia entre fases, desvíos, deuda. Si hay desvíos bloqueantes, el plan no se cierra. Detalle en `supervision.md`.

---

## Engram, en una línea

Engram persiste el plan y su estado para sobrevivir compactaciones y nuevas sesiones. Se indexa al inicio, se actualiza en cada cierre, se consulta al recuperar contexto. **Las escrituras son secuenciales** (SQLite). Los detalles de API, plantillas y recuperación viven en `references/engram_ops.md`.

---

## Sub-agente con acceso a Engram

Pasarle los IDs reales de la fase y de las restricciones globales (no placeholders), e instruirle que los consulte al inicio de su tarea. El mensaje de delegación puede ser un extracto; la observación en Engram es la fuente completa. Si el sub-agente no tiene acceso a Engram, el contexto va inline en la delegación.

Si encuentra contradicciones entre lo que dice Engram y lo que decís en el mensaje, debe reportarlas, no resolverlas por su cuenta.

---

## Cuándo ofrecer skills y sub-agentes auxiliares

- **Skills**: cuando conocés una skill del entorno que aplica a la fase, mencionala con razón concreta. No inventes skills.
- **DESIGN.md**: si la fase es de frontend y existe `DESIGN.md` en el repo, incluilo como referencia obligatoria de estilo visual.
- **sdd-explore / sdd-archive**: ofrecelos cuando la fase pinta candidata a necesitar exploración del repo o documentación de una decisión arquitectónica. Detalle en `auxiliares.md`.

El orquestador sugiere, no obliga. Si el sub-agente no necesita la herramienta, no debe usarla solo porque está listada.

---

## Recuperación tras compactación

Llamar `mem_context` al inicio, después `mem_search "[PLAN:{nombre}]"` para encontrar el estado global, leer la observación, identificar la próxima fase no completada, continuar. **Nunca asumir** que una fase está completa porque "se recuerda" haberla delegado: leer el estado real desde Engram.

---

## Re-delegación tras rechazo

Si rechazás un entregable, registrá el rechazo en Engram primero, después re-delegá pasando: motivo del rechazo, qué corregir específicamente, qué del intento previo sí está bien (si aplica). Mantenés el resto de la delegación igual. Tres rechazos sin éxito → marcar fase como bloqueada y escalar.

---

## Regla central

El trabajo del orquestador termina cuando el plan completo está auditado y consistente, no cuando el último sub-agente entrega. Engram es la fuente de verdad del estado. Las skills y los auxiliares son herramientas que ofrecés; el sub-agente decide.
