---
name: exp-song-tu-mvp-unreachable
description: RESOLVED 2026-08-08 (design-review round 1, cụm A6) — game-concept.md now adds a dev-seed Tâm Pháp (type=song-tu, exp_multiplier=1.0) to Required for MVP #4, mirroring the existing NPC affinity dev-seed pattern. Kept for historical context.
metadata:
  type: project
---

**Status: RESOLVED.** Verified 2026-08-08 during `/design-review` round 2 of
`exp-realm-progression.md` — `game-concept.md` Required for MVP #4 now reads:
"Song Tu hoạt động đầy đủ" ở MVP BAO GỒM 1 Tâm Pháp dev-seed tối giản
(`type=song-tu`, `exp_multiplier=1.0`) gán sẵn cho nhân vật chính, mirroring
the precedent already used for NPC #2's dev-seeded affinity (MVP #3). This
closes the gap described below. Original finding preserved for context.

---

`game-concept.md` Scope Tiers table: MVP row lists "Chiến đấu + EXP + Hảo
cảm + Song Tu đầy đủ"; the very next row (Vertical Slice) lists "+ Tâm pháp
cơ bản" as new-for-VS content, i.e. NOT in MVP.

`exp-realm-progression.md` Rule 2 / D.4 gates the Song Tu EXP bonus
(`SONG_TU_ACTIVE`) on TWO AND-ed conditions: (a) Tâm Pháp type=song-tu, (b)
active Song Tu relationship. `npc-affinity-relationship.md` line ~179
confirms the split explicitly: "Đã có quan hệ Song Tu (nguồn EXP #4 NẾU
Tâm Pháp phù hợp)" — the relationship state machine (button, Active state)
is independent of and does not require Tâm Pháp, but the EXP bonus
specifically does.

**Why:** If MVP genuinely ships with no Tâm Pháp system at all (per Scope
Tiers), no MVP character can ever have `type=song-tu`, so `SONG_TU_ACTIVE`
can never be 1 in real (non-mocked) MVP play — the Song Tu relationship
button/state machine will work, but its EXP payoff (an entire formula
section, D.4, with dedicated ACs) is dead code from the player's
perspective during MVP. This directly contradicts MVP acceptance criterion
#4's literal wording ("Song Tu hoạt động đầy đủ" = Song Tu fully
functional). Unresolved ambiguity: does MVP intend to ship ONE default/seed
Tâm Pháp instance (satisfying `exp-realm-progression.md` Rule 3's "minimal
ownership" framing) so this is reachable, or is the EXP bonus genuinely
deferred along with the rest of Tâm Pháp?

**How to apply:** Before implementation, confirm with the user/producer
whether MVP ships a single hardcoded/seed Tâm Pháp (mirroring the existing
precedent of dev-seeding NPC #2's affinity ≥+60 for Song Tu testing,
`game-concept.md` MVP #3) so `SONG_TU_ACTIVE` is reachable in real MVP
play — or update `game-concept.md`'s MVP acceptance language to scope
"Song Tu đầy đủ" as relationship-mechanic-only, EXP bonus deferred. See
also [[project_breakthrough-gate-opacity]].
