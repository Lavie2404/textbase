/**
 * gdd-03 PART 1, D.6 - the per-turn affinity pipeline.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.4 D.6 pseudocode, 1.6 edge cases, 1.8 AC list),
 * production/gdd-integration/plan.md decisions C-1 (the AI never supplies the
 * number) and C-6 (Song Tu is out of scope; only the "NPC death ends it"
 * coupling is honoured).
 *
 * PURITY CONTRACT
 * No React, no fetch, no `Math.random`, no clock. Affinity values, aliveness and
 * the Song Tu id list are all INJECTED. Nothing is mutated: the updated tracker
 * state is returned, which makes the P4 undo a plain object swap.
 *
 * DEVIATION FROM D.6 (documented, deliberate)
 * D.6 assumes "0 or 1 event per turn". The shipped App can emit several
 * `[RELATIONSHIP_CHANGED]` tags plus a combat hand-off in the same turn, so this
 * function accepts a LIST. Consequences, all consistent with the GDD's own
 * "multiple contributions to the same NPC in one turn" edge case:
 *   - every event's D.2 uses the START-OF-TURN affinity (`A_before`), so order
 *     inside a turn cannot change the arithmetic;
 *   - D.3 streaks advance event by event, so two identical events in one turn
 *     fatigue the second one exactly as two consecutive turns would;
 *   - cap / round / clamp still run EXACTLY ONCE per NPC, after summing, so the
 *     "one field per NPC per turn" contract holds.
 */

import { clamp, roundHalfAwayFromZero } from '../math';
import { AFFINITY_MAX, AFFINITY_MIN } from '../registry';
import { FIELD_PREFIX_AFFINITY_DELTA, lockedFieldName, type AttitudeBand, type NpcId } from '../types';
import { attitudeBand, bandCrossed, isDeepHostile } from './bands';
import { applyDiminish } from './diminish';
import { applyFatigue, streakBefore, updateStreak } from './fatigue';
import { capPositiveTotal } from './perTurnCap';
import { propagationContributions } from './propagate';
import { ensureAffinityState, type AffinityState } from './state';
import {
  baseDelta,
  perpetratorKnown,
  severityOf,
  type AffinityKnobs,
  type ClassifiedSocialEvent,
} from './table';

export interface AffinityTurnInput {
  /** `current_turn` from the Turn Manager; drives the D.3 sliding window. */
  turn: number;
  /** 0..n classified events. An empty list returns an empty result (AC-02). */
  events: readonly ClassifiedSocialEvent[];
  knobs: AffinityKnobs;
  /** Trackers + link graph, normally `knowledge.affinityState`. */
  state: AffinityState | null | undefined;
  /** START-OF-TURN affinity of an NPC. Untracked NPCs answer `0` (AC-30). */
  affinityOf: (npcId: NpcId) => number;
  /** Death & Consequence owns `alive`. Defaults to "everyone is alive". */
  aliveOf?: (npcId: NpcId) => boolean;
  /**
   * Whether the id is a tracked NPC at all. A beast/monster opponent is not, and
   * an event aimed at one is silently dropped - not an error (AC-31).
   */
  isTrackedNpc?: (npcId: NpcId) => boolean;
  /** Display name, used only to build the Vietnamese system messages. */
  nameOf?: (npcId: NpcId) => string;
  /** [SONG-TU-ADAPT] from `songTuAdapter.getSongTuActiveNpcIds`. */
  songTuActiveNpcIds?: readonly NpcId[];
}

export interface AffinityChangeRecord {
  npc_id: NpcId;
  before: number;
  after: number;
  /** The value actually written; always `after - before`. */
  locked_delta: number;
  band_before: AttitudeBand;
  band_after: AttitudeBand;
  band_crossed: boolean;
  deep_hostile_before: boolean;
  deep_hostile_after: boolean;
}

export interface AffinityTurnResult {
  /** `affinity_delta_<npc_id>` locked fields, only for non-zero deltas. */
  fields: Record<string, number>;
  /** One entry per NPC that actually moved, in stable id order. */
  changes: AffinityChangeRecord[];
  /** New tracker/link state; the caller stores it back on `knowledge`. */
  state: AffinityState;
  /**
   * [SONG-TU-ADAPT] NPCs killed this turn that were Song Tu partners. The App
   * terminates the relationship (title removal) - the state machine of the GDD
   * is not implemented (plan.md C-6). Terminal: regaining affinity never revives it.
   */
  song_tu_ended_npc_ids: NpcId[];
  /** Events that were dropped, with the reason, for the QA log. */
  skipped: { event: ClassifiedSocialEvent; reason: string }[];
}

function emptyResult(state: AffinityState): AffinityTurnResult {
  return { fields: {}, changes: [], state, song_tu_ended_npc_ids: [], skipped: [] };
}

/**
 * D.6. Deterministic, allocation-only; safe to call every turn even with no
 * events (it then returns `{}` and leaves the trackers untouched).
 */
export function resolveTurnAffinity(input: AffinityTurnInput): AffinityTurnResult {
  const state = ensureAffinityState(input.state);
  const knobs = input.knobs;
  const events = input.events ?? [];
  if (events.length === 0) return emptyResult(state);

  const isTracked = input.isTrackedNpc ?? (() => true);
  const alive = input.aliveOf ?? (() => true);
  const songTuActive = new Set(input.songTuActiveNpcIds ?? []);

  let streaks = state.streaks;
  const contributions: Record<NpcId, number[]> = {};
  const songTuEnded: NpcId[] = [];
  const skipped: { event: ClassifiedSocialEvent; reason: string }[] = [];

  const contribute = (npcId: NpcId, value: number) => {
    if (!contributions[npcId]) contributions[npcId] = [];
    contributions[npcId].push(value);
  };

  for (const event of events) {
    if (!event || !event.target) {
      skipped.push({ event, reason: 'malformed_event' });
      continue;
    }
    if (!isTracked(event.target)) {
      // gdd-03 EC "combat opponent is not a tracked NPC": accepted, no fields.
      skipped.push({ event, reason: 'untracked_target' });
      continue;
    }

    const base = baseDelta(event, knobs);

    // --- B1: direct delta -------------------------------------------------
    if (event.type === 'kill_witnessed') {
      if (songTuActive.has(event.target) && !songTuEnded.includes(event.target)) {
        songTuEnded.push(event.target);
      }
      if (event.witnesses.length === 0) {
        // Perfect crime: zero fields for anyone, no cruelty reputation, and -
        // per D.6, which returns before `update_streak_trackers` - no streak.
        skipped.push({ event, reason: 'kill_without_witnesses' });
        continue;
      }
      for (const witness of event.witnesses) {
        if (witness === event.target) continue;
        if (!isTracked(witness) || !alive(witness)) continue;
        contribute(witness, base + knobs.CRUELTY_REP_DELTA);
      }
    } else {
      let raw = base;
      if (raw > 0) {
        const before = input.affinityOf(event.target);
        const streak = streakBefore(streaks, event.target, event.type, input.turn, knobs);
        raw = applyFatigue(applyDiminish(raw, before, knobs), streak, knobs);
      }
      contribute(event.target, raw);
    }

    // --- B2: one-hop propagation -----------------------------------------
    const propagated = propagationContributions(event, base, {
      knobs,
      links: state.links,
      affinityOf: input.affinityOf,
      aliveOf: alive,
    });
    for (const npcId of Object.keys(propagated)) {
      if (!isTracked(npcId)) continue;
      contribute(npcId, propagated[npcId]);
    }

    // Streak trackers advance even when the locked delta ends up 0 (AC-22).
    streaks = updateStreak(streaks, event.target, event.type, input.turn, knobs);
  }

  // --- B3: per-NPC cap / round / clamp, exactly once ----------------------
  const fields: Record<string, number> = {};
  const changes: AffinityChangeRecord[] = [];

  for (const npcId of Object.keys(contributions).sort()) {
    const total = contributions[npcId].reduce((sum, value) => sum + value, 0);
    const capped = capPositiveTotal(total, knobs);
    const rounded = roundHalfAwayFromZero(capped);
    const before = input.affinityOf(npcId);
    const after = clamp(before + rounded, AFFINITY_MIN, AFFINITY_MAX);
    const lockedDelta = after - before;
    if (lockedDelta === 0) continue;

    fields[lockedFieldName(FIELD_PREFIX_AFFINITY_DELTA, npcId)] = lockedDelta;
    changes.push({
      npc_id: npcId,
      before,
      after,
      locked_delta: lockedDelta,
      band_before: attitudeBand(before),
      band_after: attitudeBand(after),
      band_crossed: bandCrossed(before, after),
      deep_hostile_before: isDeepHostile(before),
      deep_hostile_after: isDeepHostile(after),
    });
  }

  return {
    fields,
    changes,
    state: { ...state, streaks },
    song_tu_ended_npc_ids: songTuEnded,
    skipped,
  };
}

/** Re-exported so `App.tsx` imports the whole D.6 surface from one place. */
export { perpetratorKnown, severityOf };
export type { AffinityKnobs, ClassifiedSocialEvent };
export type { AffinityState };
