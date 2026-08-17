/**
 * gdd-03 PART 2 - Death and Consequence resolution (Branch A and Branch B).
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (2.2 Core Rules, 2.4 D.1/D.2, 2.6 edge cases, 2.8 AC list),
 * production/gdd-integration/plan.md decisions C-7 (KEEP handleRespawn; no
 * permanent death, no slot locking, no Character Continuation) and C-11
 * (crippled = the "Phe Dan Dien" long-term status; CombatLoop is never touched).
 *
 * PURITY CONTRACT
 * No React, no fetch, no clock, and the RNG is injected (AC-48). Nothing is
 * mutated: a NEW death-state table is returned every time.
 *
 * ORDER (CR#2, enforced by the caller in App.tsx applyUpdates):
 *   combatAdapter -> resolveDeathConsequence -> resolveTurnAffinity -> resolveTurnExp
 * Death runs first so kill_witnessed is ready for the same turn affinity pass.
 *
 * ASSUMPTIONS (documented per the P2 brief)
 * A1. NARRATIVE DEATH TRIGGER. The AI [CHARACTER_DEATH] tag aimed at the player
 *     is downgraded from a decision to a TRIGGER (plan.md C-1). There is no
 *     combat hand-off in that case and therefore no real margin_ratio, so the
 *     trigger uses margin_ratio = 1.0: P_death = clamp(BASE + SCALE, MIN, MAX) =
 *     0.95 with the defaults. A story that says the player died kills them 95%
 *     of the time and leaves a 5% "miraculous survival, but crippled" out. No
 *     new knob is introduced for this (the death block stays at 12 knobs).
 * A2. Branch A reads the WINNER npc_tag for medium_override; Branch B spare
 *     reads the LOSING NPC one, exactly as gdd-03 2.9 requires.
 * A3. death_flag = true on the player does NOT lock the slot (C-7). The App
 *     GameOverModal / handleRespawn path is unchanged; is_death_turn is still
 *     emitted so a future Turn Manager can disable Undo.
 */

import type { CharId, CombatHandoff, LockedFieldValue, Rng } from '../types';
import {
  FIELD_PREFIX_CONSEQUENCE_TYPE,
  FIELD_PREFIX_CONSEQUENCE_WITNESSES,
  FIELD_PREFIX_DEATH_FLAG,
  lockedFieldName,
} from '../types';
import { isDeepHostile } from '../affinity/bands';
import { classifyKillWitnessed, type ClassifiedSocialEvent } from '../affinity/classifyFromTags';
import { marginRatio as computeMarginRatio } from '../affinity/table';
import { rollDeath, type DeathKnobs, type DeathRollResult } from './deathRoll';
import { openPendingFate } from './pendingFate';
import {
  consequenceType,
  severityTier,
  tierCripples,
  type NpcTag,
  type SeverityTier,
} from './severityTier';
import {
  getDeathCharState,
  withDeathCharState,
  type DeathState,
  type PendingFate,
} from './state';

/** margin_ratio used by the narrative death trigger. See assumption A1. */
export const NARRATIVE_DEATH_MARGIN_RATIO = 1.0;

export type DeathBranch = 'none' | 'A' | 'B' | 'narrative';

export interface DeathResolveInput {
  turn: number;
  playerId: CharId;
  /** From the P0 combat adapter. Null for a narrative trigger. */
  handoff?: CombatHandoff | null;
  /** True when the AI emitted [CHARACTER_DEATH] for the player (assumption A1). */
  narrativeDeathTrigger?: boolean;
  /** START-OF-TURN affinity, before this turn affinity deltas (CR#3a, AC-03). */
  affinityOf: (id: CharId) => number;
  /** Untracked opponent means affinity 0 and never deep hostile (CR#3b, AC-04). */
  isTrackedNpc?: (id: CharId) => boolean;
  /** entities_in_scope from Situation Gen; witnesses derive from it. */
  entitiesInScope?: CharId[];
  npcTagOf?: (id: CharId) => NpcTag | null;
  nameOf?: (id: CharId) => string;
  rng: Rng;
  knobs: DeathKnobs;
  state: DeathState | null | undefined;
}

export interface DeathResolution {
  resolved: boolean;
  branch: DeathBranch;
  /** Locked mechanical fields for this turn. */
  fields: Record<string, LockedFieldValue>;
  is_death_turn: boolean;
  player_died: boolean;
  severity: SeverityTier | null;
  consequence_type: string | null;
  crippled_applied: boolean;
  forced_severe: boolean;
  /** Present ONLY when forced (AC-50); absent otherwise, never null or 0. */
  forced_severe_margin_ratio?: number;
  death_roll: DeathRollResult | null;
  pending_fate: PendingFate | null;
  /** Events handed straight to resolveTurnAffinity in the SAME turn (CR#2). */
  social_events: ClassifiedSocialEvent[];
  state: DeathState;
  /** Vietnamese system messages for the story log. */
  messages: string[];
  skipped_reason: string | null;
}

function emptyResolution(state: DeathState, reason: string | null): DeathResolution {
  return {
    resolved: false,
    branch: 'none',
    fields: {},
    is_death_turn: false,
    player_died: false,
    severity: null,
    consequence_type: null,
    crippled_applied: false,
    forced_severe: false,
    death_roll: null,
    pending_fate: null,
    social_events: [],
    state,
    messages: [],
    skipped_reason: reason,
  };
}

function witnessesOf(input: DeathResolveInput, exclude: CharId[]): CharId[] {
  const scope = input.entitiesInScope ?? [];
  return scope.filter((id) => !exclude.includes(id));
}

/** Vietnamese copy for surviving the roll, by tier. */
export function survivalMessage(tier: SeverityTier, forced: boolean): string {
  if (tier === 'severe') {
    return forced
      ? 'Ngươi thoát chết trong gang tấc, nhưng đan điền đã bị phế — tu vi tổn hại nghiêm trọng.'
      : 'Ngươi bại trận thảm hại: đan điền tổn thương, tu vi suy sụp.';
  }
  if (tier === 'medium') return 'Ngươi bại trận và chịu một phen sỉ nhục trước mặt kẻ khác.';
  return 'Ngươi bại trận, thân mang trọng thương nhưng vẫn giữ được mạng.';
}

export const CRIPPLED_APPLIED_MESSAGE =
  '**Phế Đan Điền**: kinh mạch tổn hại, ngươi không thể tích lũy tu vi cho tới khi hồi phục.';

export const CRIPPLED_RECOVERED_MESSAGE =
  '**Đan điền đã hồi phục**: ngươi lại có thể tích lũy tu vi như thường.';

interface AppliedConsequence {
  state: DeathState;
  fields: Record<string, LockedFieldValue>;
  consequence: string;
  crippled: boolean;
}

/**
 * Applies the D.2 consequence to one character and returns the new state plus
 * the locked fields. Shared by Branch A and by the Branch B spare path so the
 * two can never drift apart.
 */
function applyConsequence(
  state: DeathState,
  charId: CharId,
  tier: SeverityTier,
  npcTag: NpcTag | null,
  witnesses: CharId[],
): AppliedConsequence {
  const type = consequenceType(tier, npcTag);
  const crippled = tierCripples(tier);
  const before = getDeathCharState(state, charId);
  const next = {
    ...before,
    severity: tier,
    consequence_type: type,
    // CR#6: idempotent - a second severe loss does not stack (AC-32).
    death_and_consequence_blocked: before.death_and_consequence_blocked || crippled,
  };
  const fields: Record<string, LockedFieldValue> = {
    [lockedFieldName(FIELD_PREFIX_CONSEQUENCE_TYPE, charId)]: type,
    [lockedFieldName(FIELD_PREFIX_CONSEQUENCE_WITNESSES, charId)]: [...witnesses],
  };
  return { state: withDeathCharState(state, charId, next), fields, consequence: type, crippled };
}

/**
 * Branch A + Branch B entry point.
 *
 * Resolves ONLY when battle_active === false AND outcome.type is win/loss AND
 * is_spar_friendly === false AND the player is one of the two sides (CR#1);
 * or when a narrative death trigger fires (assumption A1).
 */
export function resolveDeathConsequence(input: DeathResolveInput): DeathResolution {
  const state = input.state ?? {};
  const knobs = input.knobs;
  const isTracked = input.isTrackedNpc ?? (() => true);

  if (input.narrativeDeathTrigger) return resolveNarrativeDeath(input);

  const handoff = input.handoff;
  if (!handoff) return emptyResolution(state, 'no_handoff');
  if (handoff.battle_active) return emptyResolution(state, 'battle_active');
  // AC-45: a friendly spar never resolves, EVEN when it produced win/lose.
  if (handoff.is_spar_friendly) return emptyResolution(state, 'spar_friendly');

  const outcome = handoff.outcome;
  if (!outcome || (outcome.type !== 'win' && outcome.type !== 'loss')) {
    return emptyResolution(state, 'no_outcome');
  }

  const playerId = input.playerId;
  if (outcome.winner_id !== playerId && outcome.loser_id !== playerId) {
    // NPC vs NPC is out of MVP scope (CR#1).
    return emptyResolution(state, 'player_not_involved');
  }

  // ---------------------------------------------------------------- Branch A
  if (outcome.loser_id === playerId) {
    const opponentId = outcome.winner_id;
    const opponentState = opponentId ? handoff.per_actor?.[opponentId] : undefined;
    const margin = opponentState
      ? computeMarginRatio(opponentState.hp_after, opponentState.max_HP)
      : 0;

    // CR#3: forced_severe is a LOCAL variable, reset at the start of every run,
    // never a persisted field (AC-42).
    let forcedSevere = false;
    let deathRoll: DeathRollResult | null = null;

    const opponentAffinity =
      opponentId && isTracked(opponentId) ? input.affinityOf(opponentId) : 0;

    if (opponentId && isDeepHostile(opponentAffinity)) {
      deathRoll = rollDeath(margin, input.rng, knobs);
      if (deathRoll.died) {
        // AC-06: the death flags lock and D.2 never runs.
        const next = {
          ...getDeathCharState(state, playerId),
          alive: false,
          death_flag: true,
        };
        return {
          resolved: true,
          branch: 'A',
          fields: { [lockedFieldName(FIELD_PREFIX_DEATH_FLAG, playerId)]: true },
          is_death_turn: true,
          player_died: true,
          severity: null,
          consequence_type: null,
          crippled_applied: false,
          forced_severe: false,
          death_roll: deathRoll,
          pending_fate: null,
          social_events: [],
          state: withDeathCharState(state, playerId, next),
          messages: ['Ngươi đã tử vong dưới tay kẻ tử thù.'],
          skipped_reason: null,
        };
      }
      forcedSevere = true;
    }

    const tier = severityTier(margin, knobs, forcedSevere);
    const witnesses = witnessesOf(input, [playerId]);
    const wasCrippledBefore = getDeathCharState(state, playerId).death_and_consequence_blocked;
    const applied = applyConsequence(
      state,
      playerId,
      tier,
      // Assumption A2: Branch A reads the WINNER tag.
      opponentId && input.npcTagOf ? input.npcTagOf(opponentId) : null,
      witnesses,
    );

    const fields: Record<string, LockedFieldValue> = { ...applied.fields };
    if (forcedSevere) {
      // AC-50: present with the ORIGINAL margin only when forced; narration only.
      fields.forced_severe_margin_ratio = margin;
    }

    const messages = [survivalMessage(tier, forcedSevere)];
    if (applied.crippled && !wasCrippledBefore) messages.push(CRIPPLED_APPLIED_MESSAGE);

    return {
      resolved: true,
      branch: 'A',
      fields,
      is_death_turn: false,
      player_died: false,
      severity: tier,
      consequence_type: applied.consequence,
      crippled_applied: applied.crippled && !wasCrippledBefore,
      forced_severe: forcedSevere,
      ...(forcedSevere ? { forced_severe_margin_ratio: margin } : {}),
      death_roll: deathRoll,
      pending_fate: null,
      social_events: [],
      state: applied.state,
      messages,
      skipped_reason: null,
    };
  }

  // ---------------------------------------------------------------- Branch B
  const loserId = outcome.loser_id;
  if (!loserId || !isTracked(loserId)) {
    // A beast or an untracked opponent has no Character Card: nothing to spare
    // or execute (gdd-03 EC "combat opponent is not a tracked NPC").
    return emptyResolution(state, 'untracked_loser');
  }
  const winnerState = handoff.per_actor?.[playerId];
  const margin = winnerState ? computeMarginRatio(winnerState.hp_after, winnerState.max_HP) : 0;
  const fate = openPendingFate(loserId, input.turn, margin, witnessesOf(input, [loserId]));
  const nextLoser = { ...getDeathCharState(state, loserId), pending_fate: fate };

  return {
    resolved: true,
    branch: 'B',
    fields: {},
    is_death_turn: false,
    player_died: false,
    severity: null,
    consequence_type: null,
    crippled_applied: false,
    forced_severe: false,
    death_roll: null,
    pending_fate: fate,
    social_events: [],
    state: withDeathCharState(state, loserId, nextLoser),
    messages: [],
    skipped_reason: null,
  };
}

/**
 * Assumption A1: the AI said the player died. The module - not the AI - decides
 * whether that is survivable, using the same D.1 roll at maximum margin.
 */
export function resolveNarrativeDeath(input: DeathResolveInput): DeathResolution {
  const state = input.state ?? {};
  const playerId = input.playerId;
  const deathRoll = rollDeath(NARRATIVE_DEATH_MARGIN_RATIO, input.rng, input.knobs);

  if (deathRoll.died) {
    const next = { ...getDeathCharState(state, playerId), alive: false, death_flag: true };
    return {
      resolved: true,
      branch: 'narrative',
      fields: { [lockedFieldName(FIELD_PREFIX_DEATH_FLAG, playerId)]: true },
      is_death_turn: true,
      player_died: true,
      severity: null,
      consequence_type: null,
      crippled_applied: false,
      forced_severe: false,
      death_roll: deathRoll,
      pending_fate: null,
      social_events: [],
      state: withDeathCharState(state, playerId, next),
      messages: [],
      skipped_reason: null,
    };
  }

  const witnesses = witnessesOf(input, [playerId]);
  const wasCrippledBefore = getDeathCharState(state, playerId).death_and_consequence_blocked;
  const applied = applyConsequence(state, playerId, 'severe', null, witnesses);
  const messages = [survivalMessage('severe', true)];
  if (applied.crippled && !wasCrippledBefore) messages.push(CRIPPLED_APPLIED_MESSAGE);

  return {
    resolved: true,
    branch: 'narrative',
    fields: { ...applied.fields, forced_severe_margin_ratio: NARRATIVE_DEATH_MARGIN_RATIO },
    is_death_turn: false,
    player_died: false,
    severity: 'severe',
    consequence_type: applied.consequence,
    crippled_applied: applied.crippled && !wasCrippledBefore,
    forced_severe: true,
    forced_severe_margin_ratio: NARRATIVE_DEATH_MARGIN_RATIO,
    death_roll: deathRoll,
    pending_fate: null,
    social_events: [],
    state: applied.state,
    messages,
    skipped_reason: null,
  };
}

export interface PendingFateResolveInput {
  fate: PendingFate;
  /** From classifyFateIntent - deterministic, never an AI judgement. */
  intent: 'execute' | 'spare';
  turn: number;
  playerId: CharId;
  npcTagOf?: (id: CharId) => NpcTag | null;
  nameOf?: (id: CharId) => string;
  knobs: DeathKnobs;
  state: DeathState | null | undefined;
}

/**
 * Branch B resolution at turn confirmation.
 *
 * Sparing is the DEFAULT: it fires when the pending-fate turn is confirmed
 * without an explicit execute, including when the player did something else
 * entirely (CR#4, AC-11).
 */
export function resolvePendingFate(input: PendingFateResolveInput): DeathResolution {
  const state = input.state ?? {};
  const fate = input.fate;
  const npcId = fate.npc_id;

  if (input.intent === 'execute') {
    const next = {
      ...getDeathCharState(state, npcId),
      alive: false,
      death_flag: true,
      pending_fate: null,
    };
    // AC-34: emitted even with an EMPTY witness set.
    const killEvent = classifyKillWitnessed(npcId, fate.witnesses, input.playerId);
    const name = input.nameOf ? input.nameOf(npcId) : npcId;
    return {
      resolved: true,
      branch: 'B',
      fields: { [lockedFieldName(FIELD_PREFIX_DEATH_FLAG, npcId)]: true },
      is_death_turn: false,
      player_died: false,
      severity: null,
      consequence_type: null,
      crippled_applied: false,
      forced_severe: false,
      death_roll: null,
      pending_fate: null,
      social_events: [killEvent],
      state: withDeathCharState(state, npcId, next),
      messages: ['Ngươi đã kết liễu **' + name + '**.'],
      skipped_reason: null,
    };
  }

  // Spare: the SAME D.2 table, using that battle margin_ratio, subject = the
  // player as winner (CR#4, AC-10).
  const tier = severityTier(fate.margin_ratio, input.knobs);
  const applied = applyConsequence(
    state,
    npcId,
    tier,
    // Assumption A2: Branch B spare reads the LOSING NPC tag.
    input.npcTagOf ? input.npcTagOf(npcId) : null,
    fate.witnesses,
  );
  const cleared = withDeathCharState(applied.state, npcId, {
    ...getDeathCharState(applied.state, npcId),
    pending_fate: null,
  });

  const socialEvents: ClassifiedSocialEvent[] = [];
  if (tier === 'medium') {
    // AC-49: exactly one insult event, reusing the existing D.1 row. 0 witnesses
    // is still valid. Branch A has NO mirror event.
    socialEvents.push({
      type: 'insult',
      actor: input.playerId,
      target: npcId,
      witnesses: [...fate.witnesses],
      reason: 'Bị đánh bại và tha mạng trước mặt người khác',
      source: 'death',
    });
  }

  const name = input.nameOf ? input.nameOf(npcId) : npcId;
  return {
    resolved: true,
    branch: 'B',
    fields: applied.fields,
    is_death_turn: false,
    player_died: false,
    severity: tier,
    consequence_type: applied.consequence,
    crippled_applied: applied.crippled,
    forced_severe: false,
    death_roll: null,
    pending_fate: null,
    social_events: socialEvents,
    state: cleared,
    messages: ['Ngươi tha mạng cho **' + name + '**.'],
    skipped_reason: null,
  };
}
