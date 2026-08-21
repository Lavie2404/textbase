/**
 * Shared, deterministic fixtures for the EXP & Realm Progression acceptance
 * tests (gdd-02 PART A, A8).
 *
 * gdd-02 A8 requires: fixed defaults, no randomness, and every external truth
 * (`locked_result.outcome`, `is_death_turn`, `SONG_TU_ACTIVE`,
 * `breakthrough_requirement_met`, `death_and_consequence_blocked`,
 * `turn.in_combat`) injected as a mock. Nothing here reads a clock or a global.
 *
 * THRESHOLD NOTE: every AC anchor in gdd-02 A8 (100 / 190 / 290 / 340) comes from
 * the GDD's LINEAR curve. The shipped game keeps its own super-linear curve
 * (decision C-4), so these tests inject the linear curve explicitly. That is the
 * whole point of `ExpDeps.expThreshold` being injectable - the rules under test
 * are the RATES and the GATE, which are curve-independent (gdd-02 D.1: the
 * threshold cancels out of `turns_per_level = 1 / RATE`).
 */

import { linearExpThreshold } from '../../../src-web/systems/exp/expThreshold';
import type {
  ExpDeps,
  ExpKnobs,
  ProgressionRecord,
  TurnView,
} from '../../../src-web/systems/exp/resolveTurnExp';
import {
  PROGRESSION_STATE_NORMAL,
  PROGRESSION_STATE_WAITING,
} from '../../../src-web/systems/exp/resolveTurnExp';
import type { CombatOutcome } from '../../../src-web/systems/types';

/** gdd-02 A5 defaults, verbatim. */
export const DEFAULT_KNOBS: ExpKnobs = {
  BASE_EXP_THRESHOLD: 100,
  EXP_THRESHOLD_INCREMENT: 10,
  PASSIVE_EXP_RATE: 0.001,
  LOSS_EXP_RATE: 0.04,
  WIN_EXP_BASE_FRACTION: 0.2,
  WIN_EXP_TIER_BONUS: 0.25,
  WIN_EXP_FLOOR_MULT: 0.3,
  WIN_EXP_CEIL_MULT: 3.0,
  SONG_TU_EXP_RATE: 0.0015,
  PERCENT_STAT_CAP: 0.95,
  TURN_EXP_CAP_FRACTION: 20,
  FREE_EVENT_EXP_CAP_FRACTION: 0.1,
  TAM_PHAP_EXP_MULTIPLIER_MAX: 3.0,
};

/** The GDD's D.1 linear curve: `100 + 10 * (level - 1)`. */
export const gddThreshold = (level: number): number => linearExpThreshold(level, 100, 10);

export function knobs(overrides: Partial<ExpKnobs> = {}): ExpKnobs {
  return { ...DEFAULT_KNOBS, ...overrides };
}

export function deps(overrides: Partial<ExpDeps> = {}): ExpDeps {
  return {
    knobs: DEFAULT_KNOBS,
    expThreshold: gddThreshold,
    opponentTier: () => 1,
    breakthroughRequirementMet: () => false,
    deathAndConsequenceBlocked: () => false,
    songTuActiveNpcIds: [],
    ...overrides,
  };
}

export function record(overrides: Partial<ProgressionRecord> = {}): ProgressionRecord {
  return {
    char_id: 'player',
    level: 25,
    exp: 0,
    state: PROGRESSION_STATE_NORMAL,
    exp_multiplier: 1.0,
    tam_phap_type: null,
    isPlayer: true,
    ...overrides,
  };
}

export function outcome(overrides: Partial<CombatOutcome> = {}): CombatOutcome {
  return { type: 'none', winner_id: null, loser_id: null, ...overrides };
}

/** An ordinary out-of-combat turn: passive + Song Tu only. */
export function idleTurn(overrides: Partial<TurnView> = {}): TurnView {
  return {
    in_combat: false,
    battle_active: false,
    is_death_turn: false,
    outcome: outcome(),
    ...overrides,
  };
}

/**
 * The battle-CONCLUDING turn: `battle_active = false` unlocks combat EXP while
 * `in_combat = true` keeps passive/Song Tu suppressed (gdd-02 Core Rule #2, A1).
 */
export function concludingTurn(o: CombatOutcome, overrides: Partial<TurnView> = {}): TurnView {
  return {
    in_combat: true,
    battle_active: false,
    is_death_turn: false,
    outcome: o,
    ...overrides,
  };
}

/** A turn in the middle of a battle: no source may tick at all. */
export function midBattleTurn(overrides: Partial<TurnView> = {}): TurnView {
  return {
    in_combat: true,
    battle_active: true,
    is_death_turn: false,
    outcome: outcome(),
    ...overrides,
  };
}

export { PROGRESSION_STATE_NORMAL, PROGRESSION_STATE_WAITING };

/** Floating-point comparison helper: the GDD anchors are exact to 1e-9. */
export const EPS = 1e-9;
