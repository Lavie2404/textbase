/**
 * gdd-03 PART 1, D.1 - the event -> base_delta lookup table.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.4 D.1 "IN FULL", 1.5 knob table), production/gdd-integration/plan.md
 * decisions C-1 (the AI may report THAT a relationship moved, never by how much)
 * and C-6 (Song Tu stays out of scope; only the 7 attitude bands and the
 * `deep_hostile` threshold are added).
 *
 * PURITY CONTRACT: pure lookup + arithmetic. No RNG, no clock, no I/O, no AI.
 *
 * SIGN CONVENTION
 * gdd-03 D.1 writes rows like "`-INSULT_DELTA` = -8" while its own knob table
 * (1.5) already declares `INSULT_DELTA = -8`. Applying the minus twice would
 * turn insults into favours. This module treats every knob as ALREADY SIGNED
 * (registry.ts stores them signed) and never negates a knob.
 */

import type { CharId, EventSeverity, NpcId } from '../types';
import { safeDiv } from '../math';

/**
 * The D.1 event vocabulary. `song_tu_action` is deliberately absent:
 * [SONG-TU-ADAPT] - the shipped `handleSongTu` owns that interaction and is not
 * routed through this pipeline (plan.md C-6).
 */
export type SocialEventType =
  | 'gift'
  | 'small_help'
  | 'save_life'
  | 'combat_win_vs_npc'
  | 'combat_loss_vs_npc'
  | 'insult'
  | 'threaten'
  | 'betray'
  | 'kill_witnessed';

export const SOCIAL_EVENT_TYPES: readonly SocialEventType[] = [
  'gift',
  'small_help',
  'save_life',
  'combat_win_vs_npc',
  'combat_loss_vs_npc',
  'insult',
  'threaten',
  'betray',
  'kill_witnessed',
];

/** True for the three D.1 rows that carry a positive base delta. */
export function isPositiveEventType(type: SocialEventType): boolean {
  return type === 'gift' || type === 'small_help' || type === 'save_life';
}

/** The 21 gdd-03 1.5 tuning knobs. All of them live in `gameConfig.affinity`. */
export interface AffinityKnobs {
  GIFT_DELTA: number;
  SMALL_HELP_DELTA: number;
  SAVE_LIFE_DELTA: number;
  LOSS_VS_NPC_DELTA: number;
  COMBAT_WIN_BASE: number;
  COMBAT_WIN_MARGIN_SCALE: number;
  SEVERE_WIN_MARGIN_THRESHOLD: number;
  INSULT_DELTA: number;
  THREATEN_DELTA: number;
  BETRAY_DELTA: number;
  KILL_WITNESS_DELTA: number;
  DIMINISH_EXPONENT: number;
  DIMINISH_FLOOR: number;
  FATIGUE_RATE: number;
  FATIGUE_FLOOR: number;
  FATIGUE_WINDOW_TURNS: number;
  CAP_POSITIVE_PER_TURN: number;
  PROPAGATION_RATE: number;
  CRUELTY_REP_DELTA: number;
  PROPAGATION_SEVERITY_MIN: number;
  /** [SONG-TU-ADAPT]: kept for config parity, never read by this module. */
  SONG_TU_COOLDOWN_TURNS: number;
}

/** Names that MUST be present; a missing one is fail-loud, never a silent 0. */
export const REQUIRED_AFFINITY_KNOBS: readonly (keyof AffinityKnobs)[] = [
  'GIFT_DELTA',
  'SMALL_HELP_DELTA',
  'SAVE_LIFE_DELTA',
  'LOSS_VS_NPC_DELTA',
  'COMBAT_WIN_BASE',
  'COMBAT_WIN_MARGIN_SCALE',
  'SEVERE_WIN_MARGIN_THRESHOLD',
  'INSULT_DELTA',
  'THREATEN_DELTA',
  'BETRAY_DELTA',
  'KILL_WITNESS_DELTA',
  'DIMINISH_EXPONENT',
  'DIMINISH_FLOOR',
  'FATIGUE_RATE',
  'FATIGUE_FLOOR',
  'FATIGUE_WINDOW_TURNS',
  'CAP_POSITIVE_PER_TURN',
  'PROPAGATION_RATE',
  'CRUELTY_REP_DELTA',
  'PROPAGATION_SEVERITY_MIN',
  'SONG_TU_COOLDOWN_TURNS',
];

export const AFFINITY_ERROR = {
  MISSING_TUNING_CONSTANT: 'AFFINITY_ERROR_MISSING_TUNING_CONSTANT',
  UNKNOWN_EVENT_TYPE: 'AFFINITY_ERROR_UNKNOWN_EVENT_TYPE',
  MISSING_MARGIN_RATIO: 'AFFINITY_ERROR_MISSING_MARGIN_RATIO',
} as const;

export type AffinityErrorCode = (typeof AFFINITY_ERROR)[keyof typeof AFFINITY_ERROR];

/** Thrown by the affinity modules. `code` is the contract, not the message. */
export class AffinityError extends Error {
  readonly code: AffinityErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: AffinityErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(code + ': ' + message);
    this.name = 'AffinityError';
    this.code = code;
    this.details = details;
  }
}

/** Fail-loud knob check, run once at data load (mirrors gdd-02 EC-8's rule). */
export function assertAffinityKnobs(
  knobs: Partial<AffinityKnobs> | null | undefined,
): AffinityKnobs {
  const k = (knobs ?? {}) as Partial<AffinityKnobs>;
  for (const name of REQUIRED_AFFINITY_KNOBS) {
    const value = k[name];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new AffinityError(
        AFFINITY_ERROR.MISSING_TUNING_CONSTANT,
        'missing or non-numeric affinity tuning constant ' + String(name),
        { missing_constant_name: name },
      );
    }
  }
  return k as AffinityKnobs;
}

/**
 * One classified social event. Produced by `classifyFromTags.ts` (from what the
 * AI already emits) or by the combat hand-off; it NEVER carries a magnitude the
 * AI chose - only a `type` whose price is looked up here (plan.md C-1).
 */
export interface ClassifiedSocialEvent {
  type: SocialEventType;
  /** Who performed it. Usually the player character id. */
  actor: CharId;
  /** The affinity subject. For `kill_witnessed` this is the victim. */
  target: NpcId;
  /** `entities_in_scope \ {target}` (gdd-03 1.4 preamble). */
  witnesses: NpcId[];
  /** Mandatory for `combat_win_vs_npc`: winner hp_after / max_HP. */
  margin_ratio?: number;
  /** Narration/debug context only. Never parsed for numbers (gdd-01 B.2 R3). */
  reason?: string;
  /** Where the classification came from, for the QA log. */
  source?: 'relationship_tag' | 'combat_handoff' | 'death' | 'quest' | 'manual';
}

/**
 * `margin_ratio = float(hp_after) / max(max_HP, 1)`.
 *
 * The float cast and the denominator floor are both MANDATORY (gdd-03 preamble;
 * Part 1 AC-13b and Part 2 AC-40/AC-41 exist because both bugs shipped once).
 */
export function marginRatio(hpAfter: number, maxHp: number): number {
  return safeDiv(Number(hpAfter), Number(maxHp), 1);
}

/** D.1 combat-win sub-formula: `-(COMBAT_WIN_BASE + COMBAT_WIN_MARGIN_SCALE * m)`. */
export function combatWinDelta(margin: number, knobs: AffinityKnobs): number {
  return -(knobs.COMBAT_WIN_BASE + knobs.COMBAT_WIN_MARGIN_SCALE * margin);
}

/**
 * D.1 base delta, before D.2/D.3/D.4/D.5. Always a float; the single rounding
 * step happens once per NPC in D.6 step B3.
 *
 * `kill_witnessed` returns the PER-WITNESS delta (the victim is dead and has no
 * affinity left to move).
 */
export function baseDelta(event: ClassifiedSocialEvent, knobs: AffinityKnobs): number {
  switch (event.type) {
    case 'gift':
      return knobs.GIFT_DELTA;
    case 'small_help':
      return knobs.SMALL_HELP_DELTA;
    case 'save_life':
      return knobs.SAVE_LIFE_DELTA;
    case 'combat_loss_vs_npc':
      return knobs.LOSS_VS_NPC_DELTA;
    case 'insult':
      return knobs.INSULT_DELTA;
    case 'threaten':
      return knobs.THREATEN_DELTA;
    case 'betray':
      return knobs.BETRAY_DELTA;
    case 'kill_witnessed':
      return knobs.KILL_WITNESS_DELTA;
    case 'combat_win_vs_npc': {
      const margin = event.margin_ratio;
      if (typeof margin !== 'number' || !Number.isFinite(margin)) {
        throw new AffinityError(
          AFFINITY_ERROR.MISSING_MARGIN_RATIO,
          'combat_win_vs_npc requires a numeric margin_ratio (gdd-03 D.1)',
          { target: event.target },
        );
      }
      return combatWinDelta(margin, knobs);
    }
    default:
      throw new AffinityError(
        AFFINITY_ERROR.UNKNOWN_EVENT_TYPE,
        'unknown social event type ' + String((event as { type: string }).type),
        { type: (event as { type: string }).type },
      );
  }
}

/**
 * D.1 severity: `0` = positive (never propagates), `1..5` = negative.
 * `combat_win_vs_npc` is raised from 2 to 3 at `SEVERE_WIN_MARGIN_THRESHOLD`
 * (inclusive `>=`), which is exactly what makes a crushing win propagate.
 */
export function severityOf(event: ClassifiedSocialEvent, knobs: AffinityKnobs): EventSeverity {
  switch (event.type) {
    case 'gift':
    case 'small_help':
    case 'save_life':
      return 0;
    case 'combat_loss_vs_npc':
      return 1;
    case 'insult':
      return 2;
    case 'combat_win_vs_npc': {
      const margin = event.margin_ratio ?? 0;
      return margin >= knobs.SEVERE_WIN_MARGIN_THRESHOLD ? 3 : 2;
    }
    case 'threaten':
      return 3;
    case 'betray':
      return 4;
    case 'kill_witnessed':
      return 5;
    default:
      throw new AffinityError(
        AFFINITY_ERROR.UNKNOWN_EVENT_TYPE,
        'unknown social event type ' + String((event as { type: string }).type),
        { type: (event as { type: string }).type },
      );
  }
}

/**
 * `perpetrator_known = (|witnesses| >= 1) OR (victim_alive == true)`.
 *
 * Any non-kill event leaves a living victim who saw who did it, so only kills
 * can ever be anonymous. A witness-less kill is the "perfect crime" and is an
 * intentional, valid strategy (gdd-03 CR#4).
 */
export function perpetratorKnown(event: ClassifiedSocialEvent): boolean {
  if (event.witnesses.length >= 1) return true;
  return event.type !== 'kill_witnessed';
}
