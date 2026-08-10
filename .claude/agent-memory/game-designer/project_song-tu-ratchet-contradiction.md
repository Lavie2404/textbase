---
name: song-tu-ratchet-contradiction
description: npc-affinity-relationship.md Core Rule #6 ("bấm được bất cứ lúc nào") contradicts its own Dependencies section's "Ràng buộc bắt buộc" (mandatory context-gating) for Song Tu, and Song Tu mathematically dominates every other positive-affinity action once unlocked
metadata:
  type: project
---

`design/gdd/npc-affinity-relationship.md` Core Rule #6 states the Song Tu
button is usable "bấm được bất cứ lúc nào còn đủ điều kiện" (any time, no
narrative gate). But the Dependencies table (row: Situation/Encounter
Generation) states a "Ràng buộc bắt buộc từ thẩm định kinh tế
(economy-designer 2026-08-03)": Song Tu **should** be gated through
narrative context (privacy, NPC willingness) or "ratchet Hảo cảm chắc chắn
xảy ra bất kể fatigue/cap." These two statements directly contradict each
other, and since Situation Gen is still provisional, Core Rule #6 (this
GDD's own authoritative text) wins by default today — meaning the
economy-designer's own "mandatory" constraint is currently unenforced in
the shipped rule text.

Separately, Song Tu is **structurally dominant** over every other positive
action once affinity ≥ +60: it is exempt from diminishing returns (D.2),
repetition fatigue (D.3), and the per-turn positive cap (D.4) — the only
mechanics that discipline every other positive event type. Average yield
is +5.5/action (uniform 1-10), uncapped all the way to +100, vs. e.g. a
`gift` at affinity 95 netting only +1.14 after diminishing. Once unlocked,
the strictly optimal play for any Song-Tu-eligible NPC is "spam the Song
Tu button forever," collapsing the intended diverse-investment loop into a
single-button grind — directly undermining the GDD's own Player Fantasy
claim that affection is "kiếm được bằng hành động thật" (earned through
real, varied action).

**Why**: found during `/design-review` of `npc-affinity-relationship.md`
(2026-08-08), adversarial game-designer pass anchored to Section B (Player
Fantasy).

**How to apply**: when this GDD (or EXP & Realm Progression, which
consumes `SONG_TU_ACTIVE`) is revised, flag this as a required fix —
either promote the "should gate" language to a hard Core Rule with a
concrete MVP-tier fallback (not fully deferred to provisional Situation
Gen), or explicitly accept the dominant-strategy outcome and remove the
now-false "diverse investment" framing from Player Fantasy.
