---
name: setting-canon-mvp-event-authoring-tension
description: Narrative-design tension to resolve when authoring the MVP's 2-3 canon events + NPC mix for setting-canon-integration.md
metadata:
  type: project
---

`design/gdd/setting-canon-integration.md` Core Rule #4 says every canon event
is breakable, but WHICH `on_break` policy (`substitute`/`vanish`/`branch`)
each premise gets is an authoring-time content choice with no schema/AC
guardrail forcing diversity. If the MVP setting pack's 2-3 canon events
(Đấu La Đại Lục) end up with macro/world-shaping events (wars, political
premises) authored as `substitute`-only, breaking those premises always
"re-affirms" the same outcome (per the doc's own framing, line ~24-27) —
so the peak Player Fantasy beat ("phá vỡ định mệnh", a true permanent world
branch) becomes reachable ONLY through personal/romantic-scale premises
(the worked example throughout the doc is Tiểu Vũ). That mirrors exactly
the imbalance `game-concept.md`'s Pillar note (Bối Cảnh section, ~line
81-86) warned against: romance shouldn't be the only mechanically strong
lever for branching outcomes.

Separately, MVP's NPC roster is only 3 total (1 hostile/1 affinity/1
neutral, per `game-concept.md` MVP Definition). If most/all of them end up
`is_major_canon=true`, the player enters MVP already knowing ~the entire
cast — leaves near-zero content for the Discovery aesthetic (ranked
Priority 1 in game-concept.md's MDA table) to validate during the MVP
window, on top of the "kẻ biết trước" fantasy already dominating.

**Why**: Found during first `/design-review` pass of
`setting-canon-integration.md` (2026-08-08). The doc already carries an
open, unresolved Open Question — "Authoring 2–3 canon event MVP cho Đấu La
Đại Lục (event nào? premises/roles cụ thể?)" — owned by
`narrative-director` + `world-builder`, target: before vertical slice. This
tension should directly shape that authoring pass; it is not yet decided
either way.

**How to apply**: When authoring the MVP setting pack — (1) ensure at
least 1 of the 2-3 MVP canon events has a genuine `vanish`/`branch` core
premise that is NOT romantic/relationship-scale, so "the world truly
branches, doesn't reaffirm" is reachable outside the Tiểu Vũ-style example;
(2) consider making at least 1 of the 3 MVP NPCs non-`is_major_canon` (or
otherwise genuinely unknown to the player) to preserve some Discovery
texture at MVP scale, distinct from the "biết trước" fantasy tầng 1.

**Round 2 audit outcome (2026-08-09, `/design-review` vòng 2/2, targeted
audit — see `design/gdd/reviews/setting-canon-integration-review-log.md`):
resolved as feasible, no 4th NPC needed.** Both ND-1 (non-romantic vanish)
and ND-2 (non-major disguised NPC) can land on the SAME MVP "hostile" NPC
slot without mechanical conflict (Core Rule #5: premises resolve on true
`char_id`/world-state, not display identity, so disguise state never
affects premise judgment). Concrete proposal made: **Event 1** "Tiểu Vũ
Hiến Tế" (romantic, `vanish`, Song Tu NPC, `is_major_canon=true`) —
demonstrates Player Fantasy peak form (A) active/willed break + refuse
rescue. **Event 2** "Chiến Tranh Trả Thù" (political/military, `vanish`,
downstream cascade of Event 1, core role = the hostile NPC,
`is_major_canon=false` + disguised) — player kills this NPC in an
ordinary, non-canon-intent combat, only learns afterward the death broke
a war premise — demonstrates peak form (B) passive tragedy AND closes
ND-1+ND-2 simultaneously. Authoring note: have the hostile NPC's true
identity reveal land in the SAME narration beat as `canon_break_flag`
locking (not two separate moments) — reduces authoring load on the
single NPC carrying both jobs and produces a cleaner dramatic beat.
Optional Event 3 (`substitute` policy, neutral NPC, macro-reaffirmation
demo) flagged as scope-optional, not required to close ND-1/ND-2.

Also resolved in round 2: the "no pre-commitment signal before a
premise is first broken" gap I raised in round 1 was NOT missed — it's
closed separately in Open Questions as ND-3 (Closed), same Phương án B
philosophy extended. This is correct as designed, not a gap: the
player's own real-world genre knowledge of the source material IS the
pre-commitment signal for `is_major_canon` NPCs (matches Player Fantasy
tầng 1 "kẻ biết trước"); for non-major NPCs, the absence of signal is
required for peak form (B) to exist as genuine passive tragedy rather
than a disguised, telegraphed form (A). Confirmed `entities_in_scope`
(`situation-encounter-generation.md` D.6) already feeds `canon_role_npcs`
into every scene's AI context (incl. ordinary combat) as a PRESENCE
weight, not a TONE weight — also correct as designed: foreshadowing
combat narration would telegraph outcomes and destroy form (B)'s
"vô tình" nature. One narrow open technical question flagged to
`systems-designer`/`lead-programmer` (not mine to resolve): Core Rule
D.6 pipeline order means Canon resolves AFTER Combat/Death & Consequence
in the same turn, so the "định mệnh gãy" narration beat (UI Requirement
#2) must come from a separate end-of-turn narration_call, not the
combat exchange's own call — needs confirming that call receives enough
combat context to read as one continuous beat, not two disjointed
paragraphs.
