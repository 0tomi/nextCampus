# Engram para Orquestación

Engram = memoria persistente sobre SQLite + FTS5. Las memorias son **observaciones** con título, tipo y contenido libre, recuperables por ID o por búsqueda full-text. No es un key-value store.

---

## Regla crítica: escrituras secuenciales

**SQLite no soporta escrituras concurrentes.** Cada `mem_save` debe terminar y devolver su ID antes de iniciar el siguiente. Esto incluye:

- Indexación inicial del plan (varios `mem_save` consecutivos van uno por turno).
- Cierres de fase (estado de fase + estado global = dos escrituras seriadas).
- Auditoría final (auditoría + cierre + session_summary + session_end, en ese orden, esperando cada respuesta).

Las **lecturas** (`mem_get_observation`, `mem_search`, `mem_context`, `mem_timeline`) sí pueden hacerse en paralelo entre sí, pero no en paralelo con escrituras.

Si dos sub-agentes terminan a la vez, el orquestador procesa los cierres uno tras otro, no simultáneamente.

---

## Tools disponibles

| Tool | Uso |
|---|---|
| `mem_save` | Persistir cualquier observación |
| `mem_search` | Buscar por contenido |
| `mem_get_observation` | Leer una observación por ID |
| `mem_context` | Recuperar contexto de sesiones anteriores (al iniciar) |
| `mem_timeline` | Ver qué pasó alrededor de una observación |
| `mem_session_start` / `mem_session_end` | Marcar bordes de sesión |
| `mem_session_summary` | Resumen al cerrar (formato Goal/Discoveries/Accomplished/Files) |
| `mem_save_prompt` | Guardar el plan original si es muy largo |
| `mem_stats` | Diagnóstico |

---

## Convención de títulos

Prefijar todo con `[PLAN:{nombre}]` para poder filtrar el plan completo con una sola búsqueda. Títulos típicos:

```
[PLAN:{nombre}] Meta
[PLAN:{nombre}] Restricciones
[PLAN:{nombre}] Fase {N}: {nombre}
[PLAN:{nombre}] Estado global
[PLAN:{nombre}] Estado Fase {N}        ← se crea al cerrar la fase
[PLAN:{nombre}] Auditoría final
[PLAN:{nombre}] Cierre
```

Los tipos sugeridos: `"plan"` para meta y estado global, `"architecture"` para restricciones, `"decision"` para fases, `"bugfix"` para cierres y observaciones de fase. La elección no es crítica; lo importante es ser consistente dentro de un mismo plan.

---

## Qué guardar en cada observación

El orquestador decide qué información necesita persistir para reconstruir el plan ante una pérdida de contexto. Lo mínimo recomendado:

- **Meta**: objetivo del plan, dominio, lista de fases.
- **Restricciones**: convenciones, contratos no negociables, separación de capas.
- **Fase**: objetivo, archivos permitidos/prohibidos, criticidad, criterio de cierre. Si subdividís una fase multi-dominio, hacelo y referenciá el padre en el contenido.
- **Estado global**: mapa `fase → estado`. Estados posibles: `pendiente / en_curso / completada / parcial / bloqueada / rechazada`.
- **Estado de fase (cierre)**: qué se hizo, archivos tocados, supuestos, deuda, notas para el siguiente agente.
- **Cierre / Auditoría**: lo que el orquestador necesita para cerrar el plan y para que un futuro agente entienda qué pasó.

No hay plantilla rígida: el contenido se ajusta a lo que la fase realmente requiere.

---

## Recuperación tras compactación o nueva sesión

```
mem_context                              → contexto de sesiones anteriores
mem_search "[PLAN:{nombre}] Estado"      → encontrar el estado global
mem_get_observation id={id}              → leer el estado real
```

Identificar fases en estado `en_curso` sin observación de cierre correspondiente: son zombies (probablemente un sub-agente nunca devolvió). Resolver caso por caso: si hay entregable parcial recuperable, validarlo; si no, marcar como `parcial` y re-delegar.

Nunca asumir que una fase está completa porque "se recuerda" haberla delegado. Leer el estado.

---

## Sub-agentes y Engram

Si el sub-agente tiene acceso a Engram, pasarle IDs específicos de la fase y de restricciones globales para `mem_get_observation`. Puede consultar libremente lo que necesite del plan; si encuentra inconsistencias entre la delegación y Engram, debe reportarlas en lugar de resolverlas solo.

El sub-agente no escribe estados de fase ni del plan global — eso lo hace el orquestador. Si necesita persistir una decisión técnica propia (un patrón nuevo, un workaround) puede hacerlo, mencionándolo en su reporte para que quede trazado.
