/**
 * gdd-03 PART 1, D.2 - diminishing returns on POSITIVE deltas only.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.4 D.2, CR#3 "diminishing, never decaying").
 *
 * Pure arithmetic. Negative deltas are never diminished: losing favour must stay
 * cheaper than gaining it, which is the whole point of the asymmetry.
 */

import { clamp } from '../math';
import { AFFINITY_MAX } from '../registry';
import type { AffinityKnobs } from './table';

/**
 * `diminish_factor(A) = clamp(1 - (max(0,A)/100)^EXP * (1 - FLOOR), FLOOR, 1)`.
 *
 * `A <= 0` yields exactly `1`: climbing out of hostility is never penalised
 * (gdd-03 D.2 and the "positive action while deeply hostile" edge case).
 * `DIMINISH_FLOOR` is validated `> 0` at load, so there is always room to
 * improve even at +99.
 */
export function diminishFactor(affinityBefore: number, knobs: AffinityKnobs): number {
  const positive = Math.max(0, affinityBefore);
  const ratio = positive / AFFINITY_MAX;
  const raw = 1 - Math.pow(ratio, knobs.DIMINISH_EXPONENT) * (1 - knobs.DIMINISH_FLOOR);
  return clamp(raw, knobs.DIMINISH_FLOOR, 1);
}

/**
 * Applies D.2 to a raw delta. Non-positive deltas pass through untouched
 * (gdd-03 CR#3 / AC-04).
 */
export function applyDiminish(
  rawDelta: number,
  affinityBefore: number,
  knobs: AffinityKnobs,
): number {
  if (rawDelta <= 0) return rawDelta;
  return rawDelta * diminishFactor(affinityBefore, knobs);
}
