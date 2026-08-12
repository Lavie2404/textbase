# Godot Web Export — Quick Reference

Last verified: 2026-08-08 | Engine: Godot 4.6 (source read at tag `4.6-stable`;
`4.6.3-stable` and `master` verified identical for the load-bearing files)

> **Scope**: this file exists to answer the technical spike flagged as the
> highest-priority Open Question by both `design/gdd/persistence-save-system.md`
> (Core Rule #3 — atomic write, option (a) `FileAccess`/`user://` vs option (b)
> real IndexedDB transaction) and `design/gdd/ai-llm-integration-layer.md`
> (Core Rules #3/#4, Formulas 1–3 — retry / model fallback / timeout budget).
>
> **Evidence policy**: every claim below is tagged `VERIFIED` (traced to engine
> source or an official spec/doc), `LIKELY` (sound inference from verified
> primitives, not directly documented), or `UNVERIFIED` (must be proven by a
> real prototype before an ADR depends on it). Do not upgrade a tag without new
> evidence.

## Primary Sources Read

Godot engine source (tag `4.6-stable`):

| File | What it settles |
|---|---|
| `platform/web/js/libs/library_godot_fetch.js` | How `HTTPRequest` actually works on Web; whether cancel aborts |
| `platform/web/http_client_web.cpp` / `.h` | Web `HTTPClient` restrictions, `close()` semantics |
| `scene/main/http_request.cpp` | `timeout`, `cancel_request()`, `ERR_BUSY`, thread handling |
| `platform/web/js/libs/library_godot_os.js` | IDBFS mount, `GodotFS.sync()` |
| `platform/web/os_web.cpp` / `.h` | When `syncfs` is actually triggered |
| `platform/web/js/libs/library_godot_javascript_singleton.js` | `JavaScriptBridge` internals, which calls use `eval` |
| `platform/web/export/export_plugin.cpp` | `variant/thread_support` default |
| `core/core_bind.cpp` | Which OS methods are exposed to GDScript |

Emscripten `4.0.11` (the version Godot 4.6 CI builds Web with, per
`.github/workflows/web_builds.yml` → `EM_VERSION: 4.0.11`):

- `src/lib/libidbfs.js` — the IDBFS ↔ IndexedDB layer under `user://`

External specs/docs: MDN (COEP, `StorageManager.estimate`, Web Locks),
WebKit blog, Godot docs `tutorials/export/exporting_for_web.rst`.

---

## What Changed Since ~4.3 (LLM Cutoff)

### 4.3 → 4.6

- **Single-threaded Web export is the DEFAULT.** `variant/thread_support`
  defaults to `false` (`export_plugin.cpp:372`). A default 4.6 Web export
  therefore does **not** use `SharedArrayBuffer` and does **not** require
  COOP/COEP headers. This was added in 4.3 and remains the default in 4.6.
  Enabling **Thread Support** or **Extensions Support** (GDExtension) is what
  forces cross-origin isolation.
- **Audio moved to Web Audio API "Sample" playback** (4.3+) so that
  non-threaded exports stay low-latency. Not relevant to this project's
  systems, listed for completeness.
- **`FileAccess.store_*()` now return `bool`** (4.4 core change, see
  `breaking-changes.md`). On Web this return value still only tells you the
  MEMFS write succeeded — see Q5/Q6 below, it says nothing about durability.
- **`HTTPClientWeb::get_response_body_length()` returns `-1` unconditionally**
  on Web (source comment cites GH-47597 / GH-79327). Never rely on
  `Content-Length` on Web.
- **No change to the Web fetch/abort implementation.** `library_godot_fetch.js`
  is byte-identical between `4.6-stable`, `4.6.3-stable`, and `master` — the
  cancel behaviour documented in Q3 is current, not a version artifact.

---

## Group A — `HTTPRequest` on Web Export (AI/LLM Integration Layer)

### Q1. Are COOP/COEP headers required for cross-origin `HTTPRequest` to the AI API?

**Verdict: VERIFIED — No. The original Open Question asks the wrong thing.**

Two independent facts:

1. **COOP/COEP are only needed to enable `SharedArrayBuffer`**, which Godot
   only needs when **Thread Support** or **Extensions Support** is enabled.
   The 4.6 default is `thread_support = false`
   (`export_plugin.cpp:372`: `ExportOption(PropertyInfo(Variant::BOOL,
   "variant/thread_support"), false, true)` — the comment on that line reads
   *"Thread support (i.e. run with or without COEP/COOP headers)"*). Official
   docs confirm: *"Enabling this feature requires the use of cross-origin
   isolation headers"* — i.e. only when enabled.
2. **Even if you DO enable cross-origin isolation, `COEP: require-corp` does
   not block the AI API call.** Godot's fetch is issued as
   `fetch(url, {method, headers, body})` with no `mode` override
   (`library_godot_fetch.js:92-97`), so it uses the Fetch default `mode: "cors"`.
   Per MDN: *"Requests made in `cors` mode won't be blocked by COEP or trigger
   COEP violations, but must still be permitted by CORS."*

**What actually gates the call is CORS, not COOP/COEP.** The AI endpoint must
return `Access-Control-Allow-Origin` covering the game's origin, and must
answer the preflight `OPTIONS` for a `POST` with `Content-Type: application/json`.
Godot cannot bypass this — the browser enforces it regardless of engine.

**Action for the ADR**: replace "verify COOP/COEP" with "verify the chosen AI
endpoint's CORS policy from a browser origin". Keep `thread_support = false`
(also required by the current design: see Q2 note on `use_threads`).

**Residual UNVERIFIED item**: whether `generativelanguage.googleapis.com`
serves the required CORS headers for a browser origin is an endpoint-policy
question, not a Godot question, and it can change without notice. Prove it with
a 10-line HTML `fetch()` page before the ADR commits to a direct-from-client
architecture (Core Rule #6).

### Q2. Can `HTTPRequest.timeout` be set dynamically before every `.request()`?

**Verdict: VERIFIED — Yes, and it is fully engine-side (platform independent).**

`timeout` is a plain property consumed at request time:

```cpp
// scene/main/http_request.cpp:118-125
Error HTTPRequest::request_raw(...) {
    ERR_FAIL_COND_V(!is_inside_tree(), ERR_UNCONFIGURED);
    ERR_FAIL_COND_V_MSG(requesting, ERR_BUSY, "HTTPRequest is processing a request...");
    if (timeout > 0) {
        timer->stop();
        timer->start(timeout);
    }
    ...
}
```

The timeout is implemented by a child `Timer` node created in the constructor
(`http_request.cpp:695-703`) with `set_one_shot(true)` and
`set_ignore_time_scale(true)`. It has no Web-specific code path at all —
`Formula 2`'s requirement to pass `min(request_timeout_default, t_remaining(n))`
on each attempt is directly supported.

On expiry: `_timeout()` → `cancel_request()` + `_defer_done(RESULT_TIMEOUT, ...)`
(`http_request.cpp:624-627`).

**On the `ERR_BUSY` sub-question**: reusing one `HTTPRequest` node across
retries is safe. `_request_done()` calls `cancel_request()` *before* emitting
`request_completed` (`http_request.cpp:512-516`), and `cancel_request()` sets
`requesting = false` synchronously (`:209`). So calling `.request()` from
inside the `request_completed` handler will **not** return `ERR_BUSY`. Same for
calling `.request()` immediately after an explicit `cancel_request()`.

**Caveats (VERIFIED from source, worth encoding as project rules):**

- `set_use_threads(true)` is compiled out unless `THREADS_ENABLED`
  (`http_request.cpp:538-543`), and `HTTPClientWeb::set_blocking_mode(true)`
  hard-fails (`http_client_web.cpp:188-190`). **Leave `use_threads = false`.**
  This is consistent with keeping `thread_support` off per Q1.
- The `Timer` inherits `process_mode`. If `get_tree().paused = true` while a
  request is in flight, **the timeout will not fire**. Formula 2's budget
  silently stops counting. Set the AI layer's `HTTPRequest` (and its timer) to
  `PROCESS_MODE_ALWAYS`, or guarantee the tree is never paused during a call.
- On Web the request can only advance **once per frame**
  (`http_client_web.cpp:234-243` warns if polled twice in a frame). Sub-frame
  latency measurements for `d_i` in Formula 2 are meaningless; quantise
  expectations to frame granularity.

### Q3. Does `cancel_request()` actually abort the browser-level request on Web?

**Verdict: VERIFIED — NO. It does not abort network traffic. This is the
load-bearing finding of the whole spike.**

The full chain: `HTTPRequest.cancel_request()` → `client->close()`
(`http_request.cpp:204`) → `HTTPClientWeb::close()` → `godot_js_fetch_free(js_id)`
(`http_client_web.cpp:118-121`) → `GodotFetch.free(id)`:

```js
// platform/web/js/libs/library_godot_fetch.js:102-115
free: function (id) {
    const obj = IDHandler.get(id);
    if (!obj) { return; }
    IDHandler.remove(id);
    if (!obj.request) { return; }
    // Try to abort
    obj.request.then(function (response) {
        response.abort();
    }).catch(function (e) { /* nothing to do */ });
},
```

Three defects visible in five lines:

1. **No `AbortController` anywhere in the file.** `create()` builds
   `init = {method, headers, body}` and calls `fetch(url, init)` with no
   `signal`. Without a signal there is no mechanism by which the browser
   request can be cancelled.
2. **`obj.request` is the fetch *Promise*, not the request.** The `.then()`
   only runs *after the response headers have already arrived* — i.e. after the
   part you wanted to cancel is already over. For a request cancelled while
   still in flight, this handler simply never runs.
3. **`Response.abort()` does not exist** in the Fetch spec. When the `.then()`
   does run, it throws a `TypeError`, which is swallowed by the `.catch()`.
   The abort is a no-op even in the one case where it executes.

Confirmed identical in `4.6-stable`, `4.6.3-stable`, and current `master` — this
is not fixed in any shipped 4.6 patch and not fixed upstream as of this writing.

**What `cancel_request()` DOES do:** `IDHandler.remove(id)` unregisters the
Godot-side record. The fetch keeps running in the browser: connection stays
open, request completes, response is downloaded, tokens are billed.

**Crucial mitigating detail (VERIFIED):** `IDHandler` IDs are monotonically
increasing and never reused —

```js
// platform/web/js/libs/library_godot_os.js:31-49
add: function (p_data) {
    const id = ++IDHandler._last_id;
    IDHandler._references[id] = p_data;
    return id;
},
```

and every callback (`onresponse`, `onread`, `onerror`) starts with
`const obj = IDHandler.get(id); if (!obj) { return; }`. So a zombie request
**cannot** resolve back into Godot state later, and **cannot** be mistaken for a
newer request's response. The Godot-side state machine is safe.

**Therefore the risk is narrower than the GDD feared, but real:**

| Feared risk (GDD Open Question) | Actual status |
|---|---|
| Zombie resolves late and corrupts the state machine / Formula 2's budget accounting | **Does not happen.** ID never reused; callbacks no-op. Formula 2 stays correct. No "stale request" defensive code needed. |
| Zombie keeps consuming network / API quota / tokens / connection slots | **Happens.** Every abandoned attempt is a fully-paid API call the game never reads. |
| "Switch to fallback model immediately, no wait" is impossible | **Possible.** Godot-side switching is immediate and safe; only the underlying traffic lingers. |

**Recommendation: Formula 1/3 do NOT need redesign — the GDD's own escalation
condition ("if `cancel_request()` is unreliable, Formula 1/3 need redesign →
Scope Signal L → XL") is NOT triggered.** What is needed is a bounded set of
additions, all of which fit inside the existing formulas:

1. **Cost accounting**: a logical call may bill up to `http_attempt_count(c)`
   real API calls even though only one response is consumed. Note this against
   `ai_call_budget_per_turn` reasoning — the budget bounds *logical* calls, not
   *billed* calls. With the current defaults
   (`max_same_model_attempts_overloaded = 1`, ~3 fallback models) the worst case
   is small and bounded, so this is a documentation issue, not a design one.
2. **Do not spam-cancel.** Since cancelling frees nothing, prefer letting a
   request die on its own `timeout` where the budget allows, and reserve
   explicit `cancel_request()` for the genuine "abandon and move on" case.
3. **Connection-slot pressure** — see Q4.
4. **Optional hardening (LIKELY, needs prototype)**: a real abort is achievable
   by bypassing `HTTPRequest` entirely and driving `fetch` through
   `JavaScriptBridge` with your own `AbortController`. This is a real option
   but it costs the whole `HTTPRequest` convenience layer. Only take it if
   billing pressure from abandoned calls proves material. **Do not adopt this
   without a prototype** — it has never been tested in this project.

### Q4. Are there concurrency limits per origin on Web export?

**Verdict: VERIFIED at the browser layer; LIKELY at the impact layer.**

- **Engine layer (VERIFIED)**: Godot imposes no limit. Each `HTTPRequest` node
  owns its own `HTTPClientWeb`, which owns its own `fetch()`. There is no
  connection pool, no queue, no cap in engine code.
- **Browser layer (VERIFIED, standard web behaviour)**: over HTTP/1.1 browsers
  cap ~6 concurrent connections per host (Chrome hard-codes 6). Over **HTTP/2 a
  single connection is multiplexed**, with an RFC-recommended minimum of 100
  concurrent streams — the 6-connection cap does not apply.
- **Impact on this project (LIKELY)**: Google APIs are served over HTTP/2, and
  the AI/LLM layer's design is strictly sequential anyway (Edge Case
  "2 concurrent calls" → immediate `BUSY` rejection, never a queue). Model
  fallback is sequential by construction (Formula 3 picks one `next_model` at a
  time). So even counting Q3's zombie requests, concurrent in-flight requests to
  the AI origin stay in the low single digits.

**Conclusion: no impact on model fallback logic.** The one scenario worth
noting: if the endpoint ever falls back to HTTP/1.1, ~6 accumulated zombies
would stall the next real request behind the connection cap. Given
`ai_call_timeout_seconds = 30` and per-model attempt caps of 1–2, reaching 6
simultaneous zombies is not reachable under the current tuning knobs.

---

## Group B — Persistence (`user://`, IDBFS, JavaScriptBridge)

### Q5. Does one `FileAccess.store_*()` map to one physical IndexedDB transaction? Does IDBFS chunk large payloads?

**Verdict: VERIFIED — no chunking; but "1 write call = 1 atomic unit" is the
wrong model in a different way than the GDD assumed.**

How the layers actually stack:

1. `user://` is a **MEMFS (in-RAM)** path with an IDBFS mount on top
   (`library_godot_os.js:155-158`: `FS.mount(IDBFS, {}, path)` — note the empty
   options, so emscripten's `autoPersist` mode is **not** used; Godot drives
   sync manually).
2. `FileAccess.store_*()` writes to RAM only. It touches IndexedDB zero times.
3. IndexedDB is written only during a `FS.syncfs(false, cb)` pass — see Q6 for
   when that happens.

Inside a sync pass (`libidbfs.js`, emscripten 4.0.11):

- **No chunking (VERIFIED).** `loadLocalEntry` sets
  `node.contents = MEMFS.getFileDataAsTypedArray(node)` — the *entire* file — and
  `storeRemoteEntry` does `store.put(entry, path)`. **One file = one IndexedDB
  record holding the whole payload.** The GDD's stated worst fear ("IDBFS may
  chunk large payloads internally, so 1 write call ≠ 1 atomic unit") is
  **false**.
- **The whole sync is ONE transaction (VERIFIED).** `reconcile()` opens a single
  `db.transaction([DB_STORE_NAME], 'readwrite')` (`libidbfs.js:336`) and writes
  *every* changed file inside it, with:
  ```js
  transaction.onerror = transaction.onabort = (e) => { done(e.target.error); ... };
  transaction.oncomplete = (e) => { if (!errored) { callback(null); } };
  ```
  A `QuotaExceededError` aborts the whole transaction — the source comment says
  so explicitly. So **multi-file atomicity is genuinely provided**, and the
  commit point (`oncomplete`) is exactly the durability boundary Core Rule #3's
  `durability_confirmed` wants.
- **Dirty detection is per-file mtime (VERIFIED).** `reconcile()` compares
  `src.entries[key].timestamp` against `dst.entries[key].timestamp` and only
  rewrites files whose mtime differs. Remote metadata is read via a key cursor
  on the `timestamp` index (`getRemoteSet`), so listing is cheap.

**The three consequences that actually matter for the ADR:**

1. **The atomic unit is "one sync pass", not "one write call".** A sync pass
   covers *every* file dirtied since the last sync. So option (a) does get real
   multi-blob atomicity — but over a file set the engine chooses, at a moment
   the engine chooses. Core Rule #3's "all-or-nothing" property survives; Core
   Rule #1's "gate the transition on `durability_confirmed`" does **not** (Q6).
2. **Append-only in a single growing file does NOT deliver constant write
   cost.** Core Rule #3 commits to an append-only turn record to keep per-turn
   write cost ~constant. But IDBFS rewrites the **entire file contents** on
   every sync where the file is dirty. Appending one turn to a growing
   `journal.dat` re-serialises and re-`put`s the whole journal every turn —
   cost grows linearly with `world_time`, exactly the problem the strategy was
   adopted to avoid. **To get the intended constant cost, each turn record must
   be its own file** (e.g. `user://slot_1/turns/000123.dat`), so only the new
   small file is dirty. The ADR must specify this; it is not an implementation
   detail.
3. **Per-file granularity has a cost too**: `getLocalSet` walks the MEMFS tree
   and `getRemoteSet` cursors every key on every sync, so sync overhead grows
   O(number of files). With one file per turn, a long playthrough means
   thousands of files. Pair the per-turn files with a periodic compaction into
   a snapshot (which Core Rule #3's "periodic full-bundle flush" already
   anticipates) and delete the folded-in records.

**UNVERIFIED sub-item**: mtime granularity. MEMFS timestamps are
millisecond-resolution `Date` values, and `reconcile` skips a file when local
and remote timestamps are equal. A write that lands in the same millisecond as
the previously-synced version would be silently skipped. In practice Godot syncs
at most once per frame (≥ ~16 ms at 60 FPS), so this should be unreachable —
but it has not been tested and would present as silent data loss. Include a
targeted case in the prototype.

### Q6. Can GDScript actively trigger and `await` a `syncfs()` to confirm durability?

**Verdict: VERIFIED — it can *request* a sync; it can NOT `await` it or observe
completion. This is decisive against option (a).**

**Triggering (partially available):**

- `JavaScriptBridge.force_fs_sync()` **is** exposed to GDScript
  (`doc/classes/JavaScriptBridge.xml`, and `javascript_bridge_singleton.cpp:408`
  → `OS_Web::force_fs_sync()`). But look at what it does:
  ```cpp
  // platform/web/os_web.cpp:267-271
  void OS_Web::force_fs_sync() {
      if (is_userfs_persistent()) {
          idb_needs_sync = true;
      }
  }
  ```
  It only raises a dirty flag. It does not run a sync.
- The flag is *already* raised automatically when a file opened for `WRITE`
  under `/userfs` is **closed** (`os_web.cpp:231-244`,
  `file_access_close_callback`) — which is why the class docs note
  `force_fs_sync` is *"only useful for modules or extensions that can't use
  FileAccess to write files."* For the `FileAccess` path it is redundant.
- The actual sync runs at the **start of the next frame**:
  ```cpp
  // platform/web/os_web.cpp:83-93
  bool OS_Web::main_loop_iterate() {
      if (is_userfs_persistent() && idb_needs_sync && !idb_is_syncing) {
          idb_is_syncing = true;
          idb_needs_sync = false;
          godot_js_os_fs_sync(&fs_sync_callback);
      }
      DisplayServer::get_singleton()->process_events();
      return Main::iteration();
  }
  ```

**Awaiting / observing (unavailable):**

- The completion callback is `OS_Web::fs_sync_callback()`, whose entire body is
  `get_singleton()->idb_is_syncing = false;` (`os_web.cpp:78-80`). **No signal
  is emitted, no state is exposed.**
- `idb_is_syncing`, `idb_needs_sync`, and `force_fs_sync` are all `OS_Web`
  members. `core_bind.cpp` binds only `OS.is_userfs_persistent()` — there is no
  GDScript-visible way to ask "is a sync in flight?" or "did the last sync
  commit?".
- `GodotFS.sync()` guards re-entry with `if (GodotFS._syncing) { error('Already
  syncing!'); return Promise.resolve(); }` (`library_godot_os.js:191-196`) —
  the Promise exists in JS but is never surfaced past the C callback.

**Conclusion for `persistence-save-system.md` Core Rule #3:**

> **Option (a) — `FileAccess`/`user://` — cannot satisfy Core Rule #1 as
> written.** `durability_confirmed` is defined as "the full durability
> confirmation chain of the chosen backend has completed", and Core Rule #1
> gates the `Turn Confirmed` transition on it. Through `FileAccess` that
> condition is **not observable from GDScript at all** — not with a signal, not
> by polling, not via `force_fs_sync()`. You can only know that bytes reached
> RAM.

> **Option (b) — driving IndexedDB directly through `JavaScriptBridge` — is the
> only path that exposes the commit point.** `transaction.oncomplete` is a real
> JS callback that `JavaScriptBridge.create_callback()` can receive (Q9), so
> `durability_confirmed` becomes a genuine awaitable event.

This resolves the GDD's "(a) vs (b) must wait for the spike" instruction: (b)
wins, and it wins on **controllability** (the axis flagged as sub-question (i)
in the Open Question), not on atomicity — because Q5 showed (a)'s atomicity is
actually fine. If the project later decides the strict `durability_confirmed`
posture is too expensive, the honest move is to **weaken Core Rule #1's posture
explicitly**, not to pick (a) and pretend the gate exists.

**Additional VERIFIED risk worth recording**: because sync is deferred to the
next frame and takes an unknown time afterwards, a tab closed in that window
loses the write. Godot performs a final sync on clean engine shutdown
(`library_godot_os.js:263`: `return GodotFS.sync(); // Final FS sync.`), but a
tab close / crash / mobile OS kill is not a clean shutdown.

### Q7. Is the Web Locks API usable and stable via `JavaScriptBridge` on 4.6?

**Verdict: MIXED — bridge reachability LIKELY, browser support VERIFIED,
session-long lock holding UNVERIFIED (prototype required).**

- **Browser support (VERIFIED)**: `navigator.locks` shipped in **Safari 15.4**
  (WebKit blog, *New WebKit Features in Safari 15.4*), and is long-standing in
  Chrome/Firefox. Since iOS ships one WebKit, iOS Safari **and** WKWebView-based
  in-app browsers (Zalo / Facebook / Messenger — the distribution channels the
  GDD names) inherit it on iOS 15.4+. This substantially de-risks the GDD's
  worry that Web Locks is unavailable on the Mobile Web target; option (a)
  "manual lock record + heartbeat" does **not** need to be the baseline on
  support grounds.
- **Reachability from GDScript (LIKELY)**: `JavaScriptBridge.get_interface()`
  resolves `window[name]` (`library_godot_javascript_singleton.js:136-144`), so
  `get_interface("navigator")` returns a proxied `navigator`, and property
  access (`.locks`) plus method call (`.request(...)`) go through
  `godot_js_wrapper_object_get` / `object_call`. The `{ifAvailable: true}`
  options object — which the GDD correctly identified as **mandatory** to get
  immediate rejection instead of queue-forever — can be built with
  `JavaScriptBridge.create_object("Object")` (`new window["Object"]()`,
  `:284-308`) and a property set. No `eval` needed anywhere in this path.
- **UNVERIFIED — the hard part**: `navigator.locks.request(name, opts, cb)`
  releases the lock as soon as the promise returned by `cb` settles. A Godot
  `Callable` bridged via `create_callback()` returns `null` → `undefined` → the
  lock is released **immediately after the callback returns**. To *hold* a lock
  for the lifetime of the tab you must return a Promise that stays pending, and
  resolve it later from GDScript. That is theoretically constructible
  (`create_object("Promise", create_callback(executor))`, capture the proxied
  `resolve`, later invoke it via `Function.prototype.call`), but it is a
  multi-hop bridge trick that has **never been tested in this project**.

**Action**: the ADR may plan on Web Locks, but the "hold a pending Promise
across the session from GDScript" pattern is a genuine prototype item. If it
does not work cleanly, the fallback is a lock record with a heartbeat/timeout
(GDD option (b)) — which no longer needs to be the default, but stays on the
shelf.

### Q8. Is `StorageManager.estimate()` available via `JavaScriptBridge`?

**Verdict: VERIFIED available; precision UNVERIFIED and intentionally degraded.**

- **Availability (VERIFIED)**: `navigator.storage.estimate()` is supported in
  Chrome/Firefox, and **fully supported in Safari 17.0 / iOS 17 / iPadOS 17**
  per WebKit's *Updates to Storage Policy*. Reachable through the same
  `get_interface("navigator").storage.estimate()` chain as Q7, returning a
  Promise that `create_callback()` can consume via `.then()`.
- **Precision (VERIFIED as deliberately fuzzy)**: the returned values are
  intentional estimates to prevent fingerprinting. Chromium reports a quota
  around 60% of total disk; Firefox around 10% (50% for persisted origins);
  Safari uses deliberately conservative/obfuscated values. This **confirms** the
  GDD's existing note and reinforces that `quota_warn_threshold` needs a real
  safety margin — Formula #3's `quota_bytes_available` is an approximation by
  design, not a measurement awaiting better tooling.
- **UNVERIFIED**: actual reported quota inside Zalo/Facebook/Messenger in-app
  WebViews. In-app browsers often run with different storage partitioning than
  the standalone browser. Must be measured on real devices.

**Related, not asked but load-bearing**: `navigator.storage.persist()` /
`persisted()` — Safari's ITP evicts non-persisted origin storage after ~7 days
of no user interaction, which is the risk the GDD flagged. Requesting persistent
storage is the standard mitigation, and it is reachable through the same bridge.
**UNVERIFIED** whether the request is granted for this project's distribution
channel. Add it to the prototype.

### Q9. Does every use of `JavaScriptBridge` require CSP `unsafe-eval`?

**Verdict: VERIFIED — No. Only `JavaScriptBridge.eval()` needs it. But WASM
itself needs a different CSP allowance regardless.**

Reading `library_godot_javascript_singleton.js`, `eval` appears in exactly one
place — `godot_js_eval` (`:344-355`), which backs `JavaScriptBridge.eval()`:

```js
const global_eval = eval;      // indirect eval call grants global execution context
eval_ret = global_eval(js_code);
```

Every other bridge entry point is eval-free:

| GDScript API | Implementation | Uses `eval`? |
|---|---|---|
| `JavaScriptBridge.eval()` | `godot_js_eval` → `eval(code)` | **Yes** |
| `JavaScriptBridge.get_interface(name)` | `window[name]` lookup (`:136-144`) | No |
| `JavaScriptBridge.create_object(name, ...)` | `new window[name](...args)` (`:284-308`) | No |
| `JavaScriptBridge.create_callback(callable)` | plain JS closure (`:217-231`) | No |
| `JavaScriptObject` property get/set, method call | property access / apply | No |

**So the GDD's stated blocking risk — "if the host sets a CSP without
`unsafe-eval`, the entire JS-glue foundation (Web Locks, `estimate()`,
IndexedDB) is blocked" — is FALSE, provided the implementation never calls
`JavaScriptBridge.eval()`.** All of Q7/Q8/Q6-option-(b) are expressible with
`get_interface` / `create_object` / `create_callback`.

**Recommended project rule**: add `JavaScriptBridge.eval()` to
`technical-preferences.md` → **Forbidden Patterns**, with `get_interface()` /
`create_object()` / `create_callback()` as the sanctioned replacements. This
converts a hosting-environment risk into a code-review rule.

**Separate CSP requirement that DOES apply (VERIFIED)**: any Godot Web export is
WebAssembly, and WASM compilation is CSP-controlled. A host with a `script-src`
or `default-src` directive must allow `'wasm-unsafe-eval'` (Chrome 97+,
Firefox 102+) or the legacy `'unsafe-eval'`, or the game will not boot at all.
This is a hard hosting requirement independent of `JavaScriptBridge`, and it is
the CSP item `devops-engineer` actually needs to verify with the target host.

---

## Current API Patterns

### Sequential AI call with a per-attempt dynamic timeout

Matches `ai-llm-integration-layer.md` Formula 2
(`min(request_timeout_default, t_remaining(n))`). One reused node; the node is
clean by the time `request_completed` fires, so no `ERR_BUSY`.

```gdscript
class_name AIHttpTransport
extends Node

## Single reused HTTPRequest node. Web export requires use_threads = false.
var _http: HTTPRequest

func _ready() -> void:
    _http = HTTPRequest.new()
    _http.use_threads = false  # Web: set_use_threads is a no-op without THREADS_ENABLED
    # Formula 2's budget must keep counting even if the tree pauses.
    _http.process_mode = Node.PROCESS_MODE_ALWAYS
    add_child(_http)

## Returns [result, response_code, headers, body].
## `attempt_timeout_seconds` is recomputed by the caller for every attempt.
func send(url: String, headers: PackedStringArray, body: String,
        attempt_timeout_seconds: float) -> Array:
    _http.timeout = attempt_timeout_seconds  # read at request() time — safe to change per call
    var err := _http.request(url, headers, HTTPClient.METHOD_POST, body)
    if err != OK:
        return [HTTPRequest.RESULT_CANT_CONNECT, 0, PackedStringArray(), PackedByteArray()]
    return await _http.request_completed
```

### Detecting persistent storage before trusting `user://`

```gdscript
func _ready() -> void:
    if OS.has_feature("web") and not OS.is_userfs_persistent():
        # IDBFS mount failed (private browsing, blocked storage, quota refused).
        # user:// still "works" but is RAM-only and dies with the tab.
        push_error("Persistent storage unavailable — save system must refuse to start.")
```

### Awaiting a JS Promise from GDScript without `eval`

The shared utility the Persistence Open Question asked for. Works for
`navigator.storage.estimate()`, `navigator.locks.request()`, and an IndexedDB
wrapper alike.

```gdscript
## Bridges a JS Promise to a GDScript signal. Keep the returned callbacks alive
## until they fire, or they are garbage collected and never called.
class_name JsPromise
extends RefCounted

signal settled(ok: bool, value: Variant)

var _on_ok: JavaScriptObject
var _on_err: JavaScriptObject

func await_promise(promise: JavaScriptObject) -> Array:
    _on_ok = JavaScriptBridge.create_callback(_handle_ok)
    _on_err = JavaScriptBridge.create_callback(_handle_err)
    promise.then(_on_ok).catch(_on_err)
    return await settled

func _handle_ok(args: Array) -> void:
    settled.emit(true, args[0] if args.size() > 0 else null)

func _handle_err(args: Array) -> void:
    settled.emit(false, args[0] if args.size() > 0 else null)
```

### Building a JS options object without `eval`

Needed for the mandatory `{ifAvailable: true}` on `navigator.locks.request()`.

```gdscript
func _make_lock_options() -> JavaScriptObject:
    var opts := JavaScriptBridge.create_object("Object")  # new Object()
    opts.ifAvailable = true  # MUST be true: default behaviour queues forever
    return opts
```

---

## Common Mistakes

- **Assuming `cancel_request()` stops network traffic on Web.** It does not
  (Q3). The request completes in the browser and is billed. Godot state stays
  correct, but cost and connection slots do not.
- **Assuming COOP/COEP has anything to do with calling an external API.** It
  does not (Q1). Cross-origin isolation is about `SharedArrayBuffer`; API calls
  are gated by CORS. Enabling Thread Support to "fix" a CORS error makes
  hosting harder and fixes nothing.
- **Enabling Thread Support without needing it.** It flips the export to
  require COOP/COEP headers, which most cheap hosts and in-app WebViews will
  not send. Default is `false` in 4.6 — keep it.
- **Treating a successful `FileAccess.store_*()` as durable.** On Web it means
  "written to RAM". IndexedDB is touched only at the next frame's sync, and you
  cannot observe when that commits (Q6).
- **Calling `JavaScriptBridge.force_fs_sync()` and assuming the data is now
  safe.** It only sets a dirty flag; the sync runs next frame and reports
  completion to nobody.
- **Designing an append-only journal as one growing file.** IDBFS rewrites the
  entire file on every sync, so per-turn write cost grows with `world_time` —
  defeating the reason append-only was chosen (Q5). One file per turn record.
- **Letting the SceneTree pause during an AI call.** `HTTPRequest`'s timeout is
  a `Timer` child; a paused tree stops it and Formula 2's budget silently stops
  advancing (Q2).
- **Reading `Content-Length` / `get_response_body_length()` on Web.** Always
  `-1` by design in `http_client_web.cpp`.
- **Reaching for `JavaScriptBridge.eval()`.** It is the single API that forces
  a CSP `unsafe-eval` dependency (Q9), and everything this project needs is
  reachable without it.
- **Forgetting to hold a reference to a `create_callback()` result.** The engine
  docs are explicit: *"The reference must be kept until the callback happens, or
  it won't be called at all."* A local variable that goes out of scope silently
  loses the callback.
- **Testing only in desktop Chrome.** iOS WKWebView and the Zalo/Facebook/
  Messenger in-app browsers have different storage partitioning, eviction, and
  quota behaviour. The GDD names these as the real distribution channel.
- **Indexing a `JavaScriptObject` with an `int`** (e.g. building a JS array
  key-by-key: `arr[i] = value`). *(evidence: `prototypes/persistence-web`
  Experiment 2b, empirical — hit while re-running the prototype on Godot
  4.6-stable, not source-verified against an engine changelog entry.)* The
  GDScript static type-checker rejects it at **parse** time —
  `"Only String or StringName can be used as index for type
  JavaScriptObject"` — which fails the whole script's load, not just the one
  call. If this hits inside `_ready()`, the symptom looks exactly like a
  hang: nothing ever runs, no error reaches your own logging, only Godot's
  own stderr shows the `SCRIPT ERROR: Parse Error`. Fix: index with
  `str(i)` — JS treats numeric-string keys on an `Array` identically to
  numeric ones, so `arr[str(i)] = value` still builds a real JS `Array`.

---

## Open Items Requiring a Real Prototype

Ranked. Nothing below is answerable from documentation.

1. **CORS policy of the chosen AI endpoint from a browser origin** (Q1) —
   blocks the whole client-direct architecture (Core Rule #6) if it fails.
2. **IndexedDB-via-`JavaScriptBridge` write path** (Q6/option (b)) — prove that
   `transaction.oncomplete` reaches GDScript, and measure end-to-end latency
   against `max_perceived_autosave_latency_ms` (including serialisation CPU on
   the single main thread, not just the storage call).
3. **Web Locks held across a session from GDScript** (Q7) — the pending-Promise
   pattern. Fall back to heartbeat/timeout if it fails.
4. **Real quota + `persist()` grant inside iOS WKWebView and Zalo / Facebook /
   Messenger in-app browsers** (Q8) — including Safari ITP's ~7-day eviction.
5. **mtime-collision skip in IDBFS reconcile** (Q5) — low probability, silent
   data loss if hit.
6. **Billing impact of abandoned (zombie) requests** (Q3) — measure whether
   worst-case fallback chains produce a materially larger bill than the logical
   call count suggests.
