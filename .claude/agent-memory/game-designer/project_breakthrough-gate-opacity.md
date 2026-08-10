---
name: breakthrough-gate-opacity
description: Chờ Đột Phá (breakthrough wait) in exp-realm-progression.md is designed as an opaque boolean gate — cross-referenced with setting-canon-integration.md and character-card-identity.md, the player is never shown what the requirement is or any progress toward it.
metadata:
  type: project
---

**Status update (2026-08-08, `/design-review` round 2)**: round 1 (cụm A5)
added an Edge Cases interface hook — Setting & Canon Integration + Character
Card & Identity "NÊN" (should, not must) surface a qualitative narrative hint
while waiting, without revealing the exact requirement. This is filed as an
**Open Question targeting Vertical Slice, NOT Required for MVP** — so at MVP
scope the state is mechanically unchanged from the description below (0 info,
0 lever, EXP still destroyed each turn per Rule 5/AC-10). The hook itself also
has no content contract yet (cadence, trigger point, fallback when canon data
is missing for that tier). Round 1's "MIF-2 closed" framing is accurate for
the *document* (an interface + owner now exist) but not for the *MVP player
experience*. See also [[project_combat-exhaustion-turn-counter-tension]] and
the new reachability finding: even reaching the first breakthrough (level 10)
requires ~60 combat wins at parity tier (self-cancelling linear pacing, D.1),
which likely exceeds any realistic MVP playtest window — meaning AC-40 (the
playtest gate meant to validate this fix) may never get exercised at MVP at
all because players don't reach Chờ Đột Phá in the first place.

`exp-realm-progression.md` Rule 5/6/7 gates every 10th level ("Chờ Đột Phá")
behind `breakthrough_requirement_met(tier)`, a boolean the EXP system
deliberately does not own the content of (by design — content lives in
Setting & Canon per-setting-pack data). Cross-checked two other Designed
docs:

- `setting-canon-integration.md` line ~61: "Người chơi không thấy bộ máy
  phán quyết" (the player does not see the judgment machinery) — explicitly
  states the requirement-check mechanism is invisible to the player by
  design.
- `character-card-identity.md` line ~319/343-345: the ONLY player-facing
  signal is the literal string `"chờ đột phá"` replacing the normal EXP
  countdown — no content hint, no progress indicator, no partial credit.

**Why:** The GDD's own Player Fantasy section explicitly claims the
intended feeling is "hồi hộp-thỏa mãn" (anticipation-satisfaction) — "đủ
điều kiện đột phá chưa?" — not "đủ EXP chưa?". But with zero UI surface for
*what* the condition is or how close the player is to it, the actual felt
experience risks being "stuck, doesn't know why, doesn't know what to do"
(helplessness) rather than anticipation — a Self-Determination Theory
Autonomy/Competence violation (player can't act toward a goal they can't
see). Meanwhile EXP earned while capped is destroyed every turn (Rule 5,
AC-10), so there is no compensating agency during the wait either.

**How to apply:** When re-reviewing `exp-realm-progression.md`,
`character-card-identity.md`, or `setting-canon-integration.md`, check
whether a player-facing "progress toward breakthrough" indicator or a
narrative hint contract (AI narrator required to surface partial clues once
some threshold of world-state is met) has since been added. If not, this
remains an open Player Fantasy risk — the fix likely belongs in
`setting-canon-integration.md`'s narrative-hint contract or a UI addition
in `character-card-identity.md`, not in the EXP GDD itself (which correctly
doesn't want to own setting-specific content). See also
[[project_passive-exp-flat-flow]].
