# Plan 001: Agregar pipeline de CI con typecheck, lint y tests en GitHub Actions

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- package.json src/lib/env.ts prisma.config.ts vitest.config.ts`
> Si alguno de esos archivos cambió desde que se escribió este plan, compará
> los extractos de "Estado actual" contra el código vivo antes de seguir; si
> no coinciden, tratalo como condición de STOP.

## Status

- **Prioridad**: P1
- **Esfuerzo**: S
- **Riesgo**: LOW
- **Depende de**: ninguno (este plan desbloquea a los demás)
- **Categoría**: dx
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

Hoy el único gate automatizado del repo es el build de Vercel, que corre
**después** de pushear a `main`. `pnpm typecheck`, `pnpm lint` y `pnpm test`
nunca se ejecutan automáticamente: dependen de que el desarrollador se acuerde.
El README invita a contribuir con PRs, pero un PR externo no recibe ningún
feedback automatizado. Este plan agrega un workflow de GitHub Actions que corre
en cada push y PR, y es prerequisito de seguridad para los refactors de los
planes 006, 007 y 008.

## Estado actual

- No existe el directorio `.github/` en el repo (verificado en `473caa9`).
- `package.json` define los scripts relevantes:

```json
// package.json:5-22 (extracto)
"scripts": {
  "build": "prisma generate && next build",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "db:generate": "prisma generate",
  "test": "node_modules/.bin/vitest run",
  ...
}
```

- **Gotcha 1 — typecheck necesita el cliente Prisma generado**: el código
  importa tipos desde `prisma/generated/client` (ej.
  `src/lib/queries.ts:3`). Si no se corrió `prisma generate` antes,
  `tsc --noEmit` falla con errores de imports rotos. Esto está documentado en
  el historial del repo (commit `4b1a095` "docs: registrar errores de
  typecheck por cliente Prisma sin generar"). En CI: correr `pnpm db:generate`
  ANTES de `pnpm typecheck`.
- **Gotcha 2 — `src/lib/env.ts` valida al importar y tira error**:

```ts
// src/lib/env.ts:7-23 (extracto)
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('apuntes'),
  ADMIN_EMAILS: z.string().min(1, 'ADMIN_EMAILS requerido'),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
})
const result = schema.safeParse(process.env)
if (!result.success) { /* ... */ throw new Error('Configuración del servidor inválida') }
```

  Cualquier proceso que importe `env.ts` (tests que toquen módulos del server,
  `next build`) necesita esas variables seteadas, aunque sea con valores dummy.
- **Gotcha 3 — `prisma.config.ts` lee `DIRECT_URL`**:

```ts
// prisma.config.ts:9-11
datasource: {
  url: env('DIRECT_URL'),
}
```

  Setear un dummy `DIRECT_URL` en CI para que los comandos de Prisma no fallen
  al cargar la config.
- **Gotcha 4 — `pnpm build` NO va en este workflow**: `next build` con Cache
  Components prerenderiza páginas que ejecutan queries Prisma reales contra la
  base (`DATABASE_URL`). Un build en CI necesitaría una base accesible con el
  schema migrado — eso es infraestructura que este plan NO crea. El gate
  autoritativo de build sigue siendo Vercel (que ya tiene las env vars
  reales). El workflow cubre typecheck + lint + tests, que son los gates
  rápidos que hoy no existen.
- `pnpm-lock.yaml` existe en el root → usar `--frozen-lockfile`.
- Vitest excluye los e2e: `vitest.config.ts:7` → `exclude: [...configDefaults.exclude, 'tests/e2e/**']`. No hace falta excluir nada extra en CI.
- Los tests E2E de Playwright (`pnpm test:e2e`) necesitan un server corriendo y datos — quedan FUERA de este workflow.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Instalar | `pnpm install --frozen-lockfile` | exit 0 |
| Generar cliente Prisma | `pnpm db:generate` | exit 0 (no necesita DB) |
| Typecheck | `pnpm typecheck` | exit 0, sin errores |
| Lint | `pnpm lint` | exit 0 |
| Tests unitarios | `pnpm test` | exit 0, todos pasan |
| Validar el workflow localmente | `npx --yes yaml-lint .github/workflows/ci.yml` (o cualquier parser YAML) | YAML válido |

## Alcance

**En alcance** (los únicos archivos a crear/modificar):
- `.github/workflows/ci.yml` (crear)

**Fuera de alcance** (NO tocar aunque parezca relacionado):
- `package.json` — no agregar ni cambiar scripts (el plan 003 agrega `verify`).
- `vercel.json` / configuración de deploy — Vercel sigue siendo el gate de build.
- Tests E2E de Playwright — requieren infraestructura que no existe en CI.
- Cualquier archivo de `src/` o `prisma/`.

## Workflow de git

- Branch: `ci/github-actions-pipeline`
- Commit con Conventional Commits, sin atribución a IA. Ejemplo del repo:
  `2e7ae60 perf(bundle): lazy-load shell extras and remove dead assets`.
  Mensaje sugerido: `ci: agregar workflow de typecheck, lint y tests`
- NO pushear ni abrir PR salvo que el operador lo indique.

## Pasos

### Paso 1: Crear el workflow

Crear `.github/workflows/ci.yml` con este contenido. La versión de pnpm se
VERIFICA, no se asume: correr `pnpm --version` en el entorno del repo y usar
esa major (hoy es pnpm 11 — `pnpm-workspace.yaml` usa settings de pnpm 11
como `allowBuilds` y `trustPolicy`, que versiones anteriores no entienden):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

env:
  # Dummies: src/lib/env.ts valida al importar; ningún job de este workflow
  # se conecta a servicios reales.
  NEXT_PUBLIC_SUPABASE_URL: https://dummy.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: dummy-publishable-key
  SUPABASE_SECRET_KEY: dummy-secret-key
  ADMIN_EMAILS: ci@example.com
  DATABASE_URL: postgresql://dummy:dummy@localhost:5432/dummy
  DIRECT_URL: postgresql://dummy:dummy@localhost:5432/dummy

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 24  # LTS actual y default de Vercel; verificar al ejecutar
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

**Verificar**: el archivo existe y es YAML válido (parsearlo con cualquier herramienta YAML) → sin errores de sintaxis.

### Paso 2: Reproducir el workflow localmente

Correr en orden, en el root del repo (con el `.env` local presente esto ya
funciona; el objetivo es confirmar que la SECUENCIA es correcta):

```bash
pnpm install --frozen-lockfile && pnpm db:generate && pnpm typecheck && pnpm lint && pnpm test
```

**Verificar**: exit 0 en toda la cadena. Si `pnpm test` falla en algún test
preexistente, es condición de STOP (el workflow nacería en rojo).

### Paso 3 (opcional, solo si el operador pide push): activar y verificar en GitHub

Si el operador aprueba pushear: push del branch, abrir PR, y confirmar que el
job `checks` aparece y pasa en verde. Recomendarle al operador activar branch
protection en `main` con `checks` como required check (eso es configuración
del repo en GitHub, no código).

**Verificar**: el run del workflow en la pestaña Actions termina en éxito.

## Plan de tests

No se escriben tests nuevos: este plan ES la infraestructura que ejecuta los
existentes. La verificación es que los ~30 archivos de test actuales pasan
dentro del workflow con las env dummy (paso 2 lo prueba localmente).

## Criterios de done

Todos deben cumplirse:

- [ ] `.github/workflows/ci.yml` existe y es YAML válido
- [ ] La cadena del paso 2 termina con exit 0 localmente
- [ ] `git status` muestra SOLO `.github/workflows/ci.yml` como archivo nuevo
- [ ] Fila de este plan actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

Frená y reportá (no improvises) si:

- `pnpm test` falla con el `.env` local presente — hay tests rotos
  preexistentes que deben arreglarse antes de activar CI.
- `pnpm test` pasa con `.env` local pero algún test falla al correr con las
  variables dummy del workflow (probalo con `env -i PATH="$PATH" HOME="$HOME" NEXT_PUBLIC_SUPABASE_URL=... pnpm test`
  si tenés dudas) — significa que un test depende de un secreto real, y eso
  hay que reportarlo, no esquivarlo con un secreto en CI.
- `pnpm db:generate` exige conexión real a la base (no debería: `generate` es
  offline en Prisma 7) — reportar el error exacto.
- Te ves tentado a agregar `pnpm build` al workflow — NO: necesita una DB real
  (ver Gotcha 4). Eso sería un plan aparte con base efímera.

## Notas de mantenimiento

- Cuando exista una base de datos efímera para CI (Postgres en service
  container + `prisma migrate deploy` + seed), se puede agregar un job de
  `pnpm build` y otro de Playwright. Eso quedó explícitamente diferido.
- Si en el futuro se fija `packageManager` en `package.json`, quitar el
  `version: 9` del action de pnpm para que lo tome de ahí.
- Revisor: verificar que las env dummy no se parezcan a secretos reales y que
  el workflow no reciba secrets de GitHub (no los necesita).
