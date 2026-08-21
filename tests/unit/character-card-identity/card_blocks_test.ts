/**
 * Character Card & Identity - D.1 `card_exists` and the block-build algorithm.
 *
 * AC coverage (gdd-06 PART B, B8): AC-03/04/05, AC-09/10/11/48, AC-29..AC-33,
 * AC-35..AC-38, plus decision C-6 (the card holds no Song Tu threshold).
 */

import { describe, expect, it } from 'vitest';
import {
  CARD_BLOCK_ORDER,
  buildCardBlocks,
  cardExists,
  displayTier,
  formatStatValue,
} from '../../../src-web/systems/card/cardBlocks';
import { AWAITING_BREAKTHROUGH } from '../../../src-web/systems/card/expToNext';
import { CONCEALED_BADGE } from '../../../src-web/systems/card/displayedField';
import { linearExpThreshold } from '../../../src-web/systems/exp/expThreshold';
import { fullStats, makeCharacter, makeConcealedNpc, makeProtagonist } from './fixtures';

const linear = (level: number) => linearExpThreshold(level);
const estimateDeps = { statScore: () => 1000 };

describe('D.1 card_exists (AC-03..AC-05)', () => {
  const turns = (entities: string[], confirmed = true, undone = false) => [
    { entities, confirmed, undone },
  ];

  it('test_created_on_the_first_confirmed_not_undone_turn', () => {
    expect(cardExists('npc_1', turns(['npc_1']))).toBe(true);
  });

  it('test_an_unconfirmed_turn_does_not_create_a_card', () => {
    expect(cardExists('npc_1', turns(['npc_1'], false))).toBe(false);
  });

  it('test_undoing_the_creation_turn_flips_it_back_to_false', () => {
    expect(cardExists('npc_1', turns(['npc_1'], true, true))).toBe(false);
  });

  it('test_stays_true_across_later_turns_including_after_death', () => {
    const history = [
      { entities: ['npc_1'], confirmed: true, undone: false },
      { entities: [], confirmed: true, undone: false },
    ];
    expect(cardExists('npc_1', history)).toBe(true);
  });

  it('test_unknown_char_id_has_no_card', () => {
    expect(cardExists('ambient_bandit', turns(['npc_1']))).toBe(false);
  });
});

describe('block order and inclusion (AC-09, AC-10, AC-48)', () => {
  it('test_block_order_is_always_a_subsequence_of_one_to_six', () => {
    const npc = buildCardBlocks(makeCharacter(), { estimateDeps });
    const player = buildCardBlocks(makeProtagonist(), { estimateDeps });
    for (const blocks of [npc.order, player.order]) {
      const indices = blocks.map((id) => CARD_BLOCK_ORDER.indexOf(id));
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
    }
  });

  it('test_blocks_one_two_three_are_always_present', () => {
    const card = buildCardBlocks(makeCharacter(), { estimateDeps });
    expect(card.order).toContain('profile');
    expect(card.order).toContain('combat_stats');
    expect(card.order).toContain('equipment');
  });

  it('test_exp_element_only_on_the_protagonist_card', () => {
    expect(buildCardBlocks(makeCharacter(), { estimateDeps }).combatStats.exp).toBeNull();
    const player = buildCardBlocks(makeProtagonist(), {
      estimateDeps,
      expThresholdFn: linear,
    });
    expect(player.combatStats.exp?.to_next).toBe(40);
  });

  it('test_block_four_only_on_npc_cards', () => {
    expect(buildCardBlocks(makeCharacter(), { estimateDeps }).affinity).not.toBeNull();
    expect(buildCardBlocks(makeProtagonist(), { estimateDeps }).affinity).toBeNull();
  });

  it('test_block_five_only_when_in_combat_and_alive', () => {
    const combat = {
      exchange_id: 3,
      self_hp: { current: 50, max: 100 },
      opponent_hp: { current: 80, max: 100 },
      outcome: 'none' as const,
    };
    expect(buildCardBlocks(makeCharacter(), { estimateDeps, combat }).combatStatus).toBeNull();
    const fighting = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      in_combat: true,
      combat,
    });
    expect(fighting.combatStatus?.exchange_id).toBe(3);
    expect(fighting.combatStatus?.self_hp.steps).toBe(5);
  });

  it('test_no_block_five_for_a_dead_character_even_when_in_combat', () => {
    // gdd-06 B6 + AC-35.
    const card = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      in_combat: true,
      alive: false,
      combat: {
        exchange_id: 1,
        self_hp: { current: 0, max: 100 },
        opponent_hp: { current: 10, max: 100 },
        outcome: 'loss' as const,
      },
    });
    expect(card.combatStatus).toBeNull();
    expect(card.order).not.toContain('combat_status');
  });

  it('test_block_six_appears_for_death_or_crippling', () => {
    const dead = buildCardBlocks(makeCharacter(), { estimateDeps, alive: false });
    expect(dead.statusBadges?.badges.map((b) => b.code)).toEqual(['dead']);
    const crippled = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      death_and_consequence_blocked: true,
    });
    expect(crippled.statusBadges?.badges.map((b) => b.code)).toEqual(['crippled']);
  });

  it('test_block_six_is_absent_for_a_healthy_living_character', () => {
    expect(buildCardBlocks(makeCharacter(), { estimateDeps }).statusBadges).toBeNull();
  });
});

describe('the two mutating buttons (AC-29..AC-33, decision C-6)', () => {
  const alwaysShow = () => true;

  it('test_song_tu_visibility_comes_only_from_the_injected_predicate', () => {
    // C-6: the card holds NO threshold of its own; App.tsx owns affinity >= 80.
    const hidden = buildCardBlocks(makeCharacter({ affinity: 95 }), { estimateDeps });
    expect(hidden.affinity?.song_tu_button.visible).toBe(false);
    const shown = buildCardBlocks(makeCharacter({ affinity: 5 }), {
      estimateDeps,
      showSongTuButton: alwaysShow,
    });
    expect(shown.affinity?.song_tu_button.visible).toBe(true);
  });

  it('test_song_tu_is_disabled_by_the_turn_manager_lock', () => {
    const card = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      showSongTuButton: alwaysShow,
      tm_locked: true,
    });
    expect(card.affinity?.song_tu_button.visible).toBe(true);
    expect(card.affinity?.song_tu_button.enabled).toBe(false);
  });

  it('test_song_tu_is_disabled_independently_by_in_combat', () => {
    // AC-33: two separate disable sources; both must be tested.
    const card = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      showSongTuButton: alwaysShow,
      in_combat: true,
      tm_locked: false,
    });
    expect(card.affinity?.song_tu_button.enabled).toBe(false);
    expect(card.affinity?.song_tu_button.disabled_reasons.length).toBe(1);
  });

  it('test_a_dead_npc_hides_the_song_tu_button_entirely', () => {
    const card = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      showSongTuButton: alwaysShow,
      alive: false,
    });
    expect(card.affinity?.song_tu_button.visible).toBe(false);
  });

  it('test_recovery_button_renders_only_when_choices_are_supplied', () => {
    // gdd-06 B6: an NPC with a severe consequence shows the badge but no button.
    const noChoices = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      death_and_consequence_blocked: true,
    });
    expect(noChoices.statusBadges?.recovery_button.visible).toBe(false);

    const withChoices = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      death_and_consequence_blocked: true,
      recoveryChoices: [{ id: 'self', label: 'Tự luyện' }],
    });
    expect(withChoices.statusBadges?.recovery_button.visible).toBe(true);
    expect(withChoices.statusBadges?.recovery_button.enabled).toBe(true);
  });

  it('test_a_dead_character_shows_no_recovery_button', () => {
    const card = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      alive: false,
      death_and_consequence_blocked: true,
      recoveryChoices: [{ id: 'self', label: 'Tự luyện' }],
    });
    expect(card.statusBadges?.recovery_button.visible).toBe(false);
  });
});

describe('block content (AC-37, AC-38, concealment rendering)', () => {
  it('test_equipment_empty_states_are_independent_per_side', () => {
    const empty = buildCardBlocks(makeCharacter(), { estimateDeps });
    expect(empty.equipment.weapon_text).toBe('tay không');
    expect(empty.equipment.skills_empty_text).toBe('chưa học kỹ năng');

    const equipped = buildCardBlocks(makeCharacter(), {
      estimateDeps,
      equipment: { weapon_name: 'Thanh Vân Kiếm', skill_names: ['Ngự Kiếm Quyết'] },
    });
    expect(equipped.equipment.weapon_text).toBe('Thanh Vân Kiếm');
    expect(equipped.equipment.skills_empty).toBe(false);
  });

  it('test_block_three_is_always_rendered_even_when_empty', () => {
    expect(buildCardBlocks(makeCharacter(), { estimateDeps }).order).toContain('equipment');
  });

  it('test_two_characters_sharing_a_name_are_keyed_by_char_id', () => {
    const a = buildCardBlocks(makeCharacter({ char_id: 'npc_a' }), { estimateDeps });
    const b = buildCardBlocks(makeCharacter({ char_id: 'npc_b' }), { estimateDeps });
    expect(a.profile.fields[0].value).toBe(b.profile.fields[0].value);
    expect(a.char_id).not.toBe(b.char_id);
  });

  it('test_concealed_card_carries_the_badge_and_a_status_line', () => {
    const card = buildCardBlocks(makeConcealedNpc(), { estimateDeps });
    expect(card.profile.fields[0].badge).toBe(CONCEALED_BADGE);
    expect(card.statusLines).toContain('Đang che giấu thân phận');
  });

  it('test_attitude_summary_uses_the_same_seven_band_source_as_block_four', () => {
    const card = buildCardBlocks(makeCharacter({ affinity: 85 }), { estimateDeps });
    expect(card.profile.attitude_summary).toBe('Tri kỷ');
    expect(card.affinity?.band).toBe('Tri kỷ');
  });

  it('test_affinity_trend_is_derived_from_the_previous_value', () => {
    const card = buildCardBlocks(makeCharacter({ affinity: 20 }), {
      estimateDeps,
      affinity: { value: 20, previous: 5 },
    });
    expect(card.affinity?.trend).toBe('đang ấm lên');
    expect(card.affinity?.descriptor).toContain('Thiện cảm');
  });

  it('test_awaiting_breakthrough_surfaces_as_a_status_line', () => {
    const card = buildCardBlocks(makeProtagonist({ level: 20, current_exp: 290 }), {
      estimateDeps,
      expThresholdFn: linear,
    });
    expect(card.combatStats.exp?.to_next).toBe(AWAITING_BREAKTHROUGH);
    expect(card.statusLines).toContain('Chờ Đột Phá');
  });

  it('test_stat_formatting_uses_percent_for_percentage_stats', () => {
    expect(formatStatValue('HP', 120.4)).toBe('120');
    expect(formatStatValue('CRIT_RATE', 0.125)).toBe('12.5%');
  });

  it('test_derived_tier_is_exposed_for_the_customization_panel', () => {
    expect(displayTier(1)).toBe(1);
    expect(displayTier(10)).toBe(1);
    expect(displayTier(11)).toBe(2);
  });

  it('test_estimate_is_unknown_when_no_combat_scorer_is_injected', () => {
    const card = buildCardBlocks(makeCharacter({ stats: fullStats(7) }), {});
    expect(card.combatStats.estimate.kind).toBe('unknown');
  });
});
