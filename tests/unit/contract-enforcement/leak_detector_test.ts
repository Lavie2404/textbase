/**
 * Contract Enforcement - numeric leak detector.
 * Design doc: gdd-01 B.4 (F1 / F1-backstop / F2 / F3), B.8 AC-04, AC-08..AC-16.
 */

import { describe, expect, it } from 'vitest';
import { emptyLockedResult, type LockedResult } from '../../../src-web/systems/types';
import {
  MVP_GATE_MIN_TURNS,
  createSessionLeakLog,
  digitsOf,
  extractNumerals,
  leakCheck,
  leakCheckAndRecord,
  numericFields,
} from '../../../src-web/systems/contract/leakDetector';

function locked(fields: Record<string, unknown>): LockedResult {
  const l = emptyLockedResult(1, 1);
  l.fields = fields as LockedResult['fields'];
  return l;
}

describe('F1 primitives', () => {
  it('test_extract_numerals_reads_digits_only_never_words', () => {
    expect(extractNumerals('gây 47 điểm sát thương')).toEqual(['47']);
    expect(extractNumerals('gây năm mươi điểm')).toEqual([]);
    expect(extractNumerals('1.5 và 20')).toEqual(['1.5', '20']);
  });

  it('test_digits_of_ignores_sign', () => {
    expect(digitsOf(-12)).toBe('12');
    expect(digitsOf(12)).toBe('12');
  });

  it('test_numeric_fields_exclude_zero_and_bookkeeping', () => {
    const l = locked({ damage: 47, combo_count: 0, note: 'x', flag: true });
    expect(numericFields(l)).toEqual({ damage: 47 });
  });
});

describe('F1 leak detection', () => {
  it('test_damage_47_leaking_into_prose_flags_one_leak_AC08', () => {
    const r = leakCheck({
      turn_id: 1,
      locked_result: locked({ damage: 47, target_hp_after: 12 }),
      narration_text: 'Nhát kiếm để lại vết thương 47 điểm.',
    });
    expect(r.leak_count).toBe(1);
    expect(r.leak_flag).toBe(1);
    expect(r.leak_matches).toEqual(['damage']);
    expect(r.V).toBe(1);
  });

  it('test_clean_prose_produces_no_violation', () => {
    const r = leakCheck({
      turn_id: 2,
      locked_result: locked({ damage: 47 }),
      narration_text: 'Nhát kiếm rạch một đường dài trên vai hắn.',
    });
    expect(r.leak_flag).toBe(0);
    expect(r.violations).toEqual([]);
  });

  it('test_zero_valued_field_never_false_positives_AC10', () => {
    const r = leakCheck({
      turn_id: 3,
      locked_result: locked({ damage: 0 }),
      narration_text: 'Đòn đánh trượt, 0 tổn thương.',
    });
    expect(r.leak_flag).toBe(0);
    expect(r.n_numeric_fields).toBe(0);
  });

  it('test_negative_field_matches_on_absolute_digits', () => {
    const r = leakCheck({
      turn_id: 4,
      locked_result: locked({ affinity_delta_npc1: -12 }),
      narration_text: 'Thiện cảm rơi mất 12 phần.',
    });
    expect(r.leak_matches).toEqual(['affinity_delta_npc1']);
  });

  it('test_multi_system_turn_checks_the_union_of_fields_AC15', () => {
    const r = leakCheck({
      turn_id: 5,
      locked_result: locked({ damage: 47, exp_delta_p1: 33, affinity_delta_n1: -8 }),
      narration_text: 'Vết thương 47, thu về 33 điểm tu vi.',
    });
    expect(r.n_numeric_fields).toBe(3);
    expect(r.leak_count).toBe(2);
  });

  it('test_no_numeric_fields_still_logs_n_equals_zero_AC09', () => {
    const r = leakCheck({ turn_id: 6, locked_result: locked({}), narration_text: 'Trời đổ mưa.' });
    expect(r.n_numeric_fields).toBe(0);
    expect(r.leak_matches).toEqual([]);
  });

  it('test_semantic_mismatch_without_numbers_is_not_detected_AC14', () => {
    const l = locked({ damage: 47 });
    l.outcome = { type: 'loss', winner_id: 'n1', loser_id: 'p1' };
    const r = leakCheck({ turn_id: 7, locked_result: l, narration_text: 'Và chúng ta đã thắng!' });
    expect(r.leak_flag).toBe(0);
  });
});

describe('F1 backstop', () => {
  it('test_backstop_fires_only_when_no_numeric_fields_exist', () => {
    const r = leakCheck({
      turn_id: 8,
      locked_result: locked({}),
      narration_text: 'Ngươi mất 30 HP vì trúng độc.',
    });
    expect(r.generic_stat_leak).toBe(true);
    expect(r.V).toBe(1);
    expect(r.violations).toContain('generic_stat_leak');
  });

  it('test_backstop_stays_silent_on_ordinary_numbers', () => {
    const r = leakCheck({
      turn_id: 9,
      locked_result: locked({}),
      narration_text: 'Ba người đứng trước cổng, chiêu thứ 3 vừa dứt.',
    });
    expect(r.generic_stat_leak).toBe(false);
  });

  it('test_backstop_is_suppressed_when_numeric_fields_exist', () => {
    const r = leakCheck({
      turn_id: 10,
      locked_result: locked({ damage: 5 }),
      narration_text: 'Mất 30 HP.',
    });
    expect(r.generic_stat_leak).toBe(false);
  });
});

describe('F2 / F3 session accumulation', () => {
  function clean(turn_id: number) {
    return { turn_id, locked_result: locked({ damage: 47 }), narration_text: 'Không có con số nào.' };
  }

  it('test_empty_session_returns_NA_not_a_division_by_zero_AC12', () => {
    const log = createSessionLeakLog();
    expect(log.stats()).toEqual({ V: 0, T: 0, violation_rate: 'N/A' });
  });

  it('test_gate_passes_with_ninety_clean_turns_AC11', () => {
    const log = createSessionLeakLog();
    for (let i = 0; i < MVP_GATE_MIN_TURNS; i++) leakCheckAndRecord(clean(i), log);
    expect(log.stats()).toMatchObject({ V: 0, T: 90 });
    expect(log.gate()).toMatchObject({ pass: true, reason: 'PASS' });
  });

  it('test_gate_fails_on_a_single_violation_regardless_of_rate_AC11', () => {
    const log = createSessionLeakLog();
    for (let i = 0; i < 89; i++) leakCheckAndRecord(clean(i), log);
    leakCheckAndRecord(
      { turn_id: 89, locked_result: locked({ damage: 47 }), narration_text: 'vết thương 47' },
      log,
    );
    const stats = log.stats();
    expect(stats.V).toBe(1);
    expect(stats.T).toBe(90);
    expect(log.gate()).toMatchObject({ pass: false, reason: 'VIOLATIONS_PRESENT' });
  });

  it('test_gate_fails_when_the_session_is_too_short', () => {
    const log = createSessionLeakLog();
    leakCheckAndRecord(clean(1), log);
    expect(log.gate()).toMatchObject({ pass: false, reason: 'INSUFFICIENT_TURNS', T: 1 });
  });

  it('test_undone_turn_is_excluded_from_T_but_its_log_is_retained_AC16', () => {
    const log = createSessionLeakLog();
    leakCheckAndRecord(
      { turn_id: 1, locked_result: locked({ damage: 47 }), narration_text: 'vết thương 47' },
      log,
    );
    expect(log.stats()).toMatchObject({ V: 1, T: 1 });
    log.markUndone(1);
    expect(log.stats()).toMatchObject({ V: 0, T: 0, violation_rate: 'N/A' });
    expect(log.all()).toHaveLength(1);
  });

  it('test_per_field_counts_equal_the_sum_of_that_fields_leaks_AC13', () => {
    const log = createSessionLeakLog();
    leakCheckAndRecord(
      { turn_id: 1, locked_result: locked({ damage: 47 }), narration_text: 'vết thương 47' },
      log,
    );
    leakCheckAndRecord(
      { turn_id: 2, locked_result: locked({ damage: 9, exp_delta_p1: 33 }), narration_text: '9 và 33' },
      log,
    );
    expect(log.perField()).toEqual({ damage: 2, exp_delta_p1: 1 });
  });

  it('test_disabled_detection_skips_the_log_but_still_returns_the_result', () => {
    const log = createSessionLeakLog();
    const r = leakCheckAndRecord(
      { turn_id: 1, locked_result: locked({ damage: 47 }), narration_text: 'vết thương 47' },
      log,
      false,
    );
    expect(r.leak_flag).toBe(1);
    expect(log.all()).toHaveLength(0);
  });

  it('test_reset_clears_the_session', () => {
    const log = createSessionLeakLog();
    leakCheckAndRecord(clean(1), log);
    log.reset();
    expect(log.stats().T).toBe(0);
  });
});
