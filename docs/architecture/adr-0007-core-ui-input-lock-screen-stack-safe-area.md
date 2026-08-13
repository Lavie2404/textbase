# ADR-0007: Core UI — Input-Lock Recursive Disable, Screen-Stack Architecture, Safe-Area Insets

## Status

Accepted

## Date

2026-08-12

## Last Verified

2026-08-12

## Decision Makers

user + `godot-specialist` (direct engine verification via headless `ClassDB`
introspection + runtime instantiation test against the pinned Godot
4.6.stable binary, 2026-08-12 — not training-data recall).
*(TD-ADR strategic review skipped — `review-mode=lean`, not a PHASE-GATE,
same as ADR-0003 through 0006.)*

## Summary

Closes the last "should have" ADR item from `/create-architecture` Phase 6
for Core UI/Screen Navigation, covering three previously-undecided technical
questions the GDD explicitly deferred to an ADR: **(1)** the exact
recursive input-lock mechanism for D.1's read-only enforcement during
Resolving/Undoing — resolved by direct engine verification, overturning a
stale claim in this project's own curated engine-reference docs; **(2)**
the screen/overlay/banner 3-tier scene architecture, formalizing the two
mandatory warnings the GDD already named (`no change_scene_to_file/packed()`,
custom HTML shell for safe-area) into a concrete Autoload/CanvasLayer shape;
**(3)** safe-area inset handling on Web export, resolved via the project's
already-established non-`eval()` `JavaScriptBridge` bridge pattern — closing
a real, previously-undetected conflict between the GDD's own text
(TR-cusn-014, which said `eval()` was required) and this project's locked
forbidden pattern banning it.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Godot 4.6 |
| **Domain** | UI / Core / Web Export |
| **Knowledge Risk** | Was HIGH going in (TR-cusn-015 self-flagged a live internal contradiction between two of this project's own documentation sources); now LOW for Part 1 (`mouse_behavior_recursive`/`focus_behavior_recursive` — confirmed by direct `ClassDB` introspection + runtime test against the pinned binary, not inferred). MEDIUM for Part 3 (safe-area) — the bridge mechanism itself is LOW-risk/already-verified (Q6-Q8 of `web-export.md`), but reading `env(safe-area-inset-*)` specifically through it has not yet been prototyped in this project. LOW for Part 2 (screen-stack) — `CanvasLayer`/`visible` toggling is long-stable, pre-cutoff API. |
| **References Consulted** | `docs/engine-reference/godot/modules/ui.md` (corrected 2026-08-12 as part of this ADR's drafting — see Related), `docs/engine-reference/godot/modules/web-export.md` (Q6-Q9), `docs/engine-reference/godot/deprecated-apis.md`, `docs/engine-reference/godot/breaking-changes.md`, and a live headless verification session against the pinned `Godot_v4.6-stable_win64_console.exe` binary (see Decision Part 1). |
| **Post-Cutoff APIs Used** | `Control.mouse_behavior_recursive` / `Control.focus_behavior_recursive` (Godot 4.5+, confirmed to exist and behave as documented in Decision Part 1 — this is the corrected understanding, replacing this project's earlier stale single-property assumption). |
| **Verification Required** | Reading `env(safe-area-inset-*)` via `getComputedStyle()` through the `get_interface()`/method-call bridge (Part 3) has not been prototyped end-to-end in this project — recommend a small spike (custom export shell + one real device or browser dev-tools device-emulation check) before Core UI's #15 implementation reaches the safe-area padding step. Not blocking this ADR's Acceptance — see Migration Plan. |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None. |
| **Enables** | `core-ui-screen-navigation.md` #15 full implementation (D.1 input-lock, screen/overlay/banner tiers, safe-area padding); indirectly unblocks any Feature system story that assumes Core UI's write-lock during Resolving/Undoing is real (Core Rule #4 across the project). |
| **Blocks** | Any story implementing Core UI's screen-stack, input-lock, or safe-area handling. |
| **Ordering Note** | Independent of ADR-0006 (tap-name-to-card), but both touch `RichTextLabel`/Core UI rendering — no conflict, since ADR-0006's Decision explicitly does not use the Control-overlay/DOM-overlay route this ADR's Part 1/2 also avoid. This is the last of the two "should have" ADRs from Phase 6 — after this, all `/create-architecture`-identified priority ADRs are written. |

## Context

### Problem Statement

`core-ui-screen-navigation.md` is Approved but explicitly defers three
implementation-shape decisions to an ADR, each carrying a real risk if
decided wrong:

1. **Input-lock (TR-cusn-015)** — the GDD found its own two internal sources
   (a WebSearch claim citing a specific PR, vs. this project's own curated
   `docs/engine-reference/godot/modules/ui.md`) in direct contradiction
   about whether Godot 4.5+'s recursive input-disable is one property or
   two, and explicitly refused to arbitrate, mandating Editor/engine
   verification before any ADR locks a mechanism.
2. **Screen-stack architecture (TR-cusn-016, OQ#5a)** — the GDD names two
   mandatory constraints (no `change_scene_to_file/packed()`; screen-tier
   nodes cached not freed) but leaves the concrete scene/Autoload shape as
   "an implementation decision, not part of the GDD."
3. **Safe-area insets (TR-cusn-014, OQ#5b)** — Web export has no built-in
   safe-area API (`DisplayServer.get_display_safe_area()` is native-only);
   the GDD's own text names `JavaScriptBridge.eval()` as the mechanism,
   which — undetected until this ADR's drafting — directly contradicts this
   project's locked forbidden pattern banning `eval()` use anywhere in the
   codebase (`technical-preferences.md`).

Cost of not deciding: Core UI/Screen Navigation's #15 cannot be implemented
at all — every one of D.1 (input-lock), the screen/overlay/banner tier
model, and safe-area padding are load-bearing for the system's Detailed
Rules.

### Current State

No code exists for Core UI yet.

### Constraints

- `undo_capturable_contract`/other registry stances do not apply here — this
  ADR does not touch Undo, Persistence, or AI/LLM Layer state.
- Registry's `ai_llm_service_as_autoload` forbidden pattern is scoped
  specifically to `AiLlmRequestService` (rejected there because of AC-29's
  test-isolation requirement) — it does not generalize to "never use
  Autoload for anything." Screen-stack infrastructure is pure
  presentation/navigation plumbing with no per-test-isolation requirement
  the way a retry state machine's `cooldown_until` has; Godot's own
  idiomatic pattern for exactly this kind of app-wide, inherently-singular
  UI-tier ownership is Autoload, and the GDD itself (OQ#5a) already named
  this as the expected shape — this ADR follows that, not a competing rule.
- `technical-preferences.md`'s forbidden pattern bans `JavaScriptBridge.eval()`
  unconditionally — any safe-area mechanism this ADR picks must avoid it,
  contradicting TR-cusn-014's literal text (which this ADR corrects).
- MVP scope, solo/small-team budget — per established `/architecture-decision`
  precedent (ADR-0001 through 0006).

### Requirements

- Must give a concrete, verified (not assumed) input-lock mechanism that
  covers both mouse/touch AND keyboard/gamepad focus channels together —
  the GDD's own risk note (double-submit via Tab+Enter if only one channel
  is locked) must be structurally prevented, not just documented as a risk.
- Must exclude the 3 marginalia bookmarks (「Thẻ」「Lục」「Mục」) from the
  locked subtree, per the GDD's explicit architectural constraint.
- Must formalize a concrete screen/overlay/banner scene ownership model
  satisfying both mandatory warnings (no `change_scene_to_file/packed()`;
  screen-tier nodes cached not freed, content-tier nodes truly freed on
  eviction per D.3/D.3b).
- Must resolve safe-area insets without `JavaScriptBridge.eval()`.

## Decision

### Part 1 — Input-Lock: Recursive Disable (TR-cusn-015, closed)

**Verified directly against the pinned Godot 4.6.stable binary** (headless
`ClassDB.class_get_property_list("Control", true)` + a runtime
instantiation test — see Engine Compatibility): the "2-property" claim is
**correct**, and this project's own `ui.md` was **stale/wrong** (corrected
as part of this ADR — see Related). `Control` exposes two fully independent
3-state enum properties:

```
mouse_behavior_recursive: Control.MOUSE_BEHAVIOR_INHERITED (0) | DISABLED (1) | ENABLED (2)
focus_behavior_recursive: Control.FOCUS_BEHAVIOR_INHERITED (0) | DISABLED (1) | ENABLED (2)
```

Confirmed by runtime test: setting only `focus_behavior_recursive=DISABLED`
on an ancestor leaves a descendant's effective *mouse* state completely
unaffected, and vice versa — the GDD's suspected risk (Tab+Enter bypassing
a mouse-only lock) is real and mechanically exact, not theoretical.

**Decision: the input-lock root sets BOTH properties together, always, with
no code path that sets one without the other.** The locked subtree contains
exactly D.1's specified scope (4 suggestion cards, intent-chip row, free
text field + submit button, Undo button) and explicitly **excludes** the 3
marginalia bookmarks, per the GDD's architectural constraint — they must be
siblings outside the locked root, never descendants of it, regardless of
visual adjacency.

**Verification uses the confirmed query API**, not raw property reads (a
descendant's own `mouse_filter`/`focus_mode` does not change when an
ancestor's recursive property is set — only the `*_with_override()` query
reflects the effective, overridden state):

```gdscript
# GUT assertion pattern for D.1's lock, both channels:
assert_eq(suggestion_card.get_mouse_filter_with_override(), Control.MOUSE_FILTER_IGNORE)
assert_eq(suggestion_card.get_focus_mode_with_override(), Control.FOCUS_NONE)
# ...and the inverse for the 3 marginalia bookmarks, which must NOT be affected.
```

### Part 2 — Screen-Stack Architecture (TR-cusn-016, OQ#5a)

**Three Autoload-owned `CanvasLayer` nodes, one per tier**, matching the
GDD's own 3-tier model (`screen`/`overlay`/`banner`, TR-cusn-001) and both
of its mandatory warnings:

- `ScreenStack` (Autoload) owns `CanvasLayer` (layer index lowest of the
  three) holding all 5 screen-state `Control` scenes (S1, S2, S4, S4-RO,
  S5) as permanent children, instantiated once at boot and never freed for
  the life of the session — visibility toggled via `visible = true/false`
  (never `queue_free()`, never `change_scene_to_file()`/`change_scene_to_packed()`,
  per the GDD's mandatory warning (a)). This is the **screen tier**.
- `OverlayStack` (Autoload) owns a second `CanvasLayer` (mid layer index)
  holding at most one active overlay (`O-Card`, `O-Set`, or `O-Customize` —
  widened 2026-08-13 to include `O-Customize` per
  `character-customization-mode.md` Rule #2, propagated after that GDD's
  Approval) at a time — same cache-not-free pattern as the screen tier for
  the overlay scenes themselves. The single-active-overlay rule generalizes
  to a third member with no structural change: `show_overlay()` already
  closes whatever is currently active before opening the requested one,
  regardless of which two (or three) IDs are named.
- `BannerStack` (Autoload) owns a third `CanvasLayer` (highest layer index)
  holding at most one active banner, FIFO-queued, with the one documented
  preempt exception (TR-cusn-001).
- Layer ordering (screen < overlay < banner) is what gives overlays their
  "on top of the screen below" behavior and banners their "always visible
  above everything" behavior — this is a `CanvasLayer.layer` property
  assignment, not scene-tree nesting order.

**Content-tier nodes inside S2/S4 are a separate, independent lifecycle**
from the screen-tier caching above — D.3/D.3b's "must be truly freed on
eviction, not `visible=false`" requirement applies only to per-turn/per-page
content nodes *inside* the S2/S4 screens, never to the 5 screen-tier `Control`
roots themselves. `RichTextLabel.remove_paragraph()` (already confirmed
functional per the GDD's own Godot notes) is the mechanism for that inner
eviction — unrelated to this ADR's screen-stack decision, which only governs
the outer 5-screen/overlay/banner caching.

**Why Autoload here, unlike `AiLlmRequestService`**: ADR-0003 rejected
Autoload for `AiLlmRequestService` specifically because AC-29 requires
per-test-isolable `cooldown_until` state — a concern that does not apply to
screen-stack infrastructure, which has no equivalent "must not leak state
between GUT test cases" requirement (there is exactly one screen stack per
running game instance, by design, matching the GDD's own model). This is
not a contradiction of the project's DI-over-singleton coding standard; it
is the same distinction the project already draws elsewhere (see registry's
`ai_llm_service_as_autoload` pattern, scoped to that one service, not a
blanket ban).

### Part 3 — Safe-Area Insets (TR-cusn-014, OQ#5b) — corrected off `eval()`

**Does not use `JavaScriptBridge.eval()`.** TR-cusn-014's text was wrong on
this point (corrected by this ADR — see Migration Plan). The mechanism:

1. **Custom HTML export shell** (already-known requirement, `DisplayServer`
   has no Web-export safe-area API) with `<meta name="viewport"
   content="viewport-fit=cover">` — without this, `env()` CSS values
   silently resolve to `0px` rather than erroring, so the shell is load-bearing,
   not cosmetic.
2. The shell's stylesheet exposes each inset as a **custom CSS property** on
   `:root` (a completely standard, non-`eval()` CSS technique):
   ```css
   :root {
     --sat: env(safe-area-inset-top, 0px);
     --sar: env(safe-area-inset-right, 0px);
     --sab: env(safe-area-inset-bottom, 0px);
     --sal: env(safe-area-inset-left, 0px);
   }
   ```
3. GDScript reads the resolved pixel values through the **already-verified**
   `get_interface()`/method-call bridge pattern (same class of mechanism as
   Q6-Q8's `navigator.locks`/`navigator.storage` calls — a method call
   returning a primitive string, not a script-eval):
   ```gdscript
   var window_obj: JavaScriptObject = JavaScriptBridge.get_interface("window")
   var root_element: JavaScriptObject = window_obj.document.documentElement
   var style: JavaScriptObject = window_obj.getComputedStyle(root_element)
   var safe_area_top_px: float = String(style.getPropertyValue("--sat")).replace("px", "").to_float()
   # ...same pattern for --sar/--sab/--sal
   ```
4. Godot-side, the 4 resolved values are applied once at boot (and
   re-queried on `resize`/orientation-change, per the GDD's "reflow live"
   responsive requirement) as padding on the screen-tier root containers —
   never per-frame, never inside `_process()`.

**Fail-silent risk stays real and must be guarded explicitly**: if the
custom shell is ever accidentally reverted to Godot's stock export
template (which lacks `viewport-fit=cover`), every inset silently resolves
to `0px` with no error — this ADR requires a startup assertion (not just a
code comment) that flags a `0,0,0,0` result as suspicious in a debug build,
so a regression is caught at dev-time, not discovered as "an interactive
element is hidden under the home indicator" during QA.

### Architecture

```
Autoload boot order (screen-stack tier, independent of gameplay Autoloads):

┌───────────────────────────────────────────────────────────────┐
│ ScreenStack (Autoload)         CanvasLayer.layer = 0            │
│   ├─ S1 (Save Slot Screen)     [cached, visible toggle only]     │
│   ├─ S2 (Main Play)            [cached; content nodes inside     │
│   │                             follow D.3b's separate eviction] │
│   ├─ S4 (Story Log, live)      [cached; pages inside follow D.3] │
│   ├─ S4-RO (Story Log, RO)     [cached]                          │
│   └─ S5 (3-lối screen)         [cached]                          │
├───────────────────────────────────────────────────────────────┤
│ OverlayStack (Autoload)        CanvasLayer.layer = 1             │
│   └─ at most 1 of {O-Card, O-Set, O-Customize} active,           │
│      cached not freed (O-Customize added 2026-08-13)             │
├───────────────────────────────────────────────────────────────┤
│ BannerStack (Autoload)         CanvasLayer.layer = 2 (topmost)   │
│   └─ at most 1 banner active, FIFO queue, 1 documented preempt   │
└───────────────────────────────────────────────────────────────┘

D.1 Input-lock (per-screen, e.g. S2's input area during Resolving/Undoing):

  %InputArea (Control, contains: 4 suggestion cards, intent-chip row,
              free text field + submit, Undo button)
      mouse_behavior_recursive = MOUSE_BEHAVIOR_DISABLED   ┐ BOTH set
      focus_behavior_recursive = FOCUS_BEHAVIOR_DISABLED   ┘ together, always

  %Marginalia (「Thẻ」「Lục」「Mục」 — SIBLING of %InputArea, NEVER a
               descendant, regardless of visual adjacency) — unaffected

Safe-area (boot + resize/orientation-change):

  Custom HTML shell (viewport-fit=cover)
        │  CSS env(safe-area-inset-*) → --sat/--sar/--sab/--sal custom props
        ▼
  JavaScriptBridge.get_interface("window") → getComputedStyle(documentElement)
        │  .getPropertyValue("--sat") etc. — method calls, NOT eval()
        ▼
  GDScript applies as padding to screen-tier root containers
  (debug-build assertion fires if all 4 resolve to 0 — stock-shell regression)
```

### Key Interfaces

```gdscript
# ScreenStack — Autoload, screen tier
extends CanvasLayer
# layer = 0 (set in project settings / _ready())

var _screens: Dictionary[StringName, Control] = {}  # &"S1" -> node, etc.
var _current: StringName = &"S1"

func show_screen(id: StringName) -> void:
    # Toggles visible=true/false across _screens -- NEVER queue_free(),
    # NEVER change_scene_to_file()/change_scene_to_packed(). Content-tier
    # nodes inside S2/S4 are that screen's own concern (D.3/D.3b), not
    # touched here.
    for key in _screens:
        _screens[key].visible = (key == id)
    _current = id

# OverlayStack / BannerStack — same cache-not-free shape, layer 1 / layer 2,
# each with its own show_overlay()/close_overlay() / push_banner() API per
# TR-cusn-001's max-1-concurrent / max-1-FIFO rules (already specified by
# the GDD, not redecided by this ADR). OverlayStack's overlay set is
# {O-Card, O-Set, O-Customize} (O-Customize added 2026-08-13, propagated
# from character-customization-mode.md Rule #2) — show_overlay() closing
# whatever is currently active before opening the requested one already
# generalizes to any number of named overlay IDs.

# Input-lock helper (used by S2's controller, not a new Autoload):
func _set_input_locked(area: Control, locked: bool) -> void:
    area.mouse_behavior_recursive = (
        Control.MOUSE_BEHAVIOR_DISABLED if locked else Control.MOUSE_BEHAVIOR_INHERITED
    )
    area.focus_behavior_recursive = (
        Control.FOCUS_BEHAVIOR_DISABLED if locked else Control.FOCUS_BEHAVIOR_INHERITED
    )
    # MUST always set both in the same call -- no code path sets one alone.

# Safe-area (queried once at boot, re-queried on resize/orientation-change,
# never per-frame):
func _read_safe_area_insets() -> Dictionary:
    var window_obj: JavaScriptObject = JavaScriptBridge.get_interface("window")
    if window_obj == null:
        return {top: 0.0, right: 0.0, bottom: 0.0, left: 0.0}  # native/editor run
    var style: JavaScriptObject = window_obj.getComputedStyle(window_obj.document.documentElement)
    var insets := {
        top = _px(style.getPropertyValue("--sat")),
        right = _px(style.getPropertyValue("--sar")),
        bottom = _px(style.getPropertyValue("--sab")),
        left = _px(style.getPropertyValue("--sal")),
    }
    if OS.is_debug_build() and insets.top == 0.0 and insets.right == 0.0 \
       and insets.bottom == 0.0 and insets.left == 0.0:
        push_warning("Safe-area insets all resolved to 0 -- verify the custom " +
                      "HTML export shell (viewport-fit=cover) is actually in use, " +
                      "not the stock Godot export template.")
    return insets

func _px(v: Variant) -> float:
    return String(v).replace("px", "").to_float()
```

### Implementation Guidelines

- The 3 marginalia bookmarks must be verified as siblings of, never
  descendants of, any `%InputArea`-style locked root — a code review /
  static-scan checklist item, since a purely visual "looks like it's outside
  the input area" check is not sufficient (scene-tree parentage is what
  matters, not layout position).
- `_set_input_locked()` (or equivalent) must be the **only** call site that
  ever assigns `mouse_behavior_recursive`/`focus_behavior_recursive` on a
  D.1-covered input area — never set individually elsewhere, so the
  "forgot the other channel" risk cannot recur via a second code path.
- Screen-tier, overlay-tier, and banner-tier `CanvasLayer`s must be created
  before any gameplay Autoload that might reference them (Turn Manager,
  etc.) — boot order matters; verify via `project.godot`'s Autoload list
  ordering.
- Safe-area re-query must be debounced/throttled on `resize`, not run on
  every resize event synchronously — matches the GDD's "reflow live" but
  avoids a query storm during a drag-resize on desktop browsers (test
  environment) or a rapid orientation flip.

## Alternatives Considered

### Alternative 1 (Part 1): Trust the un-reproduced WebSearch claim without engine verification

- **Description**: proceed directly to writing the ADR based on the
  2-property claim, without running a live verification pass.
- **Pros**: faster — skips the verification step entirely.
- **Cons**: the GDD explicitly refused to arbitrate between its two
  contradicting internal sources for exactly this reason — an ADR that
  guessed wrong would have shipped a mechanism that either doesn't compile
  (if the properties don't exist) or silently only locks one input channel
  (if the guess picked the wrong shape), reproducing the exact double-submit
  risk the GDD flagged.
- **Estimated Effort**: Zero (skipped), but with a real correctness risk.
- **Rejection Reason**: the GDD's own mandate is unambiguous, and the
  verification itself was cheap (a few minutes of headless `ClassDB`
  introspection) relative to the cost of guessing wrong.

### Alternative 2 (Part 2): Single Autoload owning all 3 tiers in one `CanvasLayer`

- **Description**: one `UiStack` Autoload managing screen/overlay/banner as
  three internal arrays inside a single `CanvasLayer`, using `z_index`
  within that layer to order them instead of three separate `CanvasLayer`s.
- **Pros**: one Autoload instead of three; slightly less boilerplate.
- **Cons**: `CanvasLayer.layer` is the idiomatic, engine-native way to
  guarantee draw-order-independent-of-scene-tree-position across
  fundamentally different UI roles (screen vs. transient overlay vs.
  transient banner) — collapsing them into `z_index` within one layer
  reintroduces exactly the kind of scene-tree-position-dependent ordering
  fragility `CanvasLayer` exists to avoid, for a marginal reduction in
  Autoload count.
- **Estimated Effort**: Similar.
- **Rejection Reason**: three `CanvasLayer`s cleanly map to the GDD's own
  3-tier model (TR-cusn-001) with zero ordering ambiguity; not worth
  trading that clarity for one fewer Autoload.

### Alternative 3 (Part 3): Keep `JavaScriptBridge.eval()` as TR-cusn-014 originally specified

- **Description**: read `env(safe-area-inset-*)` via a direct `eval()` call
  constructing and executing a JS expression string.
- **Pros**: none beyond superficial simplicity (a single string instead of
  a chained method-call bridge).
- **Cons**: directly violates the project's locked forbidden pattern (the
  single API in `JavaScriptBridge` requiring CSP `unsafe-eval`, per
  `technical-preferences.md` and `web-export.md` Q9) — for a need Q9 itself
  already states is unnecessary, since `getComputedStyle()` is a plain
  method call reachable through the same `get_interface()` pattern already
  verified for `navigator.locks`/`navigator.storage`.
- **Estimated Effort**: Marginally lower (no chained property/method
  resolution needed), but forces a CSP exception the project has otherwise
  fully avoided.
- **Rejection Reason**: solves nothing `get_interface()` doesn't already
  solve, at the cost of reopening a CSP hole this project deliberately
  closed. TR-cusn-014's text is corrected by this ADR (see Migration Plan).

## Consequences

### Positive

- TR-cusn-015's internal documentation contradiction is resolved with hard
  evidence, not a guess — and the project's own `ui.md` is corrected so
  future ADRs/stories don't re-inherit the stale claim.
- The double-submit risk the GDD flagged (Tab+Enter bypassing a
  single-channel lock) is structurally prevented by making
  `_set_input_locked()` the sole call site for both properties together.
- Screen-stack architecture is fully specified, satisfying both of the
  GDD's mandatory warnings with a concrete, idiomatic Godot shape.
- Safe-area insets are resolved without reopening the `eval()` CSP hole —
  TR-cusn-014's incorrect text is corrected as part of this ADR's cascade.
- Core UI/Screen Navigation's #15 can now proceed to implementation with no
  remaining architectural open questions blocking it.

### Negative

- Safe-area's specific `getComputedStyle()`-through-bridge chain has not
  been prototyped end-to-end in this project (Verification Required) — a
  real, if likely low, risk that some link in the chain (e.g. nested
  property access via `get_interface()`) behaves differently than the
  already-verified simpler calls (Q6-Q8) it's assumed to generalize from.
- Three separate Autoload `CanvasLayer`s (vs. one) is marginally more
  boilerplate, accepted for ordering clarity (Alternative 2).

### Neutral

- This ADR does not change any of Core UI's Detailed Rules, Formulas, or
  ACs — it is a pure implementation-shape decision plus one factual
  correction (TR-cusn-014) and one documentation correction (`ui.md`).

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| A future code change sets `mouse_behavior_recursive`/`focus_behavior_recursive` individually somewhere other than `_set_input_locked()`, reintroducing the double-submit risk | Low | High | Implementation Guidelines names `_set_input_locked()` as the sole call site; recommend a grep-based static CI check (same pattern as ADR-0003's AC-01 check) scanning for direct assignment to either property outside that one function. |
| `getComputedStyle()` chained through `get_interface()` behaves unexpectedly on a real device (vs. desktop Chrome headless, this project's usual test environment) | Medium | Medium | Flagged as Verification Required — small spike recommended before Core UI's safe-area step; can piggyback on the existing `prototypes/persistence-web/DEVICE-TEST.md` real-device pass rather than a new one. |
| Stock Godot export template accidentally replaces the custom HTML shell in a future export-settings change, silently zeroing all insets | Low | Medium | Debug-build startup assertion (`_read_safe_area_insets()`) catches an all-zero result during development, not just in production. |
| Boot-order dependency (screen-stack Autoloads must exist before gameplay Autoloads reference them) breaks silently if `project.godot`'s Autoload list is reordered | Low | Medium | Implementation Guidelines flags this explicitly; recommend a startup smoke-test asserting `ScreenStack`/`OverlayStack`/`BannerStack` singletons are non-null before any gameplay Autoload's `_ready()` runs. |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| CPU (frame time) | N/A (no code yet) | Negligible — `visible` toggling and property assignment are cheap, one-time-per-transition operations, not per-frame | N/A |
| Memory | N/A | 5 screen-tier + up to 2 overlay-tier + 1 banner-tier `Control` scenes resident simultaneously (cached, never freed) — small relative to content-tier memory already bounded by D.3/D.3b/ADR-0005 | N/A |
| Load Time | N/A | All screen-tier scenes instantiated once at boot — a one-time cost, not deferred per-navigation (trades a small boot-time cost for zero navigation-time instantiation stutter) | N/A |
| Network | N/A | Not applicable | N/A |

## Migration Plan

Greenfield — no existing implementation to migrate from.

1. Implement `ScreenStack`/`OverlayStack`/`BannerStack` Autoloads per Key
   Interfaces; verify boot order in `project.godot`.
2. Implement `_set_input_locked()` as the sole call site for D.1's
   recursive-disable pair; write the GUT test pattern from Decision Part 1
   (both `*_with_override()` assertions, plus a negative assertion that the
   3 marginalia bookmarks are unaffected).
3. Build the custom HTML export shell (`viewport-fit=cover` + the 4
   `--sat`/`--sar`/`--sab`/`--sal` custom properties); implement
   `_read_safe_area_insets()`; run the Verification-Required spike before
   relying on real (non-zero) values in any layout decision.
4. **Correct `core-ui-screen-navigation.md`'s TR-cusn-014** — remove the
   `JavaScriptBridge.eval()` claim, replace with the `get_interface()`-based
   mechanism this ADR specifies (cascade, pending approval below).
5. Update `docs/architecture/architecture.md`'s Missing ADR List (Core UI
   input-lock/screen-stack/safe-area entry) and TR-cusn-015's engine-doc
   contradiction note.

**Rollback plan**: each of the 3 parts is independently reversible without
touching the other two — e.g. if the `CanvasLayer`-per-tier shape proves
wrong, only Part 2's Autoload structure needs revisiting; Part 1's
verified property pair and Part 3's bridge mechanism are unaffected either
way.

## Validation Criteria

- [ ] A GUT test proves `_set_input_locked(area, true)` makes
      `area.get_mouse_filter_with_override() == Control.MOUSE_FILTER_IGNORE`
      AND `area.get_focus_mode_with_override() == Control.FOCUS_NONE`
      simultaneously.
- [ ] A GUT test proves the 3 marginalia bookmarks remain fully interactive
      (`get_mouse_filter_with_override()`/`get_focus_mode_with_override()`
      unaffected) while a sibling `%InputArea` is locked.
- [ ] A static/grep CI check confirms `mouse_behavior_recursive`/
      `focus_behavior_recursive` are only ever assigned inside
      `_set_input_locked()` (or its final implementation name) across the
      codebase.
- [ ] A test proves `ScreenStack.show_screen()` never calls
      `queue_free()`/`change_scene_to_file()`/`change_scene_to_packed()` on
      any of the 5 screen-tier nodes (spy-based, mirrors ADR-0003's AC-01
      static-check pattern).
- [ ] The safe-area spike (Verification Required) confirms non-zero inset
      values are actually reachable on at least one real device or
      browser-devtools device-emulation profile with a notch/home-indicator
      before this feature ships.
- [ ] `docs/registry/architecture.yaml` records this ADR's stances (pending
      approval below) so no future ADR proposes a conflicting screen-stack
      shape or reintroduces `eval()` for safe-area unknowingly.

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | TR-cusn-015 (input-lock API, contested/unverified) | Closed via direct engine verification — both properties confirmed to exist and behave independently; `_set_input_locked()` sets both together. |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | TR-cusn-016 (screen-stack: no `change_scene_to_file/packed()`, cached not freed) | `ScreenStack`/`OverlayStack`/`BannerStack` Autoload/`CanvasLayer` shape (Decision Part 2). |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | TR-cusn-014 (safe-area insets) | Corrected off `eval()`; `get_interface()`-based `getComputedStyle()` bridge (Decision Part 3). |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | OQ#5 (a) and (b) | Closed — both mandatory warnings satisfied by Decision Part 2/3. |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | "Ràng buộc kiến trúc bắt buộc" (3 marginalia bookmarks must stay outside the locked subtree) | Explicit in Decision Part 1 and Implementation Guidelines. |
| `docs/architecture/architecture.md` | Missing ADR List | "Core UI: input-lock API + screen-stack architecture + safe-area insets" | Closed — this ADR. |
| `character-customization-mode.md` | Character Customization Mode | Rule #2 (O-Customize is a 3rd overlay in the existing max-1-concurrent overlay state machine) | `OverlayStack`'s overlay set widened to `{O-Card, O-Set, O-Customize}` (Decision Part 2, Architecture diagram, Key Interfaces) — propagated 2026-08-13, hệ #16 Approved vòng 4. Mechanically trivial: no change to `show_overlay()`'s single-active-overlay logic. |

## Related

- `design/gdd/core-ui-screen-navigation.md` — TR-cusn-014/015/016, OQ#5, D.1.
- `docs/engine-reference/godot/modules/ui.md` — corrected 2026-08-12 as part
  of this ADR's drafting (recursive-disable section was stale/wrong).
- `docs/engine-reference/godot/modules/web-export.md` — Q6-Q9, the
  already-verified `get_interface()`/method-call bridge pattern this ADR's
  Part 3 reuses.
- `docs/architecture/adr-0003-ai-llm-integration-layer.md` — precedent for
  the DI-vs-Autoload distinction discussed in Decision Part 2.
- `docs/architecture/adr-0006-tap-name-to-card-entry-point.md` — the other
  "should have" ADR from the same Phase 6 list; independent of this one.
- `docs/architecture/architecture.md` §Missing ADR List — the entry this
  ADR closes.
