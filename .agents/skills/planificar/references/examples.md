# Skeletons

Three short shapes. Use as scaffolding when the form of the plan isn't obvious. None is canonical — a real plan adapts.

---

## Phases — sequential, each validates before the next

Use when work has true ordering and each step is worth pausing on.

```markdown
# Plan: <name>

**Context.** <2–4 lines: what's broken or missing today, why now>
**Goal.** <2–4 lines>
**Done when.** <one verifiable criterion for the whole plan>
**Affected surface.** <files / modules with state>
**Sizing.** M — touches HTTP, persistence, tests.
**Risks.** <cross-cutting>

## Phase 1 — <name>
- Goal: <one line>
- Tasks: <verb-led, executable>
- Touches: <files from the surface above>
- Validation: <concrete check>

## Phase 2 — <name>
- Goal: ...
- Tasks: ...
- Touches: ...
- Validation: ...
- Suggested skill: `<skill-name>` — <one-line why, only if a skill genuinely fits this phase>

## Execution notes
Phase N+1 starts only after N validates. If validation fails, fix in place; if an assumption broke, update the plan before continuing.
```

The `Suggested skill` line is optional. Include it only on a phase that absorbed the skill — its tasks and validation already reflect it (see `references/skills.md`); leave it out of phases where nothing fits.

---

## Parts — divisible by surface, no hard ordering

Use when the work splits cleanly by layer (frontend / backend / DB) and the order of execution isn't the interesting part.

```markdown
# Plan: <name>

**Context.** <2–4 lines: what's broken or missing today, why now>
**Goal.** <2–4 lines>
**Done when.** <one verifiable criterion for the whole plan>
**Affected surface.** <files with state>
**Sizing.** M.
**Assumptions.** <what holds across all parts>

## Backend
- What changes: <endpoints, services, models>
- Tasks: <list>
- Validation: <tests, contract checks>

## Frontend
- What changes: <components, pages, state>
- Tasks: <list>
- Validation: <UI states, integration with backend>

## Migration
- What changes: <schema delta>
- Tasks: <list>
- Validation: <up/down, data integrity>

## Tests
- New coverage: <unit / integration / e2e>
- Validation: <what passing looks like>

## Integration check
What proves the parts fit: <real test or smoke flow>
```

---

## Roadmap — small or tight scope, no ceremony

Use when the work is small enough that phases would be theater. A numbered list of changes is the plan.

```markdown
# Plan: <name>

**Context.** <1–2 lines: why this work exists>
**Goal.** <1–2 lines>
**Affected surface.** <2–4 files>
**Sizing.** S.
**Risks.** <if any>

1. <File or area> — <what changes, in one line>
2. <File or area> — <what changes>
3. <File or area> — <what changes>
4. Tests — <which cases get coverage>

**Validation.** <how to verify the whole thing works>
```

---

## Choosing between them

- Trying to validate step-by-step? → phases.
- Splitting by layer with no real ordering? → parts.
- Three to five small changes? → roadmap.
- Need to decide before sequencing? → write a short *Decision* section first, then pick one of the three for what follows.

When in doubt, the smaller shape is usually right. Phases are not the default.
