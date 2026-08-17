/**
 * `requestAi` - the SINGLE outbound call site to Gemini for the whole game.
 *
 * Design docs:
 * - production/gdd-integration/gdd-01-turn-contract-ai.md section C
 *   (C.2 R1-R8, C.3 state model, C.4 F1 backoff / F2 budget / F3 ladder /
 *   F4 accounting + orchestrator pseudocode, C.6 edge cases, C.8 AC-01..AC-33)
 * - production/gdd-integration/plan.md C-9 (only critical-path calls count
 *   toward `calls_per_turn`; background calls are exempt) and C-10
 *   (AbortController, 60s logical / 45s per request, queue delay excluded)
 * - production/gdd-integration/app-map.md section 3 for the shipped semantics
 *   this ports: `fetchWithRetries:17965` (429 quota, 401 auth, 403/404 skip
 *   model, 503 breaker 90s, sticky model :17962).
 *
 * PURITY / DI
 * Everything that touches the outside world is injected: `fetchImpl`, `clock`,
 * `sleep`, `abortFactory`, `timer`. There is no module-level mutable state - the
 * in-flight flag and the cooldown map live in an injected `AiSessionState`
 * (AC-29: "cooldown_until is dependency-injected and starts clean per test").
 *
 * WHAT THIS LAYER NEVER DOES
 * Never interprets content, never edits text, never fabricates a result to hide
 * an error, never caches a `locked_result` between calls, never runs the leak
 * detector (that is post-hoc, in Contract Enforcement).
 */

import type { Suggestion } from '../types';
import {
  DEFAULT_AI_CONFIG,
  resolveApiKey,
  type AiCredentials,
  type AiLlmTuningConfig,
} from './config';
import {
  buildRequestBody,
  parseSuggestions,
  type AiPayload,
  type CallType,
  type GeminiRequestBody,
} from './promptBuilder';

export type { CallType, AiPayload } from './promptBuilder';

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/**
 * The four labels C.7 requires to stay distinct and never merged. Everything
 * else below is a refinement that C.7 also names ("plus not_configured,
 * quota_429, ... parse_failed").
 */
export const CANONICAL_FAIL_LABELS = ['timeout', 'no_models_left', 'config_error', 'BUSY'] as const;

export type FailLabel =
  | 'timeout'
  | 'no_models_left'
  | 'config_error'
  | 'BUSY'
  | 'not_configured'
  | 'quota_429'
  | 'parse_failed'
  | 'safety_blocked'
  | 'truncated';

export type ErrorClass = 'OVERLOADED' | 'TRANSIENT_OTHER';
export type CallState = 'idle' | 'requesting' | 'retrying_network' | 'success' | 'failed';

// ---------------------------------------------------------------------------
// Injected seams
// ---------------------------------------------------------------------------

export interface HttpResponseLike {
  status: number;
  json(): Promise<unknown>;
  headers?: { get(name: string): string | null };
}

export interface FetchInit {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal?: unknown;
}

export type FetchLike = (url: string, init: FetchInit) => Promise<HttpResponseLike>;

/** Minimal `AbortController` shape so tests need no DOM. */
export interface AbortLike {
  signal: unknown;
  abort(): void;
}

/** Starts a one-shot timer and returns its canceller. */
export type TimerFactory = (ms: number, cb: () => void) => () => void;

export interface AiLogEntry {
  label: FailLabel | 'success';
  call_type: CallType;
  model?: string;
  attempts: number;
  elapsed_ms: number;
  detail?: string;
  background: boolean;
}

export interface AiEvent {
  type: 'retrying_network' | 'model_switch' | 'request_start';
  model: string;
  elapsed_ms: number;
  error_class?: ErrorClass;
}

/**
 * C.3 `AiLayerState`, made injectable. `cooldown_until` is WALL CLOCK seconds,
 * never `world_time`, and is deliberately NOT persisted (fresh every session).
 */
export interface AiSessionState {
  in_flight: boolean;
  cooldown_until: Record<string, number>;
  /** Sticky preferred model - ported from `App.tsx:17962`. */
  preferred_model: string | null;
  log: AiLogEntry[];
  state: CallState;
}

export function createAiSessionState(): AiSessionState {
  return { in_flight: false, cooldown_until: {}, preferred_model: null, log: [], state: 'idle' };
}

export interface AiDeps {
  fetchImpl: FetchLike;
  /** Milliseconds. `Date.now()` in production; a fake clock in tests. */
  clock: () => number;
  sleep: (ms: number) => Promise<void>;
  abortFactory: () => AbortLike;
  session: AiSessionState;
  config?: AiLlmTuningConfig;
  credentials?: AiCredentials;
  timer?: TimerFactory;
  onEvent?: (e: AiEvent) => void;
}

export interface AiRequest {
  call_type: CallType;
  payload: AiPayload;
  /**
   * plan.md C-9: background calls (API-3 state monitor, summariser, creation
   * drains) bypass the per-turn budget AND the BUSY guard, because they are not
   * on the turn's critical path. They still obey F1/F2/F3.
   */
  background?: boolean;
  /** Overrides the built body. Used only by internal retries and tests. */
  bodyOverride?: GeminiRequestBody;
}

export type AiResult =
  | {
      ok: true;
      call_type: CallType;
      text: string;
      suggestions?: Suggestion[];
      model: string;
      attempts: number;
      elapsed_ms: number;
      truncated?: boolean;
      /** False for background calls (C-9): the caller must not count them. */
      counted: boolean;
    }
  | {
      ok: false;
      call_type: CallType;
      label: FailLabel;
      detail?: string;
      attempts: number;
      elapsed_ms: number;
      retry_after?: number;
      counted: boolean;
    };

// ---------------------------------------------------------------------------
// F1 - backoff
// ---------------------------------------------------------------------------

/**
 * F1: `w(attempt_index, error_class)`. Always > 0 (never spam instantly).
 * Callers must test the last-allowed-attempt gate with `>=`, never `===`
 * (C.4 F1: two different per-class thresholds let alternating error classes slip
 * past an equality check).
 */
export function backoffSeconds(
  attemptIndex: number,
  cls: ErrorClass,
  cfg: AiLlmTuningConfig = DEFAULT_AI_CONFIG,
): number {
  return cls === 'OVERLOADED'
    ? cfg.overload_retry_wait_seconds
    : cfg.transient_retry_base_seconds * (attemptIndex + 1);
}

/** `attempt_index >= max_same_model_attempts_[class] - 1` (C.4 F1). */
export function isLastAllowedAttempt(
  attemptIndex: number,
  cls: ErrorClass,
  cfg: AiLlmTuningConfig = DEFAULT_AI_CONFIG,
): boolean {
  const max =
    cls === 'OVERLOADED'
      ? cfg.max_same_model_attempts_overloaded
      : cfg.max_same_model_attempts_transient;
  return attemptIndex >= max - 1;
}

// ---------------------------------------------------------------------------
// F3 - ladder
// ---------------------------------------------------------------------------

/**
 * F3: healthy models keep list order; when everything is cooling down the
 * ladder degenerates to the FULL list and the first entry is tried anyway
 * (cooldown is an estimate, and trying beats failing while budget remains).
 */
export function healthyLadder(
  models: readonly string[],
  cooldownUntil: Record<string, number>,
  nowSec: number,
): string[] {
  const healthy = models.filter((m) => (cooldownUntil[m] ?? 0) <= nowSec);
  return healthy.length > 0 ? healthy : models.slice();
}

/**
 * `next_model(ladder, tried)`. `tried` is MONOTONIC within one logical call and
 * is never reset or shrunk when the ladder is recomputed - that is the whole
 * point of AC-31: resetting it produces an A->B->C->A loop bounded only by the
 * clock.
 */
export function nextModel(ladder: readonly string[], tried: ReadonlySet<string>): string | null {
  for (const m of ladder) if (!tried.has(m)) return m;
  return null;
}

/** Sticky preference (App.tsx:17962): last model that worked goes first. */
export function applyStickyPreference(
  ladder: readonly string[],
  preferred: string | null,
): string[] {
  if (!preferred) return ladder.slice();
  const i = ladder.indexOf(preferred);
  if (i <= 0) return ladder.slice();
  const out = ladder.slice();
  out.splice(i, 1);
  out.unshift(preferred);
  return out;
}

// ---------------------------------------------------------------------------
// F4 - logical call accounting (invariant)
// ---------------------------------------------------------------------------

/**
 * F4: `calls_per_turn = |calls_this_turn|`, a TYPE SET - not a multiset, and
 * never `sum(http_attempt_count)`. Three internal HTTP attempts plus one
 * narration attempt is `2`, not `4`. Exported so a test can state the invariant
 * directly.
 */
export function logicalCallCount(types: Iterable<CallType>): number {
  return new Set(types).size;
}

// ---------------------------------------------------------------------------
// Response shape helpers
// ---------------------------------------------------------------------------

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
  finishReason?: string;
}
interface GeminiReply {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

export function extractText(data: unknown): string {
  const reply = (data ?? {}) as GeminiReply;
  const parts = reply.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
}

export function blockReasonOf(data: unknown): string | null {
  const reply = (data ?? {}) as GeminiReply;
  return reply.promptFeedback?.blockReason ?? null;
}

export function finishReasonOf(data: unknown): string | null {
  const reply = (data ?? {}) as GeminiReply;
  return reply.candidates?.[0]?.finishReason ?? null;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

const defaultTimer: TimerFactory = (ms, cb) => {
  const id = setTimeout(cb, ms);
  return () => clearTimeout(id);
};

interface AttemptOutcome {
  kind: 'response' | 'network_error' | 'aborted';
  status?: number;
  data?: unknown;
  retryAfter?: number;
  detail?: string;
}

/**
 * The one and only entry point (R1). Returns a result object for every failure;
 * the single exception it throws is `ContractCheckpointError`, because a
 * `narration_call` without a locked result is an architectural bug, not a
 * runtime error (C.3 pseudocode, AC-02).
 */
export async function requestAi(req: AiRequest, deps: AiDeps): Promise<AiResult> {
  const cfg = deps.config ?? DEFAULT_AI_CONFIG;
  const session = deps.session;
  const background = req.background === true;
  const timer = deps.timer ?? defaultTimer;
  const t_start = deps.clock();
  let attempts = 0;

  const finish = (result: AiResult): AiResult => {
    // `strict` is off in tsconfig.json, which disables boolean-literal
    // discriminant narrowing; these casts restore the two halves of the union.
    const asOk = result as { model: string };
    const asFail = result as { label: FailLabel; detail?: string };
    session.log.push({
      label: result.ok ? 'success' : asFail.label,
      call_type: req.call_type,
      model: result.ok ? asOk.model : undefined,
      attempts: result.attempts,
      elapsed_ms: result.elapsed_ms,
      detail: result.ok ? undefined : asFail.detail,
      background,
    });
    if (!background) {
      session.in_flight = false;
      session.state = result.ok ? 'success' : 'failed';
    }
    return result;
  };

  const fail = (label: FailLabel, detail?: string, retry_after?: number): AiResult =>
    finish({
      ok: false,
      call_type: req.call_type,
      label,
      detail,
      attempts,
      elapsed_ms: deps.clock() - t_start,
      retry_after,
      counted: !background,
    });

  // Concurrency: REJECT, never queue (C.6). Background calls are exempt (C-9).
  if (!background && session.in_flight) {
    session.log.push({
      label: 'BUSY',
      call_type: req.call_type,
      attempts: 0,
      elapsed_ms: 0,
      background,
    });
    return {
      ok: false,
      call_type: req.call_type,
      label: 'BUSY',
      detail: 'a logical call is already in flight',
      attempts: 0,
      elapsed_ms: 0,
      counted: false,
    };
  }

  // Checkpoint 1 lives inside buildRequestBody and THROWS - zero requests sent.
  const body = req.bodyOverride ?? buildRequestBody(req.call_type, req.payload, cfg);

  if (!background) {
    session.in_flight = true;
    session.state = 'requesting';
  }

  // Zero-request failure modes, in the order the pseudocode lists them.
  const key = resolveApiKey(deps.credentials);
  if (deps.credentials && key === null) {
    return deps.credentials.apiMode === 'userKey'
      ? fail('not_configured', 'apiMode=userKey with an empty key')
      : fail('config_error', 'no project key configured');
  }
  if (cfg.model_ladder.length === 0) {
    return fail('config_error', 'model_ladder is empty');
  }

  const tried = new Set<string>();
  const elapsedSec = () => (deps.clock() - t_start) / 1000;
  const nowSec = () => deps.clock() / 1000;

  const ladderNow = () =>
    applyStickyPreference(
      healthyLadder(cfg.model_ladder, session.cooldown_until, nowSec()),
      session.preferred_model,
    );

  let model = nextModel(ladderNow(), tried);
  let parseRetryUsed = false;

  while (model !== null) {
    tried.add(model);
    let attempt_index = 0;

    // Inner loop: attempts against the CURRENT model.
    for (;;) {
      const t_rem = cfg.ai_call_timeout_seconds - elapsedSec();
      if (t_rem <= 0) return fail('timeout', 'budget exhausted before attempt on ' + model);

      attempts += 1;
      // C-10: per-request deadline = min(request_timeout_default, t_remaining),
      // enforced with a real AbortController so a hung request cannot freeze the
      // game (App.tsx today has no timeout at all).
      const perRequestSec = Math.min(cfg.request_timeout_default, t_rem);
      deps.onEvent?.({ type: 'request_start', model, elapsed_ms: deps.clock() - t_start });
      const outcome = await httpAttempt(deps, cfg, model, body, key, perRequestSec, timer);

      if (outcome.kind === 'response' && outcome.status === 200) {
        const blocked = blockReasonOf(outcome.data);
        if (blocked) {
          // R5: never fabricate a result to mask an error, and never retry a
          // safety block - every model in the ladder shares the same policy.
          return fail('safety_blocked', 'promptFeedback.blockReason=' + blocked);
        }
        const text = extractText(outcome.data);
        const finishReason = finishReasonOf(outcome.data);
        if (finishReason === 'MAX_TOKENS' && text === '') {
          return fail('truncated', 'finishReason=MAX_TOKENS with empty text');
        }
        if (text === '') {
          return fail('parse_failed', 'empty candidate text');
        }

        session.preferred_model = model;
        if (req.call_type === 'narration_call') {
          return finish({
            ok: true,
            call_type: req.call_type,
            text,
            model,
            attempts,
            elapsed_ms: deps.clock() - t_start,
            truncated: finishReason === 'MAX_TOKENS' ? true : undefined,
            counted: !background,
          });
        }

        const parsed = parseSuggestions(text, req.payload.allowed_envelope_menu);
        if (parsed.valid) {
          return finish({
            ok: true,
            call_type: req.call_type,
            text,
            suggestions: parsed.suggestions,
            model,
            attempts,
            elapsed_ms: deps.clock() - t_start,
            counted: !background,
          });
        }
        if (!parseRetryUsed) {
          // Exactly ONE internal parse retry, inside the same time budget and
          // never counted in calls_per_turn (C.6).
          parseRetryUsed = true;
          continue;
        }
        return fail('parse_failed', parsed.error);
      }

      if (outcome.kind === 'response' && outcome.status === 429) {
        // Quota: no retry, forward any suggested wait (R5).
        return fail('quota_429', 'HTTP 429', outcome.retryAfter);
      }
      if (outcome.kind === 'response' && outcome.status === 401) {
        // Ported from App.tsx `fetchWithRetries`: an auth failure is a config
        // error and never heals by retrying.
        return fail('config_error', 'HTTP 401');
      }
      if (outcome.kind === 'response' && (outcome.status === 403 || outcome.status === 404)) {
        // Ported from App.tsx: this model is unusable for this key - skip it,
        // WITHOUT a cooldown (the model is not overloaded, it is unavailable).
        deps.onEvent?.({ type: 'model_switch', model, elapsed_ms: deps.clock() - t_start });
        break;
      }

      const cls: ErrorClass =
        outcome.kind === 'response' && outcome.status === 503 ? 'OVERLOADED' : 'TRANSIENT_OTHER';

      if (isLastAllowedAttempt(attempt_index, cls, cfg)) {
        // Mark overloaded and switch models IMMEDIATELY, with w = 0.
        session.cooldown_until[model] = nowSec() + cfg.model_cooldown_seconds;
        if (session.preferred_model === model) session.preferred_model = null;
        session.state = 'retrying_network';
        deps.onEvent?.({
          type: 'retrying_network',
          model,
          elapsed_ms: deps.clock() - t_start,
          error_class: cls,
        });
        break;
      }

      const w = backoffSeconds(attempt_index, cls, cfg);
      if (cfg.ai_call_timeout_seconds - elapsedSec() <= w) {
        return fail('timeout', 'no budget left for a ' + w + 's backoff');
      }
      session.state = 'retrying_network';
      deps.onEvent?.({
        type: 'retrying_network',
        model,
        elapsed_ms: deps.clock() - t_start,
        error_class: cls,
      });
      await deps.sleep(w * 1000);
      attempt_index += 1;
    }

    // Ladder recomputed every hop; `tried` is NEVER reset (AC-31).
    model = nextModel(ladderNow(), tried);
  }

  return fail('no_models_left', 'every model in the ladder was tried');
}

/**
 * One HTTP attempt with a real abort deadline. The abort is driven by an
 * injected timer rather than by racing `sleep`, because `sleep` is also the
 * backoff seam and a test that makes backoff instant must not thereby make every
 * request time out.
 */
async function httpAttempt(
  deps: AiDeps,
  cfg: AiLlmTuningConfig,
  model: string,
  body: GeminiRequestBody,
  key: string | null,
  perRequestSec: number,
  timer: TimerFactory,
): Promise<AttemptOutcome> {
  const controller = deps.abortFactory();
  let timedOut = false;
  const cancel = timer(perRequestSec * 1000, () => {
    timedOut = true;
    controller.abort();
  });

  const url = cfg.endpoint_base + '/' + model + ':generateContent';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['x-goog-api-key'] = key;

  try {
    const res = await deps.fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data: unknown = null;
    if (res.status === 200) {
      try {
        data = await res.json();
      } catch {
        return { kind: 'response', status: 200, data: {} };
      }
    }
    const retryAfterRaw = res.headers?.get?.('retry-after') ?? null;
    const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;
    return { kind: 'response', status: res.status, data, retryAfter };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return timedOut ? { kind: 'aborted', detail } : { kind: 'network_error', detail };
  } finally {
    cancel();
  }
}
