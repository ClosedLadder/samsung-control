# Build Report — samsung-control

Packaged for public GitHub portfolio (`ClosedLadder/samsung-control`) on 2026-09-27.

## Source

Read-only copy from `~/github-portfolio-src/samsung-control/`.

## File list

```
.github/workflows/ci.yml
.gitignore
BUILD-REPORT.md
LICENSE
README.md
playbook.md
docs/architecture.md
docs/tizen-sideload.md
tizen-app/app.js
tizen-app/config.xml
tizen-app/index.html
tizen-app/README.md
tizen-app/style.css
tv-hub/ark/.gitkeep
tv-hub/data/trading.example.json
tv-hub/photos/.gitkeep
tv-hub/server.py
```

**Excluded from source:** `venv/`, `__pycache__/`, `._*` macOS metadata, `builds/` (duplicate app builds), `packets/` (internal specs), `previews/` (screenshots), `neo-to-astra-*.md` (internal bus traffic), real `trading.json` (financial snapshot).

## Layout mapping

| Source | Destination |
|---|---|
| `STACK.md` | `playbook.md` (sanitized) |
| `tv-hub/server.py` | `tv-hub/server.py` (generalized) |
| `tv-apps-ark-showcase/` | `tizen-app/` |
| Derived docs | `docs/architecture.md`, `docs/tizen-sideload.md` |

## Sanitizations (paths only)

| File | Change |
|---|---|
| `playbook.md` | Replaced LAN IPs with `<tv-ip>` / `<hub-ip>`; removed device model numbers, Tailscale hostnames, Tailscale IPs |
| `tv-hub/server.py` | Replaced hardcoded `192.168.1.175` with `TV_HUB_HOST` env var; removed personal Tailscale peer names; removed `/home/vibe/ark-ep2/` paths (now `ARK_JOBS_DIR`); generalized fleet device list |
| `tv-hub/data/trading.json` | Not copied; replaced with `trading.example.json` (zeroed placeholders) |
| `tizen-app/app.js` | Replaced `192.168.1.175` with `127.0.0.1` (documented as user-configurable) |
| `tizen-app/index.html` | CSP hosts updated to `127.0.0.1:8090` |
| `tizen-app/config.xml` | `<access origin>` updated to `127.0.0.1:8090` with comment |
| `tizen-app/README.md` | Removed personal home-directory paths; uses `<hub-ip>` placeholders |
| `docs/*.md` | Written fresh with placeholder IPs only |
| `README.md` | Written fresh; honest scope and limits |

## Verification

| Check | Result |
|---|---|
| `python3 -m py_compile` on all `.py` | PASS (`tv-hub/server.py`) |
| `bash -n` on all `.sh` | PASS (no shell scripts in package) |
| Relative doc links | PASS (7 links checked) |
| Secrets sweep | PASS — no `192.168.*` or `10.0/10.1.*`; only doc mentions of "password" as generic guidance |
| Personal identifiers sweep | PASS — no hostnames, account data, or home paths |

## CI

`.github/workflows/ci.yml` runs the same compile and shell-syntax commands as local verification. No live TV or network tests in CI.
