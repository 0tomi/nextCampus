# Protocolo de Delegación

Una delegación efectiva pasa al sub-agente lo necesario para ejecutar bien sin tener que adivinar nada esencial. Sobra el resto.

---

## Lo que sí debe llevar la delegación

1. **Sub-agente objetivo** — backend / frontend / datos / infra / qa.
2. **Qué hacer** — el contenido operativo de la fase, no solo el nombre. Tiene que poder ejecutarse leyendo solo este mensaje (con los IDs Engram como respaldo).
3. **Archivos en alcance** — qué puede tocar y qué está fuera de alcance, con razón breve cuando importe.
4. **Criterio de cierre** — condición verificable que marca la fase como terminada.
5. **Criticidad** — crítica o estándar. Le dice al sub-agente qué nivel de rigor se va a aplicar al revisarlo.
6. **IDs reales de Engram** (si aplica) — fase y restricciones globales, sustituidos por valores concretos antes de enviar. No mandar `{ID_fase_N}` literal: el sub-agente no lo puede consultar.
7. **Skills sugeridas** (si aplica) — las del entorno que aplican a la tarea, con razón concreta. Si no hay, omitir la sección.
8. **Sub-agentes auxiliares disponibles** (si aplica) — sdd-explore / sdd-archive cuando la fase los puede aprovechar. Ver `auxiliares.md`.
9. **Si es re-delegación tras rechazo**: motivo del rechazo previo, qué corregir, qué del intento anterior sí está bien.

Lo que **no** hace falta agregar: prohibiciones obvias ("no rompas el repo"), restricciones administrativas que limitan al sub-agente sin necesidad ("no consultes otras observaciones"), ni listas de cosas que el sub-agente claramente entiende solo.

---

## Bloque sugerido para acceso a Engram

```
Antes de empezar, traé el contexto completo de esta fase desde Engram:
  mem_get_observation id=<ID_REAL_DE_LA_FASE>
  mem_get_observation id=<ID_REAL_DE_RESTRICCIONES>

Este mensaje es un extracto. La observación en Engram es la fuente completa.
Si lo que ves en Engram contradice este mensaje, reportá la discrepancia
antes de seguir. Podés consultar otras observaciones del plan si te ayuda;
no escribas estados de fase ni del plan global, eso lo hago yo.
```

Ejemplo de bloque preparado correctamente: `id=4827` y `id=4823`, no `id={ID_fase_N}`.

---

## Bloque sugerido para skills

```
Skills aplicables a esta fase:
  - {nombre}: {por qué aplica acá}
  - {nombre}: {por qué aplica acá}
```

Omitir si no hay skills conocidas. No inventar.

Si la fase es de frontend y existe `DESIGN.md` en el repo:

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
Bloqueos / inconsistencias: ninguno | ...
Suficiencia de contexto: sí | no — qué faltó
Notas para el siguiente agente: ...
```

Si el sub-agente reporta "contexto insuficiente", el problema fue de delegación, no de ejecución. El orquestador re-delega ampliando el contexto, no penaliza al sub-agente.

---

## Dominios

- **Backend**: lógica de servidor, contratos de API, validaciones, jobs.
- **Frontend**: UI, estado cliente, formularios. Si existe `DESIGN.md`, manda.
- **Datos**: migraciones, esquemas, índices, seeds.
- **Infra**: deploy, pipelines, configuración, observabilidad.
- **QA**: tests unitarios, integración, e2e, cobertura.

Una fase mezcla dominios solo cuando hay buena razón. Por defecto, una fase = un dominio. Si una fase del plan original mezcla, dividila antes de delegar.

---

## Re-delegación

Tras un rechazo:

1. Registrar el rechazo en Engram con motivo concreto.
2. Decidir si la falla fue de ejecución o de delegación insuficiente.
3. Re-delegar con: motivo del rechazo, qué corregir, qué del intento previo está bien (si aplica).

Tres rechazos sin éxito → marcar fase como `bloqueada` y escalar al humano con resumen de los intentos.
