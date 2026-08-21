/**
 * Shared fixtures for the AI/LLM layer suite: mock fetch + fake clock + fake
 * timers, per gdd-01 C.8 ("All ACs use HTTP-client mocks/spies (never the real
 * API) plus a fake clock").
 */

import {
  createAiSessionState,
  type AbortLike,
  type AiDeps,
  type FetchInit,
  type HttpResponseLike,
} from '../../../src-web/systems/ai/requestAi';
import { makeAiConfig, type AiLlmTuningConfig } from '../../../src-web/systems/ai/config';
import { emptyLockedResult, type LockedResult } from '../../../src-web/systems/types';

export interface FakeClock {
  now(): number;
  advance(ms: number): void;
}

export function makeClock(start = 1_000_000): FakeClock {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

export interface ScriptedResponse {
  status: number;
  body?: unknown;
  /** Simulated round-trip time; advances the fake clock. */
  delayMs?: number;
  headers?: Record<string, string>;
  /** Simulates a transport-level failure (DNS, connection reset). */
  throwError?: string;
  /** Raw body text returned for a NON-200 status (the API's error message). */
  errorBody?: string;
  /** Never resolves until the test aborts it (drives the AbortController path). */
  hang?: boolean;
  /** Suspends the request until the test resolves this promise. */
  gate?: Promise<unknown>;
}

export type Script = ScriptedResponse[] | ((url: string, init: FetchInit, i: number) => ScriptedResponse);

export interface FetchRecord {
  url: string;
  init: FetchInit;
  model: string;
  body: Record<string, unknown>;
}

export function modelFromUrl(url: string): string {
  const m = url.match(/models\/([^:]+):/);
  return m ? m[1] : '';
}

/** Gemini 200 body carrying `text`. */
export function okBody(text: string, finishReason = 'STOP'): unknown {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason }] };
}

export function suggestionsBody(items: { text: string; envelope: string }[]): unknown {
  return okBody(JSON.stringify(items));
}

export interface AiTestHarness {
  deps: AiDeps;
  calls: FetchRecord[];
  sleeps: number[];
  aborts: number;
  /** Currently ARMED timers (a finished attempt cancels its own). */
  timers: { ms: number; fire(): void }[];
  /** Every deadline ever armed, in order - survives cancellation. */
  timerLog: number[];
  clock: FakeClock;
  fireAllTimers(): void;
  config: AiLlmTuningConfig;
}

export function makeHarness(
  script: Script,
  cfgOverrides: Partial<AiLlmTuningConfig> = {},
  extra: Partial<AiDeps> = {},
): AiTestHarness {
  const clock = makeClock();
  const calls: FetchRecord[] = [];
  const sleeps: number[] = [];
  const timers: { ms: number; fire(): void }[] = [];
  const timerLog: number[] = [];
  let aborts = 0;

  const config = makeAiConfig({
    endpoint_base: 'https://example.invalid/models',
    // The harness keeps the LEGACY uniform 60/45 budget by default so the F2
    // budget suite stays readable; the per-call-type map (plan.md C-10 deviation
    // #2) is opt-in per test via `cfgOverrides.budget_by_call_type`.
    budget_by_call_type: {},
    ...cfgOverrides,
  });

  const fetchImpl = async (url: string, init: FetchInit): Promise<HttpResponseLike> => {
    const i = calls.length;
    calls.push({ url, init, model: modelFromUrl(url), body: JSON.parse(init.body) });
    const spec = typeof script === 'function' ? script(url, init, i) : script[Math.min(i, script.length - 1)];
    if (spec.gate) await spec.gate;
    if (spec.delayMs) clock.advance(spec.delayMs);
    if (spec.hang) {
      return new Promise<HttpResponseLike>((_resolve, reject) => {
        const signal = init.signal as { onabort?: () => void };
        signal.onabort = () => reject(new Error('AbortError'));
      });
    }
    if (spec.throwError) throw new Error(spec.throwError);
    return {
      status: spec.status,
      json: async () => spec.body ?? {},
      // Non-200 bodies are read as TEXT by `requestAi` (the API's own message is
      // what App's `translateGeminiApiError` matches on). `errorBody` opts a
      // scripted response into that path; omitting it means "body unreadable".
      text: spec.errorBody === undefined ? undefined : async () => spec.errorBody as string,
      headers: { get: (n: string) => spec.headers?.[n] ?? null },
    };
  };

  const abortFactory = (): AbortLike => {
    const signal: { onabort?: () => void } = {};
    return {
      signal,
      abort() {
        aborts += 1;
        signal.onabort?.();
      },
    };
  };

  const deps: AiDeps = {
    fetchImpl,
    clock: () => clock.now(),
    sleep: async (ms: number) => {
      sleeps.push(ms);
      clock.advance(ms);
    },
    abortFactory,
    session: createAiSessionState(),
    config,
    // A resolvable key by default: `requestAi` now fails CLOSED with
    // `config_error` before touching the ladder when no key resolves, so a
    // harness without credentials would never reach `fetchImpl` at all.
    credentials: { apiMode: 'default', defaultKey: 'harness-key' },
    timer: (ms, cb) => {
      const entry = { ms, fire: cb };
      timers.push(entry);
      timerLog.push(ms);
      return () => {
        const i = timers.indexOf(entry);
        if (i >= 0) timers.splice(i, 1);
      };
    },
    ...extra,
  };

  return {
    deps,
    calls,
    sleeps,
    get aborts() {
      return aborts;
    },
    timers,
    timerLog,
    clock,
    config,
    fireAllTimers() {
      for (const t of [...timers]) t.fire();
    },
  } as AiTestHarness;
}

export function lockedFixture(fields: Record<string, unknown> = { damage: 47 }): LockedResult {
  const l = emptyLockedResult(1, 1);
  l.fields = fields as LockedResult['fields'];
  return l;
}
