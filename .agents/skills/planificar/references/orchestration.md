# Orchestration

Read only when the user wants the plan parallelized across agents. Otherwise the plan stays sequential.

In sequential mode, units of work are a timeline. In parallel mode, they're a dependency graph. The plan has to answer:

- Which units can run in parallel, which must wait?
- What does each unit publish and consume?
- Where do parallel branches merge, and how is that merge validated?
- Which units need a stronger model, which can run on a lighter one?

If the plan can't answer those, an orchestrator can't delegate it.

## Per-unit additions

Each unit of work, in addition to the usual ingredients, needs:

- **Parallel group** — a label (e.g. `G1`, `G2-frontend`). Same label = can run concurrently. Different labels = ordered.
- **Depends on** — which units it consumes outputs from. `none` if standalone.
- **Agent profile** — `light` (mechanical, deterministic), `standard` (typical implementation), `heavy` (architectural, ambiguous, destructive). Say *why* if it's heavy.
- **Contract** — inputs (what it consumes) and outputs (what it publishes). This is the most important field in parallel mode; downstream units consume from this surface only. A fuzzy contract means the parallelism is a lie — sharpen it or collapse the units.

## Plan-level additions

A parallel-ready plan also includes:

**Dependency graph.** Adjacency list is usually enough:

```
Unit 1 → Unit 2, Unit 3
Unit 2 → Unit 4
Unit 3 → Unit 4
```

Use Mermaid only if the graph is genuinely hard to read as a list.

**Parallel groups.** Which units ship together and why they're truly independent (different files, no shared mutable state).

**Merge criteria.** For every unit that joins parallel branches: what proves the branches actually fit together. A real test or check, not "make sure things integrate".

**Orchestrator notes.** Short prose for the orchestrating agent: which units are safe to retry, which need human review (destructive ops, migrations), which want a fresh agent context, which outputs need review before downstream units start.

## When parallelism actually works

Good candidates: independent surface area, stubbable layers (backend behind a fixed contract while frontend builds against a mock), tests alongside implementation once the contract is settled.

Bad candidates: units mutating the same files, units where one's output redefines the other's input, migrations and the code that depends on them, anything where the second unit's design depends on what the first *learns* during implementation.

If you find yourself inventing parallelism to hit a group count, stop. A correct sequential plan beats a broken parallel one.
