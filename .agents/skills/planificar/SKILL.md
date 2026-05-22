---
name: planificar
description: This skill helps plan implementation work before coding. Use it when the user
  wants to think through approach, structure, risks, tradeoffs, and sequencing
  for a feature, change, or technical problem. Trigger only on explicit planning
  intent, not casual mentions of "plan". Good triggers include "planificá",
  "armá un plan", "hacé un plan de implementación", "antes de implementar",
  "scope this out", "draft a plan for", and "break this feature down".
---

# Planificar

Turn a requirement into a plan another agent or developer can execute. The plan should be grounded in the actual repo, name things concretely, surface risks honestly, and contain only changes that earn their place.

This skill is a guide, not a template. Use what fits, drop what doesn't.

---

## Planning is a conversation

A plan isn't a one-shot output. The user has context the requirement didn't capture, and you have technical questions worth asking before committing. Use that loop deliberately.

**Ask before drafting when ambiguity would change the plan.** If a missing piece would push you toward a different shape, different units of work, or a different recommendation — ask first, plan after. Better one round of questions than a plan that guessed wrong.

Examples of questions worth asking up front:
- The requirement names a behavior but not the trigger ("send a reminder" — on what? cron? user action? event?).
- Two reasonable architectures fit and the tradeoff is non-trivial (sync vs queued, monolith vs split service, schema-per-tenant vs shared).
- The scope boundary is fuzzy ("add notifications" — only email? in-app? push?).
- A decision now locks something expensive to change later.

**Don't ask when assumptions are cheap.** If a sensible default exists and the user can correct it without rework, write it as an assumption in the plan and move on. Five obvious questions before any plan is fastidioso, not thorough.

**Surface alternatives only when they're meaningfully better.** If you see a path the user didn't mention but it's clearly superior on what they care about (simpler, safer, less work for the same outcome), raise it as a question — not as a unilateral redirect. Frame it: "I'd suggest X instead of Y because Z — does that fit?". Don't propose marginal improvements; respect what was asked for.

**Use whatever the environment offers for asking.** Some environments give you structured input tools (option pickers, multi-select). Others are plain chat. Match the medium — don't force structure where prose questions read better, don't write paragraphs where two tappable options would do.

A planning conversation that asks two sharp questions and then delivers a tight plan beats a plan that guessed wrong but looked complete.

---

## Before drafting, settle a few things

**1. Has the repo been explored?** If the conversation already shows file reads, greps, or pasted code covering what the plan will touch, skip ahead. If not, explore first — see `references/exploration.md`. Planning blind produces guesses dressed as plans.

**2. Are the available skills known?** If the client already surfaces them (e.g. an `<available_skills>` block, a tool listing with descriptions), you have what you need. If not — or if you only know names without descriptions — read what's in the project's skill directories (`.claude/skills/`, `.agents/skills/`, or wherever skills live here) before drafting. A skill you've never read isn't one you can honestly recommend. See `references/skills.md`.

**3. Will this be orchestrated across agents in parallel?** Only if the user says so. Default is sequential. If yes, read `references/orchestration.md` for the additions a parallel-ready plan needs (contracts, dependency graph, merge criteria).

**4. What shape fits the work?** Pick one, don't default to "phases" out of habit:

- **Phases** — sequential steps that each validate before the next. Use when work has true ordering and milestones worth pausing at.
- **Parts** — frontend / backend / migration / tests, no order implied. Use when work splits cleanly by surface and the order is not the interesting part.
- **Roadmap** — a numbered list of changes, no ceremony. Use for small or tightly-scoped work where phases would be theater.
- **Decision-first** — alternatives → tradeoffs → recommendation, then a roadmap. Use when a technical decision has to land before sequencing makes sense.

Mix shapes if it helps (e.g. a decision section followed by phases). The shape serves the reader, not the other way around.

---

## What a plan typically covers

These pieces usually matter. Include the ones that earn their place. A 3-line bug fix doesn't need a non-goals section; a refactor across services does.

- **Goal** — what gets built, end state in 2–5 lines.
- **Non-goals** — what's explicitly out of scope. Worth including when scope drift is plausible.
- **Assumptions / unknowns** — what the plan takes for granted and what it doesn't know yet. Flag the ones that, if wrong, invalidate the plan.
- **Affected surface** — files / modules touched, with state (Create / Modify / Delete / Review). Listed once for the whole plan; units of work reference it instead of repeating.
- **Risks** — what can break. Cross-cutting risks at the top, unit-specific risks inside the unit.
- **Sizing** — S / M / L with a one-line why. For the plan as a whole and, when relevant, per unit. See sizing notes below.
- **Units of work** — phases / parts / roadmap items. Each one needs enough to be executable: a clear goal, the tasks, what proves it's done.
- **Execution notes** — only if non-obvious: order rule, what to do if validation fails, anything an executor needs that isn't already in the units.

For each unit of work, the ingredients that usually matter: a one-sentence goal, the concrete tasks (verb-led, executable), what files it touches (by reference to the affected surface), how to know it's done (validation), and what could break (risks). For parallel-ready plans, add inputs/outputs as a contract — see the orchestration reference.

Optionally, with the available skills already in mind (see step 2 above), for each unit ask whether one would genuinely help the work it describes. When it does, name it as a recommendation on that unit; when nothing fits, leave the field out. Don't list skills that only loosely relate, and don't add the field to every unit for symmetry. See `references/skills.md` for how to decide.

Skip ingredients that don't apply. A plan that says "Risks: none" because the unit truly has none is fine. A plan that hides risks is not.

---

## Sizing, briefly

**S** — few files, local, no contract or architecture impact. *e.g. a targeted validation, a query fix, a small endpoint.*

**M** — multiple layers, some cross-module work, broader tests. *e.g. a new business flow, a contract change, adding internal persistence.*

**L** — multiple domains, migrations, rollout or backward-compat concerns, high regression risk. *e.g. replacing a core component, redesigning auth, introducing eventing.*

If a single unit ends up L, consider splitting it. A plan full of L units hasn't been broken down.

---

## Visual choices

Default to prose. Reach for structure only when prose would be vaguer or longer.

- **Tables** — when comparing N items across the same dimensions (files × state, units × group). Skip if the table has one row or empty cells.
- **Mermaid** — only when the relationship is genuinely graph-shaped and prose can't carry it. A linear flow is a sentence.
- **Lists** — for short enumerations: tasks, risks, validation criteria.
- **Contract blocks** — for inputs/outputs an agent will consume verbatim (orchestration mode).

If a visual element doesn't pull weight, drop it. Decorative diagrams hurt the plan.

---

## Handling ambiguity

When the requirement has gaps, the order of preference is:

- **Ask** — if the gap would change the plan and the user is in the conversation. See *Planning is a conversation* above.
- **Plan with assumptions** — when the gap is small enough that a sensible default works and the user can correct it. List assumptions and flag the ones that, if wrong, change the plan.
- **Plan with alternatives** — when 2–3 approaches are plausible and the user can pick after seeing them. Lay them out, recommend one, give the reason. Don't plan all of them.
- **Block** — when planning honestly isn't possible (stack unknown, no entry point, no way to know what to preserve). Say what's missing, name the smallest exploration that unblocks you.

Don't fill gaps silently with plausible guesses. That's the failure mode this skill exists to prevent.

---

## Smell tests

A plan worth shipping avoids these:

- Vague tasks ("adapt the service", "improve validation").
- Files named but never opened.
- "No risks" on changes that obviously have some.
- Diagrams or tables that wouldn't be missed if removed.
- Padding to look thorough — ceremonial sections, repeated info.
- Unrequested refactors slipped in beside the actual work.

---

## References

Load only when needed:

- `references/exploration.md` — when the repo hasn't been explored.
- `references/orchestration.md` — when the plan will be parallelized across agents.
- `references/environments.md` — when the executing environment is known and worth tailoring to.
- `references/skills.md` — when the environment exposes skills and the plan could recommend some per unit.
- `references/examples.md` — three short skeletons (phases / parts / roadmap) when a concrete shape helps.
