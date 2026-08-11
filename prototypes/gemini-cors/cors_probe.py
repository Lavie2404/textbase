# Prototype: CORS policy of the Gemini API endpoint from a browser origin.
# Throwaway code per .claude/rules/prototype-code.md — NOT production.
#
# Two independent measurements:
#   A) Raw preflight probe (no browser): send OPTIONS with Origin /
#      Access-Control-Request-* headers, dump the Access-Control-* response
#      headers verbatim, for several candidate game origins.
#   B) Real browser test: serve a page from http://localhost:8765 (a genuine
#      cross-origin browser context), run headless Chrome, page does fetch()
#      POST to the endpoint (same shape Godot's HTTPRequest/fetch will use).
#      CORS PASS = the page can READ the response (any HTTP status, even 400
#      for a bad API key). CORS FAIL = fetch rejects with TypeError while the
#      network is up.
#
# Run: python cors_probe.py            (writes results.json, prints verdict)

import http.client
import http.server
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.parse

HOST = "generativelanguage.googleapis.com"
MODEL_PATH = "/v1beta/models/gemini-2.0-flash:generateContent"
PORT = 8765
CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]
ORIGINS = [
    "http://localhost:8765",          # local dev / prototype origin
    "https://html-classic.itch.zone", # itch.io game iframe origin
    "https://duchx.github.io",        # GitHub Pages candidate host
    "https://game.example.com",       # arbitrary unknown origin
]

RESULTS = {"preflight": [], "browser": None, "meta": {"endpoint": HOST + MODEL_PATH}}


def preflight_probe(origin: str, request_headers: str) -> dict:
    conn = http.client.HTTPSConnection(HOST, timeout=20)
    conn.request(
        "OPTIONS",
        MODEL_PATH,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": request_headers,
            "User-Agent": "Mozilla/5.0 (cors-prototype)",
        },
    )
    resp = conn.getresponse()
    body = resp.read(2048)
    acao = {k.lower(): v for k, v in resp.getheaders() if k.lower().startswith("access-control")}
    out = {
        "origin": origin,
        "request_headers": request_headers,
        "status": resp.status,
        "access_control_headers": acao,
    }
    conn.close()
    return out


TEST_PAGE = """<!doctype html><meta charset="utf-8"><title>gemini cors probe</title>
<script>
const ENDPOINT = "https://%s%s";
async function probe(label, opts) {
  try {
    const r = await fetch(ENDPOINT + (opts.query || ""), {
      method: "POST",
      mode: "cors",
      headers: opts.headers,
      body: JSON.stringify({contents:[{parts:[{text:"ping"}]}]}),
    });
    let bodySnippet = "";
    try { bodySnippet = (await r.text()).slice(0, 300); } catch (e) { bodySnippet = "<unreadable: " + e + ">"; }
    return {label, ok: true, status: r.status, bodyReadable: true, bodySnippet};
  } catch (e) {
    return {label, ok: false, error: String(e)};
  }
}
async function main() {
  // Control: prove network is up from this page (same-origin ping).
  const control = await fetch("/ping").then(r => r.ok).catch(() => false);
  const results = {control_network_ok: control, probes: []};
  // Variant 1: API key via x-goog-api-key header (non-simple -> forces preflight)
  results.probes.push(await probe("header-key", {headers: {"Content-Type": "application/json", "x-goog-api-key": "DUMMY_KEY_CORS_PROBE"}}));
  // Variant 2: API key via ?key= query param (Content-Type json still forces preflight)
  results.probes.push(await probe("query-key", {query: "?key=DUMMY_KEY_CORS_PROBE", headers: {"Content-Type": "application/json"}}));
  await fetch("/report", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(results)});
}
main();
</script>ok
""" % (HOST, MODEL_PATH)


class Handler(http.server.BaseHTTPRequestHandler):
    report = None
    report_event = threading.Event()

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/ping":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"pong")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(TEST_PAGE.encode())

    def do_POST(self):
        if self.path == "/report":
            n = int(self.headers.get("Content-Length", 0))
            Handler.report = json.loads(self.rfile.read(n))
            Handler.report_event.set()
            self.send_response(200)
            self.end_headers()


def browser_test() -> dict:
    chrome = next((c for c in CHROME_CANDIDATES if os.path.exists(c)), None)
    if not chrome:
        return {"error": "chrome not found"}
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    profile = os.path.join(os.environ.get("TEMP", "."), "cors-probe-profile")
    proc = subprocess.Popen(
        [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
         f"--user-data-dir={profile}", f"http://localhost:{PORT}/"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    got = Handler.report_event.wait(timeout=60)
    proc.kill()
    srv.shutdown()
    return Handler.report if got else {"error": "no report from browser within 60s"}


def main():
    for origin in ORIGINS:
        for hdrs in ("content-type,x-goog-api-key", "content-type"):
            try:
                RESULTS["preflight"].append(preflight_probe(origin, hdrs))
            except Exception as e:
                RESULTS["preflight"].append({"origin": origin, "request_headers": hdrs, "error": str(e)})

    RESULTS["browser"] = browser_test()

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(RESULTS, f, indent=2, ensure_ascii=False)

    b = RESULTS["browser"] or {}
    probes = b.get("probes", [])
    browser_pass = bool(probes) and all(p.get("ok") and p.get("bodyReadable") for p in probes)
    print(json.dumps(RESULTS, indent=2)[:4000])
    print("\nVERDICT:", "PASS" if browser_pass else "FAIL/INCONCLUSIVE")


if __name__ == "__main__":
    main()
