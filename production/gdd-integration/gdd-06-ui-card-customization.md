# Implementation Contract — GDD Cluster 06: Core UI / Character Card / Customization Mode

Sources (do not re-read; everything needed is extracted here):
- `design/gdd/core-ui-screen-navigation.md` (system #15, **Approved**, 895 lines)
- `design/gdd/character-card-identity.md` (system #14, **Approved**, 1247 lines)
- `design/gdd/character-customization-mode.md` (system #16, **In Design — Revised r3**, 1076 lines)

Out of scope by instruction: Combat System rules, Song Tu affinity mechanics. Only UI hooks are recorded.
Section refs use the GDDs' own IDs (Core Rule #n, D.n, AC-nn) so stories can cite them.

---

# PART A — Core UI / Screen Navigation (#15)

## A1. Purpose

#15 owns the global presentation shell and navigation topology of the game: it owns the **main play screen** (narrative frame + action-input area with 4 suggestion cards, intent-chip row, free-text box), and it routes between the few other surfaces — Save Slot Screen, Story Log, the Character Card overlay, and the 3-way continuation screen — without owning any of their *content*. It owns navigation structure, inter-surface display precedence, entry points (buttons + tap-a-name gated on `card_exists`), and the display-layer enforcement of the Turn Manager input lock (Resolving/Undoing → reject the second write action). Its design identity is anti-HUD: the player is holding one open journal, never "switching screens", so there is no persistent chrome bar, no loading screens, no sticky footer, no spinner.

## A2. Core rules (normative)

1. **Three display tiers only** (Core Rule #1). Tier *screen*: exactly one active from `{S1, S2, S4, S4-RO, S5}`. Tier *overlay*: at most **1** open at a time from `{O-Card, O-Set, O-ConfirmDelete}`; opening/closing costs no turn and must not lose the underlying screen's scroll position. Tier *banner*: non-blocking, at most 1 visible (queued FIFO), never modal, never self-navigating, renders on **every** screen including S5.
2. **S1 is the root** (#2). App boot always lands on S1 regardless of last-played slot (AC-51). "Tiếp tục"/"Bắt đầu mới" → S2; "Xem lại" (closed slot) → S4-RO.
3. **S2 composition** (#3): scene header (location name + danger seal, non-sticky, content owned by Situation Gen), narrative frame (vertical scroll, sliding window ≤ `LIVE_WINDOW_TURNS`), action-input area (4 suggestion cards → intent-chip row → free-text + send + optional nudge line). The 3 marginalia glyphs 「Thẻ」「Lục」「Mục」 are **duplicated at both ends of the scroll flow** (header margin AND next to the input area). No other persistent chrome anywhere.
4. **Pending Fate visual weight** (#3b): the Kết liễu/Tha mạng suggestion goes through the standard 4-suggestion frame — no bespoke UI, no 2-step confirm — but renders **one ink-weight step darker** than the other 3 and carries **no intent chip** (forcing a direct tap or free-text).
5. **Single source of truth for input lock** (#4). UI reads Turn Manager `tm_state`. Resolving/Undoing disables every state-mutating control (submit, chip, suggestion card, Undo, Card's Song Tu/Recovery buttons, "back to slots", "delete slot"); disabled = reduced alpha (0.38), never a hue change. Read-only actions (open/close Card, read Story Log, scroll, open Settings) are always free. A second submit during Resolving is rejected **at the UI layer** via recursive subtree disable.
6. **Undo visibility** (#5): when `undo_available=false` the button **disappears entirely** (not disabled), including immediately after an `is_death_turn=true` turn.
7. **3-way takeover is tap-gated** (#6). When `continuation_choice_eligible=true`: the input area + chips + suggestions are removed immediately, but S5 does **not** replace S2 automatically. S2 shows the death-turn prose plus a trailing line "… (chạm để tiếp tục)" (Family-B marginalia, slow ~2s alpha breathing in `[0.85, 1.0]`), and **auto-scrolls to that line** — the single sanctioned auto-scroll and the single non-page-flip transition in the entire game. Leaving to S1 before tapping keeps the slot in "đang chơi" state with the flag still true; re-entry re-renders the same prose + line. 「Lục」/「Thẻ」 remain (read-only); 「Mục」 reduces to "Về danh sách sổ".
8. **Read-only mode** (#7, S4-RO): Story Log + Card overlay only; tap-name works; **no** mutating control is rendered at all (not even disabled — AC-37); the only exit is back to the `origin_screen`.
9. **Card entry points** (#8): (a) tap any name in narrative prose with `card_exists=true` — works on S2, S4, S4-RO, S5; (b) the 「Thẻ」 glyph (own card) at S2 header margin, S2 input row, S5 header margin, and the S4/S4-RO chrome bar → **5 render positions across 4 screens** (AC-31). A character/location list is explicitly out of MVP scope.
10. **AI wait state** (#9): during Resolving the narrative frame shows an inline ink-sweep ("thế giới đang viết", horizontal motion only, indeterminate, never a spinner). One diegetic escalation at `ai_writing_escalation_seconds` (provisional 15s, must be `< ai_call_timeout_seconds=30`), text variant swap only, exactly once. On timeout at 30s → back to Awaiting Action with the error rendered **inside the narrative frame** (not a banner), `world_time` unchanged, and the **free-text box content is preserved verbatim**.
11. **Settings minimal** (#10): opened from 「Mục」 (available at S1 and S2 only). Exactly 2 MVP groups: (a) **Cỡ chữ** S/M/L, applied globally via theme scale, stored in **device-level `app_config`, outside the slot bundle**; (b) **Cấu hình AI** (API key field; exact field list deferred to the backend ADR). #16 adds a third group ("Tùy chỉnh nhân vật") — see Part C.

## A3. State / data model

Screen + overlay state (owned by #15):

| Field | Type | Initial | Notes |
|---|---|---|---|
| `screen` | enum `{S1,S2,S4,S4-RO,S5}` | `S1` | Exactly one active; boot is unconditionally `S1` |
| `origin_screen` | enum `{S1,S5}` | — | Only meaningful while `screen=S4-RO`; decides the exit edge |
| `open_overlay` | enum `{none,O-Card,O-Set,O-ConfirmDelete}` | `none` | Max 1; new overlay auto-closes the old one silently |
| `banner_visible` | banner \| null | `null` | Max 1; queue is FIFO with one preemption exception |
| `banner_queue` | list\<banner\> | `[]` | `WRITE_FAILED_*` preempts an open quota-warning banner; the quota banner returns to the queue |
| `s2_resident_turns` | int | `0` | `= min(total_turns(slot), LIVE_WINDOW_TURNS)` |
| `s2_oldest_resident_turn_id` | turn_id | undefined | **Buffer-maintained state**, never derived arithmetically |
| `s2_last_synced_turn_id` | turn_id | `0` | `0` = cold-start not yet run; also stores the owning `slot_id` |
| `s2_buffer_slot_id` | slot id | null | Guard field: delta reconciliation is illegal across slots |
| `log_page_index` | int | `default_page_index` | Story Log current page |
| `log_loaded_pages` | list\<page\> | `[]` | Length ≤ `MAX_LOADED_PAGES` |
| `app_config.font_size_setting` | enum `{S,M,L}` \| absent | **absent** | Absence triggers the S1 font-size invitation, repeatedly, until a choice is made |
| `app_config.has_seen_marginalia_onboarding` | bool | `false` | Per-device, never per-slot; set true after the first ink-reveal |

Read from other systems (inject as mocks in tests): `tm_state ∈ {awaiting_action, resolving, undoing}`, `undo_available`, `is_death_turn`, `continuation_choice_eligible`, `new_slot_created`, `state` (Character Continuation: `"Processing Chơi Lại"` / `"Reset Failed"`), `in_combat`, `card_exists(char_id)`, `total_turns(slot)`, `last_confirmed_turn_id(slot)`, `is_touch_primary`, `viewport_width_px`, `slot_closure_reason ∈ {death, quota_exhausted}`, `error_code=LOAD_FAILED_UNREADABLE`.

## A4. Formulas & algorithms

**D.1 — `write_action_allowed(action, tm_state, screen)`** (total function, boolean):
```
class(action) ∈ {mutating, readonly}          // static table, never varies by screen
write_action_allowed =
    1                              if class(action) = readonly
    1                              if action = tap_back_to_slots AND screen = S5
    (tm_state = awaiting_action)   otherwise
```
`mutating` (8): `submit_action`, `tap_suggestion_card`, `tap_intent_chip`, `tap_undo`, `tap_song_tu_button`, `tap_recovery_button`, `tap_back_to_slots`, `tap_delete_slot`.
`readonly` (7): `open_card`, `close_card`, `tap_name_link`, `open_story_log`, `scroll_story_log`, `open_settings`, `close_settings`.
Test matrix = 15×3 = 45 combinations **plus** `tap_back_to_slots @ S5` = **46** distinct outcomes (AC-04).
Three actions are *not* gated by `tm_state`: `tap_retry_reset` (gated by #13's `state`), `tap_back_to_slots` (screen-dependent branch above), `tap_continue_to_fate` (always enabled while the line is visible, AC-57).
Undo button requires **both** `undo_available=true` (to render) AND `write_action_allowed(tap_undo, tm_state, S2)=1` (to press) — never "visible but inert without dimming" (AC-07).

**D.2 — `screen_transition_valid(from, to, ctx)`**: `1` iff `(from,to,guard) ∈ EDGES` and `guard(ctx)`; otherwise `0` (total, never throws; `0` means "don't render this control", not an error).
```
EDGES:
 S1  → S2     : true
 S1  → S4-RO  : true
 S2  → S4     : true                                  // allowed even during Resolving
 S4  → S2     : true
 S2  → S1     : tm_state = awaiting_action
 S2  → S5     : continuation_choice_eligible = true    // fires only on the tap
 S5  → S2     : new_slot_created = true
 S5  → S1     : true
 S5  → S4-RO  : true
 S4-RO → S1   : origin_screen = S1
 S4-RO → S5   : origin_screen = S5
```
Overlays are **not** nodes in this graph. Open-source sets: `O-Card` from `{S2,S4,S4-RO,S5}` when `card_exists=true`; `O-Set` from `{S1,S2}`; `O-ConfirmDelete` from `{S1}` only. Any screen transition auto-closes the open overlay **before** the flip (typed content in O-ConfirmDelete is lost, not restored).

**D.3 — Story Log pagination**:
```
total_pages(slot)        = ceil(total_turns(slot) / PAGE_SIZE)
default_page_index(slot) = total_pages(slot) − 1        // MUST NOT be called when total_pages = 0
ui_memory_bound          = MAX_LOADED_PAGES × PAGE_SIZE // constant, independent of total_turns
should_prefetch(pos,dir) = distance_to_window_edge(pos,dir) ≤ PREFETCH_THRESHOLD
INVARIANT: PREFETCH_THRESHOLD < PAGE_SIZE               // CI-checked, AC-52
```
Data source is `get_turn_page(anchor_turn_id, count, direction) → {records, has_more}` (World Memory; never "give me the whole log"). Prefetch loads the adjacent page and evicts the farthest. On Undo of a turn inside a loaded page: **invalidate and reload that page**, never patch in place; `total_turns` decrements and `total_pages` may shrink. In S4-RO `total_turns` is frozen — no invalidation ever.

**D.3b — S2 live window** (the main-screen memory bound):
```
s2_resident_turns(slot) = min(total_turns(slot), LIVE_WINDOW_TURNS)
INVARIANT: LIVE_WINDOW_TURNS ≥ CONTENT_EXCHANGE_ESTIMATE   // cross-GDD with Combat, CI-checked AC-67
```
Content lifecycle:
- **Cold start** (open slot / first entry this session): one `get_turn_page(last_confirmed_turn_id, LIVE_WINDOW_TURNS, older)`; set `s2_last_synced_turn_id ← last_confirmed_turn_id`.
- **Turn confirmed while S2 visible**: append via the Turn Manager confirm signal (no API call), evict oldest if at the cap.
- **Turn confirmed while S2 hidden**: do **not** render; do not advance `s2_last_synced_turn_id`.
- **Return to S2, same slot, in sync**: reuse the buffer, no rebuild.
- **Return to S2, same slot, out of sync**: delta reconcile via `get_turn_page(anchor=s2_last_synced_turn_id, count=last_confirmed_turn_id − s2_last_synced_turn_id, newer)`; the delta is provably ≤ 1.
- **Different slot** (including S5→S2 "Chơi lại"): **always force cold start**. Mandatory guard — compare `slot_id` **before** comparing turn ids, otherwise a fresh slot yields `count = 1 − 400 = −399` (AC-60, AC-68).
- **Undo while the window was full**: remove the undone turn **and backfill one older turn** via `get_turn_page(anchor=old s2_oldest_resident_turn_id, count=1, older)` when `total_turns` after Undo is still ≥ `LIVE_WINDOW_TURNS`. Without the backfill the tripwire invariant fails on ordinary play.
- **Eviction must free memory for real** (`queue_free()` / cut the text from the buffer), never `visible=false`. Screen-tier Controls (the 5 screens) are the opposite — cached, never freed. Do not conflate the two lifetimes.
- **Scroll anchoring**: eviction and backfill both compensate scroll offset so on-screen content never jumps.
- Scrolling past the top edge shows a tappable Family-B line "— đọc tiếp về trước, mở 「Lục」 —" (opens **S4**, never loads more into S2), ≥44px hit area.
- Tripwire (AC-66): after any lifecycle operation returns control, `s2_oldest_resident_turn_id == last_confirmed_turn_id − s2_resident_turns + 1` must hold; violation must fail loudly.

**D.4 — Minimum touch target**:
```
// (a) prose-embedded targets — best effort, capped by surrounding typography
pad_v = min( max(0, TOUCH_TARGET_MIN − h)/2 , line_gap/2 )
pad_h = min( max(0, TOUCH_TARGET_MIN − w)/2 , max(0, gap_to_neighbor − MIN_ADJACENT_GAP_PX)/2 )
hit_height = h + 2·pad_v      hit_width = w + 2·pad_h
// (b) standalone elements (chip, card, glyph, button) — absolute
hit_height ≥ TOUCH_TARGET_MIN AND hit_width ≥ TOUCH_TARGET_MIN
```
Group (a) may fall short of 44px and is compliant-by-exception (WCAG "Inline" exemption). One wrapped line = one independent fragment. Adjacent targets must never overlap: the gap term wins over the padding term.

**D.5 — Font scale & two-column**:
```
theme_scale(setting) = FONT_SCALE_STEP[setting]      setting ∈ {S,M,L}
two_column_layout(viewport_width_px, setting, is_touch_primary) =
    0  if is_touch_primary
    1  if (not is_touch_primary) AND viewport_width_px ≥ 2·BASE_COLUMN_WIDTH_PX·theme_scale(setting) + COLUMN_GUTTER_PX
    0  otherwise
INVARIANT: FONT_SCALE_STEP[S] < FONT_SCALE_STEP[M] < FONT_SCALE_STEP[L]    // CI-checked, AC-69
```
Proven: at `viewport ≤ 480px` the threshold is ≥654px at every step → mobile is always 1 column; no `if is_mobile` branch is allowed. Font-size changes reflow **immediately** (display parameter) — deliberately the opposite of the Card's "never re-render mid-open" rule (world-state).

**D.6 — Transition duration family**:
```
rank: banner(1) < overlay_settings(2) < overlay_card(3) < screen(4)
DURATION_MS[overlay_card] = card_transition_ms          // owned by #14, not independently tunable here
INVARIANT: banner ≤ overlay_settings ≤ overlay_card ≤ screen
```
This is a **cross-knob** invariant: each knob's own safe range can be respected while the ordering still breaks. CI check is AC-27.

## A5. Tuning knobs

| Knob | Default | Safe range |
|---|---|---|
| `log_page_size` | 20 turns | 10–50; must stay `> log_prefetch_threshold` |
| `log_max_loaded_pages` | 3 pages | 2–5 (2 is a hard logical floor) |
| `log_prefetch_threshold` | 5 turns | 0 – `log_page_size`/2; must be `< log_page_size` |
| `live_window_turns` | 30 turns | current `CONTENT_EXCHANGE_ESTIMATE` – 50 (relative floor) |
| `font_scale_steps` | `{0.875, 1.0, 1.25}` | ±0.125 per step; exactly 3 steps; verify S<M<L jointly |
| `base_column_width_px` | 360 | 320–420 |
| `column_gutter_px` | 24 | 12–48 |
| `transition_banner_ms` | 120 | 80 – current `transition_settings_ms` |
| `transition_settings_ms` | 150 | current `transition_banner_ms` – `card_transition_ms` |
| `transition_screen_ms` | 260 | ≥ `card_transition_ms` – 400 |
| `ai_writing_escalation_seconds` | 15 (provisional) | 10–25, strictly `< ai_call_timeout_seconds` |

Locked constants (not knobs; changing requires external-standard re-review): `TOUCH_TARGET_MIN=44px`, `MIN_ADJACENT_GAP_PX=4px`. Foreign knobs referenced, never duplicated: `card_transition_ms=200` (#14), `quota_warn_threshold` (#6), `suggested_action_count=4` (#1), `undo_depth=1` (#1), `ai_call_timeout_seconds=30` (#4), `CONTENT_EXCHANGE_ESTIMATE=30` (#7).
Visual placeholder constants (single source, do not re-literal): alpha full `1.0`; alpha −1 step `0.68` (≈4.9:1, must meet AA); alpha disabled `0.38` (≈2.2:1, valid only under the WCAG 1.4.3 inactive-component exemption — never go lower); tap-to-continue breathing `[0.85, 1.0]`; focus ring `2px` fixed (does not scale with `theme_scale`); font-weight body `400`, tap-name `600` (Family B), marginalia glyph `300` (Family A); S4-RO desaturation `−40%` at constant lightness.

## A6. Edge cases resolved

- Death confirmed while the player is reading S4: **do not yank them**; "lật về" runs the normal S4→S2 edge, and S5 still waits for the tap on the continue line.
- Screen transition with an overlay open → the overlay closes first; overlays never survive a page flip.
- Opening a second overlay closes the first, silently, with no stacking.
- Double-tap on a suggestion card: tap 1 flips `tm_state→resolving` **synchronously in the same frame**; tap 2 is swallowed by D.1. No separate debounce timer.
- A name in prose with `card_exists=false` renders as plain text — no tap target, no underline, no link styling. There is no "dead link" state.
- Undo removing the turn that created a character: the prose disappears with the turn, so the tap target does too; if that character's Card is open it auto-closes.
- AI timeout while the player is on S4: the error surfaces on S2 (never a banner, never a forced navigation).
- Browser back button: explicitly **out of MVP scope**; no in-app history binding to browser history.
- Rotate/resize with a 2-column overlay open: recompute D.5 live, reflow 1↔2 columns, anchor scroll to the first visible block.
- Repeated "Thử lại" at S5: gated by Character Continuation's `state`, not `tm_state` (Turn Manager is inactive at S5).
- Esc: the topmost open tier consumes it; overlay open → close overlay; nothing open → **no action** (there is no pause menu). Esc never leaves a screen-tier screen.
- Quota banner while at S5: renders normally — the banner tier covers every screen.
- Story Log with `total_turns=0`: `total_pages=0`, empty state "Chưa có trang nào được viết", `default_page_index` is never called.
- Save Slot with 0 slots: one shared empty-state line for both "deleted everything" and "fresh device" (they are indistinguishable in data); the "Bắt đầu mới" CTA stays visible above it.

## A7. Interfaces

**Consumes**: Turn Manager (`tm_state`, `undo_available`, `is_death_turn`; sends `submit_action` and Undo through the standard path) · World Memory (`get_turn_page(anchor_turn_id, count, direction) → {records, has_more}`, `total_turns(slot)`, `last_confirmed_turn_id(slot)`, "Lượt N" markers) · Persistence (slot list + metadata: name, realm, `world_time`, status, timestamp, `slot_closure_reason`, `error_code`; quota/write-failure banners) · Character Continuation (`continuation_choice_eligible`, `state`) · Combat (`in_combat`; constraint: Combat may never trigger a screen change itself) · Situation Gen (chip menu grouped by NPC, scene header, nudge line) · Character Card (`card_exists(char_id)`, `card_transition_ms`) · AI layer (`ai_call_timeout_seconds=30`, elapsed/`error_class` escalation event).
**Provides**: the overlay tier itself, `two_column_layout` (D.5), tap-name and 「Thẻ」 entry points, the Pending Fate display-weight rule, banner placement, `app_config` ownership (`font_size_setting`, `has_seen_marginalia_onboarding`).

## A8. Acceptance checklist (compressed, IDs preserved)

- [ ] AC-01/02/03 [Unit] ≤1 overlay; ≤1 banner with FIFO queue; overlay open/close sends 0 Turn Manager actions and leaves `world_time` unchanged.
- [ ] AC-04 [Unit] full 46-combination `write_action_allowed` matrix.
- [ ] AC-05/06 [Int] second submit during Resolving never reaches Turn Manager; fast double-tap yields exactly 1 action.
- [ ] AC-07 [Unit+Manual] Undo 4-case matrix — hidden vs dimmed are distinct mechanisms.
- [ ] AC-08/09/10/11/47 [Unit] 11 valid edges pass, ≥5 non-edges return 0; S2→S1 `tm_state` guard; S4-RO exits to `origin_screen` (both directions); S2→S5 integrity check; S5→S2 negative `new_slot_created`.
- [ ] AC-12/13 [Int] death-during-S4 routes S4→S2 not S5; screen change closes O-Card first.
- [ ] AC-14/15/16/17/18/19 [Unit] 842-turn regression (43 pages, index 42); `ui_memory_bound` always 60; prefetch boundary 4/5/6 → 1/1/0; `total_turns=0` never calls `default_page_index`; Undo reloads rather than patches; S4-RO frozen.
- [ ] AC-20/21/22 [Unit] group-(b) always ≥44px; the "Vệ" regression (update expectations if the ADR picks the pad=0 route); adjacent targets never overlap.
- [ ] AC-23/24/25/26/69 [Unit/Int] exactly 3 scale steps; 2-column thresholds incl. `is_touch_primary=true` forcing 1 column; ≤480px always 1 column; immediate reflow; S<M<L invariant.
- [ ] AC-27 [Unit] duration ordering invariant + `overlay_card == card_transition_ms` from registry.
- [ ] AC-28/29/30/31 [Int/Unit] tap-name on 4 screens with tap=click parity; non-existent card = no link styling; Card auto-closes when Undo removes its source; 「Thẻ」 present at all 5 positions and synchronized.
- [ ] AC-32/33/34 [Manual/Int] ink-sweep indicator, horizontal only; timeout returns to Awaiting Action with in-frame error and unchanged `world_time`; timeout while on S4 does not force navigation.
- [ ] AC-35/36 [Int] font size persists per device across slots; Settings unreachable from S4/S4-RO/S5.
- [ ] AC-37 [Unit] S4-RO renders zero `mutating` elements (not even disabled). AC-38 cross-refs AC-10.
- [ ] AC-39/40/41 [Unit/Int] S5 never instantiates input nodes; 「Lục」/「Thẻ」 work at S5 read-only; retry lock keyed on #13's `state`.
- [ ] AC-42/43/44/45 [Manual/Int] banner renders at S5; banner never auto-times-out; both empty states; Esc layering.
- [ ] AC-46 [Int] `in_combat` transitions cause no system-initiated screen change.
- [ ] AC-48/49/50 [Unit/Int] `s2_resident_turns ≤ 30` for any `total_turns`; real eviction measured in the ADR's chosen unit + scroll anchoring + tappable boundary line opening S4; cold-start resume shows 30 turns immediately.
- [ ] AC-51 [Unit] boot always S1. AC-52/67 [Unit] prefetch and live-window cross-knob invariants.
- [ ] AC-53 [Unit+Manual] tap-name weight 600, Family-A glyph weight 300, body 400.
- [ ] AC-54/55 [Int+Manual] Pending Fate card has no chip and renders one step darker; S5 takeover uses its own transition path, not the screen-tier tween.
- [ ] AC-56a [Int] keyboard-only traversal of the full loop via 「Thẻ」, no keyboard trap. **AC-56b BLOCKED** (keyboard tap-name) — excluded from pass/fail; ADR-0006 declared it out of MVP scope.
- [ ] AC-57 [Int] takeover waits for the tap; ≥30s idle does not auto-advance; taps outside the line do nothing.
- [ ] AC-58/60/66/68 [Int/Unit] hidden-S2 delta reconciliation of exactly 1 turn; slot switch forces cold start (never a negative count); oldest-resident tripwire; slot guard applies to every entry path.
- [ ] AC-59a/59b [Int/Manual] Undo fades (alpha 1→0, ≤150ms) before node removal, identically for all **three** causes: next turn confirmed, `is_death_turn`, **hack-invalidate** (see Part C).
- [ ] AC-61a [Int] auto-scroll to the continue line + breathing alpha strictly within `[0.85, 1.0]`, ~2s cycle. **AC-61b [Manual, real playtest]** ≥3 naive players: ≥2/3 discover the tap within 10s, 0/3 abandon thinking it froze, ≥2/3 try a marginalia glyph unprompted.
- [ ] AC-62 [Int] S4 live "« Chơi tiếp" returns to S2 preserving scroll.
- [ ] AC-63a/63b/63c [Int/Unit/Manual] ink-reveal onboarding fires once **per device**; font-size invitation repeats until a choice is made; the invitation itself renders at alpha 1.0, at M-step glyph size, with ≥44px targets.
- [ ] AC-64 [Int] overlay auto-close matrix split by overlay: O-Card across 9 edges, O-Set across 5, O-ConfirmDelete across 2.
- [ ] AC-65 [Int] resize/rotate anchors scroll (distinct trigger from eviction).
- [ ] AC-70 [Int] O-ConfirmDelete escalated branch: reference name + input + confirm button all inside the top 55% of the viewport with a 45%-height virtual keyboard; auto-focus the input; Tab order input→Cancel→Delete; Enter submits; Esc cancels without deleting.

Totals declared by the GDD: **70 AC, 35 [Unit] BLOCKING**; [Integration]/[Manual]/[Config] are ADVISORY.

## A9. Open questions

OQ#2 browser back / `beforeunload` interception. OQ#3 exact "Cấu hình AI" field list (backend ADR). OQ#4 `app_config` storage mechanism (localStorage vs a corner of Persistence). OQ#9 cross-system state query mechanism (signal vs poll vs autoload) for `tm_state`/`undo_available`/`card_exists`/`continuation_choice_eligible` — directly shapes how D.1/D.2 become code. OQ#12 **SC 1.4.4 Resize Text 200%** may be unreachable: 3 discrete steps capped at 1.25 — if browser zoom is locked, D.5 needs an XL step (~2.0) or an explicit documented deviation; also verify the fixed 2px focus ring keeps ≥3:1 contrast at step L. OQ#13 eviction can remove content the player is *currently reading* (proposed: defer eviction one beat, temporary cap `LIVE_WINDOW_TURNS + 1`). OQ#1 residual: official viewport bands for non-2-column responsive decisions. OQ#6 copy approval for the new empty-state line. Closed and binding: OQ#5/ADR-0007 (3 autoload canvas layers 0/1/2, screens cached by visibility and never freed; custom HTML shell with `viewport-fit=cover`, safe-area read via `getComputedStyle`, **never `eval()`**); OQ#7 `get_turn_page` signature; OQ#8 `reset_in_progress ≡ state="Processing Chơi Lại"`; OQ#10 free-text preserved through timeout; OQ#11/ADR-0006 tap-name and marginalia accessibility declared out of MVP scope with 4 binding conditions, including **never claiming "WCAG 2.1 AA compliant" while the gap is open**; OQ#14 the single diegetic AI-wait escalation.

---

# PART B — Character Card & Identity (#14)

## B1. Purpose

The Character Card is the **only legal surface for raw mechanical numbers** in the entire game and the player's designated "cheat": every character with a `char_id` — the protagonist and every named NPC — has a card viewable at any time, exposing objective mechanical truth (stats, affinity, alive/dead) instead of inference from prose. Architecturally it is a **read-only presentation layer**: it computes no gameplay values and writes no world state; it aggregates data already locked by nine other systems. Two deliberate exceptions to read-only: it **owns** each character's 12 starting stats `base_X0` (the seed `stat_growth` builds on) and it **owns** the `npc_tag` and `concealment` schemas. Opening a card is free — no turn, no AI call, no `world_time` movement, allowed in every Turn Manager state.

## B2. Core rules (normative)

1. **Read-only display** (#1). Every displayed value is read from the **last locked** state of the owning system; never an intermediate value mid-resolution.
2. **Card existence** (#2). A card is created automatically, once, permanently, when a character first appears in a **confirmed, not-undone** turn (i.e. has an entity record). **Scope: only characters with a `char_id`.** Anonymous ambient opponents (procedural "a band of bandits", "a wild beast") have no `char_id`, no entity record, and **no card**; Combat synthesizes their stats from `level + stat_growth`. Canon characters not yet met have no card.
3. **Fixed block order** (#3), always ①②③④⑤⑥ regardless of flags: ① Profile (name, gender, thân phận, attitude-toward-protagonist [NPC cards only — a short text summary drawn from **the same 7-band source** as block ④, not a separate field, not concealable], personality, appearance, backstory, current location); ② Combat stats (level-tier + the 12 stats + estimated combat power; **protagonist card additionally** shows an EXP bar with "còn X EXP tới cấp kế"); ③ Equipment & skills (`equipped_weapon_id` + `known_skill_ids`, rendered as display names); ④ Affinity & Song Tu (NPC cards only: affinity number + 7-band attitude + the 5-state Song Tu button); ⑤ Combat-status block (only while `in_combat=true`: both sides' HP in discrete steps, current exchange, 3-state outcome banner); ⑥ Permanent status badges (`alive=false` seal; the vermilion "phế đan điền" block + Recovery button when `death_and_consequence_blocked=true`).
4. **Sole numeric surface** (#4): no card block may be quoted verbatim into narrative prose.
5. **Two-layer identity** (#5): a `is_major_canon=true` character in disguise shows **both** the disguise identity and the true identity (the transmigrator's privilege — information only; other NPCs remain fooled). An ordinary NPC concealing shows only the state "đang che giấu/dịch dung" and **must never** leak the true identity. The privilege covers **identity fields only**, never live stats.
6. **Concealment display** (#6): when `concealment.active=true` the card renders the pre-authored surface values `concealment.displayed_*` with a 「che giấu」 badge on each concealed field; fields without a surface value show `"???"`. Estimated combat power is computed on the surface values, and when it resolves to a number it **always carries the concealment badge itself** — the badge (the "this may not be true" signal) is never hidden even though the number may be false. **Activation constraint**: `concealment.active` may only be set `true` when content/AI has filled `displayed_value` for **all 12 combat stats** (all-or-nothing) — otherwise D.4 propagates `"???"` immediately and destroys the design intent. Combat always uses **true** values.
7. **Writes only through buttons** (#7): the only two mutating controls are the Song Tu button (state machine owned by NPC Affinity) and the Recovery button (conditions owned by Death & Consequence, ≤2 choices). Both send **normal actions through Turn Manager** (cost a turn, lock on Resolving, undoable). Kết liễu/Tha mạng are **never** on the card.
8. **Data ownership** (#8): (a) the profile **schema** (instances live in the Entity Record blob whose **storage is owned by Persistence**, opaque to it); (b) `base_X0` for all 12 stats per character; (c) the `npc_tag` schema — `npc_tag.medium_override` (nullable, default `"sỉ nhục"`) and `npc_tag.concealment_narrative_hint` (short authored text telling the AI how to describe this NPC while concealed; consumed by the AI/LLM layer and Contract Enforcement, which have both formally committed to injecting it plus a fixed "do not describe true power" directive); (d) the `concealment` schema.
9. **Investigation lives elsewhere** (#9): revealing a concealed NPC is an in-turn action owned by Situation Gen. The card only renders the result, and only from the **next open** onward.

## B3. State / data model

| Field | Type | Initial | Owner / notes |
|---|---|---|---|
| `char_id` | string | — | Identity key; two characters may share a display name |
| `card_exists(char_id)` | bool | `false` | D.1; monotonic true except for undo-of-creation-turn |
| `base_X0[12]` | float | authored per seed | **#14** — `HP` strictly `> 0`; the other 11 `≥ 0` |
| `npc_tag.medium_override` | string \| null | `null` → `"sỉ nhục"` | **#14**; consumed by Death & Consequence |
| `npc_tag.concealment_narrative_hint` | string \| null | `null` | **#14**; consumed by AI layer + Contract Enforcement |
| `concealment.active` | bool | `false` | **#14**; only settable with all 12 surface stats present |
| `concealment.displayed_[field]` | any \| null | `null` | **#14**; `null` → `"???"` |
| `card_open` | bool | `false` | Mutually exclusive with the 3-way overlay |
| Injected reads | — | — | `level`, `tier`, 12 stats via `stat_growth`, `exp_threshold`, `current_exp` (EXP) · `combat_power_estimate`/`estimate_ratio` (sentinels `"N/A"`/`"+∞"`), `in_combat`, `exchange_id`, both HP, `outcome.type` (Combat) · `equipped_weapon_id`, `known_skill_ids` + name table (Equipment) · affinity number, 7-band attitude, Song Tu 5-state (NPC Affinity) · `is_major_canon`, `true_identity`, alias list, tier profile (Setting & Canon) · `alive`, `death_and_consequence_blocked`, `pending_fate`, `efficacy`, `recovery_self_attempt_allowed` (Death & Consequence) · `location` (Situation Gen) · `continuation_choice_eligible` (Character Continuation) |

Field domains: `IDENTITY_FIELDS = {name, gender, than_phan}` · `STAT_FIELDS = {level, tier, HP, ATK, DEF, SPD, ACC, Né, CritRate, CritDamage, Amp, Mitigation, Lifesteal, HPRegen}` (14 = 2 + the 12 combat stats) · `PROFILE_FIELDS = {personality, appearance, backstory}` · `CONCEALABLE_FIELDS = IDENTITY ∪ STAT ∪ PROFILE`. Everything else on the card (affinity number/band, Song Tu button, `location`, `equipped_weapon_id`, `known_skill_ids`, `alive`/`blocked` badges, the combat block) is **outside** `CONCEALABLE_FIELDS` and always shows true values.

## B4. Formulas & algorithms

**D.1 — `card_exists(char_id)`** = OR over all turns `t` of `[ char_id ∈ entities_appearing(t) AND confirmed(t)=1 AND undone(t)=0 ]`. Boolean, no sentinel. Permanently true once satisfied, including after death. The only path back to `false` is undoing the exact creation turn — possible only while it is still the most recent turn (`undo_availability_window`), so a contradictory "exists and doesn't" state is unreachable. Anonymous ambient enemies are outside the function's domain.

**D.2 — `displayed_field(C, field)`** (the core selector; a total function returning exactly one of four result kinds):
```
displayed_field(C, field):
  if field ∈ IDENTITY_FIELDS AND is_major_canon(C):
      // absolute-priority guard: NEVER falls through to the concealment branch,
      // even when concealment.active(C) = true
      if disguise_active(C):
          dv = disguise_value(C, field)
          return dual_identity(true_value(C, field), dv) if dv is not null else true_value(C, field)
      else:
          return true_value(C, field)
  elif field ∈ CONCEALABLE_FIELDS AND concealment.active(C):
      v = concealment.displayed_value(C, field)
      return v if v is not null else "???"
  else:
      return true_value(C, field)
```
`disguise_active(C) := len(alias_list(C)) > 0` — **derived by the card**, because Setting & Canon exports no runtime "currently disguised" flag. Safe only because Setting & Canon has contractually committed that the alias list is **static per setting pack in MVP**. The four disjoint outputs: `true_value` · `displayed_value` · `"???"` · `dual_identity(true, disguise)`.

**D.3 — `exp_to_next(C)`** (protagonist card only):
```
is_awaiting_breakthrough(C) = (level(C) mod 10 == 0) AND (current_exp(C) ≥ exp_threshold(level(C)))
exp_to_next(C) = "chờ đột phá"                            if is_awaiting_breakthrough(C)
               = exp_threshold(level(C)) − current_exp(C)  otherwise
```
Never returns `0` in the normal branch. Worked examples: `level=25, threshold=340, exp=300 → 40`; `level=20, threshold=290, exp=290 → "chờ đột phá"`; `level=20, threshold=290, exp=250 → 40` (round level alone is not enough).

**D.4 — `displayed_estimate(C)`**:
```
stat_source(C, X) = displayed_field(C, X)   for X in the 12 combat stats (STAT_FIELDS minus level, tier)
displayed_estimate(C):
  if concealment.active(C) AND (∃ X : stat_source(C, X) == "???"):
      return "???"                                  // short-circuit; do NOT call the Combat formula
  else:
      return Combat D.13's Điểm_Chỉ_Số over stat_source values + Điểm_Kỹ_Năng + Điểm_Trang_Bị
```
Reuses Combat D.13 verbatim (no fork); only the *source* of the 12 inputs changes. One missing stat poisons the whole sum — a partially-computed number would silently mislead, whereas `"???"` is honest. The card's `"???"` sentinel space is separate from D.13's `"N/A"`/`"+∞"`.

**D.5 — `base_stat_completeness_check(char_id)`**, run **exactly once** at entity-record creation (not on every card open):
```
= defined(base_HP0) AND numeric(base_HP0) AND base_HP0 > 0            // strict, HP only
  AND ∀X in the other 11: defined ∧ numeric ∧ ≥ 0
```
Fail → block the turn confirmation, log `"content gap: ..."`, create **no** partial entity record. HP is strict `>0` because three downstream systems use it as a denominator (`hp_pct` in Combat, `margin_ratio` in NPC Affinity and Death & Consequence). `max_HP(C)` used downstream **is** the card's `HP` field (`true_value`), read directly and never through D.2, regardless of concealment.

**Card build algorithm (derived, testable as a pure function)**: given `(char_id, flags)` → emit blocks in fixed order; include ② always (with the EXP element only for the protagonist); include ④ only for NPCs; include ⑤ only when `in_combat=true` **and** `alive=true`; include ⑥ when `alive=false` or `blocked=true`; render the Recovery button only when Death & Consequence supplied valid choices; render the Song Tu button only in Available/Active (Locked/Broken/Ended → **hidden entirely**, no ghost). D.2 is evaluated at open time for the whole card as a snapshot; nothing patches individual fields mid-open.

## B5. Tuning knobs

| Knob | Default | Safe range |
|---|---|---|
| `base_X0` (12 values per character, data file) | per character seed (MVP: 4 authored) | HP strictly `> 0`; other 11 `≥ 0`; percentage stats ≤ `PERCENT_STAT_CAP` |
| `profile_text_max_length` | 280 chars/field | 120–600 |
| `card_transition_ms` | 200 | 0–400 (**cross-GDD risk, see below**) |
| `stat_display_precision` | 0 (integers); 1 decimal for % stats | 0–2 |

Not owned here (point at the source, never copy): `max_known_skills_per_character=6`, `SONG_TU_THRESHOLD=60` / `SONG_TU_BREAK_THRESHOLD=40` / `deep_hostility_threshold=-80`, the `w_X` combat-power weights, the 24 `LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X` constants. `base_X0 × LEVEL_GROWTH_X` jointly determine the whole power curve and must be tuned together at Vertical Slice.
⚠ **Cross-GDD hazard, both directions**: `card_transition_ms`'s local 0–400 range does not know about #15's D.6 ordering invariant. Tuning it **down** below `transition_banner_ms` breaks `banner ≤ card`; tuning it **up** (e.g. 300, perfectly legal locally) breaks `card ≤ screen` against #15's default 260 even if #15 is untouched. AC-27 is the CI net.

## B6. Edge cases resolved

- Comparison ratio where either side is `"???"` → display `"???"` immediately and **do not call** `estimate_ratio` (it assumes numeric input). If both sides are numeric, call it and echo its own sentinel verbatim if it hits 0/0.
- Undo of the creation turn → `card_exists` flips false and **every render cache for that card must be invalidated**, including any computed combat power.
- `concealment.active` or `disguise_active` changing while the card is open → **no mid-flight re-render**; the new values apply on the next open, and D.2 is then re-run for the whole card, never patched field-by-field.
- `in_combat=true` against a concealed opponent → block ⑤ shows Combat's **true** data (HP bar, exchange, banner) because it sits outside `CONCEALABLE_FIELDS`; the static stat block keeps showing surface values. Fighting is the MVP's only counterplay to concealment.
- AI generates an NPC missing `base_X0` → D.5 fails, turn blocked, content-gap logged. The primary prevention is a schema-constrained NPC-generation call; D.5 is the last safety net.
- `alive=false` → the card still opens forever, shows last-locked values plus the static vermilion seal; **all** interactive elements hidden/disabled (Song Tu enters Ended → hidden; no Recovery button; **no block ⑤ even if `in_combat=true`**).
- NPC with `severity=severe` → badge shows, but no Recovery button (Death & Consequence defines recovery methods for the protagonist only; the card renders a button only when the owning system supplies valid options).
- `in_combat=true` → Song Tu and Recovery are disabled **independently** of the Turn Manager lock (two separate disable sources; both must be tested).
- Empty states are independent per side: `equipped_weapon_id=null` → "tay không"; `known_skill_ids=[]` → "chưa học kỹ năng"; block ③ always renders; the implicit "Đánh thường" is never listed.
- Two characters sharing a display name → keyed strictly by `char_id`; two independent cards; disambiguated in the UI by location/thân phận.
- 3-way overlay activating while a card is open → the overlay takes over and the card closes; `card_open` and `overlay_open` are mutually exclusive at all times.

## B7. Interfaces

**Consumes (hard unless noted)**: EXP & Realm (`level`, `tier`, 12 stats via `stat_growth`, `exp_threshold`) · NPC Affinity (affinity number, 7-band attitude, Song Tu 5-state) · Setting & Canon (`is_major_canon`, `true_identity`, alias list, tier profile) · Combat (`combat_power_estimate`, `estimate_ratio`, `in_combat`, `exchange_id`, both HP, `outcome.type`) · Equipment (`equipped_weapon_id`, `known_skill_ids` + display-name table) · Death & Consequence (`alive`, `death_and_consequence_blocked`, `pending_fate`, `efficacy`, `recovery_self_attempt_allowed`) · Turn Manager (input-lock state; receives button actions) · World Memory (`entities_appearing(t)`) · Situation Gen (`location`, soft) · Character Continuation (3-way overlay trigger/content) · Contract Enforcement (Core Rule #4 mirror).
**Provides**: `base_X0` (→ EXP, hard) · `npc_tag.medium_override` (→ Death & Consequence) · `npc_tag.concealment_narrative_hint` (→ AI/LLM layer + Contract Enforcement, both committed) · `max_HP(C) ≡ HP` as a strictly-positive denominator (→ Combat, Death & Consequence, NPC Affinity) · `base_X(C)` true values to Combat (**never** through D.2) · card content and `card_transition_ms` (→ #15).

## B8. Acceptance checklist (compressed, IDs preserved)

- [ ] AC-01/02 [Unit] opening a card in all 3 `tm_state` values sends 0 actions, triggers 0 AI calls, leaves `world_time` unchanged, and is never blocked by the input lock.
- [ ] AC-03/04/05 [Unit] created once on the first confirmed turn and stays true forever; undo of the creation turn flips it false **and** invalidates the render cache; death never flips it.
- [ ] AC-06/07 [Unit] `medium_override` null → `"sỉ nhục"`, authored value passes through; `get_base_X0` returns stored values unrounded/untransformed.
- [ ] AC-08 [Unit] concealment flipped mid-open changes nothing until reopen, then D.2 re-runs for the whole card.
- [ ] AC-09/10/48/11 [Unit/Manual] block-selection function across 4 flag combinations with the order always ①..⑥; EXP element only on the protagonist card; block ④ only on NPC cards; static audit that no narration template references stat fields numerically.
- [ ] AC-12/13/14/15/16/17 [Unit] D.2's four output kinds, the non-concealable set always true, and the boundary where `is_major_canon` alone does **not** produce `dual_identity`.
- [ ] AC-18/19/20/21 [Unit] `exp_to_next` normal case (40), awaiting-breakthrough sentinel, round-level-but-below-threshold boundary, and never invoked for NPCs (spy = 0).
- [ ] AC-22/23/24/25 [Unit] D.4 reuses the mocked `Điểm_Chỉ_Số` with true values; with surface values under concealment; short-circuits to `"???"` **without** calling it; a single missing stat is enough.
- [ ] AC-26/27/28/46/47 [Unit] D.5 passes at 12/12; fails fast on a missing stat (no partial record, turn blocked, content-gap logged); fails on negative or non-numeric; **fails on `base_HP0=0` exactly** while `0.01` passes; Combat-facing accessors bypass D.2 entirely under concealment.
- [ ] AC-29/30/31/32/33 [Unit] Song Tu sends exactly 1 action through Turn Manager; Recovery renders exactly the supplied choices and forwards the selection; Kết liễu/Tha mạng never appear on the card; buttons disabled identically for Resolving and Undoing; `in_combat` disables them independently of the lock.
- [ ] AC-34/35/36/37/38/39 [Unit] sentinel short-circuit before `estimate_ratio`; dead character hides all interaction and block ⑤; NPC severe shows badge without a Recovery button; per-side empty states with block ③ always present and no "Đánh thường"; name collisions resolved by `char_id`; card/overlay mutual exclusion invariant.
- [ ] AC-40/41/42/43/44/45 [Manual] tap=click parity; 3 equivalent close paths with no turn cost; block order preserved across mobile 1-column and desktop 2-column with ③⑤⑥ accordions; disabled = alpha only, no hue change; dual-identity and both `"???"` renderings; keyboard focus traversal independent of pointer.

Gating: all **[Unit]** AC are BLOCKING (the 5 formulas are deterministic, and interaction **wiring** is mockable); **[Manual/UI]** AC covering interaction *feel* are ADVISORY. All external systems must be injected as mocks — no real systems, no AI, no network, no real clock, no unseeded RNG.

## B9. Open questions

OQ#1 the investigation mechanic that reveals a concealed NPC, plus partial-reveal semantics (owner: Situation Gen; needed before Vertical Slice). OQ#2 concealment slots for `Điểm_Kỹ_Năng`/`Điểm_Trang_Bị` (post-MVP; both default 0 today). OQ#3 card render-cache architecture (card-local vs shared UI cache) — AC-04 currently asserts black-box. OQ#4 whether `in_combat` × `alive=false` are mutually exclusive at the owning layer (AC-35 is only defensive). OQ#5 whether EXP should expose an explicit awaiting-breakthrough boolean instead of the card deriving it. OQ#6 who populates `concealment.displayed_*` for AI-generated NPCs (MVP's 3 seed NPCs are all content-authored). OQ#7 tap-name technique and the prose-name→`char_id` mapping (**no owner even at declaration level**; cuts across the AI layer and Contract Enforcement). OQ#8 the full `npc_tag` field list. OQ#9 the true-breakthrough visual (the only legal use of jade green) is undefined because EXP has no Visual/Audio section. Closed: OQ#10 storage ownership (Persistence owns the Entity Record blob), OQ#11 static alias lists in MVP, OQ#12 hint-consumption commitments, OQ#13 scope reduced to `char_id` holders, OQ#14 durability timing via ADR-0004 (card-existence writes go into per-turn `turn_records`; *field updates* to the entity record still follow the 50-turn cadence, so a crash can lose recent field updates but never the card's existence).

---

# PART C — Character Customization Mode (#16, "Tùy Chỉnh (hack)")

## C1. Purpose

An **opt-in** back door letting the player write directly onto the protagonist — level, the 12 base stats, and custom items/skills/thức — bypassing the earned-through-gameplay paths of EXP & Realm and Equipment & Skill Data. At the data layer this is an entirely **new write path independent of Turn Manager**: no turn cost, no AI narration, `world_time` unchanged. Because it does not inherit Turn Manager's lifecycle, it must specify its own: its own durable-write checkpoint (**the game's 3rd**), and a rule that the first hack write inside an Undo window **permanently kills the pending Undo** by invalidating its snapshot. It changes neither Pillar 2 nor Pillar 3 for the default game; it sits alongside them, and its integrity rests on exactly two real mechanisms — a permanent per-slot transparency flag, and a `hack_write` source label in the mechanical-state log. It maps to the existing app's "Tùy Chỉnh (hack)" `CustomizationModal`.

## C2. Core rules (normative)

1. **Two-layer access** (#1). (a) A device-level toggle in Settings (new third group "Tùy chỉnh nhân vật", after Cỡ chữ and Cấu hình AI), **outside the slot bundle**, default **OFF**. (b) With the toggle ON, at S2, `tm_state=awaiting_action`, `in_combat=false`, O-Set additionally shows a **"Chỉnh sửa nhân vật"** button opening the new overlay **O-Customize**.
2. **Hidden vs dimmed mapping** (#1b) — structural unavailability hides, temporary lock dims:

   | Failing condition | Button state | Reason |
   |---|---|---|
   | `toggle_enabled=false` | **hidden** (not rendered) | feature off |
   | `screen ≠ S2` | **hidden** | no live character to edit |
   | `tm_state ≠ awaiting_action` | **dimmed** `alpha=0.38` | AI writing / undoing |
   | `in_combat=true` | **dimmed** `alpha=0.38` | reopens after the fight |
   | `is_death_turn=true` (S2-D) | **hidden** | no living character — a genuinely reachable path that the first draft missed |

   The button must **live re-evaluate**: O-Set can be opened during Resolving, so the button switches dimmed↔enabled in place without closing and reopening O-Set.
3. **O-Customize is the 3rd overlay** (#2), obeying #15's existing max-1-overlay rule — opening it auto-closes O-Card/O-Set.
4. **Write `level`, never `tier`** (#3). `tier` is always derived via `tier_from_level = floor((level−1)/10)+1`; no tier field exists in the panel.
5. **12 base stats: all-12-or-nothing, with pre-fill** (#4). Opening zone 2 pre-fills all 12 fields from `get_base_X0`. Submit requires all 12 simultaneously; blocked on any missing field (a cleared field is `undefined`, **never coerced to `0.0`**), on `base_HP0 ≤ 0`, or on any non-finite value or value exceeding `STAT_WRITE_MAX`.
6. **Custom items/skills share the ID namespace** with original content (no prefix). Uniqueness is enforced **at runtime on submit** against all existing IDs in the same namespace; a collision **blocks** the submit and demands a manual rename — the system never auto-renames. Creating a skill **must** include **N ≥ 1 thức** in the same submit (no orphan skills).
7. **Bypasses Turn Manager, with a self-specified lifecycle** (#6):
   - **(a) Durable write at commit**: each successful submit is the game's **3rd durable checkpoint** — write-through atomic to Persistence at commit time, not at the next turn checkpoint. This is an **amendment** to Persistence Core Rule #1 ("auto-save only at 2 checkpoints").
     - **(a1) Async ordering**: `commit()` is async (results only via `committed()`/`failed()`). On pressing any Save (or delete) button, immediately lock **all 3 Save buttons, all delete buttons, and the Undo button** for the whole in-flight window (dimmed 0.38). The **entire** effect of the transaction — applying values in memory, invalidating the snapshot, setting the flag, emitting the log entry, showing "Đã ghi" — happens **only after** `committed()`. On `failed()`: change nothing, invalidate nothing, set nothing, log nothing; show an error inside the zone and unlock. There must exist no window in which Undo is pressable while a hack write is in flight.
     - **(a2) Record identity**: `turn_records` is keyed `[slot_id, world_time]` and append-only; hack writes keep `world_time`, so the 3rd checkpoint **must not** write under the current turn-record key (it would overwrite `locked_result`/`narration_text` and break the `undone` tombstone). The amendment must pick either a separate record type with a sequential sub-key (e.g. `[slot_id, world_time, hack_seq]`) or a forced full-snapshot flush outside cadence. Replay order must place the hack write after turn T and before turn T+1.
   - **(b) Invalidate the pending Undo snapshot**: the **first** hack write (including a delete) committed inside an Undo window calls `invalidate_pending_snapshot()` — the previous turn's Undo is **permanently locked immediately**, and the Undo button **disappears** using the standard `undo-button` pattern (tween alpha 1.0→0 ≤150ms, then remove the node) — **not** dimming, because 0.38 means *temporary* lock. This requires a **3-site amendment**: ADR-0004 (new method), `turn-manager.md`, and the registry formula `undo_availability_window` (new conjunct `pending_snapshot_valid`).
   - **(c) Source label**: every write emits a mechanical-state-log entry tagged `hack_write` (delete operations additionally record type `delete` + the entry identifier), so a hack write between two turn snapshots is never misread as "the AI silently changed a mechanical result" — the only BLOCKING FAIL criterion of the MVP Core Hypothesis.
   - **(d)** No turn consumed, no AI call, `world_time` unchanged, no action sent to Turn Manager.
8. **Permanent, no automatic revert** (#7). No panel-local undo; the standard 1-turn Undo cannot reach a hack write. "Permanent" means *no automatic way back* — the player may still overwrite values or delete an unreferenced custom entry.
9. **Indelible transparency flag** (#8). The first write of any field through O-Customize in a slot sets `hack_mode_used_this_slot = true` (**in the slot bundle**, not device-level). It is never cleared, even if the toggle is later turned off. **Mandatory technical constraint**: the flag must live **outside the scope of every `capture_snapshot()`/`restore_snapshot()`** and be persisted in the same write-through checkpoint as (a) — otherwise an Undo could roll back the "never erased" flag and collapse the system's only ethical pillar.
10. **Hard lock during combat** (#9): the panel is fully disabled while `in_combat=true`.
11. **Progress writes are one atomic triple `(level, current_exp, state)`** (#10). `state ∈ {"Tu Luyện Thường", "Chờ Đột Phá"}`. **No-op gate**: `current_exp` resets to 0 only when `new_level ≠ old_level` **and** the player supplied no explicit value; submitting the current level is a true no-op that does **not** wipe accumulated EXP. `current_exp` is a free finite float ≥ 0 (never coerced to integer — the EXP economy is float-native). `state` must be written in the same transaction, otherwise a character sitting in "Chờ Đột Phá" who hacks their level hangs forever.
12. **Conditional deletion of custom entries** (#11), allowed only when **both**: (a) the entry was created by hack mode (`created_by_hack` — internal admin metadata that **no gameplay system may branch on**), and (b) the entry is unreferenced, defined **per type**: *item* — never ever equipped (`was_ever_equipped`, past-perfect, not "currently equipped") **and** absent from World Memory; *skill* — never resolved in any combat **and** absent from World Memory, and deleting it **removes the ID from `known_skill_ids` in the same transaction** (no dangling reference); *thức* — its parent skill does not survive outside this delete batch, and absent from World Memory. Deleting a skill cascades to all N of its thức, **all-or-nothing**: if any single element fails the check, the whole delete is blocked. **A delete is a full hack-write commit** — it applies (a), (a1), (b), (c), and the per-button debounce in their entirety. A successful delete frees the ID for reuse. Original content never has a delete button.

## C3. State / data model

| Field | Type | Initial | Scope |
|---|---|---|---|
| `toggle_enabled` | bool | `false` (`hack_mode_toggle_default`) | **device-level `app_config`**, outside the slot bundle |
| `hack_mode_used_this_slot` | bool | `false` | **slot bundle**, outside every snapshot, never cleared |
| `customize_panel_open` | bool | `false` | Overlay tier, mutually exclusive with O-Card/O-Set |
| `level` (draft) | int | pre-filled from character | Zone 1, required on save |
| `current_exp` (draft) | float | pre-filled / defaulted per no-op gate | Zone 1, optional |
| `state` (draft) | enum | `"Tu Luyện Thường"` | Zone 1; "Chờ Đột Phá" selectable only when D.2b's cross-invariant holds |
| `base_X0_map` (draft) | map\<12 keys → float\|undefined\> | pre-filled via `get_base_X0` | Zone 2 |
| custom entry drafts | per type | empty, **kept separately per type** across type switches in one panel session | Zone 3 |
| `created_by_hack` | bool | set at creation | Per entry, admin metadata only |
| `was_ever_equipped` / `was_ever_resolved_in_combat` | bool | `false` | **New persistent per-entry markers required from Equipment & Skill Data** |
| in-flight lock | bool | `false` | Locks 3 Saves + all deletes + Undo during `commit()` |

Canonical 12 stat keys (technical, must match #14's `STAT_FIELDS` exactly — Vietnamese labels are a `/ux-design` concern, and the validator compares **keys**, not labels): `{HP, ATK, DEF, SPD, ACC, Né, CritRate, CritDamage, Amp, Mitigation, Lifesteal, HPRegen}`. (Round 1 wrote `Né tránh, Crit Rate, Crit Damage` — three keys off — which would have failed 100% of submits.)

## C4. Formulas & algorithms

**D.1 — `customize_panel_available`** `= toggle_enabled AND (screen=S2) AND (tm_state=awaiting_action) AND (NOT in_combat) AND (NOT is_death_turn)`. Total function; full matrix 2×5×3×2×2 = **120** combinations, exactly 1 true. No S5 carve-out is needed (no legal path there). If `in_combat` flips true while the panel is open, the predicate re-evaluates false and the panel **force-closes** (not merely disables) — a defensive path only, unreachable through real gameplay, tested by direct mock injection.

**D.2 — `is_valid_level_write(level)`** `= is_int(level) AND level ≥ 1 AND level ≤ LEVEL_WRITE_MAX`. `0` fails (it would make `tier_from_level(0)=0`); `3.5` fails (fail fast, never silently round); `"1e999"`/`Infinity` are caught by the finite ceiling; `NaN` fails on every comparison.

**D.2b — `is_valid_progress_write(level, current_exp, state, old_level)`**:
```
is_valid_level_write(level)
AND state ∈ {"Tu Luyện Thường", "Chờ Đột Phá"}
AND is_finite(current_exp) AND current_exp ≥ 0
AND (level mod 10 ≠ 0  ⟹ current_exp < exp_threshold(level))                              // STRICT upper bound
AND (level mod 10 == 0 ⟹ (current_exp == exp_threshold(level) ⟺ state == "Chờ Đột Phá"))  // two-way
AND (level mod 10 ≠ 0  ⟹ state == "Tu Luyện Thường")                                      // blocks "ghost breakthrough"
AND (level mod 10 == 0 ⟹ current_exp ≤ exp_threshold(level))                              // absolute cap, independent of the iff
```
Default-fill semantics **before** validation: no `current_exp` entered → `0` if `level ≠ old_level`, else keep the current value; no `state` chosen → `"Tu Luyện Thường"` if `level ≠ old_level`, else keep. `old_level` is re-read on **every** Save press (the panel stays open and can save repeatedly).
Pass: `(50,0,"Tu Luyện Thường",25)`, `(10,exp_threshold(10),"Chờ Đột Phá",9)`, `(25,200,"Tu Luyện Thường",25)`, `(25,123.45,"Tu Luyện Thường",25)`.
Fail: `(50,exp_threshold(50)+1,·,·)`, `(25,200,"Chờ Đột Phá",25)`, `(25,340,"Tu Luyện Thường",25)`, `(10,exp_threshold(10),"Tu Luyện Thường",9)`, `(11,exp_threshold(11),"Chờ Đột Phá",·)`, `(10,5,"Chờ Đột Phá",·)`, `(25,-1,·,·)`, `(25,Infinity,·,·)`.

**D.3 — `is_valid_base_stat_set(base_X0_map)`**:
```
(keys(base_X0_map) == STAT_FIELDS_12)                         // equality, not superset — a stray key fails
AND ∀X: numeric ∧ is_finite ∧ base_X0_map[X] ≤ STAT_WRITE_MAX
AND base_X0_map[HP] > 0
AND ∀X ≠ HP: base_X0_map[X] ≥ 0
```
Mandatory parse rule: an empty raw UI input maps to `undefined`, **never** `0.0` — otherwise "left blank" and "deliberately zero" become indistinguishable. Percentage stats above `PERCENT_STAT_CAP` are **not** blocked here (clamping is read-time, owned by EXP). Large-but-finite values are legal by design.

**D.4 — `is_valid_custom_id(new_id, namespace, existing_id_set)`** `= non_empty(new_id) AND new_id ∉ existing_id_set`, with three separate namespaces `{item, skill, thuc}` and **case-sensitive** comparison. Cardinality gate: `is_valid_skill_submit(skill_id, thuc_ids) = is_valid_custom_id(skill_id,…) AND len(thuc_ids) ≥ 1 AND ∀i: is_valid_custom_id(thuc_ids[i], thuc, existing ∪ {ids already accepted in this batch})` — later calls in the same batch must see earlier accepted IDs, so two new thức cannot collide with each other. Deleted entries' IDs leave `existing_id_set` and become reusable.

**D.5 — `is_deletable_custom_entry(entry)`**:
```
entry.created_by_hack
AND NOT referenced_in_world_memory(entry)
AND per-type:
    item:  NOT was_ever_equipped(entry)
    skill: NOT was_ever_resolved_in_combat(entry)
    thức:  NOT has_parent_skill_alive(entry)
```
`referenced_in_world_memory` is **await-shaped** (ADR-0005 makes all five World Memory public methods coroutines), so the routine that builds the delete-button list for N entries is itself async and must never be called from a per-frame callback. `referenced_in_world_memory` must be a **structural entity reference** (entity-id tagged at narration time), never a display-name text match — a text match produces false negatives and lets a story-referenced entry be deleted.

**Apply / validate / rollback flow** (per zone, per Save press):
```
1. read drafts for this zone only; re-read old_level / current base_X0 / existing_id_set at this instant
2. run the zone validator (D.2b | D.3 | D.4+cardinality | D.5 for delete)
3. on failure  → render the error inside THIS zone; other zones untouched; no partial write; return
4. on success  → lock all 3 Save buttons + all delete buttons + Undo (alpha 0.38); start async commit()
5. failed()    → restore nothing (nothing was applied), show the error in this zone, unlock. STOP.
6. committed() → in one atomic step, in this order:
      a. apply values to in-memory state
      b. if a pending Undo snapshot exists → invalidate_pending_snapshot() (Undo button tweens out ≤150ms, then unmounts)
      c. set hack_mode_used_this_slot = true (same write-through checkpoint, outside every snapshot)
      d. emit the hack_write log entry (delete ops add type=delete + entry id)
      e. show "Đã ghi" in this zone (persists until a field in this zone is edited — no timer)
         + if (b) fired, append "Undo lượt trước đã khóa"
      f. unlock buttons (respect SUBMIT_DEBOUNCE_MS per button)
```
There is no cross-zone "partial save" semantics; each Save press is its own atomic transaction over its own zone. The panel does **not** close after a submit.

## C5. Tuning knobs

| Knob | Default | Safe range |
|---|---|---|
| `LEVEL_WRITE_MAX` | 1,000,000 | 1,000 – 10,000,000 |
| `STAT_WRITE_MAX` | 1,000,000,000 | 1,000,000 – 1e12 |
| `SUBMIT_DEBOUNCE_MS` | 500 ms | 200 – 1000 ms, applied **per button** |
| `hack_mode_toggle_default` | `false` (OFF) | `{true,false}` — a policy switch, not a balance dial |

Both ceilings are **technical hygiene only** (typos, non-finite, overflow), explicitly **not** balance. The earlier claim that "Combat protects itself via `FLOOR_TOTAL`" is technically **false** — `FLOOR_TOTAL` is a multiplier *floor* and constrains nothing about absolute magnitude. Nothing in combat blocks the consequences of extreme level/stats; that is intentional. Note the counter-intuitive side effect: hacking level **high** does *not* disable hostile initiative (the gate `level(npc) − level(player) ≤ 20` is one-directional, protecting the player); what actually silences that branch is hacking level **low** with high stats. Referenced but not owned: `max_known_skills_per_character=6`, `min_thuc_per_skill=3`.

## C6. Edge cases resolved

- Skills exceeding `max_known_skills_per_character=6`: **not blocked** — warn ("AI may pick suboptimal skills when narrating"), still write. Same treatment for a skill below `min_thuc_per_skill=3` (only **0** thức is blocked).
- Custom item missing `efficacy` or outside `[0,1]`: **blocked** (mirrors the author-mandatory constraint with no default).
- Custom skill whose `weapon_type` mismatches the equipped weapon: allowed — it is simply unusable until the right weapon is equipped, exactly as for original content.
- Loading a slot with `hack_mode_used_this_slot=true` on a device where the toggle is OFF: the hacked data **loads and works normally** through the same code path as original content. The toggle gates only the right to open the editor; the flag is a historical trace, not a runtime condition.
- Interaction with 1-turn Undo: hack writes are **not** invisible to Undo — `restore_snapshot()` would overwrite them, hence rule #6b. After the invalidation, hacked values are ordinary baseline: later turns' snapshots capture them, and later Undos roll back to the hacked baseline. The transparency flag, being outside all snapshots, is never rolled back.
- Bypassing progression gates is **intentional**: hacking level across a tier boundary skips `breakthrough_requirement_met` (only satisfiable through combat) and skips `death_and_consequence_blocked`. Accepted consequences: canon content tied to a real breakthrough will not fire for a hacked tier, and a crippled character can still hack levels. **Binding downstream constraint: no system may infer "legitimate progression / milestone reached" from `tier`/`level`** — read `hack_mode_used_this_slot` instead.
- A slot with the flag set is **not eligible** as validation data for MVP/Vertical-Slice verification tiers (b)/(c) (natural affinity growth, real breakthrough pacing). Tier (a) — the Mechanic/Narration Contract — remains protected by the `hack_write` label.
- Force-close discards the draft with no warning, deliberately. Player-initiated close (X / tap-outside / Esc) also discards — "Cancel" is the default semantics of every non-Save exit. **Exception**: while a field has focus, tap-outside/Esc apply a **two-step rule** — the first gesture only unfocuses/hides the virtual keyboard, the second closes (the mobile hide-keyboard gesture does not carry intent to cancel, and "short numbers, easy to retype" is false for zone 3).
- Double-tapping a Save button: the button self-locks after the first press until the write finishes (`SUBMIT_DEBOUNCE_MS`, per button), showing the 0.38 dimmed state — never a silent lock.
- After a write, hack-injected values are treated as truth throughout gameplay logic — no "fake/temporary" flag exists at the mechanical layer, and a hack-boosted character can still die normally at the deep-hostility threshold, with no exemption.
- The panel only ever targets the active protagonist's `char_id`; there is no UI to select another character, even though the Equipment/Skill schema is keyed by a general `char_id`.

## C7. Interfaces

**Consumes**: Core UI (`screen`, the overlay state machine, the hidden/dimmed convention, `TOUCH_TARGET_MIN=44px`, D.5's touch-primary 1-column rule) · Turn Manager / ADR-0004 (`tm_state`, `is_death_turn`; calls the **new** `invalidate_pending_snapshot()`) · Combat (`in_combat`) · EXP (`tier_from_level`, `exp_threshold`, the D.7 `state` enum) · Character Card (`get_base_X0`, `base_stat_completeness_check` semantics, `STAT_FIELDS`) · Equipment (item/skill/thức schemas, `is_valid_dataset` uniqueness semantics, the N≥1 invariant, `known_skill_ids`, and the new `was_ever_equipped`/`was_ever_resolved_in_combat` markers) · World Memory (`referenced_in_world_memory(entry)`) · Persistence (write-through commit).
**Emits**: the atomic `(level, current_exp, state)` triple → EXP · `base_X0_map` (12 keys) → Character Card · custom item/skill/thức create + delete → Equipment · the 3rd durable checkpoint + `hack_mode_used_this_slot` → Persistence · a `hack_write`-labelled entry per commit → the mechanical-state log · `invalidate_pending_snapshot()` → Turn Manager.
**⚠ Mandatory propagation before implementation** (every upstream GDD is Approved and unaware this system exists): (i) Persistence Core Rule #1 → 3 checkpoints, with the record-identity constraint of #6a2, plus a `schema_version` bump; (ii) ADR-0004 + `turn-manager.md` + registry `undo_availability_window` (new `pending_snapshot_valid` conjunct) — **3 sites**; (iii) core-ui AC-59a/59b gain "hack-invalidate" as a third cause of the Undo button vanishing; (iv) Equipment gains the two per-entry markers and the `known_skill_ids` removal semantics; (v) World Memory's `referenced_in_world_memory` must be structural; (vi) registry `referenced_by` housekeeping. Run `/propagate-design-change`.

## C8. Acceptance checklist (compressed, IDs preserved)

- [ ] AC-01 [Unit] full 120-combination D.1 matrix, exactly 1 true. AC-03 [Int] button not rendered from S1. AC-41 [Int] (a) dimmed 0.38 during Resolving, (b) live re-evaluate to enabled without reopening O-Set, (c) hidden when toggle OFF, (d) dimmed when `in_combat=true`.
- [ ] AC-02 [Int, defensive mock-only] injected `in_combat=true` force-closes the panel and discards the draft without warning.
- [ ] AC-04/43/05 [Unit/Int] O-Customize closes O-Card first; the real path via the O-Set button closes O-Set first; the reverse direction holds; never 2 overlays open.
- [ ] AC-06 [Unit] `is_valid_level_write` over `{1,50,0,-5,3.5,1000000,1000001,"","abc",NaN}`. AC-35 [Unit] the 13 D.2b fixtures listed in C4.
- [ ] AC-07 [Int] no `tier` field anywhere in the UI tree; derived tier correct at `level=1→1`, `10→1`, `11→2`. AC-08 [Int] exactly **one** write call carrying `{level, current_exp, state}` with **no** `tier` key; any emitted signal must already expose the new `current_exp`. AC-36 [Int] no-op preserves EXP **and** preserves an existing "Chờ Đột Phá" state.
- [ ] AC-09/37/11 [Unit] D.3 over 4 cases; non-finite/ceiling cases incl. `STAT_WRITE_MAX` passing and ×10 failing, blank→`undefined` failing while a deliberate `0` passes; a stray extra key fails (equality check). AC-10 [Int] 11/12 blocks with zero writes. AC-42 [Int] pre-fill matches `get_base_X0` and inline validation stays silent until first interaction.
- [ ] AC-12/13/14/15/38/16 [Unit/Int] uniqueness incl. case sensitivity and namespace separation; intra-batch thức collision blocked with N+1 validator calls; 0-thức skill blocked; collisions never auto-renamed.
- [ ] AC-17 [Int] no Turn Manager action, `world_time`/`tm_state` unchanged, no AI call. AC-33 [Int] exactly 1 write-through at commit; values survive a simulated kill+reload. **AC-34 [Int, precondition: the 3-site amendment must be approved first]** — `invalidate_pending_snapshot()` called, `undo_available=false` immediately, Undo button tweens out (**not** dimmed), later Undo attempts rejected; a second hack write in the same window leaves post-conditions unchanged (assert post-conditions, do not count calls); with no pending snapshot the method is **not** called (count = 0) and nothing errors. AC-40 [Int] N commits → N `hack_write` entries, deletes carrying type + entry id.
- [ ] AC-18 [Int] no revert control in the panel; Undo of turn N already locked; Undo of turn N+1 rolls back to the hacked baseline.
- [ ] AC-19 [Int] flag set on the first commit in the same checkpoint, survives toggling off + reload, and never appears in any snapshot blob. AC-20 cross-refs AC-01/02/41.
- [ ] AC-21/22/23/24 [Int] output equivalence between hacked and legitimately-earned state: identical `gap_realm` results through the same function; all 12 stats read back through the same `get_base_X0`; custom vs original items resolve through the same function with identical output; the hostile-initiative gate reads hacked `level` exactly as real level, in the correct one-directional sense (gap 19 → true, 21 → false, −30 → true).
- [ ] AC-25/47/26/27 [Int/Unit] over-6 skills and under-3 thức warn but succeed; `efficacy` boundaries `{undefined,-0.1,0,0.5,1.0,1.1}` → `{block,block,allow,allow,allow,block}`; weapon-type mismatch creates fine and gates identically to original content.
- [ ] AC-28 [Int] flagged slot on a toggle-off device behaves per AC-22/23/24 and the button does not render. AC-29 [Int] debounce yields exactly 1 commit with the dimmed state visible. AC-31 [Int] no control targets another `char_id`.
- [ ] AC-30 [Int] a hack-boosted character's death roll is **bit-identical** to the same seed on a legitimately-earned equivalent, with no `if hack_mode` branch in the call trace.
- [ ] AC-39 [Unit+Int] (a) unreferenced entries delete, ID freed and reusable, skill IDs removed from `known_skill_ids` in the same transaction; (b) referenced entries dim and API-level deletes are refused; (c) original content has no delete button; (d) deletion runs the full write-path lifecycle (write-through, snapshot invalidation, `hack_write` log with `delete`, debounce); (e) skill + 2 thức where one thức is in World Memory blocks the **entire** cascade.
- [ ] AC-44 [Int] Tab reaches every control with no trap; Enter inside a zone's field triggers **that zone's** Save; Esc/tap-outside two-step rule.
- [ ] AC-45 [Int] "Đã ghi" persists until a field in that zone is edited (no timer); the first in-window hack write appends "Undo lượt trước đã khóa"; the standing warning line next to the Save buttons live-appears/disappears with the pending snapshot.
- [ ] AC-46 [Int+Manual] the transparency badge renders both in the slot list and on S2 when the flag is set, and not otherwise.
- [ ] AC-32 [Manual, the only ADVISORY item] O-Customize deliberately **breaks** the "Mực Chưa Khô" identity: straight borders and right angles instead of organic ink edges, a neutral (grey/dark) background instead of cream paper, **never** vermilion or jade (both are rationed world-truth accents), plain input boxes instead of seal frames. Only the 0.38 dimmed state is shared, because that is interaction grammar rather than narrative language.

Gating: D.1–D.5 and nearly all AC are Logic/Integration → **BLOCKING**; only AC-32 is Visual/Feel → ADVISORY. AC-48+ are reserved for the `/ux-design` pass (panel layout, literal copy, detailed tab order).

## C9. Open questions

OQ#1 the one-directional dependency cascade is **not yet run** — the full propagation list is in C7 and must complete before implementation (owner: technical-director). OQ#2 whether hack mode should be gated or stripped from any future public build (does not block MVP). OQ#4 the exact warning copy for AC-25 is unlocked (AC currently tests behaviour only). OQ#5 AC-27 depends on Equipment's AC-14 remaining stable — doc-drift risk. OQ#6 `/ux-design` for O-Customize has not run: wireframes, literal copy, technical accent color tokens (art-director sign-off), the Vietnamese labels for the 12 fields, mobile `inputmode`, and desktop tab order all live there. OQ#3 is closed (`STAT_WRITE_MAX` + `is_finite`). Round-2 advisories still open: loosening the item delete condition to "not currently equipped", payload-compare no-op detection, an HP floor against subnormals, ID trim/length limits, the crippled-character × beyond-canon-tier case, attaching custom thức to original skills, two-generation UIDs in the log, an AC for per-type draft retention in zone 3, feeding the toggle into the live-signal path, virtual-keyboard scroll-into-view, and propagating `open_customize` into core-ui's GAP-4 list.

---

# PART D — UX spec inventory (`design/ux/`)

| File | Status (one line) |
|---|---|
| `interaction-patterns.md` | **In Design** — shared pattern library, 11 patterns all bootstrapped from `main-screen.md`; catalog includes `marginalia-nav-link`, `scene-header`, `tap-name-span`, `boundary-continue-link`, `ink-sweep-loading`, `suggestion-card`, `intent-chip`, `undo-button` (the pattern #16 Rule #6b defers to). New patterns must be added here rather than reinvented. |
| `main-screen.md` | **In Design** — S2 spec; owns the per-turn loop (choose one action, world responds in prose), the combat/non-combat suggestion framing, and the `ai_writing_escalation_seconds` escalation copy + AC that closed core-ui OQ#14. |
| `o-customize.md` | **In Design** — O-Customize overlay spec (largest UX file, 687 lines); the "director's chair" framing, the two concrete reasons the player opens it, and the deliberate anti-diegetic visual break. Remaining GDD open questions (#4, #6) resolve here. |
| `save-slot-screen.md` | **Approved** (`/ux-review` 2026-08-14 — 1 blocking + 2 local advisories patched in-session; 2 systemic advisories deferred to session state) — S1 as journal drawer; carries the per-device data-defense role (export prompts, Safari ITP ~7-day risk, the "phai mực" unreadable-slot state). |
| `settings.md` | **Approved** (`/ux-review` 2026-08-14 — 0 blocking, 3 minor advisories, 1 cleaned in-session) — O-Set for the 2 pragmatic non-diegetic needs: font size and AI connection (default project key vs the player's own key, the unblocking path when quota runs out). |

Note: `design/ux/story-log.md` and `design/ux/character-card.md` are flagged as required by the GDDs but **do not exist yet**. Both #14 and #15 state that UI stories must cite `design/ux/*.md`, not the GDDs directly — so the Card and Story Log stories are blocked on those specs being authored.

---

# PART E — Cross-cutting notes for the existing React app

- **Registry constants to import once, never re-literal**: `TOUCH_TARGET_MIN=44`, `MIN_ADJACENT_GAP_PX=4`, `card_transition_ms=200`, `suggested_action_count=4`, `undo_depth=1`, `ai_call_timeout_seconds=30`, `live_window_turns=30`, `CONTENT_EXCHANGE_ESTIMATE=30`, `LEVEL_WRITE_MAX`, `STAT_WRITE_MAX`, `tier_from_level`, `exp_threshold`, `undo_availability_window`, `max_known_skills_per_character=6`, `min_thuc_per_skill=3`, `deep_hostility_threshold=-80`, `HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`.
- **Four CI-checkable static invariants** (each already has a BLOCKING AC): `log_prefetch_threshold < log_page_size` (AC-52) · `banner ≤ settings ≤ card ≤ screen` (AC-27) · `FONT_SCALE_STEP[S] < [M] < [L]` (AC-69) · `live_window_turns ≥ CONTENT_EXCHANGE_ESTIMATE` (AC-67).
- **Godot-era notes that must be re-derived for React/Vite**: every mention of `RichTextLabel` meta tags, `FoldableContainer`, `mouse_behavior_recursive`/`focus_behavior_recursive`, `queue_free()`, `remove_paragraph()`, autoload `CanvasLayer`s, `JavaScriptBridge`, and `.gd` test filenames predates the 2026-08-14 pivot to React/Vite. The **rules** survive (recursive disable of the input subtree while excluding the 3 marginalia glyphs; real DOM unmount on eviction rather than `display:none`; screen containers cached rather than destroyed; `viewport-fit=cover` + `env(safe-area-inset-*)` read via `getComputedStyle`, **never** `eval()`); the **APIs** do not. Test paths should become `tests/unit/{core-ui-screen-navigation,character-card-identity,character-customization-mode}/` with the project's JS runner naming.
- **Mapping to what already exists**: the current `QuickLoreModal` is the seed for `O-Card` and must grow the fixed ①–⑥ block order, D.2 field selection, and the concealment badge/`"???"` rendering. The existing settings menu becomes `O-Set` with 3 groups. The existing save-slot UI is `S1` and needs `O-ConfirmDelete` with its two confirmation tiers. `CustomizationModal` ("Tùy Chỉnh (hack)") becomes `O-Customize` and must be restructured into 3 zones with 3 independent Save buttons — today's single-modal edit path does not satisfy Rule #6a/#6a1 (durable write-through, in-flight locking) or #6b (Undo snapshot invalidation).
- **Ambiguity to resolve with the user**: the existing app's Song Tu button reportedly requires `affinity ≥ 80`, whereas the Card GDD points at NPC Affinity's `SONG_TU_THRESHOLD=60` / `SONG_TU_BREAK_THRESHOLD=40`. The Card is a pure renderer of NPC Affinity's 5-state machine, so **the card must not hold its own threshold**; the discrepancy has to be settled in NPC Affinity (out of scope here — flagged only).
- **Two structurally identical but oppositely-applied rules — do not conflate**: font-size changes reflow **immediately** (display parameter, #15 D.5), while `concealment`/`disguise` changes **never** re-render mid-open (world state, #14). Both GDDs call this out explicitly as a known confusion.
