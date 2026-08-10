"""
Combat System reference harness — vòng 4 spike (per creative-director's
round-3 verdict on design/gdd/combat-system.md).

PURPOSE
-------
Round 2's "72/72 Safe Range combinations converge" claim (AC-47a) was
produced by a script at /tmp/combat_harness.py that no longer exists and
was (almost certainly) written in Python using Python's `/` operator,
which is TRUE division. GDScript's `/` on two `int` operands is
TRUNCATING integer division (like C), which several round-3 specialists
(godot-specialist B2, in particular) showed silently breaks the
exhaustion mechanic (D.4b) and the tiebreak formulas (D.9b/D.9c hp_pct)
if implemented literally.

This script is the reference implementation the creative-director asked
for: it reimplements D.1-D.10 (the subset needed to answer the 5
questions below) TWICE — once using GDScript-faithful integer semantics
(`gd_div_trunc`), once using ordinary float division — so the two can be
compared directly. It also implements D.9's `resolve_exchange` in both
its AS-DOCUMENTED form (sequential drain-with-early-return, matching
combat-system.md lines ~829-845 verbatim, including the bug reported as
C-2 in the round-3 report) and a FIXED form (compute both drains
unconditionally, then check), so the SPD-death-bias claim can be
verified numerically rather than by hand-simulation.

This is a THROWAWAY prototype (per prototypes/ convention) — its purpose
is to produce numbers for a GDD revision decision, not to become part of
the shipped game. Keep it in the repo (committed) so results are
re-runnable, unlike the round-2 harness.

Answers 5 questions from the round-3 creative-director synthesis:
  Q1. Sweep Safe Range INCLUDING TECHNICAL_EXCHANGE_CAP (not just the 4
      axes AC-47a swept) — does exhaustion still converge everywhere?
  Q2. With D.3/D.5/D.6/D.7 in the model (not excluded like AC-47a) —
      how often does final_damage==0 on an actual HIT?
  Q3. In a symmetric (mirror-match) attrition battle, who wins — is it
      always `second` (i.e. does `first`, the higher-SPD actor, always
      lose to the sequential-drain-with-early-return bug)?
  Q4. What fraction of battles end via D.9c's cap-tiebreak vs a genuine
      HP=0?
  Q5. With the SAME seeded RNG threaded through two independent runs,
      do coin_flip/skill-pick outputs match (sanity-check for the C-3
      "RNG must be a single injected stream" fix)?

Run: python harness.py
"""

import math
import random
import statistics
from dataclasses import dataclass, field

# ─────────────────────────────────────────────────────────────────────
# Notation helpers
# ─────────────────────────────────────────────────────────────────────

def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def gd_round(v):
    """GDD's `round()`: 0.5 rounds up. Python's round() uses banker's
    rounding, which does NOT match — this is exactly the kind of
    semantic mismatch the round-3 report is about, so we implement the
    GDD's own stated convention rather than trust the host language."""
    return math.floor(v + 0.5)


def gd_div_trunc(a, b):
    """GDScript int/int: truncates toward zero (C-style), NOT Python's
    `/` (true division) and NOT Python's `//` (floors toward -inf,
    which differs from C truncation for negative operands)."""
    if b == 0:
        raise ZeroDivisionError("gd_div_trunc: division by zero")
    q = a / b
    return math.trunc(q)


# ─────────────────────────────────────────────────────────────────────
# Default knob values (from combat-system.md Tuning Knobs, defaults)
# ─────────────────────────────────────────────────────────────────────

DEFAULT_KNOBS = dict(
    PENALTY_PER_TIER=0.15,
    FLOOR_LAYER=0.1,
    FLOOR_TOTAL=0.05,
    K_HIT=0.01,
    P_MIN=0.05,
    P_MAX=0.95,
    MIN_DMG_MULT=0.1,
    K_FLEE=0.01,
    P_MIN_FLEE=0.05,
    P_MAX_FLEE=0.95,
    CONTENT_EXCHANGE_ESTIMATE=30,
    TECHNICAL_EXCHANGE_CAP=200,
    SPAR_PARITY_TOLERANCE=0.15,
    SPAR_LOW_HP_THRESHOLD=0.15,
    MIN_RAW_RATIO=0.05,
    EXHAUSTION_ONSET_EXCHANGE=40,
    EXHAUSTION_DRAIN_PCT=0.05,
    HP_REGEN_CAP=0.05,
    DEFEND_DMG_REDUCTION_PCT=0.35,
    NPC_FLEE_HP_THRESHOLD=0.20,
)

# Safe Range bounds pulled from Tuning Knobs table
SAFE_RANGES = dict(
    MIN_RAW_RATIO=(0.02, 0.15),
    EXHAUSTION_ONSET_EXCHANGE=(20, 80),
    EXHAUSTION_DRAIN_PCT=(0.05, 0.15),
    HP_REGEN_CAP=(0.02, 0.05),
    TECHNICAL_EXCHANGE_CAP=(100, 500),
)


# ─────────────────────────────────────────────────────────────────────
# D.1 — effective_stat (realm suppression / gear-gap penalty)
# ─────────────────────────────────────────────────────────────────────

def layer_mult(gap, knobs):
    return clamp(1 - knobs["PENALTY_PER_TIER"] * gap, knobs["FLOOR_LAYER"], 1.0)


def effective_stat(base_x, gap_realm, gap_gear, knobs):
    total = clamp(layer_mult(gap_realm, knobs) * layer_mult(gap_gear, knobs),
                   knobs["FLOOR_TOTAL"], 1.0)
    return base_x * total


# ─────────────────────────────────────────────────────────────────────
# D.2 — first/second order
# ─────────────────────────────────────────────────────────────────────

def coin_flip(rng):
    return "A" if rng.random() < 0.5 else "B"


def order(spd_a, spd_b, rng):
    if spd_a > spd_b:
        return "A", "B"
    if spd_b > spd_a:
        return "B", "A"
    winner = coin_flip(rng)
    return (winner, "B" if winner == "A" else "A")


# ─────────────────────────────────────────────────────────────────────
# D.3 — hit/miss
# ─────────────────────────────────────────────────────────────────────

def p_hit(acc_att, ne_def, knobs):
    return clamp(0.5 + knobs["K_HIT"] * (acc_att - ne_def), knobs["P_MIN"], knobs["P_MAX"])


def roll_hit(acc_att, ne_def, knobs, rng):
    return rng.random() < p_hit(acc_att, ne_def, knobs)


# ─────────────────────────────────────────────────────────────────────
# D.4 — raw damage (chip floor)
# ─────────────────────────────────────────────────────────────────────

def raw_damage(atk_att, def_def, knobs):
    return max(atk_att * knobs["MIN_RAW_RATIO"], atk_att - def_def)


# ─────────────────────────────────────────────────────────────────────
# D.4b — exhaustion (the formula under scrutiny for int-division)
# ─────────────────────────────────────────────────────────────────────

def exhaustion_progress(exchange_id, knobs, use_int_div):
    onset = knobs["EXHAUSTION_ONSET_EXCHANGE"]
    cap = knobs["TECHNICAL_EXCHANGE_CAP"]
    num = exchange_id - onset
    den = cap - onset
    if use_int_div:
        # Faithful to GDScript: both operands are `int` per D.4b's own
        # symbol table (exchange_id, EXHAUSTION_ONSET_EXCHANGE,
        # TECHNICAL_EXCHANGE_CAP all typed `int`) -> int/int truncates.
        raw = gd_div_trunc(num, den) if den != 0 else 0
    else:
        raw = num / den if den != 0 else 0.0
    return clamp(raw, 0, 1)


def exhaustion_drain(max_hp, progress, knobs):
    return gd_round(max_hp * knobs["EXHAUSTION_DRAIN_PCT"] * progress)


# ─────────────────────────────────────────────────────────────────────
# D.5 — crit
# ─────────────────────────────────────────────────────────────────────

def roll_crit(crit_rate, crit_damage, rng):
    is_crit = rng.random() < clamp(crit_rate, 0, 1)
    mult = max(1.0, crit_damage) if is_crit else 1.0
    return is_crit, mult


# ─────────────────────────────────────────────────────────────────────
# D.6 — final damage (Amp x Mitigation x defend)
# ─────────────────────────────────────────────────────────────────────

def final_damage(raw, crit_mult, amp, mitigation, defending, knobs):
    pre_mit = raw * crit_mult
    final_mult = clamp((1 + amp) * (1 - mitigation), knobs["MIN_DMG_MULT"], math.inf)
    defend_mult = (1 - knobs["DEFEND_DMG_REDUCTION_PCT"]) if defending else 1.0
    return gd_round(pre_mit * final_mult * defend_mult)


# ─────────────────────────────────────────────────────────────────────
# D.7 — lifesteal
# ─────────────────────────────────────────────────────────────────────

def heal_from_damage(dmg, lifesteal):
    return gd_round(dmg * lifesteal)


# ─────────────────────────────────────────────────────────────────────
# D.8 — resolve one attack (D.3->D.7 chained)
# ─────────────────────────────────────────────────────────────────────

def resolve_attack(attacker, defender, hp_defender, defender_is_defending, knobs, rng):
    hit = roll_hit(attacker["ACC"], defender["Ne"], knobs, rng)
    if not hit:
        return dict(hit=False, crit=None, damage=0, heal=0, hp_defender_after=hp_defender)
    raw = raw_damage(attacker["ATK"], defender["DEF"], knobs)
    is_crit, cmult = roll_crit(attacker["CritRate"], attacker["CritDamage"], rng)
    dmg = final_damage(raw, cmult, attacker["Amp"], defender["Mitigation"], defender_is_defending, knobs)
    hp_after = max(0, hp_defender - dmg)
    heal = heal_from_damage(dmg, attacker["Lifesteal"])
    return dict(hit=True, crit=is_crit, damage=dmg, heal=heal, hp_defender_after=hp_after)


# ─────────────────────────────────────────────────────────────────────
# D.10 — regen
# ─────────────────────────────────────────────────────────────────────

def regen(hp, max_hp, hp_regen, exhaustion_regen_mult, knobs):
    regen_pct_used = min(hp_regen, knobs["HP_REGEN_CAP"])
    return min(max_hp, hp + gd_round(max_hp * regen_pct_used * exhaustion_regen_mult))


# ─────────────────────────────────────────────────────────────────────
# D.9 — resolve_exchange, two variants (AS-DOCUMENTED buggy vs FIXED)
# ─────────────────────────────────────────────────────────────────────

@dataclass
class ExchangeResult:
    hp_a: int
    hp_b: int
    battle_active: bool
    ended_by: str = ""          # "" | "hp0_first_attack" | "hp0_second_attack"
                                 # | "hp0_drain_first" | "hp0_drain_second"
                                 # | "hp0_drain_both_tiebreak"
    winner: str = ""            # "A" | "B" | ""


def resolve_exchange(actor_a, actor_b, hp_a, hp_b, exchange_id, knobs, rng,
                      use_int_div, bugged_drain, no_attacks=False):
    """One exchange (pha giao đấu), no flee/defend — both sides always
    choose 'skill'. `use_int_div` selects GDScript-faithful vs float
    exhaustion_progress. `bugged_drain=True` reproduces D.9's
    AS-WRITTEN sequential-drain-with-early-return (combat-system.md
    lines 829-845); `bugged_drain=False` applies the round-3 fix
    (compute both drains unconditionally, THEN check).
    `no_attacks=True` skips D.8 entirely (deterministic exhaustion-only
    experiments — matches AC-47a's own stated exclusion of D.3/D.5/D.7).
    """
    first_id, second_id = order(actor_a["SPD"], actor_b["SPD"], rng)
    actors = {"A": actor_a, "B": actor_b}
    hp = {"A": hp_a, "B": hp_b}
    first, second = actors[first_id], actors[second_id]

    if no_attacks:
        r1_dmg = 0
    else:
        r1 = resolve_attack(first, second, hp[second_id], False, knobs, rng)
        hp[second_id] = r1["hp_defender_after"]
        r1_dmg = r1["damage"]

    if hp[second_id] == 0:
        return ExchangeResult(hp["A"], hp["B"], False, "hp0_first_attack", winner=first_id)

    if no_attacks:
        r2_dmg = 0
    else:
        r2 = resolve_attack(second, first, hp[first_id], False, knobs, rng)
        hp[first_id] = r2["hp_defender_after"]
        r2_dmg = r2["damage"]

    if hp[first_id] == 0:
        return ExchangeResult(hp["A"], hp["B"], False, "hp0_second_attack", winner=second_id)

    # battle continues -> regen, then exhaustion drain
    progress = exhaustion_progress(exchange_id, knobs, use_int_div)
    regen_mult = 1 - progress
    for aid in ("A", "B"):
        hp[aid] = regen(hp[aid], actors[aid]["max_HP"], actors[aid]["HPRegen"], regen_mult, knobs)

    if bugged_drain:
        # AS-DOCUMENTED (combat-system.md lines 829-845): sequential,
        # early-return the instant `first` hits 0 — `second`'s drain is
        # never even computed in that case.
        d_first = exhaustion_drain(actors[first_id]["max_HP"], progress, knobs)
        hp[first_id] = max(0, hp[first_id] - d_first)
        if hp[first_id] == 0:
            return ExchangeResult(hp["A"], hp["B"], False, "hp0_drain_first", winner=second_id)
        d_second = exhaustion_drain(actors[second_id]["max_HP"], progress, knobs)
        hp[second_id] = max(0, hp[second_id] - d_second)
        if hp[second_id] == 0:
            return ExchangeResult(hp["A"], hp["B"], False, "hp0_drain_second", winner=first_id)
    else:
        # FIXED: compute both unconditionally (matches D.4b's own
        # promise "hao tổn thụ động đối xứng, KHÔNG có khái niệm 'đối
        # phương chưa kịp ra đòn'"), THEN check both.
        hp_pct_pre_drain = {aid: hp[aid] / max(actors[aid]["max_HP"], 1) for aid in ("A", "B")}
        d_first = exhaustion_drain(actors[first_id]["max_HP"], progress, knobs)
        d_second = exhaustion_drain(actors[second_id]["max_HP"], progress, knobs)
        hp[first_id] = max(0, hp[first_id] - d_first)
        hp[second_id] = max(0, hp[second_id] - d_second)
        first_dead = hp[first_id] == 0
        second_dead = hp[second_id] == 0
        if first_dead and second_dead:
            # tiebreak via hp_pct measured BEFORE drain (D.4b's promise)
            if hp_pct_pre_drain["A"] != hp_pct_pre_drain["B"]:
                w = "A" if hp_pct_pre_drain["A"] > hp_pct_pre_drain["B"] else "B"
            else:
                w = coin_flip(rng)
            return ExchangeResult(hp["A"], hp["B"], False, "hp0_drain_both_tiebreak", winner=w)
        if first_dead:
            return ExchangeResult(hp["A"], hp["B"], False, "hp0_drain_first", winner=second_id)
        if second_dead:
            return ExchangeResult(hp["A"], hp["B"], False, "hp0_drain_second", winner=first_id)

    return ExchangeResult(hp["A"], hp["B"], True)


def run_battle(actor_a, actor_b, knobs, seed, use_int_div, bugged_drain, no_attacks=False):
    rng = random.Random(seed)
    hp_a, hp_b = actor_a["max_HP"], actor_b["max_HP"]
    for exchange_id in range(1, knobs["TECHNICAL_EXCHANGE_CAP"] + 1):
        res = resolve_exchange(actor_a, actor_b, hp_a, hp_b, exchange_id, knobs, rng,
                                use_int_div, bugged_drain, no_attacks=no_attacks)
        hp_a, hp_b = res.hp_a, res.hp_b
        if not res.battle_active:
            return dict(converged=True, exchange_id=exchange_id, winner=res.winner,
                        ended_by=res.ended_by, hp_a=hp_a, hp_b=hp_b)
    return dict(converged=False, exchange_id=knobs["TECHNICAL_EXCHANGE_CAP"], winner="",
                ended_by="cap_reached", hp_a=hp_a, hp_b=hp_b)


def worst_case_actor(max_hp=200, hpregen=0.0):
    """Symmetric worst-case: ATK==DEF (chip-floor triggered every hit),
    no crit/amp/mitigation/lifesteal noise, so only D.4/D.4b/D.10
    determine the trajectory — matches AC-47a's own declared scope."""
    return dict(ATK=50, DEF=50, ACC=50, Ne=50, SPD=50, CritRate=0.0, CritDamage=1.0,
                Amp=0.0, Mitigation=0.0, Lifesteal=0.0, HPRegen=hpregen, max_HP=max_hp)


# ─────────────────────────────────────────────────────────────────────
# Q1 — Safe Range sweep INCLUDING TECHNICAL_EXCHANGE_CAP, int vs float div
# ─────────────────────────────────────────────────────────────────────

def experiment_q1():
    print("\n" + "=" * 78)
    print("Q1 — Safe Range sweep (including TECHNICAL_EXCHANGE_CAP), no-attack model")
    print("     (matches AC-47a's own stated scope: all hits assumed to land,")
    print("      no crit/lifesteal — isolates D.1/D.4/D.4b/D.10 convergence)")
    print("=" * 78)

    drain_pcts = [0.05, 0.10, 0.15]
    regen_caps = [0.02, 0.05]
    onsets = [40, 80]              # 20 excluded: violates onset > CONTENT_EXCHANGE_ESTIMATE=30
    caps = [100, 200, 500]
    hpregens = [0.0, 0.5, 1.0]     # 0.5/1.0 exceed [0,1] "valid per D.10 range" but capped by HP_REGEN_CAP

    for use_int_div in (True, False):
        label = "INT-DIV (GDScript-faithful)" if use_int_div else "FLOAT-DIV (round-2 harness semantics)"
        converged = 0
        total = 0
        failures = []
        for drain in drain_pcts:
            for rcap in regen_caps:
                for onset in onsets:
                    for cap in caps:
                        if onset >= cap:
                            continue
                        for hpr in hpregens:
                            knobs = dict(DEFAULT_KNOBS)
                            knobs["EXHAUSTION_DRAIN_PCT"] = drain
                            knobs["HP_REGEN_CAP"] = rcap
                            knobs["EXHAUSTION_ONSET_EXCHANGE"] = onset
                            knobs["TECHNICAL_EXCHANGE_CAP"] = cap
                            a = worst_case_actor(hpregen=hpr)
                            b = worst_case_actor(hpregen=hpr)
                            total += 1
                            res = run_battle(a, b, knobs, seed=1, use_int_div=use_int_div,
                                              bugged_drain=True, no_attacks=True)
                            if res["converged"]:
                                converged += 1
                            else:
                                failures.append((drain, rcap, onset, cap, hpr))
        print(f"\n[{label}] {converged}/{total} combinations converge before cap")
        if failures:
            print(f"  First {min(5, len(failures))} failing combos "
                  f"(drain, regen_cap, onset, cap, hpregen):")
            for f in failures[:5]:
                print(f"    {f}")


def experiment_q1_fixed():
    print("\n" + "=" * 78)
    print("Q1-FIXED — Same 108-combo sweep as Q1, but with BOTH round-4 fixes")
    print("           applied: float division (not int/int) + symmetric drain")
    print("           order (both computed unconditionally before checking).")
    print("           This produces the authoritative replacement number for")
    print("           AC-47a, citing THIS in-repo script instead of the lost")
    print("           /tmp harness from round 2.")
    print("=" * 78)

    drain_pcts = [0.05, 0.10, 0.15]
    regen_caps = [0.02, 0.05]
    onsets = [40, 80]
    caps = [100, 200, 500]
    hpregens = [0.0, 0.5, 1.0]

    converged = 0
    total = 0
    failures = []
    for drain in drain_pcts:
        for rcap in regen_caps:
            for onset in onsets:
                for cap in caps:
                    if onset >= cap:
                        continue
                    for hpr in hpregens:
                        knobs = dict(DEFAULT_KNOBS)
                        knobs["EXHAUSTION_DRAIN_PCT"] = drain
                        knobs["HP_REGEN_CAP"] = rcap
                        knobs["EXHAUSTION_ONSET_EXCHANGE"] = onset
                        knobs["TECHNICAL_EXCHANGE_CAP"] = cap
                        a = worst_case_actor(hpregen=hpr)
                        b = worst_case_actor(hpregen=hpr)
                        total += 1
                        res = run_battle(a, b, knobs, seed=1, use_int_div=False,
                                          bugged_drain=False, no_attacks=True)
                        if res["converged"]:
                            converged += 1
                        else:
                            failures.append((drain, rcap, onset, cap, hpr))
    print(f"\n  {converged}/{total} combinations converge before cap "
          f"(float-div + symmetric drain order)")
    if failures:
        print(f"  Failing combos (drain, regen_cap, onset, cap, hpregen):")
        for f in failures:
            print(f"    {f}")
        print("  -> window (cap-onset) of failing combos: "
              + ", ".join(str(f[3] - f[2]) for f in failures))


# ─────────────────────────────────────────────────────────────────────
# Q2 — real combat (D.3/D.5/D.6/D.7 included): freq(final_damage==0 | hit)
# ─────────────────────────────────────────────────────────────────────

def experiment_q2():
    print("\n" + "=" * 78)
    print("Q2 — Stochastic combat WITH D.3/D.5/D.6/D.7 (not excluded like AC-47a):")
    print("     how often is final_damage==0 on an actual HIT?")
    print("=" * 78)

    scenarios = [
        ("Both sides even, no Mitigation, no Defend", dict(ATK=50, DEF=50, Mitigation=0.0), False),
        ("Defender has moderate Mitigation=0.5, no Defend", dict(ATK=50, DEF=50, Mitigation=0.5), False),
        ("Attacker chip-floored (FLOOR_TOTAL, tier gap 10) + Mitigation=0.5", dict(ATK=2.5, DEF=50, Mitigation=0.5), False),
        ("Attacker chip-floored + Mitigation=0.5 + defender DEFENDING", dict(ATK=2.5, DEF=50, Mitigation=0.5), True),
    ]
    knobs = dict(DEFAULT_KNOBS)
    n_trials = 20000

    for label, overrides, defending in scenarios:
        rng = random.Random(42)
        zero_on_hit = 0
        hits = 0
        for _ in range(n_trials):
            atk = dict(ATK=overrides.get("ATK", 50), DEF=50, ACC=1000, Ne=0, SPD=50,
                       CritRate=0.0, CritDamage=1.0, Amp=0.0, Lifesteal=0.0, HPRegen=0.0, max_HP=200)
            deff = dict(ATK=50, DEF=overrides.get("DEF", 50), ACC=50, Ne=0, SPD=50,
                        CritRate=0.0, CritDamage=1.0, Amp=0.0,
                        Mitigation=overrides.get("Mitigation", 0.0), Lifesteal=0.0, HPRegen=0.0, max_HP=200)
            # ACC=1000 forces P_hit to clamp at P_MAX so we isolate the
            # damage-rounding question from the hit-roll question.
            res = resolve_attack(atk, deff, 200, defending, knobs, rng)
            if res["hit"]:
                hits += 1
                if res["damage"] == 0:
                    zero_on_hit += 1
        pct = 100.0 * zero_on_hit / hits if hits else float("nan")
        print(f"\n  {label}")
        print(f"    hits={hits}/{n_trials}, final_damage==0 on {zero_on_hit} of those hits ({pct:.2f}%)")


# ─────────────────────────────────────────────────────────────────────
# Q3 — mirror-match attrition: does `first` (higher-SPD) always lose?
# ─────────────────────────────────────────────────────────────────────

def experiment_q3():
    print("\n" + "=" * 78)
    print("Q3 — Mirror-match attrition battle: is `first` (won D.2 SPD order)")
    print("     always the loser under the AS-DOCUMENTED sequential-drain bug?")
    print("=" * 78)

    knobs = dict(DEFAULT_KNOBS)
    knobs["EXHAUSTION_ONSET_EXCHANGE"] = 40
    knobs["TECHNICAL_EXCHANGE_CAP"] = 200

    for use_int_div in (True, False):
        for bugged in (True, False):
            first_wins, second_wins, ties, n = 0, 0, 0, 200
            for seed in range(n):
                a = worst_case_actor(hpregen=0.05)
                b = worst_case_actor(hpregen=0.05)
                # SPD is symmetric here (both 50) so D.2's coin_flip
                # decides `first` — we need to know WHICH letter won D.2
                # to interpret the result, so re-derive it with the same
                # seed/rng draw sequence D.2 uses first each battle.
                rng_probe = random.Random(seed)
                first_id, _ = order(a["SPD"], b["SPD"], rng_probe)
                res = run_battle(a, b, knobs, seed=seed, use_int_div=use_int_div,
                                  bugged_drain=bugged, no_attacks=True)
                if not res["converged"]:
                    continue
                if res["winner"] == first_id:
                    second_wins += 1  # first LOST -> second (loser-label) won -> counts as "first lost"
                else:
                    first_wins += 1
            label = f"int_div={use_int_div}, bugged_drain={bugged}"
            print(f"\n  [{label}]  over {n} seeded battles:")
            print(f"    `first` (SPD-tiebreak winner) won: {first_wins}")
            print(f"    `first` LOST (second won):          {second_wins}")


def experiment_q3b():
    print("\n" + "=" * 78)
    print("Q3b — CORRECTED: Q3 used SPD_A==SPD_B, which makes D.2 coin_flip")
    print("      RESHUFFLE the first/second label every single exchange (since")
    print("      the tie is exact every time) — that dilutes any systemic bias")
    print("      from the sequential-drain bug across many random relabelings.")
    print("      This variant gives A a strictly higher SPD so `first` is the")
    print("      SAME actor (A) for the ENTIRE battle, every exchange — the")
    print("      scenario the C-2 finding actually describes.")
    print("=" * 78)

    knobs = dict(DEFAULT_KNOBS)
    knobs["EXHAUSTION_ONSET_EXCHANGE"] = 40
    knobs["TECHNICAL_EXCHANGE_CAP"] = 200

    for bugged in (True, False):
        a_wins, b_wins, n = 0, 0, 300
        for seed in range(n):
            a = worst_case_actor(hpregen=0.05)
            b = worst_case_actor(hpregen=0.05)
            a["SPD"] = 51  # strictly higher -> A is `first` every exchange, deterministically
            res = run_battle(a, b, knobs, seed=seed, use_int_div=False,
                              bugged_drain=bugged, no_attacks=True)
            if not res["converged"]:
                continue
            if res["winner"] == "A":
                a_wins += 1
            else:
                b_wins += 1
        label = "BUGGED (as-documented, sequential early-return)" if bugged else "FIXED (both drains computed unconditionally)"
        total = a_wins + b_wins
        print(f"\n  [{label}]")
        print(f"    A (higher SPD, always `first`) wins: {a_wins}/{total} ({100*a_wins/total:.1f}%)"
              if total else "    (no converged battles)")
        print(f"    B (lower SPD, always `second`) wins:  {b_wins}/{total} ({100*b_wins/total:.1f}%)"
              if total else "")


# ─────────────────────────────────────────────────────────────────────
# Q4 — fraction ending via D.9c cap-tiebreak vs genuine HP=0
# ─────────────────────────────────────────────────────────────────────

def experiment_q4():
    print("\n" + "=" * 78)
    print("Q4 — Fraction of battles ending via TECHNICAL_EXCHANGE_CAP")
    print("     (D.9c tiebreak) vs a genuine HP=0, across knob combinations")
    print("=" * 78)

    for use_int_div in (True, False):
        cap_hits, hp0_hits, n = 0, 0, 100
        for seed in range(n):
            knobs = dict(DEFAULT_KNOBS)
            a = worst_case_actor(hpregen=0.05)
            b = worst_case_actor(hpregen=0.05)
            res = run_battle(a, b, knobs, seed=seed, use_int_div=use_int_div,
                              bugged_drain=True, no_attacks=True)
            if res["converged"]:
                hp0_hits += 1
            else:
                cap_hits += 1
        label = "INT-DIV" if use_int_div else "FLOAT-DIV"
        print(f"\n  [{label}] over {n} seeded battles: "
              f"{hp0_hits} ended via real HP=0, {cap_hits} hit TECHNICAL_EXCHANGE_CAP "
              f"(-> D.9c tiebreak)")


# ─────────────────────────────────────────────────────────────────────
# Q5 — RNG stream determinism across two independent runs, same seed
# ─────────────────────────────────────────────────────────────────────

def experiment_q5():
    print("\n" + "=" * 78)
    print("Q5 — RNG determinism: same seed threaded through two independent")
    print("     resolve_exchange call chains -> identical coin_flip/hit/crit sequence?")
    print("=" * 78)

    knobs = dict(DEFAULT_KNOBS)
    a = worst_case_actor(hpregen=0.05)
    b = worst_case_actor(hpregen=0.05)

    run1 = run_battle(a, b, knobs, seed=777, use_int_div=False, bugged_drain=False)
    run2 = run_battle(a, b, knobs, seed=777, use_int_div=False, bugged_drain=False)

    match = run1 == run2
    print(f"\n  Run 1: {run1}")
    print(f"  Run 2: {run2}")
    print(f"  IDENTICAL: {match}")
    print("  (This confirms: IF the RNG is a single object explicitly threaded")
    print("   through every D.x call — as this harness does — determinism holds.")
    print("   The GDD's pseudocode does NOT show this threading explicitly in any")
    print("   D.x call signature (round-3 finding C-3.4) — this is what the fix")
    print("   needs to guarantee at the GDScript level, not just in a Python mirror.")


if __name__ == "__main__":
    print("Combat System reference harness — round 4 spike")
    print("design/gdd/combat-system.md — answering creative-director's 5 questions")
    experiment_q1()
    experiment_q1_fixed()
    experiment_q2()
    experiment_q3()
    experiment_q3b()
    experiment_q4()
    experiment_q5()
    print("\n" + "=" * 78)
    print("Done. See results.md for interpreted findings.")
    print("=" * 78)
