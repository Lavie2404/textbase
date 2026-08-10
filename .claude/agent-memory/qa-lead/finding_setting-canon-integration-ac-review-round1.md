---
name: setting-canon-integration-ac-review-round1
description: setting-canon-integration.md AC review round 1 — D.4 cascade_vanish_check has zero depth-limit code contradicting AC-22's CASCADE_MAX_DEPTH claim; no fan-out/fan-in AC coverage; AC-41 asserts a mechanism this GDD doesn't own; inconsistent provisional-interface tagging across 5 interfaces/4 upstream GDDs
metadata:
  type: project
---

Round 1 (first-ever) `/design-review`-style AC audit of
`design/gdd/setting-canon-integration.md` (48 AC, no prior review log
exists for this system). Findings, most important first:

1. **D.4 `cascade_vanish_check` pseudocode has NO depth parameter or
   CASCADE_MAX_DEPTH check anywhere in the code block** (lines ~347-360),
   yet AC-22 requires "chuỗi sâu 25 > CASCADE_MAX_DEPTH=20 → cắt tại 20".
   The only loop-guard shown is `visited` (cycle prevention for the
   load-time-validated-acyclic DAG) — for a straight chain of 25 distinct
   nodes `visited` never re-triggers, so the function as literally written
   recurses all 25 levels with no cutoff. This is a genuine spec-vs-AC
   contradiction, not just a missing detail — worse than the D.9b/D.9c
   `self`/`other` bug in [[finding_combat-system-ac-review-round3]]
   because there it was an undefined *symbol*; here it's a completely
   *missing mechanism* the AC depends on. Fix needs an explicit `depth`
   param threaded through the recursion + a `IF depth ≥
   CASCADE_MAX_DEPTH: RETURN affected` guard.

2. Same function also has a bare `resolution` variable used
   (`affected.append((D.id, resolution))`, `IF resolution == Vanished`)
   whose assignment logic exists ONLY in a `//` comment, never as
   executable pseudocode — the recurring "prose-asserted not
   formula-derived" class flagged in combat-system and
   ai-llm-integration-layer reviews.

3. **No AC tests fan-out** (1 vanished event with 2+ independent
   downstream dependents processed in the same `FOR downstream_index[E.id]`
   iteration) — D.4's own narrative example, AC-22, and AC-30 are all
   strictly linear chains (E1→E2→E3). Also flagged a lower-confidence
   fan-in/diamond risk: `visited` dedups by node-as-cascade-source: if D
   has two separate `event_completed` premises pointing at two different
   upstream events reached via two different cascade branches, the second
   branch's dive into D could be silently skipped by the `visited` guard,
   leaving D's second premise unevaluated. Not provably broken from
   pseudocode alone (MVP fixture is only 2-3 events) but worth a targeted
   AC before Full Vision content scales up (Tuning Knobs section itself
   anticipates deeper graphs at Full Vision).

4. **AC-41** ("tự phá tự cứu cùng lượt — bất khả theo cấu trúc") asserts
   "input contract từ chối/bỏ qua tổ hợp mâu thuẫn" but Setting & Canon
   Integration owns no validation/rejection code for this anywhere in
   Core Rules/D.6 — the actual invariant (1 turn = 1 `classified_event`)
   is a Turn Manager data-model fact, not a mechanism this GDD
   implements or a Turn Manager AC cross-referenced here. Same
   "outcome-without-mechanism" class as `ai-llm-integration-layer.md`'s
   "phải đợi" finding (see
   [[finding_ai-llm-integration-layer-ac-review-round1]]) — describes a
   HAPPY RESULT without saying WHERE/HOW it's enforced or who owns the
   check.

5. **provisional-interface tagging is inconsistent**: AC-06 tagged
   `provisional-interface` but its sibling AC-07 (same `canon_role_rescue`
   dependency, failure-path test) is not; AC-38 (predicate-source
   validation) also untagged despite depending on provisional predicate
   sources. 5 distinct provisional interfaces span 4 upstream GDDs
   (Situation Gen ×2 — `classified_event`/`location`; Death & Consequence
   — `death_flag_*`; Combat — `battle_result_*`; Equipment —
   `destroyed`), touching ≥8 ACs. Open Questions section tracks these by
   owner+target system but has **no AC-ID cross-reference** — when an
   upstream GDD finalizes its schema there's no pointer from the Open
   Question entry back to which AC numbers in this file need
   re-verification. Larger-scale version of the "1-2 field provisional"
   pattern seen in other reviewed GDDs — this system needed (but didn't
   get) a dedicated tracking table.

6. AC-38's "danh sách đầy đủ mọi lỗi" (full error list on authoring
   validation failure) has no specified list format/schema (string list
   vs structured `{error_type, entity_id, message}`) — a tester can't
   write a deterministic count/content assertion without one.

7. **Clean pass**: scanned all 48 AC for vague/hand-wave language
   ("hoạt động đúng"/"hợp lý"/"cân bằng") — none found, including in the
   long AC-30 regression AC. This system's AC set is otherwise unusually
   precise (concrete field names, exact turn numbers, exact thresholds).

**Why it matters**: this is a first-ever review (no backlog exists yet
for this GDD) of a system explicitly built as "the one canon arbiter" —
dense with DAG/recursion/state-machine logic comparable to Combat's
mechanically-heavy profile, but not yet on the confirmed
mechanically-heavy list in `.claude/docs/coordination-rules.md`. Given
finding #1 is a genuine algorithm/AC contradiction (not just notation),
recommend flagging this system as a round-cap candidate too.

**How to apply**: when re-reviewing this GDD (round 2), prioritize
verifying the D.4 depth-limit fix and the fan-out/diamond test addition
before spending time on any remaining nhóm-B notation nits — those are
backlog-only per the round-cap policy.
