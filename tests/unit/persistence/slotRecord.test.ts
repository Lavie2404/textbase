/**
 * Unit tests - slot metadata, migration chain, delete confirmation.
 * AC ids: gdd-05 B8 (AC-05, AC-06, AC-08, AC-19, AC-30, AC-35).
 */
import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  DELETE_CONFIRM_FALLBACK,
  closeSlot,
  continuationEligible,
  createSlotRecord,
  deleteConfirmationMatches,
  isWritable,
  markUnreadable,
  migrateSlot,
  requiresEscalatedDelete,
} from '../../../src-web/systems/persistence/slotRecord';
import { PERSISTENCE_KNOBS } from '../../../src-web/systems/registry';
import { NOW, makeSlot } from './factories';

describe('slot creation and state (AC-05, AC-06, AC-35)', () => {
  it('test_new_slot_is_playable_and_carries_current_schema', () => {
    const slot = createSlotRecord({ slot_id: 's1', character_name: 'A', now: NOW });
    expect(slot.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(slot.readable).toBe(true);
    expect(slot.slot_closure_reason).toBeNull();
    expect(slot.turn_count).toBe(0);
    expect(slot.hack_mode_used_this_slot).toBe(false);
    expect(isWritable(slot)).toBe(true);
  });
  it('test_registry_and_module_agree_on_schema_version', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(PERSISTENCE_KNOBS.schema_version);
  });
  it('test_closed_slot_is_not_writable_but_stays_readable', () => {
    const closed = closeSlot(makeSlot(), 'death');
    expect(isWritable(closed)).toBe(false);
    expect(closed.readable).toBe(true);
  });
  it('test_quota_closure_leaves_continuation_ineligible', () => {
    const closed = closeSlot(makeSlot(), 'quota_exhausted');
    expect(continuationEligible(closed, true, true)).toBe(false);
  });
  it('test_only_death_closure_allows_continuation', () => {
    const dead = closeSlot(makeSlot(), 'death');
    expect(continuationEligible(dead, true, true)).toBe(true);
    expect(continuationEligible(dead, false, true)).toBe(false);
    expect(continuationEligible(dead, true, false)).toBe(false);
  });
  it('test_unreadable_slot_is_not_writable', () => {
    const broken = markUnreadable(makeSlot(), 'corrupt');
    expect(isWritable(broken)).toBe(false);
    expect(broken.readable).toBe(false);
    expect(broken.slot_closure_reason).toBe('corrupt');
  });
  it('test_null_record_is_not_writable', () => {
    expect(isWritable(null)).toBe(false);
  });
});

describe('migration chain (AC-08)', () => {
  it('test_current_version_needs_no_step', () => {
    const result = migrateSlot(makeSlot());
    expect(result.ok).toBe(true);
    expect(result.steps).toBe(0);
  });
  it('test_v1_record_upgrades_to_current', () => {
    const legacy = { slot_id: 'old', schema_version: 1, character_name: 'B', currentTurn: 42 };
    const result = migrateSlot(legacy);
    expect(result.ok).toBe(true);
    expect(result.steps).toBe(1);
    expect(result.record?.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.record?.turn_count).toBe(42);
    expect(result.record?.readable).toBe(true);
    expect(result.record?.slot_closure_reason).toBeNull();
  });
  it('test_newer_version_is_rejected_not_downgraded', () => {
    const result = migrateSlot({ schema_version: CURRENT_SCHEMA_VERSION + 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('newer_than_current');
    expect(result.record).toBeNull();
  });
  it('test_version_with_no_path_is_rejected', () => {
    const result = migrateSlot({ schema_version: -3 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_migration_path');
  });
  it('test_non_record_input_never_throws', () => {
    expect(migrateSlot(null).ok).toBe(false);
    expect(migrateSlot('nope').ok).toBe(false);
    expect(migrateSlot({}).reason).toBe('not_a_record');
  });
  it('test_migration_does_not_mutate_the_input', () => {
    const legacy = { slot_id: 'old', schema_version: 1 };
    migrateSlot(legacy);
    expect(legacy.schema_version).toBe(1);
  });
});

describe('delete confirmation (AC-19, AC-30)', () => {
  it('test_closed_slot_requires_escalation_in_progress_does_not', () => {
    expect(requiresEscalatedDelete(closeSlot(makeSlot(), 'death'))).toBe(true);
    expect(requiresEscalatedDelete(makeSlot())).toBe(false);
    expect(requiresEscalatedDelete(markUnreadable(makeSlot(), 'corrupt'))).toBe(false);
  });
  it('test_exact_name_matches', () => {
    expect(deleteConfirmationMatches('Diệp Thần', 'Diệp Thần')).toBe(true);
  });
  it('test_case_and_whitespace_are_normalized', () => {
    expect(deleteConfirmationMatches('Diệp Thần', '  diệp thần  ')).toBe(true);
  });
  it('test_nfd_input_matches_nfc_stored_name', () => {
    const nfd = 'Diệp Thần'.normalize('NFD');
    expect(deleteConfirmationMatches('Diệp Thần', nfd)).toBe(true);
  });
  it('test_wrong_name_fails', () => {
    expect(deleteConfirmationMatches('Diệp Thần', 'Diep Than')).toBe(false);
    expect(deleteConfirmationMatches('Diệp Thần', '')).toBe(false);
  });
  it('test_empty_stored_name_requires_the_literal_fallback', () => {
    expect(deleteConfirmationMatches('   ', DELETE_CONFIRM_FALLBACK)).toBe(true);
    expect(deleteConfirmationMatches('', 'xác nhận')).toBe(true);
    expect(deleteConfirmationMatches('', 'bất kỳ')).toBe(false);
  });
});
