/**
 * Pillar 1 - "The Gioi Khach Quan": the OVERREACH SUCCESS CAP.
 *
 * Design doc: design/gdd/game-concept.md, "Pillar 1" (lines 243-255).
 *
 * THE PROBLEM
 * API-1 returns 6 scenarios with a `probability` weight each; `rollDice` picks
 * one proportionally. Prompt directives alone do not hold: a model asked to be
 * dramatic reliably hands a level-5 protagonist a 40% chance of impressing a
 * level-60 elder. Directives are advisory; this module is the mechanical floor
 * under them.
 *
 * THE RULE
 * When the strongest RELEVANT NPC is at least one tier (10 levels) above the
 * player, the TOTAL weight of `success` scenarios is capped, and `partial` gets
 * `OVERREACH_PARTIAL_CAP_MULT x` that cap. Excess weight is redistributed
 * proportionally to the scenarios that are still under their own cap
 * (`failure` first, then `partial`). Ordering, count and content are untouched
 * - only weights move, so API-1 keeps authoring the fiction.
 *
 * EDGE CASE: NO FAILURE SCENARIO
 * We do NOT synthesize one. Inventing a scenario would mean this module writes
 * fiction, which is exactly the boundary plan.md C-1 draws. Instead we cap what
 * we can, renormalise, and log - the report tells the caller it happened.
 *
 * PURITY
 * No React, no I/O, no RNG, no clock. Levels come in as plain numbers so an
 * injured NPC can be passed at its EFFECTIVE (reduced) level by the caller.
 */

import { OBJECTIVITY_KNOBS, overreachSuccessCap } from '../registry';

export type PlayerOutcome = 'success' | 'partial' | 'failure';

export interface ScenarioLike {
  probability?: number | string;
  outcome_for_player?: string;
  summary?: string;
  [k: string]: unknown;
}

export interface OverreachKnobs {
  OVERREACH_TIER_SIZE?: number;
  OVERREACH_SUCCESS_CAP_TIER1?: number;
  OVERREACH_SUCCESS_CAP_TIER2?: number;
  OVERREACH_SUCCESS_CAP_TIER3?: number;
  OVERREACH_PARTIAL_CAP_MULT?: number;
  [k: string]: unknown;
}

export interface CapOverreachInput {
  playerLevel: number;
  /** EFFECTIVE levels of the relevant NPCs (injured NPCs count as reduced). */
  targetLevels?: readonly number[];
  knobs?: OverreachKnobs;
}

export interface CapReport {
  applied: boolean;
  /** Tier gap that drove the caps (0 when no cap applied). */
  tierGap: number;
  /** Level of the strongest relevant NPC, or null when there is none. */
  strongestTargetLevel: number | null;
  successCap: number;
  partialCap: number;
  successWeightBefore: number;
  successWeightAfter: number;
  partialWeightBefore: number;
  partialWeightAfter: number;
  /** Weight that had to move out of success/partial. */
  redistributed: number;
  /** True when nothing could absorb the excess (no failure scenario). */
  noFailureScenario: boolean;
  notes: string[];
}

export interface CapOverreachResult<T> {
  scenarios: T[];
  capped: CapReport;
}

const OUTCOMES: readonly PlayerOutcome[] = ['success', 'partial', 'failure'];

/**
 * Normalises whatever API-1 wrote into one of the three outcomes.
 * A missing/unknown value defaults to `partial`: treating it as `success`
 * would let a model dodge the cap by omitting the field, and treating it as
 * `failure` would silently punish an honest scenario.
 */
export function normaliseOutcome(raw: unknown): PlayerOutcome {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'success' || v === 'thanh cong') return 'success';
  if (v === 'failure' || v === 'fail' || v === 'that bai') return 'failure';
  return 'partial';
}

function weightOf(s: ScenarioLike): number {
  const n = Number(s?.probability);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Tier gap between the player and the strongest relevant NPC (0 = none). */
export function tierGapOf(playerLevel: number, targetLevels: readonly number[], tierSize: number): number {
  const levels = (targetLevels ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (levels.length === 0) return 0;
  const strongest = Math.max(...levels);
  const size = Number.isFinite(tierSize) && tierSize > 0 ? tierSize : 10;
  const gap = strongest - (Number(playerLevel) || 1);
  if (gap < size) return 0;
  return Math.floor(gap / size);
}

/**
 * Caps the total `success` (and `partial`) weight of an API-1 scenario list.
 * Returns a NEW list; scenario objects are shallow-cloned with a new
 * `probability`. Order and count are preserved exactly.
 */
export function capOverreach<T extends ScenarioLike>(
  scenarios: readonly T[],
  input: CapOverreachInput,
): CapOverreachResult<T> {
  const knobs: OverreachKnobs = { ...OBJECTIVITY_KNOBS, ...(input.knobs ?? {}) };
  const tierSize = Number(knobs.OVERREACH_TIER_SIZE) || 10;
  const list = Array.isArray(scenarios) ? scenarios : [];

  const levels = (input.targetLevels ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const strongestTargetLevel = levels.length > 0 ? Math.max(...levels) : null;
  const tierGap = tierGapOf(input.playerLevel, levels, tierSize);

  const emptyReport = (notes: string[]): CapReport => ({
    applied: false,
    tierGap,
    strongestTargetLevel,
    successCap: 1,
    partialCap: 1,
    successWeightBefore: 0,
    successWeightAfter: 0,
    partialWeightBefore: 0,
    partialWeightAfter: 0,
    redistributed: 0,
    noFailureScenario: false,
    notes,
  });

  if (list.length === 0) return { scenarios: [], capped: emptyReport(['danh sách kịch bản rỗng']) };
  if (tierGap < 1) {
    return {
      scenarios: list.slice(),
      capped: emptyReport(['chênh lệch chưa tới 1 cảnh giới — không áp trần']),
    };
  }

  const total = list.reduce((sum, s) => sum + weightOf(s), 0);
  if (!(total > 0)) {
    return { scenarios: list.slice(), capped: emptyReport(['tổng trọng số bằng 0 — không áp trần']) };
  }

  const outcomes = list.map((s) => normaliseOutcome(s.outcome_for_player));
  // Shares are fractions of the total, so the caps are scale-free.
  const share = list.map((s) => weightOf(s) / total);

  const sumBy = (arr: readonly number[], kind: PlayerOutcome) =>
    arr.reduce((sum, v, i) => (outcomes[i] === kind ? sum + v : sum), 0);

  const successCapRaw = overreachSuccessCap(tierGap, knobs as never);
  const partialMult = Number(knobs.OVERREACH_PARTIAL_CAP_MULT);
  const successCap = Math.min(1, Math.max(0, successCapRaw));
  const partialCap = Math.min(1, successCap * (Number.isFinite(partialMult) && partialMult >= 1 ? partialMult : 1));

  const successBefore = sumBy(share, 'success');
  const partialBefore = sumBy(share, 'partial');
  const failureShare = sumBy(share, 'failure');
  const notes: string[] = [];

  const caps: Record<PlayerOutcome, number> = {
    success: successCap,
    partial: partialCap,
    failure: 1,
  };

  // 1. Scale each over-cap group down to its cap; collect the freed weight.
  const next = share.slice();
  let freed = 0;
  for (const kind of OUTCOMES) {
    if (kind === 'failure') continue;
    const before = sumBy(next, kind);
    const cap = caps[kind];
    if (before <= cap + 1e-12) continue;
    const factor = before > 0 ? cap / before : 0;
    for (let i = 0; i < next.length; i += 1) {
      if (outcomes[i] !== kind) continue;
      const reduced = next[i] * factor;
      freed += next[i] - reduced;
      next[i] = reduced;
    }
  }

  // 2. Redistribute the freed weight, proportionally, to whatever still has
  //    headroom: failure first (it always does), then partial.
  let noFailureScenario = false;
  if (freed > 1e-12) {
    const receivers = [] as { index: number; base: number }[];
    for (let i = 0; i < next.length; i += 1) {
      if (outcomes[i] === 'failure') receivers.push({ index: i, base: next[i] });
    }
    if (receivers.length === 0) {
      noFailureScenario = true;
      notes.push('không có kịch bản "failure" — chỉ áp trần rồi chuẩn hóa lại, KHÔNG bịa thêm kịch bản');
      const partialRoom = Math.max(0, caps.partial - sumBy(next, 'partial'));
      if (partialRoom > 1e-12) {
        for (let i = 0; i < next.length; i += 1) {
          if (outcomes[i] === 'partial') receivers.push({ index: i, base: next[i] });
        }
      }
    }
    if (receivers.length > 0) {
      const baseSum = receivers.reduce((s, r) => s + r.base, 0);
      if (baseSum > 1e-12) {
        for (const r of receivers) next[r.index] += freed * (r.base / baseSum);
      } else {
        for (const r of receivers) next[r.index] += freed / receivers.length;
      }
      freed = 0;
    }
  }

  // 3. Renormalise to 1 (the no-receiver branch above leaves a deficit) and
  //    scale back onto the original total so downstream logging still reads
  //    like percentages.
  const sumNext = next.reduce((s, v) => s + v, 0);
  const norm = sumNext > 1e-12 ? 1 / sumNext : 0;
  const outScenarios = list.map((s, i) => ({ ...s, probability: next[i] * norm * total }));

  const finalShare = next.map((v) => v * norm);
  const successAfter = sumBy(finalShare, 'success');
  const partialAfter = sumBy(finalShare, 'partial');

  if (failureShare <= 0 && !noFailureScenario) {
    notes.push('không có kịch bản "failure" trong danh sách gốc');
  }
  notes.push(
    'áp trần vượt tầm: chênh ' + tierGap + ' cảnh giới, trần success ' + successCap.toFixed(3) +
      ', trần partial ' + partialCap.toFixed(3),
  );

  return {
    scenarios: outScenarios as T[],
    capped: {
      applied: successAfter < successBefore - 1e-9 || partialAfter < partialBefore - 1e-9,
      tierGap,
      strongestTargetLevel,
      successCap,
      partialCap,
      successWeightBefore: successBefore,
      successWeightAfter: successAfter,
      partialWeightBefore: partialBefore,
      partialWeightAfter: partialAfter,
      redistributed: Math.max(0, successBefore - successAfter) + Math.max(0, partialBefore - partialAfter),
      noFailureScenario,
      notes,
    },
  };
}
