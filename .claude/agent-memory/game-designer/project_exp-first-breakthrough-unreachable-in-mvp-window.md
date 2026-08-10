---
name: exp-first-breakthrough-unreachable-in-mvp-window
description: exp-realm-progression.md's own self-cancelling linear math (D.1) means the first breakthrough (level 10) needs ~60 combat wins at parity tier — likely exceeding the MVP's own defined Core Hypothesis validation floor (>=90 turns/3 sessions), so the GDD's core Player Fantasy may go entirely unfelt during MVP playtesting.
metadata:
  type: project
---

Found 2026-08-08 during `/design-review` round 2 of `exp-realm-progression.md`
(sharpens/quantifies round 1's unresolved DIS-1 disagreement).

**The math**: D.1 documents (cụm A3) that every EXP source has the form
`RATE * exp_threshold(level)`, so `exp_threshold` self-cancels algebraically —
turns/wins needed per level via a single source = `1/RATE`, constant
regardless of level or the specific `BASE_EXP_THRESHOLD` knob value. At parity
tier (`tier_diff=0`), `WIN_EXP_BASE_FRACTION=0.15` means **~6.67 combat wins
per level**. Reaching the first breakthrough gate (level 10, `level mod 10
== 0`) from level 1 needs 9 level-ups, i.e. **~60 separate combat wins**.
Combat wins only resolve once per battle (Rule 2 — no partial credit for
exchange count), and `combat-system.md`'s own stated typical battle length is
**15-50 exchanges** ("trận điển hình 15-50 pha", confirmed line ~726). Post-A1
fix, passive/Song Tu EXP is now zero for every turn inside a battle
(`turn.in_combat=true`), so combat wins are the only realistic driver of early
pacing.

60 wins x ~30 turns/battle (typical) is on the order of 1500-1800 turns of
play just to reach the FIRST breakthrough — and even a single ordinary
level-up (~7 wins, ~150-300 turns) may not complete within `game-concept.md`'s
own Core Hypothesis validation floor of >=90 turns across 3 sessions.

**Why:** This isn't just "the curve feels slow" — it means a solo MVP
playtester following the GDD's own defined validation window could finish the
ENTIRE MVP smoke-test without observing a single level-up, let alone a
breakthrough. That breaks SDT Competence (no visible skill-growth feedback)
and directly undermines this GDD's own Player Fantasy claim ("mỗi trận thắng
... cộng dồn vào EXP" as a *felt* cumulative sense of progress). It also means
[[project_breakthrough-gate-opacity]]'s AC-40 (the ADVISORY playtest gate
meant to confirm the A5 narrative-hook fix delivers "hồi hộp" not "bối rối")
may never get exercised at MVP — you cannot observe a player's reaction to
Chờ Đột Phá if they never statistically reach level 10. Round 1's DIS-1
flagged a version of this qualitatively (game-designer vs economy-designer
disagreement on curve speed) but `creative-director` explicitly left it
unresolved — this memory has the concrete numbers.

**How to apply:** When re-reviewing `exp-realm-progression.md` or MVP scope
docs, check whether (a) the Player Fantasy / AC-40 claim has been explicitly
scoped as "not validated at MVP" (matching the existing precedent for Hảo cảm
natural growth in `game-concept.md`'s MVP Definition section), or (b) the
early-game win-fraction/tier-bonus knobs have been front-loaded so the FIRST
breakthrough specifically is reachable within a realistic playtest budget,
without abandoning D.1's chosen pure-linear-for-transparency design. See also
[[project_passive-exp-flat-flow]] (same self-cancelling math, opposite
direction of concern — long-run flatness vs. short-run unreachability).
