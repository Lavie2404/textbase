/**
 * World Memory - Formula #1, recency window membership (gdd-04 A4).
 *
 * Design docs: production/gdd-integration/gdd-04-memory-canon.md A2 #5, A4
 * (Formula #1), A5, A8 (AC-05, AC-08, AC-09, AC-16, AC-32).
 *
 * Pure module: no I/O, no clock, no RNG.
 */
import { MEMORY_KNOBS } from '../registry';

/** gdd-04 A2 #5 / A5: absolute floor, so the only undoable turn is never demoted. */
export const RECENCY_WINDOW_FLOOR = 1;

/**
 * Applies the absolute floor of 1 to a configured `recency_window_turns`.
 *
 * A knob of 0 (or a negative/NaN misconfiguration) would let the newest turn be
 * compacted into facts while it is still undoable, which the GDD forbids
 * outright - so it is clamped up rather than rejected.
 */
export function effectiveRecencyWindow(
  recencyWindowTurns: number = MEMORY_KNOBS.recency_window_turns,
): number {
  if (!Number.isFinite(recencyWindowTurns)) return RECENCY_WINDOW_FLOOR;
  const floored = Math.floor(recencyWindowTurns);
  return floored < RECENCY_WINDOW_FLOOR ? RECENCY_WINDOW_FLOOR : floored;
}

/**
 * `in_window(turn_id) = (last_confirmed_turn_id - turn_id) < recency_window_turns`.
 *
 * gdd-04 A4: this is a one-way TRIGGER evaluated at the moment a new turn is
 * confirmed, NOT a live re-queryable predicate. `WorldMemory` therefore keeps an
 * eviction watermark and never re-evaluates this after an undo (AC-32).
 */
export function inWindow(
  turnId: number,
  lastConfirmedTurnId: number,
  recencyWindowTurns: number = MEMORY_KNOBS.recency_window_turns,
): boolean {
  return lastConfirmedTurnId - turnId < effectiveRecencyWindow(recencyWindowTurns);
}

/**
 * `turn_id_falls_out = last_confirmed_turn_id' - recency_window_turns`, where
 * `'` means AFTER the new confirm. Exactly one turn falls out per confirmed turn.
 *
 * The value may be <= 0 during the first turns of a game; callers must guard on
 * `>= 1` before extracting (AC-09).
 */
export function turnIdFallsOut(
  lastConfirmedTurnIdAfter: number,
  recencyWindowTurns: number = MEMORY_KNOBS.recency_window_turns,
): number {
  return lastConfirmedTurnIdAfter - effectiveRecencyWindow(recencyWindowTurns);
}

/** The `turn_id_falls_out >= 1` guard of Formula #1, as a named predicate. */
export function shouldExtract(turnIdFallingOut: number): boolean {
  return turnIdFallingOut >= 1;
}
