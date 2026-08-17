/**
 * gdd-03 PART 2, D.2 - severity tier and its four consequence types.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (2.4 D.2, AC-21..AC-25), production/gdd-integration/plan.md decision C-11
 * (severe ships as the "Phe Dan Dien" long-term status, NOT as a combat
 * multiplier - Combat is out of scope).
 *
 * Subject of margin_ratio: Branch A = the opponent (the winner); Branch B spare
 * = the player (also the winner). Same formula, different subject - every
 * fixture states which.
 *
 * Player-facing consequence names are Vietnamese by project language policy.
 */

import type { DeathKnobs } from './deathRoll';

export type SeverityTier = 'mild' | 'medium' | 'severe';

/** The four consequence_type values of gdd-03 D.2. */
export const CONSEQUENCE_TYPE = {
  MILD: 'trọng thương',
  MEDIUM: 'sỉ nhục',
  MEDIUM_OVERRIDE_POISON: 'ép uống độc',
  SEVERE: 'phế đan điền/võ công',
} as const;

/** Content-authored per-NPC tag. medium_override defaults to null. */
export interface NpcTag {
  medium_override?: string | null;
  concealment_narrative_hint?: string | null;
}

/**
 * mild below SEVERITY_MILD_THRESHOLD, severe at or above
 * SEVERITY_SEVERE_THRESHOLD, medium in between.
 * forcedSevere (a surviving Branch A death roll) hard-forces severe, bypassing
 * the margin table entirely.
 */
export function severityTier(
  marginRatio: number,
  knobs: DeathKnobs,
  forcedSevere = false,
): SeverityTier {
  if (forcedSevere) return 'severe';
  const margin = Number.isFinite(marginRatio) ? marginRatio : 0;
  if (margin < knobs.SEVERITY_MILD_THRESHOLD) return 'mild';
  if (margin < knobs.SEVERITY_SEVERE_THRESHOLD) return 'medium';
  return 'severe';
}

/**
 * consequence_type(tier, npc_tag).
 *
 * The optional chaining on npc_tag?.medium_override is REQUIRED: the tag itself
 * can be null (a monster with no Character Card), not merely its override
 * field. The override only ever affects the medium tier (AC-25).
 */
export function consequenceType(tier: SeverityTier, npcTag?: NpcTag | null): string {
  if (tier === 'mild') return CONSEQUENCE_TYPE.MILD;
  if (tier === 'severe') return CONSEQUENCE_TYPE.SEVERE;
  return npcTag?.medium_override ?? CONSEQUENCE_TYPE.MEDIUM;
}

/** severe is the only tier that sets death_and_consequence_blocked. */
export function tierCripples(tier: SeverityTier): boolean {
  return tier === 'severe';
}
