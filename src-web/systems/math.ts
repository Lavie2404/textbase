/**
 * Numeric primitives shared by every deterministic system.
 *
 * Design docs: production/gdd-integration/plan.md (P0),
 * gdd-02 (EXP: tier derivation), gdd-03 1.4 (rounding convention).
 *
 * Pure functions only. No RNG, no clock, no I/O.
 */

/**
 * Round half away from zero: `+0.5 -> +1`, `-10.5 -> -11`.
 *
 * gdd-03 1.4 mandates this exact convention: affinity intermediates stay float
 * and are rounded exactly once per NPC per turn. JavaScript `Math.round` rounds
 * half UP (`-10.5 -> -10`), which is asymmetric for negative deltas - hostile
 * events would land one point softer than friendly ones of equal magnitude.
 */
export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) return value;
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Clamp `value` into `[min, max]`.
 *
 * Used by gdd-02 D.2 (tier multiplier), gdd-03 D.1 (death probability envelope)
 * and the affinity `[-100, +100]` scale. An inverted range (`min > max`) is a
 * caller bug, not something to silently absorb.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`clamp: inverted range [${min}, ${max}]`);
  }
  if (Number.isNaN(value)) return value;
  return value < min ? min : value > max ? max : value;
}

/**
 * Float division with a floored denominator.
 *
 * `margin_ratio`-style formulas divide by HP totals and level sums that can
 * legitimately reach 0 mid-turn (a downed actor, a level-0 fixture). The GDD
 * requires a float cast before dividing and a denominator floor of 1 so the
 * result is never Infinity or NaN (plan.md P0).
 *
 * @param floorValue Minimum magnitude of the denominator. Must be > 0.
 */
export function safeDiv(a: number, b: number, floorValue = 1): number {
  if (!(floorValue > 0)) {
    throw new RangeError(`safeDiv: floor must be > 0, got ${floorValue}`);
  }
  const numerator = Number(a);
  const raw = Number(b);
  // Floor by magnitude so a negative denominator keeps its sign.
  const denominator =
    Math.abs(raw) < floorValue ? (raw < 0 ? -floorValue : floorValue) : raw;
  return numerator / denominator;
}

/**
 * Cultivation tier derived from level: `floor((level - 1) / 10) + 1`.
 *
 * gdd-02 A3: `tier` is DERIVED and must never be persisted. Note the vocabulary
 * clash flagged in plan.md B.4: App.tsx `getRealmInfoFromLevel` calls this value
 * `realmIndex` and uses `tier` for the sub-level `((level-1) % 10) + 1`. The GDD
 * meaning wins inside `src-web/systems/`.
 *
 * Levels below 1 are a data bug; the function clamps the level to 1 so tier is
 * never 0 (gdd-02 EC-6: `tier = 0` is unreachable by design).
 */
export function tierFromLevel(level: number): number {
  const effectiveLevel = level < 1 || !Number.isFinite(level) ? 1 : Math.floor(level);
  return Math.floor((effectiveLevel - 1) / 10) + 1;
}
