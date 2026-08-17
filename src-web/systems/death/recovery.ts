/**
 * gdd-03 PART 2, D.3 - recovery from the crippled state.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (2.4 D.3, AC-26..AC-31, AC-35, AC-43, AC-47).
 *
 * THREE RULES THAT ARE EASY TO GET WRONG
 * 1. The cost is ALWAYS paid, win or lose (the fortune event is consumed, the
 *    item loses an instance, self-cultivation stamps the cooldown).
 * 2. Calling this while blocked == false is REJECTED BEFORE any resource is
 *    spent - such an action must not even be offered in the suggestion list.
 * 3. Success is the ONLY code path that clears death_and_consequence_blocked
 *    (AC-47). The flag never expires on its own.
 *
 * PURITY: the RNG is injected; no clock, no I/O.
 */

import { clamp } from '../math';
import type { Rng } from '../types';
import { DEATH_ERROR, DeathError, type DeathKnobs } from './deathRoll';

export type RecoveryMethod = 'dai_co_duyen' | 'tien_thao_di_bao' | 'tu_tu';

/**
 * ASCII ids are used as the stored/serialised values (the GDD writes them with
 * diacritics: dai_co_duyen = "dai co duyen", tien_thao_di_bao =
 * "tien thao di bao", tu_tu = "tu tu"). Vietnamese labels for the UI live in
 * RECOVERY_METHOD_LABELS so no display string is ever a lookup key.
 */
export const RECOVERY_METHODS: readonly RecoveryMethod[] = [
  'dai_co_duyen',
  'tien_thao_di_bao',
  'tu_tu',
];

export const RECOVERY_METHOD_LABELS: Record<RecoveryMethod, string> = {
  dai_co_duyen: 'Đại Cơ Duyên',
  tien_thao_di_bao: 'Tiên Thảo Dị Bảo',
  tu_tu: 'Tự Tu Hồi Phục',
};

export type RecoveryRejection =
  | 'not_crippled'
  | 'invalid_method'
  | 'self_cooldown'
  | 'missing_item_efficacy';

/**
 * P_recovery(method, character). Returns null when the method is invalid - the
 * caller must then reject WITHOUT consuming anything.
 */
export function recoveryProbability(
  method: RecoveryMethod | string,
  knobs: DeathKnobs,
  itemEfficacy?: number,
): number | null {
  if (method === 'dai_co_duyen') return knobs.RECOVERY_FORTUNE_RATE;
  if (method === 'tu_tu') return knobs.RECOVERY_SELF_RATE;
  if (method === 'tien_thao_di_bao') {
    if (typeof itemEfficacy !== 'number' || !Number.isFinite(itemEfficacy)) return null;
    return clamp(itemEfficacy, knobs.RECOVERY_ITEM_MIN, knobs.RECOVERY_ITEM_MAX);
  }
  return null;
}

/**
 * recovery_self_attempt_allowed: never attempted before, or at least
 * RECOVERY_SELF_COOLDOWN_TURNS have passed. The boundary is inclusive
 * (100 - 95 = 5 with a cooldown of 5 IS allowed - AC-30).
 */
export function recoverySelfAllowed(
  lastSelfAttemptTurn: number | null | undefined,
  currentTurn: number,
  knobs: DeathKnobs,
): boolean {
  if (lastSelfAttemptTurn === null || lastSelfAttemptTurn === undefined) return true;
  return currentTurn - lastSelfAttemptTurn >= knobs.RECOVERY_SELF_COOLDOWN_TURNS;
}

export interface RecoveryAttemptInput {
  method: RecoveryMethod | string;
  /** Current death_and_consequence_blocked for the character. */
  blocked: boolean;
  currentTurn: number;
  lastSelfAttemptTurn?: number | null;
  /** efficacy(item) in [0,1] from Equipment and Skill Data. */
  itemEfficacy?: number;
  rng: Rng;
  knobs: DeathKnobs;
}

export interface RecoveryAttemptResult {
  accepted: boolean;
  rejected_reason: RecoveryRejection | null;
  p_recovery: number | null;
  roll: number | null;
  success: boolean;
  /** True when a resource must be consumed by its owning system. */
  cost_paid: boolean;
  /** New value for last_self_attempt_turn (unchanged unless self-cultivation). */
  last_self_attempt_turn: number | null;
  /** New value for death_and_consequence_blocked. */
  blocked_after: boolean;
}

function rejection(reason: RecoveryRejection, input: RecoveryAttemptInput): RecoveryAttemptResult {
  return {
    accepted: false,
    rejected_reason: reason,
    p_recovery: null,
    roll: null,
    success: false,
    cost_paid: false,
    last_self_attempt_turn: input.lastSelfAttemptTurn ?? null,
    blocked_after: input.blocked,
  };
}

/**
 * D.3. Rejections happen before any roll and before any cost; acceptances
 * always pay the cost, whatever the roll says.
 */
export function attemptRecovery(input: RecoveryAttemptInput): RecoveryAttemptResult {
  if (typeof input.rng !== 'function') {
    throw new DeathError(
      DEATH_ERROR.RNG_REQUIRED,
      'recovery_attempt requires an injected Rng (gdd-03 AC-48)',
    );
  }
  // AC-35: rejected BEFORE any cost when the character is not crippled.
  if (!input.blocked) return rejection('not_crippled', input);

  if (!RECOVERY_METHODS.includes(input.method as RecoveryMethod)) {
    return rejection('invalid_method', input);
  }
  if (
    input.method === 'tu_tu' &&
    !recoverySelfAllowed(input.lastSelfAttemptTurn, input.currentTurn, input.knobs)
  ) {
    // AC-31: blocked before any roll or state change.
    return rejection('self_cooldown', input);
  }

  const p = recoveryProbability(input.method, input.knobs, input.itemEfficacy);
  if (p === null) return rejection('missing_item_efficacy', input);

  const roll = input.rng();
  const success = roll < p;

  return {
    accepted: true,
    rejected_reason: null,
    p_recovery: p,
    roll,
    success,
    // The cost is paid win or lose (AC-27, AC-28, AC-29).
    cost_paid: true,
    last_self_attempt_turn:
      input.method === 'tu_tu' ? input.currentTurn : (input.lastSelfAttemptTurn ?? null),
    blocked_after: !success,
  };
}
