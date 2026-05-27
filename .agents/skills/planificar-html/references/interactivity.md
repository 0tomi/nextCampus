# Interactivity

Inline JS patterns for the standalone HTML. The bar: a control earns its place when it changes something visible the user couldn't feel from prose alone.

## Patterns that pull weight

- **Tabs across alternatives** — when 2–4 versions of the same thing live in the artifact and only one should show at once. Keep semantic markup (`role="tablist"`, `aria-selected`) so keyboard nav works.
- **Sliders / inputs that rerender a preview** — for tuning values (timing, density, weight, count). Mutate CSS variables for purely visual tuning; reach for DOM re-renders only when the change is structural (cards added/removed, layout flipping).
- **Editable fields composing a prompt** — fields write to a state object; a "Copy as prompt" button reads it through a template. Render the prompt preview live, not just on click — the user wants to see what they're about to copy.
- **Drag-and-drop ordering** — for curation work (prioritize, bucket, triage). Native HTML5 DnD is enough. For short lists, up/down buttons are simpler than drag.
- **Live summaries** — a readout that updates from inputs, so the cumulative effect of choices is visible.

## Always export

If the artifact has any state worth carrying out, end with one of:

- **Copy as prompt** — a templated string the user pastes into the next agent. Good when state maps cleanly to instructions.
- **Copy as JSON** — the raw state object. Good when the next agent will parse it, or the user wants to commit it to a file.

Both render live above their button so the user sees what's being copied. `navigator.clipboard.writeText` with a brief "Copied" toggle on the button is enough confirmation.

## Architectural constraints

- One state object, one render function. Don't sprawl into framework-shaped architecture for what's essentially a form.
- Vanilla DOM APIs only — no inlined frameworks or large utility libs just to save a few lines.
- `localStorage` only when the artifact is meant to be revisited across sessions; for one-shot iteration, skip persistence.
