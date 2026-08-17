/**
 * `AiLlmTuningConfig` - the data-driven configuration of the AI/LLM layer.
 *
 * Design docs:
 * - production/gdd-integration/gdd-01-turn-contract-ai.md C.2 R4 (ordered model
 *   ladder, "config data, never hard-coded"), R7 (`safetySettings: BLOCK_NONE`
 *   system-wide, overriding any payload value), C.5 (the knob table)
 * - production/gdd-integration/plan.md C-10: `ai_call_timeout_seconds` raised to
 *   60 and `request_timeout_default` to 45 - a deliberate deviation from the
 *   GDD's 30/15, recorded in `registry.ts` AI_KNOBS.
 * - production/gdd-integration/app-map.md section 3 for the shipped ladder order
 *   (`GEMINI_TEXT_MODEL_FALLBACKS:17944`) and the 90s 503 breaker.
 *
 * ENGINE/API VERSION NOTE
 * Gemini model ids and the `safetySettings` category list are a remote API
 * surface, not a pinned local dependency. The ids below are copied verbatim
 * from the shipped `App.tsx` ladder rather than from model knowledge - if the
 * provider retires one, change it HERE and nowhere else. AC-07 exists precisely
 * to prove the ladder is data, not code.
 */

import { AI_KNOBS } from '../registry';

/** Verbatim from `App.tsx:17944` (`GEMINI_TEXT_MODEL_FALLBACKS`), order preserved. */
export const GEMINI_TEXT_MODEL_FALLBACKS: readonly string[] = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

/** The single allowlisted AI endpoint host (P7 CI check AC-01). */
export const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type HarmCategory =
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  | 'HARM_CATEGORY_CIVIC_INTEGRITY';

export interface SafetySetting {
  category: HarmCategory;
  threshold: 'BLOCK_NONE';
}

/**
 * R7: fixed system-wide, never a per-turn or per-UI toggle. The wrapper
 * OVERRIDES any payload-supplied `safetySettings` with exactly this block
 * (AC-10). Pillar 5 (adult content allowed) depends on it.
 */
export const SAFETY_SETTINGS_BLOCK_NONE: readonly SafetySetting[] = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

export interface AiLlmTuningConfig {
  /** Ordered fallback ladder (R4). An empty list is a config error, not a crash. */
  model_ladder: readonly string[];
  /** Whole-logical-call budget in seconds (F2). plan.md C-10 raised it to 60. */
  ai_call_timeout_seconds: number;
  /** Cap for one HTTP request; must stay strictly below the logical budget. */
  request_timeout_default: number;
  /** Fixed wait before retrying the same model after a 503 (F1 OVERLOADED). */
  overload_retry_wait_seconds: number;
  /** Linear backoff base for non-503 transient errors (F1 TRANSIENT_OTHER). */
  transient_retry_base_seconds: number;
  /** TOTAL attempts per model on 503 (1 = switch immediately). */
  max_same_model_attempts_overloaded: number;
  /** TOTAL attempts per model on other transient errors. */
  max_same_model_attempts_transient: number;
  /** How long an overloaded model is skipped - the 90s breaker of App.tsx:17949. */
  model_cooldown_seconds: number;
  /** Endpoint base; injected so tests never touch a real host. */
  endpoint_base: string;
  safety_settings: readonly SafetySetting[];
  /** Extra generationConfig applied to every call. */
  generation_config?: Record<string, unknown>;
}

export const DEFAULT_AI_CONFIG: AiLlmTuningConfig = {
  model_ladder: GEMINI_TEXT_MODEL_FALLBACKS,
  ai_call_timeout_seconds: AI_KNOBS.ai_call_timeout_seconds,
  request_timeout_default: AI_KNOBS.request_timeout_default,
  overload_retry_wait_seconds: AI_KNOBS.overload_retry_wait_seconds,
  transient_retry_base_seconds: AI_KNOBS.transient_retry_base_seconds,
  max_same_model_attempts_overloaded: AI_KNOBS.max_same_model_attempts_overloaded,
  max_same_model_attempts_transient: AI_KNOBS.max_same_model_attempts_transient,
  model_cooldown_seconds: AI_KNOBS.model_cooldown_seconds,
  endpoint_base: GEMINI_ENDPOINT_BASE,
  safety_settings: SAFETY_SETTINGS_BLOCK_NONE,
};

export interface ConfigProblem {
  knob: string;
  message: string;
}

/**
 * Fail-loud validation (configValidation.ts style). Returns problems instead of
 * throwing so a caller can decide between "refuse to boot" and "log and clamp".
 *
 * The one invariant that is not a matter of taste: `request_timeout_default`
 * must stay strictly below `ai_call_timeout_seconds`, otherwise a single hung
 * request consumes the whole budget and model fallback becomes impossible
 * (C.5 "must stay below 30 or fallback becomes impossible").
 */
export function validateAiConfig(cfg: AiLlmTuningConfig): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  if (cfg.request_timeout_default >= cfg.ai_call_timeout_seconds) {
    problems.push({
      knob: 'request_timeout_default',
      message:
        'must be strictly below ai_call_timeout_seconds (' +
        cfg.ai_call_timeout_seconds +
        '), otherwise model fallback is unreachable',
    });
  }
  if (cfg.overload_retry_wait_seconds <= 0) {
    problems.push({ knob: 'overload_retry_wait_seconds', message: 'must be > 0 (F1: never spam instantly)' });
  }
  if (cfg.transient_retry_base_seconds <= 0) {
    problems.push({ knob: 'transient_retry_base_seconds', message: 'must be > 0 (F1: never spam instantly)' });
  }
  if (cfg.max_same_model_attempts_overloaded < 1) {
    problems.push({ knob: 'max_same_model_attempts_overloaded', message: 'is a TOTAL attempt count; minimum 1' });
  }
  if (cfg.max_same_model_attempts_transient < 1) {
    problems.push({ knob: 'max_same_model_attempts_transient', message: 'is a TOTAL attempt count; minimum 1' });
  }
  if (cfg.model_cooldown_seconds <= 0) {
    problems.push({ knob: 'model_cooldown_seconds', message: 'must be > 0' });
  }
  if (new Set(cfg.model_ladder).size !== cfg.model_ladder.length) {
    problems.push({ knob: 'model_ladder', message: 'contains duplicate model ids' });
  }
  return problems;
}

/** Builds a config from partial overrides. Never mutates `DEFAULT_AI_CONFIG`. */
export function makeAiConfig(overrides: Partial<AiLlmTuningConfig> = {}): AiLlmTuningConfig {
  return { ...DEFAULT_AI_CONFIG, ...overrides };
}

export type ApiMode = 'default' | 'userKey';

export interface AiCredentials {
  apiMode: ApiMode;
  /**
   * R6: lives in a storage namespace fully separated from the save bundle so it
   * can never travel through export (AC-28). This layer only reads it.
   */
  userKey?: string;
  /** Project default key, quota-limited. */
  defaultKey?: string;
}

/** Resolves the key for a mode, or `null` when the mode is unusable. */
export function resolveApiKey(creds: AiCredentials | undefined): string | null {
  if (!creds) return null;
  if (creds.apiMode === 'userKey') {
    const k = (creds.userKey ?? '').trim();
    return k.length > 0 ? k : null;
  }
  const k = (creds.defaultKey ?? '').trim();
  return k.length > 0 ? k : null;
}
