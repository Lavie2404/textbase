/**
 * Character Card D.2 - `displayed_field`, the identity / concealment selector.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART B, Core Rules #5/#6, B3 field domains, D.2), plan.md P6 (reduced).
 *
 * WHAT THIS MODULE IS
 * The card is a read-only presentation layer. This file answers exactly one
 * question - "which of the four legal renderings does field F of character C
 * get?" - and answers it as a TOTAL function with no I/O, no clock, no RNG.
 *
 * The four disjoint output kinds (gdd-06 B4 D.2):
 *   `true`          - the real, locked value
 *   `displayed`     - a pre-authored surface value + the "che giau" badge
 *   `unknown`       - "???" + the badge (concealed with no surface value)
 *   `dual_identity` - true value AND disguise value, side by side
 *
 * ASSUMPTION (recorded, P6a): the GDD models concealment as one boolean
 * `concealment.active` covering the whole `CONCEALABLE_FIELDS` set. The shipped
 * app has no such schema yet, so this module additionally accepts the two
 * coarse flags the task specifies - `disguised` (identity + profile fields) and
 * `realm_hidden` (level/tier + the 12 combat stats). Turning `concealment.active`
 * on is equivalent to turning both flags on.
 */

import { GDD_STAT_KEYS, type GddStatKey } from '../registry';
import { tierFromLevel } from '../math';
import type { CharId } from '../types';

// ---------------------------------------------------------------------------
// Field domains (gdd-06 B3)
// ---------------------------------------------------------------------------

export const IDENTITY_FIELDS = ['name', 'gender', 'than_phan'] as const;
export type IdentityField = (typeof IDENTITY_FIELDS)[number];

export const PROFILE_FIELDS = ['personality', 'appearance', 'backstory'] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** `level` and `tier` plus the 12 combat stats = 14 entries (gdd-06 B3). */
export type StatField = 'level' | 'tier' | GddStatKey;
export const STAT_FIELDS: readonly StatField[] = ['level', 'tier', ...GDD_STAT_KEYS];

/** The 12 combat stats alone - the domain D.4 iterates over. */
export const COMBAT_STAT_FIELDS: readonly GddStatKey[] = GDD_STAT_KEYS;

export type CardField = IdentityField | ProfileField | StatField;

export const CONCEALABLE_FIELDS: readonly CardField[] = [
  ...IDENTITY_FIELDS,
  ...STAT_FIELDS,
  ...PROFILE_FIELDS,
];

/**
 * Everything on the card that is explicitly OUTSIDE `CONCEALABLE_FIELDS` and
 * therefore always shows true values (gdd-06 B3, last paragraph).
 */
export const NON_CONCEALABLE_FIELDS = [
  'affinity',
  'attitude_band',
  'song_tu',
  'location',
  'equipped_weapon_id',
  'known_skill_ids',
  'alive',
  'death_and_consequence_blocked',
  'combat_block',
] as const;
export type NonConcealableField = (typeof NON_CONCEALABLE_FIELDS)[number];

/** Rendered by the UI inside corner brackets. The glyphs are a view concern. */
export const CONCEALED_BADGE = 'che giấu';
/** The card's own sentinel space, separate from Combat's N/A / +inf. */
export const UNKNOWN_SENTINEL = '???';

export function isConcealableField(field: string): field is CardField {
  return (CONCEALABLE_FIELDS as readonly string[]).includes(field);
}

export function isIdentityField(field: string): field is IdentityField {
  return (IDENTITY_FIELDS as readonly string[]).includes(field);
}

export function isProfileField(field: string): field is ProfileField {
  return (PROFILE_FIELDS as readonly string[]).includes(field);
}

export function isStatField(field: string): field is StatField {
  return (STAT_FIELDS as readonly string[]).includes(field);
}

// ---------------------------------------------------------------------------
// Input shapes
// ---------------------------------------------------------------------------

export interface Concealment {
  /**
   * gdd-06 B2 #6: may only be set true when all 12 combat stats carry a surface
   * value - see `concealmentActivationValid`.
   */
  active: boolean;
  /** Pre-authored surface values. A missing/null entry renders "???". */
  displayed: Partial<Record<CardField, string | number | null>>;
}

/**
 * The read-only projection of an App.tsx character the card needs
 * (app-map.md section 2, INITIAL_STATS). Nothing here is written back.
 */
export interface CardCharacter {
  char_id: CharId;
  /** `character.isPlayer` - decides protagonist-only blocks. */
  is_player: boolean;
  name: string;
  gender: string;
  /** "Than phan" - App.tsx `Role`. */
  than_phan: string;
  personality: string;
  appearance: string;
  backstory: string;
  level: number;
  current_exp: number;
  /** The 12 GDD stats, already mapped from the App's baseHp/baseAtk/... */
  stats: Partial<Record<GddStatKey, number>>;
  affinity?: number;
  titles?: readonly string[];
  alive?: boolean;
  location?: string | null;
  /** `character.loreId` - present on canon/lore-backed characters. */
  lore_id?: string | null;
  /** `character.isAppraised` - false hides nothing by itself; see flags. */
  is_appraised?: boolean;
  concealment?: Concealment | null;
  /** Surface identity worn while disguised (canon major characters). */
  disguise?: Partial<Record<IdentityField, string>> | null;
  /** Static per setting pack in MVP (gdd-06 B4, D.2 note). */
  alias_list?: readonly string[];
}

/**
 * Per-open flags injected by the caller. `is_canon_major` comes from Setting &
 * Canon (P5 dropped -> the app passes `false` unless a lore pack says otherwise).
 */
export interface DisplayFlags {
  is_canon_major: boolean;
  disguised: boolean;
  realm_hidden: boolean;
}

export const DEFAULT_DISPLAY_FLAGS: DisplayFlags = {
  is_canon_major: false,
  disguised: false,
  realm_hidden: false,
};

export function displayFlags(partial: Partial<DisplayFlags> = {}): DisplayFlags {
  return { ...DEFAULT_DISPLAY_FLAGS, ...partial };
}

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

export type DisplayedFieldKind = 'true' | 'displayed' | 'unknown' | 'dual_identity';

export interface DisplayedFieldResult {
  kind: DisplayedFieldKind;
  /** What the UI prints. For `dual_identity` this is the disguise value. */
  value: unknown;
  /** The concealment badge whenever the value may not be the truth; else null. */
  badge: string | null;
  /** Only for `dual_identity`. */
  true_value?: unknown;
  disguise_value?: unknown;
}

// ---------------------------------------------------------------------------
// D.2
// ---------------------------------------------------------------------------

/** Raw, locked value of a field. `tier` is derived, never stored (gdd-02 A3). */
export function trueValue(c: CardCharacter, field: CardField): unknown {
  switch (field) {
    case 'name':
      return c.name;
    case 'gender':
      return c.gender;
    case 'than_phan':
      return c.than_phan;
    case 'personality':
      return c.personality;
    case 'appearance':
      return c.appearance;
    case 'backstory':
      return c.backstory;
    case 'level':
      return c.level;
    case 'tier':
      return tierFromLevel(c.level);
    default: {
      const value = c.stats?.[field as GddStatKey];
      return value === undefined ? null : value;
    }
  }
}

/**
 * `disguise_active(C) := len(alias_list(C)) > 0` (gdd-06 B4 D.2), OR the caller
 * explicitly says so. Setting & Canon exports no runtime "currently disguised"
 * flag, and the alias list is contractually static per setting pack in MVP.
 */
export function disguiseActive(
  c: CardCharacter,
  flags: DisplayFlags = DEFAULT_DISPLAY_FLAGS,
): boolean {
  return flags.disguised === true || (c.alias_list?.length ?? 0) > 0;
}

export function disguiseValue(c: CardCharacter, field: CardField): string | null {
  if (!isIdentityField(field)) return null;
  const value = c.disguise?.[field];
  return value === undefined || value === null ? null : value;
}

/**
 * Which fields the concealment layer currently covers. `concealment.active`
 * covers everything concealable; the two coarse flags cover one sub-domain each.
 */
export function concealmentCovers(
  field: CardField,
  c: CardCharacter,
  flags: DisplayFlags = DEFAULT_DISPLAY_FLAGS,
): boolean {
  if (!isConcealableField(field)) return false;
  if (c.concealment?.active === true) return true;
  if (flags.disguised && (isIdentityField(field) || isProfileField(field))) return true;
  if (flags.realm_hidden && isStatField(field)) return true;
  return false;
}

/** True when ANY concealment layer is on - drives D.4's short circuit. */
export function concealmentActive(
  c: CardCharacter,
  flags: DisplayFlags = DEFAULT_DISPLAY_FLAGS,
): boolean {
  return (
    c.concealment?.active === true || flags.disguised === true || flags.realm_hidden === true
  );
}

function surfaceValue(c: CardCharacter, field: CardField): unknown {
  const value = c.concealment?.displayed?.[field];
  return value === undefined ? null : value;
}

/**
 * D.2. Total function; returns exactly one of the four result kinds.
 *
 * The `is_major_canon` branch is an ABSOLUTE-PRIORITY guard: it never falls
 * through to the concealment branch, even when `concealment.active = true`
 * (gdd-06 B4 D.2 comment). The privilege covers IDENTITY fields only - a canon
 * major character's stats are concealed exactly like anyone else's.
 */
export function displayedField(
  c: CardCharacter,
  field: CardField,
  flags: DisplayFlags = DEFAULT_DISPLAY_FLAGS,
): DisplayedFieldResult {
  if (isIdentityField(field) && flags.is_canon_major) {
    const real = trueValue(c, field);
    if (disguiseActive(c, flags)) {
      const dv = disguiseValue(c, field);
      if (dv !== null) {
        return {
          kind: 'dual_identity',
          value: dv,
          badge: null,
          true_value: real,
          disguise_value: dv,
        };
      }
    }
    return { kind: 'true', value: real, badge: null };
  }

  if (concealmentCovers(field, c, flags)) {
    const v = surfaceValue(c, field);
    if (v !== null) return { kind: 'displayed', value: v, badge: CONCEALED_BADGE };
    return { kind: 'unknown', value: UNKNOWN_SENTINEL, badge: CONCEALED_BADGE };
  }

  return { kind: 'true', value: trueValue(c, field), badge: null };
}

/** Convenience: D.2 over a list of fields, evaluated as ONE snapshot at open. */
export function displayedFieldMap(
  c: CardCharacter,
  fields: readonly CardField[],
  flags: DisplayFlags = DEFAULT_DISPLAY_FLAGS,
): Record<string, DisplayedFieldResult> {
  const out: Record<string, DisplayedFieldResult> = {};
  for (const field of fields) out[field] = displayedField(c, field, flags);
  return out;
}

/**
 * gdd-06 B2 #6 activation constraint: `concealment.active` may only be set true
 * when a surface value exists for ALL 12 combat stats (all-or-nothing),
 * otherwise D.4 propagates "???" immediately and destroys the design intent.
 */
export function concealmentActivationValid(c: CardCharacter): boolean {
  const displayed = c.concealment?.displayed ?? {};
  return COMBAT_STAT_FIELDS.every((stat) => {
    const v = displayed[stat];
    return v !== undefined && v !== null;
  });
}

/**
 * Combat-facing accessor. gdd-06 B4 D.5 / AC-47: `max_HP(C)` is read DIRECTLY
 * and never through D.2, regardless of concealment - three downstream systems
 * use it as a denominator.
 */
export function maxHp(c: CardCharacter): number {
  const value = c.stats?.HP;
  return typeof value === 'number' ? value : 0;
}
