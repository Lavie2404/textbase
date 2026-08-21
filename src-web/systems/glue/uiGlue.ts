/**
 * UI glue - the pure half of the P6b `App.tsx` wiring.
 *
 * WHY THIS MODULE EXISTS
 * P6b wires the pure UI modules (`card/`, `ui/`, `customize/`, `persistence/
 * quota`) into the React monolith. Everything those wiring points must COMPUTE
 * - projecting an App character onto the card's `CardCharacter` shape, mapping
 * the App's 9 base-stat fields onto the GDD's 12, turning a settings item id
 * into the handler the shipped `SettingsMenu` already owns, deriving
 * `tm_state` out of the App's three loading booleans, and building the
 * Vietnamese banner copy - lives here so it is unit-testable without React,
 * IndexedDB or `fetch`.
 *
 * Design docs:
 * - production/gdd-integration/plan.md decisions C-3 (4 settings groups + S/M/L
 *   presets), C-6 (Song Tu gate stays in App.tsx), C-13 (1-turn Undo)
 * - production/gdd-integration/gdd-06-ui-card-customization.md PART A/B/C
 *
 * PURITY: no React, no DOM, no fetch, no clock, no RNG.
 */

import { GDD_STAT_KEYS, PERSISTENCE_KNOBS, type GddStatKey } from '../registry';
import type { CardCharacter, Concealment } from '../card/displayedField';
import type { CardBlocksContext } from '../card/cardBlocks';
import type { BaseStatMap } from '../card/baseStatCompleteness';
import { NOT_MEASURED, evaluateQuotaWarning, type NotMeasured } from '../persistence/quota';
import { BANNER_TEXT, type Banner, type BannerKind } from '../ui/bannerQueue';
import type { TmState } from '../ui/writeActionAllowed';
import { SETTINGS_ITEMS, groupedSettings, type GroupedSettings } from '../ui/settingsGroups';
import { isGapInjured } from '../objectivity/levelGapInjury';

// ---------------------------------------------------------------------------
// 1. Stat projection: App character -> the GDD's 12 stats
// ---------------------------------------------------------------------------

/**
 * The App ships 9 combat stats under its own names; the GDD names 12. Three
 * (ACC, LIFESTEAL, HP_REGEN) have NO App counterpart today - they map to
 * `undefined`, which `displayed_field` renders as a normal missing value rather
 * than inventing a zero (gdd-06 B4 D.2: absence must stay visible).
 *
 * `null` on the right-hand side means "no App field exists".
 */
export const APP_TO_GDD_FINAL_STAT: Record<GddStatKey, string | null> = {
  HP: 'maxhp',
  ATK: 'atk',
  DEF: 'def',
  SPD: 'spd',
  CRIT_RATE: 'cr',
  CRIT_DAMAGE: 'cdmg',
  ACC: null,
  EVASION: 'evasion',
  LIFESTEAL: null,
  HP_REGEN: null,
  AMP: 'dmgAmp',
  MITIGATION: 'dmgRes',
};

/** The base-stat (pre-equipment) counterpart, used by the customization panel. */
export const APP_TO_GDD_BASE_STAT: Record<GddStatKey, string | null> = {
  HP: 'baseHp',
  ATK: 'baseAtk',
  DEF: 'baseDef',
  SPD: 'baseSpd',
  CRIT_RATE: 'baseCr',
  CRIT_DAMAGE: 'baseCdmg',
  ACC: null,
  EVASION: 'baseEvasion',
  LIFESTEAL: null,
  HP_REGEN: null,
  AMP: 'baseDmgAmp',
  MITIGATION: 'baseDmgRes',
};

/**
 * The App stores percentages as whole numbers (`cr = 15` meaning 15%); the card
 * formats percentage stats as `value * 100`, so the projection divides by 100.
 */
export const APP_PERCENT_STAT_FIELDS: readonly string[] = [
  'cr',
  'cdmg',
  'evasion',
  'dmgAmp',
  'dmgRes',
  'baseCr',
  'baseCdmg',
  'baseEvasion',
  'baseDmgAmp',
  'baseDmgRes',
];

function readStat(source: Record<string, unknown>, field: string | null): number | undefined {
  if (field === null) return undefined;
  const raw = source?.[field];
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return APP_PERCENT_STAT_FIELDS.includes(field) ? value / 100 : value;
}

/** Projection used by the Character Card (final, post-equipment stats). */
export function gddStatsFromApp(
  appChar: Record<string, unknown> | null | undefined,
): Partial<Record<GddStatKey, number>> {
  const source = (appChar ?? {}) as Record<string, unknown>;
  const out: Partial<Record<GddStatKey, number>> = {};
  for (const key of GDD_STAT_KEYS) {
    const value = readStat(source, APP_TO_GDD_FINAL_STAT[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Projection used by the D.5 completeness check. Keys with no App counterpart
 * are deliberately ABSENT so `baseStatCompletenessCheck` reports them as the
 * content gap they are (plan.md P6b deviation: log only, never block the turn).
 */
export function gddBaseStatsFromApp(
  appChar: Record<string, unknown> | null | undefined,
): BaseStatMap {
  const source = (appChar ?? {}) as Record<string, unknown>;
  const out: BaseStatMap = {};
  for (const key of GDD_STAT_KEYS) {
    const value = readStat(source, APP_TO_GDD_BASE_STAT[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Character projection
// ---------------------------------------------------------------------------

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * App character -> `CardCharacter`. The App has no concealment schema yet, so
 * `concealment` is only populated when a save already carries one (a forward
 * seam); everything else maps field-for-field.
 */
export function cardCharacterFromApp(
  appChar: Record<string, unknown> | null | undefined,
): CardCharacter {
  const c = (appChar ?? {}) as Record<string, any>;
  const hp = Number(c.hp);
  return {
    char_id: text(c.id),
    is_player: c.isPlayer === true,
    name: text(c.displayName || c.Name || c.name),
    gender: text(c.Gender),
    than_phan: text(c.Role),
    personality: text(c.Personality),
    appearance: text(c.Appearance),
    backstory: text(c.Backstory || c.description),
    level: Number(c.level) || 1,
    current_exp: Number(c.exp) || 0,
    stats: gddStatsFromApp(c),
    affinity: Number(c.affinity) || 0,
    titles: Array.isArray(c.titles) ? c.titles.map(text) : [],
    alive: c.alive === undefined ? !(Number.isFinite(hp) && hp <= 0) : c.alive !== false,
    location: c.currentLocation ?? c.location ?? null,
    lore_id: c.loreId ?? null,
    is_appraised: c.isAppraised === true,
    concealment: (c.concealment as Concealment | undefined) ?? null,
    disguise: c.disguise ?? null,
    alias_list: Array.isArray(c.aliasList) ? c.aliasList.map(text) : [],
  };
}

export interface CardContextInput {
  /** The App character the card was opened on (already `calculateFinalStats`ed). */
  appChar: Record<string, unknown> | null | undefined;
  /** `isProcessingAction || isLoading` - dims both mutating buttons. */
  tmLocked?: boolean;
  /** `gameMode === 'COMBAT'`. */
  inCombat?: boolean;
  /** Weapon name of the main-hand slot, if any. */
  weaponName?: string | null;
  skillNames?: readonly string[];
  /**
   * DECISION C-6: the threshold stays in App.tsx. This predicate is what the
   * card renders from; the card itself holds no number.
   */
  showSongTuButton?: (c: CardCharacter) => boolean;
  recoveryChoices?: readonly { id: string; label: string }[];
  realmNames?: readonly string[] | null;
  /** `longTermStatus` contains "Phe Dan Dien" (plan.md C-11). */
  crippled?: boolean;
  /** Pillar 1: NPC carries the level-gap injury (game-concept.md 243-255). */
  gapInjured?: boolean;
}

/** Builds the `buildCardBlocks` context from what `QuickLoreModal` already has. */
export function cardContextFromApp(input: CardContextInput): CardBlocksContext {
  const c = (input.appChar ?? {}) as Record<string, any>;
  const hp = Number(c.hp);
  return {
    tm_locked: input.tmLocked === true,
    in_combat: input.inCombat === true,
    alive: !(Number.isFinite(hp) && hp <= 0),
    death_and_consequence_blocked: input.crippled === true,
    // Pillar 1: derived from the record itself, so any caller gets it for free.
    gap_injured: input.gapInjured === true || isGapInjured(c),
    equipment: {
      weapon_name: input.weaponName ?? null,
      skill_names: input.skillNames ?? [],
    },
    affinity: { value: Number(c.affinity) || 0 },
    showSongTuButton: input.showSongTuButton,
    recoveryChoices: input.recoveryChoices ?? [],
    realmNames: input.realmNames ?? null,
  };
}

// ---------------------------------------------------------------------------
// 3. Turn Manager state derived from the App's loading booleans
// ---------------------------------------------------------------------------

export interface AppBusyFlags {
  isProcessingAction?: boolean;
  isLoading?: boolean;
  isUndoingTurn?: boolean;
}

/**
 * gdd-06 A2 #4: the App has no explicit `tm_state`; it has three booleans.
 * `undoing` wins over `resolving` because the Undo path is the narrower one.
 */
export function tmStateFromApp(flags: AppBusyFlags | null | undefined): TmState {
  if (flags?.isUndoingTurn === true) return 'undoing';
  if (flags?.isProcessingAction === true || flags?.isLoading === true) return 'resolving';
  return 'awaiting_action';
}

// ---------------------------------------------------------------------------
// 4. Settings: item id -> the handler the shipped SettingsMenu already owns
// ---------------------------------------------------------------------------

/**
 * DECISION C-3 keeps EVERY shipped feature and only regroups it. This table is
 * the contract between `settingsGroups.ts` (data) and `SettingsMenu` (render):
 * every id the App renders must appear here, and every handler key must be a
 * real prop of the component. A unit test asserts both directions.
 *
 * `null` = the item is rendered by a custom control (slider, preset row,
 * toggle) rather than by a single handler prop.
 */
export const SETTINGS_HANDLER_OF: Record<string, string | null> = {
  font_size_preset: 'onTextScaleChange',
  text_scale_advanced: 'onTextScaleChange',
  ui_theme: 'onSetTheme',
  theme_editor: 'onOpenThemeEditor',
  play_style: 'onTogglePlayStyle',
  bgm_enabled: 'onToggleBgm',
  bgm_volume: 'onBgmVolumeChange',
  api_mode: null,
  api_key: null,
  allow_nsfw: null,
  github_backup: 'onSaveToLocal',
  cloud_save: 'onSaveToCloud',
  load_game: 'onLoadFromCloud',
  export_file_full: 'onSaveToFile',
  export_file_light: 'onSaveToFile',
  import_file: 'onLoadFromFile',
  export_keepsake: 'onExportKeepsake',
  export_qa_log: 'onExportQaLog',
  contract_log: 'onExportContractLog',
  gallery: 'onOpenGallery',
  cache_manager: 'onOpenCacheManager',
  htab_debug: 'onDebugAwakenHtab',
  hack_mode_toggle: 'onToggleHackMode',
  open_customize: 'onOpenCustomize',
};

/**
 * Ids that `ApiSetupModal` owns rather than `SettingsMenu` - listed so the
 * integrity test can tell "not rendered here" apart from "forgotten".
 */
export const SETTINGS_ITEMS_ELSEWHERE: readonly string[] = ['api_mode', 'api_key', 'allow_nsfw'];

/** Every group, with the items `SettingsMenu` is responsible for rendering. */
export function settingsGroupsForApp(): GroupedSettings[] {
  return groupedSettings().map(({ group, items }) => ({
    group,
    items: items.filter((item) => !SETTINGS_ITEMS_ELSEWHERE.includes(item.id)),
  }));
}

export interface SettingsMapReport {
  ok: boolean;
  /** Item ids present in `settingsGroups.ts` but missing from the table. */
  unmapped_ids: string[];
  /** Table keys that no longer correspond to any settings item. */
  orphan_keys: string[];
}

export function checkSettingsHandlerMap(): SettingsMapReport {
  const itemIds = new Set(SETTINGS_ITEMS.map((item) => item.id));
  const mapped = new Set(Object.keys(SETTINGS_HANDLER_OF));
  const unmapped = [...itemIds].filter((id) => !mapped.has(id));
  const orphans = [...mapped].filter((key) => !itemIds.has(key));
  return {
    ok: unmapped.length === 0 && orphans.length === 0,
    unmapped_ids: unmapped,
    orphan_keys: orphans,
  };
}

// ---------------------------------------------------------------------------
// 5. Hack-mode toggle persistence (device level, default OFF)
// ---------------------------------------------------------------------------

/** gdd-06 C2 #1: a DEVICE-level setting, so it lives in localStorage, not a save. */
export const HACK_MODE_STORAGE_KEY = 'vdl.app_config.hack_mode';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Anything but the exact string `"1"` reads as OFF - the default is OFF. */
export function readHackModeFlag(store: KeyValueStore | null | undefined): boolean {
  try {
    return store?.getItem(HACK_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeHackModeFlag(store: KeyValueStore | null | undefined, value: boolean): void {
  try {
    store?.setItem(HACK_MODE_STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* private-mode browsers throw on setItem; the toggle still works in-session */
  }
}

// ---------------------------------------------------------------------------
// 6. Banner copy
// ---------------------------------------------------------------------------

/** gdd-05 B5 / plan.md C-2: the quota banner points at the GitHub backup. */
export const QUOTA_BANNER_TEXT = 'Bộ nhớ trình duyệt sắp đầy — hãy Sao lưu lên GitHub';

let bannerSeq = 0;

/** Deterministic ids are not required; uniqueness within a session is. */
export function makeBanner(kind: BannerKind, bannerText?: string): Banner {
  bannerSeq += 1;
  return { id: kind + ':' + bannerSeq, kind, text: bannerText ?? BANNER_TEXT[kind] };
}

export interface QuotaBannerInput {
  usage: number | null | undefined;
  quota: number | null | undefined;
  /** Defaults to the registry threshold (0.85). */
  threshold?: number;
}

/**
 * Returns the banner to raise, or `null` when the origin is comfortably below
 * the warning threshold. An UNMEASURABLE quota does NOT warn here: unlike the
 * planning formula, a banner the player cannot act on is noise, and gdd-05 B6
 * EC-13 keeps enforcement in the write path.
 */
export function quotaBanner(input: QuotaBannerInput): Banner | null {
  const measured = Number(input.usage);
  if (!Number.isFinite(measured)) return null;
  const result = evaluateQuotaWarning(
    measured,
    input.quota,
    input.threshold ?? PERSISTENCE_KNOBS.quota_warn_threshold,
  );
  if (result.utilization_ratio === NOT_MEASURED) return null;
  return result.warn_triggered === 1 ? makeBanner('QUOTA_WARNING', QUOTA_BANNER_TEXT) : null;
}

/** The utilization ratio as a percent string, for the QA log. */
export function quotaRatioLabel(ratio: number | NotMeasured): string {
  return ratio === NOT_MEASURED ? 'chưa đo được' : (ratio * 100).toFixed(1) + '%';
}

/**
 * The P4b `persistenceWarning` string becomes a banner. An empty/absent warning
 * yields `null` so the caller can clear the queue slot unconditionally.
 */
export function persistenceBanner(warning: unknown): Banner | null {
  const message = text(warning).trim();
  if (message === '') return null;
  return makeBanner('WRITE_FAILED_UNKNOWN', message);
}

// ---------------------------------------------------------------------------
// 7. Customization panel: App draft shapes -> validator inputs
// ---------------------------------------------------------------------------

/**
 * The panel's 9 numeric inputs are strings. The GDD's D.3 validator demands all
 * 12 keys, so the 3 App-less stats are filled from the character's current
 * projection (they are never editable) and blanks fall back to the current
 * value - a blank must never silently become 0 (gdd-06 C4 D.3).
 */
export function baseStatDraftToGdd(
  draft: Record<string, unknown>,
  current: BaseStatMap,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of GDD_STAT_KEYS) {
    const appField = APP_TO_GDD_BASE_STAT[key];
    if (appField === null) {
      out[key] = current?.[key] ?? 0;
      continue;
    }
    const raw = draft?.[appField];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      out[key] = current?.[key];
      continue;
    }
    const value = Number(raw);
    out[key] = Number.isFinite(value)
      ? APP_PERCENT_STAT_FIELDS.includes(appField)
        ? value / 100
        : value
      : Number.NaN;
  }
  return out;
}

/**
 * The inverse of `baseStatDraftToGdd` for the 9 editable fields: what
 * `handleCustomizeBaseStats` actually writes back onto the App character.
 */
export function gddStatsToAppBaseFields(values: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of GDD_STAT_KEYS) {
    const appField = APP_TO_GDD_BASE_STAT[key];
    if (appField === null) continue;
    const value = Number(values?.[key]);
    if (!Number.isFinite(value)) continue;
    out[appField] = APP_PERCENT_STAT_FIELDS.includes(appField) ? value * 100 : value;
  }
  return out;
}

/** Turns a validation result's issues into one Vietnamese line for the zone. */
export function issuesToText(issues: readonly { message: string }[] | undefined): string {
  return (issues ?? []).map((issue) => issue.message).join(' ');
}
