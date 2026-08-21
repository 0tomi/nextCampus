---
name: orquestar-planes
description: Orquestar planes técnicos por fases con sub-agentes especializados, registrando el avance en commits de Git. Usar cuando hay un plan con múltiples fases o dominios y se necesita delegar, supervisar y auditar la ejecución. El orquestador delega tareas, valida cada entregable contra el plan y el diff real, y commitea cada fase validada. Activadores típicos - "orquestar agentes", "ejecutar este plan", "plan de fases", "delegación técnica", "sub-agentes", o cualquier descomposición de trabajo en fases coordinadas.
---

# Orquestación de Planes con Sub-Agentes

> Referencias (cargar cuando aplique):
> - `references/registro_git.md` — rama del plan, formato de commits, staging por alcance, recuperación
> - `references/protocolo_delegacion.md` — qué incluir en cada delegación y formato de reporte
> - `references/supervision.md` — criticidad, validación, desviaciones, deuda, re-delegación, auditoría final
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

## La entrada: el archivo de plan

El plan llega como **archivo que el usuario le pasa al orquestador** (generado por un planificador o escrito a mano). Ese archivo es del usuario: puede traer comentarios, ajustes o instrucciones agregadas antes de arrancar — leerlos como parte del plan. El orquestador **lo lee, no lo edita ni lo mantiene**. El estado de avance no vive ahí: vive en el historial de Git de la rama del plan.

Si el usuario invoca la orquestación sin archivo de plan, pedírselo antes de delegar nada. Sin fases definidas no hay nada que orquestar.

---

## Flujo

1. **Leer el plan completo** — fases, restricciones, comentarios del usuario. Clasificar cada fase como **crítica** o **estándar** (criterios en `supervision.md`) si el plan no lo trae. Mapear qué skills del entorno aplican a cada fase (ver abajo).

2. **Crear la rama del plan**: `plan/{nombre}` desde la rama actual. Todo el plan se ejecuta dentro de esa rama; el merge final lo decide el humano. Detalle en `registro_git.md`.

3. **Delegar una fase a la vez**. La delegación es autocontenida: contenido operativo de la fase, restricciones que aplican, criterio de cierre, criticidad, alcance de archivos, skills a aplicar con su ruta, y la prohibición de commitear. Plantilla en `protocolo_delegacion.md`.

4. **Validar el entregable** contra tres cosas: el criterio de cierre, el reporte del sub-agente, y **el diff real** (`git status` + `git diff` — el reporte se contrasta, no se cree a ciegas). Las desviaciones del plan se evalúan: con justificación sólida se incorporan; sin justificación, se rechaza. La deuda evitable no pasa: se re-delega para resolverla en la fase. Detalle en `supervision.md`.

5. **Commitear el cierre de la fase**: el orquestador — único que commitea, siempre tras aprobar — stagea los archivos del alcance y crea un commit cuyo mensaje registra supuestos, apego al plan, deuda, intentos y notas para las fases siguientes. Ese commit es el sello de validación y la traza de avance. Formato en `registro_git.md`.

6. **Auditoría final** cuando todas las fases cierran: cobertura del objetivo, consistencia entre fases, desvíos, deuda residual. Si la auditoría corrige código (cleanup), eso genera su propio commit; si no corrigió nada, el resultado se reporta al usuario y no se commitea. Detalle en `supervision.md`.

---

## Skills en la delegación: usar o justificar

Que los sub-agentes apliquen las skills correctas es responsabilidad del orquestador, no una esperanza. Tres reglas:

1. **Mapear antes de delegar.** Si el plan ya sugiere skills por fase, transcribirlas. Si no, relevar las disponibles en el entorno (lista tipo `<available_skills>`, o `.claude/skills/`, `.agents/skills/`, etc.) una sola vez al inicio, y evaluar fit por fase.
2. **Pasar nombre + ruta al SKILL.md + instrucción imperativa**: el sub-agente debe leer la skill antes de empezar y aplicarla. Si decide no seguirla en algún punto, lo justifica en su reporte. Sin ruta, la skill no se carga; sin instrucción, se ignora.
3. **Verificar en la validación.** El reporte del sub-agente incluye el campo `Skills aplicadas`; el orquestador chequea que las aplicó o que la justificación para no seguirlas es sólida. Justificación floja → cuenta como desviación.

Si ninguna skill aplica a la fase, omitir la sección entera: una skill irrelevante inunda el contexto del sub-agente sin aportar. Nunca inventar skills que no se verificaron en el entorno. Mecánica y bloques en `protocolo_delegacion.md`.

---

## Recuperación tras compactación

Localizar la rama `plan/{nombre}`, leer el archivo de plan (la ruta está en el trailer `Plan-File` de cualquier commit del plan), y comparar: fases del plan vs commits de cierre en el historial. La próxima fase sin commit es la próxima a delegar. **Nunca asumir** que una fase está completa porque "se recuerda" haberla delegado: si no tiene commit de cierre, no está cerrada. Worktree sucio sin commit correspondiente = fase zombie — resolución en `supervision.md`.

---

## Regla central

El trabajo del orquestador termina cuando el plan completo está auditado, consistente, y sin deuda flotando sin razón. No cuando el último sub-agente entrega. El historial de Git de la rama es la fuente de verdad del avance; el archivo de plan es la fuente de verdad de lo que había que hacer. Nada llega al historial sin validación: commit aprobado o no hay commit.

---

## No sobredelegacion

Ser orquestador no te libera del trabajo completamente. Existen acciones sencillas que como orquestador, delegarlas carece de sentido. Algunas tareas sencillas que no valen la pena delegar son:
1. Ejecución de pocos comandos (menos de 5 comandos): Si ese necesario ejecutar algun comando ya sea por verificacion, modificacion o cualquier motivo necesario, siempre y cuando sea simplemente ejecutar el o los comandos para observar la salida de los mismos, el orquestador puede hacerlo sin problemas.
2. Modificaciones minimas de lineas de codigo: Si por algun motivo es necesario cambiar pocas lineas de codigo, o cambiar no mas de 2 archivos, si el orquestador tiene contexto suficiente para realizar el cambio por si mismo, puede y deberia hcerlo el mismo. Si el cambio es minimo, pero el orquestador no cuenta con contexto suficiente, puede delegar la tarea.
--
