---
name: orquestar-planes
description: Orquestar planes técnicos por fases con sub-agentes especializados. Usar cuando hay un plan con múltiples fases o dominios y se necesita delegar, supervisar y auditar la ejecución. El orquestador delega tareas, valida cada entregable y al final del plan audita el conjunto contra el objetivo original. Activadores típicos - "orquestar agentes", "plan de fases", "delegación técnica", "sub-agentes", o cualquier descomposición de trabajo en fases coordinadas.
---

# Orquestación de Planes con Sub-Agentes

> Referencias (cargar cuando aplique):
> - `references/archivo_plan.md` — formato YAML del plan, claves indexadas y operaciones sobre el archivo
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

1. **Crear el archivo de plan** antes de delegar nada. Un único YAML indexado con meta, restricciones globales, fases (cada una con su clave estable tipo `F1`, `F2`, …) y estado global. Cada fase se clasifica como **crítica** o **estándar** (criterios en `supervision.md`). Ubicación y estructura en `archivo_plan.md`.

2. **Delegar una fase a la vez**. La delegación lleva: contexto suficiente para ejecutar, ruta del archivo de plan + claves que el sub-agente debe consultar (ej: `F2`, `R1`, `R3`), skills aplicables que conozcas del entorno, y la criticidad declarada. Plantilla en `protocolo_delegacion.md`.

3. **Validar el entregable** según criticidad: las críticas se validan antes de delegar la siguiente; las estándar pueden agruparse de a 2. Detalle en `supervision.md`.

4. **Registrar el cierre en el archivo**: actualizar el `estado` de la fase a `completada` (o `parcial`/`rechazada` según corresponda) y rellenar su bloque `cierre`. Si dos sub-agentes terminan a la vez, el orquestador actualiza el archivo uno cierre por turno — ver `archivo_plan.md`.

5. **Auditoría final** cuando todas las fases cierran: cobertura del objetivo, consistencia entre fases, desvíos, deuda. Si hay desvíos bloqueantes, el plan no se cierra. Detalle en `supervision.md`.

---

## El archivo de plan, en una línea

Un YAML en `docs/plans/{nombre}.yaml` (si esa carpeta existe) o en la raíz como `plan-{nombre}.yaml`. Indexa el plan completo bajo claves estables y se actualiza a medida que las fases cierran. Sobrevive compactaciones porque vive en el repo. El orquestador es el único que escribe; los sub-agentes solo leen. Los detalles de estructura, claves y operaciones viven en `references/archivo_plan.md`.

---

## Sub-agente y archivo de plan

Pasarle la ruta exacta al archivo y las claves concretas que debe consultar (`F2`, `R1`, `R3` — no placeholders), e instruirle que lea esas entradas al inicio de su tarea. El mensaje de delegación puede ser un extracto; el archivo es la fuente completa. Si el sub-agente no puede leer archivos del repo, el contexto va inline en la delegación.

Si encuentra contradicciones entre lo que dice el archivo y lo que decís en el mensaje, debe reportarlas, no resolverlas por su cuenta.

---

## Cuándo ofrecer skills y sub-agentes auxiliares

- **Skills**: cuando conocés una skill del entorno que aplica a la fase, mencionala con razón concreta. No inventes skills.
- **DESIGN.md**: si la fase es de frontend y existe `DESIGN.md` en el repo, incluilo como referencia obligatoria de estilo visual.
- **sdd-explore / sdd-archive**: ofrecelos cuando la fase pinta candidata a necesitar exploración del repo o documentación de una decisión arquitectónica. Detalle en `auxiliares.md`.

El orquestador sugiere, no obliga. Si el sub-agente no necesita la herramienta, no debe usarla solo porque está listada.

---

## Recuperación tras compactación

Releer el archivo de plan, identificar la próxima fase no completada, continuar. **Nunca asumir** que una fase está completa porque "se recuerda" haberla delegado: leer el estado real desde el archivo. Si una fase quedó marcada `en_curso` sin bloque de `cierre`, probablemente es zombie — ver detección y resolución en `supervision.md`.

---

## Re-delegación tras rechazo

Si rechazás un entregable, registrá el rechazo en el archivo de plan primero (dejá traza en `historial` y movés el estado de la fase a `rechazada`), después re-delegá pasando: motivo del rechazo, qué corregir específicamente, qué del intento previo sí está bien (si aplica). Mantenés el resto de la delegación igual. Tres rechazos sin éxito → marcar fase como `bloqueada` y escalar.

---

## Regla central

El trabajo del orquestador termina cuando el plan completo está auditado y consistente, no cuando el último sub-agente entrega. El archivo de plan es la fuente de verdad del estado. Las skills y los auxiliares son herramientas que ofrecés; el sub-agente decide.
