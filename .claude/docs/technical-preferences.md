# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Platform**: Web app (browser) — React + Vite, no game engine (pivoted
  2026-08-14 from the original Godot 4.6 plan)
- **Language**: TypeScript / JavaScript
- **UI Framework**: React (function components + hooks)
- **Build Tool**: Vite
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI Integration**: Gemini API, called client-side with a user-supplied key
- **Rendering**: Standard DOM/CSS — no canvas/WebGL rendering pipeline

## Input & Platform

<!-- Written by /setup-engine. Read by /ux-design, /ux-review, /test-setup, /team-ui, and /dev-story -->
<!-- to scope interaction specs, test helpers, and implementation to the correct input methods. -->

- **Target Platforms**: Web, Mobile Web
- **Input Methods**: Keyboard/Mouse, Touch
- **Primary Input**: Touch/Mouse (mixed, responsive)
- **Gamepad Support**: None
- **Touch Support**: Full
- **Platform Notes**: UI must be responsive and support both tap and click; no hover-only interactions.

## Naming Conventions

- **Components**: PascalCase (e.g., `PlayerController`)
- **Variables/functions**: camelCase (e.g., `moveSpeed`)
- **Custom hooks**: camelCase, `use` prefix (e.g., `useCombatState`)
- **Files**: match export — PascalCase for component files, camelCase for
  utility/hook files (e.g., `PlayerController.tsx`, `combatFormulas.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_HEALTH`)

## Performance Budgets

- **Target Framerate**: 60 FPS for animated UI transitions
- **Frame Budget**: 16.6 ms
- **Bundle Size**: [TO BE CONFIGURED — set a target once first production build is measured]
- **Memory Ceiling**: [TO BE CONFIGURED — set once target device profile for Mobile Web is known]

## Testing

- **Framework**: [TO BE CONFIGURED — no JS/TS test runner set up yet; run `/test-setup` to scaffold one (e.g. Vitest)]
- **Minimum Coverage**: [TO BE CONFIGURED]
- **Required Tests**: Balance formulas (damage, EXP, economy), state machines, save/load round-trip

## Forbidden Patterns

<!-- Add patterns that should never appear in this project's codebase -->
- **Hardcoding secrets** (Firebase config, Gemini API key, GitHub token) directly
  in source: all must come from `import.meta.env.VITE_*` and live only in the
  gitignored `.env` — never committed, never inlined as a literal.
- **`eval()` / `new Function()`** on any AI- or user-supplied string: the app
  renders Gemini output and player input directly; treat both as untrusted.

## Allowed Libraries / Addons

<!-- Add approved third-party dependencies here -->
- `react`, `react-dom` — UI framework
- `firebase` — Auth, Firestore, Storage
- `vite`, `@vitejs/plugin-react` — build tooling

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]

## Engine Specialists

<!-- Written by /setup-engine when engine is configured. -->
<!-- Read by /code-review, /architecture-decision, /architecture-review, and team skills -->
<!-- to know which specialist to spawn for engine-specific validation. -->

<!-- No dedicated React/web specialist agent exists in this roster (2026-08-14).
     Routes to the generic programmer agents until/unless one is added. -->

- **Primary**: lead-programmer
- **Language/Code Specialist**: gameplay-programmer (game logic, state, formulas in `.ts`/`.tsx`)
- **UI Specialist**: ui-programmer (screens, modals, layout components)
- **Additional Specialists**: tools-programmer (Vite config, build tooling, dev scripts)
- **Routing Notes**: Invoke `lead-programmer` for architecture decisions, ADR validation, and cross-cutting code review. Invoke `gameplay-programmer` for combat/economy/progression logic and state management. Invoke `ui-programmer` for component structure, screen composition, and interaction wiring. Invoke `tools-programmer` for build/tooling changes (`vite.config.ts`, `package.json`, CI).

### File Extension Routing

<!-- Skills use this table to select the right specialist per file type. -->
<!-- If a row says [TO BE CONFIGURED], fall back to Primary for that file type. -->

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game/UI logic (`.tsx`, `.ts`) | gameplay-programmer or ui-programmer (by content) |
| Styling (`.css`) | ui-programmer |
| Build/tooling (`vite.config.ts`, `package.json`, `tsconfig.json`) | tools-programmer |
| CI/workflow files | devops-engineer |
| General architecture review | lead-programmer |
