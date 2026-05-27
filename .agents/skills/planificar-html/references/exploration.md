# Exploration

Read this when the artifact documents work on something already in the repo — a refactor, a feature touching existing code, a redesign of a current surface. Skip it for pure greenfield ideas, or when the conversation has already explored what the artifact will touch.

## What you're looking for

Enough signal to ground the artifact in real code, not assumptions:

- **Where the surface lives** — entry points, the modules involved, the actual current UI/UX if one exists.
- **What it touches back** — direct callers, consumers, anything that depends on the surface under change.
- **Conventions** — how similar features are structured today, so mockups don't fight the codebase.
- **What's already there** — to avoid mockups for components that exist as something else, or specs proposing things that already shipped.
- **The current state worth showing** — sometimes the artifact benefits from a "today" panel next to the "proposed" mockup. Capture the shape, data flow, or representative snippets that make the comparison honest.

A 30-second listing is cheaper than a wrong mockup. When in doubt, do a minimal pass.

## Delegating to explorer subagents

When exploration goes beyond a couple of known files, prefer delegating to one or more explorer subagents over reading everything in the main context. Subagents return synthesis, not raw file content — the main context stays clean for drafting the artifact.

Read files directly when you know which file the change lives in and want its full content, when you're confirming a single detail (a function signature, a config value), or when the exploration is two or three targeted opens.

Delegate when the scope is *understand this area*: tracing how a feature is wired, inventorying a module, finding all callers of a surface, or mapping conventions across similar features. A subagent with a sharp brief ("find the auth entry points and list the files that own session state") returns more useful signal than dumping ten files into the main context.

How many subagents to spawn scales with the surface, not effort:

- **~10 files or one cohesive area** — one subagent is usually enough.
- **A larger surface, or two distinct areas worth separating** — two, each with its own remit.
- **A broad sweep across unfamiliar code** — up to three, each with a focused brief.

The brief matters more than the count.

## What ends up in the artifact

Not everything you find belongs in the HTML. The signal makes the spec/mockup honest; the raw findings stay in your head or in a side note.

Worth surfacing:

- Code snippets the user will recognize, when annotating them changes how the proposal lands.
- A small "today vs proposed" comparison when the change is a redesign of something existing.
- File paths in the handoff block when the next agent needs to know where to start.

Not worth surfacing:

- Long quotes of source code for atmosphere.
- File trees for their own sake.
- A list of every grep hit you ran.

## Exit criterion

You're done exploring when you can mock the proposed change without guessing what the current shape is, and the handoff block can name the actual surface the next agent will touch. If something critical is still unknown after a real attempt to find out, treat it as a *Block* (see *Handling gaps* in SKILL.md) rather than guessing.
