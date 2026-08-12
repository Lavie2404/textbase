# ADR-0006: Tap-Name-to-Card Entry Point — Name Resolution, BBCode Rendering, and Accessibility Scope (Web Export)

## Status

Accepted

## Date

2026-08-12

## Last Verified

2026-08-12

## Decision Makers

user + `accessibility-specialist` (OQ#11 policy investigation, 2026-08-12) +
`godot-specialist` (OQ#11 technical feasibility investigation, 2026-08-12).
*(TD-ADR strategic review skipped — `review-mode=lean`, not a PHASE-GATE, same
as ADR-0003/0004/0005.)*

## Summary

Closes two related gaps flagged by `docs/architecture/architecture.md`'s
Missing ADR List. **Part 1** gives the previously-unowned tap-name-to-card
mechanism (Character Card ↔ Core UI ↔ AI/LLM Layer ↔ Contract Enforcement) a
concrete owner and pipeline: Character Card owns name/alias→`char_id`
resolution as a pure function (matching both true and disguise/concealment
display names, per the "đặc quyền xuyên không" mechanic), Core UI owns
BBCode construction and rendering, no AI involvement, and the transform runs
strictly after Contract Enforcement's Formula 1-3 have already scanned the
untouched raw `narration_text`. **Part 2** formally closes
`core-ui-screen-navigation.md`'s Open Question #11 (the GDD's own explicit
gate: accessibility scope must be decided *before* the shared
`RichTextLabel`-meta-tag pattern locks) — MVP declares tap-name/marginalia
screen-reader support out of scope, on the record, with four binding
conditions, after independent investigation confirmed the alternatives
(ARIA DOM overlay, standalone TTS layer) carry disproportionate technical
risk and would only deliver a partial, misleading compliance island.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Godot 4.6 |
| **Domain** | UI |
| **Knowledge Risk** | LOW for this ADR's actual Decision — `RichTextLabel.push_meta`/BBCode `[url=]` tags and the `meta_clicked` signal are a stable, pre-cutoff API pattern (unchanged since Godot 3.x; the only 4.4+ addition is `push_meta`'s optional `tooltip` parameter, not required here). The HIGH/MEDIUM-risk branches investigated for Part 2 (ARIA DOM overlay, standalone TTS layer) are explicitly NOT adopted — see Decision and Alternatives. |
| **References Consulted** | `docs/engine-reference/godot/modules/ui.md`, `docs/engine-reference/godot/modules/web-export.md` (Group A/B patterns for `JavaScriptBridge`), `docs/engine-reference/godot/deprecated-apis.md`, `docs/engine-reference/godot/breaking-changes.md` |
| **Post-Cutoff APIs Used** | None required by this ADR's actual Decision. |
| **Verification Required** | None blocking. (For the record, if Part 2's deferred accessibility work is ever picked up post-MVP: `godot-specialist`'s investigation found no documented per-meta-span bounding-rect API on `RichTextLabel`, and confirmed the `JavaScriptBridge` DOM-manipulation bridge mechanism itself is LOW-risk/already-verified — see Related.) |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0003 (Accepted) — relies on `AiLlmRequestService.request_ai()` returning `narration_text` as untouched free-form text (never AI-embedded markup), which this ADR's Decision explicitly builds on rather than reopens. |
| **Enables** | `character-card-identity.md` Core Rule #8 / `TR-cci-012` implementation; `core-ui-screen-navigation.md` #15 D.4/§8 implementation, AC-28 through AC-31, AC-56a/AC-56b. |
| **Blocks** | Any story implementing tap-name rendering in Character Card or Core UI; any story closing `core-ui-screen-navigation.md` OQ#11. |
| **Ordering Note** | Independent of the other "should-have" ADR (Core UI input-lock/screen-stack/safe-area), but that ADR's own D.4 touch-target-padding decision (if it picks the Control-overlay route) should honor this ADR's Migration Plan note about keeping a positioning layer separable — see Consequences → Neutral. |

## Context

### Problem Statement

Two sub-problems, previously bundled under the same "no declared owner"
architecture gap:

1. **Mechanism ownership** — `character-card-identity.md`'s Rule #8 names
   `RichTextLabel` meta tag (Godot 4.4+) as the *technique* for opening a
   Character Card by tapping/clicking a character's name inside AI-generated
   narration text, but explicitly defers "chi tiết → becomes an ADR." No
   document states who computes the name→`char_id` mapping, where in the
   pipeline it runs relative to Contract Enforcement's leak-detection scan,
   or how it interacts with the disguise/concealment identity mechanic.
2. **OQ#11 (blocking gate)** — `core-ui-screen-navigation.md`'s own Open
   Question #11 states, verbatim in intent: the accessibility solution for
   tap-name (AccessKit confirmed non-functional on this project's sole
   HTML5/Web export target) must be decided **before** the shared
   `RichTextLabel`-meta-tag pattern locks into an ADR — because retrofitting
   accessibility after the render architecture is fixed could require
   restructuring how tap-targets are rendered, not just adding a layer. This
   ADR *is* the act of locking that pattern, so it cannot proceed without
   also resolving OQ#11.

Cost of not deciding: Character Card and Core UI cannot implement their
respective tap-name ACs (AC-28 through AC-31, AC-56a/AC-56b); OQ#11 remains
open in an Approved GDD indefinitely.

### Current State

No code exists for tap-name rendering yet. Both `character-card-identity.md`
and `core-ui-screen-navigation.md` are Approved but treat this mechanism as
"decided elsewhere."

### Constraints

- `narration_text` is free-form AI-generated Vietnamese prose (ADR-0003) —
  per this project's established posture (Contract Enforcement's own rule
  that no code path parses `narration_text` to extract world-state, and
  `ai-llm-integration-layer.md` Core Rule #2's content-only restrictions),
  the AI is never trusted to self-embed structured markup for a mechanical/
  interactive feature.
- Contract Enforcement's Formula 1 (Numeric Leak Detection,
  `mechanic-narration-contract-enforcement.md`) must scan the **raw,
  unmodified** `narration_text` — any tap-target markup inserted before that
  scan risks corrupting or evading its regex, and `char_id` strings
  (e.g. `npc_003`) contain digits that could produce false positives if
  visible to Formula 1.
- A name only becomes tappable when `card_exists(char_id)=true` (AC-29) —
  names with no card must render as plain, unstyled text.
- `character-card-identity.md` Rule #5/#6 (đặc quyền xuyên không /
  concealment): a major-canon character's disguise name and an ordinary
  NPC's concealment cover name are both legitimate strings that appear in
  narration and must resolve to the *same* `char_id` as the true name — this
  is the entire point of Pillar 2, confirmed by user decision this session.
- AccessKit (Godot 4.5+) is native-desktop-only, non-functional on this
  project's sole target (Web + Mobile Web, `technical-preferences.md`).
  `RichTextLabel` exposes no official bounding-rect API for an individual
  meta-span (confirmed by `godot-specialist` investigation, not just the
  GDD's own suspicion).
- Solo/small-team MVP budget — per this session's established
  `/architecture-decision` precedent (ADR-0001 through 0005).

### Requirements

- Must give Character Card ownership of name/alias→`char_id` resolution as a
  pure, unit-testable function (`coding-standards.md`), and Core UI ownership
  of BBCode construction, rendering, and `meta_clicked` handling.
- Must run strictly after Contract Enforcement's Formula 1-3 have already
  scanned the pristine `narration_text`.
- Must BBCode-escape all AI-generated text before any real markup is
  injected, closing a latent injection/rendering-corruption risk symmetric
  to the prompt-injection defenses already established for direct/stored
  input (AC-26/AC-33).
- Must formally resolve OQ#11 — not leave it open — with a documented,
  bounded scope decision, not a silent omission.

## Decision

### Part 1 — Name Resolution & Rendering Mechanism

**No AI involvement.** `narration_text` returned by `AiLlmRequestService`
stays exactly as ADR-0003 already shaped it — free prose, no embedded
markup, no new `call_type`. Contract Enforcement's Formula 1-3 run against
this same untouched string, unchanged from their existing design. The text
persisted to World Memory / via Persistence's `turn_records` is this raw
string, never a wrapped display copy — wrapping is a **presentation-only**
transform applied fresh at render time, not a stored artifact.

**Character Card owns name resolution** (new addition to its Public
Interface): a pure function that, given a text string, returns every
matching span for a known character whose card exists —matching **both**
the true name and any authored disguise/concealment display name to the
**same** `char_id` (closing the "which alias counts" question raised during
drafting: all of them do, because a player tapping a disguise name they've
seen in prose to confirm "I know who that really is" is the exact Pillar 2
fantasy this system exists to deliver — the Card's own already-designed
`displayed_field()`/D.2 formula is what actually gates what's *shown* once
opened, so resolving the tap target correctly does not leak anything D.2
wasn't already going to reveal).

**Core UI owns BBCode construction and rendering** (new addition to its
render pipeline): walks the match spans in order, BBCode-escapes every
character of the raw text *outside* a match span (`[` → `[lb]`, `]` →
`[rb]`), wraps each match span in `[url={char_id}]{escaped name}[/url]`,
sets the result as `RichTextLabel.bbcode_text`, and handles `meta_clicked`
by opening the Card for the tapped `char_id`. This is the standard,
long-stable `RichTextLabel` BBCode/meta-tag usage pattern — no DOM overlay,
no custom hit-testing, no dependency on a per-span bounding-rect API.

### Part 2 — OQ#11 Accessibility Scope

**MVP: tap-name-to-card and the 3 marginalia bookmarks (「Thẻ」「Lục」「Mục」)
are explicitly OUT OF SCOPE for screen-reader/assistive-technology support**
(SC 4.1.2 Name/Role/Value and SC 1.3.1 Info/Relationships, both Level A, are
**not** met by this entry point at MVP). This is a scoped, temporary,
on-the-record exception for this specific entry point — not a general
accessibility waiver for the product — adopted after independent
investigation (`accessibility-specialist` + `godot-specialist`,
2026-08-12) found both alternatives carry disproportionate cost for a
partial result:

- **ARIA DOM overlay**: Godot Web export renders all UI — including
  standard `Control` nodes, not just `RichTextLabel` — into a single
  `<canvas>`; nothing is a real DOM element by default. Scoping ARIA to
  only the 4 tap-name entry points would create a **compliance island**
  (a screen-reader user reaches 「Thẻ」 and hears something, tabs to the next
  element and hears nothing) — assessed as often worse than no accessibility
  layer at all, because it breaks the user's expectation mid-interaction
  rather than setting it consistently. Technically: `RichTextLabel` exposes
  no per-meta-span bounding-rect API (confirmed, not just suspected), so
  there is no documented input to position a DOM overlay from in the first
  place, compounded by D.3b's continuous `remove_paragraph()` reflow
  invalidating any position computed. Knowledge Risk: HIGH, zero prior
  prototype in this project.
- **Standalone TTS layer**: technically lower-risk (no pixel-position
  dependency), reachable via the same already-verified
  `JavaScriptBridge`/Web Speech API bridge pattern used elsewhere in the
  project — but does not satisfy SC 4.1.2 by the standard's own definition
  (exposing name/role/value through the *operating system's* accessibility
  API for the AT the user already has — NVDA, JAWS, VoiceOver, TalkBack —
  not a bespoke in-game narrator), carries the same compliance-island
  problem if scoped to 4 entry points, and has unverified behavior in this
  project's actual distribution channels (iOS Safari's user-gesture
  requirement for first `.speak()` call; Zalo/Facebook/Messenger in-app
  WebView support is unconfirmed, same risk class already flagged for
  storage APIs in `web-export.md`). Knowledge Risk: MEDIUM.

**Four binding conditions attach to this scope decision** — all four are
required for the exception to remain a transparent, accountable decision
rather than a silent omission:

1. **Not silent**: recorded here, plus a backlog item explicitly owned by
   `producer` (a real, tracked item — not "someday").
2. **The already-accepted keyboard fallback must actually work**: opening
   a Card via the 「Thẻ」 bookmark (a standard `Control` node, naturally part
   of Godot's Tab-focus chain) must pass AC-56a before MVP release. This is
   the accessibility win this MVP *does* deliver — SC 2.1.1 (Keyboard) is
   met for reaching a Card even though SC 4.1.2/1.3.1 (AT semantics) are
   not; a keyboard-only player without AT is not blocked, only a
   screen-reader/AT user is.
3. **No compliance claims while the gap is open**: never state "WCAG 2.1 AA
   compliant" anywhere (store page, README, marketing) while this Decision
   stands — registered as a forbidden pattern (see Registry candidates)
   so no future ADR or content page makes this claim unknowingly.
4. **Keep the door open at near-zero cost today**: if the separate Core UI
   ADR's own D.4 touch-target-padding decision picks the Control-overlay
   route (a different problem — inline tap-target sizing, not
   accessibility), that ADR should keep its positioning layer separable
   from the text-render layer, so a future accessibility retrofit can
   attach ARIA metadata to existing infrastructure instead of rebuilding it
   — advisory note to that ADR, not enforced by this one.

### Architecture

```
AiLlmRequestService.request_ai(&"narration_call", ...)
      │  returns {status: &"success", text: narration_text, ...}
      │  (raw, free-form Vietnamese prose — ADR-0003, unchanged)
      ▼
Contract Enforcement — Formula 1-3 (Numeric Leak Detection, etc.)
      │  scans narration_text EXACTLY AS RETURNED — this ADR does not
      │  touch this step, does not run before it, does not wrap anything
      │  Contract Enforcement will ever see
      ▼
Turn Manager confirms turn → World Memory / Persistence store RAW
narration_text in turn_records (unwrapped — wrapping is presentation-only,
never persisted, never re-derived from a wrapped copy)
      │
      ▼  (display path only, at render time — S2/S4/S4-RO/S5)
┌─────────────────────────────────────────────────────────────┐
│ Character Card.resolve_names_in_text(raw_text)                │
│   → Array[{start, end, char_id}]  (true + disguise/conceal-   │
│     ment display names, longest-match-first, non-overlapping, │
│     only for char_id where card_exists=true)                  │
└───────────────────────────┬─────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Core UI.build_tappable_bbcode(raw_text, matches)               │
│   → escapes [ ]  outside match spans, wraps match spans in    │
│     [url=char_id]name[/url], sets RichTextLabel.bbcode_text    │
└───────────────────────────┬─────────────────────────────────┘
                             ▼
                    RichTextLabel.meta_clicked(meta)
                             │
                             ▼
                  Core UI opens Character Card for
                  char_id = String(meta)

(Keyboard/screen-reader path, OQ#11 fallback — unaffected by the above):
「Thẻ」 bookmark (standard Control, Tab-focus chain) → same Card-open action
```

### Key Interfaces

```gdscript
# Character Card — new addition to its Public Interface (name resolution)
class_name CharacterCardRegistry   # illustrative — actual class name is
                                    # whatever Character Card's existing
                                    # entity-registry class already is
extends RefCounted

func resolve_names_in_text(text: String) -> Array[Dictionary]:
    # Pure function — no I/O, no AI call, no mutation. Reads this system's
    # own already-owned entity records (true_value(name), disguise_value(name)
    # when disguise_active, concealment.displayed_value(name) when
    # concealment.active — all schema this GDD already owns per Rule #5/#6/#8d).
    # Only considers characters where card_exists(char_id) == true.
    # Matching: longest-match-first across ALL known name-strings (true +
    # alias) for ALL eligible characters, non-overlapping (once a span is
    # claimed, shorter/overlapping candidates are skipped — prevents a name
    # that is a substring of another matched name from double-matching).
    # returns: [{start: int, end: int, char_id: String}, ...] sorted by start,
    # empty array if no known name appears in the text.
    ...

# Core UI — new addition to its render pipeline (BBCode construction)
class_name NarrationRenderer   # illustrative — lives wherever Core UI's
                                 # existing S2/S4/S4-RO/S5 render code is
extends RefCounted

func build_tappable_bbcode(raw_text: String, matches: Array[Dictionary]) -> String:
    # matches: output of resolve_names_in_text(raw_text), called by Core UI
    # once per turn's narration_text at render time (NOT at Contract
    # Enforcement time — that already ran on raw_text earlier and never
    # sees this function's output).
    var result: String = ""
    var cursor: int = 0
    for m in matches:                      # already sorted by start
        result += _bbcode_escape(raw_text.substr(cursor, m.start - cursor))
        var name_slice: String = raw_text.substr(m.start, m.end - m.start)
        result += "[url=%s]%s[/url]" % [m.char_id, _bbcode_escape(name_slice)]
        cursor = m.end
    result += _bbcode_escape(raw_text.substr(cursor))
    return result

func _bbcode_escape(s: String) -> String:
    # MUST run on every non-matched segment (and defensively on matched
    # name slices too) BEFORE any real [url=]/[/url] tag is injected —
    # closes a latent injection/corruption risk: AI-generated free text
    # could otherwise contain literal '[' / ']' that either breaks BBCode
    # parsing or forges a fake tag (e.g. a fabricated [url=...] pointing at
    # an attacker-chosen destination, or an [img=...] tag) — same defensive
    # posture already established for prompt injection (AC-26/AC-33).
    return s.replace("[", "[lb]").replace("]", "[rb]")

# Core UI's RichTextLabel render node, wherever narration is displayed
# (S2/S4/S4-RO/S5):
func _on_narration_meta_clicked(meta: Variant) -> void:
    _open_character_card(String(meta))   # meta is the char_id string set
                                          # as the [url=...] target above
```

### Implementation Guidelines

- `resolve_names_in_text()` must be called with the exact same raw
  `narration_text` string that already passed through Contract Enforcement
  — never a copy that has been trimmed, retranslated, or otherwise altered,
  or match spans (`start`/`end` byte/character offsets) will not line up
  with `build_tappable_bbcode()`'s `substr()` calls.
- Both new functions are pure/stateless with respect to I/O — no AI call, no
  Persistence write, no signal side-effect other than the render node's own
  `meta_clicked` — trivially unit-testable per `coding-standards.md`.
- `resolve_names_in_text()`'s "only `card_exists=true`" filter must be
  re-evaluated per call, not cached across turns — a card that ceases to
  exist (e.g. via Undo reverting an entity-record-creating turn, per
  ADR-0004) must stop being tappable in *previously rendered* text the next
  time it re-renders, matching AC-29's "no dead link" requirement.
- Test fixtures must cover: a name with no card (AC-29, plain text, no
  escape-related regression), a major-canon disguise name (`dual_identity`
  case, both true and disguise strings independently tappable to the same
  `char_id`), an ordinary NPC's concealment cover name, two names where one
  is a substring of the other (longest-match-first, no double-tap-target),
  and raw text containing literal `[`/`]` characters (escaping regression).

## Alternatives Considered

### Alternative 1: AI self-embeds markup around character names in `narration_text`

- **Description**: prompt-instruct the AI to wrap character names in a
  custom marker (e.g. `{{char:npc_003}}Tên{{/char}}`) directly in its
  returned text; Character Card/Core UI parse this marker instead of doing
  their own text matching.
- **Pros**: no name-matching logic needed client-side; markers could in
  principle disambiguate cases plain string-matching cannot (e.g. two
  different characters who happen to share a display name).
- **Cons**: depends on AI instruction-following fidelity for a mechanical/
  interactive feature — a single missed wrap silently removes a tap-target
  with no error signal; a marker containing `char_id` (which often contains
  digits, e.g. `npc_003`) sitting in the same string Contract Enforcement's
  Formula 1 scans risks false-positive leak detection depending on
  ordering; and it contradicts this project's established, repeatedly
  reaffirmed posture (`ai-llm-integration-layer.md` Core Rule #2,
  `mechanic-narration-contract-enforcement.md`'s "no code path parses
  `narration_text` to extract world-state") of never trusting AI output for
  anything beyond narrative content itself.
- **Estimated Effort**: Low-Medium (prompt change + marker parser), but
  ongoing reliability cost that grows with every new interactive surface
  someone later wants to add the same way.
- **Rejection Reason**: trades a one-time deterministic implementation cost
  for a permanent, silent reliability risk on a feature the project's own
  established philosophy says AI output should not be trusted to carry.

### Alternative 2: Build ARIA DOM overlay for tap-name accessibility now (MVP)

- **Description**: bridge to real DOM elements via `JavaScriptBridge`,
  positioned over the canvas at each tap-name's computed screen location,
  carrying `aria-label`/`role` attributes for screen readers.
- **Pros**: closes SC 4.1.2/1.3.1 for tap-name specifically, using a
  technically-real (if effortful) accessibility mechanism, not a
  workaround.
- **Cons**: see Decision Part 2 — no per-meta-span bounding-rect API exists
  to position from; D.3b's continuous `remove_paragraph()` reflow
  invalidates any computed position on every eviction; scoped to only 4
  entry points, creates a misleading compliance island rather than product-
  wide compliance; zero prior prototype in this project; HIGH Knowledge
  Risk, unbounded ongoing maintenance cost (every future layout change
  must re-verify DOM-overlay sync).
- **Estimated Effort**: High, and not a one-time cost — continuous
  maintenance burden for the life of the project.
- **Rejection Reason**: disproportionate cost for a partial, arguably
  net-negative-UX result (a compliance island), confirmed by independent
  `accessibility-specialist` + `godot-specialist` investigation.

### Alternative 3: Build a standalone TTS layer for tap-name accessibility now (MVP)

- **Description**: hook focus/interaction events and call the Web Speech
  API (`SpeechSynthesis`) via `JavaScriptBridge` to read content aloud.
- **Pros**: technically lower-risk than Alternative 2 (no pixel-position
  dependency); reuses an already-verified class of `JavaScriptBridge`
  bridge pattern.
- **Cons**: does not satisfy SC 4.1.2 by the standard's actual definition
  (exposing semantics through the OS accessibility API for the user's own
  AT, not a bespoke narrator); still a compliance island if scoped to 4
  entry points; unverified in-app-WebView support (Zalo/Facebook/Messenger
  — this project's real distribution channels) and an unverified iOS Safari
  user-gesture requirement for the first `.speak()` call; would need to
  cover the *entire* UI to be genuinely useful, not just tap-name, at which
  point its scope rivals a new subsystem.
- **Estimated Effort**: High if built to be actually useful (product-wide),
  Medium if scoped only to tap-name (but then delivers a compliance island,
  same problem as Alternative 2).
- **Rejection Reason**: does not achieve real SC 4.1.2 compliance even at
  full effort, and at MVP-appropriate (scoped) effort delivers the same
  misleading-partial-coverage problem as Alternative 2.

### Alternative 4: Match only the true (canonical) name, not disguise/concealment display names

- **Description**: `resolve_names_in_text()` only matches
  `true_value(name)`; a disguise or concealment cover name appearing in
  narration would render as plain, non-tappable text.
- **Pros**: simpler matching logic (one name-string per character instead
  of up to three).
- **Cons**: undermines Pillar 2 ("đặc quyền xuyên không") at its most
  direct moment of expression — a player reading "Vương Đông" in prose and
  wanting to confirm "I know this is really Đường Vũ Đồng" is exactly the
  intended fantasy; making that name untappable while the true name
  (which may appear far less often, or not at all, in a given stretch of
  play) works forces an inconsistent, confusing interaction model.
- **Estimated Effort**: Lower, but the wrong direction.
- **Rejection Reason**: rejected per explicit user decision this session —
  the Card's own `displayed_field()`/D.2 formula already gates what is
  shown once opened, so resolving more tap targets to the same `char_id`
  does not leak anything beyond what D.2 was already going to reveal.

### Alternative 5: Skip BBCode-escaping raw AI text before wrapping

- **Description**: pass `narration_text` straight into `bbcode_text`
  construction, only adding `[url=]` tags around matched names, with no
  escaping of any other bracket characters that might appear in the AI's
  free text.
- **Pros**: simpler, one fewer transform step.
- **Cons**: AI-generated free text is not guaranteed bracket-free; a
  literal `[`/`]` could corrupt BBCode parsing (visual bugs) or, in the
  worst case, be shaped by a successful prompt-injection attempt into a
  forged `[url=]`/`[img=]` tag pointing at attacker-chosen content —
  structurally the same threat class the project already defends against
  for direct/stored prompt injection (AC-26/AC-33), left open here for no
  reason.
- **Estimated Effort**: Near-zero to add (one `.replace()` pass), so the
  cost of NOT doing it is pure unmitigated risk for no savings.
- **Rejection Reason**: negligible cost, real and avoidable risk — no
  justification to skip it.

## Consequences

### Positive

- The "no declared owner" architecture gap for tap-name-to-card is closed
  with a concrete, pure-function-based, unit-testable mechanism — no AI
  reliability dependency, consistent with this project's established
  DI/pure-function bias (ADR-0001 precedent).
- OQ#11 is closed on the record, not left open indefinitely in an Approved
  GDD — `core-ui-screen-navigation.md` can be updated to reflect this.
- Pillar 2 ("đặc quyền xuyên không") is honored at its most direct
  interaction point — tapping a disguise/cover name works exactly like
  tapping the true name.
- BBCode-escaping closes a previously-unaddressed injection/corruption
  surface at near-zero cost.
- Character Card/Core UI can now implement AC-28 through AC-31 and AC-56a/
  AC-56b without further blocking questions.

### Negative

- Tap-name-to-card and the 3 marginalia bookmarks do not meet SC 4.1.2/1.3.1
  (Level A) for screen-reader/AT users at MVP — an accepted, documented,
  bounded gap, not a full accessibility solution. Real screen-reader users
  are only partially served (keyboard-only Card access via 「Thẻ」 works;
  discovering *which* names in prose are tappable via AT does not).
- `resolve_names_in_text()`'s longest-match-first, non-overlapping strategy
  is a reasonable default but not formally proven correct against every
  possible Vietnamese name-substring collision — should be revisited if a
  real content case surfaces an ambiguous match during playtest.

### Neutral

- This ADR does not change any of Character Card's or Core UI's existing
  Core Rules, Formulas, or ACs — it is additive (two new interface methods)
  plus a formal closure of an existing Open Question, not a rewrite.
- Does not preclude a future, better-resourced accessibility pass — Part 2's
  scope decision is explicitly for MVP, with a real (if currently
  hypothetical) reuse path through the Core UI ADR's D.4 Control-overlay
  branch if that infrastructure gets built for touch-target reasons anyway.

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| A future contributor (including an AI agent) treats "no compliance claim while open" as advisory rather than binding, and a marketing/store page claims WCAG 2.1 AA compliance | Low | Medium (reputational/trust, not legal at this project's scale) | Registered as a `forbidden_patterns` entry in `docs/registry/architecture.yaml` (pending user approval below) so `/architecture-review` and future ADR authoring can grep-check for the claim. |
| `resolve_names_in_text()`'s non-overlapping longest-match strategy produces an unexpected result for a real Vietnamese name pair not yet authored (e.g. one name is a common substring of another in an unusual way) | Low | Low | Test fixtures required in Implementation Guidelines cover the substring case generically; real content review during Character Continuation/Setting & Canon authoring is the practical backstop. |
| A future story implements the wrapping step BEFORE Contract Enforcement's Formula 1-3 instead of after, by accident (e.g. someone refactors Turn Manager's narration hand-off) | Low | Medium (would make Formula 1 scan already-marked-up text, risking false positives from `char_id` digits) | Architecture diagram and Implementation Guidelines state the ordering explicitly; recommend a regression test asserting Contract Enforcement receives byte-identical `narration_text` to what `AiLlmRequestService` returned, unrelated to whether tap-name wrapping ever ran. |
| Post-MVP accessibility retrofit (if/when picked up) discovers the Core UI ADR's D.4 branch did NOT keep the positioning layer separable (condition 4 was advisory, not enforced) | Medium | Low | Condition 4 is explicitly advisory in this ADR — if the Core UI ADR doesn't honor it, the cost is "rebuild instead of extend," not a correctness bug; flagged here so the Core UI ADR's author sees it when drafting. |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| CPU (frame time) | N/A (no code yet) | Negligible — `resolve_names_in_text()` scans one turn's narration (a few hundred characters) against a handful of known names (MVP: 3 seed NPCs × up to 3 name-strings each); runs once per turn render, not per frame | N/A |
| Memory | N/A | Negligible — transient `Array[Dictionary]` of match spans, discarded after render; no new persistent state | N/A |
| Load Time | N/A | No impact — purely a render-time transform | N/A |
| Network | N/A | Not applicable — no new network-bound operation | N/A |

## Migration Plan

Greenfield — no existing implementation to migrate from.

1. Character Card implements `resolve_names_in_text()`, unit-tested against
   the fixture set in Implementation Guidelines (no-card case, dual_identity
   case, concealment case, substring-collision case).
2. Core UI implements `build_tappable_bbcode()` + `_bbcode_escape()` +
   `meta_clicked` handling in its S2/S4/S4-RO/S5 narration render path;
   verify against AC-28 through AC-31.
3. Regression test confirms Contract Enforcement's Formula 1-3 receive
   `narration_text` byte-identical to `AiLlmRequestService`'s return value,
   independent of whether/how tap-name wrapping later runs on a copy.
4. Verify AC-56a/AC-56b (keyboard-only Card access via 「Thẻ」) passes before
   MVP release — this is Part 2's condition 2, non-negotiable.
5. Update `core-ui-screen-navigation.md` OQ#11 to CLOSED, referencing this
   ADR. Update `docs/architecture/architecture.md`'s Missing ADR List and
   QQ-04 entry.
6. **Deferred, not part of this ADR's implementation**: real ARIA/TTS
   accessibility work for tap-name, revisited post-MVP if
   `accessibility-specialist`/`producer` prioritize it — reusing the Core
   UI ADR's Control-overlay infrastructure if that route was chosen there
   for touch-target reasons (condition 4).

**Rollback plan**: if `resolve_names_in_text()`'s matching strategy proves
wrong in practice (e.g. real content produces frequent ambiguous matches),
the fix is local to that one function — no other system's interface
changes, since Core UI only ever consumes its `Array[Dictionary]` output
shape, never its internal matching algorithm.

## Validation Criteria

- [ ] A test proves a name with `card_exists=false` renders as plain text —
      no `[url=]` tag, no visual link styling (AC-29).
- [ ] A test proves tapping/clicking a major-canon character's disguise name
      opens the same Card as tapping their true name, at the same `char_id`
      (`dual_identity` case).
- [ ] A test proves an ordinary NPC's concealment cover name is equally
      tappable, resolving to the correct `char_id` (the Card's own D.2
      formula, unchanged by this ADR, is what then correctly withholds the
      true value).
- [ ] A test proves `build_tappable_bbcode()` correctly escapes literal
      `[`/`]` characters present in raw AI text outside any matched name
      span (injection/corruption regression).
- [ ] A test proves Contract Enforcement's Formula 1-3 receive
      `narration_text` unchanged, independent of tap-name wrapping logic
      (ordering regression).
- [ ] AC-56a passes: Card is reachable via the 「Thẻ」 bookmark through
      keyboard-only (Tab-focus) navigation, with tap-name-via-keyboard
      explicitly out of scope for MVP.
- [ ] `docs/registry/architecture.yaml` records this ADR's forbidden-pattern
      entry (no WCAG 2.1 AA compliance claim while this gap is open) so no
      future content/marketing page makes the claim unknowingly.

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `character-card-identity.md` | Character Card & Identity | Core Rule #8 / `TR-cci-012` (tap-name entry via `RichTextLabel` meta tag) | `resolve_names_in_text()` gives Character Card the name-resolution half of this mechanism; technique confirmed as plain BBCode `[url=]`/`meta_clicked`, no DOM overlay. |
| `character-card-identity.md` | Character Card & Identity | Rule #5/#6 (đặc quyền xuyên không, concealment) | Decision Part 1 explicitly matches true + disguise + concealment display names to the same `char_id`, per user decision. |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | #15 D.4/§8, AC-28–AC-31 | `build_tappable_bbcode()` gives Core UI the rendering half; escaping requirement closes an unaddressed corruption/injection surface. |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | OQ#11 (accessibility scope, blocking gate on locking the meta-tag pattern) | Closed — Decision Part 2, Nhánh C (out-of-scope-MVP) with four binding conditions, after independent `accessibility-specialist`/`godot-specialist` investigation. |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | AC-56a/AC-56b (keyboard fallback via 「Thẻ」) | Condition 2 of Decision Part 2 makes this non-negotiable before MVP release. |
| `mechanic-narration-contract-enforcement.md` | Mechanic/Narration Contract Enforcement | Formula 1 (Numeric Leak Detection) must scan raw `narration_text` | Architecture diagram + Implementation Guidelines make the ordering explicit; Migration Plan step 3 adds a regression test. |
| `docs/architecture/architecture.md` | Cross-system Open Questions | QQ-04 (Core UI OQ#11) | Closed — see Decision Part 2. |

## Related

- `design/gdd/character-card-identity.md` — Core Rule #8, Rule #5/#6, `TR-cci-012`, AC-28–AC-31.
- `design/gdd/core-ui-screen-navigation.md` — #15 D.4/§8, OQ#11, OQ#12 (related but distinct — WCAG 200%-resize, not addressed by this ADR), AC-56a/AC-56b.
- `design/gdd/mechanic-narration-contract-enforcement.md` — Formula 1, the ordering constraint this ADR's pipeline respects.
- `design/gdd/ai-llm-integration-layer.md` / `docs/architecture/adr-0003-ai-llm-integration-layer.md` — establishes `narration_text` as untouched free-form text, the foundation this ADR builds on.
- `docs/architecture/architecture.md` §Missing ADR List — "Character Card's tap-name-to-card mechanism" and "Core UI OQ#11" entries this ADR closes.
- `docs/engine-reference/godot/modules/ui.md`, `docs/engine-reference/godot/modules/web-export.md` — engine-source verification for both the adopted mechanism (LOW risk) and the declined accessibility branches (HIGH/MEDIUM risk).
