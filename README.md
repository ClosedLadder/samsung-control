# samsung-control

[![CI](https://github.com/ClosedLadder/samsung-control/actions/workflows/ci.yml/badge.svg)](https://github.com/ClosedLadder/samsung-control/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Home-automation tooling for Samsung Tizen TVs on a LAN: discovery notes, token-based remote auth, documented ADB drive loops for Android tablets, a small tv-hub HTTP server, and a sample Tizen companion app.

**What this is:** personal-lab automation — a playbook (TV and tablet commands), a stdlib tv-hub server, and a sample Tizen app, used to control TVs and tablets on a private network. The ADB tablet loop is documented as commands in `playbook.md`; no ADB script ships in this repo.

**What this isn't:** a Samsung-supported API, a commercial product, or a turnkey cloud service. Expect one-time on-TV prompts, LAN-only reachability, and firmware-specific limits.

## Contents

| Path | Description |
|---|---|
| [playbook.md](playbook.md) | Control playbook — TV token auth, REST/websocket commands, ADB drive loop, sideloading |
| [tv-hub/server.py](tv-hub/server.py) | Stdlib HTTP server serving JSON manifests and static assets for TV apps |
| [tizen-app/](tizen-app/) | Sample Tizen web widget (ARK Showcase) with offline SAMPLE fallback |
| [docs/](docs/) | Architecture overview and sideload checklist |

## Requirements

- Python 3.11+ (tv-hub; stdlib only)
- `pip install "samsungtvws[cli]"` for TV remote commands (see playbook)
- Android SDK platform-tools for ADB tablet control (optional)
- Tizen Studio CLI / `sdb` for packaging and sideloading the TV app (optional)
- Samsung TV and host on the **same LAN subnet** for websocket remote

## Quickstart

### 1. Pair with your TV

```bash
pip install "samsungtvws[cli]"
export TV=<tv-ip>
samsungtv --host $TV --token-file ~/.config/tv-token device-info
# Accept the one-time Allow prompt on the TV
samsungtv --host $TV send-key KEY_HOME
```

### 2. Run tv-hub

```bash
export TV_HUB_HOST=<hub-ip>   # your LAN address, not 127.0.0.1 if TVs will fetch it
cd tv-hub
python3 server.py
# Listening on http://<hub-ip>:8090
```

Optional: copy `tv-hub/data/trading.example.json` to `trading.json` and edit. Drop images into `tv-hub/photos/` and `tv-hub/ark/`.

### 3. Preview the Tizen app (desktop)

```bash
cd tizen-app
# Edit API_BASE in app.js (and CSP in index.html, access in config.xml) to match TV_HUB_HOST
python3 -m http.server 8765
# Open http://127.0.0.1:8765 — arrow keys + Enter
```

### 4. Sideload to TV

See [docs/tizen-sideload.md](docs/tizen-sideload.md). Requires developer mode on the TV and a Samsung signing certificate.

## What works

- TV remote via `samsungtvws` after token pairing (keys, app launch, browser open)
- REST app install/launch on port 8001 (region-dependent store IDs)
- Headless ADB automation loop on Android tablets (screencap, UI dump, tap/swipe), as documented commands in the playbook
- tv-hub JSON endpoints with open CORS for LAN TV clients
- Tizen app with spatial focus navigation and SAMPLE fallback when the hub is down

## Known limits

- **No screen capture from the TV** on stock firmware — verification is indirect (REST app list, in-app badge).
- **One-time Allow prompt** cannot be bypassed remotely.
- **Websocket remote** does not work across subnets/VLANs.
- **Power on from full off** needs WoL or SmartThings; websocket alone cannot do it.
- **tv-hub has no authentication** — intended for trusted home LANs only.
- **DLNA push** is unreliable on 2023+ Samsung firmware.
- **Sideloaded apps** are removed if developer mode is turned off.

## License

MIT — see [LICENSE](LICENSE).
