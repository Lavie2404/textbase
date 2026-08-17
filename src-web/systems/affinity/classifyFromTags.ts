/**
 * Deterministic classifier: what the AI already emits -> the gdd-03 D.1 event
 * vocabulary.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (1.4 D.1, CR#2 "deltas only from classified events, zero AI calls"),
 * production/gdd-integration/plan.md decision C-1 (hybrid: the AI keeps writing
 * world CONTENT, but every mechanical NUMBER is owned by a module).
 *
 * WHAT THIS DOES AND DOES NOT TAKE FROM THE AI
 * - TAKES: which NPC, the free-text `Reason`/`Standing`, and - only as a last
 *   resort - the SIGN of the `AffinityChange` the AI suggested.
 * - NEVER TAKES: the magnitude. Every delta comes from the D.1 table.
 *
 * FALLBACK RULE (documented deviation, plan.md C-1)
 * When no keyword matches, the sign decides:
 *   `AffinityChange > 0` -> `minor_positive` -> priced as `small_help` (+3)
 *   `AffinityChange < 0` -> `minor_negative` -> priced as `insult` (-8)
 *   `AffinityChange == 0` / absent -> `neutral` -> no event at all.
 * `insult` carries severity 2, which is below `PROPAGATION_SEVERITY_MIN = 3`, so
 * a fallback classification can never trigger social propagation - a mis-parse
 * stays local by construction.
 *
 * PURITY: pure string/number work. No RNG, no clock, no I/O, no AI call.
 */

import type { CharId, NpcId } from '../types';
import type { CombatHandoff } from '../types';
import { isSparFriendlyCombatType } from '../adapters/combatAdapter';
import { marginRatio, type ClassifiedSocialEvent, type SocialEventType } from './table';

/** Re-exported so consumers import the event shape from the classifier they use. */
export type { ClassifiedSocialEvent, SocialEventType };

/** The three fallback labels named in the P2 brief. */
export type FallbackClassification = 'minor_positive' | 'minor_negative' | 'neutral';

/** Fallback label -> the D.1 row that prices it. `neutral` produces no event. */
export const FALLBACK_EVENT_TYPE: Record<
  Exclude<FallbackClassification, 'neutral'>,
  SocialEventType
> = {
  minor_positive: 'small_help',
  minor_negative: 'insult',
};

/**
 * Lower-cases and strips Vietnamese diacritics so keyword matching is stable
 * whatever accent form the model produced (`Xúc Phạm` == `xuc pham`).
 */
export function normalizeVietnamese(text: string): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

/**
 * Keyword table, evaluated IN ORDER: the gravest reading of an ambiguous
 * sentence wins, so "cứu mạng rồi sỉ nhục" classifies as the rescue, and
 * "phản bội" beats a co-occurring "giúp". Diacritic-free by construction.
 */
export const EVENT_KEYWORDS: readonly { type: SocialEventType; keywords: readonly string[] }[] = [
  {
    type: 'save_life',
    keywords: ['cuu mang', 'cuu song', 'cuu nguy', 'giai cuu', 'lieu minh cuu', 'cuu tinh mang'],
  },
  {
    type: 'betray',
    keywords: ['phan boi', 'boi tin', 'ban dung', 'phan trac', 'lua gat', 'tro mat'],
  },
  {
    type: 'threaten',
    keywords: ['de doa', 'doa nat', 'uy hiep', 'ham doa', 'ep buoc', 'tong tien'],
  },
  {
    type: 'insult',
    keywords: ['xuc pham', 'si nhuc', 'lang ma', 'nhuc ma', 'chui', 'khinh miet', 'mia mai', 'ha nhuc'],
  },
  {
    type: 'gift',
    keywords: ['tang', 'mon qua', 'qua tang', 'bieu', 'trao tang', 'hien tang'],
  },
  {
    type: 'small_help',
    keywords: ['giup do', 'giup', 'ho tro', 'chi diem', 'chua tri', 'cuu giup', 'hoan thanh nhiem vu'],
  },
];

/** Longest-keyword-first inside each row keeps `giup do` from being eaten by `giup`. */
export function matchEventKeyword(text: string): SocialEventType | null {
  const haystack = normalizeVietnamese(text);
  if (!haystack) return null;
  for (const row of EVENT_KEYWORDS) {
    for (const keyword of [...row.keywords].sort((a, b) => b.length - a.length)) {
      if (haystack.includes(keyword)) return row.type;
    }
  }
  return null;
}

/** The `[RELATIONSHIP_CHANGED …]` payload as `parseKeyValueString` returns it. */
export interface RelationshipTagInput {
  NPC?: string;
  Standing?: string;
  Reason?: string;
  AffinityChange?: string | number;
  affinityChange?: string | number;
}

export interface ClassifyContext {
  /** The acting character, normally the player id. */
  actor: CharId;
  /** Resolves an NPC display name to its `char_id`; `null` when unknown. */
  npcIdByName: (name: string) => NpcId | null;
  /** `entities_in_scope \ {target}`. Defaults to an empty scene. */
  witnesses?: NpcId[];
}

/** Sign of the number the AI suggested, used only by the fallback rule. */
export function fallbackFromSign(raw: unknown): FallbackClassification {
  const value = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(value) || value === 0) return 'neutral';
  return value > 0 ? 'minor_positive' : 'minor_negative';
}

/**
 * `[RELATIONSHIP_CHANGED: NPC, Standing, Reason, AffinityChange]` -> a D.1 event.
 *
 * Returns `null` when the NPC is unknown or the tag carries neither a keyword
 * nor a signed hint - "the relationship is described but nothing mechanical
 * happened" is a valid, common outcome.
 */
export function classifyRelationshipTag(
  tag: RelationshipTagInput | null | undefined,
  ctx: ClassifyContext,
): ClassifiedSocialEvent | null {
  if (!tag || !tag.NPC) return null;
  const target = ctx.npcIdByName(String(tag.NPC));
  if (!target) return null;

  const text = [tag.Reason ?? '', tag.Standing ?? ''].join(' ');
  let type = matchEventKeyword(text);
  if (!type) {
    const fallback = fallbackFromSign(tag.AffinityChange ?? tag.affinityChange);
    if (fallback === 'neutral') return null;
    type = FALLBACK_EVENT_TYPE[fallback];
  }

  return {
    type,
    actor: ctx.actor,
    target,
    witnesses: (ctx.witnesses ?? []).filter((id) => id !== target),
    reason: typeof tag.Reason === 'string' ? tag.Reason : undefined,
    source: 'relationship_tag',
  };
}

export interface CombatClassifyContext extends ClassifyContext {
  /** The player character id, used to tell win from loss. */
  playerId: CharId;
  /** `'Sparring' | 'Sandbox' | 'PvP'` never produce affinity events. */
  combatType?: string | null;
}

/**
 * Combat hand-off -> `combat_win_vs_npc` / `combat_loss_vs_npc`.
 *
 * Resolves only on the `battle_active === false` edge (gdd-03 CR#1) and never
 * for a friendly spar. `margin_ratio` always belongs to the WINNER, computed
 * with the mandatory float cast and denominator floor.
 */
export function classifyFromCombatHandoff(
  handoff: CombatHandoff | null | undefined,
  ctx: CombatClassifyContext,
): ClassifiedSocialEvent[] {
  if (!handoff) return [];
  if (handoff.battle_active) return [];
  if (handoff.is_spar_friendly || isSparFriendlyCombatType(ctx.combatType)) return [];

  const outcome = handoff.outcome;
  if (!outcome || (outcome.type !== 'win' && outcome.type !== 'loss')) return [];

  const opponentId = outcome.type === 'win' ? outcome.loser_id : outcome.winner_id;
  if (!opponentId) return [];
  const target = ctx.npcIdByName(String(opponentId)) ?? opponentId;

  const witnesses = (ctx.witnesses ?? []).filter((id) => id !== target);

  if (outcome.type === 'win') {
    const winnerId = outcome.winner_id ?? ctx.playerId;
    const winner = handoff.per_actor?.[winnerId];
    const margin = winner ? marginRatio(winner.hp_after, winner.max_HP) : 0;
    return [
      {
        type: 'combat_win_vs_npc',
        actor: ctx.actor,
        target,
        witnesses,
        margin_ratio: margin,
        source: 'combat_handoff',
      },
    ];
  }

  return [
    {
      type: 'combat_loss_vs_npc',
      actor: ctx.actor,
      target,
      witnesses,
      source: 'combat_handoff',
    },
  ];
}

/**
 * A witnessed kill, emitted by Death & Consequence (Branch B execute) or by the
 * `[CHARACTER_DEATH]` tag for an NPC. `witnesses` must already exclude the
 * victim; an EMPTY list is valid and means "perfect crime" (gdd-03 EC).
 */
export function classifyKillWitnessed(
  victimId: NpcId,
  witnesses: NpcId[],
  actor: CharId,
): ClassifiedSocialEvent {
  return {
    type: 'kill_witnessed',
    actor,
    target: victimId,
    witnesses: (witnesses ?? []).filter((id) => id !== victimId),
    source: 'death',
  };
}

/**
 * Completing a quest for an NPC is priced as `small_help` (+3): it is the D.1
 * row whose fiction ("a favour done") matches, and it keeps quest turn-ins on
 * the same fatigue curve as any other repeatable favour.
 */
export function classifyQuestCompleted(
  npcId: NpcId,
  ctx: ClassifyContext,
): ClassifiedSocialEvent {
  return {
    type: 'small_help',
    actor: ctx.actor,
    target: npcId,
    witnesses: (ctx.witnesses ?? []).filter((id) => id !== npcId),
    reason: 'Hoàn thành nhiệm vụ',
    source: 'quest',
  };
}
