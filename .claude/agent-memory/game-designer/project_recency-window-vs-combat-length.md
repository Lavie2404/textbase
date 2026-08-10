---
name: project-recency-window-vs-combat-length
description: World Memory's recency_window_turns default (8) is ~4x shorter than a typical combat encounter's exchange count (30) per combat-system.md — combat routinely evicts its own early turns before the fight ends
metadata:
  type: project
---

`world-memory-context-management.md` sets `recency_window_turns` default = 8
(Core Rule #3, raised from 5 in round-1 revision 2026-08-06). `combat-system.md`
independently sets `CONTENT_EXCHANGE_ESTIMATE = 30` (typical exchanges per
battle) and `TECHNICAL_EXCHANGE_CAP = 200` (hard cap), with each exchange =
exactly 1 Turn Manager turn (Core Rule #1 of combat-system.md).

**Why this matters**: This means a *typical* (not extreme) combat encounter
is already ~4x longer than the AI Context View's verbatim window. The first
~22 exchanges of a 30-exchange fight will have their `narration_text` evicted
and replaced with structured facts (hp_delta, exhaustion, exchange outcome)
*before the fight itself concludes*. This is not a rare edge case requiring
playtest to discover — it's derivable right now from two already-Designed
GDDs' own numbers. World Memory's own Open Questions section treats the
scene-boundary-unawareness risk as something to measure later via playtest;
this memory exists to counter that framing with concrete evidence next time.

Combat's structured fields (hp/exhaustion/exchange_id/style_descriptor tag)
likely carry enough signal for the AI to continue narrating coherently
without verbatim early-fight text, but this has NOT been verified anywhere —
it's an assumption. The specific risk is repeated/contradictory descriptions
of moves, or forgotten narrative details (taunts, environment) that never
had a locked_result field, once a long fight passes turn ~8 of its own span.

**How to apply**: When reviewing NPC Affinity, Situation/Encounter Generation,
AI/LLM Integration Layer, or any future re-review of World Memory, check
whether this mismatch has been addressed (either by a combat-specific/
scene-relative recency window, or by an explicit acceptance that combat
narration relies on structured fields only past turn 8). If still unresolved,
keep flagging — recommend escalating from Open Question to Recommended
Revision given the numeric evidence now exists. See [[project_world-memory-qualitative-gap]].
