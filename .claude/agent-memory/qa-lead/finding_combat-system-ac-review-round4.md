---
name: finding-combat-system-ac-review-round4
description: Round-4 narrow AC re-review of design/gdd/combat-system.md found 6 nhóm-B findings and 6 blocking findings, both exceeding creative-director's exit bar (0 nhóm B, ≤4 blocking) — most important: player_id (round-3's own fix) still has zero AC literally asserting outcome.type=="lose", and 3 of round-2's 7 AC-coverage-gap backlog items silently vanished from tracking despite round-3 claiming full explicit deferral.
metadata:
  type: project
---

Round-4 narrow re-review (2026-08-06) of `design/gdd/combat-system.md`
Acceptance Criteria, requested by creative-director with explicit exit
criteria: 0 nhóm-B findings, ≤4 blocking findings (all nhóm A/UX). **Both
criteria failed**: 6 nhóm-B findings (4 blocking), 6 blocking total.

**Most important finding**: round 3 added `player_id` specifically to fix
the undefined `self`/`other` symbol bug (see
[[finding-combat-system-ac-review-round3]]) — the pseudocode fix is
verified correct (reclassify_outcome/apply/tiebreak_winner all take
explicit `player_id`/`rng` params now). But **no AC in the entire suite
literally asserts `outcome.type=="lose"`** — every literal `outcome=`
assertion in the AC section is `"win"` or `"no_outcome"`, never `"lose"`.
AC-26 (the exact scenario where player_id's actor hits HP=0) only says
"outcome xác định đúng người thắng/thua" in prose. Death & Consequence
reads `outcome="lose"` literally (GDD line 1650) — this is the textbook
case of "round 3 added a new code path but never added coverage for it."

**Other blocking nhóm-B findings**:
- AC-45 (rewritten this round specifically to close a testability gap)
  GIVEN clause lists only 5/6 of `resolve_exchange`'s current params,
  omitting `rng` — if rng isn't held identical between the 2 diffed
  calls, the test can produce false failures unrelated to the thing it's
  testing (Hảo cảm having zero effect).
- D.1's non-skill-action branch (`gap_gear` without `skill_tier_used`,
  GDD lines 440-441, defend/flee case) — zero AC across the whole
  Formulas section.
- D.9b's "cache 1 lần khi trận khởi tạo, không tính lại mỗi pha"
  contract (parity_diff/spar_parity_eligible) — zero AC.

**Process finding, not itself a design bug**: round-3's revision log
claimed "Recommended CHƯA đóng... đã ghi tường minh vào Open Questions
của GDD — không còn trôi nổi chỉ trong review log." A full read of Open
Questions (GDD lines 2572-2790) confirms 3 of round-2's 7 "AC coverage
gap" backlog items (D.1 non-skill action, D.9b cache test, AC-27
structural criteria) are **not mentioned anywhere** — they weren't
closed AND weren't given the promised explicit-deferral treatment; they
just disappeared between round-3's diagnosis (which explicitly named
them as still-open, "7/7 mục AC coverage gap từ backlog vòng 2 còn
nguyên") and its fix table (which closed only 4/7: AC-45, AC-41h/i
label, D.11 normal case via AC-28b, non-spar negative via AC-41j).

**Blocking nhóm-A findings** (design/spec-clarity, not code-path bugs):
- AC-47a's GIVEN scopes the full 108-combo Safe Range sweep, but its
  THEN only asserts convergence for the `CAP-ONSET≥120` subset (96
  combos) — verified against `prototypes/combat-reference/harness.py`'s
  `experiment_q1_fixed()`: it sweeps all 108 unfiltered and prints the
  12 non-qualifying combos as unlabeled "Failing combos," with no
  in-script annotation distinguishing "expected-exempt under the
  cross-constraint" from "real failure." A literal implementation of
  the GIVEN (parametrize test over full 108, assert convergence for
  all) would produce 12 spurious failures on a nominally-BLOCKING gate.
  The underlying 96/108 number is correct; the GIVEN/THEN scope mismatch
  plus un-annotated harness output is the actual risk.
- AC-09b requires narration_text to match "danh sách từ khóa cho phép
  theo từng type" (an allowed-keyword-list per outcome type) that is
  never defined anywhere in the document (checked Visual/Audio
  Requirements and elsewhere) — cannot write the Integration test
  without first authoring that list.

**Minor/non-blocking**: AC-09's "cấp ngoài" field enumeration omits
`outcome` even though Core Rule #11 lists it as 1 of 6 top-level fields
(low practical risk, outcome is exercised elsewhere); Core Rule #11
itself has an off-by-one text bug ("5 field đã khai" followed by a
6-item list) inside the very clause 3 rounds have cited as "single
source of truth" for the schema; AC-07 still describes `w_*`/`Điểm_Kỹ_
Năng`/`Điểm_Trang_Bị` as if varying "between calls of resolve_exchange"
(flagged in round 3's own finding, never fixed, unchanged text).

**Why this matters**: this is the second consecutive round where the
"we fixed the pseudocode bug" claim did not translate into "we added
the test that would catch a regression of that bug" — the player_id
case is a near-exact structural repeat of round 3's original self/other
finding, just one layer removed (missing coverage for a new field
instead of an undefined symbol in old code). **How to apply**: when a
GDD rewrite adds a NEW parameter/field specifically to fix a prior bug
(e.g. `player_id`, `rng`, `thuc_id_of` all added in round 3), always
check whether the AC suite got a literal assertion added for the new
field's *correctness* (not just its presence/threading) — "the bug is
fixed" and "there's a test that would catch this bug coming back" are
different claims and this GDD's history shows they get conflated.
Also: when a review round's log claims backlog items were "written
explicitly into Open Questions so nothing floats only in the review
log," verify that claim by grep, don't take it on faith — 3/7 items in
this case were quietly dropped despite the claim.

Final tally: **nhóm B count: 6 (4 blocking, 2 non-blocking), blocking
count: 6** (4 nhóm B + 2 nhóm A). Both of creative-director's exit
criteria (0 nhóm B, ≤4 blocking) failed — recommend escalation to
`technical-director` per the contingency creative-director set at the
end of round 3.
