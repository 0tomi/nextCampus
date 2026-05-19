# Exploration

Read this when the repo hasn't been explored yet. If the conversation already shows file reads, greps, or pasted code covering what the plan will touch, you can skip this and start drafting.

## What you're looking for

Enough signal to ground the plan in real code, not assumptions. Specifically:

- **Where** the change lives — entry points, the modules it touches.
- **What it touches back** — direct callers, consumers, anything that depends on the surface under change.
- **Conventions** — how similar features are structured today, so the plan doesn't fight the codebase.
- **What's already there** — to avoid proposing to "create" things that exist or "modify" things that don't.
- **Validation surface** — existing tests, CI checks, how the project verifies work.

A 30-second listing is cheaper than a wrong plan. When in doubt, do a minimal pass.

## Reading depth

Read full files, not just snippets around a match. A grep hit tells you a symbol is there; only the file tells you what shape it has.

For the files the plan will modify: open them. For files only adjacent to the change: a glance is fine.

## Exit criterion

You're done exploring when you can name the affected files and write the plan's assumptions section honestly. If something critical is still unknown after a real attempt to find out, treat that as a *Block* (see ambiguity handling in `SKILL.md`) rather than guessing.
