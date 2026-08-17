/**
 * Read-only adapter over the out-of-scope Combat System.
 *
 * Design docs: production/gdd-integration/plan.md (scope: Combat is NEVER
 * modified, only read through this file), gdd-02 A7 (EXP consumes
 * `battle_active`, `outcome.winner_id/.loser_id`, `outcome.type`, `in_combat`),
 * gdd-03 1.7 / 2.7 (Affinity + Death consume the same hand-off plus
 * `per_actor[id].hp_after` and `is_spar_friendly`).
 *
 * SOURCE SHAPES IN App.tsx (line refs as of 2026-08-17)
 * - `CombatLoop.checkCombatEnd` (:4088) calls
 *   `onCombatEnd('VICTORY' | 'DEFEAT', { winningSideInfo, losingSideInfo }, sharedCooldowns)`.
 *   Sides are arrays of full character objects taken from `allCombatants`.
 * - `handleCombatEnd` (:27614) -> `finalizeCombatEnd` (:27618) receives that
 *   payload and also handles the third outcome `'FLED'`, raised manually at
 *   :28124 when the flee roll succeeds.
 * - `combatType` (`CombatLoop` ctor :3336, default :3342) is one of
 *   `'Lethal' | 'Sparring' | 'Sandbox' | 'PvP'`.
 * - `applyCombatResults` (:18647) mutates HP inside `knowledge.characters` and
 *   clamps to `[0, maxhp]`, so post-combat HP is read from the character objects,
 *   not from a dedicated result record.
 * - STORY playstyle never opens the combat UI; it uses
 *   `knowledge.narrativeCombatState = { isActive, combatants: char_id[] }`
 *   (:19991) instead.
 *
 * ASSUMPTIONS (documented for confirmation - see the report accompanying P0)
 * A1. `'FLED'` reports `winningSideInfo = enemyParty` and
 *     `losingSideInfo = playerParty` (:28124). That labelling exists only so the
 *     flee narration prompt can name both sides. Treating it literally would
 *     hand the enemy a `win` and let a player farm losses, so this adapter maps
 *     `'FLED'` to `type: 'flee'` with `winner_id = loser_id = null`.
 * A2. The GDD hand-off is 1-vs-1. For parties, the player side is represented by
 *     the character with `isPlayer === true` (falling back to the first
 *     combatant), and the enemy side by its highest-level member, ties broken by
 *     ascending `id`, so the mapping is deterministic and replay-stable.
 * A3. `'Sparring'` and `'Sandbox'` set `is_spar_friendly = true`. `'Sandbox'`
 *     additionally yields `type: 'none'` because it fights training dummies that
 *     are never written back to `knowledge` (:27628).
 * A4. `'PvP'` is also treated as `is_spar_friendly = true`: it is an out-of-story
 *     online duel, and letting it trigger Death & Consequence would kill a
 *     character through a system the GDD never modelled.
 * A5. `max_HP` falls back to the matching `knowledge.characters` entry, then to
 *     `1`, because gdd-03 1.7 requires `max_HP > 0` and a division by zero in
 *     `margin_ratio` is worse than a visibly wrong ratio.
 */

import type {
  CharId,
  CombatHandoff,
  CombatOutcome,
  CombatOutcomeType,
  PerActorCombatState,
} from '../types';

/** Combat flavours declared by `CombatLoop` in App.tsx (:3336). */
export type AppCombatType = 'Lethal' | 'Sparring' | 'Sandbox' | 'PvP';

/** Outcome literals App.tsx passes to `handleCombatEnd`. */
export type AppCombatOutcome = 'VICTORY' | 'DEFEAT' | 'FLED';

/** Minimal read-only view of an App.tsx character record. */
export interface AppCombatant {
  id: CharId;
  isPlayer?: boolean;
  isCompanion?: boolean;
  hp?: number;
  maxhp?: number;
  level?: number;
  [k: string]: unknown;
}

/** The `data` argument of `handleCombatEnd` / `finalizeCombatEnd`. */
export interface AppCombatEndData {
  winningSideInfo?: AppCombatant[];
  losingSideInfo?: AppCombatant[];
}

/** Minimal read-only view of the `knowledge` blob. */
export interface KnowledgeView {
  characters?: AppCombatant[];
  narrativeCombatState?: { isActive?: boolean; combatants?: CharId[] } | null;
  [k: string]: unknown;
}

/**
 * Everything the adapter may be given. All fields optional so a caller can pass
 * only what the current hook point knows about.
 */
export interface CombatAdapterInput {
  /** Present only on the turn a battle finished. */
  outcome?: AppCombatOutcome | null;
  /** The `{ winningSideInfo, losingSideInfo }` payload that came with `outcome`. */
  data?: AppCombatEndData | null;
  /** From `activeCombatLoopRef.current?.combatType`; defaults to `'Lethal'` as App.tsx does. */
  combatType?: AppCombatType | string | null;
  /** Live loop while a battle is running (`activeCombatLoop`). */
  activeCombatLoop?: { combatType?: string; allCombatants?: AppCombatant[] } | null;
  /** `gameMode` at the hook point: `'EXPLORATION' | 'COMBAT' | 'TRADE'`. */
  gameMode?: string | null;
}

const EMPTY_OUTCOME: CombatOutcome = { type: 'none', winner_id: null, loser_id: null };

function isPlayerSide(c: AppCombatant): boolean {
  return c.isPlayer === true || c.isCompanion === true;
}

/** Assumption A2: deterministic representative of the player side. */
function pickPlayerSideId(side: readonly AppCombatant[]): CharId | null {
  if (side.length === 0) return null;
  const player = side.find((c) => c.isPlayer === true);
  return (player ?? side[0]).id ?? null;
}

/** Assumption A2: highest level wins, ties broken by ascending id. */
function pickEnemySideId(side: readonly AppCombatant[]): CharId | null {
  if (side.length === 0) return null;
  const sorted = [...side].sort((a, b) => {
    const levelDiff = (b.level ?? 0) - (a.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted[0].id ?? null;
}

/** Assumption A5: `max_HP` must end up > 0. */
function resolveMaxHp(c: AppCombatant, knowledge?: KnowledgeView): number {
  if (typeof c.maxhp === 'number' && c.maxhp > 0) return c.maxhp;
  const stored = knowledge?.characters?.find((k) => k.id === c.id);
  if (stored && typeof stored.maxhp === 'number' && stored.maxhp > 0) return stored.maxhp;
  return 1;
}

function toPerActor(
  combatants: readonly AppCombatant[],
  knowledge?: KnowledgeView,
): Record<CharId, PerActorCombatState> {
  const out: Record<CharId, PerActorCombatState> = {};
  for (const c of combatants) {
    if (!c || c.id == null) continue;
    const hp = typeof c.hp === 'number' ? c.hp : 0;
    out[c.id] = {
      hp_after: hp < 0 ? 0 : hp,
      max_HP: resolveMaxHp(c, knowledge),
    };
  }
  return out;
}

/** `'Sparring' | 'Sandbox' | 'PvP'` never feed Death & Consequence (A3, A4). */
export function isSparFriendlyCombatType(combatType: string | null | undefined): boolean {
  return combatType === 'Sparring' || combatType === 'Sandbox' || combatType === 'PvP';
}

/**
 * Projects App.tsx combat state onto the GDD hand-off shape.
 *
 * Purely functional: it reads the arguments and returns a new object. It never
 * mutates `knowledge`, never touches `CombatLoop`, and never calls the AI.
 */
export function toCombatHandoff(
  input: CombatAdapterInput | null | undefined,
  knowledge?: KnowledgeView | null,
): CombatHandoff {
  const safeInput: CombatAdapterInput = input ?? {};
  const kn = knowledge ?? undefined;

  const combatType =
    safeInput.combatType ?? safeInput.activeCombatLoop?.combatType ?? 'Lethal';
  const is_spar_friendly = isSparFriendlyCombatType(combatType);

  // --- Case 1: a battle just ended (the `finalizeCombatEnd` hook point) ------
  if (safeInput.outcome) {
    const winningSide = safeInput.data?.winningSideInfo ?? [];
    const losingSide = safeInput.data?.losingSideInfo ?? [];
    const per_actor = toPerActor([...winningSide, ...losingSide], kn);

    let outcome: CombatOutcome;
    if (safeInput.outcome === 'FLED') {
      // Assumption A1: sides are swapped in the FLED payload purely for prompt
      // formatting, so no winner or loser is designated.
      outcome = { type: 'flee', winner_id: null, loser_id: null };
    } else if (combatType === 'Sandbox') {
      // Assumption A3: training dummies produce no mechanical outcome at all.
      outcome = { ...EMPTY_OUTCOME };
    } else {
      const playerWon = safeInput.outcome === 'VICTORY';
      const playerSide = playerWon ? winningSide : losingSide;
      const enemySide = playerWon ? losingSide : winningSide;
      const type: CombatOutcomeType = playerWon ? 'win' : 'loss';
      outcome = {
        type,
        winner_id: playerWon ? pickPlayerSideId(playerSide) : pickEnemySideId(enemySide),
        loser_id: playerWon ? pickEnemySideId(enemySide) : pickPlayerSideId(playerSide),
      };
    }

    return {
      // The battle is over on this turn, but the turn still belongs to it:
      // `battle_active=false` unlocks combat EXP while `in_combat=true` keeps
      // passive and Song Tu EXP suppressed (gdd-02 D.6).
      battle_active: false,
      in_combat: true,
      is_spar_friendly,
      outcome,
      per_actor,
    };
  }

  // --- Case 2: a tactical battle is still running ---------------------------
  const live = safeInput.activeCombatLoop;
  if (live && Array.isArray(live.allCombatants) && live.allCombatants.length > 0) {
    return {
      battle_active: true,
      in_combat: true,
      is_spar_friendly: isSparFriendlyCombatType(live.combatType ?? combatType),
      outcome: { ...EMPTY_OUTCOME },
      per_actor: toPerActor(live.allCombatants, kn),
    };
  }

  // --- Case 3: narrative combat (STORY playstyle, no combat UI) -------------
  const narrative = kn?.narrativeCombatState;
  if (narrative?.isActive === true) {
    const ids = narrative.combatants ?? [];
    const participants = (kn?.characters ?? []).filter((c) => ids.includes(c.id));
    return {
      battle_active: true,
      in_combat: true,
      // Narrative combat carries no combat type; App.tsx frames it as a lethal
      // fight ("Dang trong mot tran chien sinh tu!", :28470).
      is_spar_friendly: false,
      outcome: { ...EMPTY_OUTCOME },
      per_actor: toPerActor(participants, kn),
    };
  }

  // --- Case 4: no combat at all --------------------------------------------
  return {
    battle_active: false,
    // `gameMode === 'COMBAT'` without a loop means the UI is opening; treat the
    // turn as in-combat so passive EXP does not leak in during the transition.
    in_combat: safeInput.gameMode === 'COMBAT',
    is_spar_friendly,
    outcome: { ...EMPTY_OUTCOME },
    per_actor: {},
  };
}

/**
 * Every field downstream systems are contractually allowed to read. Used by the
 * schema-drift test: if Combat's shape ever changes, that test fails here rather
 * than silently producing `undefined` deep inside the EXP economy (gdd-02 A8
 * records a real `battle_result` / `outcome` drift incident).
 */
export const COMBAT_HANDOFF_REQUIRED_FIELDS = [
  'battle_active',
  'in_combat',
  'is_spar_friendly',
  'outcome',
  'per_actor',
] as const;

export const COMBAT_OUTCOME_REQUIRED_FIELDS = ['type', 'winner_id', 'loser_id'] as const;

export const PER_ACTOR_REQUIRED_FIELDS = ['hp_after', 'max_HP'] as const;

/** True only for combatants on the player side. Exported for reuse by P2. */
export { isPlayerSide };
