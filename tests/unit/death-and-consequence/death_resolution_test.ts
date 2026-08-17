/**
 * Death & Consequence - Branch A (player loses), Branch B (player wins ->
 * Pending Fate), the narrative death trigger, and the state table.
 *
 * AC coverage (gdd-03 PART 2, 2.8): AC-01..AC-15, AC-32..AC-37, AC-39 (adapted
 * to decision C-7), AC-40..AC-42, AC-45, AC-49, AC-50.
 *
 * DEVIATIONS UNDER TEST (plan.md): C-7 keeps `handleRespawn`, so a true death
 * locks `death_flag` + `is_death_turn` but never locks a slot; C-11 expresses
 * `severe` through a long-term status instead of a combat multiplier.
 */

import { describe, expect, it } from 'vitest';
import {
  NARRATIVE_DEATH_MARGIN_RATIO,
  resolveDeathConsequence,
  resolveNarrativeDeath,
  resolvePendingFate,
} from '../../../src-web/systems/death/resolveDeathConsequence';
import {
  classifyFateIntent,
  isPendingFateOpen,
  openPendingFate,
  pendingFateSuggestions,
} from '../../../src-web/systems/death/pendingFate';
import {
  ensureDeathState,
  getDeathCharState,
  initDeathCharState,
  isCrippled,
  withDeathCharState,
} from '../../../src-web/systems/death/state';
import { CONSEQUENCE_TYPE } from '../../../src-web/systems/death/severityTier';
import { DEEP_HOSTILITY_THRESHOLD } from '../../../src-web/systems/registry';
import {
  ENEMY_ID,
  PLAYER_ID,
  deps,
  knobs,
  lossHandoff,
  rngNeverCalled,
  rngSequence,
  winHandoff,
} from './fixtures';

const K = knobs();
const HOSTILE = { [ENEMY_ID]: -85 };
const FRIENDLY = { [ENEMY_ID]: 0 };

describe('activation scope (AC-01, AC-45)', () => {
  it('test_resolves_on_a_lethal_loss', () => {
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(20),
    });
    expect(result.resolved).toBe(true);
    expect(result.branch).toBe('A');
  });

  it('test_never_resolves_on_no_outcome_or_flee', () => {
    for (const type of ['none', 'flee'] as const) {
      const result = resolveDeathConsequence({
        ...deps(HOSTILE, rngNeverCalled()),
        handoff: { ...lossHandoff(90), outcome: { type, winner_id: null, loser_id: null } },
      });
      expect(result.resolved).toBe(false);
      expect(result.skipped_reason).toBe('no_outcome');
    }
  });

  it('test_never_resolves_while_the_battle_is_still_running', () => {
    const result = resolveDeathConsequence({
      ...deps(HOSTILE, rngNeverCalled()),
      handoff: { ...lossHandoff(90), battle_active: true },
    });
    expect(result.resolved).toBe(false);
    expect(result.skipped_reason).toBe('battle_active');
  });

  it('test_friendly_spar_never_resolves_even_with_a_winner', () => {
    // AC-45: all setters must stay untouched (the RNG stub proves no roll ran).
    const result = resolveDeathConsequence({
      ...deps(HOSTILE, rngNeverCalled()),
      handoff: { ...lossHandoff(90), is_spar_friendly: true },
    });
    expect(result.resolved).toBe(false);
    expect(result.skipped_reason).toBe('spar_friendly');
    expect(result.state).toEqual({});
  });

  it('test_npc_vs_npc_is_out_of_scope', () => {
    const result = resolveDeathConsequence({
      ...deps(HOSTILE, rngNeverCalled()),
      handoff: {
        ...lossHandoff(90),
        outcome: { type: 'win', winner_id: 'npc_a', loser_id: 'npc_b' },
      },
    });
    expect(result.skipped_reason).toBe('player_not_involved');
  });

  it('test_missing_handoff_is_not_an_error', () => {
    const result = resolveDeathConsequence({ ...deps(HOSTILE, rngNeverCalled()), handoff: null });
    expect(result.resolved).toBe(false);
    expect(result.skipped_reason).toBe('no_handoff');
  });
});

describe('Branch A - player loses (AC-03..AC-08, AC-41, AC-42, AC-50)', () => {
  it('test_untracked_opponent_never_rolls_for_death', () => {
    // AC-04: treated as affinity 0, so the deep-hostility branch is skipped.
    const result = resolveDeathConsequence({
      ...deps({ [ENEMY_ID]: -100 }, rngNeverCalled()),
      handoff: lossHandoff(90),
      isTrackedNpc: () => false,
    });
    expect(result.death_roll).toBeNull();
    expect(result.player_died).toBe(false);
  });

  it('test_death_roll_fires_at_minus_80_and_minus_81_but_not_minus_79', () => {
    // AC-05, and the threshold is owned by Affinity (inclusive <=).
    for (const affinity of [-80, -81, -100]) {
      const result = resolveDeathConsequence({
        ...deps({ [ENEMY_ID]: affinity }, rngSequence(0.99)),
        handoff: lossHandoff(20),
      });
      expect(result.death_roll).not.toBeNull();
    }
    const safe = resolveDeathConsequence({
      ...deps({ [ENEMY_ID]: -79 }, rngNeverCalled()),
      handoff: lossHandoff(20),
    });
    expect(safe.death_roll).toBeNull();
    expect(DEEP_HOSTILITY_THRESHOLD).toBe(-80);
  });

  it('test_start_of_turn_affinity_is_what_is_read', () => {
    // AC-03: -85 at the start of the turn is what matters, not a later -75.
    const result = resolveDeathConsequence({
      ...deps({ [ENEMY_ID]: -85 }, rngSequence(0.99)),
      handoff: lossHandoff(20),
    });
    expect(result.death_roll).not.toBeNull();
  });

  it('test_true_death_locks_the_flags_and_skips_d2_entirely', () => {
    // AC-06 adapted to C-7: no slot lock, but the flags and is_death_turn lock.
    const result = resolveDeathConsequence({
      ...deps(HOSTILE, rngSequence(0.0)),
      handoff: lossHandoff(90),
    });
    expect(result.player_died).toBe(true);
    expect(result.is_death_turn).toBe(true);
    expect(result.fields[`death_flag_${PLAYER_ID}`]).toBe(true);
    expect(result.severity).toBeNull();
    expect(result.consequence_type).toBeNull();
    expect(getDeathCharState(result.state, PLAYER_ID).alive).toBe(false);
  });

  it('test_surviving_the_roll_forces_severe_regardless_of_margin', () => {
    // AC-07: margin 0.05 would normally be mild.
    const result = resolveDeathConsequence({
      ...deps(HOSTILE, rngSequence(0.999)),
      handoff: lossHandoff(5),
    });
    expect(result.player_died).toBe(false);
    expect(result.forced_severe).toBe(true);
    expect(result.severity).toBe('severe');
    expect(result.crippled_applied).toBe(true);
    expect(getDeathCharState(result.state, PLAYER_ID).death_and_consequence_blocked).toBe(true);
  });

  it('test_contrast_case_proves_the_flag_caused_the_severity', () => {
    // AC-07 contrast: same margin, non-hostile opponent -> mild.
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(5),
    });
    expect(result.severity).toBe('mild');
    expect(result.consequence_type).toBe(CONSEQUENCE_TYPE.MILD);
  });

  it('test_normal_d2_applies_when_not_forced', () => {
    // AC-08: margin 0.5 -> medium.
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(50),
    });
    expect(result.severity).toBe('medium');
    expect(result.consequence_type).toBe(CONSEQUENCE_TYPE.MEDIUM);
    expect(result.crippled_applied).toBe(false);
  });

  it('test_forced_severe_margin_ratio_is_present_only_when_forced', () => {
    // AC-50: absent - not null, not 0 - in the normal severe case.
    const forced = resolveDeathConsequence({
      ...deps(HOSTILE, rngSequence(0.999)),
      handoff: lossHandoff(5),
    });
    expect(forced.fields.forced_severe_margin_ratio).toBeCloseTo(0.05, 10);
    expect(forced.forced_severe_margin_ratio).toBeCloseTo(0.05, 10);

    const naturalSevere = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(90),
    });
    expect(naturalSevere.severity).toBe('severe');
    expect('forced_severe_margin_ratio' in naturalSevere.fields).toBe(false);
    expect('forced_severe_margin_ratio' in naturalSevere).toBe(false);
  });

  it('test_forced_severe_never_leaks_across_battles', () => {
    // AC-42: it is a local variable, never a persisted field.
    const first = resolveDeathConsequence({
      ...deps(HOSTILE, rngSequence(0.999)),
      handoff: lossHandoff(5),
    });
    expect(first.forced_severe).toBe(true);
    const second = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(5),
      state: first.state,
    });
    expect(second.forced_severe).toBe(false);
    expect(second.severity).toBe('mild');
    expect(JSON.stringify(first.state)).not.toContain('forced_severe');
  });

  it('test_max_hp_zero_does_not_crash', () => {
    // AC-41: the denominator floor keeps margin finite.
    const handoff = lossHandoff(50, 0);
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff,
    });
    expect(result.resolved).toBe(true);
    expect(['mild', 'medium', 'severe']).toContain(result.severity);
  });

  it('test_consequence_witnesses_exclude_the_subject', () => {
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(50),
      entitiesInScope: [PLAYER_ID, 'npc_witness'],
    });
    expect(result.fields[`consequence_witnesses_${PLAYER_ID}`]).toEqual(['npc_witness']);
  });

  it('test_double_cripple_is_idempotent', () => {
    // AC-32: a second severe loss does not stack.
    const first = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(90),
    });
    const second = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(90),
      state: first.state,
    });
    expect(getDeathCharState(second.state, PLAYER_ID).death_and_consequence_blocked).toBe(true);
    // Already crippled -> nothing NEW is applied, so no duplicate status/message.
    expect(second.crippled_applied).toBe(false);
  });

  it('test_being_crippled_is_not_death_insurance', () => {
    // AC-33.
    const crippled = withDeathCharState({}, PLAYER_ID, {
      ...initDeathCharState(),
      death_and_consequence_blocked: true,
    });
    const result = resolveDeathConsequence({
      ...deps(HOSTILE, rngSequence(0.0)),
      handoff: lossHandoff(90),
      state: crippled,
    });
    expect(result.death_roll).not.toBeNull();
    expect(result.player_died).toBe(true);
  });

  it('test_branch_a_emits_no_social_event', () => {
    // AC-49 second half: the game does not track player->NPC affinity.
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(50),
    });
    expect(result.social_events).toEqual([]);
  });
});

describe('Branch B - player wins (AC-09..AC-12, AC-34, AC-49)', () => {
  const openWin = () =>
    resolveDeathConsequence({ ...deps(FRIENDLY, rngNeverCalled()), handoff: winHandoff(50) });

  it('test_a_win_opens_a_pending_fate_window_for_the_loser', () => {
    const result = openWin();
    expect(result.branch).toBe('B');
    expect(result.pending_fate?.npc_id).toBe(ENEMY_ID);
    expect(result.pending_fate?.margin_ratio).toBeCloseTo(0.5, 10);
    expect(getDeathCharState(result.state, ENEMY_ID).pending_fate).not.toBeNull();
  });

  it('test_untracked_loser_opens_nothing', () => {
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: winHandoff(50),
      isTrackedNpc: () => false,
    });
    expect(result.resolved).toBe(false);
    expect(result.skipped_reason).toBe('untracked_loser');
  });

  it('test_window_lasts_exactly_one_turn', () => {
    const fate = openPendingFate(ENEMY_ID, 10, 0.5, ['npc_witness']);
    expect(isPendingFateOpen(fate, 10)).toBe(true);
    expect(isPendingFateOpen(fate, 11)).toBe(true);
    expect(isPendingFateOpen(fate, 12)).toBe(false);
    expect(isPendingFateOpen(null, 10)).toBe(false);
  });

  it('test_two_forced_suggestions_are_offered', () => {
    const suggestions = pendingFateSuggestions('Lão Trương');
    expect(suggestions).toHaveLength(2);
    expect(suggestions.every((s) => s.source === 'pending_fate')).toBe(true);
    expect(suggestions[0].text).toContain('Kết liễu');
    expect(suggestions[1].text).toContain('Tha mạng');
  });

  it('test_execute_locks_the_npc_flags_and_emits_kill_witnessed', () => {
    // AC-09: the victim is removed from its own witness list.
    const fate = openPendingFate(ENEMY_ID, 10, 0.5, [ENEMY_ID, 'npc_witness']);
    const result = resolvePendingFate({
      fate,
      intent: 'execute',
      turn: 11,
      playerId: PLAYER_ID,
      knobs: K,
      state: {},
    });
    expect(result.fields[`death_flag_${ENEMY_ID}`]).toBe(true);
    expect(getDeathCharState(result.state, ENEMY_ID).alive).toBe(false);
    expect(result.social_events[0].type).toBe('kill_witnessed');
    expect(result.social_events[0].witnesses).toEqual(['npc_witness']);
  });

  it('test_witnessless_execute_still_emits_an_empty_kill_event', () => {
    // AC-34.
    const fate = openPendingFate(ENEMY_ID, 10, 0.5, []);
    const result = resolvePendingFate({
      fate,
      intent: 'execute',
      turn: 11,
      playerId: PLAYER_ID,
      knobs: K,
      state: {},
    });
    expect(result.social_events).toHaveLength(1);
    expect(result.social_events[0].witnesses).toEqual([]);
  });

  it('test_spare_uses_the_same_d2_with_the_players_margin', () => {
    // AC-10: margin 0.9 (the player as winner) -> severe for the NPC.
    const fate = openPendingFate(ENEMY_ID, 10, 0.9, ['npc_witness']);
    const result = resolvePendingFate({
      fate,
      intent: 'spare',
      turn: 11,
      playerId: PLAYER_ID,
      knobs: K,
      state: {},
    });
    expect(result.severity).toBe('severe');
    expect(getDeathCharState(result.state, ENEMY_ID).death_and_consequence_blocked).toBe(true);
    expect(getDeathCharState(result.state, ENEMY_ID).alive).toBe(true);
  });

  it('test_medium_spare_emits_exactly_one_insult_event', () => {
    // AC-49.
    const fate = openPendingFate(ENEMY_ID, 10, 0.5, ['npc_witness']);
    const result = resolvePendingFate({
      fate,
      intent: 'spare',
      turn: 11,
      playerId: PLAYER_ID,
      knobs: K,
      state: {},
    });
    expect(result.severity).toBe('medium');
    expect(result.social_events).toHaveLength(1);
    expect(result.social_events[0].type).toBe('insult');
    expect(result.social_events[0].target).toBe(ENEMY_ID);
  });

  it('test_mild_and_severe_spares_emit_no_insult', () => {
    for (const margin of [0.1, 0.9]) {
      const result = resolvePendingFate({
        fate: openPendingFate(ENEMY_ID, 10, margin, []),
        intent: 'spare',
        turn: 11,
        playerId: PLAYER_ID,
        knobs: K,
        state: {},
      });
      expect(result.social_events).toEqual([]);
    }
  });

  it('test_the_window_closes_after_resolution', () => {
    const result = resolvePendingFate({
      fate: openPendingFate(ENEMY_ID, 10, 0.5, []),
      intent: 'spare',
      turn: 11,
      playerId: PLAYER_ID,
      knobs: K,
      state: {},
    });
    expect(getDeathCharState(result.state, ENEMY_ID).pending_fate).toBeNull();
  });

  it('test_ambiguous_intent_is_always_downgraded_to_spare', () => {
    // AC-12: the destructive reading is never the default.
    expect(classifyFateIntent('Ta đứng nhìn hắn hồi lâu')).toBe('spare');
    expect(classifyFateIntent('')).toBe('spare');
    expect(classifyFateIntent(null)).toBe('spare');
    expect(classifyFateIntent('Đi về nhà')).toBe('spare');
  });

  it('test_explicit_execution_keywords_are_recognised', () => {
    expect(classifyFateIntent('Kết liễu hắn')).toBe('execute');
    expect(classifyFateIntent('GIẾT')).toBe('execute');
    expect(classifyFateIntent('Ta quyết không tha, lấy mạng hắn')).toBe('execute');
  });

  it('test_explicit_mercy_stays_mercy', () => {
    expect(classifyFateIntent('Tha mạng cho ngươi')).toBe('spare');
    expect(classifyFateIntent('Buông tha hắn đi')).toBe('spare');
  });
});

describe('narrative death trigger (plan.md C-1, module assumption A1)', () => {
  it('test_trigger_rolls_at_the_maximum_margin', () => {
    const result = resolveNarrativeDeath({ ...deps(FRIENDLY, rngSequence(0.5)), state: {} });
    expect(NARRATIVE_DEATH_MARGIN_RATIO).toBe(1.0);
    expect(result.death_roll?.p_death).toBeCloseTo(K.DEATH_ROLL_MAX, 10);
    expect(result.player_died).toBe(true);
  });

  it('test_the_five_percent_survival_leaves_the_player_crippled', () => {
    const result = resolveNarrativeDeath({ ...deps(FRIENDLY, rngSequence(0.99)), state: {} });
    expect(result.player_died).toBe(false);
    expect(result.severity).toBe('severe');
    expect(result.forced_severe).toBe(true);
    expect(result.crippled_applied).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it('test_the_entry_point_routes_a_trigger_even_without_a_handoff', () => {
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngSequence(0.99)),
      narrativeDeathTrigger: true,
      handoff: null,
    });
    expect(result.branch).toBe('narrative');
    expect(result.resolved).toBe(true);
  });
});

describe('state table ownership (AC-13, AC-15, AC-36, AC-39 adapted)', () => {
  it('test_alive_lazy_inits_to_true_and_blocked_to_false', () => {
    // AC-13, AC-15, AC-36.
    const fresh = getDeathCharState({}, 'never_seen');
    expect(fresh.alive).toBe(true);
    expect(fresh.death_flag).toBe(false);
    expect(fresh.death_and_consequence_blocked).toBe(false);
    expect(fresh.recovery_progress.last_self_attempt_turn).toBeNull();
    expect(fresh.pending_fate).toBeNull();
  });

  it('test_flags_never_inherit_between_characters', () => {
    const state = withDeathCharState({}, PLAYER_ID, {
      ...initDeathCharState(),
      death_and_consequence_blocked: true,
    });
    expect(isCrippled(state, PLAYER_ID)).toBe(true);
    expect(isCrippled(state, 'another_char')).toBe(false);
  });

  it('test_blocked_never_expires_on_its_own', () => {
    // AC-15: 100 idle turns change nothing.
    let state = withDeathCharState({}, PLAYER_ID, {
      ...initDeathCharState(),
      death_and_consequence_blocked: true,
    });
    for (let turn = 0; turn < 100; turn += 1) state = ensureDeathState(state);
    expect(isCrippled(state, PLAYER_ID)).toBe(true);
  });

  it('test_ensure_death_state_normalises_an_old_save', () => {
    const normalised = ensureDeathState({ [PLAYER_ID]: { death_flag: true } });
    expect(normalised[PLAYER_ID].alive).toBe(true);
    expect(normalised[PLAYER_ID].death_flag).toBe(true);
    expect(normalised[PLAYER_ID].recovery_progress.attempts).toBe(0);
    expect(ensureDeathState(undefined)).toEqual({});
    expect(ensureDeathState(null)).toEqual({});
  });

  it('test_resolution_never_mutates_the_state_it_was_given', () => {
    const state = {};
    const result = resolveDeathConsequence({
      ...deps(FRIENDLY, rngNeverCalled()),
      handoff: lossHandoff(90),
      state,
    });
    expect(state).toEqual({});
    expect(result.state).not.toBe(state);
  });
});
