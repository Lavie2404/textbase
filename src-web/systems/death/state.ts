/**
 * Persisted state owned by Death and Consequence, keyed by char_id.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (2.3 state/data model, CR#5 "only two internal code paths may write false",
 * CR#6 flag lifecycle), production/gdd-integration/plan.md decision C-7.
 *
 * WHERE IT LIVES IN THE APP: knowledge.deathState[char_id].
 * The App keeps its own character.isPermanentlyDead for NPC soul stubs; this
 * table is the mechanical record (severity, crippled flag, recovery cooldown,
 * pending fate) that the App shape has no room for.
 *
 * DEVIATION (plan.md C-7): death_flag = true for the PLAYER does NOT lock the
 * slot and does NOT end the run. The existing GameOverModal -> handleRespawn
 * path still owns what happens next; this module only decides WHETHER the
 * player dies at all, instead of letting the AI decide it.
 *
 * OLD SAVES: ensureDeathState / getDeathCharState lazily create clean records,
 * so alive defaults to true and blocked to false on first read (AC-13, AC-36).
 */

import type { CharId } from '../types';
import type { SeverityTier } from './severityTier';

export interface PendingFate {
  /** The defeated NPC awaiting execution or mercy. */
  npc_id: CharId;
  /** Turn on which the window opened; it lasts exactly one turn. */
  opened_turn: number;
  /** The battle margin_ratio, reused by the D.2 spare consequence. */
  margin_ratio: number;
  /** entities_in_scope minus the npc, captured when the window opened. */
  witnesses: CharId[];
}

export interface DeathCharState {
  alive: boolean;
  death_flag: boolean;
  /** Blocks EXP; cleared only by a successful D.3 (CR#6). */
  death_and_consequence_blocked: boolean;
  /** Last resolved tier, for the card and the narration payload. */
  severity: SeverityTier | null;
  consequence_type: string | null;
  /** D.3 self-cultivation cooldown stamp. */
  recovery_progress: { last_self_attempt_turn: number | null; attempts: number };
  pending_fate: PendingFate | null;
}

export type DeathState = Record<CharId, DeathCharState>;

export function initDeathCharState(): DeathCharState {
  return {
    alive: true,
    death_flag: false,
    death_and_consequence_blocked: false,
    severity: null,
    consequence_type: null,
    recovery_progress: { last_self_attempt_turn: null, attempts: 0 },
    pending_fate: null,
  };
}

/** Normalises whatever an old save carried. Never throws. */
export function ensureDeathState(raw: unknown): DeathState {
  const source = (raw ?? {}) as Record<string, unknown>;
  const out: DeathState = {};
  for (const id of Object.keys(source)) {
    const entry = (source[id] ?? {}) as Partial<DeathCharState>;
    out[id] = {
      alive: entry.alive !== false,
      death_flag: entry.death_flag === true,
      death_and_consequence_blocked: entry.death_and_consequence_blocked === true,
      severity: (entry.severity as SeverityTier | null) ?? null,
      consequence_type: entry.consequence_type ?? null,
      recovery_progress: {
        last_self_attempt_turn:
          typeof entry.recovery_progress?.last_self_attempt_turn === 'number'
            ? entry.recovery_progress.last_self_attempt_turn
            : null,
        attempts:
          typeof entry.recovery_progress?.attempts === 'number'
            ? entry.recovery_progress.attempts
            : 0,
      },
      pending_fate: entry.pending_fate ?? null,
    };
  }
  return out;
}

/** Lazy read: a char_id never seen before is alive, healthy and unpenalised. */
export function getDeathCharState(
  state: DeathState | null | undefined,
  id: CharId,
): DeathCharState {
  const entry = state?.[id];
  return entry ? entry : initDeathCharState();
}

/** Returns a NEW state table with one character replaced (no mutation). */
export function withDeathCharState(
  state: DeathState | null | undefined,
  id: CharId,
  next: DeathCharState,
): DeathState {
  return { ...(state ?? {}), [id]: next };
}

/** True when the character is crippled (EXP blocked). */
export function isCrippled(state: DeathState | null | undefined, id: CharId): boolean {
  return getDeathCharState(state, id).death_and_consequence_blocked === true;
}
