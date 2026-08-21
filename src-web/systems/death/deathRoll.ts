/**
 * gdd-03 PART 2, D.1 - the death roll.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (2.4 D.1, 2.5 knob table, AC-16..AC-20, AC-48),
 * production/gdd-integration/plan.md decision C-7 (death_roll / severity /
 * crippled ARE implemented; permanent death and slot locking are NOT - the
 * shipped `handleRespawn` keeps its job).
 *
 * PURITY CONTRACT: the RNG is an INJECTED `Rng` (`() => [0,1)`). There is no
 * hidden global and no leakage between two stubs (AC-48).
 */

import { clamp } from '../math';
import type { Rng } from '../types';

/** The 12 gdd-03 2.5 tuning knobs; all of them live in `gameConfig.death`. */
export interface DeathKnobs {
  DEATH_ROLL_BASE: number;
  DEATH_ROLL_SCALE: number;
  DEATH_ROLL_MIN: number;
  DEATH_ROLL_MAX: number;
  SEVERITY_MILD_THRESHOLD: number;
  SEVERITY_SEVERE_THRESHOLD: number;
  RECOVERY_FORTUNE_RATE: number;
  RECOVERY_ITEM_MIN: number;
  RECOVERY_ITEM_MAX: number;
  RECOVERY_SELF_RATE: number;
  RECOVERY_SELF_COOLDOWN_TURNS: number;
  /**
   * gdd-03 2.5. DEVIATION (plan.md C-11): the combat multiplier branch is NOT
   * implemented because Combat is out of scope; the same weakening ships as the
   * "Phe Dan Dien" long-term status. Kept for config parity and tests.
   */
  CRIPPLED_PENALTY_MULT: number;
}

export const REQUIRED_DEATH_KNOBS: readonly (keyof DeathKnobs)[] = [
  'DEATH_ROLL_BASE',
  'DEATH_ROLL_SCALE',
  'DEATH_ROLL_MIN',
  'DEATH_ROLL_MAX',
  'SEVERITY_MILD_THRESHOLD',
  'SEVERITY_SEVERE_THRESHOLD',
  'RECOVERY_FORTUNE_RATE',
  'RECOVERY_ITEM_MIN',
  'RECOVERY_ITEM_MAX',
  'RECOVERY_SELF_RATE',
  'RECOVERY_SELF_COOLDOWN_TURNS',
  'CRIPPLED_PENALTY_MULT',
];

export const DEATH_ERROR = {
  MISSING_TUNING_CONSTANT: 'DEATH_ERROR_MISSING_TUNING_CONSTANT',
  INVALID_KNOB_ORDER: 'DEATH_ERROR_INVALID_KNOB_ORDER',
  RNG_REQUIRED: 'DEATH_ERROR_RNG_REQUIRED',
} as const;

export type DeathErrorCode = (typeof DEATH_ERROR)[keyof typeof DEATH_ERROR];

export class DeathError extends Error {
  readonly code: DeathErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: DeathErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(code + ': ' + message);
    this.name = 'DeathError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Fail-loud knob check including the three MIN<MAX invariants gdd-03 2.4 calls
 * mandatory (they are currently "safe only because the ranges do not overlap").
 */
export function assertDeathKnobs(knobs: Partial<DeathKnobs> | null | undefined): DeathKnobs {
  const k = (knobs ?? {}) as Partial<DeathKnobs>;
  for (const name of REQUIRED_DEATH_KNOBS) {
    const value = k[name];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new DeathError(
        DEATH_ERROR.MISSING_TUNING_CONSTANT,
        'missing or non-numeric death tuning constant ' + String(name),
        { missing_constant_name: name },
      );
    }
  }
  const ordered: [keyof DeathKnobs, keyof DeathKnobs][] = [
    ['DEATH_ROLL_MIN', 'DEATH_ROLL_MAX'],
    ['SEVERITY_MILD_THRESHOLD', 'SEVERITY_SEVERE_THRESHOLD'],
    ['RECOVERY_ITEM_MIN', 'RECOVERY_ITEM_MAX'],
  ];
  for (const [lo, hi] of ordered) {
    if ((k[lo] as number) >= (k[hi] as number)) {
      throw new DeathError(
        DEATH_ERROR.INVALID_KNOB_ORDER,
        String(lo) + ' must be < ' + String(hi) + ' (gdd-03 2.4 mandatory MIN<MAX invariants)',
        { lo, hi },
      );
    }
  }
  return k as DeathKnobs;
}

/** `P_death = clamp(BASE + SCALE * margin_ratio, MIN, MAX)`. */
export function deathProbability(marginRatio: number, knobs: DeathKnobs): number {
  const margin = Number.isFinite(marginRatio) ? marginRatio : 0;
  return clamp(
    knobs.DEATH_ROLL_BASE + knobs.DEATH_ROLL_SCALE * margin,
    knobs.DEATH_ROLL_MIN,
    knobs.DEATH_ROLL_MAX,
  );
}

export interface DeathRollResult {
  /** The clamped probability actually used. */
  p_death: number;
  /** The sample drawn from the injected RNG. */
  roll: number;
  /** `roll < p_death` - STRICT, so equality is survival (AC-20). */
  died: boolean;
}

/**
 * D.1. `margin_ratio` here is ALWAYS the opponent's (the winner's).
 * The comparison is strictly `<`: a roll exactly equal to `P` survives.
 */
export function rollDeath(marginRatio: number, rng: Rng, knobs: DeathKnobs): DeathRollResult {
  if (typeof rng !== 'function') {
    throw new DeathError(DEATH_ERROR.RNG_REQUIRED, 'death_roll requires an injected Rng (AC-48)');
  }
  const p_death = deathProbability(marginRatio, knobs);
  const roll = rng();
  return { p_death, roll, died: roll < p_death };
}
