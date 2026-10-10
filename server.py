"""Serve the directory site, its data file and the watch list."""

import json
import os
import secrets
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "web" / "dist"
DATA = ROOT / "data"
ALERTS = DATA / "alerts.json"
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8977"))


def load_alerts() -> dict:
    if ALERTS.exists():
        return json.loads(ALERTS.read_text())
    alerts = {"topic": f"tld-watch-{secrets.token_hex(4)}", "watching": []}
    DATA.mkdir(exist_ok=True)
    ALERTS.write_text(json.dumps(alerts, indent=1))
    return alerts


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def send_json(self, body: dict, status: int = 200):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/alerts":
            return self.send_json(load_alerts())
        if path == "/data/tlds.json":
            raw = (DATA / "tlds.json").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(raw)
            return
        if not (DIST / path.lstrip("/")).is_file():
            self.path = "/index.html"  # the site handles its own routes
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/watch":
            return self.send_json({"error": "not found"}, 404)
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        tld = str(body["tld"]).lower().strip(".")
        alerts = load_alerts()
        watching = set(alerts["watching"])
        if body.get("on"):
            watching.add(tld)
        else:
            watching.discard(tld)
        alerts["watching"] = sorted(watching)
        ALERTS.write_text(json.dumps(alerts, indent=1))
        return self.send_json(alerts)


if __name__ == "__main__":
    print(f"http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
