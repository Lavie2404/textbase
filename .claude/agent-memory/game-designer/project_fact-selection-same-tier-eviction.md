---
name: project-fact-selection-same-tier-eviction
description: World Memory's entity_fact_selection (top_K by importance_tier then recency) can silently evict an NPC's foundational/origin memory once 8+ newer same-tier facts accumulate for that entity
metadata:
  type: project
---

`world-memory-context-management.md` Formula #3 (`entity_fact_selection`)
sorts `top_K(facts(entity_id), key=(importance_tier DESC, world_time DESC,
fact_id ASC), K=max_facts_per_entity)`. This correctly protects high-tier
facts from being crowded out by low-tier ones. It does NOT protect a fact
from being crowded out by *other facts of the same tier that happened more
recently*.

**Why this matters**: `importance_tier` (owned by setting-canon-integration.md
D.5) is a pure function of `field_name`/`field_value` only — it cannot know
whether an event is "the first of its kind for this entity" (e.g., the
originating rescue/debt that founded a relationship) vs. "one of several
similar tier-3 events that piled up later". For a narratively important NPC
who accumulates 8+ new tier-3 facts over a long playthrough, the founding
event — despite being tier-3 and thematically the most important single fact
about that relationship — silently drops out of `selected_facts` once 8
newer tier-3 facts exist. This is counter to how relationship memory
"should" feel: an origin story usually matters MORE over time, not less, but
the current mechanism treats same-tier facts as pure recency-competition.

This was found while adversarially testing the GDD's own "Bùi Lan rescued
50 turns ago" example — the example as written happens to work (only 1
tier-3 fact for her), but the formula does not generalize to NPCs with many
tier-3 events, which is exactly the kind of NPC ("NPC là nhân vật chính của
chính họ") this game's pillars want to support.

**How to apply**: When reviewing NPC Affinity & Relationship or any GDD that
defines `importance_tier` rules, check whether an "anchor fact" concept
(1-2 reserved slots per entity for the earliest tier-max fact, exempt from
recency competition within its tier) has been proposed. If not, keep
flagging — recommend either that mechanism or an explicit accepted-risk note
plus playtest validation before shipping NPCs designed to accumulate many
tier-3 beats. See [[project_world-memory-qualitative-gap]].
