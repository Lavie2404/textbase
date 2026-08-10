---
name: hon-hoan-rollback-orphan
description: Undo of a breakthrough turn that consumed an external resource (e.g. Hồn Hoàn) has no owning system for reverting that resource — confirmed orphaned across exp-realm-progression, setting-canon-integration, and equipment-skill-data-system, all already Designed.
metadata:
  type: project
---

`exp-realm-progression.md` AC-34 explicitly punts: rolling back a
breakthrough turn restores `level/tier/EXP/Chờ-Đột-Phá-state` but
"KHÔNG nằm trong phạm vi assertion của hệ EXP" whether a consumed external
resource (e.g. Hồn Hoàn) is also restored — flagged as an Open Question
for "hệ khác" to own.

Checked the two candidate owners, both already Designed:
- `setting-canon-integration.md` treats `breakthrough_requirement_met(tier)`
  as a pure stateless predicate over world-state/setting-pack data (AC-12:
  "predicate data thuần") — it does not claim ownership of consuming or
  reverting an inventory-like resource.
- `equipment-skill-data-system.md` never mentions Hồn Hoàn or breakthrough
  resource consumption at all; its own item-consumption model ("single-use
  hay có charge") is itself still an open, undecided question.

**Why:** Pillar 2 (Hệ Quả Thực Sự) sells Undo as a narrow, trustworthy
exception — "sửa lỗi thao tác," a clean full revert of the most recent
turn. If a player misclicks/confirms a breakthrough turn that consumed a
rare resource and then Undoes it expecting a full revert, but the resource
is silently gone forever because no system claims rollback ownership, that
breaks the trust contract Pillar 2 establishes for the Undo exception.
This is now a 3-way orphaned gap between already-Designed systems, not a
future TODO against an undesigned one.

**How to apply:** Raise at the next `/design-system` pass touching
`equipment-skill-data-system.md` (where item consumption/charges will be
decided) — that GDD should explicitly claim rollback ownership for
resources consumed during a turn that gets Undone, referencing this gap.
Until then, flag as an open cross-system contract gap whenever
`exp-realm-progression.md` or `setting-canon-integration.md` are
re-reviewed.
