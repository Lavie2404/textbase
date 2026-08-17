/**
 * Character Card D.4 - `displayed_estimate`, the concealment-aware combat-power
 * readout of block 2.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART B, D.4, B6 comparison edge case, AC-22..AC-25, AC-34).
 *
 * D.4 reuses Combat D.13 VERBATIM (no fork); only the SOURCE of the 12 inputs
 * changes. Combat is out of scope for this project (plan.md), so the scoring
 * function is INJECTED - this module never re-implements it and never guesses a
 * weight. One missing stat poisons the whole sum, so the sentinel short-circuits
 * BEFORE the scoring function is called (AC-24 asserts a spy call count of 0).
 *
 * Pure module: no React, no I/O, no RNG.
 */

import type { GddStatKey } from '../registry';
import {
  COMBAT_STAT_FIELDS,
  CONCEALED_BADGE,
  UNKNOWN_SENTINEL,
  concealmentActive,
  displayedField,
  type CardCharacter,
  type DisplayFlags,
  DEFAULT_DISPLAY_FLAGS,
} from './displayedField';

/** Combat D.13's own sentinels, echoed verbatim and never re-derived. */
export const ESTIMATE_NA = 'N/A';
export const ESTIMATE_INFINITE = '+∞';

export interface EstimateDeps {
  /**
   * Combat D.13 `Diem_Chi_So` over the 12 stats. REQUIRED - injected as a mock in
   * tests and wired to the real combat helper in App.tsx.
   */
  statScore: (stats: Record<GddStatKey, number>) => number;
  /** Combat D.13 `Diem_Ky_Nang`. Defaults to 0 (gdd-06 B9 OQ#2: post-MVP). */
  skillScore?: number;
  /** Combat D.13 `Diem_Trang_Bi`. Defaults to 0. */
  equipScore?: number;
}

export type DisplayedEstimateResult =
  | { kind: 'number'; value: number; badge: string | null }
  | { kind: 'unknown'; value: typeof UNKNOWN_SENTINEL; badge: string };

/**
 * `stat_source(C, X) = displayed_field(C, X)` for the 12 combat stats.
 * A concealed stat with no surface value yields the sentinel string.
 */
export function statSources(
  c: CardCharacter,
  flags: DisplayFlags = DEFAULT_DISPLAY_FLAGS,
): Record<string, number | typeof UNKNOWN_SENTINEL> {
  const out: Record<string, number | typeof UNKNOWN_SENTINEL> = {};
  for (const stat of COMBAT_STAT_FIELDS) {
    const result = displayedField(c, stat, flags);
    if (result.kind === 'unknown') {
      out[stat] = UNKNOWN_SENTINEL;
      continue;
    }
    const raw = Number(result.value);
    out[stat] = Number.isFinite(raw) ? raw : UNKNOWN_SENTINEL;
  }
  return out;
}

/** True when at least one of the 12 stat sources resolved to the sentinel. */
export function hasUnknownStat(
  sources: Record<string, number | typeof UNKNOWN_SENTINEL>,
): boolean {
  return COMBAT_STAT_FIELDS.some((stat) => sources[stat] === UNKNOWN_SENTINEL);
}

/**
 * D.4.
 *
 * When concealment is active and any stat source is "???", return "???"
 * immediately WITHOUT calling the Combat formula - a partially-computed number
 * would silently mislead, whereas the sentinel is honest.
 *
 * When it resolves to a number under concealment it ALWAYS carries the badge:
 * the "this may not be true" signal is never hidden even though the number may
 * be false (gdd-06 B2 #6).
 */
export function displayedEstimate(
  c: CardCharacter,
  flags: DisplayFlags = DEFAULT_DISPLAY_FLAGS,
  deps?: EstimateDeps,
): DisplayedEstimateResult {
  const concealed = concealmentActive(c, flags);
  const sources = statSources(c, flags);

  if (concealed && hasUnknownStat(sources)) {
    return { kind: 'unknown', value: UNKNOWN_SENTINEL, badge: CONCEALED_BADGE };
  }
  if (hasUnknownStat(sources)) {
    // Not concealed but a stat is genuinely absent from the record: the same
    // honesty rule applies, without the concealment badge.
    return { kind: 'unknown', value: UNKNOWN_SENTINEL, badge: CONCEALED_BADGE };
  }
  if (!deps || typeof deps.statScore !== 'function') {
    // Combat is out of scope; with no scorer injected there is no number to show.
    return { kind: 'unknown', value: UNKNOWN_SENTINEL, badge: CONCEALED_BADGE };
  }

  const numeric = sources as Record<GddStatKey, number>;
  const total =
    Number(deps.statScore(numeric)) + Number(deps.skillScore ?? 0) + Number(deps.equipScore ?? 0);

  return {
    kind: 'number',
    value: total,
    badge: concealed ? CONCEALED_BADGE : null,
  };
}

export type EstimateRatioResult =
  | { kind: 'number'; value: number }
  | { kind: 'sentinel'; value: string };

/**
 * gdd-06 B6: where either side is "???" display "???" immediately and DO NOT
 * call `estimate_ratio` (it assumes numeric input). If both sides are numeric,
 * call it and echo its own sentinel verbatim if it hits 0/0.
 */
export function estimateRatioDisplay(
  self: DisplayedEstimateResult,
  opponent: DisplayedEstimateResult,
  estimateRatio?: (a: number, b: number) => number | string,
): EstimateRatioResult {
  if (self.kind === 'unknown' || opponent.kind === 'unknown') {
    return { kind: 'sentinel', value: UNKNOWN_SENTINEL };
  }
  if (typeof estimateRatio === 'function') {
    const raw = estimateRatio(self.value, opponent.value);
    return typeof raw === 'number'
      ? { kind: 'number', value: raw }
      : { kind: 'sentinel', value: String(raw) };
  }
  if (opponent.value === 0) {
    if (self.value === 0) return { kind: 'sentinel', value: ESTIMATE_NA };
    return { kind: 'sentinel', value: ESTIMATE_INFINITE };
  }
  return { kind: 'number', value: self.value / opponent.value };
}

/** Player-facing text for block 2 (Vietnamese). */
export function estimateLabel(result: DisplayedEstimateResult): string {
  const value = result.kind === 'number' ? formatEstimate(result.value) : UNKNOWN_SENTINEL;
  return result.badge ? value + ' (' + result.badge + ')' : value;
}

function formatEstimate(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
