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
  resolveCallBudget,
  type AiCredentials,
  type AiLlmTuningConfig,
  type CallBudgetOverrides,
} from './config';
import {
  buildRequestBody,
  parseSuggestions,
  type AiPayload,
  type CallType,
  type GeminiRequestBody,
} from './promptBuilder';

export type { CallType, AiPayload } from './promptBuilder';
export type { CallBudget, CallBudgetOverrides } from './config';

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
  /**
   * Optional so a mock can omit it. On a NON-200 this is where the API's own
   * message lives ("API key not valid", the quota text) and App's
   * `translateGeminiApiError` matches on exactly that string, so it is read
   * (guarded) and threaded into the failure `detail`.
   */
  text?(): Promise<string>;
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
  /**
   * Per-call timeout budget override (plan.md C-10 deviation #2). Highest
   * precedence, above `config.budget_by_call_type`. Use it for the "dai"
   * narration length mode, which asks for ~3000 words and legitimately needs
   * more than the default `narration_call` pair.
   */
  overrides?: CallBudgetOverrides;
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

/**
 * A part with `thought: true` is the model's internal reasoning trace, not the
 * answer. Joining it into the narration leaks chain-of-thought straight into the
 * story text (and into the leak detector's input).
 */
interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}
interface GeminiReply {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

/**
 * Joins the answer parts of candidate 0. Thought parts (`thought === true`) are
 * dropped first; everything else keeps the plain concatenation semantics the
 * shipped App relies on (a multi-part answer must not gain separators).
 */
export function extractText(data: unknown): string {
  const reply = (data ?? {}) as GeminiReply;
  const parts = reply.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => p?.thought !== true)
    .map((p) => p?.text ?? '')
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

/** Non-200 bodies are truncated before they reach a log or a UI string. */
export const MAX_ERROR_DETAIL_CHARS = 500;

function joinDetail(base: string, extra?: string): string {
  return extra && extra.length > 0 ? base + ': ' + extra : base;
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
  // plan.md C-10 deviation #2: the budget is a FUNCTION of `call_type`, not a
  // constant. `narration_call` defaults to 150s logical / 120s per request.
  const budget = resolveCallBudget(cfg, req.call_type, req.overrides);
  const t_start = deps.clock();
  let attempts = 0;

  /**
   * Diagnostics must never change control flow. A throwing `onEvent` (setState
   * on an unmounted tree, a logger with a bad sink) would otherwise propagate
   * out of `requestAi` and leave `in_flight === true` forever - which makes
   * every later call return BUSY with no way back short of a reload.
   */
  const emit = (e: AiEvent): void => {
    try {
      deps.onEvent?.(e);
    } catch {
      /* diagnostics only */
    }
  };

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
  // Deliberately BEFORE `in_flight` is raised: nothing to unwind if it throws.
  const body = req.bodyOverride ?? buildRequestBody(req.call_type, req.payload, cfg);

  /** The whole ladder walk. Every exit path goes through `fail` / `finish`. */
  const run = async (): Promise<AiResult> => {
    // Zero-request failure modes, in the order the pseudocode lists them.
    const key = resolveApiKey(deps.credentials);
    if (key === null) {
      // No usable key: fail BEFORE the ladder - one logical attempt, zero HTTP
      // requests, zero cooldown writes. Walking five models with no key only
      // multiplies one 400 into five and blinds the whole ladder for 90s each.
      if (!deps.credentials) return fail('config_error', 'no credentials provided');
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
    /** Last non-200 body / transport message, threaded into the final detail. */
    let lastDetail: string | undefined;
    /** True when the most recent attempt returned 200 with an EMPTY candidate. */
    let lastWasEmptyText = false;

    while (model !== null) {
      tried.add(model);
      let attempt_index = 0;

      // Inner loop: attempts against the CURRENT model.
      for (;;) {
        const t_rem = budget.ai_call_timeout_seconds - elapsedSec();
        if (t_rem <= 0) return fail('timeout', 'budget exhausted before attempt on ' + model);

        attempts += 1;
        // C-10: per-request deadline = min(request_timeout_default, t_remaining),
        // enforced with a real AbortController so a hung request cannot freeze the
        // game (App.tsx today has no timeout at all).
        const perRequestSec = Math.min(budget.request_timeout_default, t_rem);
        emit({ type: 'request_start', model, elapsed_ms: deps.clock() - t_start });
        const outcome = await httpAttempt(deps, cfg, model, body, key, perRequestSec, timer);
        if (outcome.detail) lastDetail = outcome.detail;
        lastWasEmptyText = false;

        if (outcome.kind === 'response') {
          const status = outcome.status ?? 0;

          if (status === 200) {
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

            if (text !== '') {
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

            // 200 with an EMPTY candidate. The shipped `fetchWithRetries` treats
            // this as a transient glitch, not a verdict, so fall through to the
            // transient block: retry this model, then the next one. It only
            // becomes `parse_failed` once the ladder is exhausted.
            lastWasEmptyText = true;
            lastDetail = 'empty candidate text';
          } else if (status === 429) {
            // Quota: no retry, forward any suggested wait (R5).
            return fail('quota_429', joinDetail('HTTP 429', outcome.detail), outcome.retryAfter);
          } else if (status === 403 || status === 404) {
            // Ported from App.tsx: this model is unusable for THIS key - skip it
            // WITHOUT a cooldown (the model is not overloaded, it is unavailable
            // to this project). DELIBERATE EXCEPTION to the "4xx never walks the
            // ladder" rule below: the next model may well be permitted.
            emit({ type: 'model_switch', model, elapsed_ms: deps.clock() - t_start });
            break;
          } else if (status >= 400 && status < 500) {
            // 400 (malformed request / invalid key), 401, 402, 405+: the REQUEST
            // is wrong, not the model. Retrying repeats it verbatim, walking the
            // ladder multiplies it by the ladder length, and a cooldown write
            // would blind a HEALTHY model for 90s. Return immediately, carrying
            // the API's own message so App's `translateGeminiApiError` sees it.
            return fail('config_error', joinDetail('HTTP ' + status, outcome.detail));
          }
        }

        const cls: ErrorClass =
          outcome.kind === 'response' && outcome.status === 503 ? 'OVERLOADED' : 'TRANSIENT_OTHER';
        // A cooldown asserts "this model is UNAVAILABLE for the next 90s". Only a
        // 503 or a genuine transport failure/timeout is evidence of that; a 500 or
        // an empty candidate is not - those just move on to the next model.
        const earnsCooldown =
          (outcome.kind === 'response' && outcome.status === 503) ||
          outcome.kind === 'network_error' ||
          outcome.kind === 'aborted';

        if (isLastAllowedAttempt(attempt_index, cls, cfg)) {
          // Mark overloaded and switch models IMMEDIATELY, with w = 0.
          if (earnsCooldown) session.cooldown_until[model] = nowSec() + cfg.model_cooldown_seconds;
          if (session.preferred_model === model) session.preferred_model = null;
          session.state = 'retrying_network';
          emit({
            type: 'retrying_network',
            model,
            elapsed_ms: deps.clock() - t_start,
            error_class: cls,
          });
          break;
        }

        const w = backoffSeconds(attempt_index, cls, cfg);
        if (budget.ai_call_timeout_seconds - elapsedSec() <= w) {
          return fail('timeout', 'no budget left for a ' + w + 's backoff');
        }
        session.state = 'retrying_network';
        emit({
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

    if (lastWasEmptyText) {
      // The ladder is exhausted and the API's last word was an empty candidate -
      // now, and only now, is it a parse failure.
      return fail('parse_failed', 'empty candidate text on every model in the ladder');
    }
    return fail('no_models_left', joinDetail('every model in the ladder was tried', lastDetail));
  };

  if (!background) {
    session.in_flight = true;
    session.state = 'requesting';
  }
  try {
    return await run();
  } finally {
    // C.3: `in_flight` is cleared on EVERY exit path, including a throw out of an
    // injected dep, because a leaked flag turns every later call into BUSY.
    if (!background) session.in_flight = false;
  }
}

/**
 * Best-effort read of a NON-200 body.
 *
 * Gemini puts the human-readable cause here ("API key not valid. Please pass a
 * valid API key.", the quota text), and App's `translateGeminiApiError` matches
 * on exactly that string - dropping it turns every failure into a generic one.
 *
 * Guarded twice over: `text()` is optional on the injected seam, and a body that
 * is already consumed, empty, or not text must NEVER turn an HTTP error into a
 * thrown exception. Truncated so a huge HTML error page cannot reach a toast.
 */
async function readErrorBody(res: HttpResponseLike): Promise<string | undefined> {
  const clip = (s: string): string | undefined => {
    const t = s.trim();
    return t.length > 0 ? t.slice(0, MAX_ERROR_DETAIL_CHARS) : undefined;
  };
  try {
    if (typeof res.text === 'function') {
      const raw = await res.text();
      if (typeof raw === 'string') return clip(raw);
    }
  } catch {
    /* fall through to the JSON seam */
  }
  try {
    if (typeof res.json === 'function') {
      const parsed = (await res.json()) as { error?: { message?: string } } | null;
      const message = parsed?.error?.message;
      if (typeof message === 'string') return clip(message);
      const dumped = JSON.stringify(parsed ?? {});
      return dumped === '{}' || dumped === 'null' ? undefined : clip(dumped);
    }
  } catch {
    /* body unreadable - the status code alone has to carry the failure */
  }
  return undefined;
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
    let detail: string | undefined;
    if (res.status === 200) {
      try {
        data = await res.json();
      } catch {
        return { kind: 'response', status: 200, data: {} };
      }
    } else {
      detail = await readErrorBody(res);
    }
    const retryAfterRaw = res.headers?.get?.('retry-after') ?? null;
    const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;
    return { kind: 'response', status: res.status, data, retryAfter, detail };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return timedOut ? { kind: 'aborted', detail } : { kind: 'network_error', detail };
  } finally {
    cancel();
  }
}
