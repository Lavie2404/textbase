---
name: finding-ai-llm-integration-layer-ac-review-round1
description: Round-1 full /design-review of design/gdd/ai-llm-integration-layer.md AC-01..23 — found AC-01's "static check" method unspecified/vacuous-pass risk, a second undisclosed non-fake-clock-determinism exception at AC-21 (concurrency), cross-doc test-ownership ambiguity for calls_per_turn, and unstated singleton-state reset risk for cooldown_until. Reusable review heuristics, not just this-doc-specific.
metadata:
  type: project
---

Round-1 full `/design-review`-style adversarial pass (2026-08-07, user-run
manually, not the `/design-review` skill invocation itself) of
`design/gdd/ai-llm-integration-layer.md` Acceptance Criteria (AC-01..23).
Unlike [[finding-combat-system-ac-review-round3]] /
[[finding-combat-system-ac-review-round4]], this doc had **no nhóm-B
undefined-symbol-style pseudocode bugs** in its Formulas (F1-F4 all
well-defined, no undefined variables) — likely because it explicitly
disclaims being gameplay-balance math ("không có RNG, không có
damage/EXP") and because lessons from Combat's rounds seem to have been
internalized (formulas are cleaner than Combat's D.9b/D.9c pseudocode was).

**Numbering-vs-content check result**: all 8 Core Rules / 4 Formulas / 8
Edge Cases DO have a numerically-corresponding AC (R1→AC-01 ... EC8→AC-23),
and most pairs genuinely match in content. But content-level gaps exist
inside otherwise-"covered" pairs — the numbering matching hid these:

1. **R2's prompt-content requirements have zero AC coverage.** Core Rule
   #2 requires narration_call prompts to include the instruction "chỉ
   tường thuật, cấm nêu số liệu thô, cấm tự đổi outcome" and
   suggestion_call prompts to include "lịch sử liên quan" +
   "đề xuất đúng 4 hành động khả thi, không trùng lặp". AC-02 only checks
   `locked_result`+World Memory inclusion; AC-03 only checks JSON
   schema/parsing. The actual instruction text/context injection — the
   part Contract Enforcement's Checkpoint 2 depends on — is asserted
   nowhere. Same shape as Combat round-4's "AC-09b references an
   allowed-keyword-list that's never defined" finding: a real behavior
   is named in the Core Rule but has no literal assertion anywhere.

2. **AC-01's "static check trên codebase" is not a well-formed AC.** No
   scan method (regex? AST/import-graph?), no scope, no false-positive
   handling (e.g. Turn Manager importing this layer's `call_type` enum
   isn't an API call), no false-negative handling (dynamically built
   URLs evade string scans). Worse: since Combat System and
   Situation/Encounter Generation (this layer's two documented future
   callers) don't exist in code yet, AC-01 is currently vacuously true —
   it must be re-specified as a **recurring CI/architecture-fitness
   check**, not a one-time Done-gate test, or it will silently stop
   protecting the invariant once those systems are implemented.

3. **The preamble's determinism claim has an undisclosed second
   exception.** GDD states "AC-01 là ngoại lệ DUY NHẤT" (only exception
   to the mock+spy+fake-clock method). But AC-21 (EC6, concurrency/
   sequential-processing) asserts *execution ordering* between two
   overlapping async `request_ai()` calls — fake clock controls simulated
   time, not async/coroutine resolution order. Making AC-21 actually
   deterministic requires a manually-stepped mock HTTP client (test
   explicitly triggers each response), which is a different testing
   primitive than "fake clock," undisclosed in the preamble. **Reusable
   heuristic**: any GDD that claims "fake clock = full determinism" while
   also having a concurrency/ordering AC should be checked for this same
   gap.

4. **Cross-doc test-ownership ambiguity for `calls_per_turn`.** Formula 4
   explicitly states `calls_per_turn` is "Biến DUY NHẤT mà Turn Manager
   theo dõi" (Turn Manager's own variable) — yet AC-05/06/15/17/22 (all
   inside *this* GDD's AC suite) assert directly on it. Per
   `coding-standards.md` Isolation/DI rules, a pure unit test of this
   layer shouldn't reach into a caller's counter. Recommended either (a)
   narrow these ACs to what this layer actually owns ("request_ai()
   resolves to exactly 1 result per logical call regardless of internal
   http_attempt_count") and let `turn-manager.md`'s own AC suite own the
   counter-increment assertion, or (b) explicitly reclassify these
   specific ACs as **Integration** evidence type (two systems wired
   together) rather than Logic-unit-test evidence — this changes which
   gate applies at story-Done time, so it's a qa-lead classification
   call, not just a wording nit.

5. **Unstated singleton-state reset risk (`cooldown_until`).** Formula 3's
   per-model cooldown state almost certainly lives in a singleton/autoload
   (natural consequence of Core Rule #1's "one call site" requirement).
   AC-07/AC-14/AC-19 all set `cooldown_until` values as GIVEN preconditions
   but never state the state must be reset/dependency-injected fresh per
   test — if implemented as a shared singleton, these 3 tests would leak
   state across each other depending on run order, violating
   `coding-standards.md`'s explicit Isolation rule ("tests must not depend
   on execution order").

**Why this matters**: this doc scores much better than Combat on
pseudocode correctness (round cap rule in `coordination-rules.md` doesn't
even apply here — no RNG/damage/EXP math), but the *same class* of
"AC exists and numbering lines up, but doesn't actually assert the thing
the rule requires" gap that plagued Combat rounds 3-4 still shows up here
in different clothing (prompt-content injection, vacuous architecture
check, hidden non-determinism, cross-doc counter ownership, singleton
reset). **How to apply**: for any future GDD review, don't stop at
"does every Core Rule/Formula/Edge Case have a numbered AC" — for each
pair, ask "does the AC's GIVEN/WHEN/THEN literally exercise every clause
of the rule's prose, including the parts that sound like implementation
detail (instruction text injected into a prompt, which module owns a
shared counter, whether stateful config is a singleton)?" That's where
this class of gap hides.
