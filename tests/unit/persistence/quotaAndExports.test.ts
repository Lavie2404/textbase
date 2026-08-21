/**
 * Unit tests - Formulas #1/#3 and the two export artifacts.
 * AC ids: gdd-05 B8 (AC-09, AC-09b, AC-10, AC-11, AC-15, AC-16, AC-25, AC-26, AC-28).
 */
import { describe, expect, it } from 'vitest';
import {
  NOT_MEASURED,
  bundleSizeBytes,
  estimateOriginQuota,
  evaluateQuotaWarning,
  quotaExhaustionTurn,
  shouldPromptBackup,
} from '../../../src-web/systems/persistence/quota';
import { QA_LOG_KEYS, exportQaLog, exportQaLogJson } from '../../../src-web/systems/persistence/exportQaLog';
import { exportKeepsake } from '../../../src-web/systems/persistence/exportKeepsake';
import { PERSISTENCE_KNOBS } from '../../../src-web/systems/registry';
import { NOW, makeTurnRecord } from './factories';

describe('Formula #1 - bundle growth (AC-10, AC-11, AC-25, AC-26)', () => {
  it('test_gdd_worked_examples', () => {
    expect(bundleSizeBytes(1000, 50_000, 800, 1)).toBe(850_000);
    expect(bundleSizeBytes(50_000, 50_000, 800, 1)).toBe(40_050_000);
    expect(quotaExhaustionTurn(10_485_760, 50_000, 800, 1)).toBe(13_044);
    expect(quotaExhaustionTurn(10_485_760, 50_000, 800, 0.3)).toBe(43_482);
  });
  it('test_world_time_zero_equals_fixed_bytes', () => {
    expect(bundleSizeBytes(0, 50_000, 800)).toBe(50_000);
  });
  it('test_omitted_ratio_defaults_to_one', () => {
    expect(bundleSizeBytes(10, 100, 10)).toBe(bundleSizeBytes(10, 100, 10, 1));
  });
  it('test_ratio_above_one_is_clamped_to_worst_case', () => {
    expect(bundleSizeBytes(10, 100, 10, 3)).toBe(bundleSizeBytes(10, 100, 10, 1));
  });
  it('test_quota_below_fixed_bytes_is_zero', () => {
    expect(quotaExhaustionTurn(1000, 50_000, 800)).toBe(0);
  });
  it('test_unmeasurable_quota_is_zero_fail_safe', () => {
    expect(quotaExhaustionTurn(Number.NaN, 50_000, 800)).toBe(0);
    expect(quotaExhaustionTurn(undefined, 50_000, 800)).toBe(0);
    expect(quotaExhaustionTurn(null, 50_000, 800)).toBe(0);
  });
  it('test_unmeasured_avg_returns_the_sentinel_without_dividing', () => {
    expect(quotaExhaustionTurn(10_000_000, 50_000, 0)).toBe(NOT_MEASURED);
    expect(quotaExhaustionTurn(10_000_000, 50_000, -5)).toBe(NOT_MEASURED);
    expect(quotaExhaustionTurn(10_000_000, 50_000, 800, 0)).toBe(NOT_MEASURED);
  });
});

describe('Formula #3 - origin quota warning (AC-15, AC-16, AC-28)', () => {
  it('test_utilization_above_threshold_warns', () => {
    const result = evaluateQuotaWarning(8_580_000, 10_000_000);
    expect(result.utilization_ratio).toBeCloseTo(0.858, 3);
    expect(result.warn_triggered).toBe(1);
  });
  it('test_utilization_below_threshold_does_not_warn', () => {
    expect(evaluateQuotaWarning(8_000_000, 10_000_000).warn_triggered).toBe(0);
  });
  it('test_ratio_above_one_needs_no_special_branch', () => {
    const result = evaluateQuotaWarning(12_000_000, 10_000_000);
    expect(result.utilization_ratio).toBeGreaterThan(1);
    expect(result.warn_triggered).toBe(1);
  });
  it('test_unmeasurable_or_zero_quota_warns_by_default', () => {
    for (const quota of [0, -1, Number.NaN, null, undefined]) {
      const result = evaluateQuotaWarning(1000, quota as number);
      expect(result.warn_triggered).toBe(1);
      expect(result.utilization_ratio).toBe(NOT_MEASURED);
    }
  });
  it('test_threshold_default_comes_from_the_registry', () => {
    const atThreshold = PERSISTENCE_KNOBS.quota_warn_threshold * 1_000_000;
    expect(evaluateQuotaWarning(atThreshold, 1_000_000).warn_triggered).toBe(1);
  });
  it('test_estimate_returns_nulls_when_the_api_is_absent', async () => {
    expect(await estimateOriginQuota(undefined)).toEqual({ usage: null, quota: null });
    expect(await estimateOriginQuota({} as never)).toEqual({ usage: null, quota: null });
  });
  it('test_estimate_reads_the_storage_manager_when_present', async () => {
    const storage = { estimate: async () => ({ usage: 10, quota: 100 }) };
    expect(await estimateOriginQuota(storage)).toEqual({ usage: 10, quota: 100 });
  });
  it('test_estimate_swallows_a_throwing_storage_manager', async () => {
    const storage = {
      estimate: async () => {
        throw new Error('denied');
      },
    };
    expect(await estimateOriginQuota(storage)).toEqual({ usage: null, quota: null });
  });
});

describe('backup prompt threshold', () => {
  const day = 24 * 60 * 60 * 1000;
  it('test_recent_save_does_not_prompt', () => {
    expect(shouldPromptBackup(NOW, NOW + day)).toBe(false);
  });
  it('test_stale_save_prompts_below_the_itp_window', () => {
    expect(shouldPromptBackup(NOW, NOW + 6 * day)).toBe(true);
    expect(PERSISTENCE_KNOBS.backup_prompt_days).toBeLessThan(7);
  });
  it('test_invalid_timestamps_never_prompt', () => {
    expect(shouldPromptBackup(Number.NaN, NOW)).toBe(false);
  });
});

describe('export 9a - QA log (AC-09)', () => {
  const records = [makeTurnRecord(3), makeTurnRecord(1), makeTurnRecord(2, 1), makeTurnRecord(2)];
  it('test_entries_are_ordered_by_world_time_then_hack_seq', () => {
    expect(exportQaLog(records).map((e) => e.world_time)).toEqual([1, 2, 2, 3]);
  });
  it('test_every_object_has_exactly_the_five_keys', () => {
    for (const entry of exportQaLog(records)) {
      expect(Object.keys(entry).sort()).toEqual([...QA_LOG_KEYS].sort());
    }
  });
  it('test_top_level_is_a_bare_array_without_a_wrapper', () => {
    const parsed = JSON.parse(exportQaLogJson(records));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(records.length);
  });
  it('test_action_and_locked_result_are_carried_through', () => {
    const entry = exportQaLog([makeTurnRecord(1)])[0];
    expect(entry.action).toBe('hành động 1');
    expect(entry.locked_result).toMatchObject({ turn_id: 1, world_time: 1 });
  });
  it('test_export_does_not_mutate_the_source', () => {
    const source = [makeTurnRecord(2), makeTurnRecord(1)];
    const copy = JSON.parse(JSON.stringify(source));
    exportQaLog(source);
    expect(source).toEqual(copy);
  });
  it('test_empty_history_exports_an_empty_array', () => {
    expect(exportQaLog([])).toEqual([]);
  });
});

describe('export 9b - keepsake (AC-09b)', () => {
  const records = [makeTurnRecord(2), makeTurnRecord(1)];
  it('test_text_is_narration_only_in_world_time_order', () => {
    const text = exportKeepsake(records);
    expect(text).toBe('Lời kể lượt 1.\n\nLời kể lượt 2.');
  });
  it('test_no_technical_field_names_leak', () => {
    const text = exportKeepsake(records, { title: 'Diệp Thần' });
    for (const key of ['locked_result', 'turn_id', 'world_time', 'hack_seq', 'schema_version']) {
      expect(text).not.toContain(key);
    }
  });
  it('test_output_is_not_json', () => {
    const text = exportKeepsake(records);
    expect(() => JSON.parse(text)).toThrow();
    expect(text.trim().startsWith('{')).toBe(false);
    expect(text.trim().startsWith('[')).toBe(false);
  });
  it('test_title_is_prepended_when_supplied', () => {
    expect(exportKeepsake(records, { title: 'Diệp Thần' }).startsWith('Diệp Thần')).toBe(true);
  });
  it('test_empty_narration_entries_are_skipped', () => {
    const blank = { ...makeTurnRecord(3), narration_text: '   ' };
    expect(exportKeepsake([...records, blank]).split('\n\n')).toHaveLength(2);
  });
  it('test_empty_history_yields_an_empty_string', () => {
    expect(exportKeepsake([])).toBe('');
  });
  it('test_export_does_not_mutate_the_source', () => {
    const source = [makeTurnRecord(2), makeTurnRecord(1)];
    const copy = JSON.parse(JSON.stringify(source));
    exportKeepsake(source);
    expect(source).toEqual(copy);
  });
});
