---
name: finding-combat-system-ac-review-round3
description: Round-3 adversarial AC review of design/gdd/combat-system.md found an undefined-symbol bug in the D.9b/D.9c win/lose pseudocode that survived 2 rounds of schema-unification fixes, plus a recurring pattern of AC coverage gaps hidden behind prose-only assertions instead of formula-derived expected values.
metadata:
  type: project
---

Round-3 adversarial review (2026-08-06) of `design/gdd/combat-system.md`
Acceptance Criteria (AC-01–AC-53) found:

1. **New blocking bug, undetected by rounds 1–2**: D.9b `reclassify_outcome`
   (GDD line 926) and D.9c `apply`/`tiebreak_winner` (line 979-980) both use
   `nominal_winner==self` / `winner==self` — `self` (and `other` at line 980)
   is never a declared parameter or defined symbol in either function's
   scope. Core Rule #11's `locked_result.outcome` schema is a single
   non-per-actor struct (`{type, winner_id, loser_id}`), but this ternary
   reads like leftover pseudocode from a per-actor-perspective model. It's
   load-bearing: Dependencies section confirms Death & Consequence reads
   `outcome="lose"` literally (line 1421), so "lose" isn't dead code — the
   `self` symbol needs a real, explicit definition (most likely "the player
   character is always implicitly one fixed side of every Combat instance"),
   but this convention is nowhere stated in the doc. No AC in the current
   suite ever asserts a literal `outcome.type=="lose"` value — every AC
   (AC-41a, AC-26, AC-08, etc.) either checks `winner_id` directly or uses
   vague prose ("outcome xác định đúng người thắng/thua"), so the bug is
   invisible to the AC suite. This is the same *class* of bug round 2 found
   in D.9's `per_actor` assembly (R2-4, hp_after tráo giữa actor) — a
   schema-unification fix (Core Rule #11) that wasn't fully propagated down
   into the pseudocode of the formulas that reference it.

2. **Recurring meta-pattern**: several ACs are testable-in-form but weak
   in substance because they assert an expected value in English prose
   rather than deriving it from the actual pseudocode expression (AC-07's
   GIVEN references a `w_*` parameter that `resolve_exchange` doesn't even
   accept; AC-27's "≥10 tổ hợp" has no defined coverage axes so a trivial
   fixture set could satisfy it; AC-45 allows "rà soát chữ ký hàm" — manual
   code review — as an alternative to an automated test, violating the
   Logic/BLOCKING automated-test requirement literally).

3. **Confirmed still-open backlog items** (named in
   `design/gdd/reviews/combat-system-review-log.md` round-2 "CHƯA đóng"
   list) — verified against current file text, unchanged since round 2:
   D.1 non-skill-action case untested (Core Rule #1's "gap_gear without
   skill_tier_used" branch for defend/flee has zero AC), D.11 "ca thường"
   (normal-case P_flee computation, not just the 0/0 boundary) has zero AC,
   D.9b cache-once-per-battle behavior untested, `is_spar_friendly=false`
   negative test for D.9b (confirming no false-positive draw) is missing —
   this one is safety-critical (Pillar 2, could mask a real loss as
   `no_outcome`), AC-41h/AC-41i are labeled "(unit / unit+spy...)" instead
   of "Logic"/"Integration", which is the literal trigger string the AC
   section's own preamble uses to mark BLOCKING status — so as written
   these two ACs may not register as blocking gates in tooling that parses
   AC labels, AC-27's "≥10 tổ hợp" still has no defined structural coverage
   criteria.

**Why this matters**: this GDD has gone through 2 full adversarial rounds
that each specifically hunted for and fixed schema/determinism bugs, yet
a fresh undefined-symbol bug in the most central formula (win/lose
determination) was never caught — because the AC suite verifies outcomes
in prose rather than by deriving expected values from the pseudocode
itself. **How to apply**: in any future round-4 review of this GDD, or
when reviewing other GDDs' AC sections, specifically check whether each
AC's "THEN" clause was derived by literally evaluating the cited
formula/pseudocode, or just restates commonly-expected behavior in prose —
the latter systematically hides bugs like this one. Also worth carrying
forward as a general AC-writing heuristic project-wide.
