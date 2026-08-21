/**
 * gdd-02 D.5 - per-level / per-tier stat growth for the 12 Character Card stats.
 *
 * Design docs: production/gdd-integration/gdd-02-exp-equipment.md (PART A, D.5,
 * A3 "12 Character Card stats"), production/gdd-integration/plan.md decision C-5.
 *
 * FORMULA (gdd-02 D.5)
 *   stat_value(C, X)            = base_X0
 *                               + LEVEL_GROWTH_X       * (level(C) - 1)
 *                               + BREAKTHROUGH_BONUS_X * (tier(C)  - 1)
 *   percentage_stat_value(C, X) = clamp(stat_value(C, X), 0, PERCENT_STAT_CAP)
 *
 * DECISION C-5 (deliberate addition to the GDD)
 * The shipped game lets the player allocate AP (`allocatedPoints` +
 * `apConversionRates`, App.tsx :15226). Removing that would be a feature
 * regression, so plan.md C-5 keeps it as a fourth ADDITIVE term:
 *   stat_value = base_X0 + LEVEL_GROWTH*(L-1) + BREAKTHROUGH_BONUS*(tier-1) + AP_bonus
 * gdd-02 D.5 does not forbid additional terms. The AP term is passed in by the
 * caller (`apBonus`) and is applied BEFORE the percentage clamp, so an AP-heavy
 * build still cannot exceed `PERCENT_STAT_CAP`.
 *
 * STAT MAPPING (gdd-02 12 stats vs the shipped App.tsx stat block)
 * App.tsx characters carry `baseHp/baseAtk/baseDef/baseSpd/baseCr/baseCdmg/
 * baseDmgAmp/baseDmgRes/baseEvasion` (INITIAL_STATS :2116) - 9 fields. Nine of
 * the GDD's 12 map onto them; ACC, LIFESTEAL and HP_REGEN have NO App field and
 * are listed in `UNMAPPED_GDD_STATS`. They are still computed by this module
 * (the GDD owns the curve) but no App write target exists yet, so wiring them is
 * out of P1 scope; Character Card (phase P6) must add the fields first.
 *
 * SCALE WARNING - not a bug, a documented mismatch:
 * gdd-02 treats every percentage stat as a FRACTION in [0, 1] and clamps at
 * `PERCENT_STAT_CAP = 0.95`. App.tsx stores those same concepts in different
 * units: `baseCr = 15` means 15%, `baseCdmg = 200` means x2.0 crit damage, and
 * `baseDmgAmp/baseDmgRes/baseEvasion = 100` are 100-based multipliers, not
 * fractions. This module computes in GDD space (fractions) and exposes
 * `toAppScale` / `fromAppScale` for the conversion. Nothing here writes into
 * `calculateTrueBaseStats`; App.tsx keeps its own stat pipeline in P1.
 *
 * Pure module: no React, no I/O, no RNG.
 */

import { clamp, tierFromLevel } from '../math';
import {
  BREAKTHROUGH_BONUS,
  EXP_KNOBS,
  GDD_STAT_KEYS,
  LEVEL_GROWTH,
  PERCENT_STAT_KEYS,
  type GddStatKey,
} from '../registry';

export { GDD_STAT_KEYS, PERCENT_STAT_KEYS, type GddStatKey };

/** gdd-02 A5/D.5: percentage stats can never exceed this. */
export const PERCENT_STAT_CAP = EXP_KNOBS.PERCENT_STAT_CAP;

/** The 26 mandatory constants, minus the two threshold ones (gdd-02 A3). */
export interface StatGrowthConfig {
  levelGrowth: Record<GddStatKey, number>;
  breakthroughBonus: Record<GddStatKey, number>;
  percentStatCap: number;
}

export const DEFAULT_STAT_GROWTH_CONFIG: StatGrowthConfig = {
  levelGrowth: { ...LEVEL_GROWTH },
  breakthroughBonus: { ...BREAKTHROUGH_BONUS },
  percentStatCap: PERCENT_STAT_CAP,
};

/** Thrown when a required D.5 constant is missing (gdd-02 EC-8, never a silent 0). */
export class StatGrowthConfigError extends Error {
  readonly code = 'EXP_ERROR_MISSING_TUNING_CONSTANT';
  readonly missing_constant_name: string;

  constructor(missing: string) {
    super(
      'EXP_ERROR_MISSING_TUNING_CONSTANT: missing or non-numeric "' +
        missing +
        '" (gdd-02 EC-8: never default to 0)',
    );
    this.name = 'StatGrowthConfigError';
    this.missing_constant_name = missing;
  }
}

/** Fail-loud check that all 24 growth constants exist and are numeric. */
export function assertStatGrowthConfig(cfg: StatGrowthConfig): StatGrowthConfig {
  for (const stat of GDD_STAT_KEYS) {
    if (!Number.isFinite(cfg?.levelGrowth?.[stat])) {
      throw new StatGrowthConfigError('LEVEL_GROWTH_' + stat);
    }
    if (!Number.isFinite(cfg?.breakthroughBonus?.[stat])) {
      throw new StatGrowthConfigError('BREAKTHROUGH_BONUS_' + stat);
    }
  }
  if (!Number.isFinite(cfg?.percentStatCap)) {
    throw new StatGrowthConfigError('PERCENT_STAT_CAP');
  }
  return cfg;
}

/** True for the 8 stats gdd-02 A3 classifies as percentages. */
export function isPercentStat(stat: GddStatKey): boolean {
  return PERCENT_STAT_KEYS.includes(stat);
}

/**
 * gdd-02 D.5, uncapped. `tier - 1` is the number of successful breakthroughs.
 * `apBonus` is the decision C-5 additive term (0 for NPCs without AP).
 */
export function rawStatValue(
  stat: GddStatKey,
  base_X0: number,
  level: number,
  cfg: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
  apBonus = 0,
): number {
  const growth = cfg.levelGrowth[stat];
  const bonus = cfg.breakthroughBonus[stat];
  if (!Number.isFinite(growth)) throw new StatGrowthConfigError('LEVEL_GROWTH_' + stat);
  if (!Number.isFinite(bonus)) throw new StatGrowthConfigError('BREAKTHROUGH_BONUS_' + stat);

  const effectiveLevel = !Number.isFinite(level) || level < 1 ? 1 : level;
  const tier = tierFromLevel(effectiveLevel);
  return (
    (Number.isFinite(base_X0) ? base_X0 : 0) +
    growth * (effectiveLevel - 1) +
    bonus * (tier - 1) +
    (Number.isFinite(apBonus) ? apBonus : 0)
  );
}

/**
 * gdd-02 D.5 with the percentage clamp applied to the 8 percentage stats.
 * Raw stats (HP/ATK/DEF/SPD) are NEVER clamped (AC-25).
 */
export function statValue(
  stat: GddStatKey,
  base_X0: number,
  level: number,
  cfg: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
  apBonus = 0,
): number {
  const raw = rawStatValue(stat, base_X0, level, cfg, apBonus);
  return isPercentStat(stat) ? clamp(raw, 0, cfg.percentStatCap) : raw;
}

/** Computes all 12 stats at once. Missing `base_X0` entries default to 0. */
export function computeAllStats(
  base: Partial<Record<GddStatKey, number>>,
  level: number,
  cfg: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
  apBonus: Partial<Record<GddStatKey, number>> = {},
): Record<GddStatKey, number> {
  const out = {} as Record<GddStatKey, number>;
  for (const stat of GDD_STAT_KEYS) {
    out[stat] = statValue(stat, base[stat] ?? 0, level, cfg, apBonus[stat] ?? 0);
  }
  return out;
}

// ---------------------------------------------------------------------------
// App.tsx stat mapping
// ---------------------------------------------------------------------------

/** App.tsx `base*` field names (INITIAL_STATS :2116). */
export type AppStatKey =
  | 'baseHp'
  | 'baseAtk'
  | 'baseDef'
  | 'baseSpd'
  | 'baseCr'
  | 'baseCdmg'
  | 'baseDmgAmp'
  | 'baseDmgRes'
  | 'baseEvasion';

/**
 * gdd-02 stat -> App.tsx field. `null` means the App has no field for it yet.
 * See the SCALE WARNING at the top of this file before writing a value across.
 */
export const GDD_TO_APP_STAT: Record<GddStatKey, AppStatKey | null> = {
  HP: 'baseHp',
  ATK: 'baseAtk',
  DEF: 'baseDef',
  SPD: 'baseSpd',
  CRIT_RATE: 'baseCr',
  CRIT_DAMAGE: 'baseCdmg',
  ACC: null,
  EVASION: 'baseEvasion',
  LIFESTEAL: null,
  HP_REGEN: null,
  AMP: 'baseDmgAmp',
  MITIGATION: 'baseDmgRes',
};

/** The 3 GDD stats with no App.tsx counterpart (owner: Character Card, P6). */
export const UNMAPPED_GDD_STATS: readonly GddStatKey[] = GDD_STAT_KEYS.filter(
  (s) => GDD_TO_APP_STAT[s] === null,
);

/**
 * Multiplier turning a GDD-space value into the App's stored unit.
 * - raw stats: 1 (same unit)
 * - CRIT_RATE: App stores percentage POINTS (`baseCr = 15` means 15%) -> x100
 * - CRIT_DAMAGE / AMP / MITIGATION / EVASION: App stores 100-based multipliers
 *   (`baseCdmg = 200` means x2.0) -> x100
 */
export const APP_STAT_SCALE: Record<GddStatKey, number> = {
  HP: 1,
  ATK: 1,
  DEF: 1,
  SPD: 1,
  CRIT_RATE: 100,
  CRIT_DAMAGE: 100,
  ACC: 100,
  EVASION: 100,
  LIFESTEAL: 100,
  HP_REGEN: 100,
  AMP: 100,
  MITIGATION: 100,
};

/** GDD space -> App stored unit. */
export function toAppScale(stat: GddStatKey, gddValue: number): number {
  return gddValue * APP_STAT_SCALE[stat];
}

/** App stored unit -> GDD space. */
export function fromAppScale(stat: GddStatKey, appValue: number): number {
  return appValue / APP_STAT_SCALE[stat];
}

/**
 * Convenience projection: D.5 values for the 9 mapped stats, expressed in the
 * App's units and keyed by the App's field names. Nothing in P1 writes these -
 * `calculateTrueBaseStats` still owns the live stat pipeline - but the Character
 * Card work in P6 consumes this directly.
 */
export function computeAppStats(
  base: Partial<Record<GddStatKey, number>>,
  level: number,
  cfg: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
  apBonus: Partial<Record<GddStatKey, number>> = {},
): Partial<Record<AppStatKey, number>> {
  const gdd = computeAllStats(base, level, cfg, apBonus);
  const out: Partial<Record<AppStatKey, number>> = {};
  for (const stat of GDD_STAT_KEYS) {
    const appKey = GDD_TO_APP_STAT[stat];
    if (appKey) out[appKey] = toAppScale(stat, gdd[stat]);
  }
  return out;
}
