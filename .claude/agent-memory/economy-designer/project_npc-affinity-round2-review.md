---
name: project-npc-affinity-round2-review
description: Round 2 (final) targeted economy audit of npc-affinity-relationship.md — Song Tu multi-NPC round-robin checked and cleared, pacing drift confirmed as backlog
metadata:
  type: project
---

2026-08-08, round 2/2 (final, round-cap mechanically-heavy) targeted audit of
`design/gdd/npc-affinity-relationship.md`, following my own round-1 findings
(Song Tu dominant strategy + propagation-through-hated-NPC exploit, both
"closed" with `SONG_TU_COOLDOWN_TURNS=5` and the `A_before(victim) > -100`
saturation gate).

**Checked and cleared — multi-NPC Song Tu round-robin is NOT a new exploit.**
Reusable analytical technique: when a per-instance cooldown (e.g. per-NPC,
5 turns) is checked against a global one-action-per-turn budget, round-robining
across N≥cooldown instances does NOT accelerate any single instance's rate —
it only fills turns that would otherwise be idle for that instance. The
per-instance rate stays mathematically identical to the solo-cooldown case
(here: 1.1 affinity/turn/NPC, matching 5.5 avg / 5-turn cooldown exactly).
Aggregate system throughput is capped by the SAME global action budget (5.5
pts/turn total, regardless of NPC count) — more NPCs dilute per-NPC rate,
never multiply it. **Lesson**: before flagging a "farm via parallelism"
exploit, check whether the truly scarce resource (here: turns/actions) is
shared globally across the parallelized instances — if so, parallelism
redistributes, it doesn't duplicate.

**Confirmed non-blocking finding (backlog, not fixed this round)**: pacing
claim "0→+60 cần 8-12 hành động đa dạng ≈ 2.5-3 phiên" (GDD line ~323-328)
is stale — only 3 positive event types exist (gift/small_help/save_life),
sustained play necessarily repeats gift/small_help, and raising
`FATIGUE_WINDOW_TURNS` 3→5 in round 1 (to make D.3 fire for standard menu
cadence, gap=4) means this repetition now genuinely incurs fatigue decay it
didn't before. Rough resimulation: ~25-30 actions needed, not 8-12 (~2-3x
drift, matching review log's "lệch ~2x" flag). Not blocking because no
Acceptance Criteria hard-codes this number — it's prose-only. Left as
backlog: rewrite the pacing prose with honest fatigue-inclusive math.

See [exp-realm-progression-gdd-review](project_exp-realm-progression-gdd-review.md)
for the sibling system's round-1 findings (same reviewer, same era).
