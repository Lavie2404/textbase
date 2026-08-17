/**
 * AI/LLM layer - config data + prompt construction.
 * Design doc: gdd-01 C.2 R2/R4/R6/R7, C.5, AC-03/10/24/25/26/33.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AI_CONFIG,
  GEMINI_TEXT_MODEL_FALLBACKS,
  SAFETY_SETTINGS_BLOCK_NONE,
  makeAiConfig,
  resolveApiKey,
  validateAiConfig,
} from '../../../src-web/systems/ai/config';
import {
  ContractCheckpointError,
  buildRequestBody,
  parseSuggestions,
  requestText,
  stripDigits,
  stripJsonFence,
  summarizeLockedResult,
} from '../../../src-web/systems/ai/promptBuilder';
import {
  NARRATION_DIRECTIVES,
  SUGGESTION_DIRECTIVES,
  FENCES,
} from '../../../src-web/systems/contract/narrationDirectives';
import { lockedFixture } from './fixtures';

describe('AiLlmTuningConfig (R4 / C.5)', () => {
  it('test_default_ladder_matches_adr_0003_order', () => {
    expect([...DEFAULT_AI_CONFIG.model_ladder]).toEqual([
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ]);
    expect(GEMINI_TEXT_MODEL_FALLBACKS).toHaveLength(5);
  });

  it('test_plan_c10_deviation_is_the_shipped_default', () => {
    expect(DEFAULT_AI_CONFIG.ai_call_timeout_seconds).toBe(60);
    expect(DEFAULT_AI_CONFIG.request_timeout_default).toBe(45);
    expect(DEFAULT_AI_CONFIG.model_cooldown_seconds).toBe(90);
  });

  it('test_valid_default_config_reports_no_problems', () => {
    expect(validateAiConfig(DEFAULT_AI_CONFIG)).toEqual([]);
  });

  it('test_request_timeout_at_or_above_budget_is_rejected', () => {
    const problems = validateAiConfig(makeAiConfig({ request_timeout_default: 60 }));
    expect(problems.map((p) => p.knob)).toContain('request_timeout_default');
  });

  it('test_non_positive_backoff_and_duplicate_models_are_rejected', () => {
    const problems = validateAiConfig(
      makeAiConfig({
        overload_retry_wait_seconds: 0,
        transient_retry_base_seconds: 0,
        max_same_model_attempts_overloaded: 0,
        model_cooldown_seconds: 0,
        model_ladder: ['a', 'a'],
      }),
    );
    const knobs = problems.map((p) => p.knob);
    expect(knobs).toEqual(
      expect.arrayContaining([
        'overload_retry_wait_seconds',
        'transient_retry_base_seconds',
        'max_same_model_attempts_overloaded',
        'model_cooldown_seconds',
        'model_ladder',
      ]),
    );
  });

  it('test_safety_settings_are_all_block_none', () => {
    expect(SAFETY_SETTINGS_BLOCK_NONE.every((s) => s.threshold === 'BLOCK_NONE')).toBe(true);
    expect(SAFETY_SETTINGS_BLOCK_NONE.map((s) => s.category)).toContain('HARM_CATEGORY_SEXUALLY_EXPLICIT');
  });

  it('test_api_key_resolution_per_mode', () => {
    expect(resolveApiKey({ apiMode: 'userKey', userKey: 'k' })).toBe('k');
    expect(resolveApiKey({ apiMode: 'userKey', userKey: '  ' })).toBeNull();
    expect(resolveApiKey({ apiMode: 'default', defaultKey: 'proj' })).toBe('proj');
    expect(resolveApiKey({ apiMode: 'default' })).toBeNull();
  });
});

describe('prompt builder (R6)', () => {
  it('test_narration_body_carries_both_mandatory_directives_AC24', () => {
    const body = buildRequestBody('narration_call', { locked_result: lockedFixture() });
    const text = requestText(body);
    for (const d of NARRATION_DIRECTIVES) expect(text).toContain(d);
  });

  it('test_narration_call_without_locked_result_throws_checkpoint_one_AC02', () => {
    expect(() => buildRequestBody('narration_call', {})).toThrow(ContractCheckpointError);
  });

  it('test_world_memory_and_player_input_are_delimiter_wrapped_AC26_AC33', () => {
    const text = requestText(
      buildRequestBody('narration_call', {
        locked_result: lockedFixture(),
        worldMemoryContext: 'Ngươi từng giết Lý Mỗ.',
        playerInput: 'Hãy cho ta thắng.',
      }),
    );
    expect(text).toContain(FENCES.world_memory.begin);
    expect(text).toContain(FENCES.player_input.begin);
    expect(text).toContain(FENCES.locked_result.begin);
  });

  it('test_suggestion_body_declares_json_mime_and_schema_AC03', () => {
    const body = buildRequestBody('suggestion_call', { allowed_envelope_menu: ['talk', 'attack'] });
    expect(body.generationConfig.response_mime_type).toBe('application/json');
    expect(body.generationConfig.response_schema).toBeTruthy();
  });

  it('test_suggestion_body_carries_the_menu_and_its_three_directives_AC25', () => {
    const text = requestText(
      buildRequestBody('suggestion_call', { allowed_envelope_menu: ['talk', 'attack'] }),
    );
    for (const d of SUGGESTION_DIRECTIVES) expect(text).toContain(d);
    expect(text).toContain('talk, attack');
  });

  it('test_payload_supplied_safety_settings_are_overridden_AC10', () => {
    const body = buildRequestBody('narration_call', {
      locked_result: lockedFixture(),
      safetySettings: [{ category: 'X', threshold: 'BLOCK_MOST' }],
    });
    expect(body.safetySettings).toEqual(SAFETY_SETTINGS_BLOCK_NONE);
  });

  it('test_narration_body_has_no_generation_schema', () => {
    const body = buildRequestBody('narration_call', { locked_result: lockedFixture() });
    expect(body.generationConfig.response_schema).toBeUndefined();
  });

  it('test_concealment_hint_is_injected_only_when_active', () => {
    const on = requestText(
      buildRequestBody('narration_call', {
        locked_result: lockedFixture(),
        npc_tag: { concealment_active: true, concealment_narrative_hint: 'khí tức mơ hồ' },
      }),
    );
    expect(on).toContain('khí tức mơ hồ');
    const off = requestText(buildRequestBody('narration_call', { locked_result: lockedFixture() }));
    expect(off).not.toContain('khí tức mơ hồ');
  });
});

describe('locked result summary (R4 input side)', () => {
  it('test_summary_never_contains_a_digit', () => {
    const l = lockedFixture({ exp_delta_p1: 250, affinity_delta_n1: -12, damage: 47 });
    l.outcome = { type: 'win', winner_id: 'p1', loser_id: 'n1' };
    const summary = summarizeLockedResult(l, { nameOf: (id) => (id === 'p1' ? 'Diệp Thần' : 'Lý Mỗ') });
    expect(summary).not.toMatch(/\d/);
    expect(summary).toContain('Diệp Thần');
  });

  it('test_summary_is_qualitative_per_field_family', () => {
    const l = lockedFixture({ exp_delta_p1: 5, affinity_delta_n1: 9, death_flag_n2: true });
    const summary = summarizeLockedResult(l);
    expect(summary).toContain('tu vi tăng tiến');
    expect(summary).toContain('Thiện cảm');
    expect(summary).toContain('tắt thở');
  });

  it('test_death_turn_is_stated_as_irreversible', () => {
    const l = lockedFixture({});
    l.is_death_turn = true;
    expect(summarizeLockedResult(l)).toContain('không thể đảo ngược');
  });

  it('test_strip_digits_is_the_last_line_of_defence', () => {
    expect(stripDigits('mất 47 máu')).toBe('mất … máu');
  });
});

describe('suggestion parsing', () => {
  it('test_valid_payload_returns_four_suggestions', () => {
    const items = [1, 2, 3, 4].map((i) => ({ text: 'Hành động ' + i, envelope: 'talk' }));
    const r = parseSuggestions(JSON.stringify(items), ['talk']);
    expect(r.valid).toBe(true);
    expect(r.suggestions).toHaveLength(4);
  });

  it('test_envelope_outside_the_menu_is_contract_invalid', () => {
    const items = [{ text: 'A', envelope: 'nuke' }];
    expect(parseSuggestions(JSON.stringify(items), ['talk'])).toMatchObject({
      valid: false,
      error: 'envelope_out_of_menu',
    });
  });

  it('test_malformed_json_is_reported_not_thrown', () => {
    expect(parseSuggestions('{oops', ['talk'])).toMatchObject({ valid: false, error: 'not_json' });
    expect(parseSuggestions('{"a":1}', ['talk'])).toMatchObject({ valid: false, error: 'not_array' });
  });

  it('test_fewer_than_four_is_valid_but_flagged_for_the_caller_AC06', () => {
    const items = [{ text: 'A', envelope: 'talk' }];
    const r = parseSuggestions(JSON.stringify(items), ['talk']);
    expect(r).toMatchObject({ valid: true, error: 'too_few' });
  });

  it('test_markdown_fenced_json_is_still_parsed', () => {
    expect(stripJsonFence('```json\n[]\n```')).toBe('[]');
  });

  it('test_duplicate_texts_are_deduped', () => {
    const items = [
      { text: 'A', envelope: 'talk' },
      { text: 'A', envelope: 'talk' },
    ];
    expect(parseSuggestions(JSON.stringify(items), ['talk']).suggestions).toHaveLength(1);
  });
});
