#!/usr/bin/env python3
"""tv-hub data service — LAN-only HTTP server for Tizen TV apps.

Serves JSON + assets that companion TV apps consume.

Endpoints:
  GET /api/status   device / pipeline status (partly live-checked)
  GET /api/trading  trading snapshot (from ./data/trading.json)
  GET /api/photos   photo manifest  (from ./photos/*.jpg|png)
  GET /api/ark      ARK showcase manifest (from ./ark/ + curated text)
  GET /photos/<f>, /ark/<f>  static assets

CORS open for the TV apps. Stdlib only.

Environment:
  TV_HUB_HOST  — LAN address used in manifest URLs (default: 127.0.0.1)
  TV_HUB_PORT  — listen port (default: 8090)
  ARK_JOBS_DIR — optional directory with jobs.json files for queue depth
"""
import json
import os
import subprocess
import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, unquote

HERE = os.path.dirname(os.path.abspath(__file__))
HOST = os.environ.get("TV_HUB_HOST", "127.0.0.1")
PORT = int(os.environ.get("TV_HUB_PORT", "8090"))
ARK_JOBS_DIR = os.environ.get("ARK_JOBS_DIR", "")


def run(cmd, timeout=4):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception:
        return ""


def ts_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def base_url():
    return f"http://{HOST}:{PORT}"


# ---- collectors -------------------------------------------------------------
def lab_status():
    devices = []
    ts = run(["tailscale", "status"])
    online = {}
    for line in ts.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[0][0].isdigit():
            online[parts[1].lower()] = "offline" not in line

    def dev(name, role, key, detail, fallback="unknown"):
        state = "online" if online.get(key, False) else (
            "offline" if key in online else fallback
        )
        devices.append({"name": name, "role": role, "state": state, "detail": detail})

    # Example fleet entries — customize for your LAN
    dev("render-node-1", "compute", "render-node-1", "render farm")
    dev("render-node-2", "compute", "render-node-2", "render farm")
    dev("nas", "storage", "nas", "archive + fast tier")
    dev("tablet", "control", "tablet", "ADB target", "offline")

    queued, current = 0, ""
    if ARK_JOBS_DIR and os.path.isdir(ARK_JOBS_DIR):
        for fn in ("jobs.json", "jobs-surface.json"):
            q = os.path.join(ARK_JOBS_DIR, fn)
            try:
                with open(q) as f:
                    jobs = json.load(f)
                items = jobs if isinstance(jobs, list) else jobs.get("jobs", [])
                queued += sum(
                    1
                    for j in items
                    if str(j.get("status", "")).lower() in ("pending", "queued")
                )
                if not current:
                    for j in items:
                        if str(j.get("status", "")).lower() in (
                            "rendering",
                            "running",
                            "active",
                        ):
                            current = str(j.get("id") or j.get("name") or "")
                            break
            except Exception:
                pass

    gpu = run(["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader"])
    farm_note = "busy" if queued else ("idle" if not current else "rendering")
    return {
        "updated": ts_now(),
        "devices": devices,
        "ark_pipeline": {
            "queued": queued,
            "current_render": current,
            "gpu_util_pct": gpu.replace("\n", ",")[:40],
            "farm_note": farm_note,
        },
        "network": {"tailscale": "ok" if ts else "unknown", "note": "LAN only"},
    }


def trading():
    p = os.path.join(HERE, "data", "trading.json")
    try:
        with open(p) as f:
            d = json.load(f)
        d["updated"] = ts_now()
        return d
    except Exception:
        return {"updated": ts_now(), "error": "no trading snapshot"}


def manifest(subdir, extra=None):
    d = os.path.join(HERE, subdir)
    items = []
    try:
        for fn in sorted(os.listdir(d)):
            if fn.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                items.append({
                    "src": f"{base_url()}/{subdir}/{fn}",
                    "caption": os.path.splitext(fn)[0].replace("-", " ").replace("_", " "),
                })
    except Exception:
        pass
    out = {"photos" if subdir == "photos" else "items": items}
    if extra:
        out.update(extra)
    return out


def ark_manifest():
    d = os.path.join(HERE, "ark")
    stills = []
    try:
        for fn in sorted(os.listdir(d)):
            if fn.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                stills.append({
                    "src": f"{base_url()}/ark/{fn}",
                    "caption": os.path.splitext(fn)[0].replace("-", " ").replace("_", " "),
                })
    except Exception:
        pass
    return {
        "title": "The ARK Road",
        "tagline": "A family trades the 9-to-5 for the open road.",
        "episodes": [{
            "id": "s01e01",
            "title": "The Staircase",
            "runtime": "15:00",
            "synopsis": (
                "Cold open on the highway at dawn. A family in a matte-black "
                "6x6 expedition truck outruns the life they left behind — "
                "three acts of road pressure, mechanical trouble, and the "
                "staircase that decides everything."
            ),
            "craft": "Restrained C recipe · 150 shots · cold open + 3 acts + tag",
            "stills": stills,
        }],
        "world": [
            {"title": "The Truck", "text": "Matte-black 6x6 expedition truck. Not a cage — home."},
            {"title": "The Road", "text": "Postcards from the miles between who they were and who they're becoming."},
        ],
    }


# ---- HTTP -------------------------------------------------------------------
class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        p = unquote(urlparse(self.path).path)
        if p == "/api/status":
            return self._send(200, lab_status())
        if p == "/api/trading":
            return self._send(200, trading())
        if p == "/api/photos":
            return self._send(200, manifest("photos"))
        if p == "/api/ark":
            return self._send(200, ark_manifest())
        if p.startswith("/photos/") or p.startswith("/ark/"):
            fp = os.path.join(HERE, p.lstrip("/"))
            if os.path.isfile(fp) and not os.path.islink(fp):
                ctype = (
                    "image/jpeg"
                    if fp.lower().endswith((".jpg", ".jpeg"))
                    else "image/png"
                    if fp.lower().endswith(".png")
                    else "image/webp"
                )
                try:
                    with open(fp, "rb") as f:
                        return self._send(200, f.read(), ctype)
                except Exception:
                    pass
            return self._send(404, {"error": "not found"})
        if p in ("/", "/health"):
            return self._send(200, {"ok": True, "service": "tv-hub", "time": ts_now()})
        return self._send(404, {"error": "not found"})


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    os.makedirs(os.path.join(HERE, "photos"), exist_ok=True)
    os.makedirs(os.path.join(HERE, "ark"), exist_ok=True)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), H)
    print(f"tv-hub on {base_url()}", flush=True)
    srv.serve_forever()
