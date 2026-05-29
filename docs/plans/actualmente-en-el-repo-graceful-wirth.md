# Plan: Que los agentes invoquen las skills de forma confiable

## Context

**Problema:** en este repo, los agentes (Claude, Gemini, Codex/Antigravity) no invocan las skills disponibles de forma automática. Hay que nombrarlas a mano y, aun así, muchas veces no las usan.

**Lo que ya existe (no hay que crear infra nueva):**
- `AGENTS.md` como fuente única de verdad, con `CLAUDE.md → AGENTS.md` y `GEMINI.md → AGENTS.md` (symlinks). Una edición propaga a los tres harness.
- `.agents/skills/` con 26 skills reales, symlinkeado desde `.claude/skills`.
- `.atl/skill-registry.md` — registry markdown ya cableado a la skill `skill-registry` y al orquestador global.
- `skills-lock.json` — lockfile del gestor de skills.

**Por qué fallan las skills (es distinto por harness — verificado en el repo):**
- **Claude Code** ya carga las 26 `description` nativamente vía el symlink `.claude/skills`. Su palanca real es la **calidad de cada `description`** (frase gatillo "Use when…/Trigger:") y un **empujón explícito en AGENTS.md**. El registry le aporta poco.
- **Gemini / Antigravity / Codex**: en este repo **NO tienen path de auto-carga de skills** — no existe `.gemini/skills` ni `.agent/skills`, solo el symlink de `.claude`. Para ellos, **el registry citado desde `AGENTS.md` es el ÚNICO mecanismo** que les hace ver las skills.

**Descartado (y por qué):** crear `config/skills.registry.yaml` duplica `.atl/skill-registry.md` y rompe su cableado con la skill `skill-registry` y el orquestador global → quedarse en `.atl`. El scaffolding TS (`repoScanner.ts`, `skillRegistry.ts`, `rankCandidateSkills.ts`, `loadSelectedSkills.ts`) es para construir un harness propio sobre el Agent SDK; esta app Next.js no es un runtime de agentes, ningún harness ejecutaría ese código → es código muerto.

**Resultado buscado:** que cualquier agente, en cualquiera de los tres harness, vea y dispare la skill correcta sin que el usuario tenga que nombrarla.

---

## Approach (2 capas, sin código TS, sin `config/`)

### Capa 1 — Registry completo + cableado en AGENTS.md (sirve a Gemini/Codex; refuerza a Claude)

**1a. Regenerar `.atl/skill-registry.md`.**
- Invocar la skill `skill-registry` (decir "actualizar skills" / "update registry"), que escanea `.agents/skills/` y produce la tabla `Trigger | Skill | Path` + los *compact rules* por skill.
- El registry actual lista **5 de 26** skills → debe quedar con las **26** (las de `.agents/skills/`, que ya están curadas al stack: next, react, prisma, supabase, tailwind, zod, ts, a11y, seo, security, node, composition, brainstorming, planificar, orquestar — sin ruido tipo pdf/obsidian/laravel).
- Archivo objetivo: `.atl/skill-registry.md`. NO mover a `config/` ni a `.yaml`.

**1b. Agregar una sección "Skills Protocol" en `AGENTS.md`.**
- Archivo objetivo: `AGENTS.md` (propaga solo a `CLAUDE.md` y `GEMINI.md` por los symlinks — no editar esos).
- Contenido: instrucción corta y tajante de que, **antes de cualquier tarea de código**, el agente debe escanear la tabla de `.atl/skill-registry.md`, identificar las skills cuyo Trigger matchea el contexto (extensiones/paths tocados + acción a realizar) y leer su `SKILL.md` antes de escribir código. Tono imperativo (al estilo de las reglas existentes de Frontend/Commits del propio AGENTS.md).
- Ubicarla como nueva sección de primer nivel después de `### Context`, antes de `### Coding rules`, para que sea lo primero operativo que ve el agente.

### Capa 2 — Auditar las `description` de las SKILL.md (sube la auto-invocación nativa en Claude)

**Criterio (esto es lo que el ejecutor debe aplicar, no confiar en una lista cerrada):**
> Toda skill auto-invocable debe tener en su `description` una cláusula de gatillo explícita — `Use when …` / `Trigger: …` / "should be used when …" / "Usar cuando …" — con **frases concretas** que el usuario realmente diría o contextos de archivo concretos. Una `description` que es solo una lista de temas no dispara.

- Referencias buenas a imitar: `accessibility`, `brainstorming`, `zod`, `supabase` (gatillos explícitos con frases).
- **Débiles confirmados a reescribir:**
  - `.agents/skills/next-best-practices/SKILL.md` — `description` es solo lista de temas y tiene `user-invocable: false`. Agregar cláusula "Use when …" con contextos concretos (RSC boundaries, route handlers, data fetching en Next.js); revisar si `user-invocable: false` es intencional o está bloqueando su uso.
  - `.agents/skills/next-upgrade/SKILL.md` — descriptivo pero sin "Use when". Agregar gatillo ("Use when upgrading Next.js / running codemods / migrating major versions").
- Pasar el criterio por las **26** skills y reescribir cualquier otra que no lo cumpla. No tocar el cuerpo de la skill, solo el campo `description` del frontmatter.
- **Importante:** tras editar descriptions, re-correr la skill `skill-registry` (paso 1a) para que la tabla refleje los nuevos triggers. Hacer la Capa 2 **antes** del 1a final, o repetir 1a al cierre.

---

## Archivos críticos
- `AGENTS.md` — nueva sección "Skills Protocol" (única edición; propaga vía symlinks).
- `.atl/skill-registry.md` — regenerar con las 26 skills (vía skill `skill-registry`).
- `.agents/skills/*/SKILL.md` — auditar/reescribir el campo `description` donde falte gatillo (confirmados: `next-best-practices`, `next-upgrade`).

## Orden de ejecución
1. Capa 2: auditar y reescribir `description` de las SKILL.md débiles.
2. Capa 1a: regenerar `.atl/skill-registry.md` con las 26 skills (toma los triggers ya mejorados).
3. Capa 1b: agregar "Skills Protocol" a `AGENTS.md`.
4. Commit conventional (ej. `docs(skills): completar registry y reforzar auto-invocación de skills`), sin atribución a IA.

## Verificación (end-to-end)
- **Registry:** abrir `.atl/skill-registry.md` y confirmar que lista las 26 skills con Trigger y Path correctos (no 5).
- **AGENTS.md propaga:** `readlink CLAUDE.md` y `readlink GEMINI.md` siguen apuntando a `AGENTS.md`; confirmar que la sección "Skills Protocol" se ve al leer cualquiera de los tres.
- **Auto-invocación Claude:** en una sesión nueva, pedir una tarea de Next.js sin nombrar skills (ej. "agregá un route handler que devuelva los apuntes") y verificar que el agente dispara `next-best-practices` / `react-best-practices` por sí solo. Repetir con una query Prisma (→ `prisma-client-api`) y un commit (→ `git-commit`).
- **Gemini/Codex:** en esos harness, dar una tarea genérica y confirmar que el agente menciona haber consultado `.atl/skill-registry.md` y eligió la skill correcta (ahí el registry es el único camino).
