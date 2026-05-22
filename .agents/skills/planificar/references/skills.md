# Skills

Read this when the executing environment exposes reusable skills and the plan could benefit from recommending one per unit of work. If the environment has no skills, or you've checked and none fit anywhere in the plan, skip the field — don't mention skills just to look thorough.

## Why this exists

A skill is curated, reusable knowledge: generating DOCX/XLSX/PPTX/PDF, reading uploaded files, frontend design tokens, a domain workflow, an internal convention. If a unit of work ends up doing what a skill already does better, naming the skill saves the executor from reinventing it.

The rule is the same as elsewhere in the plan: **earn their place**. A skill that only loosely relates to the unit is noise. The executor will read the recommendation as a signal that following it is worth the cost — so it has to be.

## Discovery — knowing what's available

You can't honestly recommend skills you haven't read. Before per-unit evaluation, settle this:

**Case A — the client already surfaces them.** Some environments inject a section like `<available_skills>` with names *and* descriptions, or expose a tool that lists them. If that's there, skim it and move on; you have what you need.

**Case B — nothing is surfaced, or you only see names.** A name alone isn't enough — `docx` could mean "create Word docs" or "extract text from .docx files". Read each skill's description (the YAML frontmatter `description:` field in its `SKILL.md`, or the first paragraph if there's no frontmatter) before drafting. Keep that list mentally available while writing units.

Typical places to look:

- `.claude/skills/<skill-name>/SKILL.md` — project-local skills.
- `.agents/skills/<skill-name>/SKILL.md` — skills shared across agents in the repo.
- `~/.claude/skills/` or equivalent user directories — personal skills.
- Any path the project's own docs name as the skills root.

If reading every description is too much, scan the names first and read in full only the ones whose names plausibly intersect what the plan will do. The goal is enough signal to evaluate fit per unit — not an exhaustive catalogue.

If a directory exists but is empty, or no skills directories are present at all, that's a clean answer: there's nothing to recommend, skip the field everywhere.

## Deciding whether one applies

A skill is worth recommending on a unit when:

- The unit produces an artifact the skill is built to generate (a Word doc, a spreadsheet, a slide deck, a filled PDF).
- The unit reads or extracts content from a file type the skill covers.
- The unit operates in a domain the skill encodes (frontend design system, academic writing conventions, a specific internal workflow).
- The skill's description matches the verb the unit is centered on, not just the noun.

It's not worth recommending when:

- The skill sounds adjacent but targets a different case (a PDF-creation skill on a unit that only reads PDFs).
- The unit is small enough that loading and following the skill costs more than the unit itself.
- Several skills are candidates but none clearly fits — naming the wrong one is worse than naming none.
- The skill would only help with a small side-step inside the unit, not its core work.

When in doubt, leave it out. A unit without a recommended skill is the default, not a gap.

## How it shows up in the plan

It's an optional line inside the unit, alongside goal / tasks / touches / validation. One line is enough:

```markdown
## Phase 3 — Export the final report
- Goal: produce the monthly report as a downloadable DOCX.
- Tasks: …
- Touches: …
- Validation: opens in Word with intended headings and the summary table populated.
- Suggested skill: `docx` — for headings, the summary table, and consistent styling.
```

Two notes on formatting:

- Name the skill exactly as it appears in its source (`docx`, not "the Word skill").
- The short reason after the dash matters more than the name. "Suggested skill: `docx`" alone forces the reader to guess why; "for headings and the summary table" makes the recommendation actionable.

If a single unit could plausibly use two skills, recommend both only when each carries its own weight in the unit. Otherwise, pick the one that covers the unit's core work.

## What not to do

- Don't add `Suggested skill: none` as filler. Absence of the field is the signal.
- Don't list skills at the plan level as a general inventory. The recommendation lives on the unit that benefits, not in a global section.
- Don't recommend a skill the plan never explored. If you don't know what a skill does, you don't know it fits.
- Don't let a recommended skill change the shape of the unit. The unit's goal, tasks, and validation are decided by the work — the skill is a tool that helps execute them, not a reason to reshape them.
