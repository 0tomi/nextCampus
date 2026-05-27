# Skill Registry

## Project Standards

- **Conventional Commits**: Commits MUST follow conventional commits (e.g., `feat(ui): ...`, `fix(db): ...`). NEVER include AI attribution or "Co-Authored-By".
- **Frontend Vocabulary**: The frontend MUST use user-friendly, non-technical vocabulary. Avoid technical implementation references (like "client-only wrapper" or "Server Component").
- **Cursor Pointer**: Interactive buttons and triggers MUST have `cursor-pointer` class/style.
- **Strict TDD Mode**: If Vitest is installed, write tests before or alongside implementation.

## Registered Skills

| Name | Path | Trigger / Context |
|------|------|-------------------|
| frontend-design | `.agents/skills/frontend-design/SKILL.md` | CSS/HTML/JS, React component styling, UI layouts |
| vercel-react-best-practices | `.agents/skills/react-best-practices/SKILL.md` | React component performance, RSC, SWR, hooks |
| git-commit | `.agents/skills/git-commit/SKILL.md` | Git commits, pre-commit checks |
| supabase | `.agents/skills/supabase/SKILL.md` | Database queries, RLS, Supabase JS client |
| prisma-client-api | `.agents/skills/prisma-client-api/SKILL.md` | Prisma queries, CRUD operations |
