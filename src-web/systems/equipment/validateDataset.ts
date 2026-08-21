/**
 * gdd-02 PART B, B4 - the two data-integrity formulas.
 *
 * F1 `is_pool_sufficient(skill) = thuc_count(skill) >= max_invocations_per_battle`
 *    Authoring-time WARNING only. Never a runtime block, never a build failure
 *    (gdd-02 B6 first bullet, AC-10).
 *
 * F2 `is_valid_dataset` - a BLOCKING gate:
 *    - every `thuc_id` is globally unique (Rule #3)
 *    - every `thuc.skill_id` resolves against `valid_skill_ids`
 *    - every `skill.weapon_type` resolves against `valid_weapon_types`
 *    A `false` result blocks the commit / CI merge (AC-12, AC-17).
 *
 * Design docs: production/gdd-integration/gdd-02-exp-equipment.md (PART B, B4/B6/B8).
 * Pure module: no React, no I/O, no RNG.
 */

import { EQUIPMENT_KNOBS } from '../registry';
import type { EquipmentDataset, RecoveryItem, Skill, Thuc } from './schema';

/**
 * gdd-02 B4/F1: external constant owned by Combat, resolved to
 * `ceil(MAX_EXCHANGE_COUNT / max_known_skills_per_character)` = 5.
 * Declared here (not in registry.ts) because it is Combat's number, quoted; the
 * registry only holds constants this project owns.
 */
export const MAX_INVOCATIONS_PER_BATTLE = 5;

/** gdd-02 B5 knobs. */
export interface EquipmentKnobs {
  min_thuc_per_skill: number;
  max_known_skills_per_character: number;
}

export const DEFAULT_EQUIPMENT_KNOBS: EquipmentKnobs = { ...EQUIPMENT_KNOBS };

/** Number of thuc belonging to one skill. */
export function thucCount(skillId: string, thuc: readonly Thuc[]): number {
  let n = 0;
  for (const t of thuc) if (t.skill_id === skillId) n++;
  return n;
}

/**
 * F1. Uses `>=`, not `>` (AC-11 boundary: exactly 5 is sufficient).
 * Boolean output, no clamping.
 */
export function isPoolSufficient(
  count: number,
  maxInvocationsPerBattle: number = MAX_INVOCATIONS_PER_BATTLE,
): boolean {
  return count >= maxInvocationsPerBattle;
}

export type DatasetViolationCode =
  | 'DUPLICATE_THUC_ID'
  | 'ORPHAN_THUC'
  | 'UNKNOWN_WEAPON_TYPE'
  | 'DUPLICATE_SKILL_ID'
  | 'DUPLICATE_WEAPON_ID'
  | 'INVALID_TIER'
  | 'RUNTIME_FIELD_PRESENT'
  | 'RECOVERY_EFFICACY_INVALID';

export interface DatasetViolation {
  code: DatasetViolationCode;
  /** Id of the offending entry, when there is one. */
  id?: string;
  message: string;
}

export interface DatasetValidationResult {
  /** F2 - the blocking verdict. */
  is_valid_dataset: boolean;
  violations: DatasetViolation[];
  /** F1 - non-blocking authoring warnings, one per under-populated skill. */
  warnings: DatasetViolation[];
}

/** gdd-02 Rule #7 / AC-07: no runtime state may exist in the static dataset. */
const FORBIDDEN_RUNTIME_FIELDS = ['hp', 'HP', 'maxhp', 'exp', 'EXP', 'current_hp', 'current_exp'];

/**
 * F2 plus the schema-level assertions of AC-05 / AC-07.
 *
 * NOTE the asymmetry flagged in gdd-02 B9 #6: a weapon/skill `tier = 0` is
 * schema-legal here, while a CHARACTER `tier = 0` is unreachable by EXP's
 * `tier = floor((level-1)/10)+1`. Only negative and non-integer tiers are
 * rejected.
 */
export function validateDataset(
  dataset: EquipmentDataset,
  knobs: EquipmentKnobs = DEFAULT_EQUIPMENT_KNOBS,
  maxInvocationsPerBattle: number = MAX_INVOCATIONS_PER_BATTLE,
): DatasetValidationResult {
  const violations: DatasetViolation[] = [];
  const warnings: DatasetViolation[] = [];

  const weapons = dataset?.weapons ?? [];
  const skills = dataset?.skills ?? [];
  const thuc = dataset?.thuc ?? [];
  const validWeaponTypes = new Set(dataset?.validWeaponTypes ?? []);
  const validSkillIds = new Set(skills.map((s) => s.skill_id));

  // --- unique ids ----------------------------------------------------------
  const seenThuc = new Set<string>();
  for (const t of thuc) {
    if (seenThuc.has(t.thuc_id)) {
      violations.push({
        code: 'DUPLICATE_THUC_ID',
        id: t.thuc_id,
        message: 'thuc_id "' + t.thuc_id + '" is not globally unique (gdd-02 Rule #3, AC-03)',
      });
    }
    seenThuc.add(t.thuc_id);
  }

  const seenSkill = new Set<string>();
  for (const s of skills) {
    if (seenSkill.has(s.skill_id)) {
      violations.push({
        code: 'DUPLICATE_SKILL_ID',
        id: s.skill_id,
        message: 'skill_id "' + s.skill_id + '" is duplicated',
      });
    }
    seenSkill.add(s.skill_id);
  }

  const seenWeapon = new Set<string>();
  for (const w of weapons) {
    if (seenWeapon.has(w.weapon_id)) {
      violations.push({
        code: 'DUPLICATE_WEAPON_ID',
        id: w.weapon_id,
        message: 'weapon_id "' + w.weapon_id + '" is duplicated',
      });
    }
    seenWeapon.add(w.weapon_id);
  }

  // --- referential integrity ----------------------------------------------
  for (const t of thuc) {
    if (!validSkillIds.has(t.skill_id)) {
      violations.push({
        code: 'ORPHAN_THUC',
        id: t.thuc_id,
        message:
          'thuc "' + t.thuc_id + '" points at unknown skill_id "' + t.skill_id + '" (gdd-02 AC-08)',
      });
    }
  }

  for (const s of skills) {
    if (validWeaponTypes.size > 0 && !validWeaponTypes.has(s.weapon_type)) {
      violations.push({
        code: 'UNKNOWN_WEAPON_TYPE',
        id: s.skill_id,
        message:
          'skill "' + s.skill_id + '" has weapon_type "' + s.weapon_type + '" which is not in valid_weapon_types (gdd-02 AC-09)',
      });
    }
  }

  // --- AC-05 tiers ---------------------------------------------------------
  for (const entry of [...weapons, ...skills] as Array<{ tier: number } & Record<string, unknown>>) {
    const id = String(entry.weapon_id ?? entry.skill_id ?? '');
    if (!Number.isInteger(entry.tier) || entry.tier < 0) {
      violations.push({
        code: 'INVALID_TIER',
        id,
        message: 'tier of "' + id + '" must be a non-negative integer, got ' + String(entry.tier) + ' (gdd-02 AC-05)',
      });
    }
  }

  // --- AC-07 no runtime state in a static template -------------------------
  for (const entry of [...weapons, ...skills, ...thuc] as Array<Record<string, unknown>>) {
    for (const field of FORBIDDEN_RUNTIME_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(entry, field)) {
        violations.push({
          code: 'RUNTIME_FIELD_PRESENT',
          id: String(entry.weapon_id ?? entry.skill_id ?? entry.thuc_id ?? ''),
          message:
            'runtime field "' + field + '" must not exist in the static dataset (gdd-02 Rule #7, AC-07)',
        });
      }
    }
  }

  // --- Rule #8 recovery items ---------------------------------------------
  for (const item of dataset?.recoveryItems ?? []) {
    if (!isValidRecoveryItem(item)) {
      violations.push({
        code: 'RECOVERY_EFFICACY_INVALID',
        id: item?.item_id,
        message:
          'recovery item "' + String(item?.item_id) + '" needs efficacy in [0, 1] with no engine default (gdd-02 Rule #8)',
      });
    }
  }

  // --- F1 warnings (never blocking) ---------------------------------------
  for (const s of skills) {
    const count = thucCount(s.skill_id, thuc);
    if (!isPoolSufficient(count, maxInvocationsPerBattle)) {
      warnings.push({
        code: 'ORPHAN_THUC',
        id: s.skill_id,
        message:
          'skill "' + s.skill_id + '" has ' + count + ' thuc, below max_invocations_per_battle=' +
          maxInvocationsPerBattle + ' (gdd-02 F1: authoring warning only, build not blocked)',
      });
    }
    if (count < knobs.min_thuc_per_skill) {
      warnings.push({
        code: 'ORPHAN_THUC',
        id: s.skill_id,
        message:
          'skill "' + s.skill_id + '" has ' + count + ' thuc, below min_thuc_per_skill=' +
          knobs.min_thuc_per_skill + ' (gdd-02 B5: authoring guidance)',
      });
    }
  }

  return { is_valid_dataset: violations.length === 0, violations, warnings };
}

/** gdd-02 Rule #8: `efficacy` is mandatory, in [0, 1], with no engine default. */
export function isValidRecoveryItem(item: RecoveryItem | null | undefined): boolean {
  if (!item || typeof item.item_id !== 'string' || item.item_id.length === 0) return false;
  const e = item.efficacy;
  return typeof e === 'number' && Number.isFinite(e) && e >= 0 && e <= 1;
}

/** Convenience for CI: throws when F2 fails so a lint script exits non-zero. */
export function assertValidDataset(dataset: EquipmentDataset): DatasetValidationResult {
  const result = validateDataset(dataset);
  if (!result.is_valid_dataset) {
    throw new Error(
      'is_valid_dataset = false (gdd-02 F2), ' +
        result.violations.length +
        ' violation(s):\n' +
        result.violations.map((v) => '  [' + v.code + '] ' + v.message).join('\n'),
    );
  }
  return result;
}

/** True when a skill keeps its own `style_descriptor` (gdd-02 AC-02/AC-04). */
export function hasOwnStyleDescriptor(skill: Skill): boolean {
  return typeof skill.style_descriptor === 'string' && skill.style_descriptor.trim().length > 0;
}
