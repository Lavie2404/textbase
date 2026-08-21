/**
 * Persistence - quota projection and the backup prompt (gdd-05 B4 Formulas #1/#3).
 *
 * These are PLANNING and WARNING tools only. They never block a save or a load;
 * gdd-05 R4 is the real enforcement (B6 EC-13).
 *
 * Design docs: production/gdd-integration/gdd-05-encounter-persistence.md B4
 * (Formulas #1/#3), B5, B6 (EC-13), B8 (AC-10, AC-11, AC-15, AC-16, AC-25,
 * AC-26, AC-28); plan.md C-2 (GitHub is a backup mirror, so the soft prompt
 * matters: Safari ITP evicts IndexedDB after ~7 days).
 *
 * Pure module: no I/O; measurement results are passed in.
 */
import { PERSISTENCE_KNOBS } from '../registry';

/** Sentinel returned when a measurement is missing (never 0, NaN or Infinity). */
export const NOT_MEASURED = 'not measured' as const;
export type NotMeasured = typeof NOT_MEASURED;

/**
 * Formula #1a:
 * `bundle_size_bytes(world_time) = fixed + world_time * avg_turn_record_bytes * ratio`.
 *
 * An omitted `compression_ratio` defaults to 1 (AC-11); a measured ratio > 1 is
 * clamped to 1, because planning always assumes the worst case.
 */
export function bundleSizeBytes(
  worldTime: number,
  fixedBlobBytes: number,
  avgTurnRecordBytes: number,
  compressionRatio = 1,
): number {
  const ratio = clampRatio(compressionRatio);
  return fixedBlobBytes + worldTime * avgTurnRecordBytes * ratio;
}

/**
 * Formula #1b `quota_exhaustion_turn` - the LAST `world_time` that still fits.
 *
 * - `quota <= fixed`, or an unmeasurable/NaN quota -> 0 (fail-safe worst case).
 * - `avg_turn_record_bytes <= 0` or `ratio <= 0` -> the `'not measured'`
 *   sentinel; never divide, never return Infinity or NaN.
 */
export function quotaExhaustionTurn(
  quotaBytes: number | null | undefined,
  fixedBlobBytes: number,
  avgTurnRecordBytes: number,
  compressionRatio = 1,
): number | NotMeasured {
  if (quotaBytes === null || quotaBytes === undefined || !Number.isFinite(quotaBytes)) return 0;
  if (quotaBytes <= fixedBlobBytes) return 0;
  if (!Number.isFinite(avgTurnRecordBytes) || avgTurnRecordBytes <= 0) return NOT_MEASURED;
  if (!Number.isFinite(compressionRatio) || compressionRatio <= 0) return NOT_MEASURED;
  const ratio = clampRatio(compressionRatio);
  return Math.floor((quotaBytes - fixedBlobBytes) / (avgTurnRecordBytes * ratio));
}

function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return ratio > 1 ? 1 : ratio;
}

export interface QuotaWarning {
  /** `'not measured'` when the origin quota could not be measured. */
  utilization_ratio: number | NotMeasured;
  /** 1 = warn. Defaults to warning when anything is unmeasurable (worst case). */
  warn_triggered: 0 | 1;
}

/**
 * Formula #3, ORIGIN scope: `measured_total_bytes(origin) / quota_bytes_total(origin)`.
 *
 * `measured_total_bytes` is the sum over ALL slots of the origin, never the
 * writing slot alone. An unmeasurable, zero or negative total quota does NOT
 * divide and warns by default (AC-16). `ratio > 1` needs no special branch (AC-28).
 */
export function evaluateQuotaWarning(
  measuredTotalBytes: number,
  quotaBytesTotal: number | null | undefined,
  warnThreshold: number = PERSISTENCE_KNOBS.quota_warn_threshold,
): QuotaWarning {
  if (
    quotaBytesTotal === null ||
    quotaBytesTotal === undefined ||
    !Number.isFinite(quotaBytesTotal) ||
    quotaBytesTotal <= 0
  ) {
    return { utilization_ratio: NOT_MEASURED, warn_triggered: 1 };
  }
  const ratio = measuredTotalBytes / quotaBytesTotal;
  return { utilization_ratio: ratio, warn_triggered: ratio >= warnThreshold ? 1 : 0 };
}

/**
 * `navigator.storage.estimate()` wrapper. Returns nulls rather than throwing on
 * a browser that lacks the API - Formula #3 then takes its worst-case branch.
 */
export async function estimateOriginQuota(
  storage: { estimate?: () => Promise<{ usage?: number; quota?: number }> } | undefined = (
    globalThis as any
  ).navigator?.storage,
): Promise<{ usage: number | null; quota: number | null }> {
  try {
    if (!storage || typeof storage.estimate !== 'function') return { usage: null, quota: null };
    const result = await storage.estimate();
    return { usage: result?.usage ?? null, quota: result?.quota ?? null };
  } catch {
    return { usage: null, quota: null };
  }
}

/**
 * gdd-05 B4 "Backup prompt threshold": a faint diegetic invitation to
 * "Chép lại quyển sổ", never a blocking banner. Below the ~7-day Safari ITP
 * eviction window.
 */
export function shouldPromptBackup(
  lastSavedAt: number,
  now: number,
  thresholdDays = PERSISTENCE_KNOBS.backup_prompt_days,
): boolean {
  if (!Number.isFinite(lastSavedAt) || !Number.isFinite(now)) return false;
  const elapsedDays = (now - lastSavedAt) / (24 * 60 * 60 * 1000);
  return elapsedDays > thresholdDays;
}
