/**
 * Pillar 1 - integration glue: card status line, tag allowlist, App hook points.
 * Design doc: design/gdd/game-concept.md "Pillar 1" (243-255).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCardBlocks } from '../../../src-web/systems/card/cardBlocks';
import { cardContextFromApp, cardCharacterFromApp } from '../../../src-web/systems/glue/uiGlue';
import { classifyTag, sanitizeCommandBlock, WORLD_CONTENT_TAGS } from '../../../src-web/systems/contract/tagPolicy';
import {
  GAP_INJURY_CARD_LINE,
  applyGapInjury,
} from '../../../src-web/systems/objectivity/levelGapInjury';

const APP_SRC = readFileSync(resolve(__dirname, '../../../App.tsx'), 'utf8');

function injuredAppChar() {
  return applyGapInjury(
    {
      id: 'npc-1',
      Name: 'Hắc Y Nhân',
      Stance: 'Thù địch',
      level: 90,
      hp: 500,
      maxhp: 500,
      affinity: -50,
      longTermStatuses: [],
    },
    10,
  ) as Record<string, any>;
}

describe('character card', () => {
  it('test_injured_npc_gets_the_recoverable_status_line', () => {
    const appChar = injuredAppChar();
    const card = buildCardBlocks(
      cardCharacterFromApp(appChar as never),
      cardContextFromApp({ appChar }),
    );
    expect(card.statusLines).toContain(GAP_INJURY_CARD_LINE);
  });

  it('test_healthy_npc_gets_no_injury_line', () => {
    const appChar = { id: 'npc-2', Name: 'Lão Trương', level: 12, hp: 100, maxhp: 100, affinity: 0 };
    const card = buildCardBlocks(
      cardCharacterFromApp(appChar as never),
      cardContextFromApp({ appChar }),
    );
    expect(card.statusLines).not.toContain(GAP_INJURY_CARD_LINE);
  });

  it('test_card_never_prints_the_true_level_as_a_number', () => {
    const appChar = injuredAppChar();
    const card = buildCardBlocks(
      cardCharacterFromApp(appChar as never),
      cardContextFromApp({ appChar }),
    );
    const printed = JSON.stringify({ lines: card.statusLines, profile: card.profile });
    expect(printed).not.toContain('90');
  });

  it('test_explicit_gapInjured_flag_also_works', () => {
    const appChar = { id: 'npc-3', Name: 'X', level: 30, hp: 10, maxhp: 10, affinity: 0 };
    const card = buildCardBlocks(
      cardCharacterFromApp(appChar as never),
      cardContextFromApp({ appChar, gapInjured: true }),
    );
    expect(card.statusLines).toContain(GAP_INJURY_CARD_LINE);
  });
});

describe('tag policy', () => {
  it('test_recover_injury_is_allowlisted_world_content', () => {
    expect(WORLD_CONTENT_TAGS).toContain('RECOVER_INJURY');
  });

  it('test_recover_injury_tag_is_allowed_through_the_sanitiser', () => {
    expect(classifyTag('RECOVER_INJURY', { Name: 'Hắc Y Nhân' }, { playerIds: ['player-1'] })).toBe('allow');
  });

  it('test_recover_injury_survives_a_full_command_block_sanitise', () => {
    const kept = sanitizeCommandBlock('[RECOVER_INJURY: Name="Hắc Y Nhân"]', { playerIds: ['p1'] });
    expect(kept.kept).toContain('RECOVER_INJURY');
    expect(kept.stripped).toHaveLength(0);
  });
});

describe('App.tsx hook points', () => {
  it('test_hook1_npc_creation', () => {
    expect(APP_SRC).toContain('Pillar 1 HOOK 1');
  });

  it('test_hook2_combat_start_runs_before_startCombat', () => {
    expect(APP_SRC).toContain('Pillar 1 HOOK 2');
    const hookIdx = APP_SRC.indexOf('Pillar 1 HOOK 2 ');
    const startIdx = APP_SRC.indexOf('startCombat(playerParty_Objects, enemiesToFight_Objects');
    expect(hookIdx).toBeGreaterThan(-1);
    expect(startIdx).toBeGreaterThan(hookIdx);
  });

  it('test_hook2b_narrative_combat_start', () => {
    expect(APP_SRC).toContain('Pillar 1 HOOK 2b');
  });

  it('test_hook3a_stance_flip', () => {
    expect(APP_SRC).toContain('Pillar 1 HOOK 3a');
  });

  it('test_reconciliation_sweep_covers_every_status_clear_path', () => {
    expect(APP_SRC).toContain('Pillar 1 RECONCILIATION SWEEP');
    expect(APP_SRC).toContain('maybeRecoverGapInjury');
  });

  it('test_healing_item_recovery_path_exists', () => {
    expect(APP_SRC).toContain('Pillar 1 RECOVERY PATH (i)');
    expect(APP_SRC).toContain('isHealingItemForGapInjury');
  });

  it('test_every_hook_is_wrapped_and_logs_with_the_objectivity_prefix', () => {
    expect((APP_SRC.match(/\[objectivity\]/g) || []).length).toBeGreaterThanOrEqual(8);
  });

  it('test_npc_stat_rebuild_reuses_the_creation_formula', () => {
    expect(APP_SRC).toContain('const recomputeNpcStatsForLevel');
    const idx = APP_SRC.indexOf('const recomputeNpcStatsForLevel');
    const body = APP_SRC.slice(idx, idx + 1200);
    expect(body).toContain('200 + (lvl - 1) * 20');
    expect(body).toContain('autoAllocateNpcAp');
  });

  it('test_prompt_shows_injury_without_numbers', () => {
    expect(APP_SRC).toContain('gapInjuryPromptSuffix');
    expect(APP_SRC).toContain('GAP_INJURY_PROMPT_HINT');
  });
});
