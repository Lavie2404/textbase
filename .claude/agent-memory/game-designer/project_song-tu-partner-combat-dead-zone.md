---
name: song-tu-partner-combat-dead-zone
description: combat_win_vs_npc / combat_loss_vs_npc are unconditionally negative even for friendly sparring, and MVP's own required roster (exactly 1 Song-Tu-eligible NPC) makes this collide directly with the MVP's own defined playtest
metadata:
  type: project
---

`design/gdd/npc-affinity-relationship.md` D.1 makes `combat_win_vs_npc`
and `combat_loss_vs_npc` unconditionally negative for ANY tracked NPC,
including friendly sparring — the doc itself scope-cuts a `spar_friendly`
distinction to the still-provisional Situation/Encounter Generation
system, with no MVP-tier fallback.

This collides with `game-concept.md` MVP requirements: MVP's required NPC
roster is exactly 3 NPCs, and exactly 1 is preset at Hảo cảm ≥ +60 as the
dev-seed Song Tu partner specifically so Song Tu code paths get exercised
within the MVP's own 3-session/≥90-turn playtest. Combat is also a
required MVP system. It is highly likely a solo dev playtesting both
systems together will spar with that one liked NPC — and every such
interaction is mechanically framed as damaging the relationship (loss of
face / khinh thường), with zero way to flag it as bonding. This actively
works against the Fellowship aesthetic for the one NPC relationship the
MVP is built to showcase, and risks contaminating the MVP's own subjective
"still want to play session 4" acceptance signal (game-concept.md Tiêu chí
FAIL #2).

**Why**: found during `/design-review` of `npc-affinity-relationship.md`
(2026-08-08), adversarial game-designer pass.

**How to apply**: recommend either (a) a minimal MVP-tier `spar_friendly`
hard-mechanical flag (not dependent on Situation Gen) that zeroes/reduces
the delta, or (b) explicitly flag this as a known MVP limitation to watch
for during playtest and prioritize `spar_friendly` early in
Situation/Encounter Generation follow-up work.
