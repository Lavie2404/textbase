---
name: project-death-and-consequence-review
description: Adversarial economy review (2026-08-09) of design/gdd/death-and-consequence.md recovery economy (Formula D.3) — recomputed the 81% recovery-by-turn-90 claim, found it's a best-case timing anchor, and found the tự_tu/cơ_duyên/item priority order isn't incentive-supported.
metadata:
  type: project
---

Reviewed `design/gdd/death-and-consequence.md` (status: revised, chờ re-review
round 2 as of 2026-08-08) at user's request, applying the same economy
skepticism as [[project-exp-realm-progression-gdd-review]] and
[[project-npc-affinity-round2-review]]. This was a standalone adversarial
pass, not a formal `/design-review` round — findings below are NOT yet in
the GDD's own review log.

**Key findings** (full numeric work in the conversation, not repeated here):

1. **HIGH — the GDD's own "~81% gỡ cờ trước lượt 90" headline number
   (Tuning Knobs, `RECOVERY_SELF_RATE=0.12`/`RECOVERY_SELF_COOLDOWN_TURNS=5`)
   is arithmetically correct but only for the anchor case "crippled at turn
   30" (13 possible tự_tu attempts in the remaining 60-turn window). I
   recomputed for other crippling turns within the same 90-turn MVP window:
   turn 60 → 59.1%, turn 80 → 31.9%, turn 85 → 22.6%, turn 88 → 12.0% (all
   via `1-(0.88)^n`, n = attempts available). Severity can trigger at ANY
   turn (any lost battle with `margin_ratio≥0.75`), so the population-average
   recovery-by-90 rate is materially below 81% — the exact EXP-loop
   measurability risk the 2026-08-08 knob change (0.08/8→0.12/5) was meant
   to close is still open for players crippled in the back half of the MVP
   window.

2. **HIGH — the recovery method priority order the GDD claims in its
   Tuning Knobs note ("cơ duyên/item ưu tiên, tự tu chỉ là sàn cuối") is not
   incentive-supported.** tự_tu has zero opportunity cost (character is
   already EXP-blocked, so spending a turn on it costs nothing), zero
   resource cost, and unlimited repeats (only a 5-turn cooldown) — expected
   turns-to-clear via tự_tu alone is `5*(0.88/0.12) ≈ 36.7 turns` (median
   ~25). Meanwhile 2 of 3 recovery channels (đại_cơ_duyên trigger frequency,
   tiên_thảo_dị_bảo item-acquisition economy) are undesigned per this GDD's
   own Open Questions table. Rational play is "always spam tự_tu on
   cooldown, layer cơ duyên/item opportunistically on top" — not the
   stated fallback ordering.

3. **MEDIUM — zero incremental mechanical risk while crippled, against any
   opponent with `affinity > -80`.** No Lực chiến penalty (deliberate), the
   blocked flag is idempotent (no stacking), and non-severe tiers carry no
   mechanical flag at all — so losing repeatedly to non-deep-hostile
   opponents while crippled has exactly 0 additional mechanical cost.
   Creates a rational "risk-free farm" window contradicting the Player
   Fantasy section's stated intent ("hậu quả phải cảm thấy THẬT và ĐAU").
   `death_roll` DOES still run against deep-hostility opponents while
   crippled (confirmed, no death-immunity exploit — the GDD's own Edge
   Cases + AC-33 already guard this correctly).

4. **MEDIUM — `efficacy(item)` clamp to `RECOVERY_ITEM_MAX=0.90` flattens
   the top of item value curve** (any item authored ≥0.90 is mechanically
   identical) — not documented as a warning on the actual field's home
   schema (`equipment-skill-data-system.md`), only implied here.

5. **LOW — `npc_tag.medium_override` is currently 100% narrative-only**
   (verified: `consequence_type` string has no numeric/flag effect
   distinguishing "sỉ nhục" vs "ép uống độc" — both are tier `medium`, no
   EXP-block flag either way) — zero exploit risk today, but flagged as a
   forward-looking gap if mechanical effects (poison/debuff) get attached
   to the tag later without a GDD update.

**How to apply**: none of these are "Blocking" in the formal `/design-review`
sense (this wasn't run as that skill) but H-1/H-2 are the kind of finding
that class as nhóm-A (economy trade-off, needs re-derivation of interlocking
constants — `RECOVERY_SELF_RATE`/`RECOVERY_SELF_COOLDOWN_TURNS` vs. the
90-turn MVP verification window they're supposed to guarantee), matching
the pattern that triggered the round-cap amendment for EXP & Realm
Progression (see `.claude/docs/coordination-rules.md`). If this GDD goes
through a full `/design-review` round 2, expect these to surface there too.
