# `src-web/systems/` — deterministic gameplay systems

## Purpose

This directory holds the GDD-specified game rules as **pure TypeScript**. Each
module is a deterministic function `resolve_*(input) -> locked_result` that can
be unit-tested without a browser, a network, or React. `App.tsx` (the 34k-line
monolith) calls into these modules at fixed hook points; the modules never call
back into it.

The design source is `production/gdd-integration/` (`plan.md` plus `gdd-01` …
`gdd-06`). Every constant and formula here cites the document it implements.

## Rules

1. **Pure TS only.** No `import React`, no `fetch`, no `localStorage`, no
   `IndexedDB`, no DOM. A module that needs one of those belongs in `App.tsx`
   behind an injected interface.
2. **Dependency injection for RNG, clock and storage.** `Math.random()` and
   `Date.now()` are forbidden inside this directory — take an `Rng` / `Clock`
   (see `types.ts`) as a parameter so every roll is reproducible in tests.
3. **No mutation of caller state.** Adapters and resolvers read their inputs and
   return new objects; `knowledge` is owned by `App.tsx`.
4. **Constants live in `registry.ts`, once.** Never re-literal a tuning value in
   a second file; import it. Cross-system invariants are asserted at load by
   `configValidation.ts`.
5. **Combat and Song Tu are out of scope** (`plan.md` § Phạm vi). They are read
   only through `adapters/combatAdapter.ts` and `adapters/songTuAdapter.ts`.
6. **Every module has unit tests** under `tests/unit/<system>/`, run with
   `npx vitest run`.

## Files (P0)

| File | Contents |
|---|---|
| `types.ts` | Shared vocabulary: `CharId`, `LockedResult`, `TurnRecord`, `Suggestion`, `CombatHandoff`, `UndoableSystem`, frozen field names (`outcome`, `death_flag_*`, `breakthrough_flag_*`, …) |
| `registry.ts` | Every shared constant, grouped (`EXP_KNOBS`, `AFFINITY_KNOBS`, `DEATH_KNOBS`, `AI_KNOBS`, `UI_KNOBS`, …) with its GDD citation |
| `math.ts` | `roundHalfAwayFromZero`, `clamp`, `safeDiv`, `tierFromLevel` |
| `configValidation.ts` | `validateSystemsConfig` (fail-loud, reports all violations) and `DEFAULT_SYSTEMS_CONFIG` |
| `adapters/combatAdapter.ts` | `toCombatHandoff(input, knowledge)` — read-only projection of Combat |
| `adapters/songTuAdapter.ts` | `getSongTuActiveNpcIds(knowledge)` — read-only projection of Song Tu |

## Hook points in `App.tsx`

P0 adds **no** call sites; the adapters are pure consumers. The following are the
agreed insertion points for later phases (line refs as of 2026-08-17):

| Hook | Line | Phase | Use |
|---|---|---|---|
| `processPlayerAction` | 27995 | P4 | capture undo snapshot, build the scene, lock the result before any AI call |
| `callGeminiAPI` | 24867 | P4 | single AI wrapper: timeout, safety settings, leak detection |
| `applyUpdates` reconciliation | 32135 | P1/P2 | apply `resolve_turn_exp`, `resolve_turn_affinity` |
| `applyUpdates` death branch | 31089 | P2 | route `[CHARACTER_DEATH]` through `resolveDeathConsequence` |
| `applyUpdates` relationship branch | 31877 | P2 | tag writes the standing text only; the number comes from the module |
| `finalizeCombatEnd` | 27618 | P2 | fixed order: `combatAdapter → death → affinity → exp` |
| `calculateMaxExpForLevel` | 15220 | P1 | delegate to `exp/expThreshold.ts` |
| `handleLevelUp` | 22839 | P1 | "Chờ Đột Phá" gate every 10 levels |
| `handleAutosave` | 32663 | P3 | `durability_confirmed` gate before the turn is confirmed |
| `GameplayScreen` | 9162 | P4/P6 | undo button, `input_locked`, live-window eviction |

## Testing

```
npx vitest run          # all unit tests
npx vite build          # bundle must stay green
npx tsc --noEmit        # type check (App.tsx is non-strict legacy)
```
