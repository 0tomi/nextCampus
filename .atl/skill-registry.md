# Skill Registry

> Catálogo de skills disponibles en este proyecto. Cualquier agente (Claude, Gemini, Codex/Antigravity) DEBE consultar esta tabla antes de una tarea de código, identificar la skill cuyo Trigger matchea el contexto y leer su `SKILL.md` antes de escribir nada.

## Project Standards

- **Conventional Commits**: Commits MUST follow conventional commits (e.g., `feat(ui): ...`, `fix(db): ...`). NEVER include AI attribution or "Co-Authored-By".
- **Frontend Vocabulary**: The frontend MUST use user-friendly, non-technical vocabulary. Avoid technical implementation references (like "client-only wrapper" or "Server Component").
- **Cursor Pointer**: Interactive buttons and triggers MUST have `cursor-pointer` class/style.
- **Strict TDD Mode**: If Vitest is installed, write tests before or alongside implementation.

## Registered Skills

| Skill | Path | Trigger / Context |
|------|------|-------------------|
| frontend-design | `.agents/skills/frontend-design/SKILL.md` | Construir o estilar UI web: componentes, páginas, layouts, dashboards, HTML/CSS, "que se vea bien" |
| react-best-practices | `.agents/skills/react-best-practices/SKILL.md` | Escribir/revisar/refactorizar componentes React o páginas Next.js: performance, RSC, data fetching, hooks, bundle |
| composition-patterns | `.agents/skills/composition-patterns/SKILL.md` | Refactor de componentes con proliferación de props booleanas, compound components, render props, context providers, APIs reutilizables (incluye cambios de React 19) |
| next-best-practices | `.agents/skills/next-best-practices/SKILL.md` | Trabajar en Next.js App Router: file conventions, límites RSC/'use client', route handlers, async APIs, metadata, manejo de errores, optimización de imágenes/fuentes |
| next-cache-components | `.agents/skills/next-cache-components/SKILL.md` | Caching en Next.js 16: PPR, `use cache`, cacheLife, cacheTag, updateTag, migrar de `unstable_cache` |
| next-upgrade | `.agents/skills/next-upgrade/SKILL.md` | Actualizar Next.js a una nueva versión, correr codemods, migrar entre majors |
| tailwind-css-patterns | `.agents/skills/tailwind-css-patterns/SKILL.md` | Estilar con Tailwind: layouts responsive, flexbox, grid, spacing, tipografía, colores, design systems |
| accessibility | `.agents/skills/accessibility/SKILL.md` | "improve accessibility", a11y audit, WCAG, soporte de screen reader, navegación por teclado, "make accessible" |
| seo | `.agents/skills/seo/SKILL.md` | "improve SEO", optimizar para búsqueda, meta tags, structured data, sitemap |
| supabase | `.agents/skills/supabase/SKILL.md` | Cualquier tarea de Supabase: DB, Auth, Edge Functions, Realtime, Storage, RLS, supabase-js, @supabase/ssr, sesiones/JWT/cookies, CLI o MCP, migraciones |
| supabase-postgres-best-practices | `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Escribir/revisar/optimizar queries Postgres, diseño de schema o configuración de DB |
| prisma-client-api | `.agents/skills/prisma-client-api/SKILL.md` | Queries Prisma: findMany, create, update, delete, filtros, operadores, `$transaction`, configurar Prisma Client |
| prisma-cli | `.agents/skills/prisma-cli/SKILL.md` | Comandos Prisma CLI: prisma init/generate/migrate/db/studio/mcp |
| prisma-database-setup | `.agents/skills/prisma-database-setup/SKILL.md` | Configurar Prisma con un provider (Postgres/MySQL/SQLite/MongoDB) o troubleshooting de conexión |
| prisma-postgres | `.agents/skills/prisma-postgres/SKILL.md` | Crear/operar bases Prisma Postgres: Console, create-db CLI, Management API/SDK, provisioning programático |
| zod | `.agents/skills/zod/SKILL.md` | Definir schemas `z.object`, validaciones `z.string`, safeParse, `z.infer`, manejo de errores de validación |
| typescript-advanced-types | `.agents/skills/typescript-advanced-types/SKILL.md` | Type logic compleja: generics, conditional types, mapped types, template literals, utility types |
| nodejs-backend-patterns | `.agents/skills/nodejs-backend-patterns/SKILL.md` | Servicios backend Node: Express/Fastify, middleware, error handling, auth, integración de DB, diseño de API REST/GraphQL/microservicios |
| nodejs-best-practices | `.agents/skills/nodejs-best-practices/SKILL.md` | Decisiones de arquitectura Node: selección de framework, patrones async, seguridad |
| security-pen-testing | `.agents/skills/security-pen-testing/SKILL.md` | Auditorías de seguridad, pentesting, scanning de vulnerabilidades, OWASP Top 10, detección de secrets, API security |
| git-commit | `.agents/skills/git-commit/SKILL.md` | Hacer un commit, preparar cambios, terminar una tarea o feature (conventional commits, sin atribución a IA) |
| brainstorming | `.agents/skills/brainstorming/SKILL.md` | ANTES de cualquier trabajo creativo: crear features/componentes, agregar funcionalidad o modificar comportamiento. Explora intención y diseño antes de implementar |
| planificar | `.agents/skills/planificar/SKILL.md` | "planificá", "armá un plan", "antes de implementar", "scope this out": pensar enfoque, riesgos, tradeoffs y secuencia antes de codear |
| planificar-html | `.agents/skills/planificar-html/SKILL.md` | Iterar una idea/spec/mockup en un artifact HTML interactivo antes de pasarla a otro agente |
| orquestar-planes | `.agents/skills/orquestar-planes/SKILL.md` | "orquestar agentes", "plan de fases", "delegación técnica", "sub-agentes": delegar y auditar un plan multi-fase con sub-agentes |
