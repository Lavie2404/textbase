---
name: project-combat-exhaustion-turn-counter-tension
description: D.4b exhaustion mechanic in combat-system.md is diegetically framed but mechanically is still a raw exchange_id (turn counter) input, in tension with the game's own anti-pillar against phi-diegetic turn-counter overrides
metadata:
  type: project
---

`design/gdd/combat-system.md` D.4b ("Kiệt sức lũy tiến", added 2026-08-06)
decays `effective_HPRegen` to 0 as `exchange_id` climbs from
`EXHAUSTION_ONSET_EXCHANGE` (default 40) to `TECHNICAL_EXCHANGE_CAP`
(default 200), forcing every fight to converge to a real HP=0 result instead
of falling into the D.9c coin-flip tiebreak. The GDD justifies this as
"diegetic" (AI narrates "both are gradually exhausted") and distinct from
the banned pattern in `game-concept.md`'s Anti-Pillars ("no phi-diegetic
rule like a turn counter is allowed to override the formula's result").

**Why this is a real tension, not just flavor text**: the decay is driven
purely by `exchange_id` (a raw turn counter), identical for both fighters
regardless of anything that actually happened in the fight (HP lost, hits
landed, tier). It is not gated by any in-fiction trigger. Functionally it is
the same mechanism the anti-pillar targets, just applied one level of
indirection removed (it modifies an *input* — Regen — rather than directly
setting the win/lose outcome). The distinction between "still overridden by
a formula" and "phi-diegetic turn counter drives an outcome" is a technical
one that may not survive contact with how it actually feels to a player: an
evenly-matched, well-prepared fight that runs long "ages out" for reasons
disconnected from the fiction or either side's build.

Secondary finding: `EXHAUSTION_ONSET_EXCHANGE=40` sits *inside* the range
the GDD itself calls "trận điển hình" (typical fight length, cited as
"15-50 pha" in the Tuning Knobs table's own rationale text for this same
knob) — contradicting the stated intent that onset is "cố ý CAO HƠN
`CONTENT_EXCHANGE_ESTIMATE=30` để trận điển hình/ngắn KHÔNG bị ảnh hưởng."
Fights in the 40-50 phase band are typical, not just stalemates, yet they
would already experience regen decay.

Tertiary finding: exhaustion only touches Regen, not Lifesteal — so it
systematically punishes Regen/DEF-stacking ("turtle") builds while leaving
Lifesteal-sustain builds untouched, for a reason unrelated to either
character's preparation quality.

**How to apply**: Raise this whenever `combat-system.md` D.4b or its knobs
are revised, or when reviewing any future "convergence guarantee" mechanic
in this project. See [[feedback_adversarial-review-anchor]] — this finding
came from anchoring D.4b against Pillar 3 / Anti-Pillar text in
`game-concept.md`, not from the formula's internal math (which the prior
review round already validated via AC-46/47).
