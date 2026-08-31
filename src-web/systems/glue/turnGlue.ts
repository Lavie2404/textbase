/**
 * Turn glue - the pure half of the P3b/P4b App.tsx wiring.
 *
 * WHY THIS MODULE EXISTS
 * `App.tsx` keeps its own turn spine (`processPlayerAction` -> `callGeminiAPI`
 * -> `parseGeminiResponseAndUpdateState` -> `applyUpdates` ->
 * `processAndUpdateState`). Rewriting that spine into
 * `turnManager.submitAction()` was rejected as too high-regression for P4b
 * (plan.md risk R1), so the App calls the new systems at fixed hook points
 * instead. Everything those hook points need to COMPUTE - assembling a
 * `LockedResult` out of what `applyUpdates` accumulated, shaping a `TurnRecord`,
 * deciding the `background` flag of an AI call site, flattening the App's
 * `story` union into narration text - lives here so it is unit-testable without
 * React, `fetch` or IndexedDB.
 *
 * Design docs:
 * - production/gdd-integration/plan.md D/P3 + D/P4, decisions C-1, C-8, C-9,
 *   C-10, C-13
 * - production/gdd-integration/gdd-01-turn-contract-ai.md A.3 (LockedResult,
 *   TurnRecord), C.4 F4 (background calls are not logical calls)
 * - production/gdd-integration/gdd-04-world-memory.md A4 (context block)
 *
 * PURITY: no React, no fetch, no clock, no RNG. Every time value is injected.
 */

import {
  FIELD_PREFIX_AFFINITY_DELTA,
  FIELD_PREFIX_BREAKTHROUGH_FLAG,
  FIELD_PREFIX_DEATH_FLAG,
  FIELD_PREFIX_EXP_DELTA,
  emptyLockedResult,
  lockedFieldName,
  type CharId,
  type CombatOutcome,
  type LockedResult,
  type Suggestion,
  type TurnRecord,
} from '../types';
import { PERSISTENCE_KNOBS } from '../registry';
import { wrapUntrusted } from '../contract/narrationDirectives';
import { ContractViolationError, sanitizeCommandBlock } from '../contract/tagPolicy';

// ---------------------------------------------------------------------------
// 1. The accumulator `applyUpdates` writes into
// ---------------------------------------------------------------------------

/**
 * Where the App parks the turn's mechanical deltas.
 *
 * `applyUpdates` in App.tsx is a 1200-line reducer whose P1/P2 blocks already
 * compute every number this project locks (EXP, affinity, death, breakthrough).
 * Rather than re-deriving them, the reducer writes them onto
 * `knowledge.lastLockedResult` as a plain, serialisable accumulator and this
 * module turns that into a real `LockedResult` at the end of the turn.
 */
export const LOCKED_ACCUM_KEY = 'lastLockedResult';

export interface LockedAccumulator {
  turn_id: number;
  world_time: number;
  is_death_turn: boolean;
  in_combat: boolean;
  battle_active: boolean;
  outcome: CombatOutcome;
  fields: Record<string, number | string | boolean | string[] | null>;
}

/** A fresh accumulator. `world_time` is filled in at assemble time when unknown. */
export function createLockedAccumulator(turn_id: number, world_time = 0): LockedAccumulator {
  const base = emptyLockedResult(toFiniteInt(turn_id, 0), toFiniteInt(world_time, 0));
  return {
    turn_id: base.turn_id,
    world_time: base.world_time,
    is_death_turn: false,
    in_combat: false,
    battle_active: false,
    outcome: base.outcome,
    fields: {},
  };
}

/** `exp_delta_<char_id>`. A zero or non-finite gain is not recorded (no fact). */
export function recordExpDelta(acc: LockedAccumulator, charId: CharId, amount: number): void {
  if (!acc || !charId) return;
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0) return;
  const key = lockedFieldName(FIELD_PREFIX_EXP_DELTA, charId);
  acc.fields[key] = (Number(acc.fields[key]) || 0) + value;
}

/** `affinity_delta_<npc_id>`, accumulated across several events in one turn. */
export function recordAffinityDelta(acc: LockedAccumulator, npcId: CharId, delta: number): void {
  if (!acc || !npcId) return;
  const value = Number(delta);
  if (!Number.isFinite(value) || value === 0) return;
  const key = lockedFieldName(FIELD_PREFIX_AFFINITY_DELTA, npcId);
  acc.fields[key] = (Number(acc.fields[key]) || 0) + value;
}

/** `death_flag_<char_id>`. Write-once-true: a death is never un-recorded here. */
export function recordDeathFlag(acc: LockedAccumulator, charId: CharId, isPlayer = false): void {
  if (!acc || !charId) return;
  acc.fields[lockedFieldName(FIELD_PREFIX_DEATH_FLAG, charId)] = true;
  // gdd-01 A.3 CR#9: only the PLAYER's death hard-locks Undo for the turn.
  if (isPlayer) acc.is_death_turn = true;
}

/** `breakthrough_flag_<char_id>`. */
export function recordBreakthroughFlag(acc: LockedAccumulator, charId: CharId): void {
  if (!acc || !charId) return;
  acc.fields[lockedFieldName(FIELD_PREFIX_BREAKTHROUGH_FLAG, charId)] = true;
}

/** Copies the combat view of the turn off the P0 hand-off adapter output. */
export function recordCombatView(
  acc: LockedAccumulator,
  handoff:
    | {
        in_combat?: boolean;
        battle_active?: boolean;
        outcome?: Partial<CombatOutcome>;
      }
    | null
    | undefined,
): void {
  if (!acc || !handoff) return;
  acc.in_combat = handoff.in_combat === true;
  acc.battle_active = handoff.battle_active === true;
  if (handoff.outcome && typeof handoff.outcome.type === 'string') {
    acc.outcome = {
      type: handoff.outcome.type,
      winner_id: handoff.outcome.winner_id ?? null,
      loser_id: handoff.outcome.loser_id ?? null,
    } as CombatOutcome;
  }
}

// ---------------------------------------------------------------------------
// 2. Accumulator -> LockedResult
// ---------------------------------------------------------------------------

export interface AssembleLockedArgs {
  turn_id: number;
  world_time: number;
}

/**
 * Reads `knowledge.lastLockedResult` and returns a structurally valid
 * `LockedResult`, whatever shape the reducer left behind.
 *
 * NEVER throws: a missing / malformed accumulator degrades to the empty locked
 * result for the turn, because a turn must still be narratable and persistable
 * when a new system misbehaves (plan.md P4b rule 8).
 */
export function assembleLockedResultFromKnowledge(
  knowledge: unknown,
  args: AssembleLockedArgs,
): LockedResult {
  const turn_id = toFiniteInt(args && args.turn_id, 0);
  const world_time = toFiniteInt(args && args.world_time, 0);
  const locked = emptyLockedResult(turn_id, world_time);

  const source = (knowledge || {}) as Record<string, unknown>;
  const acc = source[LOCKED_ACCUM_KEY] as Partial<LockedAccumulator> | undefined;
  if (!acc || typeof acc !== 'object') return locked;

  locked.is_death_turn = acc.is_death_turn === true;
  locked.in_combat = acc.in_combat === true;
  locked.battle_active = acc.battle_active === true;
  if (acc.outcome && typeof acc.outcome.type === 'string') {
    locked.outcome = {
      type: acc.outcome.type,
      winner_id: acc.outcome.winner_id ?? null,
      loser_id: acc.outcome.loser_id ?? null,
    } as CombatOutcome;
  }

  const fields = acc.fields;
  if (fields && typeof fields === 'object') {
    for (const key of Object.keys(fields)) {
      const value = (fields as Record<string, unknown>)[key];
      if (typeof value === 'number') {
        // A NaN/Infinity delta is a bug upstream; dropping it keeps the leak
        // detector's numeric field set clean instead of poisoning it.
        if (Number.isFinite(value) && value !== 0) locked.fields[key] = value;
      } else if (typeof value === 'boolean' || typeof value === 'string') {
        if (value !== false && value !== '') locked.fields[key] = value;
      } else if (Array.isArray(value)) {
        locked.fields[key] = value.map((v) => String(v));
      }
    }
  }
  return locked;
}

// ---------------------------------------------------------------------------
// 3. TurnRecord
// ---------------------------------------------------------------------------

export interface BuildTurnRecordArgs {
  slot_id: string;
  turn_id: number;
  world_time: number;
  action_text: string;
  /** The App's `story` value: a string or an array of dialogue segments. */
  narration: unknown;
  locked_result: LockedResult;
  /** App `choices` (strings) or already-shaped suggestions. */
  choices?: readonly unknown[];
  created_at: number;
  hack_seq?: number;
  schema_version?: number;
}

/**
 * Builds the append-only record for one confirmed turn (gdd-05 B3).
 *
 * `narration_text` is stored OPAQUE - it is never parsed for mechanical values
 * (gdd-01 B.2 R3); the leak detector only reads it.
 */
export function buildTurnRecordFromTurn(args: BuildTurnRecordArgs): TurnRecord {
  const turn_id = toFiniteInt(args.turn_id, 0);
  const world_time = toFiniteInt(args.world_time, 0);
  return {
    slot_id: String(args.slot_id || 'slot_default'),
    world_time,
    hack_seq: toFiniteInt(args.hack_seq === undefined ? 0 : args.hack_seq, 0),
    turn_id,
    action_text: String(args.action_text === undefined || args.action_text === null ? '' : args.action_text),
    locked_result: args.locked_result || emptyLockedResult(turn_id, world_time),
    narration_text: narrationTextOf(args.narration),
    suggestions: suggestionsFromChoices(args.choices),
    schema_version: toFiniteInt(
      args.schema_version === undefined ? PERSISTENCE_KNOBS.schema_version : args.schema_version,
      1,
    ),
    created_at: toFiniteInt(args.created_at, 0),
  };
}

/**
 * Flattens the App's `story` union to plain text.
 *
 * `parseStoryWithDialogue` yields either a string or an array of
 * `{type, content}` segments; both reach the persistence and leak-check paths.
 */
export function narrationTextOf(story: unknown): string {
  if (typeof story === 'string') return story;
  if (Array.isArray(story)) {
    return story
      .map((seg) => {
        if (typeof seg === 'string') return seg;
        const content = (seg || {}) as { content?: unknown };
        return typeof content.content === 'string' ? content.content : '';
      })
      .filter((s) => s !== '')
      .join('\n');
  }
  if (story && typeof story === 'object') {
    const content = (story as { content?: unknown }).content;
    if (typeof content === 'string') return content;
  }
  return '';
}

/** App choices are plain strings; Turn Manager wants `Suggestion` objects. */
export function suggestionsFromChoices(choices: readonly unknown[] | undefined): Suggestion[] {
  if (!Array.isArray(choices)) return [];
  const out: Suggestion[] = [];
  for (const c of choices) {
    if (typeof c === 'string') {
      const text = c.trim();
      if (text) out.push({ text, envelope: null, source: 'ai' });
    } else if (c && typeof c === 'object') {
      const obj = c as { text?: unknown; envelope?: unknown; source?: unknown };
      const text = typeof obj.text === 'string' ? obj.text.trim() : '';
      if (text) {
        out.push({
          text,
          envelope: typeof obj.envelope === 'string' ? obj.envelope : null,
          source: obj.source === 'fallback' || obj.source === 'pending_fate' ? obj.source : 'ai',
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4. AI call-site classification (plan.md C-9)
// ---------------------------------------------------------------------------

/**
 * Every kind of Gemini call the App makes.
 *
 * Only ONE of them is on the turn's critical path: `narration` (API-2, the
 * `narration_call` of gdd-01 C). Everything else - API-1 logic rolls, the API-3
 * state monitor, the background summariser, item/skill/quest detail drains,
 * appraisal, image prompts - is a background call, exempt from
 * `calls_per_turn` and from the BUSY guard (plan.md C-9).
 */
export const CALL_SITE_KINDS = [
  'narration',
  'logic',
  'state_monitor',
  'summarizer',
  'creation_drain',
  'quest_check',
  'generic',
  'image',
  'setup',
] as const;

export type CallSiteKind = (typeof CALL_SITE_KINDS)[number];

/** `true` = background (exempt). Unknown kinds are treated as background. */
export function chooseBackgroundFlag(kind: CallSiteKind | string | undefined): boolean {
  return kind !== 'narration';
}

/** Maps a call site to the AI layer's `call_type`. */
export function callTypeFor(
  kind: CallSiteKind | string | undefined,
): 'narration_call' | 'suggestion_call' {
  return kind === 'narration' ? 'narration_call' : 'suggestion_call';
}

// ---------------------------------------------------------------------------
// 5. World Memory prompt block (plan.md C-8)
// ---------------------------------------------------------------------------

export const WORLD_MEMORY_BLOCK_TITLE = 'KÝ ỨC THẾ GIỚI (fact store)';

/**
 * Wraps the rule-extracted fact store in the contract delimiters and gives it a
 * Vietnamese heading.
 *
 * C-8: this runs ALONGSIDE the existing AI summaries, never replacing them.
 * Empty input yields an empty string so the prompt gains no dead header.
 */
export function buildWorldMemoryPromptBlock(contextText: string | null | undefined): string {
  const body = (contextText || '').trim();
  if (body === '') return '';
  return '--- ' + WORLD_MEMORY_BLOCK_TITLE + ' ---\n' + wrapUntrusted('world_memory', body);
}

/**
 * Renders a `BuildContextResult`-shaped object as prompt text.
 *
 * Facts are printed as `field = value` lines under their entity; recency turns
 * contribute nothing here because the App already sends its own verbatim
 * history block (C-8: the two layers run side by side, not stacked).
 */
export function renderWorldMemoryContext(result: unknown): string {
  const wrapper = (result || {}) as { context?: unknown };
  const context = (wrapper.context || {}) as { facts?: unknown[] };
  const facts = Array.isArray(context.facts) ? context.facts : [];
  const byEntity = new Map<string, string[]>();
  for (const raw of facts) {
    const fact = (raw || {}) as { entity_id?: unknown; field_name?: unknown; field_value?: unknown };
    const entity = typeof fact.entity_id === 'string' ? fact.entity_id : '';
    const field = typeof fact.field_name === 'string' ? fact.field_name : '';
    if (!entity || !field) continue;
    const value = fact.field_value;
    const rendered = Array.isArray(value) ? value.join(', ') : String(value);
    const list = byEntity.get(entity);
    if (list) list.push(field + ' = ' + rendered);
    else byEntity.set(entity, [field + ' = ' + rendered]);
  }
  const lines: string[] = [];
  byEntity.forEach((entries, entity) => {
    lines.push('- ' + entity + ': ' + entries.join(' | '));
  });
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 6. Persistence helpers
// ---------------------------------------------------------------------------

export interface AppSaveStateLike {
  knowledge?: unknown;
  storyHistory?: unknown[];
  storySummaries?: unknown[];
  gameSettings?: unknown;
  currentTurn?: number;
  choices?: unknown;
  gameMode?: string;
  activeTrade?: unknown;
  adventureTurnCount?: number;
  gameId?: string;
  worldMemory?: unknown;
  /**
   * `turnManager.toPersistable()` (code review C-9). Without it a reload
   * restarts `turn_id` / `world_time` at 0 and forgets `death_turn_ids`, so a
   * death turn became undoable again after a refresh.
   */
  turnManager?: unknown;
}

export interface BundleMetaArgs {
  slot_id: string;
  world_time: number;
  saved_at: number;
  hack_mode_used_this_slot?: boolean;
  schema_version?: number;
}

/**
 * Builds the `SaveBundle` shape from live App state.
 *
 * Deliberately structural-typed (`unknown` payloads) so App.tsx - which is
 * untyped JS-in-TSX - can call it without a cast, and so this module never has
 * to know the `knowledge` schema.
 */
export function buildSaveBundle(
  state: AppSaveStateLike,
  meta: BundleMetaArgs,
): Record<string, unknown> {
  return {
    knowledge: state.knowledge === undefined ? null : state.knowledge,
    storyHistory: Array.isArray(state.storyHistory) ? state.storyHistory : [],
    storySummaries: Array.isArray(state.storySummaries) ? state.storySummaries : [],
    gameSettings: state.gameSettings === undefined ? null : state.gameSettings,
    currentTurn: toFiniteInt(state.currentTurn, 0),
    worldMemory: state.worldMemory === undefined ? null : state.worldMemory,
    choices: state.choices === undefined ? null : state.choices,
    gameMode: state.gameMode,
    activeTrade: state.activeTrade === undefined ? null : state.activeTrade,
    adventureTurnCount: toFiniteInt(state.adventureTurnCount, 0),
    gameId: state.gameId,
    turnManager: state.turnManager === undefined ? null : state.turnManager,
    meta: {
      slot_id: String(meta.slot_id || 'slot_default'),
      schema_version: toFiniteInt(
        meta.schema_version === undefined ? PERSISTENCE_KNOBS.schema_version : meta.schema_version,
        1,
      ),
      world_time: toFiniteInt(meta.world_time, 0),
      saved_at: toFiniteInt(meta.saved_at, 0),
      checksum: '',
      hack_mode_used_this_slot: meta.hack_mode_used_this_slot === true,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Entities in scope (gdd-04 A4 input)
// ---------------------------------------------------------------------------

/**
 * The entity ids the next prompt may reference: the player, then the characters
 * co-located with the player, then the player's location. Capped so the context
 * builder's clamp has a stable, deterministic input order.
 */
export function entitiesInScopeFromKnowledge(knowledge: unknown, max = 8): string[] {
  const k = (knowledge || {}) as { characters?: unknown[] };
  const characters = Array.isArray(k.characters) ? k.characters : [];
  const player = characters.find(
    (c) => ((c || {}) as { isPlayer?: boolean }).isPlayer === true,
  ) as { id?: string; current_location_id?: string } | undefined;
  const out: string[] = [];
  const push = (id: unknown) => {
    if (typeof id === 'string' && id !== '' && out.indexOf(id) === -1) out.push(id);
  };
  push(player && player.id);
  for (const raw of characters) {
    const c = (raw || {}) as {
      id?: string;
      isPlayer?: boolean;
      current_location_id?: string;
      isPermanentlyDead?: boolean;
    };
    if (c.isPlayer || c.isPermanentlyDead) continue;
    if (!player || !player.current_location_id || c.current_location_id === player.current_location_id) {
      push(c.id);
    }
    if (out.length >= max) break;
  }
  push(player && player.current_location_id);
  return out.slice(0, max);
}

// ---------------------------------------------------------------------------

function toFiniteInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// ---------------------------------------------------------------------------
// 8. AI credentials (code review C-3)
// ---------------------------------------------------------------------------

/**
 * The App's own API-mode vocabulary.
 *
 * `App.tsx` stores `'userKey' | 'defaultGemini'`; the AI layer's `AiCredentials`
 * speaks `'userKey' | 'default'`. The mapping between the two lived nowhere, so
 * `fetchWithRetries` re-derived the key by REGEX-PARSING `?key=` back out of the
 * URL it had just built - which silently produced NO credentials at all once
 * `requestAi` started requiring them.
 */
export type AppApiMode = 'userKey' | 'defaultGemini' | string;

export interface AppCredentialInputs {
  /** `apiMode` React state. */
  apiMode?: AppApiMode;
  /** `apiKey` React state - the user-supplied key. */
  apiKey?: string;
  /** Legacy fallback: the key parsed off the request URL's `?key=`. */
  apiKeyFromUrl?: string;
  /** A platform / free-tier key the build ships with, if any. */
  defaultKey?: string;
  /**
   * Spare keys from `VITE_GEMINI_API_KEY_FALLBACKS` (project decision
   * 2026-08-28: main key + two spares). Attached in BOTH modes, so a player
   * on their own key still rolls over to the spares when it hits 429.
   */
  fallbackKeys?: readonly string[];
}

export interface AiCredentialsLike {
  apiMode: 'userKey' | 'default';
  userKey?: string;
  defaultKey?: string;
  /** Present only when at least one spare key exists (see `AiCredentials`). */
  fallbackKeys?: string[];
}

/**
 * Builds `deps.credentials` for `requestAi` out of the app's REAL state.
 *
 * Rules (code review C-3):
 * - `userKey` mode uses the React `apiKey`, falling back to the URL key so a
 *   legacy call site that inlined its own key keeps working;
 * - `defaultGemini` mode uses the platform key when the build defines one;
 * - a non-empty URL key in default mode is still honoured (same legacy reason);
 * - otherwise the credentials are returned EMPTY on purpose, so `requestAi`
 *   fails fast with `config_error` instead of burning the whole model ladder on
 *   requests that cannot possibly authenticate;
 * - the spare keys (`fallbackKeys`) ride along in every mode, minus the primary
 *   key itself, and are omitted entirely when there are none - so the shape
 *   stays byte-identical to the pre-pool contract for a build without spares.
 */
export function buildAiCredentials(
  input: AppCredentialInputs | null | undefined,
): AiCredentialsLike {
  const src = input || {};
  const fromUrl = String(src.apiKeyFromUrl || '').trim();
  const base = ((): AiCredentialsLike => {
    if (src.apiMode === 'userKey') {
      const userKey = String(src.apiKey || '').trim() || fromUrl;
      return { apiMode: 'userKey', userKey };
    }
    const defaultKey = String(src.defaultKey || '').trim();
    if (defaultKey) return { apiMode: 'default', defaultKey };
    if (fromUrl) return { apiMode: 'userKey', userKey: fromUrl };
    return { apiMode: 'default', defaultKey: '' };
  })();
  const primary = base.apiMode === 'userKey' ? base.userKey : base.defaultKey;
  const fallbackKeys: string[] = [];
  for (const raw of src.fallbackKeys || []) {
    const k = String(raw || '').trim();
    if (k && k !== primary && !fallbackKeys.includes(k)) fallbackKeys.push(k);
  }
  return fallbackKeys.length > 0 ? { ...base, fallbackKeys } : base;
}

/** True when the credentials can authenticate a request at all. */
export function credentialsAreUsable(creds: AiCredentialsLike | null | undefined): boolean {
  if (!creds) return false;
  const primaryUsable =
    creds.apiMode === 'userKey'
      ? String(creds.userKey || '').trim() !== ''
      : String(creds.defaultKey || '').trim() !== '';
  return primaryUsable || (creds.fallbackKeys || []).some((k) => String(k || '').trim() !== '');
}

// ---------------------------------------------------------------------------
// 9. Narration budget overrides (code review C-4, plan.md C-10 deviation #2)
// ---------------------------------------------------------------------------

/** API-1's classification tag that asks API-2 for a 1500+ word narration. */
export const LONG_NARRATION_TAG = 'dai';

/**
 * Budget for a `'dai'` turn. The default `narration_call` pair (150s/120s) is
 * sized for a normal-length turn; a 1500-word answer can still outlive it, and
 * the abort reads to the player as "AI khong phan hoi". (Target lowered from
 * 3000 to 1500 words 2026-08-28 per user - 3000 read as too long; the extra
 * timeout headroom below is kept as-is, it only ever helps.)
 */
export const LONG_NARRATION_BUDGET = Object.freeze({
  ai_call_timeout_seconds: 240,
  request_timeout_default: 200,
});

/**
 * Returns `AiRequest.overrides` for one narration call, or `undefined` to let
 * the config's own `narration_call` budget apply.
 */
export function narrationBudgetOverrides(
  classificationTags: readonly unknown[] | null | undefined,
): { ai_call_timeout_seconds: number; request_timeout_default: number } | undefined {
  if (!Array.isArray(classificationTags)) return undefined;
  const wantsLong = classificationTags.some(
    (t) => typeof t === 'string' && t.trim().toLowerCase() === LONG_NARRATION_TAG,
  );
  return wantsLong ? { ...LONG_NARRATION_BUDGET } : undefined;
}

/**
 * Free-text player action length (chars) beyond which API-1 (the logic call)
 * gets the extended budget. Sized from the 2026-08-31 timeout incident: a
 * multi-beat narrated action around this length pushed the logic round-trip
 * past the default per-request abort.
 */
export const LONG_ACTION_CHAR_THRESHOLD = 600;

/**
 * Returns `AiRequest.overrides` for one API-1 logic call, or `undefined` to
 * let the config's own budget apply. Reuses `LONG_NARRATION_BUDGET`: the cost
 * driver is the same (a long player-authored action inflating the exchange),
 * and one pair of knobs is easier to reason about than two.
 */
export function logicBudgetOverrides(
  actionText: unknown,
): { ai_call_timeout_seconds: number; request_timeout_default: number } | undefined {
  const text = typeof actionText === 'string' ? actionText : '';
  return text.trim().length >= LONG_ACTION_CHAR_THRESHOLD ? { ...LONG_NARRATION_BUDGET } : undefined;
}

// ---------------------------------------------------------------------------
// 10. Undo generation guard (code review C-5)
// ---------------------------------------------------------------------------

/**
 * Background work (the API-3 state monitor, the summariser) is scheduled DURING
 * a turn and lands after it. If the player undid that turn while the call was
 * in flight, applying the result re-injects state the rollback just removed.
 *
 * The App keeps a monotonically increasing `undoGenerationRef`; every scheduler
 * captures it and every applier re-checks it. A mismatch means "at least one
 * undo happened since I was scheduled" - drop the result.
 */
export function isStaleGeneration(
  scheduledGeneration: number | null | undefined,
  currentGeneration: number | null | undefined,
): boolean {
  // `Number(null)` is 0, which is finite - so null/undefined must be rejected
  // BEFORE the numeric check, or a missing generation would read as generation 0
  // and drop every background result.
  if (scheduledGeneration === null || scheduledGeneration === undefined) return false;
  if (currentGeneration === null || currentGeneration === undefined) return false;
  const scheduled = Number(scheduledGeneration);
  const current = Number(currentGeneration);
  if (!Number.isFinite(scheduled) || !Number.isFinite(current)) return false;
  return current !== scheduled;
}

// ---------------------------------------------------------------------------
// 11. Turn Manager self-heal (code review C-1)
// ---------------------------------------------------------------------------

/**
 * Detects a Turn Manager left `input_locked` by a previous turn that returned
 * early without committing or failing.
 *
 * The App's own `isProcessingAction` is the liveness signal: when no action is
 * in flight, nothing can still be legitimately holding the lock.
 */
export function shouldSelfHealTurnManager(state: {
  inputLocked?: boolean;
  isProcessingAction?: boolean;
}): boolean {
  const s = state || {};
  return s.inputLocked === true && s.isProcessingAction !== true;
}

// ---------------------------------------------------------------------------
// 12. Fail-closed command-block sanitising (code review C-8)
// ---------------------------------------------------------------------------

export type SanitizeDegradation = 'none' | 'contract_violation' | 'prod_fallback' | 'empty';

export interface SanitizeForApplyResult {
  /** The block the reducer is allowed to apply. NEVER the raw input. */
  kept: string;
  stripped: unknown[];
  degraded: SanitizeDegradation;
  error?: unknown;
}

export interface SanitizeForApplyContext {
  mode?: 'dev' | 'prod';
  playerIds?: readonly string[];
  [key: string]: unknown;
}

/**
 * Runs `sanitizeCommandBlock` so that NO failure path can leak the raw,
 * unsanitised block into `applyUpdates` (plan.md C-1).
 *
 * Ladder:
 * 1. `dev` mode throws `ContractViolationError` on a mechanical tag - that error
 *    CARRIES the sanitised block, so we apply `err.result.kept` (fail CLOSED);
 * 2. any other throw is re-run in `prod` mode, which only logs;
 * 3. if that throws too, the command block becomes EMPTY. Losing a turn's world
 *    content is strictly better than applying AI-authored mechanical numbers.
 */
export function sanitizeCommandBlockForApply(
  commandBlock: string,
  ctx: SanitizeForApplyContext = {},
): SanitizeForApplyResult {
  try {
    const result = sanitizeCommandBlock(commandBlock ?? '', ctx as never);
    return { kept: result.kept, stripped: result.stripped as unknown[], degraded: 'none' };
  } catch (err) {
    if (err instanceof ContractViolationError && err.result) {
      return {
        kept: String(err.result.kept ?? ''),
        stripped: (err.result.stripped as unknown[]) || [],
        degraded: 'contract_violation',
        error: err,
      };
    }
    try {
      const retried = sanitizeCommandBlock(commandBlock ?? '', {
        ...(ctx as object),
        mode: 'prod',
      } as never);
      return {
        kept: retried.kept,
        stripped: retried.stripped as unknown[],
        degraded: 'prod_fallback',
        error: err,
      };
    } catch (fatal) {
      return { kept: '', stripped: [], degraded: 'empty', error: fatal };
    }
  }
}
