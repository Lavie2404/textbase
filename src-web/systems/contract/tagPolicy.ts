/**
 * Tag policy - the C-1 "hybrid" split, expressed as data.
 *
 * Design docs:
 * - production/gdd-integration/plan.md decision C-1: keep world-CONTENT tags
 *   (CREATE_NPC, WORLD_*, LORE_*, QUEST_*, TIME_PASSED, MOVE_PLAYER, ...),
 *   forbid mechanical-RESULT tags (EXP grants, affinity numbers, player death /
 *   revival, level writes, healing) which a deterministic module now owns.
 * - production/gdd-integration/gdd-01-turn-contract-ai.md B.2 R3 ("reverse
 *   parsing is absolutely forbidden") - C-1 is the project's deliberate,
 *   documented partial-compliance position: the *mechanical* half of R3 is
 *   enforced here in code; the *content* half stays with the tag pipeline
 *   because removing it would delete the game's core experience.
 * - production/gdd-integration/app-map.md section 3 for the shipped tag list
 *   (`parseGeminiResponseAndUpdateState:23201`, `tagWithDataRegex:23232`).
 *
 * WHAT THIS MODULE IS NOT
 * It never applies a tag and never touches world state. It classifies and
 * rewrites text. `applyUpdates` in App.tsx keeps that job (P4b feeds it the
 * sanitised block).
 */

// ---------------------------------------------------------------------------
// Tag inventory (app-map.md section 3)
// ---------------------------------------------------------------------------

/**
 * Group 1 - world CONTENT. Allowed: these describe *what exists*, not *what a
 * formula decided*. C-1 keeps them so the "AI grows the world" experience
 * survives.
 */
export const WORLD_CONTENT_TAGS: readonly string[] = [
  'USE_ITEM',
  'WORLD_NPC',
  'WORLD_LOCATION',
  'WORLD_ITEM',
  'REMOVE_WORLD_ITEM',
  'LORE_LOCATION',
  'LOCATION_STATE_UPDATE',
  'CREATE_NPC',
  'LORE_NPC',
  'LORE_ITEM',
  'LORE_QUEST',
  'RENAME_NPC',
  'ITEM_IDEA_GAINED',
  'SKILL_IDEA_GAINED',
  'REMOVE_SKILL_IDEA',
  'OFFER_ITEM_IDEA',
  'REALM_LIST',
  'TIME_PASSED',
  'SET_STARTING_LOCATION',
  'SET_STARTING_TIME',
  'MOVE_PLAYER',
  'START_COMBAT',
  'END_COMBAT',
  'USE_SKILL',
  'ACTIVATE_ADVENTURE_SKILL',
  'ENTER_TRADE_MODE',
  'EXIT_TRADE_MODE',
  'SELL_VALUATION',
  'BUY_NEGOTIATION',
  'CONFIRM_SELL',
  'CONFIRM_BUY',
  'APPLY_LONG_TERM_STATUS',
  'HTAB_UPDATE',
  'HTAB_AWAKEN',
  'SYSTEM_LEAVE',
  'QUEST_CHECK',
  // P4b: the App's narrative-combat opener. World content (it announces a scene),
  // never a mechanical result - the numbers still come from CombatLoop.
  'NARRATIVE_COMBAT_START',
];

/** Prefixes whose whole family is world content (`SYSTEM_*`, `QUEST_*`, `CRISIS_*`). */
export const WORLD_CONTENT_TAG_PREFIXES: readonly string[] = ['SYSTEM_', 'QUEST_', 'CRISIS_'];

/**
 * Group 2 - mechanical RESULT. Forbidden by C-1: a deterministic module owns
 * each of these fields now, so a tag writing them would let the narrator
 * overrule a locked result.
 */
export const MECHANICAL_RESULT_TAGS: readonly string[] = [
  'ENCOUNTER_REWARD', // EXP grant - owned by exp/resolveTurnExp.ts
  'RELATIONSHIP_CHANGED', // numeric AffinityChange - owned by affinity/
  'AFFINITY_CHANGED', // HTAB variant, same owner
  'CHARACTER_DEATH', // player death - owned by death/
  'CHARACTER_REVIVE', // player revival - owned by death/
  'SET_LEVEL', // level write - owned by exp/
  'HEAL_PARTICIPANTS', // HP write - owned by combat + death/
  'CHARACTER_UPDATE', // conditional: only its mechanical attributes are barred
];

/** Attribute keys no tag may write, per owning system. */
export const FORBIDDEN_ATTRS: Record<string, readonly string[]> = {
  CHARACTER_UPDATE: [
    'exp',
    'maxExp',
    'level',
    'realm',
    'affinity',
    'isPermanentlyDead',
    'alive',
    'ap',
    'allocatedPoints',
  ],
  RELATIONSHIP_CHANGED: ['AffinityChange', 'affinity_change', 'affinity'],
  AFFINITY_CHANGED: ['AffinityChange', 'amount', 'value'],
};

/** Attribute keys barred only when the tag targets the player character. */
export const FORBIDDEN_ATTRS_PLAYER_ONLY: Record<string, readonly string[]> = {
  CHARACTER_UPDATE: ['hp', 'maxhp', 'maxHp'],
};

/**
 * Tags that keep their world-content half when their mechanical attributes are
 * removed. `RELATIONSHIP_CHANGED` still carries the prose `Standing`, which is
 * world content and useful for the Character Card; only the number goes.
 */
export const REDACTABLE_TAGS: readonly string[] = [
  'RELATIONSHIP_CHANGED',
  'CHARACTER_UPDATE',
  'AFFINITY_CHANGED',
];

/**
 * Cap on the free-form EP score an `ENCOUNTER_REWARD` may still carry.
 * C-1 forbids the AI grading EXP; plan.md D/P1 keeps the tag alive as a small
 * "free event" source. Anything above the cap is the AI grading the turn and is
 * stripped and logged.
 */
export const ENCOUNTER_REWARD_EP_CAP = 30;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export interface ParsedTag {
  name: string;
  /** The full original text of the tag, including brackets. */
  raw: string;
  /** `key="value"` pairs (App's `parseKeyValueString:2553` shape). */
  attrs: Record<string, string>;
  /** Comma-separated bare arguments (App's `[TAG a,b,c]` shape). */
  positional: string[];
}

const TAG_RE = /\[([A-Z][A-Z0-9_]*)(?::)?([^\]]*)\]/g;
const ATTR_RE = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,\]]*))/g;

/** Splits a command block into tags. Unknown text between tags is preserved by index. */
export function parseTags(block: string): ParsedTag[] {
  const out: ParsedTag[] = [];
  if (!block) return out;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(block)) !== null) {
    const [raw, name, body = ''] = m;
    out.push({ name, raw, attrs: parseAttrs(body), positional: parsePositional(body) });
  }
  return out;
}

function parseAttrs(body: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(body)) !== null) {
    const key = m[1];
    const value = m[2] ?? m[3] ?? (m[4] ?? '').trim();
    attrs[key] = value;
  }
  return attrs;
}

function parsePositional(body: string): string[] {
  if (body.includes('=')) return [];
  return body
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export type TagVerdict = 'allow' | 'strip' | 'strip_and_log';

export interface TagPolicyContext {
  /**
   * `dev` throws on a `strip_and_log` verdict (plan.md P4: "throw in dev, log in
   * prod") unless `throwOnViolation` says otherwise; `prod` only logs.
   */
  mode?: 'dev' | 'prod';
  throwOnViolation?: boolean;
  /** Resolves whether a tag target is the player character. */
  isPlayer?: (target: string) => boolean;
  /** Names/ids of the player, used by the default `isPlayer`. */
  playerIds?: readonly string[];
  /** Overrides the default EP cap for `ENCOUNTER_REWARD`. */
  encounterRewardEpCap?: number;
  /** Tags to drop silently (no violation): host app noise. */
  silentStripTags?: readonly string[];
}

export class ContractViolationError extends Error {
  readonly tag: string;
  readonly reason: string;
  constructor(tag: string, reason: string) {
    super('contract violation: [' + tag + '] ' + reason);
    this.name = 'ContractViolationError';
    this.tag = tag;
    this.reason = reason;
  }
}

function resolveIsPlayer(ctx: TagPolicyContext): (target: string) => boolean {
  if (ctx.isPlayer) return ctx.isPlayer;
  const ids = (ctx.playerIds ?? []).map((s) => s.toLowerCase());
  return (target: string) => {
    const t = (target ?? '').trim().toLowerCase();
    if (!t) return false;
    return ids.includes(t) || t === 'player' || t === 'nguoi choi' || t === 'người chơi';
  };
}

function targetOf(tag: ParsedTag): string {
  return (
    tag.attrs.target ??
    tag.attrs.Target ??
    tag.attrs.name ??
    tag.attrs.Name ??
    tag.attrs.npc ??
    tag.attrs.NPC ??
    tag.positional[0] ??
    ''
  );
}

function isWorldContentName(name: string): boolean {
  if (WORLD_CONTENT_TAGS.includes(name)) return true;
  return WORLD_CONTENT_TAG_PREFIXES.some((p) => name.startsWith(p));
}

function numericAttr(tag: ParsedTag, keys: readonly string[]): number | null {
  for (const k of keys) {
    const v = tag.attrs[k];
    if (v === undefined) continue;
    const n = Number(String(v).replace(/[^\d.+-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Classifies one tag.
 *
 * - `allow`         keep verbatim
 * - `strip`         drop silently (known noise; not a contract breach)
 * - `strip_and_log` drop (or redact, see `sanitizeCommandBlock`) and record a
 *                   contract violation
 *
 * `attrs` is accepted separately from `name` so a caller that already parsed
 * the tag does not have to rebuild a `ParsedTag`.
 */
export function classifyTag(
  name: string,
  attrs: Record<string, string> = {},
  ctx: TagPolicyContext = {},
  positional: string[] = [],
): TagVerdict {
  const tag: ParsedTag = { name, raw: '', attrs, positional };
  const isPlayer = resolveIsPlayer(ctx);
  const target = targetOf(tag);

  if ((ctx.silentStripTags ?? []).includes(name)) return 'strip';

  switch (name) {
    case 'ENCOUNTER_REWARD': {
      // Owned by exp/resolveTurnExp.ts. A small free-event EP score survives;
      // anything above the cap is the AI grading the turn's economy (C-1).
      const cap = ctx.encounterRewardEpCap ?? ENCOUNTER_REWARD_EP_CAP;
      const ep = numericAttr(tag, ['ep_score', 'ep', 'exp', 'amount']) ?? epFromPositional(tag);
      if (ep === null) return 'allow';
      return ep > cap ? 'strip_and_log' : 'allow';
    }
    case 'RELATIONSHIP_CHANGED':
    case 'AFFINITY_CHANGED': {
      const delta = numericAttr(tag, FORBIDDEN_ATTRS[name] as string[]) ?? affinityFromPositional(tag);
      // Zero (or absent) carries no mechanical decision: the prose `Standing`
      // half is world content and stays.
      if (delta === null || delta === 0) return 'allow';
      return 'strip_and_log';
    }
    case 'CHARACTER_DEATH':
    case 'CHARACTER_REVIVE':
      // NPC deaths remain world content (C-1 names the PLAYER case explicitly);
      // the player's life is decided by death/resolveDeathConsequence.ts alone.
      return isPlayer(target) ? 'strip_and_log' : 'allow';
    case 'SET_LEVEL':
      return isPlayer(target) ? 'strip_and_log' : 'allow';
    case 'HEAL_PARTICIPANTS':
      // Always mechanical: it writes HP for everyone in the scene.
      return 'strip_and_log';
    case 'CHARACTER_UPDATE': {
      const banned = FORBIDDEN_ATTRS.CHARACTER_UPDATE;
      const playerOnly = isPlayer(target) ? FORBIDDEN_ATTRS_PLAYER_ONLY.CHARACTER_UPDATE : [];
      const hit = [...banned, ...playerOnly].some((k) => attrs[k] !== undefined);
      return hit ? 'strip_and_log' : 'allow';
    }
    default:
      break;
  }

  if (isWorldContentName(name)) return 'allow';
  // Unknown tag: not on the allowlist, so it cannot be trusted to be content
  // only. Dropped, and logged so a new App tag is noticed rather than silently
  // ignored.
  return 'strip_and_log';
}

function epFromPositional(tag: ParsedTag): number | null {
  if (tag.positional.length === 0) return null;
  const n = Number(tag.positional[0]);
  return Number.isFinite(n) ? n : null;
}

function affinityFromPositional(tag: ParsedTag): number | null {
  // `[RELATIONSHIP_CHANGED NPC,Standing,Reason,AffinityChange]` - last field.
  if (tag.positional.length < 4) return null;
  const n = Number(tag.positional[tag.positional.length - 1]);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Sanitising
// ---------------------------------------------------------------------------

export interface StrippedEntry {
  tag: string;
  raw: string;
  verdict: Exclude<TagVerdict, 'allow'>;
  /** Attribute keys removed when the tag was redacted rather than dropped. */
  redacted_attrs?: string[];
  reason: string;
}

export interface SanitizeResult {
  /** The command block with every forbidden tag removed or redacted. */
  kept: string;
  /** Parsed view of what survived, in original order. */
  keptTags: ParsedTag[];
  stripped: StrippedEntry[];
}

function rebuildTag(name: string, attrs: Record<string, string>): string {
  const body = Object.keys(attrs)
    .map((k) => k + '="' + attrs[k] + '"')
    .join(', ');
  return body ? '[' + name + ': ' + body + ']' : '[' + name + ']';
}

/**
 * Removes every mechanical-result tag from a command block.
 *
 * Redaction vs removal: a tag listed in `REDACTABLE_TAGS` keeps its
 * world-content attributes and loses only the mechanical ones (the number in
 * `RELATIONSHIP_CHANGED`, the `exp`/`level` keys in `CHARACTER_UPDATE`). Every
 * other `strip_and_log` tag is removed whole. Both cases record a
 * `StrippedEntry`, so the leak/violation log sees them identically.
 */
export function sanitizeCommandBlock(
  commandBlock: string,
  ctx: TagPolicyContext = {},
): SanitizeResult {
  const stripped: StrippedEntry[] = [];
  const keptTags: ParsedTag[] = [];
  const tags = parseTags(commandBlock ?? '');
  let kept = commandBlock ?? '';

  for (const tag of tags) {
    const verdict = classifyTag(tag.name, tag.attrs, ctx, tag.positional);
    if (verdict === 'allow') {
      keptTags.push(tag);
      continue;
    }

    const redactableKeys = redactionKeysFor(tag, ctx);
    if (verdict === 'strip_and_log' && REDACTABLE_TAGS.includes(tag.name) && redactableKeys.length > 0) {
      const attrs = { ...tag.attrs };
      for (const k of redactableKeys) delete attrs[k];
      const replacement = rebuildTag(tag.name, attrs);
      kept = kept.replace(tag.raw, replacement);
      keptTags.push({ ...tag, raw: replacement, attrs });
      stripped.push({
        tag: tag.name,
        raw: tag.raw,
        verdict,
        redacted_attrs: redactableKeys,
        reason: 'mechanical attributes are owned by a deterministic system (C-1)',
      });
    } else {
      kept = kept.replace(tag.raw, '');
      stripped.push({
        tag: tag.name,
        raw: tag.raw,
        verdict,
        reason:
          verdict === 'strip'
            ? 'silently dropped by policy'
            : 'mechanical-result tag forbidden by C-1 / gdd-01 B.2 R3',
      });
    }
  }

  const mode = ctx.mode ?? 'prod';
  const shouldThrow = ctx.throwOnViolation ?? mode === 'dev';
  if (shouldThrow) {
    const first = stripped.find((s) => s.verdict === 'strip_and_log');
    if (first) throw new ContractViolationError(first.tag, first.reason);
  }

  return { kept: kept.replace(/[ \t]{2,}/g, ' ').trim(), keptTags, stripped };
}

function redactionKeysFor(tag: ParsedTag, ctx: TagPolicyContext): string[] {
  const isPlayer = resolveIsPlayer(ctx);
  const base = FORBIDDEN_ATTRS[tag.name] ?? [];
  const playerOnly = isPlayer(targetOf(tag)) ? FORBIDDEN_ATTRS_PLAYER_ONLY[tag.name] ?? [] : [];
  return [...base, ...playerOnly].filter((k) => tag.attrs[k] !== undefined);
}

/** True when the tag family is on the mechanical-result list at all. */
export function isMechanicalResultTag(name: string): boolean {
  return MECHANICAL_RESULT_TAGS.includes(name);
}

/** True when the tag family is on the world-content allowlist. */
export function isWorldContentTag(name: string): boolean {
  return isWorldContentName(name);
}
