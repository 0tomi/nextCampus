# Environments

Read when you know where the plan will execute. The point is to nudge validation steps and exploration toward what fits the environment — not to teach the agent its own tools.

## Defaults

Regardless of environment:

- Don't assume an OS unless the repo proves it (PowerShell scripts, `.bat`, Inno Setup → Windows; `Makefile` → Unix-likely; etc.).
- Match validation to what the repo already uses — the test command in `package.json`, the CI config, the Docker setup. Don't invent local-only commands.
- Prefer language-native commands (`npm test`, `pytest`, `php artisan test`) over wrappers tied to a specific tool.

## Differential hints

| Environment | Lean into | Plan adaptation |
|---|---|---|
| **VSCode + agent** (Claude/Copilot/Cursor) | Workspace search, Problems panel, inline diffs | Validation can reference Problems panel; size units to fit one editor session |
| **Antigravity** | First-class multi-agent orchestration, long workflows | Strong fit for orchestration mode; lean on isolated agent contexts when the plan benefits |
| **OpenCode** | Full shell, terminal-native, real working dir | Concrete shell commands per unit are fine; checkpoints help on long plans |
| **Gemini CLI** | File and shell access, good cross-file synthesis | Be explicit about which files each unit reads; don't rely on mid-unit rediscovery |
| **Codex CLI** | Small-diff units, atomic edits | Prefer small surface per unit; end every unit with a verifiable command |
| **Unknown / mixed** | — | Default to language-native commands; flag the unknown environment in assumptions |

If the environment isn't on this list, treat it as Unknown.
