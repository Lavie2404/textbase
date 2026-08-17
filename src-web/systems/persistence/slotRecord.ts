/**
 * Persistence - slot metadata and the migration chain (gdd-05 B3, R6, R8).
 *
 * `SlotRecord` is the one part of the save that Persistence is allowed to read
 * and interpret: Core Rule #2 (opaque blobs) does not apply to these fields.
 *
 * Design docs: production/gdd-integration/gdd-05-encounter-persistence.md B2
 * (R5/R6/R8/R10), B3, B4 (slot lifecycle), B8 (AC-05, AC-06, AC-08, AC-19,
 * AC-23, AC-35); plan.md decision C-2 (unlimited local slots; IndexedDB is the
 * source of truth; GitHub is a backup mirror).
 *
 * Pure module: no I/O; the clock is injected.
 */
import { PERSISTENCE_KNOBS } from '../registry';

/**
 * Bundle schema version (gdd-05 R8: bumped when `N` changes, when any registered
 * blob format changes, or when a physical key shape changes).
 *
 * P3a bumps the registry baseline of 1 to 2: the key shape moved to
 * `[slot_id, world_time, hack_seq]`, `SlotRecord` gained six fields, and a
 * checksum was added (bundle.ts). Sourced from the registry so there is exactly
 * one definition.
 */
export const CURRENT_SCHEMA_VERSION = PERSISTENCE_KNOBS.schema_version;

/**
 * Why a slot is read-only.
 *
 * `death` and `quota_exhausted` come from gdd-05 R6/R10. `corrupt` and `schema`
 * are P3a additions covering the two load-time failure modes the GDD describes
 * as states (`LOAD_FAILED_UNREADABLE`, `LOAD_REJECTED_VERSION_MISMATCH`) but does
 * not give a closure reason for; recording them keeps the slot listed and
 * labelled rather than silently unopenable (gdd-05 EC-8).
 */
export type SlotClosureReason = 'death' | 'quota_exhausted' | 'corrupt' | 'schema' | null;

/** In-world clock kept alongside `world_time` (App.tsx `knowledge.time`). */
export interface WorldTimeStamp {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export interface SlotRecord {
  slot_id: string;
  schema_version: number;
  character_name: string;
  /** Epoch ms of the last successful commit. Drives the backup soft prompt. */
  last_saved_at: number;
  created_at: number;
  /** False => LOAD_FAILED_UNREADABLE state; the row STAYS listed (gdd-05 EC-8). */
  readable: boolean;
  slot_closure_reason: SlotClosureReason;
  /** Confirmed, non-undone turns. Mirrors World Memory `total_turns()`. */
  turn_count: number;
  /** Highest committed `world_time` (gdd-05 B3 `world_time_latest`). */
  world_time_latest: number;
  /** Write-once-true, lives OUTSIDE every snapshot and cannot be cleared (gdd-06 C5). */
  hack_mode_used_this_slot: boolean;
  /** In-world date/time shown on the slot row. */
  world_time: WorldTimeStamp | null;
  /** Formula #1/#3 inputs (gdd-05 B3). */
  byte_accounting: { fixed_blob_bytes: number; sum_turn_record_bytes: number };
}

export interface CreateSlotArgs {
  slot_id: string;
  character_name: string;
  now: number;
  world_time?: WorldTimeStamp | null;
}

/** A brand new, playable slot. Touches no other slot (gdd-05 AC-05). */
export function createSlotRecord(args: CreateSlotArgs): SlotRecord {
  return {
    slot_id: args.slot_id,
    schema_version: CURRENT_SCHEMA_VERSION,
    character_name: args.character_name,
    last_saved_at: args.now,
    created_at: args.now,
    readable: true,
    slot_closure_reason: null,
    turn_count: 0,
    world_time_latest: 0,
    hack_mode_used_this_slot: false,
    world_time: args.world_time ?? null,
    byte_accounting: { fixed_blob_bytes: 0, sum_turn_record_bytes: 0 },
  };
}

/** A closed slot is read-only: it never receives writes (gdd-05 R6 / AC-06). */
export function isWritable(record: SlotRecord | null | undefined): boolean {
  return !!record && record.readable === true && record.slot_closure_reason === null;
}

/** Only `death` makes Character Continuation possible (gdd-05 R6 / AC-35). */
export function continuationEligible(record: SlotRecord, isDeathTurn: boolean, deathConfirmed: boolean): boolean {
  return record.slot_closure_reason === 'death' && isDeathTurn === true && deathConfirmed === true;
}

/** Closes a slot without losing any committed turn (gdd-05 R10). Pure. */
export function closeSlot(record: SlotRecord, reason: Exclude<SlotClosureReason, null>): SlotRecord {
  return { ...record, slot_closure_reason: reason };
}

/** Marks a slot unreadable; the row stays listed and is never auto-deleted. */
export function markUnreadable(record: SlotRecord, reason: Exclude<SlotClosureReason, null>): SlotRecord {
  return { ...record, readable: false, slot_closure_reason: reason };
}

// ---------------------------------------------------------------------------
// Migration chain (gdd-05 R8)
// ---------------------------------------------------------------------------

/**
 * One step of the version table: takes a record at version `v` and returns it at
 * version `v + 1`. Steps must be pure and total - a step that cannot upgrade a
 * record throws, which `migrateSlot` converts into a rejection.
 */
export type MigrationStep = (record: Record<string, unknown>) => Record<string, unknown>;

/**
 * Version table. Key `v` migrates `v -> v + 1`.
 *
 * gdd-05 R8 forbids IMPLICIT migration: a mismatch must be rejected rather than
 * guessed. This table is the EXPLICIT path, and it exists because assumption #5
 * of plan.md E is binding - real players already have saves, so a bare rejection
 * would delete their playthroughs. A version with no entry is rejected.
 */
export const MIGRATIONS: Record<number, MigrationStep> = {
  /** v1 (pre-P3a whole-state save) -> v2 (slot metadata + checksum + key shape). */
  1: (record) => ({
    ...record,
    schema_version: 2,
    readable: record.readable ?? true,
    slot_closure_reason: record.slot_closure_reason ?? null,
    turn_count: record.turn_count ?? record.currentTurn ?? 0,
    world_time_latest: record.world_time_latest ?? record.currentTurn ?? 0,
    hack_mode_used_this_slot: record.hack_mode_used_this_slot ?? false,
    world_time: record.world_time ?? null,
    byte_accounting: record.byte_accounting ?? { fixed_blob_bytes: 0, sum_turn_record_bytes: 0 },
    character_name: record.character_name ?? '',
    last_saved_at: record.last_saved_at ?? 0,
    created_at: record.created_at ?? 0,
  }),
};

export interface MigrationResult {
  ok: boolean;
  record: SlotRecord | null;
  /** How many steps ran. 0 = the record was already current. */
  steps: number;
  /** Set when `ok` is false: the caller marks the slot unreadable with `schema`. */
  reason?: 'newer_than_current' | 'no_migration_path' | 'not_a_record';
}

/**
 * Runs the chain from `record.schema_version` up to `CURRENT_SCHEMA_VERSION`.
 *
 * A NEWER version is rejected in the same way an older unmigratable one is
 * (gdd-05 R8: "any mismatch, older or newer"); downgrade is never attempted.
 * Never throws.
 */
export function migrateSlot(record: unknown): MigrationResult {
  if (!record || typeof record !== 'object') {
    return { ok: false, record: null, steps: 0, reason: 'not_a_record' };
  }
  let current = { ...(record as Record<string, unknown>) };
  const version = Number(current.schema_version);
  if (!Number.isFinite(version)) {
    return { ok: false, record: null, steps: 0, reason: 'not_a_record' };
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, record: null, steps: 0, reason: 'newer_than_current' };
  }
  let steps = 0;
  let v = version;
  while (v < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, record: null, steps, reason: 'no_migration_path' };
    try {
      current = step(current);
    } catch {
      return { ok: false, record: null, steps, reason: 'no_migration_path' };
    }
    steps += 1;
    v = Number(current.schema_version);
    if (!Number.isFinite(v)) return { ok: false, record: null, steps, reason: 'no_migration_path' };
  }
  return { ok: true, record: current as unknown as SlotRecord, steps };
}

// ---------------------------------------------------------------------------
// Escalated delete confirmation (gdd-05 B4 / AC-19)
// ---------------------------------------------------------------------------

/** Literal fallback when the stored character name is empty after NFC + trim. */
export const DELETE_CONFIRM_FALLBACK = 'XÁC NHẬN';

/** Unicode NFC + trim, the normalization both sides of the comparison get. */
export function normalizeName(text: string): string {
  return (text ?? '').normalize('NFC').trim();
}

/**
 * Escalated confirmation for a CLOSED slot: retype the character name.
 * NFC + trim + case-insensitive; an empty stored name requires "XÁC NHẬN".
 */
export function deleteConfirmationMatches(storedName: string, typed: string): boolean {
  const stored = normalizeName(storedName);
  const expected = stored === '' ? DELETE_CONFIRM_FALLBACK : stored;
  return normalizeName(typed).toLocaleLowerCase() === normalizeName(expected).toLocaleLowerCase();
}

/** Ordinary (1-step) confirmation applies to in-progress and unreadable slots. */
export function requiresEscalatedDelete(record: SlotRecord): boolean {
  return record.readable === true && record.slot_closure_reason !== null;
}
