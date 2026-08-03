---
name: reference_color-rationing-precedents
description: Running log of where each GDD has already spent the đỏ son/xanh ngọc rationed color budget, so future proposals don't collide or dilute meaning
metadata:
  type: reference
---

The Visual Identity Anchor ("Mực Chưa Khô") in `design/gdd/game-concept.md`
rations exactly two accent colors project-wide: đỏ son (vermillion — all
permanent/serious consequences: trọng thương/chết/hậu quả) and xanh ngọc
(jade — realm breakthrough only). No other accent hues are permitted; new
GDDs must reuse one of these two, differentiated by composition/weight/
persistence, not by introducing new hues or tints.

**Why:** The anchor's whole mechanism depends on rarity — if đỏ son starts
appearing in more than a few clearly load-bearing places, or with variant
shades per system, the "seeing red means something real just changed"
signal breaks down. Each system that spends this budget must be checked
against prior spends before approval.

**How to apply:** Before proposing đỏ son/xanh ngọc usage in any new GDD's
Visual/Audio Requirements section, grep sibling GDDs for the color name
first (they may already have claimed part of the budget) and differentiate
by frame weight / fill vs. outline / persistence duration / composition
(e.g. localized card badge vs. full-page ink stroke), never by shade,
saturation variant, or a "sister color."

**Precedent log (update as each GDD adds its own section):**
- `combat-system.md` — đỏ son used ONLY as a thin outline (viền mảnh) around
  the loser's Character Card ink-stamp frame when `outcome.type="lose"`.
  Transient/local to that one battle result. Win = stays neutral black-gray
  (winning is not a "permanent change" worth spending color on). Xanh ngọc
  explicitly NOT used anywhere in Combat (reserved for EXP & Realm
  Progression only).
- `death-and-consequence.md` — extends đỏ son to cover MORE severe,
  longer-lived states than Combat's single-battle "lose," using persistence
  as the differentiator instead of a new hue:
  - Mild/medium consequences (trọng thương/sỉ nhục/ép uống độc, no persistent
    flag set) → transient đỏ son ink flourish under the narrated consequence
    text, fades within the same reading beat, no lasting mark on the card.
  - Severe/crippled (`death_and_consequence_blocked=true`, persists across
    turns until Formula D.3 recovery succeeds) → đỏ son as a filled/blocky
    ink-stamp seal (not just an outline) localized to the stat/đan điền area
    of the Character Card, persists every time the card is viewed until
    cleared.
  - Real death (`is_death_turn=true`, irreversible, no undo, no recovery
    path) → đỏ son used once as a compositional act (a single ink stroke
    "closing" the current journal page/entry) rather than a persistent UI
    frame color; immediately after, the page's ink dries to permanent flat
    gray and đỏ son is not seen live again for that character — only a
    small static, non-animated closed-seal glyph remains on their Character
    Card forever after. Recovery (event 5) never reintroduces xanh ngọc —
    "hope" is signaled by the seal lifting back to neutral paper tone, not
    by a new color, to protect xanh ngọc's exclusive realm-breakthrough
    meaning.
  - Rule of thumb established here, reusable by future GDDs: **visual
    signal permanence should mirror game-state permanence** — a transient
    flag gets a transient ink mark, a persistent flag gets a persistent
    seal, an irreversible flag gets a one-time compositional act that then
    leaves only a static residual marker behind.

Related: [[project_vo-danh-luc-context]] for the overall anchor and project
scope this budget serves.
