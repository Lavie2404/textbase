/**
 * Character Card - the block assembler ("card build algorithm", gdd-06 B4).
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART B: Core Rule #3 fixed block order, B4 build algorithm, B6 edge cases,
 * AC-09/10/11/35/36/37/48), plan.md P6 (reduced) and decision C-6.
 *
 * WHAT THIS MODULE IS
 * A PURE function `(character, context) -> plain data`. It emits the six blocks
 * in the fixed order 1..6 with Vietnamese labels, already resolved through D.2
 * (`displayed_field`), D.3 (`exp_to_next`) and D.4 (`displayed_estimate`). A
 * React component renders the result and adds no logic of its own.
 *
 * DECISION C-6 (recorded deviation): Song Tu keeps the shipped app's own gate
 * (`affinity >= 80`, `handleSongTu` in App.tsx, out of scope). The card holds NO
 * threshold of its own - visibility comes from the INJECTED `showSongTuButton`
 * predicate, exactly as gdd-06 B2 #7 requires ("the card is a pure renderer of
 * NPC Affinity's state machine").
 *
 * Pure module: no React, no I/O, no RNG, no clock.
 */

import { UI_KNOBS, PERCENT_STAT_KEYS, type GddStatKey } from '../registry';
import { tierFromLevel } from '../math';
import {
  attitudeBand,
  attitudeDirection,
  type AttitudeDirection,
} from '../affinity/bands';
import type { AttitudeBand, CombatOutcomeType } from '../types';
import { expThreshold, type ExpThresholdFn, realmNameFromLevel } from '../exp/expThreshold';
import {
  COMBAT_STAT_FIELDS,
  DEFAULT_DISPLAY_FLAGS,
  IDENTITY_FIELDS,
  PROFILE_FIELDS,
  concealmentActive,
  displayedField,
  type CardCharacter,
  type CardField,
  type DisplayFlags,
  type DisplayedFieldResult,
} from './displayedField';
import {
  displayedEstimate,
  estimateLabel,
  type DisplayedEstimateResult,
  type EstimateDeps,
} from './displayedEstimate';
import { AWAITING_BREAKTHROUGH, expBarRatio, expToNext, type ExpToNextResult } from './expToNext';

// ---------------------------------------------------------------------------
// Block identity and labels
// ---------------------------------------------------------------------------

export type CardBlockId =
  | 'profile'
  | 'combat_stats'
  | 'equipment'
  | 'affinity'
  | 'combat_status'
  | 'status_badges';

/** gdd-06 B2 #3: ALWAYS this order, regardless of which blocks are included. */
export const CARD_BLOCK_ORDER: readonly CardBlockId[] = [
  'profile',
  'combat_stats',
  'equipment',
  'affinity',
  'combat_status',
  'status_badges',
];

export const CARD_BLOCK_LABELS: Record<CardBlockId, string> = {
  profile: 'Hồ sơ',
  combat_stats: 'Chỉ số chiến đấu',
  equipment: 'Trang bị & kỹ năng',
  affinity: 'Hảo cảm & Song Tu',
  combat_status: 'Diễn biến giao tranh',
  status_badges: 'Trạng thái vĩnh viễn',
};

export const CARD_FIELD_LABELS: Record<string, string> = {
  name: 'Tên',
  gender: 'Giới tính',
  than_phan: 'Thân phận',
  personality: 'Tính cách',
  appearance: 'Ngoại hình',
  backstory: 'Tiểu sử',
  level: 'Cấp',
  tier: 'Cảnh giới',
  HP: 'Sinh lực',
  ATK: 'Công kích',
  DEF: 'Phòng ngự',
  SPD: 'Tốc độ',
  CRIT_RATE: 'Tỉ lệ bạo kích',
  CRIT_DAMAGE: 'Sát thương bạo kích',
  ACC: 'Chính xác',
  EVASION: 'Né tránh',
  LIFESTEAL: 'Hút máu',
  HP_REGEN: 'Hồi phục',
  AMP: 'Khuếch đại sát thương',
  MITIGATION: 'Giảm sát thương',
};

// ---------------------------------------------------------------------------
// View shapes
// ---------------------------------------------------------------------------

export interface CardFieldView {
  key: string;
  label: string;
  kind: DisplayedFieldResult['kind'];
  value: unknown;
  /** Formatted, ready to print. */
  text: string;
  badge: string | null;
  true_value?: unknown;
  disguise_value?: unknown;
}

export interface ButtonView {
  /** Hidden entirely (not dimmed) when false - gdd-06 B4 "no ghost". */
  visible: boolean;
  enabled: boolean;
  label: string;
  /** Vietnamese, for tooltips / QA logs. Empty when enabled. */
  disabled_reasons: string[];
}

export interface ProfileBlock {
  id: 'profile';
  label: string;
  fields: CardFieldView[];
  /** NPC cards only: a short text summary from the SAME 7-band source as block 4. */
  attitude_summary: string | null;
  location: string | null;
}

export interface CombatStatsBlock {
  id: 'combat_stats';
  label: string;
  level: CardFieldView;
  tier: CardFieldView;
  realm_name: string | null;
  stats: CardFieldView[];
  estimate: DisplayedEstimateResult;
  estimate_text: string;
  /** Protagonist card only (AC-19); `null` on NPC cards. */
  exp: { to_next: ExpToNextResult; text: string; ratio: number } | null;
}

export interface EquipmentBlock {
  id: 'equipment';
  label: string;
  weapon_text: string;
  weapon_empty: boolean;
  skill_texts: string[];
  skills_empty: boolean;
  skills_empty_text: string | null;
}

export interface AffinityBlock {
  id: 'affinity';
  label: string;
  value: number;
  band: AttitudeBand;
  band_label: string;
  trend: AttitudeDirection;
  descriptor: string;
  song_tu_button: ButtonView;
}

export interface CombatStatusBlock {
  id: 'combat_status';
  label: string;
  exchange_id: number;
  self_hp: { current: number; max: number; steps: number };
  opponent_hp: { current: number; max: number; steps: number };
  outcome: CombatOutcomeType;
  outcome_text: string;
}

export interface StatusBadgesBlock {
  id: 'status_badges';
  label: string;
  badges: { code: string; label: string }[];
  recovery_button: ButtonView;
}

export interface CardBlocks {
  char_id: string;
  is_protagonist: boolean;
  /** Included block ids, always a subsequence of `CARD_BLOCK_ORDER`. */
  order: CardBlockId[];
  profile: ProfileBlock;
  combatStats: CombatStatsBlock;
  equipment: EquipmentBlock;
  affinity: AffinityBlock | null;
  combatStatus: CombatStatusBlock | null;
  statusBadges: StatusBadgesBlock | null;
  /** Short Vietnamese lines the UI may show as a header strip. */
  statusLines: string[];
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface CardBlocksContext {
  flags?: Partial<DisplayFlags>;
  /** `tm_state !== 'awaiting_action'` - dims both mutating buttons (AC-32). */
  tm_locked?: boolean;
  /** Combat lock; disables the buttons INDEPENDENTLY of `tm_locked` (AC-33). */
  in_combat?: boolean;
  alive?: boolean;
  death_and_consequence_blocked?: boolean;
  equipment?: {
    weapon_name?: string | null;
    skill_names?: readonly string[];
  };
  affinity?: {
    /** Last locked value. Falls back to `character.affinity`. */
    value?: number;
    /** Value before this turn's delta, for the trend arrow. */
    previous?: number;
  };
  /**
   * DECISION C-6: the card holds no threshold. The owning system (App.tsx
   * `handleSongTu`, affinity >= 80) decides; the card only renders.
   */
  showSongTuButton?: (c: CardCharacter) => boolean;
  /** Death & Consequence supplies these; an empty list hides the button (B6). */
  recoveryChoices?: readonly { id: string; label: string }[];
  combat?: {
    exchange_id: number;
    self_hp: { current: number; max: number };
    opponent_hp: { current: number; max: number };
    outcome: CombatOutcomeType;
  } | null;
  estimateDeps?: EstimateDeps;
  expThresholdFn?: ExpThresholdFn;
  realmNames?: readonly string[] | null;
  /** Discrete HP steps of block 5 (gdd-06 B2 #3). */
  hpSteps?: number;
}

const DEFAULT_HP_STEPS = 10;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function isPercentStat(key: string): boolean {
  return (PERCENT_STAT_KEYS as readonly string[]).includes(key);
}

/** gdd-06 B5 `stat_display_precision`: integers, 1 decimal for percentage stats. */
export function formatStatValue(key: string, value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
  if (isPercentStat(key)) return (value * 100).toFixed(1) + '%';
  const precision = UI_KNOBS.stat_display_precision;
  return precision > 0 ? value.toFixed(precision) : String(Math.round(value));
}

function fieldView(
  key: string,
  result: DisplayedFieldResult,
  formatter?: (value: unknown) => string,
): CardFieldView {
  const label = CARD_FIELD_LABELS[key] ?? key;
  const format = formatter ?? ((v: unknown) => (v === null || v === undefined ? '' : String(v)));
  let text: string;
  if (result.kind === 'unknown') {
    text = String(result.value);
  } else if (result.kind === 'dual_identity') {
    text = format(result.disguise_value) + ' (thật: ' + format(result.true_value) + ')';
  } else {
    text = format(result.value);
  }
  return {
    key,
    label,
    kind: result.kind,
    value: result.value,
    text,
    badge: result.badge,
    ...(result.kind === 'dual_identity'
      ? { true_value: result.true_value, disguise_value: result.disguise_value }
      : {}),
  };
}

function makeField(
  c: CardCharacter,
  field: CardField,
  flags: DisplayFlags,
  formatter?: (value: unknown) => string,
): CardFieldView {
  return fieldView(field, displayedField(c, field, flags), formatter);
}

function hpSteps(current: number, max: number, steps: number): number {
  if (!(max > 0) || !Number.isFinite(current)) return 0;
  const ratio = current / max;
  const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
  return Math.round(clamped * steps);
}

const OUTCOME_TEXT: Record<CombatOutcomeType, string> = {
  win: 'Đang chiếm ưu thế',
  loss: 'Đang lép vế',
  draw: 'Giằng co',
  flee: 'Đang tháo chạy',
  none: 'Chưa ngã ngũ',
};

// ---------------------------------------------------------------------------
// The build algorithm
// ---------------------------------------------------------------------------

/**
 * gdd-06 B4 "Card build algorithm": given (char, flags) emit blocks in fixed
 * order; block 2 always (EXP element only for the protagonist); block 4 only for
 * NPCs; block 5 only when `in_combat` AND `alive`; block 6 when `alive=false` or
 * `blocked=true`; the Recovery button only when Death & Consequence supplied
 * valid choices; the Song Tu button only when the owning system says so.
 *
 * D.2 is evaluated ONCE here, as a snapshot for the whole card - nothing patches
 * individual fields mid-open (gdd-06 B6).
 */
export function buildCardBlocks(c: CardCharacter, ctx: CardBlocksContext = {}): CardBlocks {
  const flags: DisplayFlags = { ...DEFAULT_DISPLAY_FLAGS, ...(ctx.flags ?? {}) };
  const isProtagonist = c.is_player === true;
  const alive = ctx.alive ?? c.alive ?? true;
  const inCombat = ctx.in_combat === true;
  const blocked = ctx.death_and_consequence_blocked === true;
  const tmLocked = ctx.tm_locked === true;
  const thresholdFn = ctx.expThresholdFn ?? expThreshold;

  // ------------------------------------------------------------------ block 1
  const affinityValue = ctx.affinity?.value ?? c.affinity ?? 0;
  const previousAffinity = ctx.affinity?.previous ?? affinityValue;
  const band = attitudeBand(affinityValue);
  const trend = attitudeDirection(previousAffinity, affinityValue);

  const profile: ProfileBlock = {
    id: 'profile',
    label: CARD_BLOCK_LABELS.profile,
    fields: [
      ...IDENTITY_FIELDS.map((field) => makeField(c, field, flags)),
      ...PROFILE_FIELDS.map((field) => makeField(c, field, flags)),
    ],
    attitude_summary: isProtagonist ? null : band,
    location: c.location ?? null,
  };

  // ------------------------------------------------------------------ block 2
  const level = makeField(c, 'level', flags);
  const tier = makeField(c, 'tier', flags);
  const estimate = displayedEstimate(c, flags, ctx.estimateDeps);
  const expValue: ExpToNextResult | null = isProtagonist
    ? expToNext({ level: c.level, current_exp: c.current_exp }, thresholdFn)
    : null;

  const combatStats: CombatStatsBlock = {
    id: 'combat_stats',
    label: CARD_BLOCK_LABELS.combat_stats,
    level,
    tier,
    realm_name:
      tier.kind === 'unknown' ? null : realmNameFromLevel(c.level, ctx.realmNames ?? null),
    stats: COMBAT_STAT_FIELDS.map((stat: GddStatKey) =>
      makeField(c, stat, flags, (value) => formatStatValue(stat, value)),
    ),
    estimate,
    estimate_text: estimateLabel(estimate),
    exp:
      expValue === null
        ? null
        : {
            to_next: expValue,
            text:
              expValue === AWAITING_BREAKTHROUGH
                ? AWAITING_BREAKTHROUGH
                : 'còn ' +
                  (Number.isInteger(expValue) ? String(expValue) : expValue.toFixed(1)) +
                  ' EXP tới cấp kế',
            ratio: expBarRatio({ level: c.level, current_exp: c.current_exp }, thresholdFn),
          },
  };

  // ------------------------------------------------------------------ block 3
  const weaponName = ctx.equipment?.weapon_name ?? null;
  const skillNames = ctx.equipment?.skill_names ?? [];
  const equipment: EquipmentBlock = {
    id: 'equipment',
    label: CARD_BLOCK_LABELS.equipment,
    weapon_text: weaponName && weaponName.length > 0 ? weaponName : 'tay không',
    weapon_empty: !(weaponName && weaponName.length > 0),
    skill_texts: [...skillNames],
    skills_empty: skillNames.length === 0,
    skills_empty_text: skillNames.length === 0 ? 'chưa học kỹ năng' : null,
  };

  // ------------------------------------------------------------------ block 4
  let affinity: AffinityBlock | null = null;
  if (!isProtagonist) {
    const songTuVisible = alive && (ctx.showSongTuButton?.(c) ?? false);
    const songTuReasons: string[] = [];
    if (tmLocked) songTuReasons.push('Thế giới đang viết tiếp');
    if (inCombat) songTuReasons.push('Đang trong giao tranh');
    affinity = {
      id: 'affinity',
      label: CARD_BLOCK_LABELS.affinity,
      value: affinityValue,
      band,
      band_label: band,
      trend,
      descriptor: trend === 'không đổi' ? band : band + ', ' + trend,
      song_tu_button: {
        visible: songTuVisible,
        enabled: songTuVisible && songTuReasons.length === 0,
        label: 'Song Tu',
        disabled_reasons: songTuVisible ? songTuReasons : [],
      },
    };
  }

  // ------------------------------------------------------------------ block 5
  // gdd-06 B6: NO block 5 for a dead character even if `in_combat=true`.
  let combatStatus: CombatStatusBlock | null = null;
  if (inCombat && alive && ctx.combat) {
    const steps = ctx.hpSteps ?? DEFAULT_HP_STEPS;
    combatStatus = {
      id: 'combat_status',
      label: CARD_BLOCK_LABELS.combat_status,
      exchange_id: ctx.combat.exchange_id,
      self_hp: {
        ...ctx.combat.self_hp,
        steps: hpSteps(ctx.combat.self_hp.current, ctx.combat.self_hp.max, steps),
      },
      opponent_hp: {
        ...ctx.combat.opponent_hp,
        steps: hpSteps(ctx.combat.opponent_hp.current, ctx.combat.opponent_hp.max, steps),
      },
      outcome: ctx.combat.outcome,
      outcome_text: OUTCOME_TEXT[ctx.combat.outcome] ?? OUTCOME_TEXT.none,
    };
  }

  // ------------------------------------------------------------------ block 6
  let statusBadges: StatusBadgesBlock | null = null;
  if (!alive || blocked) {
    const badges: { code: string; label: string }[] = [];
    if (!alive) badges.push({ code: 'dead', label: 'Đã tử vong' });
    if (blocked) badges.push({ code: 'crippled', label: 'Phế đan điền' });
    const choices = ctx.recoveryChoices ?? [];
    // B6: a dead character shows no interactive element at all; an NPC with a
    // severe consequence shows the badge but gets no Recovery button unless the
    // owning system supplied choices.
    const recoveryVisible = alive && blocked && choices.length > 0;
    const recoveryReasons: string[] = [];
    if (tmLocked) recoveryReasons.push('Thế giới đang viết tiếp');
    if (inCombat) recoveryReasons.push('Đang trong giao tranh');
    statusBadges = {
      id: 'status_badges',
      label: CARD_BLOCK_LABELS.status_badges,
      badges,
      recovery_button: {
        visible: recoveryVisible,
        enabled: recoveryVisible && recoveryReasons.length === 0,
        label: 'Trị liệu',
        disabled_reasons: recoveryVisible ? recoveryReasons : [],
      },
    };
  }

  // ------------------------------------------------------------------ assembly
  const included: CardBlockId[] = CARD_BLOCK_ORDER.filter((id) => {
    if (id === 'affinity') return affinity !== null;
    if (id === 'combat_status') return combatStatus !== null;
    if (id === 'status_badges') return statusBadges !== null;
    return true;
  });

  const statusLines: string[] = [];
  if (!alive) statusLines.push('Đã tử vong');
  if (blocked) statusLines.push('Phế đan điền');
  if (concealmentActive(c, flags)) statusLines.push('Đang che giấu thân phận');
  if (isProtagonist && combatStats.exp?.to_next === AWAITING_BREAKTHROUGH) {
    statusLines.push('Chờ Đột Phá');
  }

  return {
    char_id: c.char_id,
    is_protagonist: isProtagonist,
    order: included,
    profile,
    combatStats,
    equipment,
    affinity,
    combatStatus,
    statusBadges,
    statusLines,
  };
}

/**
 * D.1 `card_exists(char_id)` = OR over all turns of
 * `[char_id in entities_appearing(t) AND confirmed(t) AND NOT undone(t)]`.
 * Boolean, no sentinel; permanently true once satisfied, including after death.
 */
export function cardExists(
  charId: string,
  turns: readonly { entities: readonly string[]; confirmed: boolean; undone: boolean }[],
): boolean {
  return (turns ?? []).some(
    (t) => t.confirmed === true && t.undone !== true && t.entities.includes(charId),
  );
}

/** Derived tier display, shared with the customization panel (never stored). */
export function displayTier(level: number): number {
  return tierFromLevel(level);
}
