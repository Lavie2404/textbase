/**
 * Shared fixtures for the Character Customization Mode suite (gdd-06 PART C).
 */

import { GDD_STAT_KEYS } from '../../../src-web/systems/registry';
import type { DeleteGateDeps } from '../../../src-web/systems/customize/validators';
import type {
  CommitDeps,
  HackCheckpointPayload,
  HackWriteLogEntry,
} from '../../../src-web/systems/customize/commitFlow';

/** A complete 12-key draft, all keys set to the same value. */
export function fullStatDraft(value: number | string = 10): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of GDD_STAT_KEYS) out[key] = value;
  return out;
}

/** Delete-gate dependencies that block nothing. */
export function noDeps(): DeleteGateDeps {
  return {
    wasEverEquipped: () => false,
    wasEverResolvedInCombat: () => false,
    referencedInWorldMemory: () => false,
    hasParentSkillAlive: () => false,
  };
}

export interface CommitSpy {
  deps: CommitDeps;
  calls: {
    validate: number;
    apply: number;
    write: number;
    hasPendingSnapshot: number;
    invalidate: number;
    setHackModeUsed: number;
  };
  payloads: HackCheckpointPayload[];
  logs: HackWriteLogEntry[];
  /** Mutable knobs the test flips between commits. */
  state: {
    valid: boolean;
    writeOk: boolean;
    writeError?: string;
    throwOnWrite?: boolean;
    pendingSnapshot: boolean;
    now: number;
    worldTime: number;
  };
}

/** A fully instrumented `CommitDeps` so call counts are literal assertions. */
export function commitSpy(overrides: Partial<CommitSpy['state']> = {}): CommitSpy {
  const spy: CommitSpy = {
    deps: null as never,
    calls: {
      validate: 0,
      apply: 0,
      write: 0,
      hasPendingSnapshot: 0,
      invalidate: 0,
      setHackModeUsed: 0,
    },
    payloads: [],
    logs: [],
    state: {
      valid: true,
      writeOk: true,
      pendingSnapshot: false,
      now: 0,
      worldTime: 42,
      ...overrides,
    },
  };

  spy.deps = {
    validate: () => {
      spy.calls.validate += 1;
      return spy.state.valid
        ? { ok: true, errors: [], warnings: [] }
        : {
            ok: false,
            errors: [{ code: 'test_invalid', message: 'Dữ liệu thử nghiệm không hợp lệ.' }],
            warnings: [],
          };
    },
    applyInMemory: () => {
      spy.calls.apply += 1;
    },
    writeCheckpoint: async (payload) => {
      spy.calls.write += 1;
      spy.payloads.push(payload);
      if (spy.state.throwOnWrite) throw new Error('backend exploded');
      return spy.state.writeOk
        ? { ok: true }
        : { ok: false, error: spy.state.writeError ?? 'QUOTA_EXCEEDED' };
    },
    hasPendingSnapshot: () => {
      spy.calls.hasPendingSnapshot += 1;
      return spy.state.pendingSnapshot;
    },
    invalidatePendingSnapshot: () => {
      spy.calls.invalidate += 1;
      spy.state.pendingSnapshot = false;
    },
    setHackModeUsed: () => {
      spy.calls.setHackModeUsed += 1;
    },
    emitLog: (entry) => {
      spy.logs.push(entry);
    },
    clock: () => spy.state.now,
    worldTime: () => spy.state.worldTime,
  };

  return spy;
}
