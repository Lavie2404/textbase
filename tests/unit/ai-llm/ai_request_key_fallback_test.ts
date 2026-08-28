/**
 * AI/LLM layer - API-key fallback pool (project decision 2026-08-28: one main
 * key + two spares, "whichever key still has quota").
 *
 *  K1 `parseKeyList` / `resolveApiKeys` / `buildAiCredentials` build the pool
 *  K2 a 429 on the active key hands the SAME request to the next key
 *  K3 the pool is walked in order and never re-asks a key that answered 429
 *  K4 a key that answered 429 is skipped on LATER calls until its breaker expires
 *  K5 "API key not valid" (400/401) also rolls over; a malformed 400 does not
 *  K6 model cooldowns (503) survive a key switch; a single-key build is unchanged
 *  K7 `key_quota_cooldown_seconds` is validated
 */

import { describe, expect, it } from 'vitest';
import {
  healthyKeys,
  looksLikeKeyRejection,
  quotaCooldownSeconds,
  requestAi,
  type AiEvent,
} from '../../../src-web/systems/ai/requestAi';
import {
  makeAiConfig,
  parseKeyList,
  resolveApiKeys,
  validateAiConfig,
} from '../../../src-web/systems/ai/config';
import { buildAiCredentials, credentialsAreUsable } from '../../../src-web/systems/glue/turnGlue';
import { AI_KNOBS } from '../../../src-web/systems/registry';
import { lockedFixture, makeHarness, okBody, type ScriptedResponse } from './fixtures';
import type { FetchInit } from '../../../src-web/systems/ai/requestAi';

const LADDER = { model_ladder: ['A', 'B', 'C'] };
const narration = { call_type: 'narration_call' as const, payload: { locked_result: lockedFixture() } };

const MAIN = 'key-main';
const SPARE_1 = 'key-spare-1';
const SPARE_2 = 'key-spare-2';
const POOL = { apiMode: 'default' as const, defaultKey: MAIN, fallbackKeys: [SPARE_1, SPARE_2] };

/** Verbatim shape of the Gemini bodies the pool reacts to. */
const QUOTA_BODY = JSON.stringify({ error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } });
const BAD_KEY_BODY = JSON.stringify({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } });
const MALFORMED_BODY = JSON.stringify({ error: { code: 400, message: 'Invalid JSON payload received.', status: 'INVALID_ARGUMENT' } });

const keyOf = (init: FetchInit): string => init.headers['x-goog-api-key'];

/** Scripts one response PER KEY, regardless of model or attempt index. */
function byKey(table: Record<string, ScriptedResponse>) {
  return (_url: string, init: FetchInit): ScriptedResponse => {
    const spec = table[keyOf(init)];
    if (!spec) throw new Error('unscripted key ' + keyOf(init));
    return spec;
  };
}

// ---------------------------------------------------------------------------
// K1 - building the pool
// ---------------------------------------------------------------------------

describe('K1 - the key pool is built from the env list and the mode primary', () => {
  it('test_parseKeyList_splits_on_commas_newlines_and_dedupes', () => {
    expect(parseKeyList('a, b\nc;;a  d')).toEqual(['a', 'b', 'c', 'd']);
    expect(parseKeyList('   ')).toEqual([]);
    expect(parseKeyList(undefined)).toEqual([]);
    expect(parseKeyList(42)).toEqual([]);
  });

  it('test_resolveApiKeys_puts_the_primary_first_then_spares_without_duplicates', () => {
    expect(resolveApiKeys({ apiMode: 'default', defaultKey: MAIN, fallbackKeys: [SPARE_1, MAIN, ' ', SPARE_2] }))
      .toEqual([MAIN, SPARE_1, SPARE_2]);
    expect(resolveApiKeys({ apiMode: 'userKey', userKey: 'u', fallbackKeys: [SPARE_1] })).toEqual(['u', SPARE_1]);
  });

  it('test_resolveApiKeys_with_an_empty_primary_still_yields_the_spares', () => {
    expect(resolveApiKeys({ apiMode: 'default', defaultKey: '', fallbackKeys: [SPARE_1, SPARE_2] })).toEqual([SPARE_1, SPARE_2]);
    expect(resolveApiKeys({ apiMode: 'userKey', userKey: '  ', fallbackKeys: [SPARE_1] })).toEqual([SPARE_1]);
    expect(resolveApiKeys({ apiMode: 'default' })).toEqual([]);
    expect(resolveApiKeys(undefined)).toEqual([]);
  });

  it('test_buildAiCredentials_attaches_spares_in_both_modes_minus_the_primary', () => {
    const user = buildAiCredentials({ apiMode: 'userKey', apiKey: 'u', fallbackKeys: [SPARE_1, 'u', SPARE_2] });
    expect(user).toEqual({ apiMode: 'userKey', userKey: 'u', fallbackKeys: [SPARE_1, SPARE_2] });
    const platform = buildAiCredentials({ apiMode: 'defaultGemini', defaultKey: MAIN, fallbackKeys: [SPARE_1] });
    expect(platform).toEqual({ apiMode: 'default', defaultKey: MAIN, fallbackKeys: [SPARE_1] });
  });

  it('test_buildAiCredentials_without_spares_keeps_the_pre_pool_shape', () => {
    expect(buildAiCredentials({ apiMode: 'userKey', apiKey: 'u', fallbackKeys: [] })).toEqual({ apiMode: 'userKey', userKey: 'u' });
    expect(buildAiCredentials({ apiMode: 'defaultGemini', fallbackKeys: [' '] })).toEqual({ apiMode: 'default', defaultKey: '' });
  });

  it('test_spares_alone_make_a_keyless_build_usable', () => {
    const creds = buildAiCredentials({ apiMode: 'defaultGemini', fallbackKeys: [SPARE_1, SPARE_2] });
    expect(creds).toEqual({ apiMode: 'default', defaultKey: '', fallbackKeys: [SPARE_1, SPARE_2] });
    expect(credentialsAreUsable(creds)).toBe(true);
    expect(resolveApiKeys(creds)).toEqual([SPARE_1, SPARE_2]);
  });

  it('test_healthyKeys_keeps_pool_order_and_probes_one_key_when_all_are_cooling', () => {
    const keys = [MAIN, SPARE_1, SPARE_2];
    expect(healthyKeys(keys, {}, 100)).toEqual([
      { key: MAIN, index: 0 },
      { key: SPARE_1, index: 1 },
      { key: SPARE_2, index: 2 },
    ]);
    expect(healthyKeys(keys, { [MAIN]: 160 }, 100)).toEqual([
      { key: SPARE_1, index: 1 },
      { key: SPARE_2, index: 2 },
    ]);
    // All cooling: ONE probe, the key that recovers soonest.
    expect(healthyKeys(keys, { [MAIN]: 160, [SPARE_1]: 130, [SPARE_2]: 190 }, 100)).toEqual([{ key: SPARE_1, index: 1 }]);
    expect(healthyKeys([], {}, 100)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// K2 - 429 rolls over to the next key
// ---------------------------------------------------------------------------

describe('K2 - a 429 on the active key hands the same request to the next key', () => {
  it('test_429_on_main_retries_the_same_model_with_the_first_spare_and_succeeds', async () => {
    const h = makeHarness(
      byKey({ [MAIN]: { status: 429, errorBody: QUOTA_BODY }, [SPARE_1]: { status: 200, body: okBody('ok') } }),
      LADDER,
      { credentials: POOL },
    );
    const events: AiEvent[] = [];
    h.deps.onEvent = (e) => events.push(e);

    const r = await requestAi(narration, h.deps);

    expect(r).toMatchObject({ ok: true, text: 'ok', model: 'A', attempts: 2 });
    expect(h.calls.map((c) => [c.model, keyOf(c.init)])).toEqual([
      ['A', MAIN],
      ['A', SPARE_1],
    ]);
    expect(events.filter((e) => e.type === 'key_switch')).toEqual([
      { type: 'key_switch', model: 'A', elapsed_ms: 0, key_index: 1 },
    ]);
    expect(h.deps.session.log.at(-1)).toMatchObject({ label: 'success', key_index: 1 });
  });

  it('test_429_opens_the_key_breaker_for_the_knob_length_when_no_retry_after', async () => {
    const h = makeHarness(
      byKey({ [MAIN]: { status: 429, errorBody: QUOTA_BODY }, [SPARE_1]: { status: 200, body: okBody('ok') } }),
      LADDER,
      { credentials: POOL },
    );
    const nowSec = h.clock.now() / 1000;

    await requestAi(narration, h.deps);

    expect(h.deps.session.key_cooldown_until).toEqual({ [MAIN]: nowSec + AI_KNOBS.key_quota_cooldown_seconds });
    // The MODEL was not at fault - no model cooldown is written for a 429.
    expect(h.deps.session.cooldown_until).toEqual({});
  });

  it('test_429_with_retry_after_uses_the_api_suggested_wait', async () => {
    const h = makeHarness(
      byKey({
        [MAIN]: { status: 429, errorBody: QUOTA_BODY, headers: { 'retry-after': '17' } },
        [SPARE_1]: { status: 200, body: okBody('ok') },
      }),
      LADDER,
      { credentials: POOL },
    );
    const nowSec = h.clock.now() / 1000;

    await requestAi(narration, h.deps);

    expect(h.deps.session.key_cooldown_until[MAIN]).toBe(nowSec + 17);
    expect(quotaCooldownSeconds(Number.NaN, h.config)).toBe(AI_KNOBS.key_quota_cooldown_seconds);
    expect(quotaCooldownSeconds(0, h.config)).toBe(AI_KNOBS.key_quota_cooldown_seconds);
  });
});

// ---------------------------------------------------------------------------
// K3 - pool exhaustion
// ---------------------------------------------------------------------------

describe('K3 - the pool is walked once, in order, and never re-asks a key', () => {
  it('test_429_on_every_key_is_the_callers_quota_429_after_exactly_one_request_per_key', async () => {
    const h = makeHarness(
      byKey({
        [MAIN]: { status: 429, errorBody: QUOTA_BODY },
        [SPARE_1]: { status: 429, errorBody: QUOTA_BODY },
        [SPARE_2]: { status: 429, errorBody: QUOTA_BODY, headers: { 'retry-after': '9' } },
      }),
      LADDER,
      { credentials: POOL },
    );

    const r = await requestAi(narration, h.deps);

    expect(r).toMatchObject({ ok: false, label: 'quota_429', attempts: 3, retry_after: 9 });
    expect(h.calls.map((c) => keyOf(c.init))).toEqual([MAIN, SPARE_1, SPARE_2]);
    expect(Object.keys(h.deps.session.key_cooldown_until).sort()).toEqual([MAIN, SPARE_1, SPARE_2].sort());
    expect(h.deps.session.in_flight).toBe(false);
  });

  it('test_quota_429_detail_still_carries_the_api_message', async () => {
    const h = makeHarness(
      byKey({ [MAIN]: { status: 429, errorBody: QUOTA_BODY }, [SPARE_1]: { status: 429, errorBody: QUOTA_BODY }, [SPARE_2]: { status: 429, errorBody: QUOTA_BODY } }),
      LADDER,
      { credentials: POOL },
    );
    const r = await requestAi(narration, h.deps);
    expect((r as { detail: string }).detail).toContain('quota');
  });
});

// ---------------------------------------------------------------------------
// K4 - later calls start on a key that still has quota
// ---------------------------------------------------------------------------

describe('K4 - a key that answered 429 is skipped on later calls until its breaker expires', () => {
  it('test_next_call_starts_on_the_spare_while_main_is_cooling_then_returns_to_main', async () => {
    const h = makeHarness(
      byKey({ [MAIN]: { status: 429, errorBody: QUOTA_BODY }, [SPARE_1]: { status: 200, body: okBody('ok') } }),
      LADDER,
      { credentials: POOL },
    );

    await requestAi(narration, h.deps); // MAIN -> 429 -> SPARE_1 ok
    const second = await requestAi(narration, h.deps);
    expect(second).toMatchObject({ ok: true, attempts: 1 });
    expect(keyOf(h.calls[2].init)).toBe(SPARE_1); // straight to the healthy key

    h.clock.advance((AI_KNOBS.key_quota_cooldown_seconds + 1) * 1000);
    await requestAi(narration, h.deps);
    expect(keyOf(h.calls[3].init)).toBe(MAIN); // breaker expired: main leads again
  });

  it('test_when_every_key_is_cooling_only_one_probe_request_is_sent', async () => {
    const h = makeHarness(
      byKey({
        [MAIN]: { status: 429, errorBody: QUOTA_BODY },
        [SPARE_1]: { status: 429, errorBody: QUOTA_BODY },
        [SPARE_2]: { status: 429, errorBody: QUOTA_BODY },
      }),
      LADDER,
      { credentials: POOL },
    );

    await requestAi(narration, h.deps); // 3 requests, all keys now cooling
    const r = await requestAi(narration, h.deps);

    expect(r).toMatchObject({ ok: false, label: 'quota_429', attempts: 1 });
    expect(h.calls).toHaveLength(4);
    expect(keyOf(h.calls[3].init)).toBe(MAIN); // all expire together: pool order wins
  });
});

// ---------------------------------------------------------------------------
// K5 - invalid key vs malformed request
// ---------------------------------------------------------------------------

describe('K5 - a rejected KEY rolls over; a malformed REQUEST does not', () => {
  it('test_looksLikeKeyRejection_matches_the_api_wording_only', () => {
    expect(looksLikeKeyRejection('HTTP 400: API key not valid. Please pass a valid API key.')).toBe(true);
    expect(looksLikeKeyRejection('API_KEY_INVALID')).toBe(true);
    expect(looksLikeKeyRejection('Invalid JSON payload received.')).toBe(false);
    expect(looksLikeKeyRejection(undefined)).toBe(false);
  });

  it('test_400_api_key_not_valid_on_main_switches_to_the_spare_and_parks_main', async () => {
    const h = makeHarness(
      byKey({ [MAIN]: { status: 400, errorBody: BAD_KEY_BODY }, [SPARE_1]: { status: 200, body: okBody('ok') } }),
      LADDER,
      { credentials: POOL },
    );

    const r = await requestAi(narration, h.deps);

    expect(r).toMatchObject({ ok: true, attempts: 2, model: 'A' });
    expect(h.calls.map((c) => keyOf(c.init))).toEqual([MAIN, SPARE_1]);
    expect(h.deps.session.key_cooldown_until[MAIN]).toBe(Number.POSITIVE_INFINITY);
    expect(h.deps.session.cooldown_until).toEqual({}); // A1 still holds: no model cooldown
  });

  it('test_401_on_every_key_ends_as_config_error_with_the_api_message', async () => {
    const h = makeHarness(
      byKey({
        [MAIN]: { status: 401, errorBody: BAD_KEY_BODY },
        [SPARE_1]: { status: 401, errorBody: BAD_KEY_BODY },
        [SPARE_2]: { status: 401, errorBody: BAD_KEY_BODY },
      }),
      LADDER,
      { credentials: POOL },
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 3 });
    expect((r as { detail: string }).detail).toContain('API key not valid');
  });

  it('test_malformed_400_returns_immediately_without_touching_the_spares', async () => {
    const h = makeHarness(
      byKey({ [MAIN]: { status: 400, errorBody: MALFORMED_BODY }, [SPARE_1]: { status: 200, body: okBody('ok') } }),
      LADDER,
      { credentials: POOL },
    );
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'config_error', attempts: 1 });
    expect(h.calls).toHaveLength(1);
    expect(h.deps.session.key_cooldown_until).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// K6 - interaction with the model ladder; single-key regression
// ---------------------------------------------------------------------------

describe('K6 - model cooldowns survive a key switch; a single-key build is unchanged', () => {
  it('test_503_model_cooldown_is_still_honoured_after_the_key_switch', async () => {
    // A: 503 on every key (overloaded); B: 429 on main, 200 on the spare.
    const h = makeHarness(
      (url, init) => {
        const model = url.match(/models\/([^:]+):/)![1];
        if (model === 'A') return { status: 503, errorBody: 'overloaded' };
        return keyOf(init) === MAIN ? { status: 429, errorBody: QUOTA_BODY } : { status: 200, body: okBody('ok') };
      },
      { ...LADDER, max_same_model_attempts_overloaded: 1 },
      { credentials: POOL },
    );

    const r = await requestAi(narration, h.deps);

    expect(r).toMatchObject({ ok: true, model: 'B', attempts: 3 });
    // A is cooling (503) so the fresh ladder for the spare starts at B, not A.
    expect(h.calls.map((c) => [c.model, keyOf(c.init)])).toEqual([
      ['A', MAIN],
      ['B', MAIN],
      ['B', SPARE_1],
    ]);
    expect(h.deps.session.cooldown_until).toHaveProperty('A');
  });

  it('test_a_single_key_build_still_fails_quota_429_after_one_request', async () => {
    const h = makeHarness([{ status: 429, errorBody: QUOTA_BODY, headers: { 'retry-after': '30' } }], LADDER);
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'quota_429', attempts: 1, retry_after: 30 });
    expect(h.calls).toHaveLength(1);
  });

  it('test_userKey_mode_with_an_empty_key_and_no_spares_is_still_not_configured', async () => {
    const h = makeHarness([{ status: 200, body: okBody('never') }], LADDER, {
      credentials: { apiMode: 'userKey', userKey: '' },
    });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: false, label: 'not_configured', attempts: 0 });
    expect(h.calls).toHaveLength(0);
  });

  it('test_userKey_mode_with_an_empty_key_but_spares_runs_on_the_spares', async () => {
    const h = makeHarness([{ status: 200, body: okBody('ok') }], LADDER, {
      credentials: { apiMode: 'userKey', userKey: '', fallbackKeys: [SPARE_1] },
    });
    const r = await requestAi(narration, h.deps);
    expect(r).toMatchObject({ ok: true });
    expect(keyOf(h.calls[0].init)).toBe(SPARE_1);
  });
});

// ---------------------------------------------------------------------------
// K7 - config validation
// ---------------------------------------------------------------------------

describe('K7 - key_quota_cooldown_seconds is a validated knob', () => {
  it('test_default_config_is_valid_and_carries_the_registry_value', () => {
    const cfg = makeAiConfig();
    expect(cfg.key_quota_cooldown_seconds).toBe(AI_KNOBS.key_quota_cooldown_seconds);
    expect(validateAiConfig(cfg)).toEqual([]);
  });

  it('test_non_positive_key_cooldown_is_reported', () => {
    for (const bad of [0, -5, Number.NaN]) {
      const problems = validateAiConfig(makeAiConfig({ key_quota_cooldown_seconds: bad }));
      expect(problems.map((p) => p.knob)).toContain('key_quota_cooldown_seconds');
    }
  });
});
