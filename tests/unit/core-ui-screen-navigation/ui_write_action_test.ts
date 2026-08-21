/**
 * Core UI / Screen Navigation - D.1 `write_action_allowed` and D.2
 * `screen_transition_valid` + the overlay tier.
 *
 * AC coverage (gdd-06 PART A, A8): AC-01/02/03, AC-04, AC-07, AC-08..AC-11,
 * AC-37, AC-45, AC-51, AC-64, plus the AI-wait rules of Core Rule #9.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_ACTIONS,
  MUTATING_ACTIONS,
  READONLY_ACTIONS,
  SCREEN_IDS,
  TM_STATES,
  UNGATED_ACTIONS,
  WRITE_ACTION_MATRIX,
  actionClass,
  controlAlpha,
  isActionRenderable,
  isWriteActionAllowed,
  undoButtonState,
} from '../../../src-web/systems/ui/writeActionAllowed';
import {
  APP_SCREENS,
  BOOT_SCREEN,
  GDD_AI_CALL_TIMEOUT_SECONDS,
  aiTimeoutOutcome,
  aiWaitInvariantHolds,
  aiWaitPhase,
  applyScreenTransition,
  closeOverlay,
  gddScreenOf,
  handleEscape,
  openOverlay,
  overlayAllowedFrom,
  screenEdgeGuard,
  screenTransitionValid,
} from '../../../src-web/systems/ui/screenTransition';
import { UI_ALPHA, UI_KNOBS } from '../../../src-web/systems/registry';

describe('D.1 write_action_allowed (AC-04)', () => {
  it('test_matrix_has_the_declared_46_distinct_outcomes', () => {
    // 15 actions x 3 tm_states = 45, plus tap_back_to_slots @ S5.
    expect(MUTATING_ACTIONS.length).toBe(8);
    expect(READONLY_ACTIONS.length).toBe(7);
    expect(ALL_ACTIONS.length).toBe(15);
    expect(WRITE_ACTION_MATRIX.length).toBe(15 * TM_STATES.length + 1);
  });

  it('test_readonly_actions_are_allowed_in_every_state_and_screen', () => {
    for (const action of READONLY_ACTIONS) {
      for (const tm_state of TM_STATES) {
        for (const screen of SCREEN_IDS) {
          expect(isWriteActionAllowed(action, { tm_state, screen })).toBe(true);
        }
      }
    }
  });

  it('test_mutating_actions_require_awaiting_action', () => {
    for (const action of MUTATING_ACTIONS) {
      if (action === 'tap_back_to_slots') continue;
      expect(isWriteActionAllowed(action, { tm_state: 'awaiting_action', screen: 'S2' })).toBe(true);
      expect(isWriteActionAllowed(action, { tm_state: 'resolving', screen: 'S2' })).toBe(false);
      expect(isWriteActionAllowed(action, { tm_state: 'undoing', screen: 'S2' })).toBe(false);
    }
  });

  it('test_tap_back_to_slots_is_the_single_screen_dependent_carve_out', () => {
    expect(isWriteActionAllowed('tap_back_to_slots', { tm_state: 'resolving', screen: 'S5' })).toBe(
      true,
    );
    expect(isWriteActionAllowed('tap_back_to_slots', { tm_state: 'resolving', screen: 'S2' })).toBe(
      false,
    );
  });

  it('test_action_class_is_static_and_never_varies_by_screen', () => {
    expect(actionClass('submit_action')).toBe('mutating');
    expect(actionClass('open_card')).toBe('readonly');
    expect(actionClass('nonsense')).toBeNull();
  });

  it('test_an_unknown_action_fails_closed', () => {
    expect(isWriteActionAllowed('tap_nonsense', { tm_state: 'awaiting_action', screen: 'S2' })).toBe(
      false,
    );
  });

  it('test_three_actions_are_declared_outside_the_tm_state_gate', () => {
    expect([...UNGATED_ACTIONS]).toEqual(['tap_retry_reset', 'tap_continue_to_fate']);
    for (const action of UNGATED_ACTIONS) {
      expect(actionClass(action)).toBeNull();
    }
  });

  it('test_second_submit_during_resolving_is_rejected_at_the_ui_layer', () => {
    // AC-05: tap 1 flips tm_state synchronously; tap 2 is swallowed by D.1.
    let tmState: 'awaiting_action' | 'resolving' = 'awaiting_action';
    const submit = () => {
      if (!isWriteActionAllowed('submit_action', { tm_state: tmState, screen: 'S2' })) return false;
      tmState = 'resolving';
      return true;
    };
    expect(submit()).toBe(true);
    expect(submit()).toBe(false);
  });
});

describe('D.1 Undo button - hidden vs dimmed (AC-07)', () => {
  it('test_four_case_matrix', () => {
    expect(undoButtonState(false, { tm_state: 'awaiting_action', screen: 'S2' })).toBe('hidden');
    expect(undoButtonState(false, { tm_state: 'resolving', screen: 'S2' })).toBe('hidden');
    expect(undoButtonState(true, { tm_state: 'awaiting_action', screen: 'S2' })).toBe('enabled');
    expect(undoButtonState(true, { tm_state: 'resolving', screen: 'S2' })).toBe('disabled');
  });

  it('test_hidden_and_dimmed_are_distinct_mechanisms', () => {
    expect(undoButtonState(false, { tm_state: 'awaiting_action', screen: 'S2' })).not.toBe(
      'disabled',
    );
  });
});

describe('D.1 read-only mode (AC-37)', () => {
  it('test_s4ro_renders_zero_mutating_elements_not_even_disabled', () => {
    for (const action of MUTATING_ACTIONS) {
      expect(isActionRenderable(action, 'S4-RO')).toBe(false);
      expect(controlAlpha(action, { tm_state: 'awaiting_action', screen: 'S4-RO' }, UI_ALPHA)).toBeNull();
    }
    for (const action of READONLY_ACTIONS) {
      expect(isActionRenderable(action, 'S4-RO')).toBe(true);
    }
  });

  it('test_control_alpha_uses_the_registry_alphas', () => {
    expect(controlAlpha('submit_action', { tm_state: 'awaiting_action', screen: 'S2' }, UI_ALPHA)).toBe(
      UI_ALPHA.full,
    );
    expect(controlAlpha('submit_action', { tm_state: 'resolving', screen: 'S2' }, UI_ALPHA)).toBe(
      UI_ALPHA.disabled,
    );
  });
});

describe('D.2 screen transitions (AC-08..AC-11, AC-51)', () => {
  it('test_boot_always_lands_on_the_root_screen', () => {
    expect(BOOT_SCREEN).toBe('initial');
    expect(APP_SCREENS).toContain('initial');
  });

  it('test_declared_edges_pass_with_their_guards_satisfied', () => {
    expect(screenTransitionValid('initial', 'setup')).toBe(true);
    expect(screenTransitionValid('initial', 'gameplay', { slot_ready: true })).toBe(true);
    expect(screenTransitionValid('setup', 'gameplay', { setup_complete: true })).toBe(true);
    expect(screenTransitionValid('setup', 'initial')).toBe(true);
    expect(screenTransitionValid('gameplay', 'initial', { tm_state: 'awaiting_action' })).toBe(true);
  });

  it('test_guards_block_their_edges', () => {
    expect(screenTransitionValid('initial', 'gameplay', { slot_ready: false })).toBe(false);
    expect(screenTransitionValid('setup', 'gameplay', {})).toBe(false);
    expect(screenTransitionValid('gameplay', 'initial', { tm_state: 'resolving' })).toBe(false);
    expect(screenTransitionValid('gameplay', 'initial', { tm_state: 'undoing' })).toBe(false);
  });

  it('test_non_edges_return_zero_without_throwing', () => {
    expect(screenTransitionValid('gameplay', 'setup')).toBe(false);
    expect(screenTransitionValid('initial', 'initial')).toBe(false);
    expect(screenTransitionValid('gameplay', 'gameplay')).toBe(false);
    expect(screenTransitionValid('setup', 'setup')).toBe(false);
    expect(screenEdgeGuard('gameplay', 'setup')).toBeUndefined();
  });

  it('test_gdd_screen_mapping_is_recorded_explicitly', () => {
    expect(gddScreenOf('initial')).toBe('S1');
    expect(gddScreenOf('setup')).toBe('S1');
    expect(gddScreenOf('gameplay')).toBe('S2');
  });
});

describe('overlay tier (AC-01, AC-03, AC-64, AC-45)', () => {
  it('test_at_most_one_overlay_is_open_and_the_old_one_closes_silently', () => {
    const first = openOverlay('none', 'card', 'gameplay');
    expect(first.open).toBe('card');
    expect(first.closed).toBeNull();

    const second = openOverlay('card', 'customize', 'gameplay');
    expect(second.open).toBe('customize');
    expect(second.closed).toBe('card');
  });

  it('test_opening_an_overlay_costs_no_turn', () => {
    expect(openOverlay('none', 'settings', 'gameplay').turn_cost).toBe(0);
    expect(closeOverlay('settings').turn_cost).toBe(0);
  });

  it('test_overlay_source_screens_are_enforced', () => {
    expect(overlayAllowedFrom('settings', 'initial')).toBe(true);
    expect(overlayAllowedFrom('settings', 'gameplay')).toBe(true);
    expect(overlayAllowedFrom('card', 'initial')).toBe(false);
    expect(overlayAllowedFrom('customize', 'initial')).toBe(false);
    expect(overlayAllowedFrom('confirmDelete', 'gameplay')).toBe(false);

    const rejected = openOverlay('none', 'card', 'initial');
    expect(rejected.changed).toBe(false);
    expect(rejected.open).toBe('none');
  });

  it('test_a_screen_transition_closes_the_overlay_before_the_flip', () => {
    const result = applyScreenTransition('gameplay', 'initial', 'card', {
      tm_state: 'awaiting_action',
    });
    expect(result.valid).toBe(true);
    expect(result.screen).toBe('initial');
    expect(result.open).toBe('none');
    expect(result.closed).toBe('card');
  });

  it('test_an_invalid_transition_leaves_screen_and_overlay_untouched', () => {
    const result = applyScreenTransition('gameplay', 'initial', 'card', { tm_state: 'resolving' });
    expect(result.valid).toBe(false);
    expect(result.screen).toBe('gameplay');
    expect(result.open).toBe('card');
  });

  it('test_escape_closes_the_topmost_tier_and_otherwise_does_nothing', () => {
    expect(handleEscape('settings').open).toBe('none');
    const nothingOpen = handleEscape('none');
    expect(nothingOpen.changed).toBe(false);
    expect(nothingOpen.open).toBe('none');
  });
});

describe('AI wait state (Core Rule #9, AC-33)', () => {
  it('test_phases_follow_the_escalation_then_timeout_order', () => {
    const opts = { escalationSeconds: 15, timeoutSeconds: 30 };
    expect(aiWaitPhase(0, 'resolving', opts)).toBe('writing');
    expect(aiWaitPhase(14_999, 'resolving', opts)).toBe('writing');
    expect(aiWaitPhase(15_000, 'resolving', opts)).toBe('escalated');
    expect(aiWaitPhase(29_999, 'resolving', opts)).toBe('escalated');
    expect(aiWaitPhase(30_000, 'resolving', opts)).toBe('timeout');
  });

  it('test_no_wait_state_outside_resolving', () => {
    expect(aiWaitPhase(99_000, 'awaiting_action')).toBe('idle');
    expect(aiWaitPhase(99_000, 'undoing')).toBe('idle');
  });

  it('test_escalation_is_strictly_below_both_the_gdd_and_the_shipped_timeout', () => {
    expect(UI_KNOBS.ai_writing_escalation_seconds).toBeLessThan(GDD_AI_CALL_TIMEOUT_SECONDS);
    expect(aiWaitInvariantHolds()).toBe(true);
    expect(aiWaitInvariantHolds({ timeoutSeconds: GDD_AI_CALL_TIMEOUT_SECONDS })).toBe(true);
  });

  it('test_timeout_returns_to_awaiting_action_preserving_the_free_text', () => {
    const outcome = aiTimeoutOutcome('ta rút kiếm');
    expect(outcome.tm_state).toBe('awaiting_action');
    expect(outcome.world_time_delta).toBe(0);
    expect(outcome.render_error_in_frame).toBe(true);
    expect(outcome.render_error_as_banner).toBe(false);
    expect(outcome.preserved_input).toBe('ta rút kiếm');
  });
});
