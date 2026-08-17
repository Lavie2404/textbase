/**
 * Shared, deterministic fixtures for the NPC Affinity acceptance tests
 * (gdd-03 PART 1, 1.8 AC list).
 *
 * Nothing here reads a clock, a global or Math.random: affinity is a fully
 * deterministic pipeline (AC-02 asserts even the AI-call count is 0).
 */

import { AFFINITY_KNOBS } from '../../../src-web/systems/registry';
import type { AffinityKnobs, ClassifiedSocialEvent, SocialEventType } from '../../../src-web/systems/affinity/table';
import { emptyAffinityState, withLink, type AffinityState } from '../../../src-web/systems/affinity/state';
import type { NpcId } from '../../../src-web/systems/types';

export const PLAYER_ID = 'player_1';

/** gdd-03 1.3 MVP seed fixture (AC-01). */
export const MVP_SEED: Record<NpcId, number> = {
  npc_thu_dich: -85,
  npc_hao_cam: 60,
  npc_trung_lap: 0,
};

export function knobs(overrides: Partial<AffinityKnobs> = {}): AffinityKnobs {
  return { ...AFFINITY_KNOBS, ...overrides } as AffinityKnobs;
}

/** Affinity lookup backed by a plain record; unknown NPCs answer 0 (AC-30). */
export function affinityLookup(table: Record<NpcId, number>) {
  return (id: NpcId) => (typeof table[id] === 'number' ? table[id] : 0);
}

export function event(
  type: SocialEventType,
  target: NpcId,
  extra: Partial<ClassifiedSocialEvent> = {},
): ClassifiedSocialEvent {
  return {
    type,
    actor: PLAYER_ID,
    target,
    witnesses: [],
    ...extra,
  };
}

export function stateWithLinks(links: [NpcId, NpcId, number][]): AffinityState {
  let state = emptyAffinityState();
  for (const [a, b, strength] of links) {
    state = { ...state, links: withLink(state.links, a, b, strength) };
  }
  return state;
}

/**
 * The AC-20 regression fixture: the player kills NPC_B in front of witness A.
 * C is B's friend (link +0.7) and absent; D is B's enemy (link -0.6).
 */
export const AC20 = {
  victim: 'npc_b',
  witness: 'npc_a',
  friend: 'npc_c',
  enemy: 'npc_d',
  affinity: { npc_a: 10, npc_b: 0, npc_c: 40, npc_d: 20 } as Record<NpcId, number>,
  links: [
    ['npc_b', 'npc_c', 0.7],
    ['npc_b', 'npc_d', -0.6],
  ] as [NpcId, NpcId, number][],
};
