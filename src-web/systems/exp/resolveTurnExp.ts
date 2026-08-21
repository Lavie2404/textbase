/**
 * Deterministic per-turn EXP resolution: gdd-02 PART A, D.2 / D.3 / D.4 / D.6 /
 * D.7, plus the "Cho Dot Pha" breakthrough gate of Core Rules #4-#9.
 *
 * Design docs: production/gdd-integration/gdd-02-exp-equipment.md (PART A),
 * production/gdd-integration/plan.md decisions C-1 (EXP is computed by a
 * deterministic module, never scored by the AI) and C-4 (the App's EXP curve is
 * kept as `exp_threshold`).
 *
 * PURITY CONTRACT
 * No React, no fetch, no `Math.random`, no clock. Every external truth is
 * injected through `ExpDeps`: the threshold curve, the opponent tier lookup, the
 * `breakthrough_requirement_met` predicate, the `death_and_consequence_blocked`
 * predicate and the Song Tu id list (read from the P0 songTuAdapter by callers).
 * All functions return NEW records; nothing is mutated in place, which is what
 * makes the Rule 8 rollback a plain object copy.
 *
 * ASSUMPTIONS (documented per the P1 brief)
 * A1. `breakthrough_requirement_met` defaults to `() => true`. Its real owner is
 *     Setting & Canon Integration, which plan.md drops (phase P5 cancelled). A
 *     hard `false` default would make every decade level a permanent wall, so the
 *     default is inverted relative to gdd-02 A7 and the predicate stays injected.
 * A2. `death_and_consequence_blocked` defaults to `false`; its owner is phase P2.
 * A3. gdd-02 A9 #2 records that NOTHING caps a multi-level cascade if a future
 *     Tam Phap grants a large `exp_multiplier`. `TURN_EXP_CAP_FRACTION` is that
 *     missing safety valve, applied to the summed, multiplied gain (never per
 *     source). `0` disables it. It is a deviation ADDED to the GDD, not against it.
 */

import type {
  CharId,
  CombatHandoff,
  CombatOutcome,
  LockedFieldValue,
  ProgressionState,
} from '../types';
import {
  FIELD_PREFIX_BREAKTHROUGH_FLAG,
  FIELD_PREFIX_EXP_DELTA,
  lockedFieldName,
} from '../types';
import { clamp, tierFromLevel } from '../math';
import { expThreshold as appExpThreshold, type ExpThresholdFn } from './expThreshold';

// ---------------------------------------------------------------------------
// Error taxonomy (gdd-02 A3: compared by equality against a constant, never by
// string matching on the message; never a release-stripped assert)
// ---------------------------------------------------------------------------

export const EXP_ERROR = {
  OPPONENT_TIER_UNDEFINED: 'EXP_ERROR_OPPONENT_TIER_UNDEFINED',
  WIN_LOSS_INVARIANT_VIOLATED: 'EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED',
  MISSING_TUNING_CONSTANT: 'EXP_ERROR_MISSING_TUNING_CONSTANT',
  INVALID_THRESHOLD_CONFIG: 'EXP_ERROR_INVALID_THRESHOLD_CONFIG',
  ECONOMY_INVARIANT_MARGIN_VIOLATED: 'EXP_ERROR_ECONOMY_INVARIANT_MARGIN_VIOLATED',
} as const;

export type ExpErrorCode = (typeof EXP_ERROR)[keyof typeof EXP_ERROR];

/** Thrown by this module. `code` is the contract; the message is for humans. */
export class ExpError extends Error {
  readonly code: ExpErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: ExpErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(code + ': ' + message);
    this.name = 'ExpError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Tuning knobs
// ---------------------------------------------------------------------------

/** The gdd-02 A5 knob table, plus the two P1 additions documented above. */
export interface ExpKnobs {
  BASE_EXP_THRESHOLD: number;
  EXP_THRESHOLD_INCREMENT: number;
  PASSIVE_EXP_RATE: number;
  LOSS_EXP_RATE: number;
  WIN_EXP_BASE_FRACTION: number;
  WIN_EXP_TIER_BONUS: number;
  WIN_EXP_FLOOR_MULT: number;
  WIN_EXP_CEIL_MULT: number;
  SONG_TU_EXP_RATE: number;
  PERCENT_STAT_CAP: number;
  /** Safety valve, see assumption A3. Fraction of `exp_threshold(level)`; 0 = off. */
  TURN_EXP_CAP_FRACTION: number;
  /** Cap for the AI-scored `[ENCOUNTER_REWARD]` path (plan.md C-1). */
  FREE_EVENT_EXP_CAP_FRACTION: number;
  TAM_PHAP_EXP_MULTIPLIER_MAX: number;
}

/** Names that MUST be present; a missing one is fail-loud (gdd-02 EC-8). */
export const REQUIRED_EXP_KNOBS: readonly (keyof ExpKnobs)[] = [
  'BASE_EXP_THRESHOLD',
  'EXP_THRESHOLD_INCREMENT',
  'PASSIVE_EXP_RATE',
  'LOSS_EXP_RATE',
  'WIN_EXP_BASE_FRACTION',
  'WIN_EXP_TIER_BONUS',
  'WIN_EXP_FLOOR_MULT',
  'WIN_EXP_CEIL_MULT',
  'SONG_TU_EXP_RATE',
  'PERCENT_STAT_CAP',
];

/**
 * Fail-loud check of the knob block, run at data-load (gdd-02 EC-8/EC-8b/EC-9).
 * Throws `ExpError`. `configValidation.validateSystemsConfig` covers the same
 * ground for the whole cross-system config; this one exists so the EXP module is
 * self-contained and usable in isolation.
 */
export function assertExpKnobs(knobs: Partial<ExpKnobs> | null | undefined): ExpKnobs {
  const k = (knobs ?? {}) as Partial<ExpKnobs>;
  for (const name of REQUIRED_EXP_KNOBS) {
    const value = k[name];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ExpError(
        EXP_ERROR.MISSING_TUNING_CONSTANT,
        'missing or non-numeric tuning constant "' +
          String(name) +
          '" (gdd-02 EC-8: never default to 0)',
        { missing_constant_name: name },
      );
    }
  }
  if ((k.BASE_EXP_THRESHOLD as number) <= 0) {
    throw new ExpError(
      EXP_ERROR.INVALID_THRESHOLD_CONFIG,
      'BASE_EXP_THRESHOLD must be > 0, got ' + k.BASE_EXP_THRESHOLD + ' (gdd-02 EC-8b)',
    );
  }
  if ((k.EXP_THRESHOLD_INCREMENT as number) < 0) {
    throw new ExpError(
      EXP_ERROR.INVALID_THRESHOLD_CONFIG,
      'EXP_THRESHOLD_INCREMENT must be >= 0, got ' +
        k.EXP_THRESHOLD_INCREMENT +
        ' (gdd-02 EC-10)',
    );
  }
  if (
    (k.WIN_EXP_BASE_FRACTION as number) * (k.WIN_EXP_FLOOR_MULT as number) <
    (k.LOSS_EXP_RATE as number)
  ) {
    throw new ExpError(
      EXP_ERROR.WIN_LOSS_INVARIANT_VIOLATED,
      'WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT >= LOSS_EXP_RATE violated (' +
        k.WIN_EXP_BASE_FRACTION +
        ' * ' +
        k.WIN_EXP_FLOOR_MULT +
        ' < ' +
        k.LOSS_EXP_RATE +
        '): losing on purpose would become the higher-EV choice (gdd-02 D.2)',
    );
  }
  return k as ExpKnobs;
}

/**
 * gdd-02 D.1 economic invariant, checked across the whole published
 * `CONTENT_EXCHANGE_ESTIMATE` safe range rather than only its default.
 */
export function assertEconomyInvariant(
  knobs: ExpKnobs,
  exchangeEstimates: readonly number[],
  safeRange: readonly number[] = [15, 50],
): void {
  const required = 1.5 * (knobs.PASSIVE_EXP_RATE + knobs.SONG_TU_EXP_RATE);
  const lo = Math.min(...safeRange);
  const hi = Math.max(...safeRange);
  for (const estimate of exchangeEstimates) {
    if (!Number.isFinite(estimate) || estimate <= 0 || estimate < lo || estimate > hi) {
      throw new ExpError(
        EXP_ERROR.ECONOMY_INVARIANT_MARGIN_VIOLATED,
        'CONTENT_EXCHANGE_ESTIMATE=' +
          estimate +
          ' is outside the published safe range [' +
          lo +
          ', ' +
          hi +
          '] (gdd-02 D.1)',
        { estimate },
      );
    }
    const perExchange = knobs.WIN_EXP_BASE_FRACTION / estimate;
    if (perExchange < required) {
      throw new ExpError(
        EXP_ERROR.ECONOMY_INVARIANT_MARGIN_VIOLATED,
        'economy margin violated at CONTENT_EXCHANGE_ESTIMATE=' +
          estimate +
          ': ' +
          perExchange +
          ' < ' +
          required +
          ' - idling would outpace combat (gdd-02 D.1)',
        { estimate },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Per-character progression record (gdd-02 A3)
// ---------------------------------------------------------------------------

export const PROGRESSION_STATE_NORMAL: ProgressionState = 'Tu Luyện Thường';
export const PROGRESSION_STATE_WAITING: ProgressionState = 'Chờ Đột Phá';

export interface ProgressionRecord {
  char_id: CharId;
  level: number;
  exp: number;
  state: ProgressionState;
  tam_phap_id?: string | null;
  /** >= 1. `1.0` when no Tam Phap is active (gdd-02 EC-7). */
  exp_multiplier?: number;
  tam_phap_type?: 'đơn tu' | 'song tu' | null;
  /** True when `self` is the player; drives the self-relative Song Tu check (D.4). */
  isPlayer?: boolean;
}

/**
 * gdd-02 AC-49: a record is lazily created per `char_id` and never inherits
 * another character's dirtied values.
 */
export function initProgression(char_id: CharId, level = 1): ProgressionRecord {
  return {
    char_id,
    level: level < 1 ? 1 : level,
    exp: 0,
    state: PROGRESSION_STATE_NORMAL,
    tam_phap_id: null,
    exp_multiplier: 1.0,
    tam_phap_type: null,
  };
}

/** `tier` is DERIVED, never stored (gdd-02 Core Rule #1). */
export function tierOfRecord(record: Pick<ProgressionRecord, 'level'>): number {
  return tierFromLevel(record.level);
}

/** gdd-02 EC-7: no Tam Phap means exactly 1.0, with no null handling downstream. */
export function expMultiplierOf(record: ProgressionRecord): number {
  const raw = record.exp_multiplier;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 1) return 1.0;
  return raw;
}

// ---------------------------------------------------------------------------
// Turn view
// ---------------------------------------------------------------------------

/** Everything a turn must expose for D.6. Built from the P0 combat adapter. */
export interface TurnView {
  /** True on EVERY turn belonging to a battle, INCLUDING the concluding one. */
  in_combat: boolean;
  /** False on the concluding turn; that is when combat EXP resolves. */
  battle_active: boolean;
  is_death_turn: boolean;
  outcome: CombatOutcome;
}

/**
 * Projects a `CombatHandoff` (P0 adapter) onto the `TurnView` D.6 consumes.
 * `is_death_turn` is owned by Turn Manager / Death & Consequence (phase P2/P4),
 * so it is passed in explicitly and defaults to `false`.
 */
export function turnViewFromHandoff(handoff: CombatHandoff, isDeathTurn = false): TurnView {
  return {
    in_combat: handoff.in_combat,
    battle_active: handoff.battle_active,
    is_death_turn: isDeathTurn,
    outcome: handoff.outcome,
  };
}

/** A plain out-of-combat turn: the passive/Song Tu path only. */
export function idleTurnView(isDeathTurn = false): TurnView {
  return {
    in_combat: false,
    battle_active: false,
    is_death_turn: isDeathTurn,
    outcome: { type: 'none', winner_id: null, loser_id: null },
  };
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

/** The three D.2/D.3/D.4 source formulas, injectable so AC-30 can spy on them. */
export interface ExpFormulas {
  combatWinExp(self: ProgressionRecord, opponentTier: number, deps: ExpDeps): number;
  combatLossExp(self: ProgressionRecord, deps: ExpDeps): number;
  songTuExpBonus(self: ProgressionRecord, deps: ExpDeps): number;
}

export interface ExpDeps {
  knobs: ExpKnobs;
  /** Defaults to the App curve (decision C-4). */
  expThreshold?: ExpThresholdFn;
  /**
   * Tier of an arbitrary character id, used for the D.2 opponent term.
   * Returning `undefined` raises `EXP_ERROR_OPPONENT_TIER_UNDEFINED` (EC-1);
   * it is never null-coalesced to 0.
   */
  opponentTier?: (charId: CharId) => number | undefined;
  /** gdd-02 Core Rule #6; assumption A1 above explains the `true` default. */
  breakthroughRequirementMet?: (tier: number, self: ProgressionRecord) => boolean;
  /** gdd-02 Rule 9; owner is phase P2 (assumption A2). */
  deathAndConsequenceBlocked?: (self: ProgressionRecord) => boolean;
  /** From `songTuAdapter.getSongTuActiveNpcIds(knowledge)` (P0). */
  songTuActiveNpcIds?: readonly CharId[];
  /** Overridable for tests; defaults to the real formulas below. */
  formulas?: Partial<ExpFormulas>;
}

function thresholdFn(deps: ExpDeps): ExpThresholdFn {
  return deps.expThreshold ?? ((level: number) => appExpThreshold(level));
}

function requirementMet(deps: ExpDeps, tier: number, self: ProgressionRecord): boolean {
  const predicate = deps.breakthroughRequirementMet;
  return predicate ? predicate(tier, self) : true;
}

function blocked(deps: ExpDeps, self: ProgressionRecord): boolean {
  const predicate = deps.deathAndConsequenceBlocked;
  return predicate ? predicate(self) === true : false;
}

// ---------------------------------------------------------------------------
// D.2 - Combat win EXP
// ---------------------------------------------------------------------------

/**
 * `tier_multiplier = clamp(1 + WIN_EXP_TIER_BONUS * tier_diff, FLOOR, CEIL)`.
 * `tier_diff = tier(opponent) - tier(self)`; positive means punching up.
 */
export function winTierMultiplier(tierDiff: number, knobs: ExpKnobs): number {
  return clamp(
    1 + knobs.WIN_EXP_TIER_BONUS * tierDiff,
    knobs.WIN_EXP_FLOOR_MULT,
    knobs.WIN_EXP_CEIL_MULT,
  );
}

/** gdd-02 D.2. Always strictly positive because `WIN_EXP_FLOOR_MULT > 0`. */
export function combatWinExp(
  self: ProgressionRecord,
  opponentTier: number,
  deps: ExpDeps,
): number {
  if (typeof opponentTier !== 'number' || !Number.isFinite(opponentTier)) {
    // gdd-02 EC-1: a configuration bug, never a silent 0.
    throw new ExpError(
      EXP_ERROR.OPPONENT_TIER_UNDEFINED,
      'opponent Character Card has no usable tier (got ' +
        String(opponentTier) +
        ') - combat_win_exp cannot be computed (gdd-02 EC-1)',
      { char_id: self.char_id },
    );
  }
  const tierDiff = opponentTier - tierOfRecord(self);
  const multiplier = winTierMultiplier(tierDiff, deps.knobs);
  return deps.knobs.WIN_EXP_BASE_FRACTION * thresholdFn(deps)(self.level) * multiplier;
}

// ---------------------------------------------------------------------------
// D.3 - Combat loss EXP
// ---------------------------------------------------------------------------

/** gdd-02 D.3. Deliberately independent of the opponent's tier. */
export function combatLossExp(self: ProgressionRecord, deps: ExpDeps): number {
  return deps.knobs.LOSS_EXP_RATE * thresholdFn(deps)(self.level);
}

// ---------------------------------------------------------------------------
// D.4 - Song Tu bonus
// ---------------------------------------------------------------------------

/**
 * `SONG_TU_ACTIVE(self)` - a boolean AND of two conditions (gdd-02 D.4):
 * (a) self's Tam Phap is of type `"song tu"`, AND
 * (b) self is in an active Song Tu relationship with the player.
 *
 * Self-relative: for the player, (b) is "the active set is non-empty"; for an
 * NPC, (b) is "this NPC is in the set". The bonus NEVER scales with the number
 * of partners - `SONG_TU_ACTIVE` is 0 or 1, never a count.
 */
export function songTuActive(self: ProgressionRecord, deps: ExpDeps): boolean {
  if (self.tam_phap_type !== 'song tu') return false;
  const ids = deps.songTuActiveNpcIds ?? [];
  return self.isPlayer === true ? ids.length > 0 : ids.includes(self.char_id);
}

/** gdd-02 D.4. */
export function songTuExpBonus(self: ProgressionRecord, deps: ExpDeps): number {
  if (!songTuActive(self, deps)) return 0;
  return deps.knobs.SONG_TU_EXP_RATE * thresholdFn(deps)(self.level);
}

const DEFAULT_FORMULAS: ExpFormulas = { combatWinExp, combatLossExp, songTuExpBonus };

function formulasOf(deps: ExpDeps): ExpFormulas {
  const f = deps.formulas;
  if (!f) return DEFAULT_FORMULAS;
  return {
    combatWinExp: f.combatWinExp ?? DEFAULT_FORMULAS.combatWinExp,
    combatLossExp: f.combatLossExp ?? DEFAULT_FORMULAS.combatLossExp,
    songTuExpBonus: f.songTuExpBonus ?? DEFAULT_FORMULAS.songTuExpBonus,
  };
}

// ---------------------------------------------------------------------------
// D.6 - Per-turn EXP resolution (amount only)
// ---------------------------------------------------------------------------

export interface ExpBreakdown {
  raw_combat: number;
  raw_passive: number;
  raw_song_tu: number;
  raw_total: number;
  /** `raw_total * exp_multiplier`, before the per-turn safety cap. */
  multiplied: number;
  /** What `apply_exp_gain` actually receives. */
  final_gain: number;
  /** True when the per-turn safety valve trimmed the gain (assumption A3). */
  capped: boolean;
  /** Set when a global short-circuit fired; the three sources were not called. */
  short_circuit: 'none' | 'death_and_consequence_blocked' | 'is_death_turn';
}

function emptyBreakdown(short: ExpBreakdown['short_circuit']): ExpBreakdown {
  return {
    raw_combat: 0,
    raw_passive: 0,
    raw_song_tu: 0,
    raw_total: 0,
    multiplied: 0,
    final_gain: 0,
    capped: false,
    short_circuit: short,
  };
}

/**
 * gdd-02 D.6, amount only - it computes `final_gain` but does not apply it.
 * Both global short-circuits return at the very FIRST step, before D.2/D.3/D.4
 * are called at all (AC-30: no side effects).
 */
export function computeTurnExp(
  self: ProgressionRecord,
  turn: TurnView,
  deps: ExpDeps,
): ExpBreakdown {
  if (blocked(deps, self)) return emptyBreakdown('death_and_consequence_blocked');
  if (turn.is_death_turn) return emptyBreakdown('is_death_turn');

  const f = formulasOf(deps);
  const knobs = deps.knobs;

  let raw_combat = 0;
  if (turn.battle_active === false) {
    const outcome = turn.outcome;
    if (!outcome || outcome.type === 'none') {
      // gdd-02 AC-02b: `no_outcome` is an EXPLICIT zero, not a fallthrough.
      raw_combat = 0;
    } else if (outcome.winner_id != null && outcome.winner_id === self.char_id) {
      // gdd-02 Core Rule #11: keyed on winner_id, NEVER on outcome.type, which
      // combat-system.md defines relative to the player.
      const loserId = outcome.loser_id;
      const lookup = deps.opponentTier;
      const tier = loserId == null || !lookup ? undefined : lookup(loserId);
      if (typeof tier !== 'number' || !Number.isFinite(tier)) {
        throw new ExpError(
          EXP_ERROR.OPPONENT_TIER_UNDEFINED,
          'opponent "' + String(loserId) + '" has no tier on its Character Card (gdd-02 EC-1)',
          { char_id: self.char_id, opponent_id: loserId },
        );
      }
      raw_combat = f.combatWinExp(self, tier, deps);
    } else if (outcome.loser_id != null && outcome.loser_id === self.char_id) {
      raw_combat = f.combatLossExp(self, deps);
    }
    // ELSE: self was not a participant (multi-party future) -> 0.
  }

  let raw_passive = 0;
  let raw_song_tu = 0;
  if (turn.in_combat === false) {
    // gdd-02 Core Rule #2 "critical gate A1": passive and Song Tu must NEVER
    // tick on a turn belonging to a battle, including the concluding one.
    raw_passive = knobs.PASSIVE_EXP_RATE * thresholdFn(deps)(self.level);
    raw_song_tu = f.songTuExpBonus(self, deps);
  }

  const raw_total = raw_combat + raw_passive + raw_song_tu;
  // gdd-02 D.6: multiply the SUM exactly once, BEFORE any cap/cascade step.
  const multiplied = raw_total * expMultiplierOf(self);

  let final_gain = multiplied;
  let capped = false;
  const capFraction = knobs.TURN_EXP_CAP_FRACTION;
  if (typeof capFraction === 'number' && capFraction > 0) {
    const ceiling = capFraction * thresholdFn(deps)(self.level);
    if (final_gain > ceiling) {
      final_gain = ceiling;
      capped = true;
    }
  }

  return {
    raw_combat,
    raw_passive,
    raw_song_tu,
    raw_total,
    multiplied,
    final_gain,
    capped,
    short_circuit: 'none',
  };
}

// ---------------------------------------------------------------------------
// D.7 - Applying gain, the decade gate, executing a breakthrough
// ---------------------------------------------------------------------------

/** Guard against a pathological threshold curve producing an endless cascade. */
const MAX_CASCADE_ITERATIONS = 100000;

export interface ApplyGainResult {
  record: ProgressionRecord;
  levels_gained: number;
  /** True when this call moved the character INTO Cho Dot Pha. */
  entered_waiting: boolean;
  /** EXP discarded by the decade clamp (gdd-02 Rule 5: no banking). */
  wasted: number;
}

/**
 * gdd-02 D.7 `apply_exp_gain`.
 *
 * INVARIANT (gdd-02 "implementation hygiene note"): this function does not take
 * `turn` and does not look at `turn.in_combat`. That is only safe because its
 * single production call site is `resolveTurnExp`, which passes `final_gain = 0`
 * on every non-concluding in-combat turn. Any NEW call site must preserve that
 * property; the ENCOUNTER_REWARD hook in App.tsx calls it through
 * `applyFreeEventExp` below, which enforces the same short-circuits.
 */
export function applyExpGain(
  self: ProgressionRecord,
  final_gain: number,
  deps: ExpDeps,
): ApplyGainResult {
  // gdd-02 EC-8b: the assert must fire BEFORE the loop runs even once.
  if (!(deps.knobs.BASE_EXP_THRESHOLD > 0)) {
    throw new ExpError(
      EXP_ERROR.INVALID_THRESHOLD_CONFIG,
      'BASE_EXP_THRESHOLD must be > 0, got ' +
        deps.knobs.BASE_EXP_THRESHOLD +
        ' (gdd-02 EC-8b)',
    );
  }

  const threshold = thresholdFn(deps);
  const record: ProgressionRecord = { ...self };
  const startLevel = record.level;
  let entered_waiting = false;
  let wasted = 0;

  let current_exp = (record.exp ?? 0) + (Number.isFinite(final_gain) ? final_gain : 0);

  for (let i = 0; ; i++) {
    if (i > MAX_CASCADE_ITERATIONS) {
      throw new ExpError(
        EXP_ERROR.INVALID_THRESHOLD_CONFIG,
        'level-up cascade exceeded ' +
          MAX_CASCADE_ITERATIONS +
          ' iterations at level ' +
          record.level +
          '; the threshold curve is not monotone-positive',
      );
    }
    const t = threshold(record.level);
    if (!(t > 0)) {
      throw new ExpError(
        EXP_ERROR.INVALID_THRESHOLD_CONFIG,
        'exp_threshold(' + record.level + ') must be > 0, got ' + t + ' (gdd-02 EC-8b)',
      );
    }

    if (record.level % 10 !== 0) {
      // gdd-02 Rule 4 - ordinary level, surplus carries over and may cascade.
      if (current_exp >= t) {
        current_exp -= t;
        record.level += 1;
        continue;
      }
      break;
    }

    // gdd-02 Rule 5 - decade gate. Clamp EXACTLY at 100%, discard the surplus,
    // and never cascade past it.
    if (current_exp >= t) {
      wasted = current_exp - t;
      current_exp = t;
      if (record.state !== PROGRESSION_STATE_WAITING) entered_waiting = true;
      record.state = PROGRESSION_STATE_WAITING;
    }
    break;
  }

  record.exp = current_exp;
  return {
    record,
    levels_gained: record.level - startLevel,
    entered_waiting,
    wasted,
  };
}

export interface BreakthroughResult {
  record: ProgressionRecord;
  executed: boolean;
  /** Why it did not execute; useful for the player-facing "content gap" warning. */
  reason:
    | 'executed'
    | 'not_waiting'
    | 'death_and_consequence_blocked'
    | 'in_combat'
    | 'is_death_turn'
    | 'requirement_not_met';
}

/**
 * gdd-02 D.7 `try_execute_breakthrough`.
 *
 * gdd-02 Rule 9 / EC-5: when blocked, the Cho Dot Pha state is PRESERVED, never
 * downgraded; execution simply happens on the first turn after the flag clears,
 * re-evaluating the predicate at that moment.
 */
export function tryExecuteBreakthrough(
  self: ProgressionRecord,
  turn: TurnView,
  deps: ExpDeps,
): BreakthroughResult {
  if (self.state !== PROGRESSION_STATE_WAITING) {
    return { record: { ...self }, executed: false, reason: 'not_waiting' };
  }
  if (blocked(deps, self)) {
    return { record: { ...self }, executed: false, reason: 'death_and_consequence_blocked' };
  }
  if (turn.in_combat === true) {
    return { record: { ...self }, executed: false, reason: 'in_combat' };
  }
  if (turn.is_death_turn === true) {
    return { record: { ...self }, executed: false, reason: 'is_death_turn' };
  }
  if (!requirementMet(deps, tierOfRecord(self), self)) {
    return { record: { ...self }, executed: false, reason: 'requirement_not_met' };
  }

  // gdd-02 Rule 7: level +1 (tier follows automatically), exp resets to 0 - the
  // clamped ceiling does NOT carry over - and the state returns to normal. The
  // stat jump comes for free from D.5's BREAKTHROUGH_BONUS_X term.
  return {
    record: {
      ...self,
      level: self.level + 1,
      exp: 0,
      state: PROGRESSION_STATE_NORMAL,
    },
    executed: true,
    reason: 'executed',
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface TurnExpResult {
  char_id: CharId;
  before: { level: number; exp: number; state: ProgressionState };
  after: { level: number; exp: number; state: ProgressionState };
  record: ProgressionRecord;
  /** `exp` delta including the reset caused by a breakthrough. */
  exp_delta: number;
  /** The gain that was fed to `apply_exp_gain` (never negative). */
  exp_gain: number;
  breakthrough: boolean;
  entered_waiting: boolean;
  levels_gained: number;
  wasted: number;
  breakdown: ExpBreakdown;
}

/** gdd-02 D.6 - resolve and apply, without the breakthrough step. */
export function resolveTurnExp(
  self: ProgressionRecord,
  turn: TurnView,
  deps: ExpDeps,
): { record: ProgressionRecord; breakdown: ExpBreakdown; applied: ApplyGainResult } {
  const breakdown = computeTurnExp(self, turn, deps);
  const applied = applyExpGain(self, breakdown.final_gain, deps);
  return { record: applied.record, breakdown, applied };
}

/**
 * gdd-02 D.7 `process_character_turn` - the MANDATORY per-turn orchestrator.
 *
 * The breakthrough MUST run first (EC-2 / AC-33): the EXP earned this turn is
 * then measured against `exp_threshold(level + 1)`, not the old threshold.
 */
export function processCharacterTurn(
  self: ProgressionRecord,
  turn: TurnView,
  deps: ExpDeps,
): TurnExpResult {
  const before = { level: self.level, exp: self.exp, state: self.state };

  const bt = tryExecuteBreakthrough(self, turn, deps);
  const resolved = resolveTurnExp(bt.record, turn, deps);
  const record = resolved.record;

  return {
    char_id: self.char_id,
    before,
    after: { level: record.level, exp: record.exp, state: record.state },
    record,
    exp_delta: record.exp - before.exp,
    exp_gain: resolved.breakdown.final_gain,
    breakthrough: bt.executed,
    entered_waiting: resolved.applied.entered_waiting,
    levels_gained: record.level - before.level,
    wasted: resolved.applied.wasted,
    breakdown: resolved.breakdown,
  };
}

// ---------------------------------------------------------------------------
// Free-event ("world event") EXP - plan.md decision C-1
// ---------------------------------------------------------------------------

export interface FreeEventExpResult extends ApplyGainResult {
  /** What the caller asked for, before the cap. */
  requested: number;
  granted: number;
  capped: boolean;
}

/**
 * plan.md C-1 demotes the AI-scored `[ENCOUNTER_REWARD]` tag: it may still grant
 * EXP for free-form world events, but it is no longer an unbounded, sole EXP
 * source. The grant is capped at `FREE_EVENT_EXP_CAP_FRACTION * exp_threshold(level)`
 * per turn and routed through `apply_exp_gain`, so the decade gate applies to it
 * exactly as it does to the four deterministic sources.
 *
 * Rule 9 and `is_death_turn` short-circuit it as well, matching D.6.
 */
export function applyFreeEventExp(
  self: ProgressionRecord,
  requested: number,
  turn: TurnView,
  deps: ExpDeps,
): FreeEventExpResult {
  const noop = (): FreeEventExpResult => ({
    record: { ...self },
    levels_gained: 0,
    entered_waiting: false,
    wasted: 0,
    requested,
    granted: 0,
    capped: false,
  });

  if (!Number.isFinite(requested) || requested <= 0) return noop();
  if (blocked(deps, self)) return noop();
  if (turn.is_death_turn) return noop();

  const capFraction = deps.knobs.FREE_EVENT_EXP_CAP_FRACTION;
  let granted = requested;
  let capped = false;
  if (typeof capFraction === 'number' && capFraction > 0) {
    const ceiling = capFraction * thresholdFn(deps)(self.level);
    if (granted > ceiling) {
      granted = ceiling;
      capped = true;
    }
  }

  const applied = applyExpGain(self, granted, deps);
  return {
    record: applied.record,
    levels_gained: applied.levels_gained,
    entered_waiting: applied.entered_waiting,
    wasted: applied.wasted,
    requested,
    granted,
    capped,
  };
}

// ---------------------------------------------------------------------------
// LockedResult projection
// ---------------------------------------------------------------------------

/**
 * Projects turn results onto `LockedResult.fields` using the P0 field-name
 * constants: `exp_delta_<char_id>` and `breakthrough_flag_<char_id>`.
 * Zero deltas and false flags are omitted - World Memory treats "one non-zero
 * field = one fact" (gdd-04 A6).
 */
export function toLockedFields(
  results: readonly TurnExpResult[],
): Record<string, LockedFieldValue> {
  const fields: Record<string, LockedFieldValue> = {};
  for (const r of results) {
    if (r.exp_delta !== 0) {
      fields[lockedFieldName(FIELD_PREFIX_EXP_DELTA, r.char_id)] = r.exp_delta;
    }
    if (r.breakthrough) {
      fields[lockedFieldName(FIELD_PREFIX_BREAKTHROUGH_FLAG, r.char_id)] = true;
    }
  }
  return fields;
}
