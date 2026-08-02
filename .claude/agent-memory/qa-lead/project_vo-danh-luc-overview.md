---
name: project-vo-danh-luc-overview
description: Core facts about the "Vô Danh Lục" project — solo/personal xianxia interactive-fiction RPG on Godot 4.6, useful context for any QA planning work here.
metadata:
  type: project
---

"Vô Danh Lục" (`design/gdd/game-concept.md`) is a solo, non-commercial personal
project: interactive fiction + xianxia RPG, Godot 4.6/GDScript, HTML5 export
(web + mobile web). The only "player" is the developer themself — no
commercial release, no multiplayer, no market risk section is meaningful.

Core loop: AI/LLM generates a dynamic situation -> player picks an action ->
optional combat resolved by a transparent Lực chiến (combat power) formula ->
AI narrates the mechanical outcome in prose -> outcome is persisted to a
global world-memory that shapes future AI-generated content. Key systems:
Lực chiến (combat power + realm suppression), EXP/cảnh giới (leveling),
Hảo cảm (NPC affinity, -100..100, has social propagation and unlocks Song Tu).

As of 2026-08-01 the project is at concept stage: `game-concept.md` exists,
engine is chosen, MVP Definition section exists but has not yet been broken
down into system GDDs (`/design-system`) or a vertical slice.

**Why:** Any QA planning/test-evidence work in this repo should assume a
single-developer context (no separate QA team, no CI pressure from other
devs) but the project's own `.claude/docs/coding-standards.md` and
`design-docs.md` rules still apply in full (8-section GDDs, deterministic
automated tests, story-type test evidence gates).

**How to apply:** When asked for QA plans, bug triage, or gate checks on this
project, calibrate for solo-dev pace and non-commercial stakes, but do not
relax the testing-standard rules — they're explicit project policy, not just
best practice. See [[finding-ai-narrative-test-evidence-gap]] for a
project-specific gap in the test-evidence framework that will need to be
resolved before system GDDs for Combat/EXP/Hảo cảm/AI-narration are written.
