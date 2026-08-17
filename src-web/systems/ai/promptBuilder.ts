/**
 * Prompt builder - the wrapper owns the prompt, never the caller.
 *
 * Design docs:
 * - production/gdd-integration/gdd-01-turn-contract-ai.md B.2 R6 ("feature
 *   systems pass only `locked_result`; the wrapper assembles the prompt so no
 *   feature can forget a rule"), C.2 R2 (the two call shapes + directive lists),
 *   C.8 AC-03/AC-06/AC-24/AC-25/AC-26/AC-33.
 * - production/gdd-integration/app-map.md section 3: the shipped API-2
 *   "Narrative Engine" (`callGeminiAPI:25136`) is what this replaces in P4b.
 *
 * NO RAW NUMBERS REACH THE MODEL. `summarizeLockedResult` turns a locked result
 * into Vietnamese qualitative prose and then scrubs any surviving digit run, so
 * R4 ("no raw stats in prose") is enforced at the *input* boundary too, not only
 * by asking the model nicely.
 */

import type { LockedResult, Suggestion } from '../types';
import {
  DIRECTIVE_CONCEALMENT,
  NARRATION_DIRECTIVES,
  SUGGESTION_DIRECTIVES,
  wrapUntrusted,
} from '../contract/narrationDirectives';
import {
  DEFAULT_AI_CONFIG,
  type AiLlmTuningConfig,
  type SafetySetting,
} from './config';

export type CallType = 'narration_call' | 'suggestion_call' | 'suggestion_retry_call';

export interface AiPayload {
  /** Required for `narration_call` (Checkpoint 1). Never mutated, never cached. */
  locked_result?: LockedResult | null;
  /** Pre-rendered qualitative summary; derived from `locked_result` when absent. */
  lockedResultSummary?: string;
  /** Delimiter-wrapped by this module, never by the caller (AC-33). */
  worldMemoryContext?: string;
  /** Delimiter-wrapped by this module (AC-26). */
  playerInput?: string;
  situation?: string;
  allowed_envelope_menu?: readonly string[];
  /** Equipment & Skill Data `style_descriptor`. */
  style?: string;
  npc_tag?: { concealment_narrative_hint?: string; concealment_active?: boolean };
  /** Display-name resolver so entity ids never reach the prose. */
  nameOf?: (id: string) => string | undefined;
  /** Ignored on purpose: safety settings are system-wide (R7 / AC-10). */
  safetySettings?: unknown;
}

export interface GeminiPart {
  text: string;
}
export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}
export interface GeminiRequestBody {
  contents: GeminiContent[];
  generationConfig: Record<string, unknown>;
  safetySettings: readonly SafetySetting[];
}

// ---------------------------------------------------------------------------
// Locked result -> Vietnamese qualitative summary
// ---------------------------------------------------------------------------

/** Removes every digit run. Last line of defence for R4 (see module header). */
export function stripDigits(text: string): string {
  return text.replace(/\d+([.,]\d+)?/g, '…');
}

function bandForMagnitude(v: number, small: number, large: number): 'nhỏ' | 'vừa' | 'lớn' {
  const a = Math.abs(v);
  if (a <= small) return 'nhỏ';
  if (a >= large) return 'lớn';
  return 'vừa';
}

const OUTCOME_TEXT: Record<string, string> = {
  win: 'Trận đấu đã ngã ngũ: phần thắng thuộc về bên chiếm ưu thế.',
  loss: 'Trận đấu đã ngã ngũ: bên yếu thế đã bại trận.',
  flee: 'Một bên đã bỏ chạy khỏi trận.',
  draw: 'Trận đấu kết thúc bất phân thắng bại.',
  none: '',
};

/**
 * Turns a locked result into qualitative Vietnamese. Handles the P0 field
 * prefixes (`exp_delta_`, `affinity_delta_`, `death_flag_`, `consequence_type_`,
 * `breakthrough_flag_`) and degrades gracefully for anything else: an unknown
 * numeric field becomes "có thay đổi", never a number.
 */
export function summarizeLockedResult(
  locked: LockedResult | null | undefined,
  opts: { nameOf?: (id: string) => string | undefined } = {},
): string {
  if (!locked) return '';
  const nameOf = opts.nameOf ?? (() => undefined);
  const who = (id: string) => nameOf(id) ?? 'một người trong cuộc';
  const lines: string[] = [];

  const outcome = OUTCOME_TEXT[locked.outcome?.type ?? 'none'];
  if (outcome) lines.push(outcome);
  if (locked.in_combat && locked.battle_active) lines.push('Cuộc chiến vẫn đang tiếp diễn.');

  for (const [field, value] of Object.entries(locked.fields ?? {})) {
    if (field.startsWith('exp_delta_')) {
      const id = field.slice('exp_delta_'.length);
      if (typeof value === 'number' && value > 0) {
        lines.push(who(id) + ' cảm thấy tu vi tăng tiến ' + bandForMagnitude(value, 20, 200) + '.');
      }
    } else if (field.startsWith('affinity_delta_')) {
      const id = field.slice('affinity_delta_'.length);
      if (typeof value === 'number' && value !== 0) {
        lines.push(
          value > 0
            ? 'Thiện cảm của ' + who(id) + ' với người chơi ấm lên ' + bandForMagnitude(value, 5, 15) + '.'
            : 'Ác cảm của ' + who(id) + ' với người chơi sâu thêm ' + bandForMagnitude(value, 5, 15) + '.',
        );
      }
    } else if (field.startsWith('death_flag_')) {
      if (value === true) lines.push(who(field.slice('death_flag_'.length)) + ' đã tắt thở.');
    } else if (field.startsWith('breakthrough_flag_')) {
      if (value === true) lines.push(who(field.slice('breakthrough_flag_'.length)) + ' vừa đột phá cảnh giới.');
    } else if (field.startsWith('consequence_type_')) {
      if (typeof value === 'string' && value) {
        lines.push(who(field.slice('consequence_type_'.length)) + ' phải gánh một hậu quả lâu dài: ' + value + '.');
      }
    } else if (typeof value === 'number' && value !== 0) {
      lines.push('Có thay đổi ở "' + field + '", mức độ ' + bandForMagnitude(value, 10, 100) + '.');
    } else if (typeof value === 'boolean' && value) {
      lines.push('Trạng thái "' + field + '" đã được kích hoạt.');
    }
  }

  if (locked.is_death_turn) {
    lines.push('Đây là một cái chết thật sự và không thể đảo ngược.');
  }
  return stripDigits(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Suggestion schema (C.2 R2 / AC-03)
// ---------------------------------------------------------------------------

export const SUGGESTION_RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      text: { type: 'STRING' },
      envelope: { type: 'STRING' },
    },
    required: ['text', 'envelope'],
  },
} as const;

export interface ParsedSuggestions {
  valid: boolean;
  suggestions: Suggestion[];
  error?: 'not_json' | 'not_array' | 'bad_shape' | 'envelope_out_of_menu' | 'too_few';
}

/**
 * Schema-validates a `suggestion_call` reply. An `envelope` outside
 * `allowed_envelope_menu` is contract-invalid and handled like malformed JSON
 * (C.6): one internal retry, then Failed - the invalid object is never exposed.
 * An empty menu means "no whitelist configured yet" (P5 was dropped from the
 * roadmap) and skips only the membership check.
 */
export function parseSuggestions(
  text: string,
  allowedEnvelopeMenu?: readonly string[],
  expected = 4,
): ParsedSuggestions {
  let data: unknown;
  try {
    data = JSON.parse(stripJsonFence(text));
  } catch {
    return { valid: false, suggestions: [], error: 'not_json' };
  }
  if (!Array.isArray(data)) return { valid: false, suggestions: [], error: 'not_array' };

  const out: Suggestion[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') return { valid: false, suggestions: [], error: 'bad_shape' };
    const o = raw as { text?: unknown; envelope?: unknown };
    if (typeof o.text !== 'string' || o.text.trim() === '') {
      return { valid: false, suggestions: [], error: 'bad_shape' };
    }
    const envelope = typeof o.envelope === 'string' && o.envelope ? o.envelope : null;
    if (allowedEnvelopeMenu && allowedEnvelopeMenu.length > 0) {
      if (!envelope || !allowedEnvelopeMenu.includes(envelope)) {
        return { valid: false, suggestions: [], error: 'envelope_out_of_menu' };
      }
    }
    out.push({ text: o.text.trim(), envelope, source: 'ai' });
  }

  const unique = dedupeByText(out);
  if (unique.length < expected) {
    // Network-successful but content-thin: the LAYER returns this as a valid
    // parse (C.2 R3 "this layer never decides that a content retry is needed");
    // Turn Manager owns the one allowed content retry (AC-06).
    return { valid: true, suggestions: unique, error: 'too_few' };
  }
  return { valid: true, suggestions: unique.slice(0, expected) };
}

function dedupeByText(list: readonly Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const s of list) {
    if (seen.has(s.text)) continue;
    seen.add(s.text);
    out.push(s);
  }
  return out;
}

/** Models occasionally wrap JSON in a markdown fence despite the mime type. */
export function stripJsonFence(text: string): string {
  const t = (text ?? '').trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : t;
}

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

export class ContractCheckpointError extends Error {
  readonly checkpoint = 1;
  constructor(message: string) {
    super(message);
    this.name = 'ContractCheckpointError';
  }
}

/** `narration_call`: locked result + fenced memory + fenced player input. */
export function buildNarrationPrompt(payload: AiPayload): string {
  const summary =
    payload.lockedResultSummary ?? summarizeLockedResult(payload.locked_result, { nameOf: payload.nameOf });

  const blocks: string[] = [];
  blocks.push(NARRATION_DIRECTIVES.join('\n'));
  if (payload.style) blocks.push('Giọng kể yêu cầu: ' + payload.style);
  if (payload.npc_tag?.concealment_active) {
    blocks.push(DIRECTIVE_CONCEALMENT);
    if (payload.npc_tag.concealment_narrative_hint) {
      blocks.push('Gợi ý che giấu: ' + payload.npc_tag.concealment_narrative_hint);
    }
  }
  blocks.push(wrapUntrusted('locked_result', summary));
  blocks.push(wrapUntrusted('world_memory', payload.worldMemoryContext ?? ''));
  blocks.push(wrapUntrusted('player_input', payload.playerInput ?? ''));
  return blocks.join('\n\n');
}

/** `suggestion_call` / `suggestion_retry_call`: situation + menu, no locked result. */
export function buildSuggestionPrompt(payload: AiPayload): string {
  const menu = payload.allowed_envelope_menu ?? [];
  const blocks: string[] = [];
  blocks.push(SUGGESTION_DIRECTIVES.join('\n'));
  blocks.push(
    menu.length > 0
      ? 'Danh sách envelope được phép: ' + menu.join(', ')
      : 'Danh sách envelope được phép: (chưa cấu hình - hãy để trống trường envelope)',
  );
  blocks.push(wrapUntrusted('situation', payload.situation ?? ''));
  blocks.push(wrapUntrusted('world_memory', payload.worldMemoryContext ?? ''));
  if (payload.playerInput) blocks.push(wrapUntrusted('player_input', payload.playerInput));
  return blocks.join('\n\n');
}

/**
 * The single entry point used by `requestAi`. Enforces Checkpoint 1: a
 * `narration_call` without a locked result throws BEFORE any request is formed
 * (AC-02 asserts the HTTP spy stays at 0).
 *
 * `safetySettings` from the payload is ignored and replaced by the system-wide
 * `BLOCK_NONE` block (R7 / AC-10).
 */
export function buildRequestBody(
  callType: CallType,
  payload: AiPayload,
  cfg: AiLlmTuningConfig = DEFAULT_AI_CONFIG,
): GeminiRequestBody {
  if (callType === 'narration_call' && !payload.locked_result && !payload.lockedResultSummary) {
    throw new ContractCheckpointError(
      'narration_call requires a locked_result (Contract Enforcement checkpoint 1)',
    );
  }

  const isNarration = callType === 'narration_call';
  const text = isNarration ? buildNarrationPrompt(payload) : buildSuggestionPrompt(payload);

  const generationConfig: Record<string, unknown> = { ...(cfg.generation_config ?? {}) };
  if (!isNarration) {
    generationConfig.response_mime_type = 'application/json';
    generationConfig.response_schema = SUGGESTION_RESPONSE_SCHEMA;
  }

  return {
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig,
    safetySettings: cfg.safety_settings,
  };
}

/** Flattens a built body back to text - test/assertion helper (AC-24/25/26/33). */
export function requestText(body: GeminiRequestBody): string {
  return body.contents.flatMap((c) => c.parts.map((p) => p.text)).join('\n');
}
