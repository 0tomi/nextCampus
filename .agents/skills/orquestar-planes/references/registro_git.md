# Registro del Plan en Git

El avance del plan se registra en el historial de Git. No hay archivo de estado: el archivo de plan (input del usuario) dice qué hacer; los commits dicen qué se hizo, cuándo, y bajo qué condiciones. Cada commit de cierre de fase es a la vez el código validado y su metadata — atómicos, imposibles de desincronizar.

---

## La rama del plan

Al arrancar, crear una rama dedicada desde la rama actual:

```
git checkout -b plan/{nombre}
```

`{nombre}` en kebab-case, descriptivo (`plan/refactor-auth`, `plan/migracion-postgres-17`). Todo el plan se ejecuta dentro de esa rama, de la primera fase a la auditoría. El merge a la rama base lo decide el humano al final — el orquestador informa que el plan cerró, no mergea salvo pedido explícito.

Si al arrancar ya existe una rama `plan/{nombre}`, el orquestador decide con el historial a la vista: **reanudar** (leer los commits de cierre, continuar desde la próxima fase sin commit) o crear el plan con otro nombre. No pisar una rama existente sin confirmación.

---

## Regla crítica: único committer

**Solo el orquestador commitea, y solo después de aprobar la validación.** Los sub-agentes trabajan sobre el worktree pero tienen prohibido commitear — la prohibición va explícita en cada delegación. El commit es el sello de validación: si está en el historial, pasó. Esto reemplaza la figura del "único escritor" de un archivo de estado, con una ventaja: no puede haber estado registrado que no corresponda a código validado.

---

## Formato del commit de cierre de fase

Un commit por fase, creado tras aprobar. Estructura del mensaje:

```
plan(refactor-auth): F2 completada — store de sesiones

Supuestos: TTL configurable por env, default 7 días.
Apego al plan: completo
Deuda: ninguna
Intentos: 1
Notas para fases siguientes: el flag de sesiones vive en src/config/flags.ts;
F3 debe consumirlo, no redefinirlo.

Plan: refactor-auth
Fase: F2
Estado: completada
Plan-File: docs/plans/refactor-auth.md
```

**Subject**: `plan({nombre}): {clave} {estado} — {nombre de la fase}`. Corto y greppeable.

**Body** — los campos que antes iban a un archivo de estado:

- `Supuestos`: decisiones que el sub-agente tomó donde el plan no definía.
- `Apego al plan`: `completo`, o la lista de desviaciones **con su justificación aceptada** (solo llegan acá desviaciones que la validación aprobó — las injustificadas se rechazaron antes).
- `Deuda`: `ninguna` (el caso esperado), o los ítems aceptados con su razón estructural. Ver política en `supervision.md`.
- `Intentos`: cuántas delegaciones tomó la fase. Si hubo rechazos, una línea por rechazo con el motivo: `Intentos: 2 — rechazo 1: no cubría el camino JWT del criterio de cierre`. Así la traza de rechazos queda en el historial sin commits intermedios.
- `Notas para fases siguientes`: lo que el próximo sub-agente necesita saber. Viajan solas por el historial — un sub-agente puede leerlas con `git log`.

**Trailers** (al pie, formato `Clave: valor`): `Plan`, `Fase`, `Estado`, `Plan-File`. Permiten reconstruir el estado con `git log --grep` incluso fuera de la rama, y `Plan-File` es cómo se re-encuentra el archivo de plan tras una compactación.

Lo que **no** se anota porque Git ya lo da: archivos tocados (es el diff — `git show --stat`), timestamp, autoría, orden de las fases.

---

## Estados que llegan al historial

| Estado | Cuándo |
|---|---|
| `completada` | Validada y aprobada, sin deuda o con deuda trivial aceptada. |
| `parcial` | Aprobada con deuda estructural justificada (excepción, no rutina). |

`rechazada` y `bloqueada` **no generan commit**: un rechazo re-delega (y queda como línea de `Intentos` en el cierre eventual); una fase bloqueada tras tres rechazos escala al humano sin commitear nada. El worktree con el intento fallido se limpia o se conserva según lo que decida la re-delegación — pero al historial solo llega trabajo aprobado.

---

## Staging por alcance

Al cerrar una fase, stagear **solo los archivos del alcance declarado**:

```
git add src/auth/sessions/ db/migrations/
git status   # ← lo que quede sin stagear es señal
```

Lo que aparece modificado fuera del alcance después del staging es una desviación que el reporte debió declarar. Si la declaró y la validación la aceptó, se stagea también y consta en `Apego al plan`. Si no la declaró, es una desviación oculta detectada — investigar antes de commitear. Este chequeo es gratis y convierte a Git en detector de desvíos, no solo en registro.

---

## Fases en paralelo

Dos fases estándar pueden delegarse en paralelo **solo si sus alcances de archivos son disjuntos**. Los cierres se procesan igual de a uno: validar la primera, stagear su alcance, commitear; recién después la segunda. Nunca un commit que mezcle dos fases — se pierde la unidad fase = commit que hace legible el historial.

---

## Cleanup y auditoría

Si la auditoría final o la resolución de deuda corrigen código, ese trabajo se commitea como una fase más:

```
plan(refactor-auth): cleanup — deuda de F3 y F5

(campos habituales)

Plan: refactor-auth
Fase: cleanup
Estado: completada
Plan-File: docs/plans/refactor-auth.md
```

Si la auditoría no corrigió nada, **no hay commit**: el resultado (cobertura, consistencia, deuda postergada con razón) se reporta al usuario en la conversación.

---

## Recuperación tras compactación o nueva sesión

```
1. git branch --list "plan/*"           → localizar la rama del plan
2. git log --format="%s" plan/{nombre}  → commits de cierre = fases hechas
3. Leer Plan-File de cualquier commit del plan → reabrir el archivo de plan
4. Comparar fases del plan vs cierres en el historial
   → la próxima fase sin commit es la próxima a delegar
5. git status → worktree sucio sin commit = posible zombie (ver supervision.md)
```

Nunca asumir avance desde la memoria: si la fase no tiene commit, no está cerrada.

---

## Notas operativas

- **No volcar secretos** en mensajes de commit: quedan en el historial para siempre.
- **El archivo de plan no se toca**: es input del usuario. Si el plan necesita ajustarse en el camino (fase dividida, alcance corregido), el ajuste se acuerda con el usuario y queda registrado en el campo correspondiente del commit de la fase afectada.
- **No usar `--amend` ni rebase** sobre commits de cierre ya creados: el historial del plan es traza, reescribirlo la destruye. Una corrección posterior es un commit nuevo.
