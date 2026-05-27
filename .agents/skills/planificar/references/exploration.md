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

## Delegating to explorer subagents

When exploration goes beyond a couple of known files, prefer delegating to one or more explorer subagents over reading everything in the main context. Subagents return synthesis, not raw file content — the planning context stays uncluttered for the work that needs full fidelity.

Read files directly when you know which file the change lives in and need its full content, when you're confirming a single detail (a function signature, a config value), or when the exploration is two or three targeted opens. The cost of spinning up a subagent isn't worth it for a punctual read.

Delegate when the scope is *understand this area*: tracing how a feature is wired, inventorying a module, finding all callers of a surface, or mapping conventions across similar features. A subagent with a sharp brief ("find the entry points to auth and list the files that own session state"; "describe how the test setup works across these packages") returns more useful signal than dumping ten files into the main context.

How many subagents to spawn scales with the surface, not with effort:

- **Around 10 files or one cohesive area** — one subagent is usually enough.
- **A larger surface, or two distinct areas worth separating** — two, each scoped to a different question or a different part of the tree.
- **A broad sweep across an unfamiliar codebase** — up to three, each with a focused remit. More than that and the synthesis becomes its own problem.

The brief matters more than the count. "Read `src/auth/`" is a worse brief than "find the auth entry points and which files own session state" — the answer is shaped by the question. After a subagent returns, you can still open specific files directly if the synthesis flagged something the plan will modify.

## Reading depth

Read full files, not just snippets around a match. A grep hit tells you a symbol is there; only the file tells you what shape it has.

For the files the plan will modify: open them. For files only adjacent to the change: a glance is fine.

## Exit criterion

You're done exploring when you can name the affected files and write the plan's assumptions section honestly. If something critical is still unknown after a real attempt to find out, treat that as a *Block* (see ambiguity handling in `SKILL.md`) rather than guessing.
