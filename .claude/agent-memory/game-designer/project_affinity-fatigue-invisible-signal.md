---
name: affinity-fatigue-invisible-signal
description: D.3 repetition fatigue in npc-affinity-relationship.md has zero player-facing (diegetic or numeric) signal — AI narration prompt only carries band + direction, not magnitude, so fatigue is mechanically real but experientially undetectable
metadata:
  type: project
---

`design/gdd/npc-affinity-relationship.md` D.3 (repetition fatigue) reduces
the effective delta of repeated same-NPC/same-event-type positive actions
within a sliding turn window — explicitly designed to reward
diversification over spam. But per Contract Enforcement Core Rule #4, AI
narration only receives the attitude **band** + **direction** of change,
not magnitude. Nothing in the GDD's UI Requirements or narration contract
gives the player any signal — numeric or narrative — that a given action's
effect was discounted for repetition. A player cannot feel or observe the
mechanic; they can only reconstruct it after the fact by noticing slower
overall progression, which may take many turns. This contradicts Flow
Theory's feedback-clarity requirement (player must know WHY) and the GDD's
own Player Fantasy claim that NPC treatment changes "mà không cần con số
nào được nhắc đến" (implying legible-without-numbers feedback) — instead
the mechanic is invisible-without-numbers.

Same defect class as [[combat-exhaustion-turn-counter-tension]]: a
turn-counter-driven mechanical system with no diegetic surface for the
player to read.

**Why**: found during `/design-review` of `npc-affinity-relationship.md`
(2026-08-08), adversarial game-designer pass.

**How to apply**: when revising, consider having the AI narration prompt
also carry a coarse magnitude/enthusiasm cue (e.g. "hiệu ứng nhẹ" vs "hiệu
ứng mạnh") derived from the fatigue/diminish factor, without exposing raw
numbers — gives the player a diegetic tell that repetition is losing
value, consistent with Contract Enforcement's existing band+direction
pattern.
