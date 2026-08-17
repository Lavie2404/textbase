/**
 * gdd-03 PART 1, D.4 - per-turn positive cap.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.4 D.4, AC-17).
 *
 * The cap applies ONLY to the positive part of an NPC's summed contributions:
 * `min(max(0, total), CAP) + min(0, total)`. A -27 total stays -27; a +21 total
 * becomes +20. Never write this as a symmetric clamp - that would silently
 * soften every hostile event.
 */

import type { AffinityKnobs } from './table';

/** D.4, on the pre-rounding float total for one NPC. */
export function capPositiveTotal(total: number, knobs: AffinityKnobs): number {
  return Math.min(Math.max(0, total), knobs.CAP_POSITIVE_PER_TURN) + Math.min(0, total);
}
