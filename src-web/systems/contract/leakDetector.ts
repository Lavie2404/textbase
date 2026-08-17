/**
 * Numeric leak detector - the post-hoc monitor of Contract Enforcement.
 *
 * Design docs: production/gdd-integration/gdd-01-turn-contract-ai.md section B
 * (B.3 log schema, B.4 formulas F1 / F1-backstop / F2 / F3, B.6 edge cases,
 * B.8 AC-04, AC-08..AC-16).
 *
 * R3 SAFETY NOTE (read before editing)
 * This module is the ONLY place in the codebase permitted to run a number
 * extractor over `narration_text`, and it must never feed the result anywhere
 * except a log. It compares; it never applies. Everything it returns is
 * diagnostic. gdd-01 B.9 makes this module the whitelist of the planned ESLint
 * `no-restricted-syntax` rule (P7).
 *
 * It also never blocks a narration: a flagged turn still renders (B.4
 * "monitoring only").
 */

import type { LockedFieldValue, LockedResult, TurnRecord } from '../types';

// ---------------------------------------------------------------------------
// Primitives (F1)
// ---------------------------------------------------------------------------

/** `text.match(/\d+(\.\d+)?/g) ?? []` - digits only, never numbers-as-words. */
export function extractNumerals(text: string): string[] {
  if (!text) return [];
  return text.match(/\d+(\.\d+)?/g) ?? [];
}

/** `String(Math.abs(v))` - sign is ignored on purpose (B.4 F1). */
export function digitsOf(value: number): string {
  return String(Math.abs(value));
}

/**
 * Structural bookkeeping fields of `LockedResult` that are NOT mechanical
 * results. `turn_id` and `world_time` are small integers that collide with
 * ordinary prose ("ba ngày sau", chapter numbers) and are never a "leak" in the
 * sense B.4 means, so they are excluded from `fields(locked_result)` exactly the
 * way a `0` value is.
 */
export const NON_MECHANICAL_LOCKED_FIELDS: readonly string[] = ['turn_id', 'world_time'];

/** Flattens the mechanical half of a locked result into `{field: value}`. */
export function mechanicalFields(locked: LockedResult | null | undefined): Record<string, LockedFieldValue> {
  if (!locked) return {};
  const out: Record<string, LockedFieldValue> = {};
  for (const [k, v] of Object.entries(locked.fields ?? {})) {
    if (NON_MECHANICAL_LOCKED_FIELDS.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Numeric, non-zero fields only (B.4 F1 excludes `0` to avoid false positives). */
export function numericFields(locked: LockedResult | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(mechanicalFields(locked))) {
    if (typeof v === 'number' && Number.isFinite(v) && v !== 0) out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// F1 / F1-backstop
// ---------------------------------------------------------------------------

/** `/\d+\s?(HP|EXP|điểm|%)|[+-]\d+/` - the generic stat shape (B.4 F1-backstop). */
export const GENERIC_STAT_RE = /\d+\s?(HP|EXP|điểm|%)|[+-]\d+/;

export interface LeakLogEntry {
  turn_id: number;
  /** `n` in AC-09: how many numeric fields existed at all. `0` is logged. */
  n_numeric_fields: number;
  leak_matches: string[];
  leak_count: number;
  leak_flag: 0 | 1;
  /** Backstop; only meaningful when `n_numeric_fields === 0` (B.4). */
  generic_stat_leak: boolean;
  /** Undone turns are excluded from `T` but their log is kept (AC-16). */
  undone: boolean;
}

export interface LeakCheckResult extends LeakLogEntry {
  /** Field names that leaked, plus `generic_stat_leak` when the backstop fired. */
  violations: string[];
  /** This turn's contribution to `V` (F2). */
  V: 0 | 1;
}

export interface LeakCheckInput {
  turn_id: number;
  locked_result: LockedResult | null;
  narration_text: string;
  undone?: boolean;
}

/**
 * F1 + F1-backstop over one turn.
 *
 * `V` is the turn's contribution to the session violation count. The backstop
 * gets "the same log/flag behaviour as `leak_flag = 1`" (B.4), so it also
 * contributes to `V`; it is reported under its own `violations` entry so F3
 * attribution can tell the two apart.
 */
export function leakCheck(turn: TurnRecord | LeakCheckInput): LeakCheckResult {
  const turn_id = turn.turn_id;
  const locked = (turn as LeakCheckInput).locked_result ?? (turn as TurnRecord).locked_result ?? null;
  const text = turn.narration_text ?? '';
  const undone = Boolean((turn as LeakCheckInput).undone);

  const nums = numericFields(locked);
  const fieldNames = Object.keys(nums);
  const numerals = new Set(extractNumerals(text));

  const leak_matches = fieldNames.filter((f) => numerals.has(digitsOf(nums[f])));
  const leak_count = leak_matches.length;
  const leak_flag: 0 | 1 = leak_count > 0 ? 1 : 0;

  const generic_stat_leak =
    fieldNames.length === 0 && numerals.size > 0 && GENERIC_STAT_RE.test(text);

  const violations = leak_matches.slice();
  if (generic_stat_leak) violations.push('generic_stat_leak');

  return {
    turn_id,
    n_numeric_fields: fieldNames.length,
    leak_matches,
    leak_count,
    leak_flag,
    generic_stat_leak,
    undone,
    violations,
    V: leak_flag === 1 || generic_stat_leak ? 1 : 0,
  };
}

// ---------------------------------------------------------------------------
// F2 / F3 - session accumulator
// ---------------------------------------------------------------------------

export interface SessionLeakStats {
  V: number;
  T: number;
  violation_rate: number | 'N/A';
}

/** MVP hypothesis gate (game-concept.md): `V === 0` across `T >= 90` turns. */
export const MVP_GATE_MIN_TURNS = 90;

export interface GateVerdict {
  pass: boolean;
  reason: 'PASS' | 'INSUFFICIENT_TURNS' | 'VIOLATIONS_PRESENT';
  V: number;
  T: number;
  required_turns: number;
}

export class SessionLeakLog {
  private entries: LeakLogEntry[] = [];

  /** Records one turn. Undone turns are stored but excluded from `T` (AC-16). */
  record(entry: LeakLogEntry | LeakCheckResult): void {
    this.entries.push({
      turn_id: entry.turn_id,
      n_numeric_fields: entry.n_numeric_fields,
      leak_matches: entry.leak_matches.slice(),
      leak_count: entry.leak_count,
      leak_flag: entry.leak_flag,
      generic_stat_leak: entry.generic_stat_leak,
      undone: entry.undone,
    });
  }

  /** Marks an already-recorded turn as undone (Undo happens after the check). */
  markUndone(turnId: number): void {
    for (const e of this.entries) if (e.turn_id === turnId) e.undone = true;
  }

  all(): LeakLogEntry[] {
    return this.entries.map((e) => ({ ...e, leak_matches: e.leak_matches.slice() }));
  }

  /**
   * F2. `T` counts narrated, non-undone turns. `violation_rate` is `'N/A'` when
   * `T === 0` - never a division by zero (AC-12).
   */
  stats(): SessionLeakStats {
    const counted = this.entries.filter((e) => !e.undone);
    const T = counted.length;
    const V = counted.reduce((n, e) => n + (e.leak_flag === 1 || e.generic_stat_leak ? 1 : 0), 0);
    return { V, T, violation_rate: T >= 1 ? V / T : 'N/A' };
  }

  /** F3 - per-field attribution across the session (diagnostic, no extra cost). */
  perField(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.entries) {
      if (e.undone) continue;
      for (const f of e.leak_matches) out[f] = (out[f] ?? 0) + 1;
      if (e.generic_stat_leak) out.generic_stat_leak = (out.generic_stat_leak ?? 0) + 1;
    }
    return out;
  }

  /**
   * The MVP gate. Absolute count, zero tolerance: `T = 90, V = 1` FAILS
   * regardless of the ~1.1% rate (B.4 F2, AC-11).
   */
  gate(minTurns: number = MVP_GATE_MIN_TURNS): GateVerdict {
    const { V, T } = this.stats();
    if (V > 0) return { pass: false, reason: 'VIOLATIONS_PRESENT', V, T, required_turns: minTurns };
    if (T < minTurns) return { pass: false, reason: 'INSUFFICIENT_TURNS', V, T, required_turns: minTurns };
    return { pass: true, reason: 'PASS', V, T, required_turns: minTurns };
  }

  reset(): void {
    this.entries = [];
  }
}

export function createSessionLeakLog(): SessionLeakLog {
  return new SessionLeakLog();
}

/** Convenience: run F1 and record it in one step. Returns the check result. */
export function leakCheckAndRecord(
  turn: TurnRecord | LeakCheckInput,
  log: SessionLeakLog,
  enabled = true,
): LeakCheckResult {
  const result = leakCheck(turn);
  // `leak_detection_enabled` (B.5) is the ONLY knob in this system; disabling it
  // skips the log, never the return value, so a debug session cannot silently
  // corrupt the MVP gate numbers.
  if (enabled) log.record(result);
  return result;
}
