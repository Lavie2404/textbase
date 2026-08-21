/**
 * Character Card D.5 - `base_stat_completeness_check`, the last safety net on
 * entity-record creation.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART B, D.5, B6, AC-26/27/28/46), plan.md P6.
 *
 * Runs EXACTLY ONCE at entity-record creation, never on every card open. A
 * failure BLOCKS the turn confirmation, logs a content gap and creates NO
 * partial entity record.
 *
 * HP is strict `> 0` because three downstream systems use it as a denominator
 * (`hp_pct` in Combat, `margin_ratio` in NPC Affinity and Death & Consequence).
 * The other 11 are `>= 0`.
 *
 * Pure module: no React, no I/O, no RNG.
 */

import { GDD_STAT_KEYS, type GddStatKey } from '../registry';
import type { CharId } from '../types';

export type BaseStatMap = Partial<Record<GddStatKey, unknown>>;

export type BaseStatIssueReason =
  | 'missing'
  | 'not_numeric'
  | 'not_finite'
  | 'negative'
  | 'hp_not_positive'
  | 'unknown_key';

export interface BaseStatIssue {
  stat: string;
  reason: BaseStatIssueReason;
}

export interface BaseStatCheckResult {
  ok: boolean;
  issues: BaseStatIssue[];
  /** Diagnostic log line (English, per coding-standards.md). Null when ok. */
  content_gap_log: string | null;
  /** Player/QA-facing message (Vietnamese). Null when ok. */
  message: string | null;
}

/** The 12 keys D.5 requires, re-exported so callers never re-literal them. */
export const BASE_STAT_KEYS: readonly GddStatKey[] = GDD_STAT_KEYS;

function isNumericValue(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * D.5.
 *
 * `defined(base_HP0) AND numeric(base_HP0) AND base_HP0 > 0`
 * `AND for each of the other 11: defined AND numeric AND >= 0`
 *
 * `base_HP0 = 0` FAILS exactly (AC-46) while `0.01` passes.
 */
export function baseStatCompletenessCheck(
  charId: CharId,
  map: BaseStatMap | null | undefined,
): BaseStatCheckResult {
  const issues: BaseStatIssue[] = [];
  const source = (map ?? {}) as Record<string, unknown>;

  for (const stat of BASE_STAT_KEYS) {
    const value = source[stat];
    if (value === undefined || value === null) {
      issues.push({ stat, reason: 'missing' });
      continue;
    }
    if (!isNumericValue(value)) {
      issues.push({ stat, reason: 'not_numeric' });
      continue;
    }
    if (!Number.isFinite(value)) {
      issues.push({ stat, reason: 'not_finite' });
      continue;
    }
    if (stat === 'HP') {
      if (!(value > 0)) issues.push({ stat, reason: 'hp_not_positive' });
      continue;
    }
    if (value < 0) issues.push({ stat, reason: 'negative' });
  }

  if (issues.length === 0) {
    return { ok: true, issues, content_gap_log: null, message: null };
  }

  const detail = issues.map((i) => i.stat + ':' + i.reason).join(', ');
  return {
    ok: false,
    issues,
    content_gap_log: 'content gap: base_X0 invalid for char_id=' + String(charId) + ' [' + detail + ']',
    message:
      'Thiếu hoặc sai chỉ số gốc của nhân vật (' +
      issues.map((i) => i.stat).join(', ') +
      '). Lượt bị chặn, không tạo hồ sơ dở dang.',
  };
}

/** Boolean form for call sites that only branch on the verdict. */
export function isValidBaseStatRecord(map: BaseStatMap | null | undefined): boolean {
  return baseStatCompletenessCheck('', map).ok;
}

/**
 * Rejects a record that carries keys outside the canonical 12. D.5 itself is a
 * completeness check; the customization panel's D.3 is the stricter EQUALITY
 * check (a stray key fails there, gdd-06 C4 D.3 / AC-11).
 */
export function extraStatKeys(map: BaseStatMap | null | undefined): string[] {
  const known = new Set<string>(BASE_STAT_KEYS as readonly string[]);
  return Object.keys(map ?? {}).filter((key) => !known.has(key));
}
