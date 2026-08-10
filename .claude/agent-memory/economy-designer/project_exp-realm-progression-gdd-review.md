---
name: project-exp-realm-progression-gdd-review
description: Adversarial economy review (2026-08-08) of the finalized exp-realm-progression.md formulas — confirmed cross-system exploit (passive/Song-Tu EXP stacks per combat exchange turn) and a deliberate-loss dominant strategy at extreme tier_diff, both with worked numeric examples.
metadata:
  type: project
---

`design/gdd/exp-realm-progression.md` is now Designed (formulas D.1-D.6 + 38
ACs). This supersedes the draft-stage numbers in
[[project-vo-danh-luc-progression-risks]] (2026-08-01, pre-GDD) — those risks
(Bế quan dominance, uncapped áp chế, NPC out-leveling) were addressed by the
final design (single passive rate, tier_multiplier floor/ceil, etc.), but the
2026-08-08 adversarial pass found NEW, more concrete issues baked into the
finalized formulas:

1. **Passive/Song-Tu EXP stacks on every in-combat exchange turn, not just
   battle resolution.** `exp-realm-progression.md` D.6 defines
   `raw_passive`/`raw_song_tu` as unconditional on "mọi lượt xác nhận" with
   no exception for turns inside an ongoing battle. `combat-system.md` Core
   Rule #1 confirms each combat exchange (`pha giao đấu`) IS one Turn
   Manager turn ("Mỗi lượt Turn Manager trong lúc in_combat=true = đúng 1
   pha giao đấu"). Combat's own `CONTENT_EXCHANGE_ESTIMATE=30` (typical
   battle length, `combat-system.md` line ~1715) means a single average
   battle generates `30 * (PASSIVE_EXP_RATE + SONG_TU_EXP_RATE)` =
   `30*3% = 90%` of `exp_threshold` from passive/Song-Tu ticks ALONE,
   *before* the win/loss payout (D.2 baseline is only 15-45% of threshold)
   is even applied. At the technical cap (`TECHNICAL_EXCHANGE_CAP=200`)
   this reaches 600%. This inverts the intended EXP hierarchy: a fight's
   EXP value is dominated by its *duration* (exploitable via
   stalling/turtling), not its difficulty or outcome. Neither GDD
   cross-references the other's exchange-count/passive-rate knobs despite
   Progression listing Combat as a Hard dependency.

2. **Deliberate-loss dominant strategy for weak opponents.** D.3's
   `combat_loss_exp` is a flat `LOSS_EXP_RATE=4%` regardless of opponent.
   D.2's `combat_win_exp` floor is `WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT
   = 0.15*0.05 = 0.75%`. Breakeven is at `tier_diff ≈ -2.93`: for any
   opponent 3+ tiers below self, **winning yields less EXP than losing**
   (win at `tier_diff=-3`: `0.15*0.25=3.75%` < loss `4%`). Combined with
   finding #1, the compounded exploit is: pick a weak opponent, stall the
   fight across many exchanges to farm passive/Song-Tu ticks, then let it
   resolve as a loss for the flat 4% on top.

3. **`BASE_EXP_THRESHOLD`/`EXP_THRESHOLD_INCREMENT` are pacing-inert.**
   Every EXP source is `RATE * exp_threshold(level)`, so turns-to-level via
   any single source = `1/RATE`, independent of `level` AND independent of
   `BASE_EXP_THRESHOLD`/`EXP_THRESHOLD_INCREMENT` (they cancel out
   algebraically). The Tuning Knobs table's claim that increasing
   `EXP_THRESHOLD_INCREMENT` makes "cấp sau khó hơn cấp trước rõ rệt hơn —
   chậm dần đều mạnh" is mathematically false given the current formula
   family (100% relative-rate sources, no flat/absolute EXP source exists
   anywhere in the doc).

4. **No documented invariant ties `LOSS_EXP_RATE` to
   `WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT`.** Even at the extremes of
   the stated Safe Ranges, max(`BASE_FRACTION*FLOOR_MULT`) = `0.30*0.15 =
   4.5%` vs max(`LOSS_EXP_RATE`) = `6%` — the ranges as published cannot
   jointly guarantee "win always ≥ loss," and the DEFAULT values already
   violate it (0.75% vs 4%).

**How to apply**: if/when this GDD gets a design-review round or an
implementation pass, these 4 are Blocking-severity (cross-system exploit,
numerically confirmed, not speculative). Recommended-severity companions:
the Chờ Đột Phá EXP-waste mechanic removes all EXP benefit from combat
during an externally-gated, potentially unbounded wait window while combat
risk remains — pushes toward "do nothing while waiting," worth an explicit
design call; and 9 of 12 Character Card stats still have no hand-tuned
`LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X` (tracked as this GDD's own Open
Question) — paired stats (ACC/Dodge, Amp/Mitigation) need *correlated*
tuning, not independently-guessed values, since combat-system.md's opposed
rolls are sensitive to the relative gap.
