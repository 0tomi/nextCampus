---
name: git-commit
description: >
  Enforces git commit conventions for every feature requested or implemented by agents in the nextCampus project.
  Trigger: When making a git commit, preparing changes, finishing a task, or completing a feature.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Use this skill whenever you complete a feature, bugfix, refactor, database migration, or configuration change. You must commit your changes to git with a well-formulated message before completing the task.

## Critical Patterns

- **Mandatory Commits**: Every single requested feature or task completed MUST have a corresponding git commit.
- **Conventional Commits Only**: All commit messages must follow the Conventional Commits specification.
- **NO AI Attribution**: Never add "Co-Authored-By" or any mention/attribution to AI in commits.
- **Message Format**: `<type>(<scope>): <short description>`
  - Types: `feat` (new feature), `fix` (bug fix), `refactor` (code refactoring), `docs` (documentation), `style` (formatting, css), `chore` (maintenance).
  - Scope: A short noun describing the affected component (e.g., `db`, `auth`, `ui`, `calendar`).
  - Tone: Direct and professional.

## Code Examples

- `feat(db): configure standard prisma client connection`
- `fix(auth): resolve middleware session bypass error`
- `refactor(ui): clean up calendar component composition`
- `chore(config): update environment variables schema`

## Commands

```bash
git add .
git commit -m "feat(db): configure standard prisma client connection"
```
