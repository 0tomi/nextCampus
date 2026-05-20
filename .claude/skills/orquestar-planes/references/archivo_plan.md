# Archivo de Plan

El plan vive como un único archivo YAML en el repo. Es indexado: cada fase, cada restricción y cada bloque importante tienen una **clave estable** que el orquestador usa para apuntar al sub-agente a la parte que le corresponde, sin tener que pegar el contenido inline.

---

## Ubicación

1. Si existe `docs/plans/` en el repo → guardar como `docs/plans/{nombre}.yaml`.
2. Si no existe esa carpeta → guardar en la raíz del repo como `plan-{nombre}.yaml`.

El nombre va en `kebab-case` y describe el plan (`refactor-auth`, `migracion-postgres-17`, `dashboard-metricas`). Si ya existe un archivo con ese nombre, el orquestador decide: **reanudar** el plan existente (releer y continuar desde la próxima fase pendiente) o **renombrar** el nuevo. No sobrescribir sin confirmación.

---

## Regla crítica: escrituras secuenciales

El orquestador es el **único escritor** del archivo. Los sub-agentes solo lo leen. Aun así, dos cierres no se procesan en paralelo: el orquestador actualiza una fase, guarda el archivo, y recién después atiende el cierre siguiente. Esto evita perder cambios por edición concurrente.

Lectura concurrente está bien: varios sub-agentes pueden leer el archivo a la vez sin riesgo.

---

## Claves indexadas

Cada entrada importante tiene una clave estable que no cambia durante la vida del plan:

| Prefijo | Para | Ejemplo |
|---|---|---|
| `F{N}` | Fase número N | `F1`, `F2`, `F3` |
| `R{N}` | Restricción global N | `R1`, `R2` |
| `meta` | Bloque de metadatos del plan | `meta` |
| `estado_global` | Mapa de estados por fase | `estado_global` |
| `auditoria` | Bloque de auditoría final | `auditoria` |
| `historial` | Lista cronológica de eventos | `historial` |

Las claves son lo que el orquestador le pasa al sub-agente: *"leé `F2` y `R1`, `R3` del archivo"*. Estables = no se reordenan, no se renumeran. Si una fase se divide, las nuevas son `F2a`, `F2b`; el original `F2` queda marcado como dividido en `historial`.

---

## Estructura del archivo

```yaml
plan: refactor-auth
meta:
  objetivo: Migrar de JWT en localStorage a sesiones server-side con cookie HttpOnly.
  dominio: backend + frontend
  creado: 2026-05-20T14:00
  fases_totales: 5

restricciones:
  R1:
    titulo: Compatibilidad con clientes móviles
    contenido: |
      Los endpoints actuales mantienen su contrato. La app móvil sigue
      autenticando por JWT hasta que se libere su versión nueva.
  R2:
    titulo: Migración sin downtime
    contenido: |
      Las dos estrategias (JWT y sesión) conviven durante la transición.
      Toggle por feature flag.
  R3:
    titulo: Separación de capas
    contenido: |
      La lógica de sesión vive en src/auth/sessions/. El frontend no
      manipula tokens directamente, solo consume /me.

fases:
  F1:
    nombre: Esquema de sesiones en DB
    dominio: datos
    criticidad: critica
    objetivo: Definir tabla sessions con TTL e índices necesarios.
    archivos_alcance:
      permitidos:
        - db/migrations/
        - src/auth/sessions/schema.ts
      prohibidos:
        - src/auth/jwt/
    criterio_cierre: Migración aplicada en local y schema documentado en R3.
    dependencias: []
    estado: completada
    cierre:
      archivos_tocados:
        - db/migrations/2026_05_20_create_sessions.sql
        - src/auth/sessions/schema.ts
      supuestos:
        - TTL por defecto de 7 días, configurable por env.
      deuda: []
      notas: Índice compuesto en (user_id, expires_at) para limpieza eficiente.
      timestamp: 2026-05-20T15:30

  F2:
    nombre: Store de sesiones
    dominio: backend
    criticidad: critica
    objetivo: Implementar create/get/revoke con la tabla de F1.
    archivos_alcance:
      permitidos:
        - src/auth/sessions/
      prohibidos:
        - src/auth/jwt/
    criterio_cierre: Tests unitarios verdes para los tres métodos.
    dependencias: [F1]
    estado: en_curso

  F3:
    nombre: Endpoint /login con feature flag
    dominio: backend
    criticidad: critica
    objetivo: Login devuelve sesión o JWT según flag.
    archivos_alcance:
      permitidos:
        - src/auth/login.ts
        - src/config/flags.ts
    criterio_cierre: Tests de integración cubren ambos caminos.
    dependencias: [F2]
    estado: pendiente

  # ... F4, F5

estado_global:
  estado: en_curso
  fases:
    F1: completada
    F2: en_curso
    F3: pendiente
    F4: pendiente
    F5: pendiente

auditoria: null  # se rellena al cerrar el plan

historial:
  - timestamp: 2026-05-20T14:00
    evento: plan_creado
    detalle: Plan inicializado con 5 fases.
  - timestamp: 2026-05-20T14:30
    evento: fase_iniciada
    fase: F1
  - timestamp: 2026-05-20T15:30
    evento: fase_completada
    fase: F1
    validacion: aprobada
  - timestamp: 2026-05-20T15:35
    evento: fase_iniciada
    fase: F2
```

---

## Estados posibles

Cada fase tiene exactamente uno de estos valores en `estado` y reflejado en `estado_global.fases`:

| Estado | Significado |
|---|---|
| `pendiente` | Aún no delegada. |
| `en_curso` | Delegada, sin cierre devuelto. |
| `completada` | Validada y aprobada. |
| `parcial` | Validada con observaciones — avanza pero deja deuda. |
| `rechazada` | El entregable no pasa validación; se va a re-delegar. |
| `bloqueada` | Tres rechazos sin éxito, o dependencia no cumplible. Requiere escalamiento. |

`estado_global.estado` toma estos valores: `en_curso`, `completado`, `bloqueado`, `cancelado`.

---

## Qué guardar en cada bloque

No hay esquema rígido — el contenido se ajusta a lo que la fase requiere. Pero como guía:

- **meta**: objetivo del plan, dominio, fecha de creación, número de fases. Si el plan original es muy largo, anexarlo aparte como `docs/plans/{nombre}.prompt.md` y referenciarlo desde acá.
- **restricciones (`R{N}`)**: convenciones, contratos no negociables, separación de capas, todo lo que el orquestador no quiere repetir en cada delegación.
- **fases (`F{N}`)**: nombre, dominio, criticidad, objetivo, archivos permitidos/prohibidos, criterio de cierre, dependencias, estado. Si subdividís una fase multi-dominio, hacelo (`F2a`, `F2b`) y referenciá el padre en una nota.
- **cierre de fase**: archivos tocados, supuestos usados, deuda dejada, notas para el siguiente agente, timestamp. Se agrega al pasar a `completada` o `parcial`.
- **estado_global**: estado del plan + mapa fase → estado. Es la vista rápida que el orquestador consulta primero al reanudar.
- **auditoria**: cobertura, consistencia, desvíos, deuda final. Se rellena al cerrar el plan.
- **historial**: lista cronológica de eventos. Mantiene la traza incluso si una fase cambia varias veces de estado.

---

## Operaciones típicas

**Crear el plan (al inicio)**

Escribir el archivo completo con `meta`, `restricciones`, todas las fases en `pendiente`, `estado_global` con `en_curso` y todas las fases pendientes, `auditoria: null`, y un primer evento `plan_creado` en `historial`.

**Iniciar una fase (al delegar)**

Cambiar `F{N}.estado` a `en_curso`, reflejar en `estado_global.fases`, agregar evento `fase_iniciada` al `historial`.

**Cerrar una fase (tras validar)**

Cambiar `F{N}.estado` a `completada` (o `parcial`), agregar el bloque `cierre` con archivos, supuestos, deuda, notas, timestamp. Reflejar en `estado_global.fases`. Agregar evento `fase_completada` al `historial`.

**Rechazar una fase**

Cambiar `F{N}.estado` a `rechazada`, agregar evento `fase_rechazada` al `historial` con motivo concreto. Cuando se re-delegue, volverá a `en_curso`.

**Cerrar el plan (auditoría final)**

Rellenar el bloque `auditoria`. Cambiar `estado_global.estado` a `completado` (o `bloqueado` si la auditoría detectó algo no resoluble). Evento `plan_cerrado` en `historial`.

---

## Recuperación tras compactación o nueva sesión

```
1. Localizar el archivo del plan (docs/plans/{nombre}.yaml o raíz).
2. Leer estado_global → ver qué fase quedó en curso o pendiente.
3. Para fases en_curso: verificar si tienen bloque cierre.
   - Sin cierre = zombie (probablemente el sub-agente nunca devolvió).
   - Resolver caso por caso (ver supervision.md).
4. Continuar desde la próxima fase pendiente.
```

Nunca asumir que una fase está completa porque "se recuerda" haberla delegado. Leer el estado del archivo.

---

## Sub-agentes y el archivo

Al delegar, pasarle al sub-agente:

- La ruta exacta al archivo (`docs/plans/refactor-auth.yaml`).
- Las claves que tiene que leer (ej: `F2`, `R1`, `R3`).
- Instrucción explícita de leer esas entradas al inicio.

Bloque sugerido (formato en `protocolo_delegacion.md`):

```
Antes de empezar, leé estas entradas del archivo del plan
docs/plans/refactor-auth.yaml:
  - F2 (esta fase)
  - R1, R3 (restricciones globales que aplican)

Este mensaje es un extracto. El archivo es la fuente completa.
Si lo que leés en el archivo contradice este mensaje, reportá la
discrepancia antes de seguir. Podés consultar otras entradas si te
ayudan; no edites el archivo, eso lo hago yo al cerrar tu fase.
```

El sub-agente puede consultar libremente cualquier entrada del archivo que le sirva. Si encuentra inconsistencias entre lo que dice el archivo y la delegación, debe reportarlas. Si necesita persistir una decisión técnica propia (patrón nuevo, workaround), lo menciona en su reporte y el orquestador decide si la incorpora al archivo o si llama a `sdd-archive` para documentarla en el repo.

---

## Notas operativas

- **Formato YAML, no JSON**: legible por humanos, comentarios permitidos, multi-línea natural con `|`.
- **Versionar el archivo**: si el repo tiene git, commitear el archivo del plan permite ver la evolución del estado, no solo el final.
- **Tamaño**: si el archivo crece más allá de lo manejable (>1000 líneas), considerar dividir en `{nombre}.yaml` (estado vivo) + `{nombre}.historial.yaml` (eventos antiguos). Inusual en planes normales.
- **Sensibilidad**: el archivo queda en el repo. No volcar secretos, credenciales o datos productivos en él.
