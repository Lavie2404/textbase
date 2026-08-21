/**
 * EXP threshold curve, tier derivation and realm-name lookup.
 *
 * Design docs: production/gdd-integration/gdd-02-exp-equipment.md (PART A, D.1),
 * production/gdd-integration/plan.md decision C-4.
 *
 * DECISION C-4 (deviation from gdd-02 D.1, deliberate and recorded)
 * gdd-02 D.1 specifies a LINEAR curve
 * `exp_threshold(L) = BASE_EXP_THRESHOLD + EXP_THRESHOLD_INCREMENT * (L - 1)`.
 * The shipped game uses the super-linear curve of `calculateMaxExpForLevel`
 * (App.tsx :15220) and thousands of turns of existing saves depend on it, so
 * plan.md C-4 keeps the App curve as the single `exp_threshold()` and applies
 * every GDD rate (`RATE * exp_threshold(level)`) on top of it. The GDD itself
 * states that `BASE_EXP_THRESHOLD` / `EXP_THRESHOLD_INCREMENT` are display-only
 * and do not change real pacing, because `exp_threshold` cancels out of
 * `turns_per_level = 1 / RATE`. The economic invariants therefore survive the
 * substitution unchanged.
 *
 * The formula is still injectable: `expThreshold(level, formula)` takes the
 * shape of `GAME_CONFIG.expFormula` and defaults to it, and every consumer
 * accepts an `ExpThresholdFn` so the GDD's linear curve can be injected in the
 * acceptance tests that quote linear anchors (100 / 190 / 290 / 340).
 *
 * Pure module: no React, no I/O, no RNG.
 */

import { GAME_CONFIG } from '../../../gameConfig.js';
import { tierFromLevel } from '../math';

export { tierFromLevel };

/** Shape of `GAME_CONFIG.expFormula` (gameConfig.js section 3). */
export interface ExpFormulaConfig {
  base: number;
  levelExponent: number;
  realmMultiplier: number;
}

/** Any function mapping a level to the EXP required for the next level. */
export type ExpThresholdFn = (level: number) => number;

/** Fallback used when `GAME_CONFIG.expFormula` is missing a field. */
export const EXP_FORMULA_FALLBACK: ExpFormulaConfig = {
  base: 100,
  levelExponent: 1.5,
  realmMultiplier: 1.8,
};

/** The formula constants currently configured in gameConfig.js. */
export function defaultExpFormula(): ExpFormulaConfig {
  const cfg = (GAME_CONFIG as { expFormula?: Partial<ExpFormulaConfig> })?.expFormula ?? {};
  return {
    base: typeof cfg.base === 'number' ? cfg.base : EXP_FORMULA_FALLBACK.base,
    levelExponent:
      typeof cfg.levelExponent === 'number'
        ? cfg.levelExponent
        : EXP_FORMULA_FALLBACK.levelExponent,
    realmMultiplier:
      typeof cfg.realmMultiplier === 'number'
        ? cfg.realmMultiplier
        : EXP_FORMULA_FALLBACK.realmMultiplier,
  };
}

/**
 * `exp_threshold(level)` - EXP required to advance from `level` to `level + 1`.
 *
 * Byte-for-byte the same arithmetic as `calculateMaxExpForLevel` (App.tsx :15220):
 * `floor(base * level^levelExponent * realmMultiplier^floor((level-1)/10))`.
 * App.tsx delegates to this function so the two can never drift.
 *
 * Levels below 1 are a data bug; the level is clamped to 1 so the result stays
 * strictly positive (gdd-02 EC-8b: a threshold <= 0 risks an infinite cascade).
 */
export function expThreshold(level: number, formula: ExpFormulaConfig = defaultExpFormula()): number {
  const effectiveLevel = !Number.isFinite(level) || level < 1 ? 1 : level;
  const realmIndex = Math.floor((effectiveLevel - 1) / 10);
  return Math.floor(
    formula.base *
      Math.pow(effectiveLevel, formula.levelExponent) *
      Math.pow(formula.realmMultiplier, realmIndex),
  );
}

/**
 * The GDD's own linear curve (gdd-02 D.1), kept available for tests and for a
 * future migration. NOT used by the running game (decision C-4).
 */
export function linearExpThreshold(
  level: number,
  base = 100,
  increment = 10,
): number {
  const effectiveLevel = !Number.isFinite(level) || level < 1 ? 1 : level;
  return base + increment * (effectiveLevel - 1);
}

// ---------------------------------------------------------------------------
// Realm names
// ---------------------------------------------------------------------------

/** Overflow realm used once the authored realm list runs out (App.tsx :22791). */
export const OVERFLOW_REALM_NAME = 'Vô Định Cảnh';

/** Safety net used when no realm list was authored (App.tsx :22797). */
export const DEFAULT_REALM_NAMES: readonly string[] = [
  'Giai Đoạn 1',
  'Giai Đoạn 2',
  'Giai Đoạn 3',
  'Giai Đoạn 4',
  'Giai Đoạn 5',
  'Giai Đoạn 6',
  'Giai Đoạn 7',
  'Giai Đoạn 8',
  'Giai Đoạn 9',
  'Giai Đoạn 10',
];

export interface RealmInfo {
  /** Display name of the realm ("cảnh giới"). */
  realmName: string;
  /**
   * Sub-level inside the realm, `((level - 1) % 10) + 1`.
   * NOTE the vocabulary clash flagged in plan.md B.4: App.tsx calls this `tier`
   * while gdd-02 uses `tier` for the realm index. `tierFromLevel` is the GDD
   * meaning; `realmTier` is the App display meaning.
   */
  realmTier: number;
}

/**
 * Mirror of `getRealmInfoFromLevel` (App.tsx :22791), extracted so the naming
 * rule is testable without React.
 *
 * `realm_names` is `knowledge.realmProgressionList` - authored by the player or
 * written by the AI through the `[REALM_LIST]` tag. Entries may carry a
 * `" Tầng N"` suffix and stray quotes; both are stripped, then duplicates are
 * collapsed, exactly as App.tsx does.
 */
export function realmInfoFromLevel(
  level: number,
  realmNames?: readonly string[] | null,
): RealmInfo {
  const cleanRealmList = normalizeRealmNames(realmNames);
  const maxDefinedLevel = cleanRealmList.length * 10;

  if (level > maxDefinedLevel) {
    return {
      realmName: OVERFLOW_REALM_NAME,
      realmTier: Math.floor((level - 1 - maxDefinedLevel) / 10) + 1,
    };
  }

  const realmIndex = Math.floor((level - 1) / 10);
  return {
    realmName: cleanRealmList[realmIndex] || `Cảnh Giới ${realmIndex + 1}`,
    realmTier: ((level - 1) % 10) + 1,
  };
}

/** Strips `" Tầng N"` suffixes and quotes, then de-duplicates (App.tsx :22793). */
export function normalizeRealmNames(realmNames?: readonly string[] | null): string[] {
  if (Array.isArray(realmNames) && realmNames.length > 0) {
    const names = realmNames.map((item) =>
      String(item).replace(/"/g, '').split(' Tầng ')[0].trim(),
    );
    return [...new Set(names)];
  }
  return [...DEFAULT_REALM_NAMES];
}

/** Convenience: realm name only. */
export function realmNameFromLevel(
  level: number,
  realmNames?: readonly string[] | null,
): string {
  return realmInfoFromLevel(level, realmNames).realmName;
}
