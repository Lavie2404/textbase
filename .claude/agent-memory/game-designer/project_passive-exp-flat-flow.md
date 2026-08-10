---
name: passive-exp-flat-flow
description: Passive EXP is a fixed 1% of the CURRENT level's threshold every confirmed turn, forever — turns-per-level via passive alone never changes across the entire (unbounded) game lifetime, contradicting Flow-theory escalating-challenge expectations.
metadata:
  type: project
---

`exp-realm-progression.md` D.6: `raw_passive = PASSIVE_EXP_RATE *
exp_threshold(level)`, PASSIVE_EXP_RATE=0.01 flat. Because
`exp_threshold` is linear (D.1, deliberately chosen over
exponential/stepped) and passive is always exactly 1% of it, turns-to-level
via passive alone is a constant ~100 turns at level 1 AND at level 500 —
the relative pace of "free" progression never changes for the life of the
game. The GDD's own D.1 rationale explicitly splits "difficulty" into two
layers — a flat/predictable EXP curve, and breakthrough gates carrying all
the escalating-challenge weight ("tách 2 nguồn khó này ra"). But per
[[project_breakthrough-gate-opacity]], breakthrough gates are invisible to
the player — so in practice neither layer produces a felt increase in
challenge/investment over a long-lived, no-fixed-ending game (per
game-concept.md: "không có kết thúc cố định... giống một cuốn nhật ký
sống").

**Why:** Csikszentmihalyi's Flow model wants challenge to scale with
skill/investment to stay in the flow channel. A perpetually flat percentage
income (independent of player choice — passive triggers on ANY confirmed
turn, combat or not) risks the opposite: boredom via a progression system
that never gets harder to feel, no matter how long the game runs. Tuning
Knobs already self-flags a narrower version of this risk ("có nguy cơ làm
Combat EXP trở nên thừa") but doesn't address the long-run flatness across
tiers.

**How to apply:** Not blocking for MVP (short playtest window won't
surface this), but worth flagging before Alpha/Full Vision when sessions
run long enough for passive-only leveling to become the dominant,
repetitive path. Possible mitigations if revisited: PASSIVE_EXP_RATE that
decays per tier, or making breakthrough conditions visibly escalate in
narrative weight so at least ONE of the two difficulty layers is felt.

**Correction (2026-08-08, `/design-review` round 2)**: the "short playtest
window won't surface this" assumption above undersold the risk in the
*opposite* direction — see [[project_exp-first-breakthrough-unreachable-in-mvp-window]].
The short MVP window doesn't just fail to surface long-run flatness; it may
fail to surface ANY progression feedback at all (possibly zero level-ups
within the GDD's own defined validation floor), which is a more urgent
near-term problem than the long-run flatness this memory originally flagged.
