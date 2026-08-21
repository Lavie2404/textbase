/**
 * gdd-03 PART 1, D.5 - one-hop, witness-gated social propagation.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.4 D.5 + its worked anchor, CR#4 "propagation requires a known perpetrator").
 *
 * HARD RULES ENCODED HERE
 * - One hop only: the loop reads `link_strength(victim, npc)` and NEVER the
 *   result another NPC just received.
 * - Witnesses are excluded from the linked loop so nobody is counted twice.
 * - Each NPC clamps later against its OWN `A_before`, so there is no chained
 *   clamp; this module therefore returns raw floats.
 * - The sign of the propagated delta FLIPS when `link_strength < 0` - the
 *   victim's enemies are pleased. Intended.
 * - Saturation gate: a living victim already at -100 yields a 0 direct delta, so
 *   propagation must stop too, otherwise repeating `threaten` on a saturated
 *   victim farms free positive affinity from that victim's enemies forever
 *   (AC-19b).
 *
 * DEVIATION (documented): D.5's pseudocode has a second loop granting witnesses
 * `base_delta + CRUELTY` for ANY qualifying event, while D.6 - the authoritative
 * pipeline - only distributes to witnesses for `kill_witnessed`. D.6 wins here;
 * witness handling lives in `resolveTurnAffinity` step B1.
 */

import { AFFINITY_MIN } from '../registry';
import type { NpcId } from '../types';
import { diminishFactor } from './diminish';
import { linkStrength, linkedNpcs, type LinkGraph } from './state';
import {
  perpetratorKnown,
  severityOf,
  type AffinityKnobs,
  type ClassifiedSocialEvent,
} from './table';

export interface PropagationContext {
  knobs: AffinityKnobs;
  links: LinkGraph | null | undefined;
  /** Start-of-turn affinity of any NPC. */
  affinityOf: (npcId: NpcId) => number;
  /** Death & Consequence owns `alive`; dead NPCs are skipped entirely (AC-32). */
  aliveOf?: (npcId: NpcId) => boolean;
}

/** Whether D.5 runs at all for this event (gdd-03 D.6 step B2 conditions). */
export function propagationAllowed(
  event: ClassifiedSocialEvent,
  base: number,
  ctx: PropagationContext,
): boolean {
  if (base >= 0) return false;
  if (severityOf(event, ctx.knobs) < ctx.knobs.PROPAGATION_SEVERITY_MIN) return false;
  if (!perpetratorKnown(event)) return false;
  // Saturation gate. Kills are exempt: an NPC can only die once.
  if (event.type !== 'kill_witnessed' && ctx.affinityOf(event.target) <= AFFINITY_MIN) return false;
  return true;
}

/**
 * D.5 total for ONE linked NPC, cruelty component included:
 * `raw_prop = base * PROPAGATION_RATE * link_strength(victim, npc)`, then D.2
 * (never D.3) when it came out positive, then `+ CRUELTY_REP_DELTA`.
 */
export function propagatedTotalFor(
  base: number,
  victim: NpcId,
  npc: NpcId,
  ctx: PropagationContext,
): number {
  const rawProp = base * ctx.knobs.PROPAGATION_RATE * linkStrength(ctx.links, victim, npc);
  const effective =
    rawProp > 0 ? rawProp * diminishFactor(ctx.affinityOf(npc), ctx.knobs) : rawProp;
  return effective + ctx.knobs.CRUELTY_REP_DELTA;
}

/**
 * All D.5 contributions of one event, keyed by NPC id. Returns `{}` when the
 * gate is closed. The caller sums these into its per-NPC contribution lists
 * before the single cap/round/clamp step.
 */
export function propagationContributions(
  event: ClassifiedSocialEvent,
  base: number,
  ctx: PropagationContext,
): Record<NpcId, number> {
  if (!propagationAllowed(event, base, ctx)) return {};

  const victim = event.target;
  const witnesses = new Set(event.witnesses);
  const alive = ctx.aliveOf ?? (() => true);
  const out: Record<NpcId, number> = {};

  for (const npc of linkedNpcs(ctx.links, victim)) {
    if (npc === victim) continue;
    if (witnesses.has(npc)) continue;
    if (!alive(npc)) continue;
    out[npc] = propagatedTotalFor(base, victim, npc, ctx);
  }
  return out;
}
