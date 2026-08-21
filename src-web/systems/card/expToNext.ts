/**
 * Character Card D.3 - `exp_to_next`, the protagonist-only EXP element of block 2.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART B, D.3, AC-18..AC-21), gdd-02 (EXP & Realm), plan.md decision C-4.
 *
 * The threshold curve is INJECTED (`ExpThresholdFn`). By default it is the
 * shipped app curve kept by decision C-4 (`expThreshold`), but the GDD's own
 * worked examples quote the linear curve, so tests inject `linearExpThreshold`
 * to reproduce the 340/290 anchors verbatim.
 *
 * Pure module: no React, no I/O, no RNG.
 */

import { expThreshold, type ExpThresholdFn } from '../exp/expThreshold';
import type { ProgressionState } from '../types';

/** The sentinel D.3 returns instead of a number. Player-facing (Vietnamese). */
export const AWAITING_BREAKTHROUGH = 'chờ đột phá';

export type ExpToNextResult = number | typeof AWAITING_BREAKTHROUGH;

/** Minimal projection the formula needs. */
export interface ExpProgress {
  level: number;
  current_exp: number;
}

/**
 * `is_awaiting_breakthrough(C) = (level mod 10 == 0) AND (current_exp >= exp_threshold(level))`.
 *
 * Both conjuncts matter: a round level alone is NOT enough (AC-20), and a full
 * bar on a non-round level is an ordinary level-up, not a breakthrough gate.
 */
export function isAwaitingBreakthrough(
  c: ExpProgress,
  thresholdFn: ExpThresholdFn = expThreshold,
): boolean {
  const level = Number(c?.level);
  const exp = Number(c?.current_exp);
  if (!Number.isFinite(level) || !Number.isFinite(exp)) return false;
  return level % 10 === 0 && exp >= thresholdFn(level);
}

/**
 * D.3. Returns the sentinel while awaiting a breakthrough, otherwise the EXP
 * remaining to the next level.
 *
 * The GDD notes the normal branch "never returns 0" - that is an emergent
 * property of a valid state (D.2b enforces `current_exp < threshold` on
 * non-round levels). Corrupt saves are clamped at 0 rather than going negative,
 * because the card must still render.
 */
export function expToNext(
  c: ExpProgress,
  thresholdFn: ExpThresholdFn = expThreshold,
): ExpToNextResult {
  if (isAwaitingBreakthrough(c, thresholdFn)) return AWAITING_BREAKTHROUGH;
  const level = Number(c?.level);
  const exp = Number(c?.current_exp);
  const threshold = thresholdFn(level);
  const remaining = threshold - exp;
  if (!Number.isFinite(remaining)) return 0;
  return remaining < 0 ? 0 : remaining;
}

/**
 * AC-21: the EXP element exists on the PROTAGONIST card only. Returning `null`
 * for an NPC lets `cardBlocks` omit the element without ever calling D.3
 * (the AC asserts a spy call count of 0).
 */
export function expToNextForCard(
  c: ExpProgress & { is_player?: boolean },
  thresholdFn: ExpThresholdFn = expThreshold,
): ExpToNextResult | null {
  if (c?.is_player !== true) return null;
  return expToNext(c, thresholdFn);
}

/** Player-facing label of block 2's EXP element (Vietnamese). */
export function expToNextLabel(
  c: ExpProgress,
  thresholdFn: ExpThresholdFn = expThreshold,
): string {
  const value = expToNext(c, thresholdFn);
  if (value === AWAITING_BREAKTHROUGH) return AWAITING_BREAKTHROUGH;
  return 'còn ' + formatExp(value) + ' EXP tới cấp kế';
}

/** Bar fill in [0, 1]. `1` while awaiting a breakthrough (the bar is full). */
export function expBarRatio(
  c: ExpProgress,
  thresholdFn: ExpThresholdFn = expThreshold,
): number {
  const threshold = thresholdFn(Number(c?.level));
  if (!Number.isFinite(threshold) || threshold <= 0) return 0;
  const exp = Number(c?.current_exp);
  if (!Number.isFinite(exp) || exp <= 0) return 0;
  const ratio = exp / threshold;
  return ratio > 1 ? 1 : ratio;
}

/**
 * The progression state the card should show. Derived, never stored on the card
 * - the authoritative value lives in EXP (gdd-02 D.7) and is passed through when
 * the caller has it.
 */
export function displayedProgressionState(
  c: ExpProgress,
  stored?: ProgressionState | null,
  thresholdFn: ExpThresholdFn = expThreshold,
): ProgressionState {
  if (stored === 'Chờ Đột Phá' || stored === 'Tu Luyện Thường') return stored;
  return isAwaitingBreakthrough(c, thresholdFn) ? 'Chờ Đột Phá' : 'Tu Luyện Thường';
}

/** Integers stay integers; fractional EXP keeps one decimal (float-native economy). */
function formatExp(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
