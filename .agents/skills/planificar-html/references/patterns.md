# Patterns

Concrete shapes for the HTML artifact. Each lists when to use it, what sections it typically contains, and the kind of interactivity that pulls weight. They are scaffolding — adapt freely, mix shapes when the work needs it. The visual execution comes from `frontend-design` (or the design skill the user named).

---

## Exploration grid

Use when the direction isn't decided and N approaches are worth weighing.

Sections, roughly:

- A short header naming what's being explored and the dimensions varied.
- A grid of 3–6 cards. Each card carries:
  - A name for the approach.
  - A micro-mockup (small SVG or HTML/CSS frame).
  - The tradeoff in one line ("more onboarding steps, but no upfront choice").
  - Tags for what's varied (density, tone, layout, etc.).
- A "pick to expand" affordance — a button on each card that signals which to develop further. Optional: the user can also just say it in chat.
- An assumptions strip if any defaults are baked in.

The grid lets the user *see* the difference. Don't pad each card with paragraphs — a label and a tradeoff is the unit.

---

## Single spec

Use when the call is made and the detail needs to land.

Sections, roughly:

- One-screen header: goal in 2–4 lines, constraints in a pill row or sidebar.
- Primary mockup — the main screen or screens the spec describes.
- User flow — a small diagram (SVG or stepwise blocks), not paragraphs.
- Data sketch — only if it changes the shape (a small entity diagram, a JSON shape).
- Edge cases — short list with each one named, not described in prose.
- Handoff block at the bottom: locked choices, open questions, copy-as-prompt button.

Single spec is dense. Use tabs or accordions when sections are deep enough to compete for attention.

---

## Decision-first

Use when a call has to land before the spec makes sense.

Sections, roughly:

- The decision being made, in one line.
- Alternatives as a row of cards or a small table. For each: one-line summary, pros, cons, fit-score (gut, not science).
- Recommendation in a highlighted block, with the *why*.
- A collapsed single-spec section for the recommendation, expanded on user signal.

Specing the chosen alternative in the same file is optional — sometimes it's cleaner to land the decision first and spec it in the next turn.

---

## Design playground

Use when the work is tuning, not deciding — animation timing, color tokens, layout density, copy length, easing curves.

Sections, roughly:

- A live preview at the top (the thing being tuned, rendering from current control state).
- A control panel — sliders, pickers, toggles — grouped by what they affect.
- A "current state" readout showing the values picked.
- An export — a button copying the state as JSON, CSS variables, or a prompt the user pastes into the next agent.

The whole artifact is preview + controls + export. Don't bury the preview behind a fold; the user is here to fiddle.

---

## Research / explainer

Use for investigation, not implementation. When the user asked "how does X work" or "what are the options for Y" without an implementation intent yet.

Sections, roughly:

- A diagram at the top — the mental model the rest of the page builds on.
- 3–6 sections, each anchored by a heading and a visual (illustration, annotated snippet, table).
- A "what this implies" or "open questions" block at the bottom — so the research has a forward edge, not just a summary.
- References / sources, when external material backs the claims.

The visual is the load-bearing thing. Prose between visuals is connective tissue, not the meat.

---

## Mixing

Decision-first followed by a single spec for the chosen alternative is common. An explainer with a small playground for an algorithm is fine. The shapes are starting points, not boxes — pick what fits, fold one into the other when the work calls for it.
