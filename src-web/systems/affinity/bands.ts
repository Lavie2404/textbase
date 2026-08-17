/**
 * gdd-03 PART 1, 1.3 - the 7 attitude bands and the `deep_hostile` flag.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.3 band table, CR#5 "deep hostility is inclusive"),
 * production/gdd-integration/plan.md decision C-6 (Song Tu keeps its own
 * `affinity >= 80` gate in `handleSongTu`; the bands are additive and must not
 * be re-used as a gate for it).
 *
 * The band is a PURE VIEW over the stored integer - never persisted, never a
 * state machine. The AI prompt receives the band name plus a direction of
 * change, never the raw number (gdd-03 1.3, AC-37b).
 *
 * Player-facing strings are Vietnamese by project language policy.
 */

import type { AttitudeBand } from '../types';
import { AFFINITY_MAX, AFFINITY_MIN, DEEP_HOSTILITY_THRESHOLD } from '../registry';

export interface AttitudeBandRange {
  band: AttitudeBand;
  min: number;
  /** Whether `min` itself belongs to this band. */
  minInclusive: boolean;
  max: number;
  /** Whether `max` itself belongs to this band. */
  maxInclusive: boolean;
}

/**
 * gdd-03 1.3, in table order. Boundaries are exact and load-bearing:
 * `-80` IS deep hostility, `+40` is already "Thân thiết", `+80` is "Tri kỷ".
 */
export const ATTITUDE_BAND_RANGES: readonly AttitudeBandRange[] = [
  { band: 'Thù địch sâu sắc', min: AFFINITY_MIN, minInclusive: true, max: -80, maxInclusive: true },
  { band: 'Thù địch', min: -80, minInclusive: false, max: -40, maxInclusive: true },
  { band: 'Lạnh nhạt', min: -40, minInclusive: false, max: -10, maxInclusive: true },
  { band: 'Trung lập', min: -10, minInclusive: false, max: 10, maxInclusive: false },
  { band: 'Thiện cảm', min: 10, minInclusive: true, max: 40, maxInclusive: false },
  { band: 'Thân thiết', min: 40, minInclusive: true, max: 80, maxInclusive: false },
  { band: 'Tri kỷ', min: 80, minInclusive: true, max: AFFINITY_MAX, maxInclusive: true },
];

/** Pure view over the affinity integer (gdd-03 1.3). */
export function attitudeBand(affinity: number): AttitudeBand {
  const value = Number.isFinite(affinity) ? affinity : 0;
  for (const range of ATTITUDE_BAND_RANGES) {
    const aboveMin = range.minInclusive ? value >= range.min : value > range.min;
    const belowMax = range.maxInclusive ? value <= range.max : value < range.max;
    if (aboveMin && belowMax) return range.band;
  }
  // Out-of-range data (a corrupt save) resolves to the nearest end rather than
  // throwing: the card must still render.
  return value < 0 ? 'Thù địch sâu sắc' : 'Tri kỷ';
}

/**
 * `deep_hostile(npc) <=> affinity <= -80`, INCLUSIVE.
 * Death & Consequence reads this; it must never re-derive the threshold
 * (gdd-03 CR#5, AC-35).
 */
export function isDeepHostile(affinity: number): boolean {
  return (Number.isFinite(affinity) ? affinity : 0) <= DEEP_HOSTILITY_THRESHOLD;
}

/** Direction of change handed to the AI instead of a number (gdd-03 1.3). */
export type AttitudeDirection = 'đang ấm lên' | 'đang lạnh đi' | 'không đổi';

export function attitudeDirection(before: number, after: number): AttitudeDirection {
  if (after > before) return 'đang ấm lên';
  if (after < before) return 'đang lạnh đi';
  return 'không đổi';
}

/**
 * The single string the prompt builder may emit for an NPC relationship, e.g.
 * `"Lạnh nhạt, đang ấm lên"`. Contains no digits by construction.
 */
export function attitudeDescriptor(before: number, after: number): string {
  const direction = attitudeDirection(before, after);
  const band = attitudeBand(after);
  return direction === 'không đổi' ? band : band + ', ' + direction;
}

/** True when the turn moved the NPC across a band boundary. */
export function bandCrossed(before: number, after: number): boolean {
  return attitudeBand(before) !== attitudeBand(after);
}

/**
 * Vietnamese system message for a band crossing, or `null` when the band held.
 * Player-facing copy: Vietnamese (project language policy).
 */
export function bandCrossingMessage(
  npcName: string,
  before: number,
  after: number,
): string | null {
  if (!bandCrossed(before, after)) return null;
  const bandBefore = attitudeBand(before);
  const bandAfter = attitudeBand(after);
  const verb = after > before ? 'ấm lên' : 'lạnh đi';
  return (
    'Thái độ của **' +
    npcName +
    '** với ngươi đã ' +
    verb +
    ': **' +
    bandBefore +
    '** → **' +
    bandAfter +
    '**.'
  );
}
