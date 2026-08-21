/**
 * Pillar 1 - "The Gioi Khach Quan": prompt directives and their wiring.
 * Design doc: design/gdd/game-concept.md "Boi Canh" (38-100) + "Pillar 1" (243-255).
 *
 * The App's two prompt builders live inside App.tsx (a 36k-line React module
 * that cannot be imported headlessly), so the wiring is asserted the same way
 * the P7 CI check does it: by reading the source and requiring that the
 * directive arrays are interpolated into the right template literals.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DIRECTIVE_P1_AFFECTION_NOT_APPRAISAL,
  DIRECTIVE_P1_GROUNDED_PRAISE,
  DIRECTIVE_P1_CANON_NOT_PLAYER_CENTRIC,
  DIRECTIVE_P1_HONEST_PROBABILITY,
  DIRECTIVE_P1_NO_TOP_DOWN_AGGRESSION,
  DIRECTIVE_P1_NPC_SELF_INTEREST,
  DIRECTIVE_P1_OUTCOME_FIELD,
  PILLAR1_DIRECTIVES_LOGIC,
  PILLAR1_DIRECTIVES_NARRATION,
  PILLAR1_LOGIC_BLOCK,
  PILLAR1_NARRATION_BLOCK,
  hasPillar1LogicDirectives,
  hasPillar1NarrationDirectives,
} from '../../../src-web/systems/contract/narrationDirectives';
import { buildNarrationPrompt } from '../../../src-web/systems/ai/promptBuilder';

const APP_SRC = readFileSync(resolve(__dirname, '../../../App.tsx'), 'utf8');

describe('Pillar 1 directive content', () => {
  it('test_logic_set_has_six_directives', () => {
    expect(PILLAR1_DIRECTIVES_LOGIC).toHaveLength(6);
  });

  it('test_narration_set_has_six_directives', () => {
    expect(PILLAR1_DIRECTIVES_NARRATION).toHaveLength(6);
  });

  it('test_npc_self_interest_forbids_plot_convenience', () => {
    expect(DIRECTIVE_P1_NPC_SELF_INTEREST).toContain('lợi ích, tính cách và thực lực của chính họ');
    expect(DIRECTIVE_P1_NPC_SELF_INTEREST).toContain('đẹp cốt truyện');
  });

  it('test_honest_probability_forbids_player_bias_and_names_overreach', () => {
    expect(DIRECTIVE_P1_HONEST_PROBABILITY).toContain('KHÔNG thiên vị người chơi');
    expect(DIRECTIVE_P1_HONEST_PROBABILITY).toContain('vượt tầm');
    expect(DIRECTIVE_P1_HONEST_PROBABILITY).toContain('RẤT THẤP');
  });

  it('test_no_top_down_aggression_uses_the_clouds_proverb', () => {
    expect(DIRECTIVE_P1_NO_TOP_DOWN_AGGRESSION).toContain('MÂY TẦNG NÀO GẶP GIÓ TẦNG NẤY');
  });

  it('test_canon_characters_do_not_orbit_the_player', () => {
    expect(DIRECTIVE_P1_CANON_NOT_PLAYER_CENTRIC).toContain('KHÔNG XOAY QUANH NGƯỜI CHƠI');
  });

  it('test_affection_is_allowed_but_objective_praise_is_not', () => {
    expect(DIRECTIVE_P1_AFFECTION_NOT_APPRAISAL).toContain('vẫn được bộc lộ tình cảm');
    expect(DIRECTIVE_P1_AFFECTION_NOT_APPRAISAL).toContain('sự thật khách quan');
    expect(DIRECTIVE_P1_AFFECTION_NOT_APPRAISAL).toContain('<dialogue>');
  });


  it('test_grounded_praise_requires_concrete_basis_and_power_scaled_tone', () => {
    expect(DIRECTIVE_P1_GROUNDED_PRAISE).toContain('MỘT VIỆC CỤ THỂ');
    expect(DIRECTIVE_P1_GROUNDED_PRAISE).toContain('TỶ LỆ với chênh lệch thực lực');
    expect(DIRECTIVE_P1_GROUNDED_PRAISE).toContain('yêu không có nghĩa là mù');
    expect(DIRECTIVE_P1_GROUNDED_PRAISE).toContain('SAI');
    expect(DIRECTIVE_P1_GROUNDED_PRAISE).toContain('ĐÚNG');
    // Ordering: grounded praise follows the affection rule it qualifies.
    const i = PILLAR1_DIRECTIVES_NARRATION.indexOf(DIRECTIVE_P1_AFFECTION_NOT_APPRAISAL);
    expect(PILLAR1_DIRECTIVES_NARRATION[i + 1]).toBe(DIRECTIVE_P1_GROUNDED_PRAISE);
  });

  it('test_outcome_field_directive_names_the_three_values', () => {
    expect(DIRECTIVE_P1_OUTCOME_FIELD).toContain('outcome_for_player');
    for (const v of ['success', 'partial', 'failure']) expect(DIRECTIVE_P1_OUTCOME_FIELD).toContain(v);
  });

  it('test_both_sets_carry_right_and_wrong_examples', () => {
    expect(PILLAR1_LOGIC_BLOCK).toContain('VÍ DỤ ĐÚNG/SAI');
    expect(PILLAR1_NARRATION_BLOCK).toContain('VÍ DỤ ĐÚNG/SAI');
    expect((PILLAR1_LOGIC_BLOCK.match(/SAI:/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((PILLAR1_NARRATION_BLOCK.match(/SAI/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('test_assertion_helpers_detect_presence_and_absence', () => {
    expect(hasPillar1LogicDirectives(PILLAR1_LOGIC_BLOCK)).toBe(true);
    expect(hasPillar1NarrationDirectives(PILLAR1_NARRATION_BLOCK)).toBe(true);
    expect(hasPillar1LogicDirectives('nothing here')).toBe(false);
    expect(hasPillar1NarrationDirectives('nothing here')).toBe(false);
  });

  it('test_every_directive_is_vietnamese_and_non_empty', () => {
    for (const d of [...PILLAR1_DIRECTIVES_LOGIC, ...PILLAR1_DIRECTIVES_NARRATION]) {
      expect(d.trim().length).toBeGreaterThan(40);
    }
  });
});

describe('Pillar 1 directive wiring', () => {
  it('test_narration_prompt_builder_carries_the_narration_set', () => {
    const prompt = buildNarrationPrompt({
      locked_result: null,
      lockedResultSummary: 'ket qua',
      worldMemoryContext: '',
      playerInput: '',
    } as never);
    expect(hasPillar1NarrationDirectives(prompt)).toBe(true);
  });

  it('test_app_api1_logic_prompt_interpolates_the_logic_set', () => {
    expect(APP_SRC).toContain('PILLAR1_DIRECTIVES_LOGIC.map');
    const idx = APP_SRC.indexOf('PILLAR1_DIRECTIVES_LOGIC.map');
    const window = APP_SRC.slice(Math.max(0, idx - 4000), idx);
    expect(window).toContain('EXPERT LOGIC ENGINE');
  });

  it('test_app_shared_narrative_rules_interpolate_the_narration_set', () => {
    expect(APP_SRC).toContain('PILLAR1_DIRECTIVES_NARRATION.map');
    const idx = APP_SRC.indexOf('PILLAR1_DIRECTIVES_NARRATION.map');
    const window = APP_SRC.slice(Math.max(0, idx - 2000), idx);
    expect(window).toContain('const narrative = `');
  });

  it('test_app_api1_schema_requires_outcome_for_player', () => {
    expect(APP_SRC).toContain('outcome_for_player: { type: "STRING", enum: ["success", "partial", "failure"] }');
    expect(APP_SRC).toContain('"relevant_entities", "commands", "outcome_for_player"');
  });

  it('test_app_calls_capOverreach_before_the_dice_roll', () => {
    const capIdx = APP_SRC.indexOf('capOverreach(scenarios');
    const rollIdx = APP_SRC.indexOf('rollDiceAndChooseScenario(scenarios)');
    expect(capIdx).toBeGreaterThan(-1);
    expect(rollIdx).toBeGreaterThan(-1);
    expect(capIdx).toBeLessThan(rollIdx);
  });

  it('test_app_documents_the_recover_injury_tag_with_its_constraint', () => {
    expect(APP_SRC).toContain('[RECOVER_INJURY: Name="Tên nhân vật"]');
    expect(APP_SRC).toContain('SỰ KIỆN CHỮA TRỊ TƯỜNG MINH');
  });
});
