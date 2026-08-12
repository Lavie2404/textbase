# Prototype: persistence-web

Real Godot 4.6 Web-export prototype for the Persistence/Save System ADR.
Empirically tests open items **#2, #3, #5** from the ranked list at the end of
`docs/engine-reference/godot/modules/web-export.md`. Throwaway code per
`.claude/rules/prototype-code.md`. `JavaScriptBridge.eval()` is NOT used
anywhere — only `get_interface()` / `create_object()` / `create_callback()`.

## Status: CONCLUDED (2026-08-11, Experiment 2b added same day on a machine
migration — see #2b below; #2/#3/#5 findings below are from the original run)

Measured on: Windows 11, headless Chrome 151, Godot 4.6-stable Web export
(nothreads variant, `variant/thread_support=false`, no COOP/COEP). Full raw
data: `results.json`. Item #4 (real-device WebView matrix) is NOT covered here
— see `DEVICE-TEST.md`.

## Hypotheses tested

1. **#2** — `transaction.oncomplete` of a real IndexedDB `readwrite`
   transaction driven entirely through `JavaScriptBridge` reaches GDScript via
   `create_callback()`, and end-to-end save latency (JSON serialize on the
   single main thread + `put` + commit) fits inside
   `max_perceived_autosave_latency_ms` (Tuning Knob default **150 ms**,
   `design/gdd/persistence-save-system.md`).
2. **#3** — a Web Lock can be held for a GDScript-controlled duration by
   returning a pending JS Promise (constructed from GDScript via
   `create_object("Promise", executor_cb)`, `resolve` stashed, called later),
   with `{ifAvailable: true}` rejection observable while held.
3. **#5** — IDBFS reconcile skips a rewrite when local and remote mtimes
   collide; does overwrite-within-the-same-second silently lose data?
4. **#2b** (added after engine-specialist ADR-0002 review, pre-implementation
   gate) — three bridge mechanisms the original #2 pass never exercised:
   `PackedByteArray` marshalling, a compound-key `IDBKeyRange` cursor scan
   through a multi-fire callback, and a multi-store `readwrite` transaction
   (commit + abort variants).

## How to run

```
# 1. Export (only needed after editing main.gd):
"<godot 4.6 console exe>" --headless --path prototypes/persistence-web --import
"<godot 4.6 console exe>" --headless --path prototypes/persistence-web --export-release "Web" build/index.html

# 2. Full automated run (serves build/, drives headless Chrome through
#    phase 1 then a page reload as phase 2, prints verdicts, writes results.json):
python prototypes/persistence-web/run_prototype.py

# LAN serving for real-device tests (item #4): see DEVICE-TEST.md
python prototypes/persistence-web/run_prototype.py --serve
```

## Findings

### #2 IndexedDB-via-JavaScriptBridge write path — PASS

- `transaction.oncomplete` **does** reach GDScript through
  `create_callback()` attached with `addEventListener("complete", cb)`.
  Ordering is correct in all 24 iterations: `put` request `success` fired
  first, `complete` after it. `durability_confirmed` is therefore a real,
  awaitable event from GDScript — confirming web-export.md Q6's option (b).
- End-to-end latency (JSON.stringify of a Dictionary + `put` + wait for
  `oncomplete`), 8 iterations per size:

  | payload | p50 e2e | p95/max e2e | p50 serialize | budget 150 ms |
  |---|---|---|---|---|
  | ~1 KB   | 0.6 ms  | 9.2 ms  | ~0.0 ms | PASS (~16x headroom at p95) |
  | ~100 KB | 2.0 ms  | 6.6 ms  | 0.4 ms  | PASS |
  | ~1 MB   | 14.2 ms | 20.9 ms | 3.7 ms  | PASS (~7x headroom at max) |

  Raw spreads in `results.json` (`e2e_ms_all`). Desktop-class numbers; mobile
  WebViews must be re-measured via `DEVICE-TEST.md`, but the headroom is large.
- Gotchas that cost iteration time, worth carrying into the ADR:
  - `JavaScriptBridge.create_object()` returns Variant — GDScript
    warnings-as-errors rejects `:=` inference on it.
  - Every `create_callback()` result must be kept referenced or it never fires
    (confirmed engine-doc behaviour; this prototype parks them in an array).
  - Attach handlers via `addEventListener(...)` (method call); avoids relying
    on property-set of `onX` through the bridge.

### #3 Web Locks held across a session from GDScript — PASS (with a required twist)

- **The naive pattern fails exactly as web-export.md Q7 predicted**: a
  `create_callback()` Callable that `return`s the pending Promise does NOT
  propagate its return value across the bridge. Observed failure mode
  (`direct_return` in results.json): lock IS granted (callback called with a
  non-null Lock), but `navigator.locks.request()`'s promise settles ~immediately,
  `locks.query()` shows the lock not held, and a concurrent
  `{ifAvailable:true}` probe acquires it. The bridged JS closure returns
  `undefined`, so the lock releases as soon as the callback returns.
- **Working pattern (`bind_trick`), still 100% eval-free**: pass
  `Promise.resolve.bind(Promise, pending)` as the lock callback —
  built as `get_interface("Promise").resolve.bind(promise_iface, pending)`.
  Calling it yields `Promise.resolve(pending)`, which stays pending until the
  GDScript-held `resolve` is invoked. Verified end to end:
  - (a) lock acquired: `locks.query()` lists it as held; request promise pending.
  - (b) while held: second `{ifAvailable:true}` request receives `null` (busy).
  - (c) held across an arbitrary GDScript-controlled duration (1 s+), then
    GDScript invokes the stashed `resolve` → request promise settles,
    `query()` no longer lists the lock, third `ifAvailable` request acquires it.
- Two bridge landmines encountered:
  - Invoking a stashed JS function: `fn.call(...)` collides with GDScript
    `Object.call()`. Workaround: park it on a fresh JS object and invoke as a
    method (`holder.fn = fn; holder.fn(null)`).
  - The Promise executor runs synchronously inside `create_object("Promise", cb)`,
    so `resolve` is available immediately after the call — confirmed.
- The documented fallback (heartbeat/timeout lock record) is NOT needed on
  API grounds; keep it only if the device matrix (#4) shows Web Locks missing.

### #5 IDBFS mtime-collision skip — no data loss observed; ms-granularity confirmed

Method: per trial, write A to a `user://` file, `force_fs_sync()`, wait for the
next-frame sync to commit, verify **directly in IndexedDB** (DB `"/userfs"`,
store `FILE_DATA`, key = `ProjectSettings.globalize_path(...)` =
`/userfs/godot/app_userdata/<project>/...`) that A landed, then overwrite with
B **in the same wall-clock second**, sync again, and finally reload the page
(fresh Chrome process, same profile) and read the file back.

- 8/8 same-second trials (4 with ~250 ms gap, 4 with ~70 ms gap): remote record
  held A before the B write (so a genuine skip opportunity existed), held B
  after, and **B survived the reload every time**. Control trial (different
  second) also survived.
- The stored IDBFS `timestamp` values are **millisecond-resolution** (raw epoch
  ms in `results.json`; stored-mtime deltas equal the wall-clock write gap to
  the ms, e.g. 69 ms / 252 ms). So the reconcile's equal-mtime skip triggers
  only on a same-**millisecond** collision — and since a sync pass must
  complete between the two writes (≥ 1 frame ≈ 16 ms), that state is
  unreachable through the normal `FileAccess` → next-frame-sync path.
- Verdict for the ADR: web-export.md Q5's "UNVERIFIED sub-item" can be marked
  measured — same-second overwrites are safe on this engine/emscripten build
  (evidence-gathering result, n=8; not a formal proof).

### #2b Bridge marshalling mechanics — 2/3 PASS, 1 conclusive fallback

Re-run 2026-08-11 on a machine migration (fresh Godot 4.6 install + export
templates). Full raw data: `results.json` → `phase1.exp2b_bridge_mechanics`.

**(i) `PackedByteArray` across the bridge — FAILS, silently.** Passing a raw
`PackedByteArray` as a bridge call argument does NOT produce a JS byte array:
`new Uint8Array(bytes).length` reads back `0`, and
`Object.prototype.toString.apply(bytes)` reports `"[object Undefined]"` — the
value arrives as JS `undefined`. Worse: `IDBObjectStore.put(bytes, key)`
**reports success** (`put.ok == true`) but the stored value reads back as
GDScript `null`/`TYPE_NIL` — IndexedDB silently stored/returned nothing, no
error anywhere in the chain. **Do not pass `PackedByteArray` directly to a
bridge call.** The working path: `Marshalls.raw_to_base64()` (native
GDScript, no bridge call — 1.5 ms for a 100 KB payload) then write the
resulting string the same way `#2` writes JSON strings. Verified
byte-identical round-trip via SHA-256 (`roundtrip_hash_match: true`,
`roundtrip_size_match: true`). Overhead ratio measured 1.333× (matches the
theoretical 4/3 base64 expansion). Write latency for the ~133 KB base64
string: p50 2.3 ms, p95/max 10.8 ms — still comfortably inside the 150 ms
budget. **This settles ADR-0002 D1a/Key Interfaces: `get_blob()`'s payload is
a `String` (JSON, base64-wrapped only if the system's native blob is
binary), never `PackedByteArray`.**

**(ii) Compound key `[slot_id, world_time]` + multi-fire cursor — PASS.**
`create_callback()` fires once per matching record plus one final call with
`cursor == null` marking end-of-range (`fire_count == record_count + 1`,
verified 6 == 5 + 1). `cursor.continue()` cannot be written in GDScript at
all (`continue` is a reserved statement keyword — parse error after `.`); the
spec-equivalent `cursor.advance(1)` works. Records scanned via
`IDBKeyRange.bound(lower, upper)` on JS-array compound keys came back in
correct ascending `world_time` order, filtered correctly to `slot_id == 1`
only. Building the JS-array keys uses the existing `_make_js_array()` helper
(see gotcha below for the fix it needed on this engine version).

**(iii) Multi-store `readwrite` transaction — PASS, both variants.** A single
transaction spanning `snapshot_store` + `turn_records_test` (put + deletes)
fires `oncomplete` exactly once, with the snapshot persisted and the deleted
records gone (commit variant). Calling `tx.abort()` after queuing the same
operations rolls back **both** stores — snapshot absent, deletes reverted —
confirmed via direct reads after the `abort` event settles.

**Gotcha found on this engine version (Godot 4.6-stable), cost real debugging
time**: GDScript's static type-checker rejects an `int` index on
`JavaScriptObject` at **parse** time — `"Only String or StringName can be
used as index for type JavaScriptObject"`. This is a load-time failure (the
whole script fails to compile), not a runtime one, so `_ready()` never runs
and nothing ever POSTs `/report` — from the harness side this looks
indistinguishable from a hang until you check Godot's own stderr. Fix:
index with `str(i)` — JS treats numeric-string keys on an `Array` identically
to numeric ones (confirmed via the tostring-tag probe above), so
`arr[str(i)] = values[i]` still builds a real JS `Array`. Also logged in
`docs/engine-reference/godot/modules/web-export.md`.

### Bonus: device-info probes (all via bridge, no eval)

`navigator.storage.estimate()` → quota ~10.7 GB, `persist()` → **denied** in
headless Chrome (expected without user interaction/site engagement — reinforces
that `persist()` grant must be measured on real devices, item #4), Web Locks
and IndexedDB available, `OS.is_userfs_persistent()` = true.

## Files

- `project.godot`, `main.tscn`, `main.gd` — the prototype (all three
  experiments + on-screen overlay Label for device runs)
- `export_presets.cfg` — Web preset, `thread_support=false` (nothreads).
  **Gitignored** (repo `.gitignore` excludes it project-wide) — regenerate on
  a new machine before exporting; not committed with the prototype.
- `build/` — exported Web build (regenerate with the export command above)
- `run_prototype.py` — server + headless-Chrome harness, prints verdicts
- `results.json` — full raw data of the concluded run
- `DEVICE-TEST.md` — instructions for the remaining item #4 (real devices)
