/**
 * AI/LLM layer - failure classification, per-call-type budgets, and the
 * in-flight guard. Regression suite for the P4b code review:
 *
 *  A1 4xx (other than 429/403/404) is non-retryable and writes NO cooldown
 *  A2 per-call-type timeout budgets (plan.md C-10 deviation #2)
 *  A3 `in_flight` is cleared in a `finally`; `onEvent` cannot wedge BUSY
 *  A4 `extractText` drops `thought` parts
 *  A5 the API's own error message survives into `detail`
 *  A6 an empty candidate is transient, not an immediate hard failure
 *  A7 an unresolvable key fails before the ladder walk
 */

import { describe, expect, it } from 'vitest';
import {
  createAiSessionState,
  extractText,
  requestAi,
  type AiEvent,
} from '../../../src-web/systems/ai/requestAi';
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_CALL_BUDGETS,
  makeAiConfig,
  resolveCallBudget,
  validateAiConfig,
} from '../../../src-web/systems/ai/config';
import { AI_KNOBS } from '../../../src-web/systems/registry';
import { lockedFixture, makeHarness, okBody, suggestionsBody } from './fixtures';

const LADDER = { model_ladder: ['A', 'B', 'C'] };
const narration = { call_type: 'narration_call' as const, payload: { locked_result: lockedFixture() } };
const suggestion = {
  call_type: 'suggestion_call' as const,
  payload: { allowed_envelope_menu: ['talk'] },
};

/** Verbatim shape of a real Gemini 400 body. */
const BAD_KEY_BODY = JSON.stringify({
  error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' },
});

describe('A1 - 4xx is non-retryable and never writes a cooldown', () => {
  it('test_400_returns_immediately_without_walking_the_ladder', async () => {
    const h = makeHarness([{ status: 400, errorBody: BAD_KEY_BODY }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 1 });
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].model).toBe('A');
  });

  it('test_400_writes_no_model_cooldown', async () => {
    const h = makeHarness([{ status: 400, errorBody: BAD_KEY_BODY }], LADDER);
    await requestAi(narration, h.deps);
    expect(h.deps.session.cooldown_until).toEqual({});
  });

  it('test_400_detail_carries_the_api_message_for_translateGeminiApiError', async () => {
    const h = makeHarness([{ status: 400, errorBody: BAD_KEY_BODY }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect((r as { detail: string }).detail).toContain('API key not valid');
    expect((r as { detail: string }).detail).toContain('400');
  });

  it('test_other_4xx_codes_share_the_same_non_retryable_class', async () => {
    for (const status of [402, 405, 422, 451]) {
      const h = makeHarness([{ status, errorBody: 'nope' }], LADDER);
      const r = await requestAi(narration, h.deps);
      expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 1 });
      expect(h.deps.session.cooldown_until).toEqual({});
    }
  });

  it('test_401_still_reports_config_error_and_no_cooldown', async () => {
    const h = makeHarness([{ status: 401, errorBody: 'unauthenticated' }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 1 });
    expect(h.deps.session.cooldown_until).toEqual({});
    expect((r as { detail: string }).detail).toContain('unauthenticated');
  });

  it('test_403_and_404_remain_the_documented_ladder_walking_exception', async () => {
    const h = makeHarness(
      (_u, _i, i) =>
        i === 0 ? { status: 403 } : i === 1 ? { status: 404 } : { status: 200, body: okBody('ok') },
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true, model: 'C' });
    expect(h.deps.session.cooldown_until).toEqual({});
  });

  it('test_only_503_and_transport_failures_earn_a_cooldown', async () => {
    const only503 = makeHarness([{ status: 503 }], { ...LADDER, model_ladder: ['A'] });
    await requestAi(narration, only503.deps);
    expect(only503.deps.session.cooldown_until.A).toBeGreaterThan(0);

    const only500 = makeHarness([{ status: 500 }], {
      model_ladder: ['A'],
      max_same_model_attempts_transient: 1,
    });
    await requestAi(narration, only500.deps);
    expect(only500.deps.session.cooldown_until).toEqual({});

    const dropped = makeHarness([{ status: 0, throwError: 'ECONNRESET' }], {
      model_ladder: ['A'],
      max_same_model_attempts_transient: 1,
    });
    await requestAi(narration, dropped.deps);
    expect(dropped.deps.session.cooldown_until.A).toBeGreaterThan(0);
  });

  it('test_a_400_body_that_cannot_be_read_still_classifies_by_status', async () => {
    const h = makeHarness([{ status: 400 }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', detail: 'HTTP 400' });
  });
});

describe('A2 - per-call-type timeout budgets (plan.md C-10 deviation #2)', () => {
  it('test_default_config_gives_narration_150_over_120', () => {
    expect(DEFAULT_CALL_BUDGETS.narration_call).toEqual({
      ai_call_timeout_seconds: 150,
      request_timeout_default: 120,
    });
    expect(DEFAULT_AI_CONFIG.budget_by_call_type).toBe(DEFAULT_CALL_BUDGETS);
    expect(AI_KNOBS.narration_call_timeout_seconds).toBe(150);
    expect(AI_KNOBS.narration_request_timeout_default).toBe(120);
  });

  it('test_short_and_background_call_types_keep_60_over_45', () => {
    const b = resolveCallBudget(DEFAULT_AI_CONFIG, 'suggestion_call');
    expect(b).toEqual({ ai_call_timeout_seconds: 60, request_timeout_default: 45 });
    expect(resolveCallBudget(DEFAULT_AI_CONFIG, 'suggestion_retry_call')).toEqual(b);
    expect(resolveCallBudget(DEFAULT_AI_CONFIG, 'some_future_background_call')).toEqual(b);
  });

  it('test_request_overrides_outrank_the_call_type_map', () => {
    expect(
      resolveCallBudget(DEFAULT_AI_CONFIG, 'narration_call', { ai_call_timeout_seconds: 200 }),
    ).toEqual({ ai_call_timeout_seconds: 200, request_timeout_default: 120 });
    expect(
      resolveCallBudget(DEFAULT_AI_CONFIG, 'narration_call', { request_timeout_default: 30 }),
    ).toEqual({ ai_call_timeout_seconds: 150, request_timeout_default: 30 });
  });

  it('test_per_request_budget_is_clamped_below_the_logical_budget', () => {
    const b = resolveCallBudget(DEFAULT_AI_CONFIG, 'narration_call', {
      ai_call_timeout_seconds: 20,
    });
    expect(b.request_timeout_default).toBe(20);
  });

  it('test_an_inverted_per_call_type_pair_is_a_reported_config_problem', () => {
    const problems = validateAiConfig(
      makeAiConfig({
        budget_by_call_type: {
          narration_call: { ai_call_timeout_seconds: 60, request_timeout_default: 90 },
        },
      }),
    );
    expect(problems.map((p) => p.knob)).toContain('budget_by_call_type.narration_call');
  });

  it('test_narration_arms_a_120s_deadline_while_suggestions_arm_45s', async () => {
    const budgets = { budget_by_call_type: DEFAULT_CALL_BUDGETS };
    const hN = makeHarness([{ status: 200, body: okBody('ok') }], { ...LADDER, ...budgets });
    await requestAi(narration, hN.deps);
    expect(hN.timerLog[0]).toBe(120_000);

    const hS = makeHarness([{ status: 200, body: suggestionsBody([{ text: 'A', envelope: 'talk' }]) }], {
      ...LADDER,
      ...budgets,
    });
    await requestAi(suggestion, hS.deps);
    expect(hS.timerLog[0]).toBe(45_000);
  });

  it('test_a_dai_narration_can_raise_its_own_budget_per_call', async () => {
    const h = makeHarness([{ status: 200, body: okBody('ok') }], {
      ...LADDER,
      budget_by_call_type: DEFAULT_CALL_BUDGETS,
    });
    await requestAi({ ...narration, overrides: { request_timeout_default: 140, ai_call_timeout_seconds: 180 } }, h.deps);
    expect(h.timerLog[0]).toBe(140_000);
  });
});

describe('A3 - in_flight is released on every path', () => {
  it('test_a_throwing_dep_still_clears_in_flight', async () => {
    const h = makeHarness([{ status: 500 }], { ...LADDER, max_same_model_attempts_transient: 2 });
    h.deps.sleep = async () => {
      throw new Error('sleep exploded');
    };
    await expect(requestAi(narration, h.deps)).rejects.toThrow('sleep exploded');
    expect(h.deps.session.in_flight).toBe(false);

    // The session is usable again: the next call must not be rejected as BUSY.
    const second = await requestAi(narration, { ...h.deps, sleep: async () => {} });
    expect((second as { label?: string }).label).not.toBe('BUSY');
  });

  it('test_a_throwing_onEvent_cannot_wedge_the_layer_in_BUSY', async () => {
    const seen: AiEvent[] = [];
    const h = makeHarness([{ status: 200, body: okBody('ok') }], LADDER, {
      onEvent: (e) => {
        seen.push(e);
        throw new Error('setState on an unmounted component');
      },
    });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true });
    expect(seen).toHaveLength(1);
    expect(h.deps.session.in_flight).toBe(false);
  });

  it('test_background_calls_never_touch_the_in_flight_flag', async () => {
    const session = createAiSessionState();
    session.in_flight = true;
    const h = makeHarness([{ status: 200, body: okBody('ok') }], LADDER, { session });
    const r = await requestAi({ ...narration, background: true }, h.deps);
    expect(r).toMatchObject({ ok: true, counted: false });
    expect(session.in_flight).toBe(true);
  });
});

describe('A4 - extractText drops thought parts', () => {
  it('test_thought_parts_are_not_joined_into_the_answer', () => {
    const data = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'Ta nen mo ta canh mua roi truoc.', thought: true },
              { text: 'Mua roi tren mai ngoi.' },
            ],
          },
        },
      ],
    };
    expect(extractText(data)).toBe('Mua roi tren mai ngoi.');
  });

  it('test_multi_part_answers_still_join_without_separators', () => {
    const data = {
      candidates: [{ content: { parts: [{ text: 'Mua roi ' }, { text: 'tren mai ngoi.' }] } }],
    };
    expect(extractText(data)).toBe('Mua roi tren mai ngoi.');
  });

  it('test_a_thought_only_candidate_reads_as_empty', () => {
    const data = { candidates: [{ content: { parts: [{ text: 'suy nghi', thought: true }] } }] };
    expect(extractText(data)).toBe('');
  });
});

describe('A5/A6 - error bodies and empty candidates', () => {
  it('test_429_forwards_the_quota_message_alongside_retry_after', async () => {
    const h = makeHarness(
      [{ status: 429, errorBody: 'Quota exceeded for quota metric', headers: { 'retry-after': '30' } }],
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'quota_429', retry_after: 30 });
    expect((r as { detail: string }).detail).toContain('Quota exceeded');
  });

  it('test_the_last_error_body_survives_into_no_models_left', async () => {
    const h = makeHarness([{ status: 503, errorBody: 'The model is overloaded.' }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'no_models_left' });
    expect((r as { detail: string }).detail).toContain('The model is overloaded.');
  });

  it('test_an_empty_candidate_retries_the_same_model_then_the_next_one', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i < 2 ? { status: 200, body: okBody('') } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true, model: 'B', attempts: 3 });
  });

  it('test_an_empty_candidate_never_writes_a_cooldown', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i < 2 ? { status: 200, body: okBody('') } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    await requestAi(narration, h.deps);
    expect(h.deps.session.cooldown_until).toEqual({});
  });

  it('test_empty_on_every_model_fails_parse_failed_only_at_the_end', async () => {
    const h = makeHarness([{ status: 200, body: okBody('') }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'parse_failed' });
    expect(h.calls.map((c) => c.model)).toEqual(['A', 'A', 'B', 'B', 'C', 'C']);
  });

  it('test_max_tokens_with_an_empty_candidate_is_still_an_immediate_truncation', async () => {
    const h = makeHarness([{ status: 200, body: okBody('', 'MAX_TOKENS') }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'truncated', attempts: 1 });
  });
});

describe('A7 - an unresolvable key fails before the ladder', () => {
  it('test_absent_credentials_are_a_config_error_with_zero_requests', async () => {
    const h = makeHarness([{ status: 200, body: okBody('ok') }], LADDER, { credentials: undefined });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 0 });
    expect(h.calls).toHaveLength(0);
    expect(h.deps.session.cooldown_until).toEqual({});
    expect(h.deps.session.in_flight).toBe(false);
  });

  it('test_default_mode_with_no_project_key_is_a_config_error', async () => {
    const h = makeHarness([{ status: 200, body: okBody('ok') }], LADDER, {
      credentials: { apiMode: 'default' },
    });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 0 });
    expect(h.calls).toHaveLength(0);
  });
});
