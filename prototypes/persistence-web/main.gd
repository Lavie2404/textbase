extends Node
# Prototype: Persistence Web — empirical tests for web-export.md open items #2, #3, #5.
# Throwaway code per .claude/rules/prototype-code.md. NO JavaScriptBridge.eval() anywhere.
#
# #2  IndexedDB via JavaScriptBridge: does transaction.oncomplete reach GDScript
#     via create_callback()? End-to-end latency (incl. JSON serialize on main
#     thread) for ~1KB / ~100KB / ~1MB payloads.
# #3  Web Locks held across a session: pending JS Promise constructed from
#     GDScript (create_object("Promise", executor)), resolve stashed and called
#     later. Plan A: bridged callback returns the promise directly.
#     Plan B (fallback): Promise.resolve.bind(Promise, pending) as the lock cb.
# #5  IDBFS mtime-collision: write A, sync, overwrite B in the same wall-clock
#     second, sync, reload page (phase=2), read back. Did B survive?

const LOCK_NAME := "persistence_proto_lock"
const N_ITER := 8
const N_MTIME_TRIALS := 8

var origin := ""
var phase := 1
var results := {}
var label: Label
var _keep: Array = []  # JavaScriptObject refs must stay alive or callbacks never fire

# --- state for Web Locks test ---
var _lock_resolve: JavaScriptObject = null
var _pending_promise: JavaScriptObject = null
var _grant_state := {}


class Waiter:
	extends RefCounted
	signal done
	var settled := false
	var value: Variant = null

	func settle(v: Variant) -> void:
		if settled:
			return
		settled = true
		value = v
		done.emit()

	func wait(timeout_s: float, tree: SceneTree) -> Variant:
		if not settled:
			var t := tree.create_timer(timeout_s)
			t.timeout.connect(func() -> void: settle({"__timeout": true}))
			if not settled:
				await done
		return value


func _is_timeout(v: Variant) -> bool:
	return typeof(v) == TYPE_DICTIONARY and v.get("__timeout", false)


func _ready() -> void:
	if not OS.has_feature("web"):
		print("persistence-web prototype must run as a Web export.")
		return
	_setup_overlay()
	var loc: JavaScriptObject = JavaScriptBridge.get_interface("location")
	origin = str(loc.origin)
	var search := str(loc.search)
	phase = 2 if "phase=2" in search else 1
	_overlay("persistence-web proto  phase=%d  origin=%s" % [phase, origin])
	results["phase"] = phase
	results["started_unix"] = Time.get_unix_time_from_system()
	_log("boot", {"phase": phase})

	results["device"] = await _device_info()
	_log("device_info", results["device"])

	if phase == 1:
		results["exp2_idb"] = await _exp2()
		_log("exp2_done", results["exp2_idb"])
		results["exp2b_bridge_mechanics"] = await _exp2b()
		_log("exp2b_done", results["exp2b_bridge_mechanics"])
		results["exp3_locks"] = await _exp3()
		_log("exp3_done", results["exp3_locks"])
		results["exp5_phase1"] = await _exp5_phase1()
		_log("exp5_phase1_done", {"trials": results["exp5_phase1"]["trials"].size()})
	else:
		results["exp5_phase2"] = await _exp5_phase2()
		_log("exp5_phase2_done", results["exp5_phase2"])

	await _post_wait("/report", results)
	_overlay("== REPORT SENT ==")


# ---------------------------------------------------------------- overlay / io

func _setup_overlay() -> void:
	var cl := CanvasLayer.new()
	add_child(cl)
	label = Label.new()
	label.position = Vector2(8, 8)
	label.size = Vector2(1200, 720)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", 13)
	cl.add_child(label)


func _overlay(line: String) -> void:
	if label:
		label.text += line + "\n"


func _log(step: String, data: Variant) -> void:
	var entry := {"phase": phase, "step": step, "t_ms": Time.get_ticks_msec(), "data": data}
	print(JSON.stringify(entry))
	_overlay("[%d] %s" % [Time.get_ticks_msec(), step])
	_post_async("/log", entry)


func _post_async(path: String, data: Variant) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(func(_r, _c, _h, _b) -> void: http.queue_free())
	var err := http.request(origin + path,
			PackedStringArray(["Content-Type: application/json"]),
			HTTPClient.METHOD_POST, JSON.stringify(data))
	if err != OK:
		http.queue_free()


func _post_wait(path: String, data: Variant) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	var err := http.request(origin + path,
			PackedStringArray(["Content-Type: application/json"]),
			HTTPClient.METHOD_POST, JSON.stringify(data))
	if err == OK:
		await http.request_completed
	http.queue_free()


func _sleep(seconds: float) -> void:
	await get_tree().create_timer(seconds).timeout


# ------------------------------------------------------------- promise bridge

## Awaits a JS Promise via then(ok, err). Returns {"ok": bool, "value": Variant}
## or {"__timeout": true}.
func _await_promise(p: JavaScriptObject, timeout_s := 10.0) -> Variant:
	var w := Waiter.new()
	var ok_cb := JavaScriptBridge.create_callback(
			func(args: Array) -> void: w.settle({"ok": true, "value": args[0] if args.size() > 0 else null}))
	var err_cb := JavaScriptBridge.create_callback(
			func(args: Array) -> void: w.settle({"ok": false, "value": str(args[0]) if args.size() > 0 else ""}))
	_keep.append(ok_cb)
	_keep.append(err_cb)
	p.then(ok_cb, err_cb)
	return await w.wait(timeout_s, get_tree())


## Invoke a stashed JS function object. `.call()` collides with Object.call(),
## so park the function as a property of a fresh JS object and call it as a method.
func _invoke_js_function(fn: JavaScriptObject) -> void:
	var holder: JavaScriptObject = JavaScriptBridge.create_object("Object")
	holder.fn = fn
	holder.fn(null)


# ---------------------------------------------------------------- device info

func _device_info() -> Dictionary:
	var info := {}
	info["userfs_persistent"] = OS.is_userfs_persistent()
	var navigator: JavaScriptObject = JavaScriptBridge.get_interface("navigator")
	info["user_agent"] = str(navigator.userAgent)
	info["web_locks_available"] = navigator.locks != null
	info["indexeddb_available"] = JavaScriptBridge.get_interface("indexedDB") != null
	var storage = navigator.storage
	info["storage_manager_available"] = storage != null
	if storage != null:
		var est = await _await_promise(storage.estimate(), 8.0)
		if not _is_timeout(est) and est.get("ok", false) and est["value"] != null:
			info["quota_bytes"] = float(est["value"].quota)
			info["usage_bytes"] = float(est["value"].usage)
		var persisted = await _await_promise(storage.persisted(), 8.0)
		if not _is_timeout(persisted):
			info["persisted_before_request"] = persisted.get("value")
		var persist = await _await_promise(storage.persist(), 8.0)
		if not _is_timeout(persist):
			info["persist_granted"] = persist.get("value")
	_overlay("userfs_persistent=%s  idb=%s  locks=%s  storage_mgr=%s" % [
			info["userfs_persistent"], info["indexeddb_available"],
			info["web_locks_available"], info["storage_manager_available"]])
	_overlay("quota=%s  usage=%s  persist_granted=%s" % [
			info.get("quota_bytes", "n/a"), info.get("usage_bytes", "n/a"),
			info.get("persist_granted", "n/a")])
	return info


# ------------------------------------------------- exp2: IndexedDB write path

var _db: JavaScriptObject = null


func _on_idb_upgrade(args: Array) -> void:
	var db = args[0].target.result
	for name in ["saves", "bytes_direct_test", "bytes_b64_test", "turn_records_test",
			"snapshot_store", "turn_records_abort_test", "snapshot_abort_store"]:
		if not db.objectStoreNames.contains(name):
			db.createObjectStore(name)


func _exp2() -> Dictionary:
	var out := {"name": "idb_write_path_via_bridge"}
	var idb: JavaScriptObject = JavaScriptBridge.get_interface("indexedDB")
	if idb == null:
		out["error"] = "indexedDB interface unavailable"
		return out

	var w := Waiter.new()
	var req = idb.open("persistence_proto_db", 2)
	var up_cb := JavaScriptBridge.create_callback(_on_idb_upgrade)
	var ok_cb := JavaScriptBridge.create_callback(
			func(args: Array) -> void: w.settle({"ok": true, "ev": args[0]}))
	var err_cb := JavaScriptBridge.create_callback(
			func(_args: Array) -> void: w.settle({"ok": false}))
	_keep.append(up_cb)
	_keep.append(ok_cb)
	_keep.append(err_cb)
	req.addEventListener("upgradeneeded", up_cb)
	req.addEventListener("success", ok_cb)
	req.addEventListener("error", err_cb)
	var r = await w.wait(10.0, get_tree())
	if _is_timeout(r):
		out["error"] = "db open timed out"
		return out
	if not r.get("ok", false):
		out["error"] = "db open error event"
		return out
	_db = r["ev"].target.result
	out["open_ok"] = true

	var sizes := {"1KB": 1024, "100KB": 102400, "1MB": 1048576}
	var lat := {}
	var any_order_checked := false
	for size_name in sizes:
		var payload: Dictionary = _make_payload(sizes[size_name])
		var samples: Array = []
		for i in N_ITER:
			var m := await _idb_write_timed("slot_%s_%d" % [size_name, i], payload)
			if m.has("error"):
				out["error"] = m["error"]
				return out
			samples.append(m)
			any_order_checked = true
		lat[size_name] = _summarize(samples)
		_log("exp2_size_done", {"size": size_name, "summary": lat[size_name]})
	out["latency"] = lat
	out["oncomplete_reached_gdscript"] = any_order_checked
	return out


func _make_payload(target_bytes: int) -> Dictionary:
	var chunk := "abcdefghijklmnopqrstuvwxyz0123456789ABCD"  # 40 chars, no JSON escapes
	var n: int = maxi(1, (target_bytes - 96) / chunk.length())
	return {"schema_version": 1, "turn": 123, "world_time": 456789, "blob": chunk.repeat(n)}


func _idb_write_timed(key: String, payload: Dictionary) -> Dictionary:
	var w := Waiter.new()
	var ord := {"n": 0, "put": -1, "complete": -1}
	var t0 := Time.get_ticks_usec()
	var json_str := JSON.stringify(payload)
	var t_ser := Time.get_ticks_usec()
	var tx = _db.transaction("saves", "readwrite")
	var store = tx.objectStore("saves")
	var put_req = store.put(json_str, key)
	var t_submit := Time.get_ticks_usec()
	var put_cb := JavaScriptBridge.create_callback(func(_args: Array) -> void:
		ord["n"] += 1
		ord["put"] = ord["n"])
	var done_cb := JavaScriptBridge.create_callback(func(_args: Array) -> void:
		ord["n"] += 1
		ord["complete"] = ord["n"]
		w.settle({"ok": true}))
	var fail_cb := JavaScriptBridge.create_callback(
			func(_args: Array) -> void: w.settle({"ok": false}))
	_keep.append(put_cb)
	_keep.append(done_cb)
	_keep.append(fail_cb)
	put_req.addEventListener("success", put_cb)
	tx.addEventListener("complete", done_cb)
	tx.addEventListener("error", fail_cb)
	tx.addEventListener("abort", fail_cb)
	var r = await w.wait(20.0, get_tree())
	var t1 := Time.get_ticks_usec()
	if _is_timeout(r):
		return {"error": "transaction timed out for " + key}
	if not r.get("ok", false):
		return {"error": "transaction error/abort for " + key}
	return {
		"bytes": json_str.length(),
		"serialize_ms": float(t_ser - t0) / 1000.0,
		"submit_to_complete_ms": float(t1 - t_submit) / 1000.0,
		"e2e_ms": float(t1 - t0) / 1000.0,
		"put_success_before_oncomplete": ord["put"] > 0 and ord["complete"] > ord["put"],
	}


func _summarize(samples: Array) -> Dictionary:
	var e2e: Array = []
	var ser: Array = []
	var sub: Array = []
	var order_ok := true
	for s in samples:
		e2e.append(s["e2e_ms"])
		ser.append(s["serialize_ms"])
		sub.append(s["submit_to_complete_ms"])
		order_ok = order_ok and s["put_success_before_oncomplete"]
	e2e.sort()
	ser.sort()
	sub.sort()
	var n := e2e.size()
	return {
		"n": n,
		"bytes": samples[0]["bytes"],
		"e2e_ms_all": e2e,
		"e2e_ms_p50": e2e[n / 2],
		"e2e_ms_p95": e2e[maxi(0, int(ceil(n * 0.95)) - 1)],
		"e2e_ms_min": e2e[0],
		"e2e_ms_max": e2e[n - 1],
		"serialize_ms_p50": ser[n / 2],
		"submit_to_complete_ms_p50": sub[n / 2],
		"ordering_put_success_before_oncomplete_all": order_ok,
	}


# ---------------------------------------- exp2b: bridge marshalling mechanics
#
# Follow-up validation requested after engine-specialist ADR review: three
# load-bearing bridge mechanisms the original exp2 never actually exercised.
#   1. PackedByteArray across the bridge into IndexedDB (raw pass vs base64).
#   2. Compound-key [slot_id, world_time] cursor range scan — requires a
#      MULTI-FIRE create_callback (cursor "success" fires once per record).
#   3. One readwrite transaction spanning two object stores (put + deletes),
#      single oncomplete, and an abort variant proving rollback.

func _hash_bytes(b: PackedByteArray) -> String:
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(b)
	return ctx.finish().hex_encode()


func _make_deterministic_bytes(size: int) -> PackedByteArray:
	var b := PackedByteArray()
	b.resize(size)
	for i in size:
		b[i] = i % 256  # sweeps through 0x00 and 0xFF every 256 bytes
	return b


## Function.prototype.apply avoids the `.call()` / GDScript Object.call()
## name collision landmine (see exp3's _invoke_js_function comment) while
## still letting us set an explicit `this` for a bare function reference.
func _apply_this(fn: JavaScriptObject, this_arg: Variant) -> Variant:
	return fn.apply(this_arg)


## Builds a real JS Array by constructing it via create_object and assigning
## elements with GDScript's `[]` operator. Confirmed empirically (and via the
## shipped runtime's GodotJSWrapper.variant2js) that a *raw* GDScript Array/
## Dictionary/PackedByteArray passed as a bridge argument is NOT supported by
## the generic exchange path (only nil/bool/int/float/string/object-proxy are)
## and arrives as JS `undefined`. `[]`-assignment on a JavaScriptObject routes
## through object_setvar, which takes a full Variant key AND value (both still
## limited to the same primitive set) — so building the array element-by-element
## with primitive leaves, then passing the resulting PROXY, works because a
## proxy is an "object" (type 24) which the exchange path handles natively.
func _make_js_array(values: Array) -> JavaScriptObject:
	var arr: JavaScriptObject = JavaScriptBridge.create_object("Array")
	for i in values.size():
		arr[i] = values[i]
	return arr


func _idb_get_value(store_name: String, key: Variant) -> Dictionary:
	var tx = _db.transaction(store_name, "readonly")
	var store = tx.objectStore(store_name)
	var req = store.get(key)
	var w := Waiter.new()
	var ok_cb := JavaScriptBridge.create_callback(
			func(args: Array) -> void: w.settle({"ok": true, "value": args[0].target.result}))
	var err_cb := JavaScriptBridge.create_callback(
			func(_a: Array) -> void: w.settle({"ok": false, "error": "get error"}))
	_keep.append(ok_cb)
	_keep.append(err_cb)
	req.addEventListener("success", ok_cb)
	req.addEventListener("error", err_cb)
	var r = await w.wait(10.0, get_tree())
	if _is_timeout(r):
		return {"ok": false, "error": "timeout"}
	return r


## Same shape as _idb_write_timed but skips JSON-serialising a Dictionary —
## the caller already has a ready-to-store string (e.g. base64). Lets #2b
## measure base64-string latency with the identical methodology as exp2.
func _idb_write_timed_value(store_name: String, key: String, value_str: String) -> Dictionary:
	var w := Waiter.new()
	var ord := {"n": 0, "put": -1, "complete": -1}
	var t0 := Time.get_ticks_usec()
	var tx = _db.transaction(store_name, "readwrite")
	var store = tx.objectStore(store_name)
	var put_req = store.put(value_str, key)
	var t_submit := Time.get_ticks_usec()
	var put_cb := JavaScriptBridge.create_callback(func(_args: Array) -> void:
		ord["n"] += 1
		ord["put"] = ord["n"])
	var done_cb := JavaScriptBridge.create_callback(func(_args: Array) -> void:
		ord["n"] += 1
		ord["complete"] = ord["n"]
		w.settle({"ok": true}))
	var fail_cb := JavaScriptBridge.create_callback(
			func(_args: Array) -> void: w.settle({"ok": false}))
	_keep.append(put_cb)
	_keep.append(done_cb)
	_keep.append(fail_cb)
	put_req.addEventListener("success", put_cb)
	tx.addEventListener("complete", done_cb)
	tx.addEventListener("error", fail_cb)
	tx.addEventListener("abort", fail_cb)
	var r = await w.wait(20.0, get_tree())
	var t1 := Time.get_ticks_usec()
	if _is_timeout(r) or not r.get("ok", false):
		return {"error": "transaction failed for " + key}
	return {
		"bytes": value_str.length(),
		"submit_to_complete_ms": float(t1 - t_submit) / 1000.0,
		"e2e_ms": float(t1 - t0) / 1000.0,
		"put_success_before_oncomplete": ord["put"] > 0 and ord["complete"] > ord["put"],
	}


func _exp2b() -> Dictionary:
	var out := {"name": "exp2b_bridge_mechanics"}
	out["bytearray_bridge"] = await _exp2b_bytearray_bridge()
	out["compound_key_cursor"] = await _exp2b_compound_key_cursor()
	out["multi_store_tx"] = await _exp2b_multi_store_tx()
	return out


# --- 2b.1: PackedByteArray across the bridge --------------------------------

func _idb_put_get_raw(store_name: String, key: String, value: Variant) -> Dictionary:
	var out := {}
	var tx = _db.transaction(store_name, "readwrite")
	var store = tx.objectStore(store_name)
	var w := Waiter.new()
	var put_req = store.put(value, key)
	var ok_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle({"ok": true}))
	var err_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle({"ok": false}))
	_keep.append(ok_cb)
	_keep.append(err_cb)
	put_req.addEventListener("success", ok_cb)
	put_req.addEventListener("error", err_cb)
	var r = await w.wait(10.0, get_tree())
	if _is_timeout(r):
		out["put"] = {"ok": false, "error": "timeout"}
		return out
	out["put"] = r
	if not r.get("ok", false):
		return out
	var read := await _idb_get_value(store_name, key)
	out["read"] = read
	if read.get("ok", false):
		var val = read["value"]
		var to_string_fn = JavaScriptBridge.get_interface("Object").prototype.toString
		out["stored_value_tostring_tag"] = str(_apply_this(to_string_fn, val))
		out["stored_value_gdscript_type"] = str(typeof(val))
	return out


func _exp2b_bytearray_bridge() -> Dictionary:
	var out := {"name": "packed_byte_array_bridge"}
	var size := 102400  # ~100KB, matches exp2's 100KB JSON-string case
	var bytes := _make_deterministic_bytes(size)
	var expected_hash := _hash_bytes(bytes)
	out["payload_bytes"] = size
	out["expected_hash"] = expected_hash

	# (a) Inspect what JS type a directly-passed PackedByteArray arrives as,
	# via two independent checks (neither uses eval):
	#   - constructor-arg path: new Uint8Array(bytes) -> read .length back.
	#   - Object.prototype.toString.apply(bytes) -> read the type tag string.
	var uint8_ctor_check: JavaScriptObject = JavaScriptBridge.create_object("Uint8Array", bytes)
	out["direct_pass_uint8array_ctor_length"] = int(uint8_ctor_check.length)
	var to_string_fn = JavaScriptBridge.get_interface("Object").prototype.toString
	out["direct_pass_object_tostring_tag"] = str(_apply_this(to_string_fn, bytes))

	# (b) Does IndexedDB put() succeed as-is with the raw PackedByteArray value?
	out["direct_put_result"] = await _idb_put_get_raw("bytes_direct_test", "k1", bytes)

	# (c)/(d) Cheapest working encoding: base64 string via native GDScript
	# Marshalls (no per-byte bridge calls at all), then measured the same way
	# exp2 measures JSON-string writes.
	var t_enc0 := Time.get_ticks_usec()
	var b64 := Marshalls.raw_to_base64(bytes)
	var t_enc1 := Time.get_ticks_usec()
	out["base64_encode_ms"] = float(t_enc1 - t_enc0) / 1000.0
	out["base64_length"] = b64.length()
	out["base64_overhead_ratio"] = float(b64.length()) / float(size)

	var samples: Array = []
	for i in N_ITER:
		var m := await _idb_write_timed_value("bytes_b64_test", "k_%d" % i, b64)
		if not m.has("error"):
			samples.append(m)
	if samples.size() > 0:
		out["base64_latency"] = _summarize(samples)

	var readback := await _idb_get_value("bytes_b64_test", "k_0")
	if readback.get("ok", false) and readback.get("value") != null:
		var decoded: PackedByteArray = Marshalls.base64_to_raw(str(readback["value"]))
		out["roundtrip_hash_match"] = _hash_bytes(decoded) == expected_hash
		out["roundtrip_size_match"] = decoded.size() == size
	else:
		out["roundtrip_hash_match"] = false
		out["roundtrip_error"] = readback.get("error", "value missing")

	return out


# --- 2b.2: compound key [slot_id, world_time] + multi-fire cursor scan ------

func _is_sorted_ascending(arr: Array) -> bool:
	for i in range(1, arr.size()):
		if arr[i] < arr[i - 1]:
			return false
	return true


## Proves create_callback CAN fire more than once: registered ONCE on the
## cursor request's "success" event, invoked once per record plus a final
## time with cursor==null marking end-of-range. `cursor.continue()` cannot be
## written in GDScript at all — `continue` is a reserved statement keyword,
## a parse error after `.` — so this uses the spec-equivalent `advance(1)`.
func _cursor_scan(store_name: String, lower: JavaScriptObject, upper: JavaScriptObject) -> Dictionary:
	var records: Array = []
	var fire_count := {"n": 0}
	var tx = _db.transaction(store_name, "readonly")
	var store = tx.objectStore(store_name)
	var range_iface: JavaScriptObject = JavaScriptBridge.get_interface("IDBKeyRange")
	var key_range = range_iface.bound(lower, upper)
	var cursor_req = store.openCursor(key_range)
	var w := Waiter.new()
	var cb := JavaScriptBridge.create_callback(func(args: Array) -> void:
		fire_count["n"] += 1
		var event = args[0]
		var cursor = event.target.result
		if cursor == null:
			w.settle(true)
			return
		records.append(JSON.parse_string(str(cursor.value)))
		cursor.advance(1))
	var err_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle(false))
	_keep.append(cb)
	_keep.append(err_cb)
	cursor_req.addEventListener("success", cb)
	cursor_req.addEventListener("error", err_cb)
	var r = await w.wait(15.0, get_tree())
	return {
		"records": records,
		"fire_count": fire_count["n"],
		"completed": not _is_timeout(r) and r == true,
	}


func _exp2b_compound_key_cursor() -> Dictionary:
	var out := {"name": "compound_key_cursor_scan"}

	# Self-test the array-building bridge trick before relying on it for keys.
	var probe := _make_js_array([7, 42])
	out["array_build_length_ok"] = int(probe.length) == 2
	out["array_build_values_ok"] = int(probe[0]) == 7 and int(probe[1]) == 42

	# 10 records across 2 slot_ids, interleaved insert order (not sorted).
	var seed_order := [
		[2, 300], [1, 100], [1, 300], [2, 100], [1, 200],
		[2, 200], [1, 500], [2, 500], [1, 400], [2, 400],
	]
	var tx = _db.transaction("turn_records_test", "readwrite")
	var store = tx.objectStore("turn_records_test")
	var w := Waiter.new()
	var done_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle(true))
	var fail_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle(false))
	_keep.append(done_cb)
	_keep.append(fail_cb)
	tx.addEventListener("complete", done_cb)
	tx.addEventListener("error", fail_cb)
	tx.addEventListener("abort", fail_cb)
	for pair in seed_order:
		var key := _make_js_array(pair)
		var value := JSON.stringify({"slot_id": pair[0], "world_time": pair[1]})
		store.put(value, key)
	var seed_r = await w.wait(10.0, get_tree())
	out["seed_ok"] = not _is_timeout(seed_r) and seed_r == true
	if not out["seed_ok"]:
		return out

	var lower := _make_js_array([1, 0])
	var upper := _make_js_array([1, 10000])
	var scan := await _cursor_scan("turn_records_test", lower, upper)
	out["fire_count"] = scan["fire_count"]
	out["completed"] = scan["completed"]

	var world_times: Array = []
	var all_slot1 := true
	for rec in scan["records"]:
		world_times.append(int(rec.get("world_time", -1)))
		if int(rec.get("slot_id", -1)) != 1:
			all_slot1 = false
	out["world_times_in_order"] = world_times
	out["record_count"] = world_times.size()
	out["ordered_ascending"] = _is_sorted_ascending(world_times)
	out["all_records_slot1"] = all_slot1
	# fire_count = N matching records + 1 final null-cursor call.
	out["fire_count_matches_record_count_plus_one"] = scan["fire_count"] == world_times.size() + 1

	out["pass"] = out["completed"] and out["record_count"] == 5 \
			and out["ordered_ascending"] and out["all_records_slot1"] \
			and out["fire_count_matches_record_count_plus_one"] \
			and out["array_build_length_ok"] and out["array_build_values_ok"]
	return out


# --- 2b.3: multi-store transaction (put + deletes, commit and abort) -------

func _seed_records(store_name: String, keys: Array) -> bool:
	var tx = _db.transaction(store_name, "readwrite")
	var store = tx.objectStore(store_name)
	var w := Waiter.new()
	var done_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle(true))
	var fail_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle(false))
	_keep.append(done_cb)
	_keep.append(fail_cb)
	tx.addEventListener("complete", done_cb)
	tx.addEventListener("error", fail_cb)
	tx.addEventListener("abort", fail_cb)
	for pair in keys:
		store.put(JSON.stringify({"slot_id": pair[0], "world_time": pair[1]}), _make_js_array(pair))
	var r = await w.wait(10.0, get_tree())
	return not _is_timeout(r) and r == true


func _multi_store_commit(del_keys: Array) -> Dictionary:
	var out := {}
	var store_names := _make_js_array(["snapshot_store", "turn_records_test"])
	var tx = _db.transaction(store_names, "readwrite")
	var snap_store = tx.objectStore("snapshot_store")
	var turn_store = tx.objectStore("turn_records_test")

	var fire_count := {"n": 0}
	var w := Waiter.new()
	var complete_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void:
		fire_count["n"] += 1
		w.settle(true))
	var error_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle(false))
	_keep.append(complete_cb)
	_keep.append(error_cb)
	tx.addEventListener("complete", complete_cb)
	tx.addEventListener("error", error_cb)
	tx.addEventListener("abort", error_cb)

	snap_store.put(JSON.stringify({"snapshot": "commit_variant", "world_time": 999}), "snap_commit")
	for pair in del_keys:
		turn_store.delete(_make_js_array(pair))

	var r = await w.wait(10.0, get_tree())
	out["oncomplete_fire_count"] = fire_count["n"]
	out["settled_ok"] = not _is_timeout(r) and r == true

	var snap_read := await _idb_get_value("snapshot_store", "snap_commit")
	out["snapshot_persisted"] = snap_read.get("ok", false) and snap_read.get("value") != null

	var still_present := 0
	for pair in del_keys:
		var rr := await _idb_get_value("turn_records_test", _make_js_array(pair))
		if rr.get("ok", false) and rr.get("value") != null:
			still_present += 1
	out["deleted_records_remaining"] = still_present

	out["pass"] = out["settled_ok"] and out["oncomplete_fire_count"] == 1 \
			and out["snapshot_persisted"] and still_present == 0
	return out


func _multi_store_abort(del_keys: Array) -> Dictionary:
	var out := {}
	var store_names := _make_js_array(["snapshot_abort_store", "turn_records_abort_test"])
	var tx = _db.transaction(store_names, "readwrite")
	var snap_store = tx.objectStore("snapshot_abort_store")
	var turn_store = tx.objectStore("turn_records_abort_test")

	var w := Waiter.new()
	var abort_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle("aborted"))
	var complete_cb := JavaScriptBridge.create_callback(func(_a: Array) -> void: w.settle("completed"))
	_keep.append(abort_cb)
	_keep.append(complete_cb)
	tx.addEventListener("abort", abort_cb)
	tx.addEventListener("complete", complete_cb)

	snap_store.put(JSON.stringify({"snapshot": "abort_variant", "world_time": 998}), "snap_abort")
	for pair in del_keys:
		turn_store.delete(_make_js_array(pair))
	tx.abort()  # "abort" is not a GDScript keyword — plain dot-call is fine here.

	var r = await w.wait(10.0, get_tree())
	out["settle_reason"] = str(r) if not _is_timeout(r) else "timeout"

	var snap_read := await _idb_get_value("snapshot_abort_store", "snap_abort")
	out["snapshot_rolled_back"] = snap_read.get("ok", false) and snap_read.get("value") == null

	var still_present := 0
	for pair in del_keys:
		var rr := await _idb_get_value("turn_records_abort_test", _make_js_array(pair))
		if rr.get("ok", false) and rr.get("value") != null:
			still_present += 1
	out["deletes_rolled_back"] = still_present == del_keys.size()

	out["pass"] = out["settle_reason"] == "aborted" and out["snapshot_rolled_back"] \
			and out["deletes_rolled_back"]
	return out


func _exp2b_multi_store_tx() -> Dictionary:
	var out := {"name": "multi_store_transaction"}

	var del_keys := [[9, 111], [9, 222], [9, 333]]
	out["seed_delete_targets_ok"] = await _seed_records("turn_records_test", del_keys)
	out["commit_variant"] = await _multi_store_commit(del_keys)

	var del_keys_abort := [[9, 611], [9, 622], [9, 633]]
	await _seed_records("turn_records_abort_test", del_keys_abort)
	out["abort_variant"] = await _multi_store_abort(del_keys_abort)

	out["pass"] = out["commit_variant"].get("pass", false) and out["abort_variant"].get("pass", false)
	return out


# ------------------------------------------- exp3: Web Locks pending Promise

func _promise_executor(args: Array) -> void:
	# args = [resolve, reject]
	_lock_resolve = args[0]


func _direct_hold_cb(args: Array) -> Variant:
	_grant_state["called"] = true
	_grant_state["lock_nonnull"] = args.size() > 0 and args[0] != null
	return _pending_promise  # Plan A: relies on Callable return crossing the bridge


func _exp3() -> Dictionary:
	var out := {"name": "web_locks_pending_promise"}
	var navigator: JavaScriptObject = JavaScriptBridge.get_interface("navigator")
	var locks = navigator.locks
	if locks == null:
		out["error"] = "navigator.locks unavailable"
		return out
	out["direct_return"] = await _locks_cycle(locks, "direct_return", LOCK_NAME + "_a")
	if not out["direct_return"].get("held_while_pending", false):
		out["bind_trick"] = await _locks_cycle(locks, "bind_trick", LOCK_NAME + "_b")
	out["pass"] = out["direct_return"].get("pass", false) \
			or out.get("bind_trick", {}).get("pass", false)
	return out


func _locks_cycle(locks: JavaScriptObject, mode: String, lock_name: String) -> Dictionary:
	var out := {"mode": mode, "lock_name": lock_name}

	# Pending promise constructed from GDScript; resolve stashed.
	_lock_resolve = null
	_grant_state = {"called": false, "lock_nonnull": false}
	var exec_cb := JavaScriptBridge.create_callback(_promise_executor)
	_keep.append(exec_cb)
	_pending_promise = JavaScriptBridge.create_object("Promise", exec_cb)
	out["executor_ran_and_resolve_stashed"] = _lock_resolve != null
	if _lock_resolve == null:
		out["error"] = "Promise executor did not hand resolve back to GDScript"
		return out
	var stashed_resolve: JavaScriptObject = _lock_resolve

	var opts: JavaScriptObject = JavaScriptBridge.create_object("Object")
	opts.ifAvailable = true

	var hold_cb_js: JavaScriptObject
	if mode == "direct_return":
		hold_cb_js = JavaScriptBridge.create_callback(_direct_hold_cb)
	else:
		# Plan B: cb = Promise.resolve.bind(Promise, pending) — calling it returns
		# a promise that stays pending until our pending promise resolves.
		var promise_iface: JavaScriptObject = JavaScriptBridge.get_interface("Promise")
		var resolve_fn = promise_iface.resolve
		hold_cb_js = resolve_fn.bind(promise_iface, _pending_promise)
	_keep.append(hold_cb_js)

	var req_promise = locks.request(lock_name, opts, hold_cb_js)
	var req_state := {"settled": false}
	var settle_cb := JavaScriptBridge.create_callback(
			func(_args: Array) -> void: req_state["settled"] = true)
	_keep.append(settle_cb)
	req_promise.then(settle_cb, settle_cb)

	await _sleep(0.25)
	if mode == "direct_return":
		out["grant_cb_called"] = _grant_state["called"]
		out["grant_cb_lock_nonnull"] = _grant_state["lock_nonnull"]
	out["request_promise_settled_early"] = req_state["settled"]
	out["query_held_while_pending"] = await _query_holds(locks, lock_name)
	var probe1 := await _probe_lock(locks, lock_name)
	out["probe_while_held_granted"] = probe1  # expect false while held
	out["held_while_pending"] = out["query_held_while_pending"] \
			and not probe1 and not req_state["settled"]

	# Hold across an arbitrary GDScript-controlled duration.
	await _sleep(1.0)
	out["still_held_after_1s"] = (await _query_holds(locks, lock_name)) and not req_state["settled"]

	# Release from GDScript via stashed resolve.
	_invoke_js_function(stashed_resolve)
	await _sleep(0.25)
	out["request_promise_settled_after_release"] = req_state["settled"]
	out["query_held_after_release"] = await _query_holds(locks, lock_name)
	var probe2 := await _probe_lock(locks, lock_name)
	out["probe_after_release_granted"] = probe2  # expect true after release

	out["pass"] = out["held_while_pending"] and out["still_held_after_1s"] \
			and out["request_promise_settled_after_release"] \
			and not out["query_held_after_release"] and probe2
	return out


## ifAvailable probe: true = lock granted (was free), false = null (busy).
func _probe_lock(locks: JavaScriptObject, lock_name: String) -> bool:
	var w := Waiter.new()
	var cb := JavaScriptBridge.create_callback(
			func(args: Array) -> void: w.settle(args.size() > 0 and args[0] != null))
	_keep.append(cb)
	var opts: JavaScriptObject = JavaScriptBridge.create_object("Object")
	opts.ifAvailable = true
	locks.request(lock_name, opts, cb)
	var r = await w.wait(5.0, get_tree())
	if typeof(r) == TYPE_BOOL:
		return r
	_log("probe_lock_timeout", {"lock": lock_name})
	return false


func _query_holds(locks: JavaScriptObject, lock_name: String) -> bool:
	var res = await _await_promise(locks.query(), 5.0)
	if _is_timeout(res) or not res.get("ok", false) or res.get("value") == null:
		return false
	var held = res["value"].held
	if held == null:
		return false
	var n := int(held.length)
	for i in n:
		var item = held.at(i)
		if item != null and str(item.name) == lock_name:
			return true
	return false


# --------------------------------------------- exp5: IDBFS mtime collision

func _write_file(path: String, content: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(content)
	f.close()  # close raises the IDBFS dirty flag (os_web.cpp file close callback)


func _read_file(path: String) -> String:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return ""
	return f.get_as_text()


func _wait_for_second_boundary() -> void:
	var start := int(Time.get_unix_time_from_system())
	while int(Time.get_unix_time_from_system()) == start:
		await get_tree().process_frame


## Reads the raw IDBFS record for a user:// file straight out of IndexedDB
## (DB "/userfs", store "FILE_DATA") — lets us see the STORED mtime and content
## without reloading the page. Returns {found, mtime_ms, first_char}.
func _read_idbfs_record(user_path: String) -> Dictionary:
	var fs_path := ProjectSettings.globalize_path(user_path)
	var idb: JavaScriptObject = JavaScriptBridge.get_interface("indexedDB")
	var w := Waiter.new()
	var open_req = idb.open("/userfs")  # existing DB, no version bump
	var ok_cb := JavaScriptBridge.create_callback(
			func(args: Array) -> void: w.settle({"ok": true, "ev": args[0]}))
	var err_cb := JavaScriptBridge.create_callback(
			func(_args: Array) -> void: w.settle({"ok": false}))
	_keep.append(ok_cb)
	_keep.append(err_cb)
	open_req.addEventListener("success", ok_cb)
	open_req.addEventListener("error", err_cb)
	var r = await w.wait(5.0, get_tree())
	if _is_timeout(r) or not r.get("ok", false):
		return {"found": false, "error": "userfs db open failed"}
	var db = r["ev"].target.result
	var tx = db.transaction("FILE_DATA", "readonly")
	var store = tx.objectStore("FILE_DATA")
	var get_req = store.get(fs_path)
	var w2 := Waiter.new()
	var got_cb := JavaScriptBridge.create_callback(
			func(args: Array) -> void: w2.settle({"ok": true, "ev": args[0]}))
	var got_err := JavaScriptBridge.create_callback(
			func(_args: Array) -> void: w2.settle({"ok": false}))
	_keep.append(got_cb)
	_keep.append(got_err)
	get_req.addEventListener("success", got_cb)
	get_req.addEventListener("error", got_err)
	var r2 = await w2.wait(5.0, get_tree())
	db.close()
	if _is_timeout(r2) or not r2.get("ok", false):
		return {"found": false, "error": "get failed"}
	var record = r2["ev"].target.result
	if record == null:
		return {"found": false}
	var out := {"found": true}
	if record.timestamp != null:
		out["mtime_ms"] = float(record.timestamp.getTime())
	if record.contents != null:
		out["first_char"] = char(int(record.contents.at(0)))
	return out


func _mtime_trial(idx: int, gap_wait_s: float, same_second: bool) -> Dictionary:
	var path := "user://mtime_%03d.dat" % idx
	if same_second:
		await _wait_for_second_boundary()
	var t_a := Time.get_unix_time_from_system()
	_write_file(path, "A:%03d:%s" % [idx, "x".repeat(64)])
	JavaScriptBridge.force_fs_sync()
	await _sleep(gap_wait_s)  # sync starts next frame; give the IDB commit time to land
	var remote_after_a := await _read_idbfs_record(path)
	if not same_second:
		await _sleep(1.2)  # control: push write B into a different wall-clock second
	var t_b := Time.get_unix_time_from_system()
	_write_file(path, "B:%03d:%s" % [idx, "y".repeat(64)])
	JavaScriptBridge.force_fs_sync()
	await _sleep(0.3)
	var remote_after_b := await _read_idbfs_record(path)
	return {
		"idx": idx,
		"path": path,
		"t_a_unix": t_a,
		"t_b_unix": t_b,
		"same_epoch_second": int(t_a) == int(t_b),
		"gap_ms": (t_b - t_a) * 1000.0,
		"memfs_readback_is_b": _read_file(path).begins_with("B:"),
		"remote_after_a": remote_after_a,
		"remote_after_b": remote_after_b,
		"stored_mtime_delta_ms": remote_after_b.get("mtime_ms", 0.0) - remote_after_a.get("mtime_ms", 0.0),
	}


func _exp5_phase1() -> Dictionary:
	var out := {"name": "mtime_collision_phase1", "trials": []}
	_log("userfs_path", {"globalized": ProjectSettings.globalize_path("user://mtime_000.dat")})
	for i in N_MTIME_TRIALS:
		# First half: comfortable 250ms gap. Second half: tight ~80ms gap to
		# squeeze write B as close to write A's synced mtime as a sync allows.
		var gap := 0.25 if i < N_MTIME_TRIALS / 2 else 0.08
		var trial := await _mtime_trial(i, gap, true)
		out["trials"].append(trial)
		_log("mtime_trial", trial)
	out["control_different_second"] = await _mtime_trial(100, 0.25, false)
	_log("mtime_control", out["control_different_second"])
	return out


func _read_trial(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {"path": path, "status": "MISSING"}
	var content := _read_file(path)
	var status := "UNEXPECTED"
	if content.begins_with("B:"):
		status = "B_SURVIVED"
	elif content.begins_with("A:"):
		status = "A_ONLY_DATA_LOSS"
	return {"path": path, "status": status, "head": content.left(12)}


func _exp5_phase2() -> Dictionary:
	var out := {"name": "mtime_collision_phase2", "files": []}
	for i in N_MTIME_TRIALS:
		out["files"].append(_read_trial("user://mtime_%03d.dat" % i))
	out["control_different_second"] = _read_trial("user://mtime_100.dat")
	return out
