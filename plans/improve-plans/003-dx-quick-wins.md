# Plan 003: Quick wins de DX — script verify, Getting Started en README, archivar planes del root

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- package.json README.md AGENTS.md plan-comisiones-materia.yaml plan-filtro-anios-materias.yaml`
> Si alguno cambió, compará los extractos de "Estado actual" contra el código
> vivo; si no coinciden, tratalo como condición de STOP.

## Status

- **Prioridad**: P2
- **Esfuerzo**: S
- **Riesgo**: LOW
- **Depende de**: ninguno
- **Categoría**: dx
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

Tres fricciones chicas con arreglo barato: (1) la verificación pre-deploy
documentada en AGENTS.md son cuatro comandos que hay que recordar en orden —
un script `verify` la vuelve un solo comando; (2) el README invita a
contribuir pero no dice cómo levantar el proyecto, aunque `docs/SETUP.md`
(157 líneas, completo) ya existe — falta el link; (3) dos planes de ejecución
ya completados (`plan-comisiones-materia.yaml`, `plan-filtro-anios-materias.yaml`)
viven en el root del repo y confunden — el repo ya tiene un archivo histórico
en `docs/plans/plans-done/`.

## Estado actual

- `package.json:5-22` — scripts actuales (no existe `verify`):

```json
"scripts": {
  "dev": "next dev",
  "build": "prisma generate && next build",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  ...
  "test": "node_modules/.bin/vitest run",
  ...
}
```

- `AGENTS.md`, sección "Verificación pre-deploy", documenta la secuencia en
  capas: `pnpm typecheck` rápido al terminar una tarea, `pnpm build`
  autoritativo antes de mergear a `main`.
- `README.md` (62 líneas): tiene "¿De qué se trata?", "¿Qué tiene?",
  "Stack técnico" (tabla, termina línea 49) y "Contribuir" (líneas 51-55). No
  hay ninguna sección de setup ni link a `docs/SETUP.md`.
- `docs/SETUP.md` existe y cubre: creación del proyecto Supabase, las dos
  connection strings (`DATABASE_URL` pooler 6543 / `DIRECT_URL` 5432), y la
  puesta en marcha.
- En el root: `plan-comisiones-materia.yaml` (13 KB) y
  `plan-filtro-anios-materias.yaml` (15 KB), ambos artefactos de ejecución
  terminados (estado completado/aprobado en su contenido).
- Destino para archivarlos: `docs/plans/plans-done/` ya existe y contiene
  otros planes terminados (`admin-users-year-scoping.yaml`, etc.).

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Probar el script nuevo | `pnpm verify` | corre typecheck → lint → test → build, exit 0 |
| Typecheck suelto | `pnpm typecheck` | exit 0 |
| Mover con historial | `git mv <origen> <destino>` | exit 0 |

## Alcance

**En alcance**:
- `package.json` — agregar SOLO el script `verify`.
- `README.md` — agregar una sección corta de Getting Started.
- `AGENTS.md` — una línea mencionando `pnpm verify` en la sección de
  verificación pre-deploy.
- Mover `plan-comisiones-materia.yaml` y `plan-filtro-anios-materias.yaml` a
  `docs/plans/plans-done/`.

**Fuera de alcance** (NO tocar):
- Cualquier otro script de `package.json` y cualquier dependencia.
- El contenido de los `.yaml` movidos — se mueven tal cual, sin editar.
- `docs/SETUP.md` — se enlaza, no se reescribe.
- El resto del contenido de README y AGENTS.md.

## Workflow de git

- Branch: `chore/dx-quick-wins`
- Conventional Commits sin atribución a IA. Sugerido (un solo commit):
  `chore(dx): script verify, getting started en README y archivo de planes completados`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Agregar el script `verify`

En `package.json`, dentro de `"scripts"`, agregar (después de `"typecheck"`):

```json
"verify": "pnpm typecheck && pnpm lint && pnpm test && pnpm build",
```

**Verificar**: `pnpm verify` → corre las cuatro fases en orden y termina con
exit 0. OJO: `pnpm build` necesita el `.env` local completo (la base real de
dev) — si el entorno del ejecutor no lo tiene, verificá al menos
`pnpm typecheck && pnpm lint && pnpm test` y dejá constancia de que `build` no
se pudo correr.

### Paso 2: Getting Started en README

En `README.md`, insertar entre la tabla de "Stack técnico" (termina línea 49)
y la sección "Contribuir" (línea 51):

```markdown
## 🚀 Empezar a desarrollar

```bash
git clone https://github.com/0tomi/nextCampus.git
cd nextCampus
pnpm install
# Configurá Supabase y el .env siguiendo la guía:
# docs/SETUP.md
pnpm dev
```

La guía completa de credenciales y puesta en marcha está en
[`docs/SETUP.md`](docs/SETUP.md). Antes de mandar un PR, corré `pnpm verify`.
```

Mantener el tono del README (español, directo). NO agregar detalles técnicos
que ya están en SETUP.md.

**Verificar**: el link relativo `docs/SETUP.md` resuelve (el archivo existe) y
el markdown renderiza bien (preview o cualquier renderer).

### Paso 3: Mencionar `verify` en AGENTS.md

En `AGENTS.md`, sección "Verificación pre-deploy", agregar al final de esa
sección una línea:

```markdown
- **Atajo:** `pnpm verify` corre las dos capas juntas (typecheck → lint → test → build).
```

**Verificar**: la sección sigue siendo coherente (el escalonado
typecheck-rápido / build-autoritativo no se borra, solo se le suma el atajo).

### Paso 4: Archivar los planes del root

```bash
git mv plan-comisiones-materia.yaml docs/plans/plans-done/plan-comisiones-materia.yaml
git mv plan-filtro-anios-materias.yaml docs/plans/plans-done/plan-filtro-anios-materias.yaml
```

**Verificar**: `ls *.yaml` en el root solo muestra `pnpm-lock.yaml` y
`pnpm-workspace.yaml`; `git status` muestra los dos renames.

### Paso 5: Regresión

```bash
pnpm typecheck && pnpm test
```

**Verificar**: exit 0 (nada de este plan toca código, esto confirma que no se
rompió `package.json`).

## Plan de tests

Sin tests nuevos — cambios de documentación y scripts. Gate: paso 5.

## Criterios de done

- [ ] `pnpm verify` existe y encadena typecheck → lint → test → build
- [ ] README tiene la sección de inicio con link a `docs/SETUP.md`
- [ ] AGENTS.md menciona `pnpm verify`
- [ ] Los dos `plan-*.yaml` están en `docs/plans/plans-done/` (via `git mv`)
- [ ] `pnpm typecheck && pnpm test` → exit 0
- [ ] `git status` no muestra nada fuera del alcance
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- Alguno de los dos `.yaml` del root tiene contenido que indica trabajo EN
  CURSO (no completado) — reportá antes de mover.
- `pnpm verify` falla en una fase que también falla en `main` sin tus cambios
  — problema preexistente, reportalo, no lo arregles acá.
- README o AGENTS.md cambiaron tanto desde `473caa9` que los puntos de
  inserción no existen — reportá con el diff.

## Notas de mantenimiento

- Si el plan 001 (CI) ya está implementado, el workflow y `pnpm verify` deben
  mantenerse alineados en fases (hoy CI no corre `build` a propósito — ver
  ese plan).
- Revisor: chequear que la redacción agregada al README sea de cara al
  usuario/contribuidor, sin jerga interna (regla del repo).
