/**
 * Shared fixtures for the Turn Manager suite.
 *
 * Design doc: production/gdd-integration/gdd-01-turn-contract-ai.md section A.
 * Every dependency is a spy so the acceptance criteria that assert on CALL
 * ORDER (AC-04) and on CALL COUNTS (AC-13b RNG spy) can be written directly.
 */

import { emptyLockedResult, type LockedResult, type UndoableSystem } from '../../../src-web/systems/types';
import type {
  CheckpointContext,
  CheckpointOutcome,
  NarrationContext,
  NarrationOutcome,
  TurnDeps,
  TurnInput,
} from '../../../src-web/systems/turn/turnManager';

/** A minimal undoable system whose snapshot is one integer. */
export class CounterSystem implements UndoableSystem {
  value = 0;
  captures = 0;
  restores = 0;

  captureSnapshot(): unknown {
    this.captures += 1;
    return { value: this.value };
  }

  restoreSnapshot(snapshot: unknown): void {
    this.restores += 1;
    this.value = (snapshot as { value: number }).value;
  }
}

export interface TurnSpies {
  order: string[];
  resolveCalls: number;
  narrateCalls: number;
  appendCalls: number;
  removeCalls: number;
  undoneCalls: number;
  checkpointCalls: number;
  commits: number;
  regenerated: number;
  lastLocked: LockedResult | null;
  logs: { kind: string; label: string; turn_id: number }[];
}

export interface DepsOptions {
  /** Deterministic stand-in for the mechanics RNG. */
  rollValue?: () => number;
  narrate?: (locked: LockedResult, ctx: NarrationContext) => Promise<NarrationOutcome>;
  checkpoint?: (ctx: CheckpointContext) => Promise<CheckpointOutcome>;
  deathOn?: (input: TurnInput) => boolean;
}

export function makeDeps(opts: DepsOptions = {}): { deps: TurnDeps; spies: TurnSpies } {
  const spies: TurnSpies = {
    order: [],
    resolveCalls: 0,
    narrateCalls: 0,
    appendCalls: 0,
    removeCalls: 0,
    undoneCalls: 0,
    checkpointCalls: 0,
    commits: 0,
    regenerated: 0,
    lastLocked: null,
    logs: [],
  };
  let now = 1_000_000;

  const deps: TurnDeps = {
    clock: () => (now += 10),
    resolveMechanics(input, ctx) {
      spies.resolveCalls += 1;
      spies.order.push('lock');
      const locked = emptyLockedResult(ctx.turn_id, ctx.world_time);
      locked.fields.damage = opts.rollValue ? opts.rollValue() : 7;
      locked.is_death_turn = opts.deathOn ? opts.deathOn(input) : false;
      spies.lastLocked = locked;
      return locked;
    },
    async narrate(locked, ctx) {
      spies.narrateCalls += 1;
      spies.order.push('narrate');
      if (opts.narrate) return opts.narrate(locked, ctx);
      return {
        ok: true,
        text: 'Gió thổi qua khe núi.',
        suggestions: [
          { text: 'Tiến lên', envelope: 'move', source: 'ai' },
          { text: 'Lùi lại', envelope: 'move', source: 'ai' },
        ],
      };
    },
    appendMemory() {
      spies.appendCalls += 1;
      spies.order.push('memory');
    },
    removeMemory() {
      spies.removeCalls += 1;
      spies.order.push('memory_remove');
    },
    markMemoryUndone() {
      spies.undoneCalls += 1;
      spies.order.push('memory_undone');
    },
    async checkpoint(ctx) {
      spies.checkpointCalls += 1;
      spies.order.push('checkpoint');
      if (opts.checkpoint) return opts.checkpoint(ctx);
      return { durability_confirmed: true };
    },
    onCommit() {
      spies.commits += 1;
      spies.order.push('commit');
    },
    async regenerateSuggestions() {
      spies.regenerated += 1;
      return [{ text: 'Gợi ý mới', envelope: null, source: 'ai' as const }];
    },
    log(entry) {
      spies.logs.push({ kind: entry.kind, label: entry.label, turn_id: entry.turn_id });
    },
  };

  return { deps, spies };
}

/** A narration outcome that always fails, with a chosen label. */
export function failingNarration(label: string) {
  return async (): Promise<NarrationOutcome> => ({ ok: false, label, detail: 'simulated' });
}
