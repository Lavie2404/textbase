---
name: ai-llm-integration-layer-ac-review-round2
description: ai-llm-integration-layer.md round-2 (final, spike-gated) AC review — AC-01 re-run clause has zero repo-level enforcement artifact; AC-26 coverage caveat inconsistently placed vs AC-10/24/25; AC-31 mutation-test clause lacks injection-seam spec; AC-27's turn-manager.md-side obligation still has no dedicated AC (only prose)
metadata:
  type: project
---

Round 2 (final, per spike-gated round cap) of `design/gdd/ai-llm-integration-layer.md`
AC-01→AC-31, done 2026-08-08 after Godot Web export spike closed. See also
[[finding-ai-llm-integration-layer-ac-review-round1]].

**1. AC-01's "PHẢI được re-run" clause (line ~535-540) has no real enforcement
artifact in-repo.** Checked: no `.github/workflows/*.yml` exists at all;
`.github/PULL_REQUEST_TEMPLATE.md` is scoped to the agent/skill meta-tooling
(checklist items about agents/skills, nothing about `src/`); `CODEOWNERS` only
routes `.claude/`. The AC's own GIVEN clause ("CI check chạy trên MỌI PR đụng
tới `src/`") is actually sufficient IF the trigger's path filter is `src/**`
— that already covers Combat/Situation's first PR automatically, making the
separate "PHẢI được re-run" sentence redundant restatement, not a new
mechanism. But AC-01 never asserts the trigger config itself (no clause like
"AND CI workflow `on.pull_request.paths` includes `src/**`") — so today
there's nothing to test at all; it's a promise in prose. Recommend AC-01 add
either (a) a fixture-based regression test — synthetic file simulating "first
Combat/Situation code with an HTTPRequest call outside module" and assert the
scan step fails on it now (this needs no real Combat code yet, closes the
"can't test until code exists" gap for real), or (b) an explicit assertion on
the CI trigger path-filter config once the workflow file exists.

**2. Preamble's "2 exceptions to method" (mock/spy vs CI-check vs manual-step
mock) is accurate as far as METHOD goes** — re-scanned all 31 AC, no third AC
uses a genuinely different verification technique. But AC-26 (line ~752-762)
carries an explicit coverage caveat ("không kiểm chứng được hành vi model
tuân thủ — giới hạn cố hữu của mock") that applies identically to AC-10
(safetySettings), AC-24, AC-25 (prompt instructions) — those also only assert
the instruction/field is PRESENT in the outgoing request, never that the
model obeys it — yet only AC-26 states the caveat. This isn't a 3rd method
exception (all four use standard mock/spy on request content), but the
inconsistent caveat placement could mislead a reader into thinking AC-10/24/25
verify actual compliance while AC-26 doesn't. Fix: state the caveat once in
the preamble as a general note ("any AC asserting prompt/instruction/field
CONTENT — AC-02/03/09/10/24/25/26 — proves the request was built correctly,
never that the model complies"), not just at AC-26.

**3. AC-31 (line 806-818), invariant `tried` monotonic, uses a mutation-test
framing ("bug giả lập bằng cách patch trực tiếp") without specifying an
injection seam** — unlike AC-29 (line 782-794) which names the exact DI point
(`Time.get_unix_time_from_system()` vs `world_time`). Formula 3 already
defines `next_model(ladder, tried)` as taking `tried` as an explicit
parameter (pure function) — the first half of AC-31 (spy-count `next_model`
calls ≤ |M| before NONE) is already a sufficient black-box behavioral
assertion; the second half (deliberately patch a buggy reset-on-ladder-
recompute implementation and confirm the test fails) doesn't name which
function/class the implementer should patch, so a QA tester can't implement
it without guessing. Recommend either naming the orchestrator function that
owns the `tried` accumulator (mirroring AC-29's DI callout) or dropping the
"patch to simulate bug" clause since the first half already fully specifies
the correct behavior — a mutation-test aside describing "what happens if this
invariant breaks" isn't standard GIVEN/WHEN/THEN input→output and isn't
necessary once the correct-behavior assertion is precise.

**4. AC-27's cross-reference (line 763-775, "ràng buộc thật thuộc phạm vi
turn-manager.md/combat-system.md") — checked both docs.** `combat-system.md`
DOES have a concrete AC (AC-54, line 2646-2661) with GIVEN/WHEN/THEN + spy
asserting D.2-D.10 recompute count = 0 across N narration_call failures —
this obligation is real, not a dangling promise. But `turn-manager.md` itself
— the actual owner of the pending in-memory `locked_result` cache per its own
Edge Cases text (line 239-263, with 3 explicit discard triggers a/b/c) — has
ONLY prose in Edge Cases, no corresponding AC-numbered test. Its existing
AC-13 ("lỗi mạng", line 415-417) predates the round-1 cascade and only
asserts `world_time` doesn't advance — nothing about resubmit-same-
locked_result or the a/b/c discard lifecycle. AC-54 in combat-system.md tests
Combat's resolve function statelessness via a test harness that likely
constructs `locked_result` directly, not necessarily by exercising
turn-manager.md's actual cache-hold/discard code path — so a bug where Turn
Manager holds the WRONG cached value, or discards it on the wrong trigger, or
never discards on trigger (b)/(c), could slip through with AC-54 unaffected.
This is a real coverage gap: recommend a new AC in turn-manager.md's own
Acceptance Criteria section asserting the a/b/c discard lifecycle directly
(e.g. GIVEN locked_result pending + player sends a DIFFERENT action, THEN
pending value is discarded and NOT reused for the new action's narration_call).
