# Directory Structure

```text
/
├── CLAUDE.md                    # Master configuration
├── .claude/                     # Agent definitions, skills, hooks, rules, docs
├── src/                         # (legacy — pre-pivot; currently empty, kept for structure)
├── src-web/                     # Web app source (React + Vite) — main.tsx entry, App.tsx
├── gameConfig.js                # Game balance constants (imported by App.tsx)
├── assets/                      # Game assets (art, audio, vfx, shaders, data)
├── design/                      # Game design documents (gdd, narrative, levels, balance)
├── docs/                        # Technical documentation (architecture, api, postmortems)
├── tests/                       # Test suites (unit, integration, performance, playtest)
├── tools/                       # Build and pipeline tools (ci, build, asset-pipeline)
├── prototypes/                  # Throwaway prototypes (isolated from src/)
└── production/                  # Production management (sprints, milestones, releases)
    ├── session-state/           # Ephemeral session state (active.md — gitignored)
    └── session-logs/            # Session audit trail (gitignored)
```

> **Note (2026-08-14)**: project pivoted from Godot/GDScript to a React/Vite
> web app. `src/` is kept empty rather than deleted so this diagram's shape
> doesn't need re-churning again if that changes; new web app code goes in
> `src-web/`.
