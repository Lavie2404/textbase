---
name: finding-exp-realm-progression-ac-review-round2
description: Round-2 adversarial AC review of design/gdd/exp-realm-progression.md — round-1's self=player_id fix (A13/AC-39) only covered the combat winner/loser branch, not the sibling Song Tu source that shares the same `self` param but reads a player-centric subsystem; also found an orphan (EXP_THRESHOLD_INCREMENT<0 has zero AC), a vague ADVISORY AC (AC-40 cites a "shared" subjective-survey mechanism in game-concept.md that doesn't actually exist for its claimed purpose), and an under-specified integration-test note (A11).
metadata:
  type: project
---

Round-2 review (2026-08-08) of `design/gdd/exp-realm-progression.md` (46 AC),
following round-1 MAJOR REVISION NEEDED (see
[[finding-combat-system-ac-review-round4]] for the sibling pattern this
repeats). Full findings in the review transcript; key items worth
remembering for future GDD reviews:

**Pattern repeat — partial self-scoping fix**: round-1's A13 fixed
`self=player_id` confusion for the COMBAT branch of `resolve_turn_exp`
(D.6) — added Core Rule #11, self-relative `winner_id==self`/`loser_id==self`
pseudocode, and AC-39 testing `self=NPC` combat-win. But Rule 2's Song Tu
source condition (b) — "đang trong quan hệ Song Tu active với 1 NPC" — was
never re-derived for `self=NPC`. `npc-affinity-relationship.md`'s entire
data model is NPC-affinity-toward-the-player only (no NPC-to-NPC affinity
concept, Song Tu button lives on the NPC card, initiated by the player) —
so `SONG_TU_ACTIVE(self)` is well-defined when `self=player_id` but
undefined/unaddressed when `self=NPC`, exactly the same class of bug A13
fixed one line up, in the same rule, same function, untouched. **How to
apply**: when a GDD fix re-derives a formula/pseudocode branch for a newly
generalized parameter (here: `self` extended from implicit player-only to
"any Character Card holder" per Rule 11), check EVERY sibling branch that
consumes that same parameter, not just the one branch the triggering bug
report named — a fix scoped to the reported repro rarely generalizes for
free.

**Orphan rule found**: Edge Cases text requires `EXP_THRESHOLD_INCREMENT <
0` be rejected at data-load time (same paragraph, same sentence as
`BASE_EXP_THRESHOLD ≤ 0`) — but AC-41 (missing-constant fail-loud) only
covers *missing* constants, and AC-42 (EC-8b) only covers the D.7 runtime
`ASSERT` backstop for `BASE_EXP_THRESHOLD`. Zero AC anywhere tests
`EXP_THRESHOLD_INCREMENT < 0`, and zero AC tests the *data-load-time*
validation claim at all (both existing AC only reach the missing-field
case or the runtime-guard case, never "config loader rejects an in-range-shaped
but invalid value before session start").

**Vague ADVISORY AC pattern**: AC-40 (Player Fantasy validation for the
Chờ Đột Phá "hồi hộp not bối rối" feeling) cites "cùng cơ chế ghi log/khảo
sát chủ quan đã định nghĩa ở `game-concept.md` Core Hypothesis" as its
instrument — checked `game-concept.md`'s actual Core Hypothesis section:
it defines exactly one subjective comparison ("ít lần 'cảm thấy được ưu ái
phi lý' hơn bản gốc không?", about AI favoritism perception vs a reference
build) with no generic reusable survey instrument. AC-40's claimed
anticipation-vs-confusion axis has no concrete question/log format defined
anywhere. Being ADVISORY keeps this non-blocking, but as written a QA
tester would have to invent their own instrument, defeating the point of
writing it as an AC. Same family as [[finding-combat-system-ac-review-round4]]'s
"AC-09b cites an allowed-keyword-list that's never authored" — citing a
cross-doc mechanism by name is not the same as that mechanism actually
existing at the claimed scope.

**A11 integration-test note still under-specified**: round-1 added a
prose paragraph before AC-01 requiring ≥1 integration test (closing the
"0 integration test despite 2 Hard deps" gap, motivated by a real prior
bug: `battle_result` vs `outcome` field-name mismatch). Real progress vs.
round 1 (requirement now exists), but the note isn't in GIVEN/WHEN/THEN
form like the other 38 AC, doesn't name a test file path convention (the
Logic AC do: `tests/unit/exp-realm-progression/`), and doesn't enumerate
which `locked_result` fields must be schema-checked. Recommend tightening
before this is genuinely actionable by a QA tester without re-deriving
scope themselves.

**Error Taxonomy convention check**: AC-32 claims to follow "Error
Taxonomy convention đã dùng ở `persistence-save-system.md`" — verification
*method* (equality against a named constant, not string-matching) is
consistent, but persistence-save-system.md has a dedicated Error Taxonomy
section/table (`error_code` | trigger | shown-to-player? | diegetic text)
that exp-realm-progression.md doesn't replicate — only 1 of its 3
fail-loud edge cases (AC-32) actually names a literal constant; AC-41/
AC-42 explicitly decline to ("test xác nhận hành vi fail-loud, không xác
nhận giá trị cụ thể nào"), which undercuts AC-32's own cited precedent.
Also noted (not a blocker, just an observation for a future project-wide
pass): there is no unified error-code naming standard across GDDs at all
— persistence uses category-first names (`WRITE_FAILED_*`, `CONFIG_ERROR_*`),
`ai-llm-integration-layer.md` uses a bare `BUSY` with no prefix, EXP uses
a system-name prefix (`EXP_ERROR_*`). Worth a `coding-standards.md`
addition eventually, not blocking any single GDD today.

Findings confirmed CLOSED from round 1: A9 (26-constant contract, now
AC-41), A10 (assert()-strip risk + `EXP_ERROR_OPPONENT_TIER_UNDEFINED`,
now AC-32) — both closed cleanly as originally scoped.
