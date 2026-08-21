/**
 * Persisted state owned by NPC Affinity: the D.3 streak trackers and the static
 * `link_strength` graph used by D.5.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.3 state model, 1.7 "Persistence serialises: affinity table, streak
 * trackers, link_strength graph"), production/gdd-integration/plan.md P2.
 *
 * WHERE IT LIVES IN THE APP
 * `knowledge.affinityState`. The affinity VALUES themselves stay where they
 * already are (`character.affinity`) - this module never duplicates them, which
 * is CR#1 "exactly one value per NPC".
 *
 * OLD SAVES: `ensureAffinityState` lazily builds an empty, valid state, so a
 * save written before P2 keeps loading (plan.md E.5).
 */

import type { NpcId } from '../types';
import type { StreakTable } from './fatigue';

/**
 * `link_strength[a][b] ∈ [-1, +1]`: how strongly `b` cares about what happens to
 * `a`. Negative means `b` is `a`'s enemy and is PLEASED by harm done to `a`
 * (the sign inversion in D.5 is intended, not a bug).
 */
export type LinkGraph = Record<NpcId, Record<NpcId, number>>;

export interface AffinityState {
  /** Schema marker so a future migration can tell P2 data apart. */
  version: number;
  /** D.3 sliding-window trackers keyed by `(npc_id, event_type)`. */
  streaks: StreakTable;
  /** Static content data; the MVP ships it empty and lets play seed it. */
  links: LinkGraph;
}

export const AFFINITY_STATE_VERSION = 1;

export function emptyAffinityState(): AffinityState {
  return { version: AFFINITY_STATE_VERSION, streaks: {}, links: {} };
}

/**
 * Lazy-init/normalise whatever came out of an old save.
 * Never throws: a corrupt sub-field is replaced by an empty one, because a
 * missing streak table must not stop a session from loading.
 */
export function ensureAffinityState(raw: unknown): AffinityState {
  const source = (raw ?? {}) as Partial<AffinityState>;
  return {
    version: typeof source.version === 'number' ? source.version : AFFINITY_STATE_VERSION,
    streaks:
      source.streaks && typeof source.streaks === 'object' ? (source.streaks as StreakTable) : {},
    links: source.links && typeof source.links === 'object' ? (source.links as LinkGraph) : {},
  };
}

/** `link_strength(victim, npc)`; `0` (no link) when unknown. */
export function linkStrength(links: LinkGraph | null | undefined, from: NpcId, to: NpcId): number {
  const value = links?.[from]?.[to];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Every NPC with a non-zero link to `victim`, in stable id order. */
export function linkedNpcs(links: LinkGraph | null | undefined, victim: NpcId): NpcId[] {
  const row = links?.[victim];
  if (!row) return [];
  return Object.keys(row)
    .filter((id) => typeof row[id] === 'number' && Number.isFinite(row[id]) && row[id] !== 0)
    .sort();
}

/**
 * Returns a NEW graph with a symmetric link written both ways.
 * Content data is authored, not generated, so this exists mainly for tests and
 * for the setup screen seeding a hand-written relationship.
 */
export function withLink(
  links: LinkGraph | null | undefined,
  a: NpcId,
  b: NpcId,
  strength: number,
): LinkGraph {
  const clamped = strength < -1 ? -1 : strength > 1 ? 1 : strength;
  const next: LinkGraph = { ...(links ?? {}) };
  next[a] = { ...(next[a] ?? {}), [b]: clamped };
  next[b] = { ...(next[b] ?? {}), [a]: clamped };
  return next;
}
