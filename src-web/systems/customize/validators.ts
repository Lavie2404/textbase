/**
 * Character Customization Mode ("Tùy Chỉnh (hack)") - D.1..D.5 validators.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART C: Core Rules #1..#11, C4 D.1/D.2/D.2b/D.3/D.4/D.5, C6 edge cases,
 * AC-01/06/09/10/11/12..16/25/26/35/37/38/39/47), plan.md P6 (reduced).
 *
 * Every function here is TOTAL and PURE: no I/O, no clock, no RNG. Errors come
 * back as structured issues with Vietnamese messages the panel prints inside
 * the failing zone; nothing throws.
 *
 * KEY NAMING (recorded deviation): gdd-06 C3 lists the 12 stat keys as
 * `{HP, ATK, DEF, SPD, ACC, Ne, CritRate, CritDamage, Amp, Mitigation,
 * Lifesteal, HPRegen}`. This project froze the same 12 stats in
 * `registry.GDD_STAT_KEYS` during P0 (`CRIT_RATE`, `HP_REGEN`, ...), and
 * `statGrowth`/`baseStatCompleteness` already use them. The validator compares
 * KEYS, so one spelling must win: the registry's does, and the panel's inputs
 * are keyed by it. Vietnamese labels remain a UI concern.
 */

import { EQUIPMENT_KNOBS, GDD_STAT_KEYS, HACK_KNOBS, type GddStatKey } from '../registry';
import { expThreshold, type ExpThresholdFn } from '../exp/expThreshold';
import { tierFromLevel } from '../math';
import type { ProgressionState } from '../types';
import type { AppScreen } from '../ui/screenTransition';
import type { TmState } from '../ui/writeActionAllowed';

// ---------------------------------------------------------------------------
// Shared result shapes
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  code: string;
  /** Player-facing (Vietnamese). */
  message: string;
  /** Field / stat key / entry id the issue belongs to, when applicable. */
  field?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  /** Non-blocking notices (gdd-06 C6: over-6 skills, under-3 thuc). */
  warnings: ValidationIssue[];
}

export function validationOk(warnings: ValidationIssue[] = []): ValidationResult {
  return { ok: true, errors: [], warnings };
}

export function validationFail(
  errors: ValidationIssue[],
  warnings: ValidationIssue[] = [],
): ValidationResult {
  return { ok: false, errors, warnings };
}

// ---------------------------------------------------------------------------
// D.1 - panel availability
// ---------------------------------------------------------------------------

export interface CustomizeAvailabilityContext {
  toggle_enabled: boolean;
  screen: AppScreen;
  tm_state: TmState;
  in_combat: boolean;
  is_death_turn: boolean;
}

/**
 * D.1: `toggle_enabled AND screen = S2 AND tm_state = awaiting_action
 *       AND NOT in_combat AND NOT is_death_turn`.
 *
 * The app's S2 is `gameplay` (see `ui/screenTransition.ts` mapping note).
 */
export function customizePanelAvailable(ctx: CustomizeAvailabilityContext): boolean {
  return (
    ctx.toggle_enabled === true &&
    ctx.screen === 'gameplay' &&
    ctx.tm_state === 'awaiting_action' &&
    ctx.in_combat !== true &&
    ctx.is_death_turn !== true
  );
}

export type CustomizeButtonVisibility = 'hidden' | 'dimmed' | 'enabled';

/**
 * gdd-06 C2 #2: the O-Set entry button is HIDDEN when the toggle is off, when
 * the player is not on the play screen, or on a death turn; it is DIMMED (0.38)
 * while the AI is writing or during combat. Hidden and dimmed are two different
 * mechanisms and must not collapse.
 */
export function customizeButtonVisibility(
  ctx: CustomizeAvailabilityContext,
): CustomizeButtonVisibility {
  if (ctx.toggle_enabled !== true) return 'hidden';
  if (ctx.screen !== 'gameplay') return 'hidden';
  if (ctx.is_death_turn === true) return 'hidden';
  if (ctx.tm_state !== 'awaiting_action') return 'dimmed';
  if (ctx.in_combat === true) return 'dimmed';
  return 'enabled';
}

/**
 * D.1 defensive path: if `in_combat` flips true while the panel is open the
 * predicate re-evaluates false and the panel FORCE-CLOSES (not merely disables),
 * discarding the draft with no warning.
 */
export function shouldForceClosePanel(
  panelOpen: boolean,
  ctx: CustomizeAvailabilityContext,
): boolean {
  return panelOpen === true && !customizePanelAvailable(ctx);
}

// ---------------------------------------------------------------------------
// D.2 / D.2b - the atomic progress triple
// ---------------------------------------------------------------------------

export const PROGRESSION_STATES: readonly ProgressionState[] = ['Tu Luyện Thường', 'Chờ Đột Phá'];

/**
 * D.2: `is_int(level) AND level >= 1 AND level <= LEVEL_WRITE_MAX`.
 * `0` fails (it would make `tier_from_level(0) = 0`); `3.5` fails - fail fast,
 * never silently round; `Infinity`/`NaN`/strings fail.
 */
export function isValidLevelWrite(level: unknown, max: number = HACK_KNOBS.LEVEL_WRITE_MAX): boolean {
  return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= max;
}

export interface ProgressDraft {
  level: unknown;
  /** `undefined` = the player entered nothing; see `applyProgressDefaults`. */
  current_exp?: unknown;
  state?: ProgressionState | null;
}

export interface ProgressWrite {
  level: number;
  current_exp: number;
  state: ProgressionState;
}

export interface ProgressContext {
  /** Re-read on EVERY Save press - the panel stays open and saves repeatedly. */
  old_level: number;
  old_current_exp: number;
  old_state: ProgressionState;
  thresholdFn?: ExpThresholdFn;
}

/**
 * Default-fill semantics applied BEFORE validation (gdd-06 C4 D.2b):
 * no `current_exp` entered -> `0` if the level changed, else keep the current
 * value; no `state` chosen -> `"Tu Luyện Thường"` if the level changed, else
 * keep. This is the no-op gate: re-submitting the current level must NOT wipe
 * accumulated EXP or an existing "Chờ Đột Phá".
 */
export function applyProgressDefaults(
  draft: ProgressDraft,
  ctx: ProgressContext,
): { level: unknown; current_exp: unknown; state: ProgressionState } {
  const levelChanged = draft.level !== ctx.old_level;
  const expProvided = draft.current_exp !== undefined && draft.current_exp !== null && draft.current_exp !== '';
  const stateProvided = draft.state === 'Tu Luyện Thường' || draft.state === 'Chờ Đột Phá';

  return {
    level: draft.level,
    current_exp: expProvided ? draft.current_exp : levelChanged ? 0 : ctx.old_current_exp,
    state: stateProvided ? (draft.state as ProgressionState) : levelChanged ? 'Tu Luyện Thường' : ctx.old_state,
  };
}

/**
 * D.2b. All seven conjuncts, in the GDD's order:
 *
 *   is_valid_level_write(level)
 *   AND state in {Tu Luyen Thuong, Cho Dot Pha}
 *   AND is_finite(current_exp) AND current_exp >= 0
 *   AND (level mod 10 != 0  => current_exp <  exp_threshold(level))     STRICT
 *   AND (level mod 10 == 0  => (current_exp == threshold <=> state = Cho Dot Pha))
 *   AND (level mod 10 != 0  => state = Tu Luyen Thuong)                 no ghost breakthrough
 *   AND (level mod 10 == 0  => current_exp <= exp_threshold(level))     absolute cap
 */
export function isValidProgressWrite(
  values: { level: unknown; current_exp: unknown; state: unknown },
  ctx: Pick<ProgressContext, 'thresholdFn'> = {},
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const thresholdFn = ctx.thresholdFn ?? expThreshold;
  const { level, current_exp: exp, state } = values;

  if (!isValidLevelWrite(level)) {
    errors.push({
      code: 'level_invalid',
      field: 'level',
      message:
        'Cấp phải là số nguyên từ 1 đến ' + HACK_KNOBS.LEVEL_WRITE_MAX.toLocaleString('vi-VN') + '.',
    });
  }
  if (state !== 'Tu Luyện Thường' && state !== 'Chờ Đột Phá') {
    errors.push({
      code: 'state_invalid',
      field: 'state',
      message: 'Trạng thái tu luyện không hợp lệ.',
    });
  }
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp < 0) {
    errors.push({
      code: 'exp_invalid',
      field: 'current_exp',
      message: 'EXP hiện tại phải là số hữu hạn không âm.',
    });
  }
  if (errors.length > 0) return validationFail(errors);

  const lvl = level as number;
  const currentExp = exp as number;
  const threshold = thresholdFn(lvl);
  const roundLevel = lvl % 10 === 0;

  if (!roundLevel) {
    if (!(currentExp < threshold)) {
      errors.push({
        code: 'exp_above_threshold',
        field: 'current_exp',
        message: 'EXP phải nhỏ hơn ngưỡng của cấp ' + lvl + ' (' + threshold + ').',
      });
    }
    if (state !== 'Tu Luyện Thường') {
      errors.push({
        code: 'ghost_breakthrough',
        field: 'state',
        message: 'Chỉ cấp chia hết cho 10 mới được ở trạng thái "Chờ Đột Phá".',
      });
    }
  } else {
    if (currentExp > threshold) {
      errors.push({
        code: 'exp_above_cap',
        field: 'current_exp',
        message: 'EXP không được vượt ngưỡng của cấp ' + lvl + ' (' + threshold + ').',
      });
    }
    const atThreshold = currentExp === threshold;
    const awaiting = state === 'Chờ Đột Phá';
    if (atThreshold !== awaiting) {
      errors.push({
        code: 'breakthrough_mismatch',
        field: 'state',
        message: atThreshold
          ? 'EXP đã đầy ở cấp đột phá — trạng thái phải là "Chờ Đột Phá".'
          : 'Trạng thái "Chờ Đột Phá" chỉ hợp lệ khi EXP đúng bằng ngưỡng.',
      });
    }
  }

  return errors.length === 0 ? validationOk() : validationFail(errors);
}

/** Full zone-1 pipeline: defaults -> validation -> the write payload. */
export function validateProgressZone(
  draft: ProgressDraft,
  ctx: ProgressContext,
): ValidationResult & { write: ProgressWrite | null; is_noop: boolean } {
  const filled = applyProgressDefaults(draft, ctx);
  const result = isValidProgressWrite(filled, ctx);
  const isNoop =
    filled.level === ctx.old_level &&
    filled.current_exp === ctx.old_current_exp &&
    filled.state === ctx.old_state;

  return {
    ...result,
    is_noop: isNoop,
    write: result.ok
      ? {
          level: filled.level as number,
          current_exp: filled.current_exp as number,
          state: filled.state,
        }
      : null,
  };
}

/** gdd-06 C2 #4 / AC-07: `tier` is DERIVED; no tier field exists in the panel. */
export function derivedTier(level: number): number {
  return tierFromLevel(level);
}

// ---------------------------------------------------------------------------
// D.3 - the 12 base stats
// ---------------------------------------------------------------------------

export const STAT_FIELDS_12: readonly GddStatKey[] = GDD_STAT_KEYS;

export type BaseStatDraft = Record<string, unknown>;

/**
 * Mandatory parse rule (gdd-06 C4 D.3): an empty raw UI input maps to
 * `undefined`, NEVER `0.0` - otherwise "left blank" and "deliberately zero"
 * become indistinguishable.
 */
export function parseStatInput(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }
  if (typeof raw === 'number') return raw;
  return Number.NaN;
}

/** Applies `parseStatInput` to a whole raw draft map. */
export function parseStatDraft(raw: Record<string, unknown>): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (const key of Object.keys(raw ?? {})) out[key] = parseStatInput(raw[key]);
  return out;
}

/**
 * D.3:
 *   keys(map) == STAT_FIELDS_12            EQUALITY - a stray key fails
 *   AND for each X: numeric AND finite AND <= STAT_WRITE_MAX
 *   AND map[HP] > 0
 *   AND for each X != HP: map[X] >= 0
 *
 * Percentage stats above `PERCENT_STAT_CAP` are NOT blocked here (clamping is
 * read-time and owned by EXP). Large-but-finite values are legal by design.
 */
export function isValidBaseStatSet(
  map: BaseStatDraft | null | undefined,
  max: number = HACK_KNOBS.STAT_WRITE_MAX,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const source = (map ?? {}) as Record<string, unknown>;
  const provided = Object.keys(source);
  const expected = new Set<string>(STAT_FIELDS_12 as readonly string[]);

  const extra = provided.filter((key) => !expected.has(key));
  for (const key of extra) {
    errors.push({
      code: 'unknown_stat_key',
      field: key,
      message: 'Khóa chỉ số không hợp lệ: ' + key + '.',
    });
  }

  for (const stat of STAT_FIELDS_12) {
    const value = source[stat];
    if (value === undefined || value === null) {
      errors.push({
        code: 'stat_missing',
        field: stat,
        message: 'Thiếu chỉ số ' + stat + ' — phải nhập đủ 12 chỉ số trong cùng một lần lưu.',
      });
      continue;
    }
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      errors.push({
        code: 'stat_not_finite',
        field: stat,
        message: 'Chỉ số ' + stat + ' phải là số hữu hạn.',
      });
      continue;
    }
    if (value > max) {
      errors.push({
        code: 'stat_above_max',
        field: stat,
        message: 'Chỉ số ' + stat + ' vượt trần kỹ thuật ' + max.toLocaleString('vi-VN') + '.',
      });
      continue;
    }
    if (stat === 'HP') {
      if (!(value > 0)) {
        errors.push({
          code: 'hp_not_positive',
          field: stat,
          message: 'Sinh lực gốc phải lớn hơn 0.',
        });
      }
      continue;
    }
    if (value < 0) {
      errors.push({
        code: 'stat_negative',
        field: stat,
        message: 'Chỉ số ' + stat + ' không được âm.',
      });
    }
  }

  return errors.length === 0 ? validationOk() : validationFail(errors);
}

// ---------------------------------------------------------------------------
// D.4 - custom ids, item and skill creation
// ---------------------------------------------------------------------------

export type IdNamespace = 'item' | 'skill' | 'thuc';
export const ID_NAMESPACES: readonly IdNamespace[] = ['item', 'skill', 'thuc'];

export type ExistingIds = Record<IdNamespace, ReadonlySet<string> | readonly string[]>;

function idSet(existing: ExistingIds, namespace: IdNamespace): Set<string> {
  const raw = existing?.[namespace];
  if (!raw) return new Set<string>();
  return raw instanceof Set ? new Set(raw) : new Set(raw as readonly string[]);
}

/**
 * D.4: `non_empty(new_id) AND new_id NOT IN existing_id_set`, with three
 * separate namespaces and CASE-SENSITIVE comparison. Custom entries share the
 * ID namespace with original content (no prefix); a collision BLOCKS the submit
 * and demands a manual rename - the system never auto-renames.
 */
export function isValidCustomId(
  newId: unknown,
  namespace: IdNamespace,
  existing: ExistingIds,
): ValidationResult {
  if (typeof newId !== 'string' || newId.length === 0) {
    return validationFail([
      { code: 'id_empty', field: 'id', message: 'Mã định danh không được để trống.' },
    ]);
  }
  if (idSet(existing, namespace).has(newId)) {
    return validationFail([
      {
        code: 'id_collision',
        field: 'id',
        message: 'Mã "' + newId + '" đã tồn tại trong nhóm ' + namespace + '. Hãy đổi tên thủ công.',
      },
    ]);
  }
  return validationOk();
}

export interface SkillSubmitDraft {
  skill_id: unknown;
  thuc_ids: readonly unknown[];
  /** Optional: how many skills the character already knows (warning only). */
  known_skill_count?: number;
}

/**
 * D.4 cardinality gate. Later calls in the SAME batch must see earlier accepted
 * ids, so two new thuc cannot collide with each other (AC-13: N+1 validator
 * calls). `len(thuc_ids) >= 1` is a BLOCK; fewer than `min_thuc_per_skill` is a
 * warning only (gdd-06 C6).
 */
export function isValidSkillSubmit(
  draft: SkillSubmitDraft,
  existing: ExistingIds,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const skillIdResult = isValidCustomId(draft.skill_id, 'skill', existing);
  errors.push(...skillIdResult.errors);

  const thucIds = draft.thuc_ids ?? [];
  if (thucIds.length < 1) {
    errors.push({
      code: 'skill_without_thuc',
      field: 'thuc_ids',
      message: 'Kỹ năng phải có ít nhất 1 thức trong cùng lần lưu.',
    });
  } else if (thucIds.length < EQUIPMENT_KNOBS.min_thuc_per_skill) {
    warnings.push({
      code: 'thuc_below_recommended',
      field: 'thuc_ids',
      message:
        'Kỹ năng có ít hơn ' +
        EQUIPMENT_KNOBS.min_thuc_per_skill +
        ' thức — AI có thể kể thiếu biến hóa.',
    });
  }

  const accepted = idSet(existing, 'thuc');
  thucIds.forEach((thucId, index) => {
    const result = isValidCustomId(thucId, 'thuc', { ...existing, thuc: accepted });
    if (!result.ok) {
      errors.push(
        ...result.errors.map((issue) => ({ ...issue, field: 'thuc_ids[' + index + ']' })),
      );
      return;
    }
    accepted.add(thucId as string);
  });

  if (
    typeof draft.known_skill_count === 'number' &&
    draft.known_skill_count + 1 > EQUIPMENT_KNOBS.max_known_skills_per_character
  ) {
    warnings.push({
      code: 'known_skills_above_recommended',
      field: 'skill_id',
      message:
        'Vượt quá ' +
        EQUIPMENT_KNOBS.max_known_skills_per_character +
        ' kỹ năng — AI có thể chọn kỹ năng chưa tối ưu khi kể.',
    });
  }

  return errors.length === 0 ? validationOk(warnings) : validationFail(errors, warnings);
}

export interface ItemSubmitDraft {
  item_id: unknown;
  /** Mandatory for recovery items; `[0, 1]` with no engine default. */
  efficacy?: unknown;
  is_recovery_item?: boolean;
}

/**
 * gdd-06 C6 / AC-26: a custom item missing `efficacy` or outside `[0, 1]` is
 * BLOCKED (it mirrors the author-mandatory constraint, which has no default).
 * Boundaries: `{undefined,-0.1,0,0.5,1.0,1.1} -> {block,block,allow,allow,allow,block}`.
 */
export function isValidItemSubmit(draft: ItemSubmitDraft, existing: ExistingIds): ValidationResult {
  const errors: ValidationIssue[] = [];
  errors.push(...isValidCustomId(draft.item_id, 'item', existing).errors);

  const needsEfficacy = draft.is_recovery_item !== false;
  if (needsEfficacy) {
    const value = draft.efficacy;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      errors.push({
        code: 'efficacy_invalid',
        field: 'efficacy',
        message: 'Hiệu lực hồi phục phải là số trong khoảng 0 đến 1.',
      });
    }
  }

  return errors.length === 0 ? validationOk() : validationFail(errors);
}

// ---------------------------------------------------------------------------
// D.5 - conditional deletion
// ---------------------------------------------------------------------------

export type CustomEntryType = 'item' | 'skill' | 'thuc';

export interface CustomEntry {
  id: string;
  type: CustomEntryType;
  /** Internal admin metadata - NO gameplay system may branch on it. */
  created_by_hack: boolean;
  /** For thuc entries: the owning skill. */
  parent_skill_id?: string | null;
}

export interface DeleteGateDeps {
  /** Past-perfect, not "currently equipped" (gdd-02 Rule #9). */
  wasEverEquipped: (entry: CustomEntry) => boolean;
  wasEverResolvedInCombat: (entry: CustomEntry) => boolean;
  /**
   * MUST be a structural entity reference (entity id tagged at narration time),
   * never a display-name text match (gdd-06 C4 D.5).
   */
  referencedInWorldMemory: (entry: CustomEntry) => boolean;
  /** For thuc: does the parent skill survive OUTSIDE this delete batch? */
  hasParentSkillAlive?: (entry: CustomEntry) => boolean;
}

/**
 * D.5:
 *   entry.created_by_hack
 *   AND NOT referenced_in_world_memory(entry)
 *   AND per-type:
 *       item:  NOT was_ever_equipped
 *       skill: NOT was_ever_resolved_in_combat
 *       thuc:  NOT has_parent_skill_alive
 */
export function isDeletableCustomEntry(
  entry: CustomEntry,
  deps: DeleteGateDeps,
): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (entry?.created_by_hack !== true) {
    errors.push({
      code: 'not_custom',
      field: entry?.id,
      message: 'Chỉ xóa được mục do chế độ tùy chỉnh tạo ra.',
    });
  }
  if (deps.referencedInWorldMemory(entry)) {
    errors.push({
      code: 'referenced_in_world_memory',
      field: entry?.id,
      message: 'Mục này đã được nhắc tới trong ký ức thế giới — không thể xóa.',
    });
  }
  if (entry?.type === 'item' && deps.wasEverEquipped(entry)) {
    errors.push({
      code: 'was_ever_equipped',
      field: entry.id,
      message: 'Vật phẩm này từng được trang bị — không thể xóa.',
    });
  }
  if (entry?.type === 'skill' && deps.wasEverResolvedInCombat(entry)) {
    errors.push({
      code: 'was_ever_resolved_in_combat',
      field: entry.id,
      message: 'Kỹ năng này từng được dùng trong giao tranh — không thể xóa.',
    });
  }
  if (entry?.type === 'thuc' && (deps.hasParentSkillAlive?.(entry) ?? false)) {
    errors.push({
      code: 'parent_skill_alive',
      field: entry.id,
      message: 'Thức này vẫn thuộc một kỹ năng còn tồn tại — không thể xóa riêng lẻ.',
    });
  }

  return errors.length === 0 ? validationOk() : validationFail(errors);
}

export interface DeleteBatchResult extends ValidationResult {
  /** Every id the batch would remove, parent first then its thuc. */
  removed_ids: string[];
  /** Skill ids to scrub from `known_skill_ids` in the SAME transaction. */
  scrub_known_skill_ids: string[];
}

/**
 * gdd-06 C2 #11: deleting a skill cascades to all N of its thuc,
 * ALL-OR-NOTHING - if any single element fails the check, the whole delete is
 * blocked. Deleting a skill also removes its id from `known_skill_ids` in the
 * same transaction (no dangling reference).
 */
export function validateDeleteBatch(
  entries: readonly CustomEntry[],
  deps: DeleteGateDeps,
): DeleteBatchResult {
  const errors: ValidationIssue[] = [];
  const batchIds = new Set(entries.map((e) => e.id));

  // A thuc inside the batch whose parent is ALSO in the batch is legal: the
  // parent does not survive outside this batch.
  const scopedDeps: DeleteGateDeps = {
    ...deps,
    hasParentSkillAlive: (entry) => {
      if (entry.parent_skill_id && batchIds.has(entry.parent_skill_id)) return false;
      return deps.hasParentSkillAlive
        ? deps.hasParentSkillAlive(entry)
        : Boolean(entry.parent_skill_id);
    },
  };

  for (const entry of entries) {
    errors.push(...isDeletableCustomEntry(entry, scopedDeps).errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings: [], removed_ids: [], scrub_known_skill_ids: [] };
  }

  return {
    ok: true,
    errors: [],
    warnings: [],
    removed_ids: entries.map((e) => e.id),
    scrub_known_skill_ids: entries.filter((e) => e.type === 'skill').map((e) => e.id),
  };
}

/** Expands a skill delete into the all-or-nothing batch it really is. */
export function expandSkillDelete(
  skill: CustomEntry,
  thucEntries: readonly CustomEntry[],
): CustomEntry[] {
  return [skill, ...thucEntries.filter((t) => t.parent_skill_id === skill.id)];
}
