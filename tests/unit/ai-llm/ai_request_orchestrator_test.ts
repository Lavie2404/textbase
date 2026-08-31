/**
 * AI/LLM layer - orchestrator: ladder (F3), error classification (R5),
 * concurrency (C.6), accounting (F4).
 * Design doc: gdd-01 C.4 / C.6 / C.8 (AC-05..AC-08, AC-14..AC-23, AC-31/32).
 */

import { describe, expect, it } from 'vitest';
import {
  CANONICAL_FAIL_LABELS,
  applyStickyPreference,
  healthyLadder,
  logicalCallCount,
  nextModel,
  requestAi,
} from '../../../src-web/systems/ai/requestAi';
import { lockedFixture, makeHarness, okBody } from './fixtures';

const LADDER = { model_ladder: ['A', 'B', 'C'] };
const narration = { call_type: 'narration_call' as const, payload: { locked_result: lockedFixture() } };

describe('F3 pure helpers', () => {
  it('test_healthy_ladder_excludes_cooling_models_and_keeps_order_AC14', () => {
    expect(healthyLadder(['A', 'B', 'C'], { A: 150 }, 100)).toEqual(['B', 'C']);
  });

  it('test_all_cooling_degenerates_to_the_full_list_AC19', () => {
    expect(healthyLadder(['A', 'B'], { A: 150, B: 150 }, 100)).toEqual(['A', 'B']);
  });

  it('test_next_model_skips_tried_and_returns_null_when_exhausted', () => {
    expect(nextModel(['A', 'B'], new Set(['A']))).toBe('B');
    expect(nextModel(['A', 'B'], new Set(['A', 'B']))).toBeNull();
  });

  it('test_sticky_preference_moves_the_last_good_model_to_the_front', () => {
    expect(applyStickyPreference(['A', 'B', 'C'], 'C')).toEqual(['C', 'A', 'B']);
    expect(applyStickyPreference(['A', 'B'], null)).toEqual(['A', 'B']);
  });

  it('test_logical_call_count_is_a_type_set_not_a_multiset_F4', () => {
    expect(logicalCallCount(['narration_call', 'narration_call'])).toBe(1);
    expect(logicalCallCount(['narration_call', 'suggestion_call', 'suggestion_retry_call'])).toBe(3);
  });

  it('test_four_canonical_labels_exist_and_are_distinct_AC32', () => {
    expect(new Set(CANONICAL_FAIL_LABELS).size).toBe(4);
    expect([...CANONICAL_FAIL_LABELS]).toEqual(['timeout', 'no_models_left', 'config_error', 'BUSY']);
  });
});

describe('happy path', () => {
  it('test_success_returns_text_model_attempts_and_elapsed', async () => {
    const h = makeHarness([{ status: 200, body: okBody('Mưa rơi.'), delayMs: 800 }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true, model: 'A', attempts: 1, counted: true });
    expect((r as { text: string }).text).toBe('Mưa rơi.');
    expect((r as { elapsed_ms: number }).elapsed_ms).toBe(800);
    expect(h.calls).toHaveLength(1);
  });

  it('test_request_carries_block_none_safety_settings_AC10', async () => {
    const h = makeHarness([{ status: 200, body: okBody('x') }], LADDER);
    await requestAi(narration, h.deps);
    const sent = h.calls[0].body as { safetySettings: { threshold: string }[] };
    expect(sent.safetySettings.every((s) => s.threshold === 'BLOCK_NONE')).toBe(true);
  });

  it('test_session_returns_to_idle_and_records_a_success_log', async () => {
    const h = makeHarness([{ status: 200, body: okBody('x') }], LADDER);
    await requestAi(narration, h.deps);
    expect(h.deps.session.in_flight).toBe(false);
    expect(h.deps.session.log[0].label).toBe('success');
    expect(h.deps.session.preferred_model).toBe('A');
  });

  it('test_sticky_model_is_tried_first_on_the_next_call', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i === 0 ? { status: 503 } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    await requestAi(narration, h.deps);
    expect(h.deps.session.preferred_model).toBe('B');
    await requestAi(narration, h.deps);
    expect(h.calls[h.calls.length - 1].model).toBe('B');
  });
});

describe('attempt_end diagnostics event (2026-08-31)', () => {
  it('test_every_http_attempt_emits_attempt_end_with_status_and_duration', async () => {
    // Arrange: A answers 503 after 700ms, B answers 200 after 800ms.
    const h = makeHarness(
      (_u, _i, i) =>
        i === 0 ? { status: 503, delayMs: 700 } : { status: 200, body: okBody('ok'), delayMs: 800 },
      LADDER,
    );
    const events: { type: string; model: string; attempt_outcome?: unknown; attempt_ms?: number }[] = [];
    h.deps.onEvent = (e) => events.push(e);

    // Act
    await requestAi(narration, h.deps);

    // Assert: one attempt_end per HTTP attempt, carrying outcome + latency.
    const ends = events.filter((e) => e.type === 'attempt_end');
    expect(ends).toHaveLength(2);
    expect(ends[0]).toMatchObject({ model: 'A', attempt_outcome: 503, attempt_ms: 700 });
    expect(ends[1]).toMatchObject({ model: 'B', attempt_outcome: 200, attempt_ms: 800 });
  });

  it('test_a_transport_failure_reports_network_error_as_the_attempt_outcome', async () => {
    const h = makeHarness(
      (_u, _i, i) =>
        i === 0
          ? { status: 0, throwError: 'connection reset', delayMs: 100 }
          : { status: 200, body: okBody('ok') },
      LADDER,
    );
    const events: { type: string; attempt_outcome?: unknown }[] = [];
    h.deps.onEvent = (e) => events.push(e);

    await requestAi(narration, h.deps);

    const ends = events.filter((e) => e.type === 'attempt_end');
    expect(ends[0]).toMatchObject({ attempt_outcome: 'network_error' });
  });
});

describe('error classification (R5)', () => {
  it('test_503_marks_a_cooldown_and_falls_through_to_the_next_model_AC07', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i === 0 ? { status: 503 } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true, model: 'B', attempts: 2 });
    expect(h.deps.session.cooldown_until.A).toBeGreaterThan(0);
  });

  it('test_cooldown_is_the_configured_ninety_seconds', async () => {
    const h = makeHarness(
      (_u, _i, i) => (i === 0 ? { status: 503 } : { status: 200, body: okBody('ok') }),
      LADDER,
    );
    const before = h.clock.now() / 1000;
    await requestAi(narration, h.deps);
    expect(h.deps.session.cooldown_until.A - before).toBeCloseTo(90, 5);
  });

  it('test_429_fails_immediately_with_its_own_label_and_forwards_retry_after_AC08', async () => {
    const h = makeHarness([{ status: 429, headers: { 'retry-after': '30' } }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'quota_429', attempts: 1, retry_after: 30 });
    expect(h.calls).toHaveLength(1);
  });

  it('test_401_is_a_config_error_with_no_retry', async () => {
    const h = makeHarness([{ status: 401 }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 1 });
  });

  it('test_403_and_404_skip_the_model_without_a_cooldown', async () => {
    const h = makeHarness(
      (_u, _i, i) =>
        i === 0 ? { status: 403 } : i === 1 ? { status: 404 } : { status: 200, body: okBody('ok') },
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true, model: 'C', attempts: 3 });
    expect(h.deps.session.cooldown_until.A).toBeUndefined();
  });

  it('test_whole_ladder_503_ends_in_no_models_left_never_a_fabricated_success', async () => {
    const h = makeHarness([{ status: 503 }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'no_models_left', attempts: 3 });
  });

  it('test_tried_is_monotonic_so_the_ladder_cannot_loop_AC31', async () => {
    const h = makeHarness([{ status: 503 }], LADDER);
    await requestAi(narration, h.deps);
    expect(h.calls.map((c) => c.model)).toEqual(['A', 'B', 'C']);
  });

  it('test_prompt_feedback_block_reason_is_a_safety_failure', async () => {
    const h = makeHarness(
      [{ status: 200, body: { promptFeedback: { blockReason: 'SAFETY' } } }],
      LADDER,
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'safety_blocked', attempts: 1 });
  });

  it('test_max_tokens_with_no_text_is_a_truncation_failure', async () => {
    const h = makeHarness([{ status: 200, body: okBody('', 'MAX_TOKENS') }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'truncated' });
  });

  it('test_max_tokens_with_text_returns_the_text_flagged_as_truncated', async () => {
    const h = makeHarness([{ status: 200, body: okBody('nửa câu', 'MAX_TOKENS') }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true, truncated: true });
  });

  it('test_network_throw_is_a_transient_error_not_a_crash', async () => {
    const h = makeHarness([{ status: 0, throwError: 'ECONNRESET' }], {
      ...LADDER,
      max_same_model_attempts_transient: 1,
    });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'no_models_left' });
    expect(h.calls).toHaveLength(3);
  });
});
