# ADR-0003: AI/LLM Integration Layer — Backend, Model Fallback Ladder, and Reliability Architecture

## Status

Accepted

## Date

2026-08-12

## Last Verified

2026-08-12

## Decision Makers

user + `godot-specialist` (engine validation — APPROVE-WITH-NOTES, 2026-08-12).
*(TD-ADR strategic review skipped — `review-mode=lean`, not a PHASE-GATE.)*

## Summary

Locks the concrete backend (Gemini API, client-direct) and model fallback ladder for
`design/gdd/ai-llm-integration-layer.md`'s already-Approved retry/fallback/timeout
formulas, resolves two cross-system open questions from `docs/architecture/architecture.md`
(QQ-01: `ai_context_hard_token_budget` was claimed-but-never-defined; QQ-02: whether to add
an AI semantic-drift judge), and fixes the Godot-side ownership pattern (DI-injected Node,
not an Autoload) for the `HTTPRequest`-backed state machine.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Godot 4.6 |
| **Domain** | Networking |
| **Knowledge Risk** | LOW — the load-bearing `HTTPRequest`/Web-export behaviors this ADR depends on (per-instance `timeout`, `use_threads`, `process_mode`, `cancel_request()` non-abort) were verified by direct engine-source read, not inferred from training data. |
| **References Consulted** | `docs/engine-reference/godot/modules/web-export.md` (Group A, Q1-Q3, source-verified against `4.6-stable`/`4.6.3-stable`/`master`); `docs/engine-reference/godot/VERSION.md`; `prototypes/gemini-cors/` (real-browser CORS validation, PASS 2026-08-11) |
| **Post-Cutoff APIs Used** | None new — `HTTPRequest.timeout`, `use_threads`, `process_mode` are all pre-cutoff APIs; the risk was in Web-export-specific *behavior*, already closed by the spike above. |
| **Verification Required** | None outstanding for the engine layer. Residual unverified item is product-level, not engine-level: whether `generativelanguage.googleapis.com` keeps serving open CORS headers over time (endpoint policy, can change without notice — see Risks). |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | World Memory's Formula #5 Runtime Clamp (`ai_context_hard_token_budget` now has a real value); Combat System's `narration_call` integration; Situation/Encounter Generation's `suggestion_call` integration — all three were blocked on this ADR per their own Dependencies sections |
| **Blocks** | Any story that wires `request_ai()` to a real (non-mocked) HTTP call; `world-memory-context-management.md` Formula #5 implementation; Turn Manager's real AI integration |
| **Ordering Note** | Must be Accepted before `/create-epics` includes an epic that calls the real Gemini endpoint. Story-level unit tests against the mocked HTTP client (per the GDD's AC-01..AC-34) are NOT blocked — they can proceed against this ADR's interfaces once Proposed. |

## Context

### Problem Statement

`design/gdd/ai-llm-integration-layer.md` is Approved and exhaustively specifies the
*reliability mechanics* (retry backoff, model fallback selection, time-budget gating,
logical-call accounting — Formulas 1-4) as pure, engine-agnostic math. It deliberately
leaves four things undecided, all flagged as Open Questions in the GDD itself or in
`docs/architecture/architecture.md`'s cross-system QQ list:

1. Which concrete backend/model list to use (GDD assumes Gemini, cites `src/reference.md`
   as a validated-at-protocol-level pattern, but defers the real decision to an ADR).
2. How the abstract retry/fallback state machine maps onto actual Godot nodes — in
   particular, who owns the `HTTPRequest` instance and how `cooldown_until` (the one
   variable in the GDD that outlives a single logical call) is held without becoming
   hidden global state (AC-29 requires DI-injectability for test isolation).
3. **QQ-01**: `world-memory-context-management.md` Formula #5 (Runtime Clamp) requires
   `ai_context_hard_token_budget`, declaring it "registry, cấp bởi
   `ai-llm-integration-layer.md`" — but a full read of this GDD's Tuning Knobs and Open
   Questions confirms the variable is never actually defined there either. It is a
   phantom: consumed by one system, claimed-owned-by another, defined by neither.
4. **QQ-02**: the GDD's own mitigations against AI narration drift are all
   *prompt-instruction* mechanisms (Core Rule #2's mandatory instruction list,
   AC-26/AC-33's delimiter-wrapping against direct and stored/indirect prompt injection).
   None of them can *detect* a semantic-mismatch narration (AI narrates the opposite of
   `locked_result` without leaking a single digit) after the fact — that class of failure
   is invisible to Contract Enforcement's Formula 1 (Numeric Leak Detection), which is
   purely digit-pattern based. Whether to add a verification layer for this residual risk
   is undecided.

Cost of not deciding: `/create-epics` cannot scope Combat/Situation Generation's AI
integration stories (both list this ADR-shaped decision as a hard dependency), and World
Memory cannot implement Formula #5 without a real budget value.

### Current State

No code exists yet for this layer. `prototypes/gemini-cors/` validated only that the
CORS policy permits a client-direct architecture (Core Rule #6) — it did not implement
the retry/fallback state machine or choose the production model list.

### Constraints

- Single-player, client-side-only architecture already locked at `game-concept.md`
  (no backend proxy at MVP) and re-confirmed by this GDD's Core Rule #6 — this ADR
  cannot revisit that decision, only implement within it.
- `ai_call_timeout_seconds=30` and `calls_per_turn_max=3` are already registry-locked
  constants owned by `turn-manager.md` — this ADR must fit inside them, not redefine them.
- Target platform is Web + Mobile Web (`technical-preferences.md`) — every API call
  crosses a browser fetch boundary; per-request cost and latency are real player-facing
  budget items, not just backend concerns.
- Solo/small-team MVP budget (`game-concept.md`) — favor the option with the smallest
  architectural footprint when two options are functionally close, per the project's
  established `/architecture-decision` bias (see ADR-0001/0002 precedent).

### Requirements

- Must implement Formulas 1-4 of `ai-llm-integration-layer.md` exactly as specified
  (this ADR does not reopen that math — it gives the abstract formulas concrete values
  and a concrete Godot home).
- Must supply a real, non-empty `M` (model fallback list) and a real
  `ai_context_hard_token_budget` value, closing QQ-01.
- Must make an explicit, recorded decision on QQ-02 (AI judge), not leave it silently
  unresolved.
- Must satisfy AC-29 (DI-injectable state, no cross-test leakage) and the project's
  `coding-standards.md` ("dependency injection over singletons").

## Decision

**Backend**: Gemini API (`generativelanguage.googleapis.com`), called directly from the
Godot client via `HTTPRequest`, exactly as validated by `prototypes/gemini-cors/`. No
backend proxy.

**Model fallback ladder (`M`)**, in priority order, taken verbatim from the
protocol-validated reference (`src/reference.md`'s `GEMINI_TEXT_MODEL_FALLBACKS`):

```
M = ["gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite",
     "gemini-2.5-flash", "gemini-2.5-flash-lite"]
```

> **Amendment 2026-08-31**: Google retired the last two rungs (`gemini-2.5-flash`,
> `gemini-2.5-flash-lite` now return HTTP 404 "no longer available to new users").
> The shipped ladder (`src-web/systems/ai/config.ts` `GEMINI_TEXT_MODEL_FALLBACKS`)
> replaces them with `gemini-3.6-flash` and `gemini-3.5-flash-lite` — the models
> Google's own 404 message names — both live-probed 200 with the game's
> JSON-schema + `thinkingConfig.thinkingLevel` request shape. Note the new rungs
> reject the legacy `thinkingConfig.thinkingBudget` field (HTTP 400), so any call
> that tunes thinking must use `thinkingLevel`.

This is project **config data**, not a hardcoded literal in gameplay code (Core Rule #4,
`coding-standards.md` data-driven requirement) — it lives in the tuning resource described
under Key Interfaces below, so it can be edited without a code change if Google
deprecates a model.

**`ai_context_hard_token_budget` (closes QQ-01)**: a fixed registry constant, **not**
derived from any model's context window. All five models in `M` carry a ~1,048,576-token
input context window (verified via Google's official Gemini API docs — see Alternatives
Considered), so a window-derived budget would functionally never trigger World Memory's
Formula #5 clamp, defeating its purpose. The real constraint this budget protects against
is **per-turn API cost and latency**, not model capacity:

```
ai_context_hard_token_budget = 8000   (tuning knob, safe range 4000–16000)
```

Rationale for 8000: World Memory's Formula #4 expected size, at the project's default
`recency_window_turns=8` and `avg_turn_tokens≈350`, comes out to roughly 2800 tokens for
the recency window alone, plus a few hundred for extracted facts — 8000 leaves ~2-3×
headroom over that expected case (enough that Formula #5 stays a genuine safety net, not
a knob that fires on every ordinary turn) while staying two orders of magnitude below the
1M-token ceiling, keeping typical per-call cost/latency bounded regardless of which model
in `M` actually serves the request.

**QQ-02 (AI judge) — decision: do not build a semantic-drift judge for MVP.** The GDD's
existing prompt-instruction defenses (Core Rule #2 mandatory instruction list, AC-26/AC-33
delimiter-wrapping against direct and stored/indirect injection) remain the only
mitigation; residual semantic-mismatch risk is accepted and tracked for manual QA, not
architecturally closed. See Alternatives Considered for the two mitigations evaluated and
rejected, and Consequences → Negative for the accepted residual risk.

**Godot ownership**: a dependency-injected `Node` subclass (not an Autoload), constructed
and owned by whatever system calls it (Turn Manager, and later Combat/Situation
Generation indirectly through Turn Manager). It holds the `HTTPRequest` child node and the
`cooldown_until` map as instance state — never a global/static store — satisfying AC-29
and `coding-standards.md`'s DI-over-singleton rule.

### Architecture

```
                     ┌─────────────────────────────┐
                     │        Turn Manager          │
                     │  (owns 1 instance per game    │
                     │   session; created at game     │
                     │   start, not autoloaded)       │
                     └───────────────┬───────────────┘
                                     │ request_ai(call_type, payload)
                                     ▼
                     ┌─────────────────────────────┐
                     │     AiLlmRequestService       │◄── AiLlmTuningConfig (Resource:
                     │        extends Node           │     model ladder M, backoff/
                     │  ┌─────────────────────────┐  │     cooldown/timeout knobs,
                     │  │ HTTPRequest (child node)│  │     ai_context_hard_token_budget)
                     │  │ use_threads = false      │  │
                     │  │ process_mode = ALWAYS    │  │◄── clock: Callable (wall-clock,
                     │  └─────────────────────────┘  │     swappable in tests — AC-29)
                     │  cooldown_until: Dictionary    │
                     │    (instance state, per-model) │◄── http_factory: Callable
                     │  Formula 1-3 state machine      │     (swappable for AC-01..AC-33
                     │  (Idle/Requesting/Retrying-     │      spy/mock tests)
                     │   Network/Busy/Success/Failed)  │
                     └───────────────┬───────────────┘
                                     │ fetch() via Godot HTTPRequest.request()
                                     ▼
                     ┌─────────────────────────────┐
                     │ generativelanguage.googleapis │
                     │ .com  (Gemini API, model = M[i])│
                     └─────────────────────────────┘

World Memory's Context View → passed into `payload` by the caller (Turn Manager),
already clamped to ai_context_hard_token_budget by World Memory's own Formula #5
BEFORE it reaches this layer — this layer does not re-measure or re-clamp tokens,
it only carries the config value that World Memory reads (see Key Interfaces).
```

### Key Interfaces

```gdscript
# NOTE: class_name registers per-file in Godot 4 — the two classes below are two
# separate .gd files (ai_llm_tuning_config.gd, ai_llm_request_service.gd), shown
# together here only for readability.

# AiLlmTuningConfig — Resource, data-driven (coding-standards.md), edited without code changes
class_name AiLlmTuningConfig
extends Resource

@export var model_fallbacks: Array[String] = [
    "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite",
    "gemini-2.5-flash", "gemini-2.5-flash-lite",
]
@export var overload_retry_wait_seconds: float = 2.0            # GDD-owned default, carried here
@export var transient_retry_base_seconds: float = 1.0           # GDD-owned default, carried here
@export var max_same_model_attempts_overloaded: int = 1         # GDD-owned default, carried here
@export var max_same_model_attempts_transient: int = 2          # GDD-owned default, carried here
@export var model_cooldown_seconds: float = 90.0                # GDD-owned default, carried here
@export var request_timeout_default: float = 15.0               # GDD-owned default, carried here
@export var ai_context_hard_token_budget: int = 8000             # NEW — this ADR owns this value

# AiLlmRequestService — the ONLY module allowed to call HTTPRequest to an AI endpoint (AC-01)
class_name AiLlmRequestService
extends Node

func setup(tuning: AiLlmTuningConfig, clock: Callable, http_factory: Callable) -> void
    # clock: () -> float, defaults to Time.get_unix_time_from_system if unset.
    # http_factory: () -> Object (HTTPRequest-shaped), defaults to instancing a real
    #   HTTPRequest child; tests inject a mock/spy here (AC-01..AC-33 require asserting
    #   on request payload/timeout-property/call-count without real network I/O).

func request_ai(call_type: StringName, payload: Dictionary) -> Dictionary
    # call_type ∈ {&"narration_call", &"suggestion_call", &"suggestion_retry_call"}
    # payload: {locked_result: Dictionary (narration_call only), context: Dictionary
    #           (World Memory's Context View, already token-clamped), allowed_envelope_menu:
    #           Array[String] (suggestion_call only), ...}
    # returns: {status: &"success"|&"failed",
    #           text: String (narration_call), suggestions: Array[Dictionary] (suggestion_call),
    #           error_code: StringName, error_reason: String}
    #           # error_code, when status=&"failed": &"BUSY" | &"TIMEOUT" | &"NO_MODEL" |
    #           # &"CONFIG_ERROR" | &"QUOTA_EXCEEDED" | &"PERMISSION_DENIED" — 4+ distinct
    #           # reason labels per AC-32, never collapsed into one generic "failed" reason.
    # Never raises for network/API failure — Formula 1-3/Core Rule #5 failure modes are
    # all returned as {status: &"failed", ...}, matching the GDD's "never fabricate a
    # result to hide an error" rule.
    # `status` is a convenience-derived field only — `error_code` is the single source of
    # truth callers must branch on (matches AC-21/AC-30/AC-32, and the GDD's own note that
    # Busy "is not a real state of one call's lifecycle" — it's a rejection outcome, not a
    # third peer of success/failed). In particular BUSY is always surfaced as
    # `error_code = &"BUSY"` with `status = &"failed"`, never as a distinct `status` value —
    # callers (Turn Manager/Combat) must branch on `error_code`, never on `status` alone,
    # to tell BUSY apart from timeout/no-model/config-error (AC-32's 4 distinct reason labels).
```

### Implementation Guidelines

- `AiLlmRequestService` is instantiated once per game session by Turn Manager's setup
  code (not `add_autoload_singleton`), added as a child of a node that stays in the tree
  for the whole session, and `setup()` is called immediately with a real
  `AiLlmTuningConfig` resource, the default wall-clock `Callable`, and a real
  `http_factory` that instances an actual `HTTPRequest`.
- The `HTTPRequest` child node created by the real `http_factory` MUST have
  `use_threads = false` and `process_mode = PROCESS_MODE_ALWAYS` set immediately after
  instancing, before adding it to the tree — this is Core Rule #8's engine constraint,
  and AC-01's static CI check (extended 2026-08-08) scans for exactly these two
  assignments in this module's source. Core Rule #8's phrase "và mọi Timer con của nó"
  does **not** mean a third assignment on some `Timer` sub-node — `HTTPRequest` does not
  expose its internal `Timer` through any public GDScript getter, and the Timer inherits
  `process_mode` from its parent via the default `PROCESS_MODE_INHERIT` (engine-verified,
  `docs/engine-reference/godot/modules/web-export.md` Q2) — the 2 assignments on the
  `HTTPRequest` node itself are the complete, sufficient set. (Confirmed by
  `godot-specialist` review, 2026-08-12.)
- **`setup()` MUST call `add_child()` on the real `HTTPRequest` node returned by
  `http_factory()` before `request_ai()` can be called** — this step is easy to omit
  silently, because every one of the GDD's 34 acceptance criteria runs against a mocked
  `http_factory` and therefore never exercises `HTTPRequest.request_raw()`'s real
  `ERR_FAIL_COND_V(!is_inside_tree(), ERR_UNCONFIGURED)` guard. Skipping this step
  compiles cleanly, passes the entire AC-01..AC-34 mock suite, and fails only in
  production against the real endpoint — a class of bug the AC preamble's own stated
  mock-only limitation cannot catch. (Flagged by `godot-specialist` review, 2026-08-12.)
- Tests construct `AiLlmRequestService` directly (no scene tree ceremony required beyond
  `add_child` for the signal-based `HTTPRequest`), call `setup()` with a fake clock and a
  mock `http_factory` returning a GUT double shaped like `HTTPRequest` (must expose a
  settable `timeout` property and a `request()` method + `request_completed` signal, per
  AC-13's note that Godot's real API takes `timeout` as a pre-set property, not a call
  argument), and assert via spies exactly as AC-01 through AC-34 specify.
- `cooldown_until` is a plain `Dictionary[String, float]` instance member, reset to `{}`
  in `setup()` — this is what makes AC-29 (no cross-test leakage) trivially satisfiable:
  each test constructs a fresh `AiLlmRequestService`.
- `M` in the GDD's formulas is `tuning.model_fallbacks` read at call time — never copied
  into a local hardcoded array anywhere in gameplay code.

## Alternatives Considered

### Alternative 1: Backend proxy server for AI calls

- **Description**: route all Gemini calls through a small server-side proxy instead of
  calling from the client directly.
- **Pros**: hides the API key entirely (no client-side key exposure); central point for
  rate limiting/cost control across all players.
- **Cons**: requires standing up and paying for server infrastructure; adds a second
  point of failure and a second latency hop on every AI call; contradicts the
  already-locked `game-concept.md` decision (personal, non-commercial project, accepted
  client-side key exposure) and this GDD's Core Rule #6.
- **Estimated Effort**: High relative to chosen approach (new deployable service).
- **Rejection Reason**: already closed at the game-concept level; re-litigating it here
  would contradict an accepted upstream decision without new evidence to justify reopening
  it.

### Alternative 2: `ai_context_hard_token_budget` derived from `min(context window of M)`

- **Description**: compute the hard budget dynamically from each model's advertised
  context window, taking the minimum across the fallback ladder minus a safety margin.
- **Pros**: automatically adapts if a future model in `M` has a smaller window than
  today's five.
- **Cons**: all five current models carry ~1,048,576-token windows (verified: Gemini
  2.5 Flash, 2.5 Flash-Lite, and the 3.x family all publish the same ~1M-token input
  limit) — a window-derived value would land two orders of magnitude above any realistic
  prompt, meaning World Memory's Formula #5 clamp would never actually fire. That doesn't
  solve the problem QQ-01 exists for: this budget's job is to bound cost/latency per turn,
  not to avoid technically exceeding a model's true capacity.
- **Estimated Effort**: Low-Medium (one extra lookup table of per-model windows).
- **Rejection Reason**: solves a problem the project doesn't have (running out of model
  context) while leaving the real one (a pathological single-turn prompt costing far more
  than typical) unaddressed. A fixed, cost-driven constant is the correct instrument.

### Alternative 3: Synchronous "AI judge" call for semantic-drift detection (QQ-02)

- **Description**: after every `narration_call` succeeds, immediately issue a second AI
  call asking a model to verify the returned `narration_text` matches `locked_result`,
  and block/retry the turn if it disagrees.
- **Pros**: closes the one class of narration-integrity risk that Contract Enforcement's
  Formula 1 structurally cannot catch (semantic mismatch with zero digit leak).
- **Cons**: requires a 4th `call_type`, which requires reopening `turn-manager.md`'s
  `ai_call_budget_per_turn=3` (registry-locked, 3-boolean model) and cascading the change
  through every downstream GDD that references it (`combat-system.md`,
  `situation-encounter-generation.md`); doubles worst-case per-turn latency and API cost;
  and per the GDD's own AC preamble, even a judge call cannot *prove* a model followed an
  instruction — it can only add one more instruction-following step that itself might be
  wrong, at real cost, for a risk that has not yet been observed at any real frequency
  (no playtest data exists yet).
- **Estimated Effort**: Medium-High (new call_type, registry change, cascade to 3+ GDDs).
- **Rejection Reason**: cost disproportionate to an unmeasured risk. Revisit if MVP
  playtesting shows semantic-drift narration is a recurring, player-visible problem — see
  Consequences → Negative and the GDD's existing Open Question tracking this.

### Alternative 4: `Autoload` singleton for `AiLlmRequestService`

- **Description**: register the service as a project Autoload for simple global access
  (`AiLlm.request_ai(...)` from anywhere).
- **Pros**: no need to thread a reference through Turn Manager/Combat/Situation
  Generation call sites; simplest possible call syntax.
- **Cons**: directly violates AC-29 of the already-Approved GDD, which requires
  `cooldown_until` to be injectable/isolable so tests don't leak state between cases —
  Autoloads are process-lifetime globals, exactly the pattern AC-29 was written to
  prevent; also contradicts `coding-standards.md`'s explicit "dependency injection over
  singletons" rule.
- **Estimated Effort**: Low (framework-provided), but the cost shows up later as flaky
  tests and required GDD rewrites.
- **Rejection Reason**: would require re-opening and weakening an already-Approved,
  reviewed AC. The DI-Node pattern achieves the same practical single-instance-per-session
  behavior without the testability cost.

## Consequences

### Positive

- QQ-01 and QQ-02 are closed with recorded rationale — `architecture.md`'s open-question
  table and `world-memory-context-management.md`'s Open Questions can both be marked
  resolved, referencing this ADR.
- Combat System and Situation/Encounter Generation are unblocked to have their AI-calling
  stories scoped in `/create-epics`.
- The model fallback ladder is a single data-driven resource edit away from being updated
  if Google renames/deprecates a model — no code change required.
- `AiLlmRequestService`'s DI shape lets every one of the GDD's 34 acceptance criteria be
  satisfied with GUT spies/mocks, with zero real network calls in the test suite.

### Negative

- Semantic-mismatch narration drift (QQ-02) remains detectable only by manual QA, not
  architecturally — this is an accepted, not eliminated, risk. If MVP playtesting shows
  it happening often enough to hurt trust in the narration, Alternative 3 (or the cheaper
  heuristic extension considered alongside it) becomes the next ADR to write.
- `ai_context_hard_token_budget=8000` is a judgment call made without real production
  telemetry (no `avg_turn_tokens`/`avg_fact_tokens` measurement exists yet — that's an
  open item in World Memory's own Open Questions, targeted for after first real-AI build).
  It may need retuning once real prompts are measured.
- The *preview* model at the head of `M` (`gemini-3-flash-preview`) is the least stable
  entry in the ladder by Google's own naming convention — see Risks.

### Neutral

- This ADR does not change any of the GDD's Formulas 1-4 math — it is purely a "give the
  abstract variables concrete values and a concrete Godot home" decision, so no cascade
  to the GDD's Core Rules/Formulas/Edge Cases text is required (only its Tuning Knobs
  table gains one new row — see GDD Requirements Addressed / write-approval step).

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Google renames/retires `gemini-3-flash-preview` (preview-tier, no stability guarantee) without notice | Medium | Low | It is first in a 5-model ladder — Formula 3's fallback selection routes around a single dead entry automatically; the config is data-driven so the ladder can be edited without a code change once noticed. |
| `generativelanguage.googleapis.com` narrows its CORS policy in the future (currently echoes any Origin per `prototypes/gemini-cors/`) | Low | High | Would break Core Rule #6's client-direct architecture entirely. No engine-side mitigation exists — flagged as a standing verification item; re-run the CORS prototype check if API behavior changes are ever suspected. |
| `ai_context_hard_token_budget=8000` untuned against real token measurements | Medium | Low | Safe range 4000–16000 documented; revisit once World Memory's `avg_turn_tokens`/`avg_fact_tokens` are measured against a real build (already an open item there). |
| `cancel_request()` no-op bug (confirmed in engine source, `web-export.md` Q3) means aborted attempts still bill | Low | Low | Already scoped as a non-blocking cost-accounting item (`docs/architecture/architecture.md` item #6 equivalent) — needs real API key + billing console to measure, out of this ADR's scope. |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| CPU (frame time) | N/A (no code yet) | Negligible — I/O-bound, not CPU-bound; `HTTPRequest` work happens off the render thread | N/A |
| Memory | N/A | ~1 `AiLlmRequestService` instance + 1 `HTTPRequest` child + small `cooldown_until` dict per session; negligible | N/A |
| Load Time | N/A | No load-time impact — instantiated at session start, not asset-loaded | N/A |
| Network (per logical call) | N/A | Prompt size bounded by `ai_context_hard_token_budget=8000` input tokens; response bounded by `calls_per_turn_max=3` calls × `ai_call_timeout_seconds=30`s each | Worst case ~90s wall-clock/turn if all 3 call types hit full timeout — acceptable given Edge Case "lệnh gọi AI thất bại" already handles this at the Turn Manager level |

## Migration Plan

Greenfield — no existing implementation to migrate away from.

1. Add `AiLlmTuningConfig` resource with the defaults specified in Key Interfaces;
   verify against the GDD's own Tuning Knobs table (values must match exactly).
2. Implement `AiLlmRequestService` against Formulas 1-4, driven entirely by the GDD's
   AC-01 through AC-34 as the test suite (write tests first, per `coding-standards.md`
   Verification-Driven Development).
3. Wire `AiLlmRequestService` into Turn Manager as an injected dependency (constructed in
   Turn Manager's setup code, not autoloaded).
4. Re-run AC-01's static CI check scope (already flagged in the GDD as needing a
   fixture-based regression test even before Combat/Situation Generation exist) now that
   this module's source exists to scan.

**Rollback plan**: this ADR only fixes config values and a Godot ownership pattern for
math the GDD already locked — rolling back means reverting to Proposed status and
re-opening QQ-01/QQ-02 without touching any already-Accepted formula text.

## Validation Criteria

- [ ] Implementation passes `ai-llm-integration-layer.md` AC-01 through AC-34 in full
      (this ADR does not introduce new AC — it makes the existing ones implementable).
- [ ] A fixture-driven test proves `ai_context_hard_token_budget=8000` produces
      `over_budget=false` under World Memory's nominal Formula #4 expected-size case
      (`recency_window_turns=8` default) and `over_budget=true` under an artificially
      bloated fixture — proving Formula #5's clamp is reachable, not dead code.
- [ ] `AiLlmRequestService` is constructed without `add_autoload_singleton` anywhere in
      the codebase (grep-verifiable, same technique as AC-01's CI check).
- [ ] `docs/registry/architecture.yaml` records this ADR's `api_decisions` entry so no
      future ADR proposes a conflicting backend/model-list choice unknowingly.
- [ ] A test with the REAL `http_factory` (not a mock) asserts `is_inside_tree() == true`
      on the `HTTPRequest` child immediately after `setup()` returns — this is the one
      path the mock-based AC-01..AC-34 suite structurally cannot cover (see Implementation
      Guidelines), and its absence would only surface as a production failure otherwise.

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `ai-llm-integration-layer.md` | AI/LLM Integration Layer | Core Rule #4 ("Model dự phòng, không hard-code 1 model duy nhất") | `M` is `AiLlmTuningConfig.model_fallbacks`, an `@export` Resource field — never a literal in code. |
| `ai-llm-integration-layer.md` | AI/LLM Integration Layer | Core Rule #6 ("API key phía client, không qua backend server") | Alternative 1 (backend proxy) formally considered and rejected; Decision confirms client-direct Gemini calls. |
| `ai-llm-integration-layer.md` | AI/LLM Integration Layer | Core Rule #8 (`use_threads=false` + `process_mode=PROCESS_MODE_ALWAYS` on the owned `HTTPRequest`) | Implementation Guidelines mandates both assignments at node-creation time, matching AC-01's extended static check. |
| `ai-llm-integration-layer.md` | AI/LLM Integration Layer | AC-29 (DI-injectable `cooldown_until`, no cross-test state leakage) | `AiLlmRequestService` holds `cooldown_until` as instance state, constructed fresh per test — no Autoload. |
| `world-memory-context-management.md` | World Memory & Context Management | Formula #5 Runtime Clamp requires `ai_context_hard_token_budget` (previously undefined anywhere — QQ-01) | This ADR defines it as a registry constant = 8000 (safe range 4000–16000), owned here per the GDD's own claim of ownership. |
| `docs/architecture/architecture.md` | Cross-system Open Questions | QQ-01 (`ai_context_hard_token_budget` phantom variable) | Closed — see Decision. |
| `docs/architecture/architecture.md` | Cross-system Open Questions | QQ-02 (AI judge investment decision) | Closed — decision is "no, not for MVP" (Alternative 3), with an explicit revisit trigger. |

## Related

- `design/gdd/ai-llm-integration-layer.md` — the Approved GDD this ADR implements.
- `design/gdd/world-memory-context-management.md` — consumer of `ai_context_hard_token_budget`; Formula #5.
- `design/gdd/turn-manager.md` — owns `ai_call_timeout_seconds`/`calls_per_turn_max`, referenced not redefined here.
- `design/gdd/game-concept.md` — source of the client-direct/no-backend-proxy decision this ADR implements.
- `docs/engine-reference/godot/modules/web-export.md` — engine-source verification this ADR's Godot-side claims rest on.
- `prototypes/gemini-cors/` — CORS validation evidence for the client-direct architecture.
- `docs/architecture/architecture.md` §Open Questions — QQ-01, QQ-02 this ADR closes.
