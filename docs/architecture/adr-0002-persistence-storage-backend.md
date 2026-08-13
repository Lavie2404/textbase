# ADR-0002: Persistence storage backend — direct IndexedDB transactions via JavaScriptBridge, Web Locks session locking

## Status

Accepted (2026-08-11 — the pre-implementation gate closed with Experiment 2b:
all three previously-untested bridge mechanisms resolved [PackedByteArray
marshalling FAILS → String/base64 contract; compound-key cursor scan PASS;
multi-store transaction commit+abort PASS], no architectural change required,
only the `get_blob()` payload type in Key Interfaces was finalized. See D1a
"Resolved 2026-08-11" for the full evidence. Accepted per the user's standing
directive to close the Persistence gate.)

## Date

2026-08-11 (Proposed) / 2026-08-11 (Accepted)

## Last Verified

2026-08-11 (all engine-behavior claims verified by source-read spike 2026-08-08
`docs/engine-reference/godot/modules/web-export.md` + executed prototype
2026-08-11 `prototypes/persistence-web/` on Godot 4.6-stable Web export,
including the Experiment 2b re-run the same day)

## Decision Makers

user (standing directive to close the Persistence gate, 2026-08-11) +
technical-director flow per `persistence-save-system.md` Open Questions owners;
GDD Core Rule #3's (a)/(b) choice was already locked (b) on 2026-08-08 by the
spike — this ADR formalizes it and resolves every remaining "decision: ADR"
item that the prototype has now unblocked.

## Summary

`persistence-save-system.md` Core Rule #1 gates turn confirmation on
`durability_confirmed`, which Godot's default `FileAccess`/`user://` (IDBFS)
path cannot observe. This ADR commits the save path to a game-owned IndexedDB
database driven directly through `JavaScriptBridge`
(`get_interface`/`create_object`/`create_callback`, never `eval()`), with
`transaction.oncomplete` as the durability boundary, per-slot Web Locks
(`{ifAvailable: true}` + the pending-Promise-via-`Promise.resolve.bind`
holding pattern) for multi-tab exclusion, no physical compression in MVP, and
a snapshot-compaction full-flush cycle — validated by the 2026-08-11
prototype (latency headroom ~7× at the 1MB *worst case*, 16–25× at typical
payload sizes, against `max_perceived_autosave_latency_ms = 150`). Two
mechanisms the first prototype pass did not cover (PackedByteArray bridge
marshalling; compound-key cursor scans + multi-store transactions) were
flagged by engine-specialist validation and are covered by the follow-up
Experiment 2b (see D1a).

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Godot 4.6 (Web export, nothreads variant — project default, no COOP/COEP required) |
| **Domain** | Core / Web Export / Scripting |
| **Knowledge Risk** | HIGH — Web export internals are post-cutoff; every load-bearing claim here is verified by source-read spike (`web-export.md`, engine `4.6-stable` source) and/or the executed prototype, not training data |
| **References Consulted** | `docs/engine-reference/godot/VERSION.md`, `docs/engine-reference/godot/modules/web-export.md` (Q5/Q6/Q7/Q8 + "Awaiting a JS Promise from GDScript without eval"), `prototypes/persistence-web/` (results.json, README.md) |
| **Post-Cutoff APIs Used** | `JavaScriptBridge.get_interface()` / `create_object()` / `create_callback()` on 4.6 Web export (verified working in prototype); Web Platform APIs: IndexedDB, Web Locks (`navigator.locks`), `StorageManager.estimate()`/`persist()` |
| **Verification Required** | Prototype item **#4** (real-device matrix): IndexedDB/Web Locks/quota/`persist()` inside iOS Safari + WKWebView and Zalo/Facebook/Messenger in-app browsers, incl. Safari ITP ~7-day eviction AND a sandboxed-iframe (itch.io-style) case — run via `prototypes/persistence-web/DEVICE-TEST.md` (https tunnel required; secure-context-only APIs). Pre-release verification condition, not an implementation blocker (see Risks). ~~Experiment 2b (Migration step 0)~~ — **DONE 2026-08-11**: PackedByteArray marshalling, compound-key cursor scans, multi-store transaction all resolved; see D1a. |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None (ADR-0001 is methodology for Combat; no technical dependency) |
| **Enables** | Future AI-backend ADR (shares the "verify host constraints before first deploy" posture); `/create-architecture`; Persistence implementation epic |
| **Blocks** | Persistence / Save System implementation stories; `/ux-design save-slot-screen.md` empty-state work can proceed in parallel (UI-only) |
| **Ordering Note** | The `schema_version` bump discipline (Core Rule #8) must land in the release checklist when `/create-control-manifest` runs — flagged there, not re-specified here |

## Context

### Problem Statement

Core Rule #1 (write-ahead gate: Turn Confirmed / Undo completion transitions
require `durability_confirmed = true`) needs a storage backend whose durable
commit point is *observable from GDScript*. The 2026-08-08 spike proved
option (a) — `FileAccess`/`user://` over Emscripten IDBFS — has real
multi-file atomicity but **no observation path**: `force_fs_sync()` only
raises a dirty flag; the actual sync runs next frame via an internal callback
that never reaches GDScript. Option (b) — driving IndexedDB directly via
`JavaScriptBridge` — was locked in the GDD on controllability grounds, but
three prototype items remained: does `transaction.oncomplete` really reach
GDScript (#2), can a Web Lock be held across a session from GDScript (#3),
and is the IDBFS mtime-collision risk real (#5). All three were answered
empirically on 2026-08-11. The cost of not deciding now: every AC in the
blocked set (AC-17, AC-22, AC-29, AC-33) stays unwritable and implementation
cannot start.

### Current State

No implementation exists (`src/` has no persistence code). The GDD is
"Designed — Revised", review cycle formally closed at round 3, with all
remaining open items assigned to this ADR.

### Constraints

- Web / Mobile Web target; nothreads export (no COOP/COEP demanded of hosts).
- `JavaScriptBridge.eval()` is a Forbidden Pattern
  (`.claude/docs/technical-preferences.md`) — all JS glue must use
  `get_interface()`/`create_object()`/`create_callback()`.
- Single main thread on Web export: serialization CPU counts against the
  perceived-latency budget.
- Solo developer, MVP measured in weeks — no cloud/sync backend in scope
  (Core Rule #5).
- Hosting must allow `'wasm-unsafe-eval'` CSP for any Godot Web export at all
  (independent of this ADR; `devops-engineer` item, already tracked).

### Requirements

- `durability_confirmed` must be a real, observable event (Core Rule #1/#3).
- Multi-blob atomicity: one turn's append-only writes commit all-or-nothing
  (Core Rule #3).
- Per-turn write cost ~constant, NOT O(world_time) (Core Rule #3 append-only
  commitment); periodic full-flush compacts and deletes.
- Perceived autosave latency ≤ `max_perceived_autosave_latency_ms = 150`
  (safe range 100–300) for the append-only portion, end-to-end including
  serialization.
- Multi-tab: second tab opening a locked slot must be rejected **instantly**
  (AC-18), and the lock must free itself on tab close/crash (AC-33).
- Quota measurable (Formula #3) with a deliberate safety margin.

## Decision

### D1. Storage backend: game-owned IndexedDB database, driven directly via JavaScriptBridge

The save path bypasses `FileAccess`/`user://` entirely. Persistence owns an
IndexedDB database (working name `game_persistence`, version 1) with three
object stores:

| Store | Key | Value |
|---|---|---|
| `slots` | `slot_id` | slot metadata record: `schema_version`, `slot_closure_reason`, `world_time_latest`, `created_at`, byte-accounting counters for Formula #1 |
| `turn_records` | `[slot_id, world_time]` (compound) | ONE record per confirmed turn — the append-only unit of Core Rule #3. The IDBFS-era "1 physical file per turn" constraint maps to "1 IDB record per turn": only the new record is written each turn; old records are never touched |
| `snapshots` | `[slot_id, world_time_at_flush]` | periodic full-bundle snapshot (Core Rule #3 full-flush) |

- **`durability_confirmed(write)` := the `oncomplete` event of the single
  `readwrite` transaction that wrote that turn's records.** Prototype #2
  verified `oncomplete` reaches GDScript via `create_callback()` (attach with
  `addEventListener`; 24/24 iterations, ordering correct).
- **Full-flush compaction** runs off the critical path (Awaiting Action
  idle): write the new snapshot AND delete the compacted `turn_records` in
  the **same** `readwrite` transaction, so compaction itself is
  all-or-nothing and the store never holds a state that double-counts or
  loses turns. Flush cadence: every `FLUSH_EVERY_N_TURNS = 50` confirmed
  turns (initial value; data-driven config, tune freely — it only trades
  load-merge work against per-flush cost, both off-critical-path).
- **Load** = read latest snapshot for the slot + all `turn_records` with
  `world_time` greater than the snapshot's, apply in `world_time` order
  (IDB compound-key range scan gives ordering for free).
- **`versionchange`/`blocked` handling** (specialist finding, ties to D6):
  every open connection registers `db.onversionchange` → close the
  connection + return the tab to the Save Slot Screen with a "game updated
  in another tab" notice; the upgrading tab handles
  `IDBOpenDBRequest.onblocked` with a visible "close other game tabs"
  prompt instead of hanging silently. Without this, a `schema_version` bump
  (D6) with a second tab open stalls `indexedDB.open()` indefinitely.

### D1a. Evidence status of D1's mechanisms (Experiment 2b)

The first prototype pass proved `oncomplete` reachability, ordering, and
latency using JSON-string payloads with simple string keys in a single-store
transaction. Engine-specialist validation correctly flagged that D1
additionally depends on three mechanisms that pass did NOT test:
(i) `PackedByteArray` crossing the bridge into `IDBObjectStore.put()` (and
back, byte-identical) — determines whether the `bytes: PackedByteArray`
contract or a JSON-string contract is correct, and whether an encoding
penalty (à la the base64 inflation that helped disqualify `localStorage`)
applies; (ii) compound keys (`[slot_id, world_time]`) + `IDBKeyRange` cursor
scans through a **multi-fire** callback (the project's validated
await-a-promise utility is single-settle and cannot service cursors);
(iii) a multi-store `readwrite` transaction (snapshot put + turn-record
deletes, one `oncomplete`). These are covered by **Experiment 2b** in
`prototypes/persistence-web/` — its results are recorded in that
prototype's README/results.json and summarized here; if any sub-item fails,
the affected D1 mechanism falls back as noted in-line (JSON-string payload
contract; per-store sequential scans with per-record gets; two chained
transactions with an idempotent-compaction journal record) without changing
the ADR's core direction.

**Resolved 2026-08-11 — Experiment 2b ran, results conclusive on all three
sub-items** (full data: `prototypes/persistence-web/results.json` →
`phase1.exp2b_bridge_mechanics`; narrative:
`prototypes/persistence-web/README.md` §"#2b"):

- **(i) `PackedByteArray` marshalling — FAILS, and fails silently.** A raw
  `PackedByteArray` passed directly as a bridge call argument arrives in JS
  as `undefined`; `IDBObjectStore.put()` reports success but the value reads
  back as `null` — no error surfaces anywhere. **The `bytes: PackedByteArray`
  contract is rejected; the JSON-string fallback is the real contract**, not
  a fallback-of-last-resort. `Marshalls.raw_to_base64()` (native GDScript, no
  bridge call, ~1.5ms/100KB) is the encoding when a system's blob is
  genuinely binary; round-trip verified byte-identical (SHA-256 match), 1.333×
  size overhead (matches theoretical base64 4/3), write latency p50 2.3ms /
  p95 10.8ms for a ~133KB base64 string — still well inside the 150ms budget.
  This finalizes `get_blob()`'s payload type in Key Interfaces below.
- **(ii) compound-key `[slot_id, world_time]` cursor scan — PASS.** The
  multi-fire `create_callback()` pattern works as designed: fires once per
  matching record plus a final `cursor == null` call
  (`fire_count == record_count + 1`, verified). Records returned in correct
  ascending `world_time` order, correctly filtered to the target `slot_id`.
- **(iii) multi-store transaction — PASS, commit and abort variants both
  verified.** One `readwrite` transaction spanning `snapshot_store` +
  `turn_records` fires `oncomplete` exactly once with both the snapshot
  persisted and the old records deleted; calling `tx.abort()` rolls back
  both stores together (snapshot absent, deletes reverted).

No fallback is needed for (ii)/(iii) — D1/D2's compound-key load path and
compaction transaction stand as designed. Only (i) changes a contract, and
that change is captured in Key Interfaces.

A load-time gotcha surfaced during the re-run, engine-version-specific to
4.6: GDScript's static type-checker rejects an `int` index on
`JavaScriptObject` at parse time (`str(i)` required instead) — see
Implementation Guidelines below and
`docs/engine-reference/godot/modules/web-export.md`.

### D1b. Third checkpoint: hack-write commit (propagated from `character-customization-mode.md` Rule #6a, 2026-08-13)

hệ #16 (Character Customization Mode, Approved 2026-08-13) introduces a write
path that commits durably **outside** Turn Manager's Resolving→Confirmed
cycle entirely — Core Rule #1's "Auto-save duy nhất tại 2 checkpoint" wording
is now factually incomplete and must read **3**: (1) Turn Confirmed, (2)
periodic full-flush, (3) hack-write/delete commit.

**Schema decision**: extend `turn_records`' compound key from 2 segments to
3 — `[slot_id, world_time, hack_seq]` — rather than opening a fourth object
store or forcing an out-of-cadence full-snapshot flush (Rule #6a2's other
named option). Rationale: a hack-write commit deliberately keeps `world_time`
unchanged (hệ #16 Rule #6d — no turn is consumed), so it CANNOT reuse the
existing 2-segment key without overwriting the just-confirmed turn's
`locked_result`/`narration_text` and corrupting ADR-0004's undo-tombstone
record at that same key. Widening the key is backward-compatible: every
ordinary turn-confirm write (D1's original design) implicitly writes
`hack_seq=0`; a hack-write/delete commit writes `hack_seq=1, 2, 3...`
(incrementing per `world_time`, reset for the next `world_time`). This is a
**generalization** of the already-validated compound-key cursor scan
(Experiment 2b, D1a) — a 3-segment `IDBKeyRange` scan orders records exactly
the same way a 2-segment one does, just with a finer tiebreaker — not a new
mechanism requiring its own prototype pass.

The out-of-cadence full-flush alternative was rejected: it would write the
**entire** snapshot blob on every hack-write commit, directly undoing Core
Rule #3's append-only-constant-cost design for a feature whose own GDD
expects repeated experimentation (multiple "Lưu" clicks in one panel-open
session, per hệ #16's 3-buttons-per-zone UI model) — the cost would scale
with usage of the panel, not with turns, the opposite of what Core Rule #3
exists to guarantee.

**Load-time replay ordering**: Persistence's existing replay (latest
snapshot + `turn_records` since it, in key order) now walks `(world_time,
hack_seq)` ascending — `hack_seq=0` (the turn's own confirmed result) applies
first for each `world_time`, then any hack-write records for that same
`world_time` apply in sequence after it. This satisfies hệ #16 Rule #6a2's
requirement verbatim: "hack-write sau lượt T, trước lượt T+1."

**No new StorageBackend method required** — a hack-write commit calls the
same `stage()`/`commit()` seam (D2) as any other write, just from a
different caller (hệ #16's O-Customize save handler) with a different key
shape for its blob. `durability_confirmed` semantics (D1) are unchanged:
`oncomplete` on that transaction is still the boundary.

**Implementation guidance — 2 correctness hazards flagged by `godot-specialist`
review (2026-08-13), both silent-data-loss classes, both required before
coding the Load/write path against this section:**

- **Range-scan bound width (BLOCKING).** Experiment 2b's already-verified
  cursor-scan pattern built its `IDBKeyRange.bound(lower, upper)` with both
  bounds the SAME length as the (then 2-segment) key. That pattern must NOT
  be reused unmodified now that the key is 3 segments: IndexedDB's array-key
  comparison rule says a shorter array always sorts BEFORE a longer array
  sharing its prefix, so a naively-reused 2-segment upper bound at
  `[slot_id, world_time_max]` would silently exclude every real hack-write
  record at that same `world_time` — `[slot_id, world_time_max, 1]`,
  `[slot_id, world_time_max, 2]`, etc. all sort AFTER that 2-segment bound,
  not before it, and drop out of the scan with no error. **Every bound for a
  `world_time`-scoped scan must be constructed as a full 3-segment array.**
  The safe pattern for an inclusive-upper-bound-at-`world_time_max` scan:
  use `world_time_max + 1` (not `world_time_max`) as the second segment of
  the upper bound, with `hack_seq = 0` as the third — i.e. the upper bound
  is the first key of the NEXT `world_time`, exclusive. This sidesteps the
  array-length comparison hazard entirely and requires no knowledge of the
  actual maximum `hack_seq` in use.
- **`hack_seq` rehydration across a session boundary (BLOCKING).** This
  section does not specify how the per-`world_time` `hack_seq` counter is
  recovered after a slot re-opens with `world_time` unchanged (e.g. player
  hack-writes twice, closes the tab with no new turn confirmed, reopens,
  hack-writes again). If `hack_seq` is tracked as an in-memory counter reset
  on load rather than derived from storage, the third hack-write's `put()`
  can silently overwrite an earlier hack-write at the same key — the exact
  "lost hack-write, no error" failure hệ #16's own Rule #7 treats as
  unacceptable when caused by an engine bug rather than player intent.
  **Required rule**: the next `hack_seq` to use for a given `[slot_id,
  world_time]` is always `1 + max(hack_seq already present for that
  [slot_id, world_time])`, computed via the same already-verified
  compound-key cursor scan (Experiment 2b/D1a) — never an independent
  in-memory counter that isn't reconciled against storage on slot-open.

### D2. The `stage()`/`commit()` seam maps onto the transaction boundary

Core Rule #3's mandated internal 2-phase interface:

- `stage(blobs[])` — gather + serialize registered systems' blobs. Pure
  GDScript, synchronous, no I/O. This is where the test seam lives.
- `commit()` — open ONE `readwrite` transaction, `put` all staged records,
  resolve `durability_confirmed` on `oncomplete`; `abort()` maps to
  `transaction.abort()`.

Mock protocol for the blocked ACs: a `StorageBackend` interface (DI) with the
real IDB implementation and a mock that can (i) fail between `stage` and
`commit` (AC-17's "interrupted mid-transaction" model), (ii) hang inside
`commit` (AC-22's in-flight hook). AC-29's "real layer" measurement is
answered by the prototype's latency evidence and re-verified in implementation
via the same harness. **TOCTOU rule** (Formula #2 companion): each system
exposes ONE atomic `get_blob() -> {status, bytes}` call — status and content
are read in the same call, never separately.

**Blob-gather timeout**: `stage()` is synchronous single-frame work in MVP
(every registered system returns its serialized state directly). The Formula
#2 timeout constant is therefore `blob_gather_timeout_ms = 100` implemented
as a post-hoc assertion (if `stage()` exceeded it, log + raise
`WRITE_FAILED_INTERNAL`) rather than a mid-call watchdog — a hung synchronous
call cannot be preempted on one thread anyway; the constant exists to make
the failure loud and budgeted, not to cancel.

### D3. Cross-tab locking: Web Locks API, per-slot, held for the session

- Lock name: `slot-{slot_id}`, acquired at slot open with
  `navigator.locks.request(name, {ifAvailable: true}, cb)` — instant `null`
  rejection when held (AC-18's "detect immediately" requirement; the queueing
  default is explicitly NOT used).
- **Holding pattern (prototype #3's decisive finding)**: the naive pattern —
  bridged GDScript callback *returns* a pending Promise — **does not work**:
  Callable return values do not cross the bridge (JS receives `undefined`,
  the lock releases immediately). The working eval-free pattern: construct
  the pending Promise from GDScript
  (`create_object("Promise", executor_callback)`, stash `resolve`), then pass
  **`Promise.resolve.bind(Promise, pendingPromise)`** (built via
  `get_interface("Promise")` + `.bind()`) as the lock callback. Verified:
  lock held per `locks.query()` across a GDScript-controlled duration,
  concurrent `{ifAvailable:true}` probe rejected while held, clean release
  after GDScript invokes the stashed `resolve`.
- Release: explicit resolve on clean slot close; browser-automatic release on
  tab close/crash (AC-33's release condition — no heartbeat needed).
- Bridge landmine (document in code): invoking a stashed JS function via
  `.call()` collides with GDScript's `Object.call()` — park the function as a
  property on a fresh JS object and invoke through that.
- Fallback (**only** if a target device in the #4 matrix lacks
  `navigator.locks`): manual lock record + heartbeat/timeout. Not the
  baseline; support floor is Safari/WebKit 15.4+ per spike.

### D4. Quota measurement and persistence grant

- Formula #3's `quota_bytes_total(origin)` via
  `get_interface("navigator").storage.estimate()` (awaited with the shared
  promise utility). Browser fuzzing is by design → `quota_warn_threshold =
  0.85` margin absorbs it; per-slot byte accounting (Formula #1) uses our own
  serialized-length counters in `slots`, not `estimate()`.
- `navigator.storage.persist()` requested once at first save; treat the grant
  as best-effort. Prototype observed **denied** even on desktop headless
  Chrome (quota still ~10.7GB) — denial is the expected common case; the
  Safari-ITP 7-day eviction risk therefore stays real and is exactly what the
  #4 device matrix must measure.

### D5. Physical compression: NONE in MVP

`compression_ratio = 1` (the GDD's stated safe default). Core Rule #7 demands
this ADR pick the compression unit explicitly if compression is ever adopted:
**the unit is (b) — compress only at periodic full-flush (snapshot records)**,
never per ordinary turn commit. Rationale: turn records are small (~KB) where
compression overhead beats savings; snapshots are the only large objects and
are written off the critical path. Per-turn-record compression (unit (a)) is
rejected. Revisit only if Formula #1 projections show quota pressure in real
playtests.

### D6. `schema_version` posture

Pre-1.0: save-breaking bumps are acceptable (solo project, player == 
developer) — per the GDD's recorded creative-director recommendation. Three
triggers bump it: N changes (system added/removed from the bundle), any
registered system changing its internal blob format, AND any change to the
physical key shape of an existing object store (e.g. D1b's `turn_records`
key widening from `[slot_id, world_time]` to `[slot_id, world_time,
hack_seq]`, 2026-08-13 — the 3rd trigger, added when D1b's own text already
assumed a bump without D6 explicitly naming this case). A real migration
strategy becomes mandatory **before the first external player**; that future
ADR supersedes this section only.

### D7. What stays decided elsewhere

- Turn record field contents (`turn_snapshot` schema) — still owned by
  `turn-manager.md`'s open question; this ADR fixes the storage envelope,
  not the payload schema.
- Save Slot Screen virtualization — `core-ui-screen-navigation.md`.
- Prototype item **#6** (zombie-request billing) — belongs to the AI-backend
  ADR (it is an AI-layer cost item; noted here only because the same
  prototype list carried it).

### Architecture Diagram

```
Turn Manager (Resolving → Turn Confirmed gate)
      │  durability_confirmed?
      ▼
Persistence (GDScript)
  stage(blobs[])  ── pure, sync, DI test seam (mock: fail/hang here)
      │
  commit()
      │  JavaScriptBridge (get_interface / create_object / create_callback,
      │                    NO eval — Forbidden Pattern)
      ▼
IndexedDB `game_persistence` v1
  ┌─────────┬──────────────────────┬───────────────┐
  │ slots   │ turn_records         │ snapshots     │
  │ slot_id │ [slot_id,world_time] │ [slot_id, wt] │
  └─────────┴──────────────────────┴───────────────┘
      │  ONE readwrite tx per turn (append-only records)
      │  oncomplete ──► durability_confirmed = true ──► transition allowed
      │
  full-flush (idle): snapshot put + old records delete, SAME tx
──────────────────────────────────────────────────────────────
Web Locks: navigator.locks.request("slot-{id}", {ifAvailable:true},
  Promise.resolve.bind(Promise, pendingPromise))   ← held until GDScript
  resolves; auto-released on tab close/crash
```

### Key Interfaces

Three separate contracts (specialist note: they are NOT one class). Written
as compilable 4.6 GDScript using `@abstract` (available since 4.5 per
`deprecated-apis.md`/`breaking-changes.md`):

```gdscript
## 1) Storage backend seam (DI; real = IndexedDB glue, mock = test double)
@abstract
class_name StorageBackend
extends RefCounted
signal committed(world_time: int)              # == durability_confirmed
signal failed(error_code: StringName)          # Error Taxonomy codes
@abstract func stage(blobs: Array[Dictionary]) -> void  # gather+serialize; sync, no I/O
@abstract func commit() -> void                # async under the hood; result ONLY via signals
@abstract func abort() -> void

## 2) Per-system blob contract (TOCTOU rule: one atomic call per system)
## Payload type FINALIZED by Experiment 2b (D1a, 2026-08-11): "bytes" is a
## String, never PackedByteArray — a raw PackedByteArray silently fails to
## cross the JavaScriptBridge (arrives as JS undefined; IDB put "succeeds"
## but reads back null, no error). Systems whose native blob is structured
## data JSON.stringify() it directly (as #2's payloads do); systems whose
## native blob is genuinely binary must Marshalls.raw_to_base64() it first
## (~1.5ms/100KB, byte-identical round-trip verified).
@abstract func get_blob() -> Dictionary        # { "status": StringName, "bytes": String }

## 3) Slot lock (Web Locks). NOTE: acquire is a COROUTINE — it awaits the
## navigator.locks.request() callback; call sites must `await` it (AC-18's
## "instant" applies to the browser's grant/reject decision, not to the
## call being synchronous).
@abstract func acquire_slot_lock(slot_id: int) -> bool  # await; false == held elsewhere
@abstract func release_slot_lock(slot_id: int) -> void  # resolves the stashed Promise
```

### Implementation Guidelines

- Reuse the prototype's verified glue patterns (`prototypes/persistence-web/main.gd`)
  as *reference only* — rewrite to production standards per
  `.claude/rules/prototype-code.md`; the prototype directory is frozen.
- All JS objects that must outlive a call (db handle, stashed resolvers) must
  be parked on a persistent JS object or kept as GDScript-held
  `JavaScriptObject` references — a garbage-collected callback is silently
  never called (spike warning).
- Bridge gotchas codified from the prototype (they outlive the frozen
  prototype directory): (a) `JavaScriptBridge.create_object()` returns
  `Variant` — `:=` inference is rejected under warnings-as-errors; declare
  explicit types; (b) attach JS event handlers via `addEventListener(...)`,
  never by setting `onX` properties through the bridge; (c) never invoke a
  stashed JS function via `.call()` (collides with GDScript `Object.call()`)
  — park it as a property on a fresh JS object and invoke through that;
  (d) indexing a `JavaScriptObject` with an `int` (e.g. building a JS array
  key-by-key) is rejected by the GDScript 4.6 static type-checker at PARSE
  time (`"Only String or StringName can be used as index"`) — a whole-script
  load failure, not a runtime one. Use `arr[str(i)] = value`; JS treats
  numeric-string keys on an `Array` identically to numeric ones.
- Non-Web platforms (editor/desktop dev runs): provide a `FileAccess`-based
  `StorageBackend` implementation behind the same seam for development
  convenience only — it is NOT the durability reference and must not weaken
  the Web contract (guard with `OS.has_feature("web")` routing). Note the
  4.4 breaking change: `FileAccess.store_*()` returns `bool` — check it.

## Alternatives Considered

### Alternative 1: `FileAccess`/`user://` over IDBFS (option (a))
- **Description**: Godot's default Web persistence; write files, rely on
  IDBFS auto-sync.
- **Pros**: zero JS glue; engine-native; real multi-file atomicity per sync
  pass (spike-verified); prototype #5 showed its mtime granularity is ms (the
  feared same-second silent skip is measured-unreachable via the
  write→next-frame-sync path, n=8).
- **Cons**: `syncfs()` completion is **unobservable from GDScript** —
  `durability_confirmed` cannot be implemented, Core Rule #1's gate becomes
  fiction; per-file mtime bookkeeping cost; still IndexedDB underneath.
- **Rejection Reason**: fails the controllability requirement — the single
  reason the GDD locked (b). (If (b)'s cost had proven prohibitive, the
  honest move per the GDD is to weaken Core Rule #1's posture explicitly —
  the prototype's 7× latency headroom shows no such weakening is needed.)

### Alternative 2: `localStorage`
- **Description**: string key-value store, synchronous API.
- **Pros**: trivial API; synchronous = no callback plumbing.
- **Cons**: ~5–10MB caps (Formula #1 proves unbounded journal growth);
  string-only (base64 inflation ~33%); no transactions → multi-blob atomicity
  would have to be hand-built; synchronous writes block the single main thread.
- **Rejection Reason**: capacity and atomicity are both disqualifying.

### Alternative 3: OPFS (Origin Private File System)
- **Description**: modern file-system-ish storage; sync access handles.
- **Pros**: fast; real file semantics; growing support.
- **Cons** *(assessment tag: LIKELY — not covered by the spike or prototype;
  from web-platform documentation, not project-verified evidence)*: sync
  access handles require a worker (nothreads export forecloses it); no Godot
  integration — strictly more glue than IndexedDB for zero additional
  guarantee (durable commit signaling is what IDB's `oncomplete` already
  provides); weaker WebView support floor than IDB.
- **Rejection Reason**: more cost, no benefit over (b) for this project's
  targets. If this alternative is ever revisited, its claims must first be
  upgraded to VERIFIED per the project's evidence discipline.

## Consequences

### Positive
- Core Rule #1's gate becomes real: `durability_confirmed` is a genuine
  browser commit event, measured at 0.6–14.2ms p50 (1KB–1MB), max 20.9ms —
  ~7× headroom under the 150ms budget, including serialization.
- Multi-blob atomicity AND compaction atomicity both ride native IDB
  transactions — no hand-rolled journal repair logic.
- Instant multi-tab rejection + crash-safe auto-release with zero heartbeat
  infrastructure.
- The blocked AC set (AC-17/22/29/33) is now specifiable; implementation can
  start.

### Negative
- A JS-glue layer (~the prototype's surface) must be maintained alongside
  GDScript; bridge landmines (`.call()` collision, GC'd callbacks) are
  documented but remain sharp edges.
- Bypassing `user://` means standard Godot save-file tooling/debug workflows
  don't see our data; QA export (Core Rule #9) is the inspection path.
- Desktop/editor dev runs need a second backend implementation behind the
  seam (small, but real).

### Neutral
- The IDBFS-era "1 file per turn" prose maps to "1 record per turn" — same
  cost model, different container.

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| In-app WebViews (Zalo/FB/Messenger/iOS WKWebView) restrict IDB quota/Web Locks/persist() differently than desktop | Medium | High (they are the real distribution channel) | Prototype item #4 harness ready (`DEVICE-TEST.md`, https tunnel, on-page overlay + `device-reports.json`); run BEFORE first public deploy; D3 names the heartbeat fallback if Web Locks is absent on a target |
| Sandboxed-iframe embedding (itch.io-style HTML5 portals) partitions or disables IndexedDB/Web Locks differently than a top-level browsing context | Medium (if that distribution channel is used) | High | Distinct test case added to the #4 matrix (open the harness inside an itch.io-like `<iframe sandbox>` page); if that channel is chosen for distribution, its result gates the deploy the same way the WebView rows do |
| Safari ITP ~7-day eviction wipes saves of lapsed players | Medium (Safari) | High vs Pillar 2 | `persist()` requested (best-effort); measure grant reality in #4; if denied on iOS, surface an in-game "export your journal" nudge (Core Rule #9 export exists) — product decision escalates only with real data |
| Promise/lock glue regresses under a future Godot upgrade | Low | Medium | Pattern is engine-source-verified for 4.6 and pinned; Engine Compatibility table forces re-validation on upgrade per template rule |
| Compaction bug loses turns | Low | High | Compaction is single-transaction (all-or-nothing) + GUT/mock tests at the seam + AC-07 byte-identity check on load |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| Autosave e2e (append-only, 1KB–100KB typical) | n/a | 0.6–2.0ms p50, ≤9.2ms observed max (prototype, desktop Chrome) | 150ms (`max_perceived_autosave_latency_ms`) |
| Autosave e2e (1MB pathological turn) | n/a | 14.2ms p50 / 20.9ms max | 150ms |
| Full-flush (snapshot + delete) | n/a | off-critical-path (idle); measure in implementation | none (explicitly outside the latency budget) |
| Memory | n/a | + one staged-bundle copy during commit | within Web ceiling (TBD in `technical-preferences.md`) |

## Migration Plan

0. **Experiment 2b — DONE (2026-08-11).** Proved PackedByteArray↔bridge
   marshalling (fails; String/base64 is the contract), compound-key
   `IDBKeyRange` cursor scans via a multi-fire callback (pass), and a
   multi-store `readwrite` transaction (pass, commit + abort) — in
   `prototypes/persistence-web/`. `get_blob()`'s payload type is finalized in
   Key Interfaces above. Pre-implementation gate cleared; steps 1+ may begin.
1. Implement `StorageBackend` seam + mock; write AC-03/17/22 tests against
   the mock (they were blocked on this ADR).
2. Implement the IDB glue (reference: prototype `main.gd` patterns; rewrite,
   don't copy). Static check: no `JavaScriptBridge.eval` anywhere (extends
   the existing Forbidden Patterns CI grep).
3. Implement Web Locks acquire/hold/release per D3.
4. Wire Turn Manager's transition gate to `committed` (Core Rule #1).
5. Implement full-flush compaction + load-merge; AC-07 byte-identity test.
6. Run the #4 device matrix before first public deploy (verification
   condition; results appended to `prototypes/persistence-web/README.md`).

**Rollback plan**: if (b) proves unworkable on a must-have device in #4, do
NOT silently revert to (a) — per the GDD's honest-posture note, the correct
rollback is an explicit Core Rule #1 posture weakening
(`durability_confirmed` := "MEMFS write returned" + best-effort sync) via a
superseding ADR, keeping the seam so only the backend implementation swaps.

## Validation Criteria

- [ ] AC-17/AC-22 expressible and green against the mock seam with no
      backend-specific code in the tests.
- [ ] AC-29 measured on the real backend within budget on desktop + at least
      one real mobile WebView from the #4 matrix.
- [ ] AC-33: lock freed by tab kill (not just clean close) on desktop Chrome
      + iOS Safari.
- [ ] AC-18: second tab slot-open rejection is instant (no queue-wait) on all
      #4 matrix browsers that have Web Locks.
- [ ] Compaction: after `FLUSH_EVERY_N_TURNS` turns + flush, load-merge
      reproduces identical state to pre-flush (byte-identity per AC-07).
- [ ] D1b (added 2026-08-13, `godot-specialist` review): a test proves a
      3-segment upper-bound scan at `world_time_max` (constructed per the
      "next `world_time`, exclusive" pattern above) still returns every
      hack-write record at `world_time_max` — regression test for finding
      1A.
- [ ] D1b: a test proves reopening a slot and hack-writing again at an
      unchanged `world_time` produces `hack_seq = 1 + previous max`, not a
      reset-to-1 overwrite — regression test for finding 1B.

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `persistence-save-system.md` | Persistence | Core Rule #1/#3: `durability_confirmed` must be the real durable-commit boundary, observable, gating transitions | D1: `transaction.oncomplete` IS the boundary; prototype-verified reachable + measured |
| `persistence-save-system.md` | Persistence | Core Rule #3: append-only ~constant per-turn cost; full-flush must compact AND delete | D1: 1 record/turn; compaction deletes in the same tx |
| `persistence-save-system.md` | Persistence | Core Rule #3 seam: `stage()`/`commit()` 2-phase interface for AC-03/17/22 | D2: seam + mock protocol defined |
| `persistence-save-system.md` | Persistence | Core Rule #7: compression unit must be explicitly (a) or (b) | D5: none in MVP; unit locked to (b) full-flush-only if ever adopted |
| `persistence-save-system.md` | Persistence | Core Rule #8: migrate-vs-refuse posture + bump triggers | D6: pre-1.0 save-breaking accepted; both triggers bump |
| `persistence-save-system.md` | Persistence | Edge Case multi-tab + AC-18/AC-33: instant rejection, defined release | D3: `{ifAvailable:true}` + auto-release; holding pattern prototype-proven |
| `persistence-save-system.md` | Persistence | Formula #2: gather timeout constant + TOCTOU atomicity | D2: `blob_gather_timeout_ms=100` assertion + single `get_blob()` call |
| `persistence-save-system.md` | Persistence | Formula #3: quota measurement API + margin rationale | D4: `estimate()` via bridge; fuzzing absorbed by `quota_warn_threshold=0.85` |
| `turn-manager.md` | Turn Manager | Core Rule #4 / States: Turn Confirmed == durably saved | D1 gate wiring (Migration step 4) |
| `world-memory-context-management.md` | World Memory | Full journal persisted losslessly (AC-07 cross-ref) | D5 lossless-or-none; load-merge byte-identity validation |
| `character-customization-mode.md` | Character Customization Mode | Rule #6a (checkpoint thứ 3: hack-write commits durably outside the turn cycle) + Rule #6a2 (must not collide with the turn-record key) | D1b: `turn_records` key widened to `[slot_id, world_time, hack_seq]`, `hack_seq=0` for ordinary turns, `1,2,3...` for hack-writes at that `world_time` — propagated 2026-08-13, hệ #16 Approved vòng 4. |

## Related Decisions

- `docs/engine-reference/godot/modules/web-export.md` — source-verified spike
  this ADR builds on (Q5/Q6/Q7/Q8).
- `prototypes/persistence-web/` — executed evidence (results.json), frozen as
  archival per prototype rules.
- `docs/architecture/adr-0001-combat-spec-authority.md` — sibling ADR;
  methodology precedent only.
- Future: AI-backend ADR (Gemini choice + referrer restriction + zombie-cost
  measurement #6); post-external-player save-migration ADR (supersedes D6).
