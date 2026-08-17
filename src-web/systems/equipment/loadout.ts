/**
 * gdd-02 PART B, Rule #6 / #9 - per-`char_id` loadout ownership.
 *
 * Design docs: production/gdd-integration/gdd-02-exp-equipment.md (PART B, B2
 * Rules #6 and #9, B3 `CharacterLoadout`, B6, AC-06/13/14/18).
 *
 * WHAT THIS OWNS
 * - lazy initialisation of a loadout record the first time a `char_id` is read
 *   (AC-18: a brand-new char_id must return the standard starting loadout even
 *   after an older char_id was dirtied, and the old id keeps its dirty values);
 * - the write-once-true deletion-gate markers `was_ever_equipped` /
 *   `was_ever_resolved_in_combat` (Rule #9);
 * - the dangling-reference scrub that must run in the SAME transaction as a
 *   skill deletion (Rule #9, third bullet);
 * - the implicit "Danh thuong" (basic attack) entry, one per weapon type, which
 *   guarantees Combat never sees "0 available thuc" (B3, AC-13/AC-14).
 *
 * Pure module: no React, no I/O, no RNG. The store is an injected plain object
 * so callers (App.tsx, tests) decide where it lives.
 */

import type { CharId } from '../types';
import { EQUIPMENT_KNOBS } from '../registry';
import type { CharacterLoadout, Skill, WeaponType } from './schema';

/** Store shape: a plain map keyed by `char_id` (gdd-02 Rule #6, AC-49/AC-18). */
export type LoadoutStore = Record<CharId, CharacterLoadout>;

/** The MVP starting loadout a brand-new `char_id` receives (gdd-02 AC-18). */
export interface StartingLoadout {
  equipped_weapon_id: string | null;
  known_skill_ids: string[];
}

/**
 * gdd-02 B9 #2 leaves the canonical starting kit unspecified, and App.tsx starts
 * characters with no weapon and no skills (INITIAL_STATS :2116). The honest
 * default is therefore "empty", which B6 explicitly declares valid: the implicit
 * basic attack still guarantees at least one usable move.
 */
export const DEFAULT_STARTING_LOADOUT: StartingLoadout = {
  equipped_weapon_id: null,
  known_skill_ids: [],
};

/**
 * Reads the loadout of `char_id`, creating it on first touch.
 *
 * MUTATES `store` (that is the point - it is the lazy-init cache) but never
 * touches any other `char_id`'s record.
 */
export function getOrInitLoadout(
  store: LoadoutStore,
  char_id: CharId,
  starting: StartingLoadout = DEFAULT_STARTING_LOADOUT,
): CharacterLoadout {
  const existing = store[char_id];
  if (existing) return existing;
  const created: CharacterLoadout = {
    char_id,
    equipped_weapon_id: starting.equipped_weapon_id,
    known_skill_ids: [...starting.known_skill_ids],
  };
  store[char_id] = created;
  return created;
}

/** Non-mutating read: returns the record or a fresh default without storing it. */
export function peekLoadout(
  store: LoadoutStore,
  char_id: CharId,
  starting: StartingLoadout = DEFAULT_STARTING_LOADOUT,
): CharacterLoadout {
  const existing = store[char_id];
  if (existing) {
    return {
      char_id,
      equipped_weapon_id: existing.equipped_weapon_id,
      known_skill_ids: [...existing.known_skill_ids],
    };
  }
  return {
    char_id,
    equipped_weapon_id: starting.equipped_weapon_id,
    known_skill_ids: [...starting.known_skill_ids],
  };
}

/** gdd-02 Rule #6: exactly one equipped weapon at any time. */
export function equipWeapon(
  store: LoadoutStore,
  char_id: CharId,
  weapon_id: string,
): CharacterLoadout {
  const loadout = getOrInitLoadout(store, char_id);
  loadout.equipped_weapon_id = weapon_id;
  return loadout;
}

/**
 * gdd-02 Rule #9: `was_ever_equipped` is write-once-true and PERMANENT.
 * Past-perfect semantics - distinct from the current `equipped_weapon_id`.
 * Returns true when the marker flipped on this call.
 */
export function markEverEquipped(target: { was_ever_equipped?: boolean } | null | undefined): boolean {
  if (!target) return false;
  if (target.was_ever_equipped === true) return false;
  target.was_ever_equipped = true;
  return true;
}

/** gdd-02 Rule #9: `was_ever_resolved_in_combat`, same write-once-true semantics. */
export function markEverResolvedInCombat(
  target: { was_ever_resolved_in_combat?: boolean } | null | undefined,
): boolean {
  if (!target) return false;
  if (target.was_ever_resolved_in_combat === true) return false;
  target.was_ever_resolved_in_combat = true;
  return true;
}

/** Adds a skill id, de-duplicated. Exceeding the knob WARNS, never blocks (B5). */
export function learnSkill(
  store: LoadoutStore,
  char_id: CharId,
  skill_id: string,
  maxKnown: number = EQUIPMENT_KNOBS.max_known_skills_per_character,
): { loadout: CharacterLoadout; overCapacity: boolean } {
  const loadout = getOrInitLoadout(store, char_id);
  if (!loadout.known_skill_ids.includes(skill_id)) {
    loadout.known_skill_ids.push(skill_id);
  }
  return { loadout, overCapacity: loadout.known_skill_ids.length > maxKnown };
}

/**
 * gdd-02 Rule #9 dangling-reference rule: deleting a skill MUST remove its id
 * from EVERY `known_skill_ids` still referencing it, in the SAME write-through
 * transaction. This function performs both halves at once so no caller can do
 * only one of them.
 *
 * @returns the char_ids whose loadout was scrubbed.
 */
export function deleteSkillAndScrub(
  store: LoadoutStore,
  skills: Skill[],
  skill_id: string,
): { removedSkill: boolean; scrubbedCharIds: CharId[] } {
  const index = skills.findIndex((s) => s.skill_id === skill_id);
  const removedSkill = index >= 0;
  if (removedSkill) skills.splice(index, 1);

  const scrubbedCharIds: CharId[] = [];
  for (const charId of Object.keys(store)) {
    const loadout = store[charId];
    const before = loadout.known_skill_ids.length;
    loadout.known_skill_ids = loadout.known_skill_ids.filter((id) => id !== skill_id);
    if (loadout.known_skill_ids.length !== before) scrubbedCharIds.push(charId);
  }
  return { removedSkill, scrubbedCharIds };
}

// ---------------------------------------------------------------------------
// Implicit basic attack ("Danh thuong")
// ---------------------------------------------------------------------------

/** Prefix of the auto-learned basic-attack skill id, one per weapon type. */
export const BASIC_ATTACK_ID_PREFIX = 'danh_thuong_';

/** gdd-02 B3: ONE separate entry per valid weapon type, never a shared entry. */
export function basicAttackSkillId(weaponType: WeaponType): string {
  return BASIC_ATTACK_ID_PREFIX + String(weaponType);
}

/** gdd-02 B3: display name is still unspecified (B9 #2); this is provisional. */
export function basicAttackDisplayName(weaponType: WeaponType): string {
  return 'Đánh thường - ' + String(weaponType);
}

/**
 * Usable skills of a character: `known_skill_ids` plus the implicit basic attack
 * of the currently equipped weapon's type.
 *
 * gdd-02 AC-13/AC-14: an empty `known_skill_ids`, or an equipped weapon whose
 * type matches no known skill, are BOTH valid states - the basic attack means
 * Combat is guaranteed at least one usable move, and neither case is an error.
 */
export function usableSkillIds(
  loadout: CharacterLoadout,
  equippedWeaponType: WeaponType | null | undefined,
): string[] {
  const ids = [...(loadout?.known_skill_ids ?? [])];
  if (equippedWeaponType != null && equippedWeaponType !== '') {
    const basic = basicAttackSkillId(equippedWeaponType);
    if (!ids.includes(basic)) ids.push(basic);
  }
  return ids;
}

/** gdd-02 AC-13: never 0 usable moves once a weapon is equipped. */
export function hasUsableSkill(
  loadout: CharacterLoadout,
  equippedWeaponType: WeaponType | null | undefined,
): boolean {
  return usableSkillIds(loadout, equippedWeaponType).length > 0;
}
