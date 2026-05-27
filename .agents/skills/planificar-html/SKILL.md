---
name: planificar-html
description: Build a rich, interactive standalone HTML artifact to explore, spec, and
  iterate on a feature idea before handing it off to another agent for execution.
  Use when the user wants to think through specs, alternatives, mockups, design
  playgrounds, or research in HTML — instead of a markdown plan. Triggers include
  explicit names like "planificá-html", "armame el plan en html", "exploración en
  html", "spec en html", "iteremos esto en html", "html artifact", "html mockup",
  "html spec", and phrasings like "armame un html que muestre…" or "quiero iterar
  esta idea en html".
---

# Planificar HTML

Build a rich, interactive HTML artifact to explore, spec, and iterate on an idea before handing it off to another agent for execution. This is pre-planning: maquetas, alternativas, ajustes editables — not the executable plan.

This skill is a guide, not a template. Use what fits, drop what doesn't — except the two hard rules below.

---

## Hard rules

**1. The output is always a single standalone HTML file.** CSS and JS inline. No external assets beyond what loads from the file alone — no remote fonts, no CDNs, no fetches. The user opens it locally in a browser to review; this is not a published page.

**2. Lean on `frontend-design` (or a design skill the user named in the prompt) for the visual layer.** Before drafting, check it's available — `<available_skills>`, project skill directories (`.claude/skills/`, `.agents/skills/`, etc.), or wherever skills are surfaced here. If a design skill is reachable, use it. If none is, proceed without — build the artifact applying your own design judgement, don't block on it.

Everything else here is suggestion.

---

## Ground it in the repo (when applicable)

The artifact often documents work on something that already exists — a refactor, an improvement, a feature touching code already in the repo. When that's the case, explore before drafting. Mockups for a screen that doesn't match the actual surface, or a spec that names files that don't exist, kill the artifact's usefulness.

If the conversation already shows file reads, greps, or pasted code covering what the artifact will touch, skip ahead. If the artifact is purely about a new idea with no codebase anchor, skip too.

Otherwise, see `references/exploration.md` for what to look at and how deep to go.

---

## Conversation first

The HTML is a living artifact, iterated across turns. Treat each version as a draft worth questioning.

**Ask before drafting when ambiguity would change the artifact's shape** — the surface (mobile? web? which screens?), the direction (one approach or several to compare?), or the scope. One round of sharp questions beats an artifact that guessed.

**Don't ask when assumptions are cheap.** If a sensible default works and the user can tweak it via the HTML's own controls or the next message, bake it in as an assumption and move on.

**Surface alternatives when meaningfully better** — as a question, not a redirect.

If the environment offers structured input pickers, prefer them over plain prose for option-picking questions.

---

## Pick a shape

Don't default to one layout out of habit:

- **Exploration grid** — N distinct approaches side by side, each with a micro-mockup and a tradeoff label. For when the direction isn't decided.
- **Single spec** — one approach in depth: goal, flow, key screens, edge cases. For when the call is made and detail needs to land.
- **Decision-first** — alternatives → tradeoffs → recommendation, then a deeper section for the chosen one. For when a call has to land before the spec makes sense.
- **Design playground** — interactive controls the user fiddles with to find the final shape. For when the work is tuning, not deciding.
- **Research / explainer** — diagram-led synthesis with annotated snippets and a "what this implies" block. For investigation, not implementation.

Mix shapes when it helps (decision-first → single spec is common). See `references/patterns.md` for skeletons.

---

## What earns a place in the artifact

The pieces that tend to matter — include the ones this work needs, skip the rest:

- **One-screen overview** at the top. The user shouldn't scroll to learn what this is.
- **Goal / context** in 2–4 lines, plus fixed constraints.
- **Mockups** — SVG, HTML/CSS, or annotated frames. Show the thing, don't just describe it.
- **Alternatives** with a one-line tradeoff each, when multiple directions are open.
- **Interactive controls** that change something visible. See *Interactivity* below.
- **Handoff block** with the locked-in choices, open questions, and a copy-as-prompt or copy-as-JSON button that emits the current state.
- **Open questions** — what's deliberately unresolved, so the conversation knows where to continue.

A short exploration may not need a handoff block. A tuning playground may not need alternatives. Match the artifact to the work.

---

## Interactivity

Inline JS earns its place when it lets the user *feel* a choice — sliders rerendering a preview, tabs across A/B/C mockups, editable fields composing a copy-as-prompt string, drag-and-drop ordering, live summaries from inputs. Controls that don't visibly change anything are noise.

See `references/interactivity.md` for patterns.

---

## Smell tests

An artifact worth shipping avoids these:

- Decorative interactivity (a slider that doesn't change anything visible).
- Lorem-ipsum mockups too generic to be for anything specific.
- A handoff block that just restates what's above without locking choices.
- Padding to look thorough — ceremonial sections, repeated info across blocks.
- A 4000-line HTML where 400 would say more.

---

## References

Load only when needed:

- `references/exploration.md` — when the artifact documents work on existing code that hasn't been explored yet.
- `references/patterns.md` — skeletons for each shape (exploration grid, single spec, decision-first, playground, explainer).
- `references/interactivity.md` — JS patterns for controls, live previews, and copy-as-prompt/JSON exports.
