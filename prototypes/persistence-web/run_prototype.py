# Prototype harness: serves build/, drives headless Chrome through phase 1 and
# phase 2 (page reload for the IDBFS mtime test), collects /report + /log POSTs,
# writes results.json and prints verdicts.
# Throwaway code per .claude/rules/prototype-code.md.
#
# Run:            python run_prototype.py
# LAN device run: python run_prototype.py --serve   (see DEVICE-TEST.md)

import argparse
import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(ROOT, "build")
PORT = 8766
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE = os.path.join(tempfile.gettempdir(), "persistence-web-chrome-profile")
MAX_LATENCY_BUDGET_MS = 150.0  # max_perceived_autosave_latency_ms default

FLAG_SETS = [
    ["--headless=new", "--mute-audio", "--no-first-run", "--hide-scrollbars",
     "--window-size=1280,800", "--enable-unsafe-swiftshader"],
    ["--headless=new", "--mute-audio", "--no-first-run", "--hide-scrollbars",
     "--window-size=1280,800", "--enable-unsafe-swiftshader",
     "--use-angle=swiftshader", "--disable-gpu"],
]

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".wasm": "application/wasm",
    ".pck": "application/octet-stream",
    ".png": "image/png",
    ".json": "application/json",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    reports = []
    logs = []
    report_event = threading.Event()

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=BUILD, **kw)

    def log_message(self, *a):
        pass

    def guess_type(self, path):
        for ext, mime in MIME.items():
            if str(path).lower().endswith(ext):
                return mime
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n)
        try:
            data = json.loads(raw)
        except Exception:
            data = {"unparsed": raw[:500].decode("utf-8", "replace")}
        if self.path == "/report":
            Handler.reports.append(data)
            Handler.report_event.set()
            print("  [report] phase=%s keys=%s" % (data.get("phase"), sorted(data.keys())))
        elif self.path == "/log":
            Handler.logs.append(data)
            print("  [log] p%s %s" % (data.get("phase"), data.get("step")))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


def kill_tree(proc):
    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                   capture_output=True)
    for _ in range(40):
        if proc.poll() is not None:
            break
        time.sleep(0.25)
    time.sleep(1.0)  # let profile locks release


def run_phase(phase, flags, timeout=240):
    Handler.report_event.clear()
    url = f"http://localhost:{PORT}/index.html?phase={phase}"
    print(f"[phase {phase}] chrome {url}")
    proc = subprocess.Popen([CHROME, *flags, f"--user-data-dir={PROFILE}", url],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    got = Handler.report_event.wait(timeout=timeout)
    time.sleep(1.0)  # let any trailing /log POSTs land
    kill_tree(proc)
    return Handler.reports[-1] if got else None


def verdict_exp2(p1):
    e = (p1 or {}).get("exp2_idb", {})
    lines = ["--- #2 IndexedDB write path via JavaScriptBridge ---"]
    if not e or e.get("error"):
        lines.append(f"  FAIL: {e.get('error', 'no data')}")
        return "\n".join(lines), False
    lat = e.get("latency", {})
    ok = e.get("oncomplete_reached_gdscript") and all(
        s.get("ordering_put_success_before_oncomplete_all") for s in lat.values())
    lines.append(f"  oncomplete reached GDScript: {e.get('oncomplete_reached_gdscript')}")
    lines.append("  ordering (put.success before tx.complete, all iters): %s" %
                 all(s.get("ordering_put_success_before_oncomplete_all") for s in lat.values()))
    lines.append(f"  budget max_perceived_autosave_latency_ms = {MAX_LATENCY_BUDGET_MS}")
    lines.append("  size    bytes      p50 e2e   p95 e2e   min      max      p50 serialize  within budget(p95)")
    for name in ("1KB", "100KB", "1MB"):
        s = lat.get(name)
        if not s:
            continue
        lines.append("  %-6s %-10d %-9.2f %-9.2f %-8.2f %-8.2f %-14.2f %s" % (
            name, s["bytes"], s["e2e_ms_p50"], s["e2e_ms_p95"], s["e2e_ms_min"],
            s["e2e_ms_max"], s["serialize_ms_p50"],
            "YES" if s["e2e_ms_p95"] <= MAX_LATENCY_BUDGET_MS else "NO"))
    lines.append(f"  VERDICT: {'PASS' if ok else 'FAIL'}")
    return "\n".join(lines), bool(ok)


def verdict_exp3(p1):
    e = (p1 or {}).get("exp3_locks", {})
    lines = ["--- #3 Web Locks held across session (pending Promise from GDScript) ---"]
    if not e or e.get("error"):
        lines.append(f"  FAIL: {e.get('error', 'no data')}")
        return "\n".join(lines), False
    for mode in ("direct_return", "bind_trick"):
        c = e.get(mode)
        if not c:
            continue
        lines.append(f"  [{mode}] pass={c.get('pass')}")
        for k in ("executor_ran_and_resolve_stashed", "grant_cb_called",
                  "grant_cb_lock_nonnull", "request_promise_settled_early",
                  "query_held_while_pending", "probe_while_held_granted",
                  "held_while_pending", "still_held_after_1s",
                  "request_promise_settled_after_release",
                  "query_held_after_release", "probe_after_release_granted"):
            if k in c:
                lines.append(f"      {k}: {c[k]}")
    lines.append(f"  VERDICT: {'PASS' if e.get('pass') else 'FAIL'}")
    return "\n".join(lines), bool(e.get("pass"))


def verdict_exp5(p1, p2):
    t1 = (p1 or {}).get("exp5_phase1", {})
    t2 = (p2 or {}).get("exp5_phase2", {})
    lines = ["--- #5 IDBFS mtime-collision skip (evidence gathering) ---"]
    if not t1 or not t2:
        lines.append("  INCONCLUSIVE: missing phase data")
        return "\n".join(lines), None
    trials = {t["idx"]: t for t in t1.get("trials", [])}
    losses = 0
    survived = 0
    lines.append("  idx  same-second  gap_ms   remoteA  remoteB  stored-mtime-delta-ms  after-reload")
    for f in t2.get("files", []):
        idx = int(f["path"].split("_")[-1].split(".")[0])
        tr = trials.get(idx, {})
        st = f["status"]
        if st == "A_ONLY_DATA_LOSS":
            losses += 1
        elif st == "B_SURVIVED":
            survived += 1
        ra = tr.get("remote_after_a", {})
        rb = tr.get("remote_after_b", {})
        lines.append("  %-4d %-12s %-8.1f %-8s %-8s %-22.1f %s" % (
            idx, tr.get("same_epoch_second"), tr.get("gap_ms", -1),
            ra.get("first_char", "?") if ra.get("found") else "none",
            rb.get("first_char", "?") if rb.get("found") else "none",
            tr.get("stored_mtime_delta_ms", -1), st))
    c1 = t1.get("control_different_second", {})
    c2 = t2.get("control_different_second", {})
    lines.append("  ctrl %-12s %-8.1f %s" % (
        c1.get("same_epoch_second"), c1.get("gap_ms", -1), c2.get("status")))
    lines.append(f"  same-second trials: {survived + losses}, B survived: {survived}, data loss: {losses}")
    lines.append("  OUTCOME: %s" % (
        "DATA LOSS OBSERVED — mtime skip is real at this granularity"
        if losses else "no data loss observed in these trials"))
    return "\n".join(lines), losses


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def serve_forever_lan():
    srv = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    ip = lan_ip()
    print(f"Serving build/ for device testing:")
    print(f"  phase 1: http://{ip}:{PORT}/index.html?phase=1")
    print(f"  phase 2: http://{ip}:{PORT}/index.html?phase=2")
    print("NOTE: navigator.storage / Web Locks need a SECURE CONTEXT — over plain")
    print("      http on LAN they will report unavailable. See DEVICE-TEST.md for")
    print("      the https-tunnel option. Reports are appended to device-reports.json.")
    print("Ctrl+C to stop.")
    out = os.path.join(ROOT, "device-reports.json")
    try:
        while True:
            Handler.report_event.wait(timeout=3600)
            if Handler.report_event.is_set():
                Handler.report_event.clear()
                with open(out, "w", encoding="utf-8") as f:
                    json.dump({"reports": Handler.reports, "logs": Handler.logs}, f, indent=2)
                print(f"  wrote {out} ({len(Handler.reports)} reports)")
    except KeyboardInterrupt:
        srv.shutdown()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", action="store_true", help="LAN serve only (device testing)")
    args = ap.parse_args()

    if not os.path.isdir(BUILD) or not os.path.exists(os.path.join(BUILD, "index.html")):
        print("build/ missing — export first (see README.md)")
        sys.exit(1)

    if args.serve:
        serve_forever_lan()
        return

    if not os.path.exists(CHROME):
        print("Chrome not found at", CHROME)
        sys.exit(1)

    shutil.rmtree(PROFILE, ignore_errors=True)

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    p1 = None
    for i, flags in enumerate(FLAG_SETS):
        p1 = run_phase(1, flags)
        if p1 is not None:
            break
        print(f"[phase 1] no report with flag set {i}; retrying with next flag set")
        shutil.rmtree(PROFILE, ignore_errors=True)
    if p1 is None:
        print("FATAL: phase 1 never reported. Logs so far:")
        print(json.dumps(Handler.logs, indent=2)[:4000])
        sys.exit(2)

    p2 = run_phase(2, flags)
    if p2 is None:
        print("WARNING: phase 2 never reported (mtime verdict incomplete)")

    srv.shutdown()

    v2_text, v2 = verdict_exp2(p1)
    v3_text, v3 = verdict_exp3(p1)
    v5_text, v5_losses = verdict_exp5(p1, p2)

    results = {
        "phase1": p1,
        "phase2": p2,
        "logs": Handler.logs,
        "verdicts": {"exp2_pass": v2, "exp3_pass": v3,
                     "exp5_same_second_losses": v5_losses},
        "budget_max_perceived_autosave_latency_ms": MAX_LATENCY_BUDGET_MS,
    }
    out = os.path.join(ROOT, "results.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print()
    print(v2_text)
    print()
    print(v3_text)
    print()
    print(v5_text)
    print()
    print("results written to", out)


if __name__ == "__main__":
    main()
