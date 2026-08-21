/**
 * NPC Affinity - deterministic classification of what the AI already emits.
 *
 * Contract under test (gdd-03 CR#2, plan.md C-1): the classifier may read WHICH
 * NPC and WHAT KIND of thing happened, and - only as a fallback - the SIGN the
 * AI suggested. It may never take the AI's magnitude.
 */

import { describe, expect, it } from 'vitest';
import {
  FALLBACK_EVENT_TYPE,
  classifyFromCombatHandoff,
  classifyKillWitnessed,
  classifyQuestCompleted,
  classifyRelationshipTag,
  fallbackFromSign,
  matchEventKeyword,
  normalizeVietnamese,
} from '../../../src-web/systems/affinity/classifyFromTags';
import { baseDelta, severityOf } from '../../../src-web/systems/affinity/table';
import type { CombatHandoff } from '../../../src-web/systems/types';
import { knobs, PLAYER_ID } from './fixtures';

const K = knobs();

const ctx = {
  actor: PLAYER_ID,
  npcIdByName: (name: string) => (name === 'Lão Trương' ? 'npc_truong' : null),
  witnesses: ['npc_witness'],
};

function handoff(overrides: Partial<CombatHandoff> = {}): CombatHandoff {
  return {
    battle_active: false,
    in_combat: true,
    is_spar_friendly: false,
    outcome: { type: 'win', winner_id: PLAYER_ID, loser_id: 'npc_truong' },
    per_actor: {
      [PLAYER_ID]: { hp_after: 50, max_HP: 100 },
      npc_truong: { hp_after: 0, max_HP: 80 },
    },
    ...overrides,
  };
}

describe('normalisation and keyword matching', () => {
  it('test_diacritics_are_stripped_for_matching', () => {
    expect(normalizeVietnamese('Xúc Phạm')).toBe('xuc pham');
    expect(normalizeVietnamese('ĐE DỌA')).toBe('de doa');
  });

  it('test_keyword_rows_map_to_the_right_event_type', () => {
    expect(matchEventKeyword('Ngươi đã cứu mạng lão')).toBe('save_life');
    expect(matchEventKeyword('Ngươi tặng nàng một cây trâm')).toBe('gift');
    expect(matchEventKeyword('Ngươi giúp đỡ hắn dọn hàng')).toBe('small_help');
    expect(matchEventKeyword('Ngươi sỉ nhục hắn giữa chợ')).toBe('insult');
    expect(matchEventKeyword('Ngươi đe dọa sẽ giết cả nhà hắn')).toBe('threaten');
    expect(matchEventKeyword('Ngươi phản bội lời thề')).toBe('betray');
  });

  it('test_gravest_reading_wins_on_an_ambiguous_sentence', () => {
    // "giúp" also appears, but a rescue is the graver, more specific reading.
    expect(matchEventKeyword('Ngươi liều mình cứu mạng rồi giúp hắn về nhà')).toBe('save_life');
    expect(matchEventKeyword('Ngươi giúp hắn xong lại phản bội hắn')).toBe('betray');
  });

  it('test_unmatched_text_returns_null', () => {
    expect(matchEventKeyword('Ngươi đi ngang qua và không nói gì')).toBeNull();
    expect(matchEventKeyword('')).toBeNull();
  });
});

describe('RELATIONSHIP_CHANGED classification (plan.md C-1)', () => {
  it('test_keyword_wins_and_magnitude_comes_from_d1_not_from_the_ai', () => {
    const evt = classifyRelationshipTag(
      { NPC: 'Lão Trương', Standing: 'Kính nể', Reason: 'Ngươi đã cứu mạng con lão.', AffinityChange: '+99' },
      ctx,
    );
    expect(evt?.type).toBe('save_life');
    // The AI asked for +99; D.1 prices it at +15.
    expect(baseDelta(evt!, K)).toBe(15);
  });

  it('test_unknown_npc_produces_no_event', () => {
    expect(classifyRelationshipTag({ NPC: 'Người Lạ', Reason: 'tặng quà' }, ctx)).toBeNull();
  });

  it('test_missing_npc_field_produces_no_event', () => {
    expect(classifyRelationshipTag({ Reason: 'tặng quà' }, ctx)).toBeNull();
    expect(classifyRelationshipTag(null, ctx)).toBeNull();
  });

  it('test_fallback_uses_only_the_sign', () => {
    expect(fallbackFromSign('+3')).toBe('minor_positive');
    expect(fallbackFromSign(-20)).toBe('minor_negative');
    expect(fallbackFromSign('0')).toBe('neutral');
    expect(fallbackFromSign(undefined)).toBe('neutral');
  });

  it('test_positive_fallback_is_priced_as_small_help', () => {
    const evt = classifyRelationshipTag(
      { NPC: 'Lão Trương', Reason: 'Hai người trò chuyện vui vẻ.', AffinityChange: '+12' },
      ctx,
    );
    expect(evt?.type).toBe(FALLBACK_EVENT_TYPE.minor_positive);
    expect(baseDelta(evt!, K)).toBe(3);
  });

  it('test_negative_fallback_is_priced_as_insult_and_cannot_propagate', () => {
    const evt = classifyRelationshipTag(
      { NPC: 'Lão Trương', Reason: 'Lão tỏ ra khó chịu.', AffinityChange: '-25' },
      ctx,
    );
    expect(evt?.type).toBe(FALLBACK_EVENT_TYPE.minor_negative);
    expect(baseDelta(evt!, K)).toBe(-8);
    // Severity 2 < PROPAGATION_SEVERITY_MIN: a mis-parse stays local.
    expect(severityOf(evt!, K)).toBeLessThan(K.PROPAGATION_SEVERITY_MIN);
  });

  it('test_neutral_tag_with_no_keyword_produces_no_event', () => {
    expect(
      classifyRelationshipTag({ NPC: 'Lão Trương', Standing: 'Bình thản', Reason: 'Lão gật đầu.' }, ctx),
    ).toBeNull();
  });

  it('test_target_is_never_its_own_witness', () => {
    const evt = classifyRelationshipTag(
      { NPC: 'Lão Trương', Reason: 'Ngươi tặng quà' },
      { ...ctx, witnesses: ['npc_truong', 'npc_witness'] },
    );
    expect(evt?.witnesses).toEqual(['npc_witness']);
  });
});

describe('combat hand-off classification (gdd-03 CR#1)', () => {
  const combatCtx = { ...ctx, playerId: PLAYER_ID, npcIdByName: (n: string) => n };

  it('test_player_win_produces_combat_win_with_the_winner_margin', () => {
    const events = classifyFromCombatHandoff(handoff(), combatCtx);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('combat_win_vs_npc');
    expect(events[0].margin_ratio).toBe(0.5);
    expect(baseDelta(events[0], K)).toBe(-10);
  });

  it('test_player_loss_produces_the_flat_minus_three_row', () => {
    const events = classifyFromCombatHandoff(
      handoff({ outcome: { type: 'loss', winner_id: 'npc_truong', loser_id: PLAYER_ID } }),
      combatCtx,
    );
    expect(events[0].type).toBe('combat_loss_vs_npc');
    expect(baseDelta(events[0], K)).toBe(-3);
  });

  it('test_friendly_spar_produces_nothing', () => {
    expect(classifyFromCombatHandoff(handoff({ is_spar_friendly: true }), combatCtx)).toEqual([]);
    expect(
      classifyFromCombatHandoff(handoff(), { ...combatCtx, combatType: 'Sparring' }),
    ).toEqual([]);
  });

  it('test_running_battle_and_no_outcome_produce_nothing', () => {
    expect(classifyFromCombatHandoff(handoff({ battle_active: true }), combatCtx)).toEqual([]);
    expect(
      classifyFromCombatHandoff(
        handoff({ outcome: { type: 'none', winner_id: null, loser_id: null } }),
        combatCtx,
      ),
    ).toEqual([]);
    expect(
      classifyFromCombatHandoff(
        handoff({ outcome: { type: 'flee', winner_id: null, loser_id: null } }),
        combatCtx,
      ),
    ).toEqual([]);
  });

  it('test_null_handoff_is_not_an_error', () => {
    expect(classifyFromCombatHandoff(null, combatCtx)).toEqual([]);
  });
});

describe('death and quest classification', () => {
  it('test_kill_witnessed_excludes_the_victim_from_its_own_witness_list', () => {
    const evt = classifyKillWitnessed('npc_victim', ['npc_victim', 'w1'], PLAYER_ID);
    expect(evt.type).toBe('kill_witnessed');
    expect(evt.witnesses).toEqual(['w1']);
  });

  it('test_kill_with_empty_witnesses_is_still_a_valid_event', () => {
    const evt = classifyKillWitnessed('npc_victim', [], PLAYER_ID);
    expect(evt.witnesses).toEqual([]);
  });

  it('test_quest_completion_is_priced_as_small_help', () => {
    const evt = classifyQuestCompleted('npc_truong', ctx);
    expect(evt.type).toBe('small_help');
    expect(baseDelta(evt, K)).toBe(3);
  });
});
