/**
 * gdd-03 PART 1, D.3 - repetition fatigue over a sliding window.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.4 D.3, 1.3 state model `streak[npc_id][event_type]`).
 *
 * Pure functions over an immutable tracker table: every mutator returns a NEW
 * table so the Turn Manager undo (gdd-01, phase P4) is a plain object swap.
 *
 * Tracker key is the PAIR `(npc_id, event_type)`: alternating NPCs or event
 * types is deliberate diversification and is not penalised.
 */

import { clamp } from '../math';
import type { NpcId } from '../types';
import type { AffinityKnobs, SocialEventType } from './table';

export interface StreakEntry {
  /** Turn index of the most recent event of this `(npc, type)` pair. */
  last_event_turn: number;
  /** How many events have landed inside the current window, including the last. */
  streak: number;
}

/** `streak[npc_id][event_type]`. An absent entry means `streak_before = 0`. */
export type StreakTable = Record<NpcId, Record<string, StreakEntry>>;

/** `fatigue_factor(s) = clamp(1 - FATIGUE_RATE * s, FATIGUE_FLOOR, 1)`. */
export function fatigueFactor(streakBefore: number, knobs: AffinityKnobs): number {
  const raw = 1 - knobs.FATIGUE_RATE * Math.max(0, streakBefore);
  return clamp(raw, knobs.FATIGUE_FLOOR, 1);
}

/** Reads the tracker without mutating it. Missing entry -> `null`. */
export function readStreak(
  table: StreakTable | null | undefined,
  npcId: NpcId,
  type: SocialEventType,
): StreakEntry | null {
  const perNpc = table?.[npcId];
  const entry = perNpc?.[type];
  if (!entry || typeof entry.streak !== 'number' || typeof entry.last_event_turn !== 'number') {
    return null;
  }
  return entry;
}

/**
 * `streak_before` for an event landing on `turn`.
 *
 * Inside the window (`turn - last_event_turn <= FATIGUE_WINDOW_TURNS`) the
 * stored streak counts; outside it the streak has lapsed and the event is worth
 * full price again.
 */
export function streakBefore(
  table: StreakTable | null | undefined,
  npcId: NpcId,
  type: SocialEventType,
  turn: number,
  knobs: AffinityKnobs,
): number {
  const entry = readStreak(table, npcId, type);
  if (!entry) return 0;
  const gap = turn - entry.last_event_turn;
  return gap <= knobs.FATIGUE_WINDOW_TURNS ? entry.streak : 0;
}

/**
 * Applies D.3 to an already D.2-diminished delta. Non-positive deltas pass
 * through untouched, and propagated deltas must never be routed through here
 * (gdd-03 D.5 "NO D.3").
 */
export function applyFatigue(delta: number, streakBeforeValue: number, knobs: AffinityKnobs): number {
  if (delta <= 0) return delta;
  return delta * fatigueFactor(streakBeforeValue, knobs);
}

/**
 * Records the event in the tracker and returns a NEW table.
 *
 * Runs even when the locked delta ended up `0` (gdd-03 AC-22): the streak is a
 * record of the player's behaviour, not of its mechanical effect.
 */
export function updateStreak(
  table: StreakTable | null | undefined,
  npcId: NpcId,
  type: SocialEventType,
  turn: number,
  knobs: AffinityKnobs,
): StreakTable {
  const previous = readStreak(table, npcId, type);
  const inWindow =
    previous !== null && turn - previous.last_event_turn <= knobs.FATIGUE_WINDOW_TURNS;
  const nextStreak = inWindow ? previous.streak + 1 : 1;
  const base: StreakTable = table ? { ...table } : {};
  base[npcId] = { ...(base[npcId] ?? {}), [type]: { last_event_turn: turn, streak: nextStreak } };
  return base;
}
