---
name: project-combat-ui-defend-flee-overflow-gap
description: combat-system.md's ">4 actions" UI fix (tier-priority + "Xem thêm") only re-lists skills in the overflow popover, likely leaving Defend/Item/Flee touch-inaccessible whenever unused skill count is high — same bug class as the one it was meant to fix
metadata:
  type: project
---

`design/gdd/combat-system.md` UI Requirements (fix G, applied 2026-08-06)
resolves the prior blocker "2/6 skills only reachable via free-text typing"
by sorting the 4 suggested-action slots with skills-by-highest-tier first,
then defend/item/flee filling any remaining slots, and replacing slot 4
with a fixed "Xem thêm" button when there are more than 4 eligible actions.

**The gap**: the GDD's own text for "Xem thêm" says it opens a list of
"MỌI thức `known_skill_ids` chưa dùng trong trận" — skills only. It never
says Defend/Item/Flee are included in that overflow list. Because skills
are prioritized into the primary 4 slots ahead of Defend/Item/Flee, any
character with ≥4 unused skills (the normal case early-to-mid fight for a
full 6-skill loadout) will have Defend/Item/Flee bumped entirely off the
visible bar — and if "Xem thêm" truly only lists skills, those three
actions become reachable only via free-text input. This is the exact
touch-accessibility failure mode fix G was written to close, just relocated
onto the tactical/survival actions instead of skills — and Flee is the one
action a player in genuine danger (real death risk, per Pillar 2) most
needs fast access to.

Secondary point: tier-priority also means Defend/Item/Flee naturally become
*more* visible as a fight goes *longer* (skills get used up and drop out of
priority), which is backwards from when an emergency flee/defend is likely
needed (can happen at phase 2 just as easily as phase 20).

**How to apply**: Raise this when `combat-system.md` UI Requirements or the
downstream `/ux-design` character-card.md spec are revised — confirm
explicitly whether "Xem thêm" includes Defend/Item/Flee, or whether those
three need reserved slots independent of skill-tier sorting. See
[[project_combat-exhaustion-turn-counter-tension]] for the sibling finding
from the same 2026-08-06 vòng-2 review of this file.
