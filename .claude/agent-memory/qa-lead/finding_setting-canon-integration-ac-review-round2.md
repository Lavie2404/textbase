---
name: setting-canon-integration-ac-review-round2
description: setting-canon-integration.md AC review round 2 (final, round-cap) — AC-05/AC-22b assert status(D) equality only, not full locked_result bit-identity; AC-38's depth-25 case only tested bundled with other errors, never isolated via normal load path; AC-47 golden set has no consecutive-rescue-failure scenario; D.4 pseudocode still has an undefined-write-mechanism gap for canon_break_flag on cascade path
metadata:
  type: project
---

Round 2 (final, round-cap reached per `.claude/docs/coordination-rules.md`
mechanically-heavy policy) targeted audit of
`design/gdd/setting-canon-integration.md` against the 4 confirmation
criteria `creative-director` set at the end of round 1 (see
[[finding_setting-canon-integration-ac-review-round1]] and
`design/gdd/reviews/setting-canon-integration-review-log.md`). Not a
full re-review — scoped strictly to verifying round 1's fixes.

**4 targeted questions — verdicts:**

1. **Bit-identical invariant (reverse `resolution_order` → same result),
   AC-05/AC-22b — GAP (partial)**: both AC compare only `status(D)`
   across the two orders, not the full `locked_result` (e.g.
   `canon_break_flag_[D.id]`, statuses of other events touched by the
   same-turn cascade). AC-22b's "chỉ xuất hiện ĐÚNG 1 lần" clause is a
   per-run presence check, not a cross-order equality check. Worse: **D.4's
   `cascade_vanish_check` pseudocode has no line that writes
   `canon_break_flag_[D.id]`** — only `transition_event_status` is called
   — yet AC-30's regression fixture and AC-22b's own field list both
   presuppose this field gets set via cascade. This is the same defect
   class as round-1 finding #1 (CASCADE_MAX_DEPTH missing mechanism,
   already fixed) recurring for a *different* field that round 1 didn't
   touch. Proposed fix: new AC-22c asserting full-`locked_result`
   equality across both orders, and D.4 pseudocode needs an explicit
   `canon_break_flag_[D.id] := true` line (with a defined condition —
   likely "first time D's status changes away from Dormant/-Modified via
   any writer this turn").

2. **Load-time depth-25 rejection (not silent runtime truncation),
   AC-38 — GAP**: AC-38's `cascade_too_deep` case is only exercised
   *bundled* with 4 other simultaneous errors in one fixture — there is
   no AC for an otherwise-100%-valid pack whose *only* problem is a
   25-deep linear chain, loaded through the **normal** (non-bypass) load
   path, asserting rejection. AC-22's depth-25 fixture explicitly
   *bypasses* load-time validation via a test hook — it tests the
   runtime safety-net cutoff behavior, a deliberately different code
   path from "does a valid-looking-except-for-depth pack actually get
   rejected at load". Proposed fix: new AC-38b, isolated single-error
   case, normal load path only.

3. **Rescue-failed-twice-in-a-row playtest invariant, AC-47 — GAP**:
   AC-47's golden scenario set is generic ("≥1 kịch bản/loại
   resolution"), treating "rescue thất bại" as one resolution type with
   one representative scenario. It does not include the compounding case
   — same event, 2 consecutive failed rescue attempts (potentially 2
   different `canon_rescue_failed_reason` enum values) — which is the
   specific invariant round 1's `game-designer` raised (SDT Competence:
   player must be able to articulate the mechanical reason for *each*
   failure, not just that failure happened once). Proposed fix: AC-47b,
   add this as a named golden scenario to the existing set.

4. **`on_break=substitute` declared-but-wrong (not missing) authoring
   risk, ND-1/ND-2 — PASS (inherent limit, no schema hook exists)**: D.3
   deliberately carries zero personality/narrative-weight dimension (explicit
   round-1 decision: "Không thêm chiều tính cách/quan hệ vào D.3, phá
   determinism AC-20"), and `is_major_canon` is a *character* attribute
   (checked in AC-02/AC-40), not a field on the *role*/premise that
   `on_break` attaches to — so there is no existing schema field to hook
   a load-time warning to. Mechanizing this would require a NEW authoring
   field (e.g. `role.narrative_criticality`), which is a design-scope
   change beyond a QA audit's mandate. Recommend as a non-blocking Open
   Questions backlog note, not a new AC.

**Extra check — 3+ simultaneous cascade sources (AC-22b only tests 2,
E1/E5) — NOT a blocking gap**: `transition_event_status` Guard 2 is a
pairwise max-comparison over a totally-ordered severity scale (D.5b);
max-fold over any finite sequence is commutative/associative regardless
of element count, and D.4/D.6 execute strictly sequentially (no
concurrency/reentrancy risk), so 2-source empirical coverage is
mathematically sufficient to validate order-independence for N≥2. A
3rd-source regression AC would be cheap defensive insurance but is
nice-to-have, not blocking.

**Why it matters**: round cap is reached after this round (final round
per `.claude/docs/coordination-rules.md`) — all 3 GAP items (bit-identical
scope, isolated depth-25-at-load, consecutive-rescue-failure golden
scenario) and the D.4 `canon_break_flag` missing-mechanism note go to
implementation/AC backlog rather than a round-3 adversarial pass, per
the round-cap policy's own instruction to route nhóm-B/compiler-catchable
gaps to backlog once the cap is hit.

**How to apply**: when this system reaches Approved and unit tests are
actually written, prioritize AC-22c/AC-38b/AC-47b + the D.4
`canon_break_flag` cascade-write-mechanism fix as pre-implementation
backlog items — don't let them silently drop like 3/7 of
`combat-system.md` round-2 backlog items did (see
[[finding_combat-system-ac-review-round4]]).
