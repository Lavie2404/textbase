/**
 * gdd-02 PART B - Equipment & Skill Data System: the pure data-definition layer.
 *
 * Design docs: production/gdd-integration/gdd-02-exp-equipment.md (PART B, B2/B3),
 * production/gdd-integration/plan.md B.5.
 *
 * SCOPE
 * Three hierarchical tiers - Weapon -> Skill -> Thuc (a named individual move) -
 * plus a separate minimal RecoveryItem category. NO gameplay math lives here
 * (Rule B1): no damage, no combat power, no EXP rates. Its two formulas
 * (validateDataset.ts) are data-integrity validators only.
 *
 * ADAPTATION TO THE SHIPPED APP (documented deviation)
 * App.tsx does not store this schema. It stores items as
 * `{Name, Type, Rarity, stats_bonus, effects, usageCondition, id, ...}` and
 * skills as `{Name, Rarity, skillType, skillCategory, active_actions[], ...}`
 * (app-map.md (j)). plan.md B.5 keeps that storage untouched - the GDD shape is
 * a SUBSET of the App's (1 `equipped_weapon_id` vs the App's 10 equipment
 * slots), and narrowing the App would be a feature regression. This file
 * therefore defines the GDD types plus a thin, read-only mapping layer
 * (`weaponFromAppItem`, `skillFromAppSkill`, `thucListFromAppSkill`) so the
 * validators can run over live App data without changing how it is stored.
 *
 * Pure module: no React, no I/O, no RNG.
 */

import type { CharId } from '../types';

/** Enum content is not decided for MVP (gdd-02 B9 #1); any string is accepted. */
export type WeaponType = string;

export interface Weapon {
  weapon_id: string;
  weapon_type: WeaponType;
  /** gdd-02 AC-05: non-null, non-negative integer. `0` is schema-legal here. */
  tier: number;
  display_name?: string;
  /** gdd-02 Rule #9: write-once-true, permanent, never reset. */
  was_ever_equipped: boolean;
}

export interface Skill {
  skill_id: string;
  weapon_type: WeaponType;
  tier: number;
  /** gdd-02 Rule #2: optional cosmetic grouping; null/"" when unaffiliated. */
  family_id: string | null;
  /** gdd-02 Rule #4: prose, narration context only - never locked numeric data. */
  style_descriptor: string;
  /** gdd-02 Rule #9: write-once-true, permanent. */
  was_ever_resolved_in_combat: boolean;
}

export interface Thuc {
  /** gdd-02 Rule #3: GLOBALLY unique across the whole dataset, not per skill. */
  thuc_id: string;
  skill_id: string;
  /** gdd-02 AC-15: display names need NOT be unique. */
  display_name: string;
}

/** gdd-02 Rule #8: a separate category, outside the 3-tier hierarchy. */
export interface RecoveryItem {
  item_id: string;
  /** [0, 1], MANDATORY at authoring time with no engine default. */
  efficacy: number;
}

/** gdd-02 Rule #6: ownership keyed by `char_id`, never a global "main" slot. */
export interface CharacterLoadout {
  char_id: CharId;
  equipped_weapon_id: string | null;
  known_skill_ids: string[];
}

export interface EquipmentDataset {
  weapons: Weapon[];
  skills: Skill[];
  thuc: Thuc[];
  recoveryItems?: RecoveryItem[];
  /** Authoritative list; a skill whose `weapon_type` is absent is invalid (F2). */
  validWeaponTypes: WeaponType[];
}

export function emptyDataset(): EquipmentDataset {
  return { weapons: [], skills: [], thuc: [], recoveryItems: [], validWeaponTypes: [] };
}

// ---------------------------------------------------------------------------
// Thuc ids
// ---------------------------------------------------------------------------

/** Separator between a skill id and a thuc index in a generated `thuc_id`. */
export const THUC_ID_SEPARATOR = ':';

/**
 * Deterministic globally-unique thuc id: `<skill_id>:<index>`.
 *
 * Global uniqueness follows from the skill id already being unique (App.tsx uses
 * `crypto.randomUUID()` for every generated skill), so no registry lookup is
 * needed and the id survives a save/load round trip. App.tsx assigns exactly
 * this shape in `fetchSkillDetailsFromAI` (:22298).
 */
export function makeThucId(skillId: string, index: number): string {
  return String(skillId) + THUC_ID_SEPARATOR + String(index);
}

/** Inverse of `makeThucId`; returns null when the id is not of that shape. */
export function parseThucId(thucId: string): { skill_id: string; index: number } | null {
  const raw = String(thucId ?? '');
  const at = raw.lastIndexOf(THUC_ID_SEPARATOR);
  if (at <= 0) return null;
  const index = Number(raw.slice(at + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { skill_id: raw.slice(0, at), index };
}

// ---------------------------------------------------------------------------
// Mapping layer over the shipped App.tsx shapes (read-only)
// ---------------------------------------------------------------------------

/** Minimal read-only view of an App.tsx item (app-map.md (j)). */
export interface AppItemView {
  id?: string;
  Name?: string;
  Type?: string;
  Rarity?: string;
  was_ever_equipped?: boolean;
  [k: string]: unknown;
}

/** Minimal read-only view of an App.tsx skill (app-map.md (j)). */
export interface AppSkillView {
  id?: string;
  Name?: string;
  description?: string;
  Rarity?: string;
  skillType?: string;
  skillCategory?: string;
  was_ever_resolved_in_combat?: boolean;
  family_id?: string | null;
  active_actions?: Array<{ action_name?: string; thuc_id?: string; [k: string]: unknown }> | null;
  [k: string]: unknown;
}

/**
 * App rarity -> GDD `tier` integer. The App has no numeric tier on items/skills;
 * `Rarity` is the only ordered quality axis it carries, so it is the honest
 * mapping. Unknown rarities map to 0, which AC-05 permits for weapons/skills
 * (unlike a character tier, which can never be 0).
 */
export const RARITY_TIER: Record<string, number> = {
  'Thường': 0,
  'Tốt': 1,
  'Hiếm': 2,
  'Cực Phẩm': 3,
  'Siêu Phẩm': 4,
  'Huyền Thoại': 5,
  'Thần Thoại': 6,
};

export function tierFromRarity(rarity: unknown): number {
  const key = typeof rarity === 'string' ? rarity.trim() : '';
  const tier = RARITY_TIER[key];
  return Number.isInteger(tier) ? tier : 0;
}

/**
 * App item -> GDD `Weapon`. `weapon_type` reuses the App's `Type` field
 * ("Vũ khí", "Trang bị", ...) because the MVP weapon-type enum is still
 * undecided (gdd-02 B9 #1).
 */
export function weaponFromAppItem(item: AppItemView): Weapon {
  return {
    weapon_id: String(item?.id ?? ''),
    weapon_type: String(item?.Type ?? ''),
    tier: tierFromRarity(item?.Rarity),
    display_name: typeof item?.Name === 'string' ? item.Name : undefined,
    was_ever_equipped: item?.was_ever_equipped === true,
  };
}

/**
 * App skill -> GDD `Skill`. `style_descriptor` is the App's `description`
 * (plan.md B.5 "already present, renamed"); `weapon_type` falls back to the
 * skill's own category because App skills are not bound to a weapon type.
 */
export function skillFromAppSkill(skill: AppSkillView): Skill {
  return {
    skill_id: String(skill?.id ?? ''),
    weapon_type: String(skill?.skillType ?? ''),
    tier: tierFromRarity(skill?.Rarity),
    family_id: (skill?.family_id as string | null) ?? null,
    style_descriptor: typeof skill?.description === 'string' ? skill.description : '',
    was_ever_resolved_in_combat: skill?.was_ever_resolved_in_combat === true,
  };
}

/**
 * App skill -> its list of GDD `Thuc`. Each `active_actions[i]` is one thuc.
 * A missing `thuc_id` is backfilled with `makeThucId(skill.id, i)`, matching the
 * write App.tsx performs at creation time, so old saves read consistently.
 */
export function thucListFromAppSkill(skill: AppSkillView): Thuc[] {
  const actions = Array.isArray(skill?.active_actions) ? skill.active_actions : [];
  const skillId = String(skill?.id ?? '');
  return actions.map((action, index) => ({
    thuc_id:
      typeof action?.thuc_id === 'string' && action.thuc_id.length > 0
        ? action.thuc_id
        : makeThucId(skillId, index),
    skill_id: skillId,
    display_name:
      typeof action?.action_name === 'string' && action.action_name.length > 0
        ? action.action_name
        : 'Thức ' + String(index + 1),
  }));
}

/** Builds a dataset view over a list of App skills/items, for the F2 lint. */
export function datasetFromApp(
  items: readonly AppItemView[],
  skills: readonly AppSkillView[],
): EquipmentDataset {
  const weapons = items.map(weaponFromAppItem);
  const mappedSkills = skills.map(skillFromAppSkill);
  const thuc = skills.flatMap(thucListFromAppSkill);
  return {
    weapons,
    skills: mappedSkills,
    thuc,
    recoveryItems: [],
    validWeaponTypes: [...new Set(mappedSkills.map((s) => s.weapon_type))],
  };
}
