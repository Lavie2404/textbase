---
name: vo-danh-luc-context
description: Core visual-design context for Vô Danh Lục — text/UI-heavy xianxia AI-narrative RPG, solo non-commercial project, Godot 4.6 web export
metadata:
  type: project
---

Project "Vô Danh Lục" is a solo, non-commercial interactive-fiction xianxia RPG
(Godot 4.6, HTML5 export, Web + Mobile Web). Source of truth is
`design/gdd/game-concept.md`. Art pipeline complexity is explicitly rated
LOW in that doc — no 3D/animation budget, primarily UI and typography.

**Why:** Single developer, personal project, AI narrates prose (LLM backend)
while a hard mechanical state layer (Combat Power/Lực chiến, EXP, Affinity/Hảo
cảm, alive/dead) is locked and never overwritten by the AI. Pillar 4 (Vivid
Narration) explicitly rejects "raw stat table" as a losing design option —
this creates a standing visual tension between narrative prose and the
Character Card's raw stat block that any art direction must resolve.

**How to apply:** When defining the art bible or reviewing UI mockups, always
check whether a screen honors the prose-first framing of Pillar 4 (numbers
support the story, not the reverse) and whether color/shape choices help
signal Pillar 2 (Real Consequences are permanent — no undo) and Pillar 1
(Objective World — NPCs are not visually flattering the player character).

Key UI surface already named mid-session: "Thẻ Nhân Vật" (Character Card) —
Hồ sơ (profile), Chỉ số chiến đấu (combat stats: HP/ATK/DEF/SPD/ACC/Lifesteal/
Regen/Crit/etc.), Hảo cảm bar, Song Tu button. This is the first concrete UI
surface needing visual grammar — expect it to be the anchor test case when
`/art-bible` is run.

As of 2026-08-01: no `/art-bible` exists yet. AD-CONCEPT-VISUAL gate proposed
3 named visual directions (Mực Chưa Khô / ink-wash serving Pillar 4, Sổ Sách
Khách Quan / objective ledger serving Pillar 1+3, Sương Che Nửa Mặt / veiled
mist serving Pillar 5) with "Mực Chưa Khô" recommended as primary. Final
choice was pending user decision at time of this memory — verify current
state of `design/gdd/game-concept.md` Visual Identity Anchor section (or
`/art-bible` output) before assuming this is still the live direction.

Update 2026-08-03: confirmed live — `game-concept.md` Visual Identity Anchor
now locks "Mực Chưa Khô" as the anchor (numbers always inside an ink-stamp
frame, never bare; strictly rationed color system — đỏ son/vermillion for
ALL permanent/serious consequences [trọng thương/chết/hậu quả], xanh ngọc/
jade ONLY for realm breakthrough, never elsewhere). `/art-bible` still not
formally run — this anchor paragraph is the only authored source; individual
GDDs (`combat-system.md`, `death-and-consequence.md`) are already spending
this color budget per-system ahead of the full bible, so check each GDD's
own Visual/Audio Requirements section for precedent before proposing new
đỏ son/xanh ngọc usage, to avoid contradicting an already-locked spend.
See [[reference_color-rationing-precedents]] for the specific precedent log.

Related: game-concept doc also references `src/reference.md`, a prior React/
Firebase AI-narrative project by the same user, used as a UI/stat structure
touchstone (not a visual style touchstone — no visual style was defined for it
in the doc).
