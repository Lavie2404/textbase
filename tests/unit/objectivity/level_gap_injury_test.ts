/**
 * Pillar 1 - "The Gioi Khach Quan": the LEVEL-GAP INJURY rule.
 * Design doc: design/gdd/game-concept.md, "Boi Canh" (38-100) + "Pillar 1" (243-255).
 *
 * Owner rule under test: a HOSTILE opponent more than
 * HOSTILE_INITIATIVE_LEVEL_GAP_MAX (=20) levels above the player MUST be
 * "Trong Thuong" - effective level = player.level + 20, true level preserved,
 * fully recoverable, never healed by the passage of time.
 */

import { describe, expect, it } from 'vitest';
import {
  GAP_INJURY_CARD_LINE,
  GAP_INJURY_PROMPT_HINT,
  GAP_INJURY_STATUS_ID,
  GAP_INJURY_STATUS_NAME,
  applyGapInjury,
  effectiveLevel,
  gapInjuryAppliedMessage,
  gapInjuryRecoveredMessage,
  hasGapInjuryStatus,
  isGapInjured,
  isHostileStance,
  makeGapInjuryStatus,
  recoverGapInjury,
  shouldApplyGapInjury,
  trueLevelOf,
} from '../../../src-web/systems/objectivity/levelGapInjury';
import { HOSTILE_INITIATIVE_LEVEL_GAP_MAX } from '../../../src-web/systems/registry';

const GAP = HOSTILE_INITIATIVE_LEVEL_GAP_MAX;

/** Mirrors App.tsx's NPC creation formula (200 + 20*(lvl-1), ...). */
function recompute(npc: Record<string, unknown>, level: number) {
  return {
    ...npc,
    level,
    baseHp: 200 + (level - 1) * 20,
    baseAtk: 20 + (level - 1) * 2,
    baseDef: 10 + (level - 1) * 1,
    baseSpd: 30 + (level - 1) * 1,
    allocatedPoints: { hp: 0, atk: 0, def: 0, spd: 0 },
    ap: 0,
  };
}

function hostileNpc(level: number, extra: Record<string, unknown> = {}) {
  return {
    Name: 'Hac Y Nhan',
    Stance: 'Thù địch',
    level,
    baseHp: 200 + (level - 1) * 20,
    baseAtk: 20 + (level - 1) * 2,
    baseDef: 10 + (level - 1) * 1,
    baseSpd: 30 + (level - 1) * 1,
    allocatedPoints: { hp: 7, atk: 3, def: 2, spd: 1 },
    ap: 4,
    longTermStatuses: [] as any[],
    ...extra,
  };
}

describe('shouldApplyGapInjury - the predicate', () => {
  it('test_hostile_gap_above_max_should_apply', () => {
    expect(shouldApplyGapInjury({ npcLevel: 90, playerLevel: 10, hostile: true })).toBe(true);
  });

  it('test_hostile_gap_exactly_max_should_not_apply', () => {
    expect(shouldApplyGapInjury({ npcLevel: 10 + GAP, playerLevel: 10, hostile: true })).toBe(false);
  });

  it('test_hostile_gap_one_above_max_should_apply', () => {
    expect(shouldApplyGapInjury({ npcLevel: 10 + GAP + 1, playerLevel: 10, hostile: true })).toBe(true);
  });

  it('test_neutral_npc_is_exempt', () => {
    expect(shouldApplyGapInjury({ npcLevel: 90, playerLevel: 10, stance: 'Trung lập' })).toBe(false);
  });

  it('test_friendly_npc_is_exempt', () => {
    expect(shouldApplyGapInjury({ npcLevel: 90, playerLevel: 10, stance: 'Thân thiện' })).toBe(false);
  });

  it('test_suspicious_stance_is_not_hostile', () => {
    expect(shouldApplyGapInjury({ npcLevel: 90, playerLevel: 10, stance: 'Nghi ngờ' })).toBe(false);
  });

  it('test_already_injured_is_not_reapplied', () => {
    expect(
      shouldApplyGapInjury({ npcLevel: 90, playerLevel: 10, hostile: true, alreadyInjured: true }),
    ).toBe(false);
  });

  it('test_provoked_is_still_capped_by_default_knob', () => {
    // Owner rule is unconditional: GAP_INJURY_EXEMPT_WHEN_PROVOKED defaults false.
    expect(shouldApplyGapInjury({ npcLevel: 90, playerLevel: 10, hostile: true, provoked: true })).toBe(true);
  });

  it('test_provoked_exemption_knob_when_enabled', () => {
    expect(
      shouldApplyGapInjury({
        npcLevel: 90,
        playerLevel: 10,
        hostile: true,
        provoked: true,
        knobs: { GAP_INJURY_EXEMPT_WHEN_PROVOKED: true },
      }),
    ).toBe(false);
  });

  it('test_non_numeric_levels_are_rejected', () => {
    expect(shouldApplyGapInjury({ npcLevel: NaN, playerLevel: 10, hostile: true })).toBe(false);
    expect(shouldApplyGapInjury({ npcLevel: 90, playerLevel: NaN, hostile: true })).toBe(false);
  });

  it('test_isHostileStance_recognises_deep_hostility_band', () => {
    expect(isHostileStance('Thù địch sâu sắc')).toBe(true);
    expect(isHostileStance('Thù địch')).toBe(true);
    expect(isHostileStance('Trung lập')).toBe(false);
    expect(isHostileStance('')).toBe(false);
  });
});

describe('applyGapInjury', () => {
  it('test_effective_level_becomes_player_level_plus_gap', () => {
    const out = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    expect(out.level).toBe(10 + GAP);
    expect(effectiveLevel(out)).toBe(10 + GAP);
  });

  it('test_true_level_is_preserved_in_the_record', () => {
    const out = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    expect(out.gapInjury!.trueLevel).toBe(90);
    expect(trueLevelOf(out)).toBe(90);
  });

  it('test_record_carries_reason_turn_and_player_level', () => {
    const out = applyGapInjury(hostileNpc(90), 12, { turn: 47, recomputeStatsForLevel: recompute });
    expect(out.gapInjury!.reason).toBe('level_gap');
    expect(out.gapInjury!.appliedAtTurn).toBe(47);
    expect(out.gapInjury!.playerLevelAtApply).toBe(12);
    expect(out.gapInjury!.cappedLevel).toBe(12 + GAP);
  });

  it('test_uses_current_player_level_at_apply_time', () => {
    const low = applyGapInjury(hostileNpc(90), 5, { recomputeStatsForLevel: recompute });
    const high = applyGapInjury(hostileNpc(90), 40, { recomputeStatsForLevel: recompute });
    expect(low.level).toBe(5 + GAP);
    expect(high.level).toBe(40 + GAP);
  });

  it('test_status_entry_is_added_with_the_right_id_and_never_expires', () => {
    const out = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    const st = out.longTermStatuses!.find((x: any) => x.status_id === GAP_INJURY_STATUS_ID);
    expect(st).toBeTruthy();
    expect(st.name).toBe(GAP_INJURY_STATUS_NAME);
    expect(st.type).toBe('injury');
    expect(st.duration).toBeNull();
    expect(st.expiresAt).toBeNull();
    expect(String(st.description)).toContain('hồi phục');
  });

  it('test_stats_are_recomputed_for_the_reduced_level', () => {
    const out = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    expect(out.baseHp).toBe(200 + (10 + GAP - 1) * 20);
    expect(out.baseAtk).toBe(20 + (10 + GAP - 1) * 2);
  });

  it('test_pre_injury_base_snapshot_is_stored', () => {
    const npc = hostileNpc(90);
    const out = applyGapInjury(npc, 10, { recomputeStatsForLevel: recompute });
    const snap = out.gapInjury!.preInjuryBase;
    expect(snap.baseHp).toBe(npc.baseHp);
    expect(snap.baseAtk).toBe(npc.baseAtk);
    expect(snap.baseDef).toBe(npc.baseDef);
    expect(snap.baseSpd).toBe(npc.baseSpd);
    expect(snap.ap).toBe(npc.ap);
    expect(snap.allocatedPoints).toEqual(npc.allocatedPoints);
  });

  it('test_snapshot_is_a_copy_not_a_reference', () => {
    const npc = hostileNpc(90);
    const out = applyGapInjury(npc, 10, { recomputeStatsForLevel: recompute });
    (npc.allocatedPoints as any).hp = 999;
    expect(out.gapInjury!.preInjuryBase.allocatedPoints!.hp).toBe(7);
  });

  it('test_apply_is_idempotent', () => {
    const once = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    const twice = applyGapInjury(once, 10, { recomputeStatsForLevel: recompute });
    expect(twice).toBe(once);
    expect(twice.gapInjury!.trueLevel).toBe(90);
  });

  it('test_double_apply_never_overwrites_true_level_with_capped_level', () => {
    const once = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    const twice = applyGapInjury(once, 60, { recomputeStatsForLevel: recompute });
    expect(twice.gapInjury!.trueLevel).toBe(90);
  });

  it('test_no_change_when_cap_is_not_below_true_level', () => {
    const npc = hostileNpc(25);
    const out = applyGapInjury(npc, 10, { recomputeStatsForLevel: recompute });
    expect(out).toBe(npc);
    expect(isGapInjured(out)).toBe(false);
  });

  it('test_original_record_is_not_mutated', () => {
    const npc = hostileNpc(90);
    applyGapInjury(npc, 10, { recomputeStatsForLevel: recompute });
    expect(npc.level).toBe(90);
    expect(npc.longTermStatuses).toHaveLength(0);
  });

  it('test_works_without_an_injected_recompute', () => {
    const out = applyGapInjury(hostileNpc(90), 10);
    expect(out.level).toBe(10 + GAP);
    expect(isGapInjured(out)).toBe(true);
  });
});

describe('recoverGapInjury', () => {
  it('test_recovery_restores_the_true_level', () => {
    const injured = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    const healed = recoverGapInjury(injured);
    expect(healed.level).toBe(90);
  });

  it('test_recovery_restores_the_exact_pre_injury_base_stats', () => {
    const npc = hostileNpc(90);
    const injured = applyGapInjury(npc, 10, { recomputeStatsForLevel: recompute });
    const healed = recoverGapInjury(injured);
    expect(healed.baseHp).toBe(npc.baseHp);
    expect(healed.baseAtk).toBe(npc.baseAtk);
    expect(healed.baseDef).toBe(npc.baseDef);
    expect(healed.baseSpd).toBe(npc.baseSpd);
    expect(healed.ap).toBe(npc.ap);
    expect(healed.allocatedPoints).toEqual(npc.allocatedPoints);
  });

  it('test_recovery_removes_the_status_and_the_record', () => {
    const injured = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    const healed = recoverGapInjury(injured);
    expect(hasGapInjuryStatus(healed)).toBe(false);
    expect(isGapInjured(healed)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(healed, 'gapInjury')).toBe(false);
  });

  it('test_recovery_keeps_unrelated_statuses', () => {
    const npc = hostileNpc(90, { longTermStatuses: [{ status_id: 'TRUNG_DOC', name: 'Trúng Độc' }] });
    const injured = applyGapInjury(npc, 10, { recomputeStatsForLevel: recompute });
    expect(injured.longTermStatuses).toHaveLength(2);
    const healed = recoverGapInjury(injured);
    expect(healed.longTermStatuses).toHaveLength(1);
    expect(healed.longTermStatuses![0].status_id).toBe('TRUNG_DOC');
  });

  it('test_recovery_is_a_noop_on_a_healthy_npc', () => {
    const npc = hostileNpc(30);
    expect(recoverGapInjury(npc)).toBe(npc);
  });

  it('test_recovery_is_idempotent', () => {
    const injured = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    const once = recoverGapInjury(injured);
    const twice = recoverGapInjury(once);
    expect(twice.level).toBe(90);
    expect(twice).toBe(once);
  });

  it('test_recovery_falls_back_to_recompute_when_the_snapshot_is_missing', () => {
    // Simulates an old save: record present, snapshot lost.
    const injured: any = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    injured.gapInjury = { ...injured.gapInjury, preInjuryBase: {} };
    const healed = recoverGapInjury(injured, { recomputeStatsForLevel: recompute });
    expect(healed.level).toBe(90);
    expect(healed.baseHp).toBe(200 + 89 * 20);
  });

  it('test_apply_then_recover_then_apply_again_round_trips', () => {
    const npc = hostileNpc(90);
    const injured = applyGapInjury(npc, 10, { recomputeStatsForLevel: recompute });
    const healed = recoverGapInjury(injured);
    const reinjured = applyGapInjury(healed, 10, { recomputeStatsForLevel: recompute });
    expect(reinjured.level).toBe(10 + GAP);
    expect(reinjured.gapInjury!.trueLevel).toBe(90);
  });

  it('test_recovery_by_status_removal_only_still_restores_level', () => {
    // The App's reconciliation sweep path: some other system dropped the status,
    // the record is still there -> the level must come back.
    const injured: any = applyGapInjury(hostileNpc(90), 10, { recomputeStatsForLevel: recompute });
    injured.longTermStatuses = [];
    expect(isGapInjured(injured)).toBe(true);
    expect(hasGapInjuryStatus(injured)).toBe(false);
    const healed = recoverGapInjury(injured);
    expect(healed.level).toBe(90);
  });
});

describe('player-facing and prompt-facing text', () => {
  it('test_prompt_hint_carries_no_number', () => {
    expect(GAP_INJURY_PROMPT_HINT).toContain('cảnh giới suy giảm');
    expect(/\d/.test(GAP_INJURY_PROMPT_HINT)).toBe(false);
  });

  it('test_card_line_says_recoverable_and_carries_no_number', () => {
    expect(GAP_INJURY_CARD_LINE).toContain('Trọng Thương');
    expect(GAP_INJURY_CARD_LINE).toContain('có thể hồi phục');
    expect(/\d/.test(GAP_INJURY_CARD_LINE)).toBe(false);
  });

  it('test_system_messages_are_vietnamese_and_name_the_character', () => {
    expect(gapInjuryAppliedMessage('Hắc Y Nhân')).toContain('Hắc Y Nhân');
    expect(gapInjuryAppliedMessage('Hắc Y Nhân')).toContain('cựu thương');
    expect(gapInjuryRecoveredMessage('Hắc Y Nhân')).toContain('chữa lành');
  });

  it('test_status_template_never_expires_by_time', () => {
    const st = makeGapInjuryStatus();
    expect(st.duration).toBeNull();
    expect(st.expiresAt).toBeNull();
    expect(st.description).toContain('KHÔNG tự chữa lành');
  });
});
