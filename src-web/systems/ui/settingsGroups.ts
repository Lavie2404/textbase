/**
 * Settings composition - the 4 groups of plan.md decision C-3, as DATA.
 *
 * Design docs: production/gdd-integration/plan.md decision C-3,
 * gdd-06-ui-card-customization.md (PART A Core Rule #11, PART C Core Rule #1),
 * app-map.md section (k).
 *
 * DECISION C-3 (recorded deviation from gdd-06 A2 #11): the GDD specifies
 * exactly 2 MVP groups (Co chu, Cau hinh AI) plus #16's third group. The shipped
 * app already carries ~12 settings players use (BGM, theme, playStyle, saves,
 * exports, gallery, cache, HTAB debug); cutting them is a feature regression, so
 * C-3 keeps EVERY existing feature and regroups them into 4 groups:
 *
 *   1. Hien thi        - display
 *   2. Am thanh        - audio
 *   3. AI & Du lieu    - AI config + every save/load/export/data action
 *   4. Tuy chinh nhan vat - the hack-mode toggle (default OFF) and its entry
 *
 * This module is pure data + lookups. It renders nothing and performs no action;
 * `SettingsMenu` maps `item.id` to its existing handler.
 */

import { HACK_KNOBS } from '../registry';

export type SettingsGroupId = 'display' | 'audio' | 'ai_data' | 'customize';

export interface SettingsGroup {
  id: SettingsGroupId;
  /** Player-facing (Vietnamese). */
  label: string;
  /** Render order within the settings overlay. */
  order: number;
}

/** Exactly 4 groups (C-3). */
export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  { id: 'display', label: 'Hiển thị', order: 1 },
  { id: 'audio', label: 'Âm thanh', order: 2 },
  { id: 'ai_data', label: 'AI & Dữ liệu', order: 3 },
  { id: 'customize', label: 'Tùy chỉnh nhân vật', order: 4 },
];

export type SettingsItemKind = 'toggle' | 'slider' | 'select' | 'action' | 'field';

export interface SettingsItem {
  id: string;
  /** Player-facing (Vietnamese). */
  label: string;
  group: SettingsGroupId;
  kind: SettingsItemKind;
  /** Default value for toggles/sliders/selects. `undefined` for actions. */
  default?: unknown;
  /** True for items introduced by the GDD integration (not in App.tsx today). */
  is_new?: boolean;
  /** Short Vietnamese helper line, optional. */
  hint?: string;
}

/**
 * Every item of the shipped `SettingsMenu` (App.tsx :7959) and `ApiSetupModal`
 * (:5385), plus the new items required by the integration plan.
 */
export const SETTINGS_ITEMS: readonly SettingsItem[] = [
  // -------------------------------------------------------------- Hien thi
  {
    id: 'font_size_preset',
    label: 'Cỡ chữ',
    group: 'display',
    kind: 'select',
    default: 'M',
    hint: 'Ba mức: Nhỏ / Vừa / Lớn',
  },
  {
    id: 'text_scale_advanced',
    label: 'Cỡ chữ nâng cao',
    group: 'display',
    kind: 'slider',
    default: 100,
    hint: 'Thanh trượt 90–140%',
  },
  { id: 'ui_theme', label: 'Giao diện', group: 'display', kind: 'select', default: 'default' },
  { id: 'theme_editor', label: 'Tùy chỉnh giao diện', group: 'display', kind: 'action' },
  {
    id: 'play_style',
    label: 'Lối chơi',
    group: 'display',
    kind: 'select',
    default: 'RPG',
    hint: 'Nhập vai (RPG) hoặc Kể chuyện (STORY)',
  },
  // -------------------------------------------------------------- Am thanh
  { id: 'bgm_enabled', label: 'Nhạc nền', group: 'audio', kind: 'toggle', default: true },
  { id: 'bgm_volume', label: 'Âm lượng nhạc nền', group: 'audio', kind: 'slider', default: 50 },
  // ---------------------------------------------------------- AI & Du lieu
  { id: 'api_mode', label: 'Chế độ API', group: 'ai_data', kind: 'select', default: 'defaultGemini' },
  { id: 'api_key', label: 'Khóa API Gemini', group: 'ai_data', kind: 'field' },
  { id: 'allow_nsfw', label: 'Nội dung người lớn', group: 'ai_data', kind: 'toggle', default: false },
  {
    id: 'github_backup',
    label: 'Sao lưu lên GitHub',
    group: 'ai_data',
    kind: 'action',
    is_new: true,
    hint: 'Đổi nhãn từ "Lưu Ngay" (quyết định C-2): đây là kênh sao lưu, không phải nguồn chân lý',
  },
  { id: 'cloud_save', label: 'Lưu Đám Mây', group: 'ai_data', kind: 'action' },
  { id: 'load_game', label: 'Tải Game', group: 'ai_data', kind: 'action' },
  { id: 'export_file_full', label: 'Xuất Tệp Đầy Đủ', group: 'ai_data', kind: 'action' },
  { id: 'export_file_light', label: 'Xuất Tệp Nhẹ', group: 'ai_data', kind: 'action' },
  { id: 'import_file', label: 'Nhập Tệp', group: 'ai_data', kind: 'action' },
  {
    id: 'export_keepsake',
    label: 'Xuất kỷ vật',
    group: 'ai_data',
    kind: 'action',
    is_new: true,
    hint: 'Bản chép tay thuần văn bản của quyển sổ',
  },
  {
    id: 'export_qa_log',
    label: 'Xuất nhật ký QA',
    group: 'ai_data',
    kind: 'action',
    is_new: true,
  },
  {
    id: 'contract_log',
    label: 'Nhật ký khế ước',
    group: 'ai_data',
    kind: 'action',
    is_new: true,
    hint: 'Nhật ký rò rỉ số của lớp Contract Enforcement',
  },
  { id: 'gallery', label: 'Thư viện ảnh', group: 'ai_data', kind: 'action' },
  { id: 'cache_manager', label: 'Quản lý bộ nhớ đệm', group: 'ai_data', kind: 'action' },
  { id: 'htab_debug', label: 'Gỡ lỗi HTAB', group: 'ai_data', kind: 'toggle', default: false },
  // ------------------------------------------------- Tuy chinh nhan vat
  {
    id: 'hack_mode_toggle',
    label: 'Tùy chỉnh nhân vật',
    group: 'customize',
    kind: 'toggle',
    default: HACK_KNOBS.hack_mode_toggle_default,
    is_new: true,
    hint: 'Mặc định TẮT. Bật để hiện nút mở bảng tùy chỉnh trong màn chơi.',
  },
  {
    id: 'open_customize',
    label: 'Mở bảng tùy chỉnh',
    group: 'customize',
    kind: 'action',
    is_new: true,
    hint: 'Chỉ hiện khi công tắc đang bật và đang ở màn chơi',
  },
];

const ITEM_INDEX: Map<string, SettingsItem> = new Map(
  SETTINGS_ITEMS.map((item) => [item.id, item]),
);

export function findSettingsItem(id: string): SettingsItem | null {
  return ITEM_INDEX.get(id) ?? null;
}

export function itemsByGroup(group: SettingsGroupId): SettingsItem[] {
  return SETTINGS_ITEMS.filter((item) => item.group === group);
}

export interface GroupedSettings {
  group: SettingsGroup;
  items: SettingsItem[];
}

/** Groups in render order, each with its items in declaration order. */
export function groupedSettings(): GroupedSettings[] {
  return [...SETTINGS_GROUPS]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({ group, items: itemsByGroup(group.id) }));
}

/** The hack-mode toggle's default, read from the registry (never re-literalled). */
export const HACK_MODE_TOGGLE_DEFAULT = HACK_KNOBS.hack_mode_toggle_default;

export interface SettingsIntegrityReport {
  ok: boolean;
  duplicate_ids: string[];
  unknown_groups: string[];
  empty_groups: SettingsGroupId[];
}

/** Structural self-check; a unit test asserts `ok`. */
export function checkSettingsIntegrity(): SettingsIntegrityReport {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const knownGroups = new Set<string>(SETTINGS_GROUPS.map((g) => g.id));
  const unknownGroups: string[] = [];

  for (const item of SETTINGS_ITEMS) {
    if (seen.has(item.id)) duplicates.push(item.id);
    seen.add(item.id);
    if (!knownGroups.has(item.group)) unknownGroups.push(item.group);
  }
  const emptyGroups = SETTINGS_GROUPS.filter((g) => itemsByGroup(g.id).length === 0).map(
    (g) => g.id,
  );

  return {
    ok: duplicates.length === 0 && unknownGroups.length === 0 && emptyGroups.length === 0,
    duplicate_ids: duplicates,
    unknown_groups: unknownGroups,
    empty_groups: emptyGroups,
  };
}
