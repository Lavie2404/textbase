/**
 * AI/LLM layer - F1 backoff, F2 budget/abort, concurrency, internal retries.
 * Design doc: gdd-01 C.4 F1/F2, C.6, AC-05, AC-11..AC-13, AC-15..AC-23, AC-30.
 */

import { describe, expect, it } from 'vitest';
import {
  backoffSeconds,
  isLastAllowedAttempt,
  requestAi,
} from '../../../src-web/systems/ai/requestAi';
import { ContractCheckpointError } from '../../../src-web/systems/ai/promptBuilder';
import { makeAiConfig } from '../../../src-web/systems/ai/config';
import { lockedFixture, makeHarness, okBody, suggestionsBody } from './fixtures';

const LADDER = { model_ladder: ['A', 'B', 'C'] };
const narration = { call_type: 'narration_call' as const, payload: { locked_result: lockedFixture() } };

describe('F1 backoff', () => {
  it('test_overloaded_wait_is_the_fixed_two_seconds_AC12', () => {
    expect(backoffSeconds(0, 'OVERLOADED')).toBe(2);
    expect(backoffSeconds(5, 'OVERLOADED')).toBe(2);
  });

  it('test_transient_wait_is_linear_in_attempt_index_AC12', () => {
    expect(backoffSeconds(0, 'TRANSIENT_OTHER')).toBe(1);
    expect(backoffSeconds(1, 'TRANSIENT_OTHER')).toBe(2);
    expect(backoffSeconds(2, 'TRANSIENT_OTHER')).toBe(3);
  });

  it('test_last_allowed_attempt_uses_greater_or_equal_never_equality', () => {
    const cfg = makeAiConfig({ max_same_model_attempts_overloaded: 1, max_same_model_attempts_transient: 2 });
    expect(isLastAllowedAttempt(0, 'OVERLOADED', cfg)).toBe(true);
    expect(isLastAllowedAttempt(0, 'TRANSIENT_OTHER', cfg)).toBe(false);
    expect(isLastAllowedAttempt(1, 'TRANSIENT_OTHER', cfg)).toBe(true);
    expect(isLastAllowedAttempt(9, 'OVERLOADED', cfg)).toBe(true);
  });

  it('test_transient_error_sleeps_once_then_switches_model', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i < 2 ? { status: 500 } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(h.sleeps).toEqual([1000]);
    expect(r).toMatchObject({ ok: true, model: 'B', attempts: 3 });
  });

  it('test_last_allowed_attempt_switches_with_no_wait_at_all', async () => {
    const h = makeHarness([{ status: 503 }], LADDER);
    await requestAi(narration, h.deps);
    expect(h.sleeps).toEqual([]);
  });
});

describe('F2 budget', () => {
  it('test_per_request_timeout_is_min_of_default_and_remaining_AC13', async () => {
    const h = makeHarness([{ status: 503, delayMs: 45_000 }], LADDER);
    await requestAi(narration, h.deps);
    expect(h.timerLog[0]).toBe(45_000);
    expect(h.timerLog[1]).toBe(15_000);
  });

  it('test_failure_is_labelled_timeout_when_the_budget_is_gone_AC11', async () => {
    const h = makeHarness([{ status: 503, delayMs: 45_000 }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'timeout', attempts: 2 });
    expect(h.calls).toHaveLength(2);
  });

  it('test_no_http_attempt_starts_after_the_budget_gate_closes', async () => {
    const h = makeHarness([{ status: 500, delayMs: 59_000 }], {
      ...LADDER,
      max_same_model_attempts_transient: 3,
    });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'timeout' });
    expect(h.calls).toHaveLength(1);
  });

  it('test_abort_controller_fires_on_the_per_request_deadline', async () => {
    // One model, one allowed attempt: the aborted attempt is the last one, so
    // the call terminates instead of arming a second hanging request.
    const h = makeHarness([{ status: 200, hang: true }], {
      model_ladder: ['A'],
      max_same_model_attempts_transient: 1,
    });
    const pending = requestAi(narration, h.deps);
    await Promise.resolve();
    h.fireAllTimers();
    const r = await pending;
    expect(h.aborts).toBe(1);
    expect(r).toMatchObject({ ok: false, label: 'no_models_left', attempts: 1 });
  });

  it('test_every_request_receives_an_abort_signal', async () => {
    const h = makeHarness([{ status: 200, body: okBody('ok') }], LADDER);
    await requestAi(narration, h.deps);
    expect(h.calls[0].init.signal).toBeDefined();
  });
});

describe('zero-request failure modes', () => {
  it('test_empty_model_ladder_is_a_config_error_with_no_requests_AC20', async () => {
    const h = makeHarness([{ status: 200 }], { model_ladder: [] });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 0 });
    expect(h.calls).toHaveLength(0);
  });

  it('test_user_key_mode_with_an_empty_key_is_not_configured_AC23', async () => {
    const h = makeHarness([{ status: 200 }], LADDER, {
      credentials: { apiMode: 'userKey', userKey: '' },
    });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'not_configured', attempts: 0 });
    expect(h.calls).toHaveLength(0);
  });

  it('test_narration_without_locked_result_throws_before_any_request_AC02', async () => {
    const h = makeHarness([{ status: 200 }], LADDER);
    await expect(requestAi({ call_type: 'narration_call', payload: {} }, h.deps)).rejects.toThrow(
      ContractCheckpointError,
    );
    expect(h.calls).toHaveLength(0);
  });

  it('test_the_resolved_key_is_sent_as_a_header_and_nowhere_else', async () => {
    const h = makeHarness([{ status: 200, body: okBody('ok') }], LADDER, {
      credentials: { apiMode: 'userKey', userKey: 'secret-key' },
    });
    await requestAi(narration, h.deps);
    expect(h.calls[0].init.headers['x-goog-api-key']).toBe('secret-key');
    expect(h.calls[0].url).not.toContain('secret-key');
    expect(h.calls[0].init.body).not.toContain('secret-key');
  });
});

describe('concurrency (C.6 / AC-21 / AC-30)', () => {
  it('test_second_call_while_the_first_is_unresolved_is_rejected_busy', async () => {
    let release: (v: unknown) => void = () => {};
    const gate = new Promise((res) => {
      release = res;
    });
    const h = makeHarness([{ status: 200, body: okBody('ok'), gate }], LADDER);
    const first = requestAi(narration, h.deps);
    const second = await requestAi(narration, h.deps);
    expect(second).toMatchObject({ ok: false, label: 'BUSY', attempts: 0, counted: false });
    expect(h.calls).toHaveLength(1);
    release(null);
    await expect(first).resolves.toMatchObject({ ok: true });
  });

  it('test_busy_is_logged_under_its_own_label_AC32', async () => {
    let release: (v: unknown) => void = () => {};
    const gate = new Promise((res) => {
      release = res;
    });
    const h = makeHarness([{ status: 200, body: okBody('ok'), gate }], LADDER);
    const first = requestAi(narration, h.deps);
    await requestAi(narration, h.deps);
    expect(h.deps.session.log.map((l) => l.label)).toContain('BUSY');
    release(null);
    await first;
  });

  it('test_a_new_call_succeeds_after_the_first_resolves_no_permanent_lock', async () => {
    const h = makeHarness([{ status: 200, body: okBody('một') }], LADDER);
    await requestAi(narration, h.deps);
    const second = await requestAi(narration, h.deps);
    expect(second).toMatchObject({ ok: true });
  });

  it('test_background_calls_bypass_busy_and_are_not_counted_C9', async () => {
    let release: (v: unknown) => void = () => {};
    const gate = new Promise((res) => {
      release = res;
    });
    const h = makeHarness(
      (_u, _i, i) =>
        i === 0
          ? { status: 200, body: okBody('chính'), gate }
          : { status: 200, body: okBody('[]') },
      LADDER,
    );
    const first = requestAi(narration, h.deps);
    const bg = await requestAi(
      { call_type: 'suggestion_call', payload: { allowed_envelope_menu: [] }, background: true },
      h.deps,
    );
    // The background call was NOT rejected as BUSY and does not count.
    expect(bg.counted).toBe(false);
    expect(bg.label).not.toBe('BUSY');
    release(null);
    await expect(first).resolves.toMatchObject({ ok: true });
  });

  it('test_background_flag_is_recorded_in_the_session_log', async () => {
    const h = makeHarness([{ status: 200, body: okBody('x') }], LADDER);
    await requestAi({ ...narration, background: true }, h.deps);
    expect(h.deps.session.log[0].background).toBe(true);
    expect(h.deps.session.in_flight).toBe(false);
  });
});

describe('internal retries and accounting (F4)', () => {
  it('test_three_internal_http_attempts_are_one_logical_call_AC05_AC15', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i < 2 ? { status: 503 } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true, attempts: 3, counted: true });
    expect(h.deps.session.log.filter((l) => l.label === 'success')).toHaveLength(1);
  });

  it('test_locked_result_is_byte_identical_on_every_internal_attempt_AC16', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i < 2 ? { status: 503 } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    const before = JSON.stringify(narration.payload.locked_result);
    await requestAi(narration, h.deps);
    const bodies = h.calls.map((c) => JSON.stringify(c.body));
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.stringify(narration.payload.locked_result)).toBe(before);
  });

  it('test_malformed_then_valid_json_succeeds_via_one_internal_parse_retry_AC17', async () => {
    const h = makeHarness(
      (_u, _i, i) =>
        i === 0
          ? { status: 200, body: okBody('{broken') }
          : { status: 200, body: suggestionsBody([{ text: 'A', envelope: 'talk' }]) },
      LADDER,
    );
    const r = await requestAi(
      { call_type: 'suggestion_call', payload: { allowed_envelope_menu: ['talk'] } },
      h.deps,
    );
    expect(r).toMatchObject({ ok: true, attempts: 2 });
  });

  it('test_malformed_twice_fails_and_never_returns_broken_json_AC17', async () => {
    const h = makeHarness([{ status: 200, body: okBody('{broken') }], LADDER);
    const r = await requestAi(
      { call_type: 'suggestion_call', payload: { allowed_envelope_menu: ['talk'] } },
      h.deps,
    );
    expect(r).toMatchObject({ ok: false, label: 'parse_failed' });
    expect(r).not.toHaveProperty('suggestions');
  });

  it('test_out_of_menu_envelope_is_treated_like_malformed_json_AC25', async () => {
    const h = makeHarness([{ status: 200, body: suggestionsBody([{ text: 'A', envelope: 'nuke' }]) }], LADDER);
    const r = await requestAi(
      { call_type: 'suggestion_call', payload: { allowed_envelope_menu: ['talk'] } },
      h.deps,
    );
    expect(r).toMatchObject({ ok: false, label: 'parse_failed', attempts: 2 });
  });

  it('test_leaking_narration_is_returned_byte_identical_AC18', async () => {
    const leaky = 'Ngươi mất 47 máu.';
    const h = makeHarness([{ status: 200, body: okBody(leaky) }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect((r as { text: string }).text).toBe(leaky);
  });
});
