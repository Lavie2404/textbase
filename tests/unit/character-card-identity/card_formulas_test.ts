/**
 * Character Card & Identity - D.3 `exp_to_next` and D.4 `displayed_estimate`.
 *
 * AC coverage (gdd-06 PART B, B8): AC-18..AC-25, AC-34, plus the B6 comparison
 * edge case.
 */

import { describe, expect, it } from 'vitest';
import {
  AWAITING_BREAKTHROUGH,
  displayedProgressionState,
  expBarRatio,
  expToNext,
  expToNextForCard,
  expToNextLabel,
  isAwaitingBreakthrough,
} from '../../../src-web/systems/card/expToNext';
import {
  ESTIMATE_INFINITE,
  ESTIMATE_NA,
  displayedEstimate,
  estimateLabel,
  estimateRatioDisplay,
  statSources,
} from '../../../src-web/systems/card/displayedEstimate';
import {
  CONCEALED_BADGE,
  UNKNOWN_SENTINEL,
  displayFlags,
} from '../../../src-web/systems/card/displayedField';
import { linearExpThreshold } from '../../../src-web/systems/exp/expThreshold';
import {
  countingStatScore,
  fullStats,
  fullSurfaceStats,
  makeCharacter,
  makeConcealedNpc,
  makeProtagonist,
} from './fixtures';

/** The GDD's worked examples quote its own linear curve (gdd-02 D.1). */
const linear = (level: number) => linearExpThreshold(level);

describe('D.3 exp_to_next (AC-18..AC-21)', () => {
  it('test_normal_case_level_25_threshold_340_exp_300_gives_40', () => {
    expect(linear(25)).toBe(340);
    expect(expToNext({ level: 25, current_exp: 300 }, linear)).toBe(40);
  });

  it('test_awaiting_breakthrough_sentinel_at_round_level_with_full_bar', () => {
    expect(linear(20)).toBe(290);
    expect(expToNext({ level: 20, current_exp: 290 }, linear)).toBe(AWAITING_BREAKTHROUGH);
  });

  it('test_round_level_below_threshold_is_not_a_breakthrough', () => {
    // AC-20: a round level alone is not enough.
    expect(expToNext({ level: 20, current_exp: 250 }, linear)).toBe(40);
    expect(isAwaitingBreakthrough({ level: 20, current_exp: 250 }, linear)).toBe(false);
  });

  it('test_non_round_level_with_a_full_bar_is_not_a_breakthrough', () => {
    expect(isAwaitingBreakthrough({ level: 21, current_exp: linear(21) }, linear)).toBe(false);
  });

  it('test_exp_to_next_is_never_invoked_for_npc_cards', () => {
    // AC-21: the EXP element belongs to the protagonist card only.
    const npc = makeCharacter();
    expect(expToNextForCard({ ...npc }, linear)).toBeNull();
    expect(expToNextForCard({ ...makeProtagonist(), is_player: true }, linear)).toBe(40);
  });

  it('test_label_is_vietnamese_and_switches_to_the_sentinel', () => {
    expect(expToNextLabel({ level: 25, current_exp: 300 }, linear)).toBe('còn 40 EXP tới cấp kế');
    expect(expToNextLabel({ level: 20, current_exp: 290 }, linear)).toBe(AWAITING_BREAKTHROUGH);
  });

  it('test_exp_bar_ratio_clamps_to_one_and_zero', () => {
    expect(expBarRatio({ level: 20, current_exp: 290 }, linear)).toBe(1);
    expect(expBarRatio({ level: 20, current_exp: 0 }, linear)).toBe(0);
    expect(expBarRatio({ level: 20, current_exp: 145 }, linear)).toBeCloseTo(0.5, 10);
  });

  it('test_displayed_progression_state_prefers_the_stored_value', () => {
    expect(displayedProgressionState({ level: 20, current_exp: 290 }, null, linear)).toBe(
      'Chờ Đột Phá',
    );
    expect(
      displayedProgressionState({ level: 20, current_exp: 290 }, 'Tu Luyện Thường', linear),
    ).toBe('Tu Luyện Thường');
  });
});

describe('D.4 displayed_estimate (AC-22..AC-25)', () => {
  it('test_reuses_the_injected_stat_score_with_true_values', () => {
    const spy = countingStatScore(1234);
    const result = displayedEstimate(makeCharacter(), displayFlags(), { statScore: spy.fn });
    expect(spy.calls).toBe(1);
    expect(result).toEqual({ kind: 'number', value: 1234, badge: null });
  });

  it('test_uses_surface_values_under_concealment_and_keeps_the_badge', () => {
    const spy = {
      calls: 0,
      seen: null as Record<string, number> | null,
      fn: (stats: Record<string, number>) => {
        spy.calls += 1;
        spy.seen = stats;
        return stats.ATK;
      },
    };
    const c = makeConcealedNpc({ stats: fullStats(100) });
    const result = displayedEstimate(c, displayFlags(), { statScore: spy.fn as never });
    expect(spy.calls).toBe(1);
    expect(spy.seen?.ATK).toBe(5); // the surface value, not the true 100
    expect(result.kind).toBe('number');
    expect(result.badge).toBe(CONCEALED_BADGE);
  });

  it('test_short_circuits_to_question_marks_without_calling_the_combat_formula', () => {
    // AC-24: the spy must record ZERO calls.
    const spy = countingStatScore();
    const surface = fullSurfaceStats();
    delete surface.SPD;
    const c = makeCharacter({ concealment: { active: true, displayed: surface } });
    const result = displayedEstimate(c, displayFlags(), { statScore: spy.fn });
    expect(spy.calls).toBe(0);
    expect(result).toEqual({ kind: 'unknown', value: UNKNOWN_SENTINEL, badge: CONCEALED_BADGE });
  });

  it('test_one_missing_stat_is_enough_to_poison_the_whole_sum', () => {
    const spy = countingStatScore();
    const surface = fullSurfaceStats();
    delete surface.LIFESTEAL;
    const c = makeCharacter({ concealment: { active: true, displayed: surface } });
    expect(displayedEstimate(c, displayFlags(), { statScore: spy.fn }).kind).toBe('unknown');
    expect(spy.calls).toBe(0);
  });

  it('test_adds_skill_and_equipment_scores_to_the_stat_score', () => {
    const result = displayedEstimate(makeCharacter(), displayFlags(), {
      statScore: () => 100,
      skillScore: 20,
      equipScore: 5,
    });
    expect(result).toEqual({ kind: 'number', value: 125, badge: null });
  });

  it('test_stat_sources_read_through_d2', () => {
    const sources = statSources(makeConcealedNpc(), displayFlags());
    expect(sources.ATK).toBe(5);
    const hidden = statSources(makeCharacter(), displayFlags({ realm_hidden: true }));
    expect(hidden.ATK).toBe(UNKNOWN_SENTINEL);
  });

  it('test_estimate_label_appends_the_badge_when_concealed', () => {
    const concealed = displayedEstimate(makeConcealedNpc(), displayFlags(), {
      statScore: () => 42,
    });
    expect(estimateLabel(concealed)).toBe('42 (' + CONCEALED_BADGE + ')');
  });
});

describe('D.4 comparison ratio (gdd-06 B6, AC-34)', () => {
  const numeric = (value: number) => ({ kind: 'number' as const, value, badge: null });
  const unknown = { kind: 'unknown' as const, value: UNKNOWN_SENTINEL, badge: CONCEALED_BADGE };

  it('test_sentinel_short_circuits_before_estimate_ratio_is_called', () => {
    let calls = 0;
    const ratio = (a: number, b: number) => {
      calls += 1;
      return a / b;
    };
    expect(estimateRatioDisplay(unknown, numeric(10), ratio)).toEqual({
      kind: 'sentinel',
      value: UNKNOWN_SENTINEL,
    });
    expect(estimateRatioDisplay(numeric(10), unknown, ratio)).toEqual({
      kind: 'sentinel',
      value: UNKNOWN_SENTINEL,
    });
    expect(calls).toBe(0);
  });

  it('test_echoes_the_injected_ratio_sentinel_verbatim', () => {
    const result = estimateRatioDisplay(numeric(0), numeric(0), () => 'N/A');
    expect(result).toEqual({ kind: 'sentinel', value: 'N/A' });
  });

  it('test_local_fallback_handles_zero_over_zero_and_x_over_zero', () => {
    expect(estimateRatioDisplay(numeric(0), numeric(0))).toEqual({
      kind: 'sentinel',
      value: ESTIMATE_NA,
    });
    expect(estimateRatioDisplay(numeric(5), numeric(0))).toEqual({
      kind: 'sentinel',
      value: ESTIMATE_INFINITE,
    });
    expect(estimateRatioDisplay(numeric(6), numeric(3))).toEqual({ kind: 'number', value: 2 });
  });
});
