# Architecture

This repo bundles three pieces that work together on a home LAN:

```
┌─────────────┐     websocket/REST      ┌──────────────┐
│  Dev host   │ ────────────────────────► │ Samsung TV   │
│  (tooling)  │     token auth :8001      │  <tv-ip>     │
└──────┬──────┘                         └──────┬───────┘
       │                                         │
       │  ADB drive loop                         │  fetch JSON
       ▼                                         ▼
┌─────────────┐     HTTP :8090            ┌──────────────┐
│  Android    │                         │  Tizen app   │
│  tablet     │                         │  (tizen-app/)│
└─────────────┘                         └──────────────┘
       │
       ▼
┌─────────────┐
│  tv-hub     │  stdlib Python server — manifests + static assets
│  server.py  │
└─────────────┘
```

## Token auth flow (TV)

1. Install `samsungtvws` CLI on a host on the same subnet as the TV.
2. Run `samsungtv --host <tv-ip> --token-file ~/.config/tv-token device-info`.
3. Accept the one-time "Allow" prompt on the TV.
4. The CLI writes a token file; subsequent commands reuse it without re-prompting.

See [playbook.md](../playbook.md) for the full command reference.

## ADB drive loop (tablet)

The playbook documents a headless loop: screencap for vision, `uiautomator dump` for structure, `input tap/swipe/text` for actions. This is useful for automating apps that have no public API.

## tv-hub

`tv-hub/server.py` is a threading HTTP server with open CORS. TV apps call it over LAN; it does not authenticate callers (intended for trusted home networks only).

Configure before running:

| Variable | Purpose |
|---|---|
| `TV_HUB_HOST` | Address embedded in manifest URLs (set to your LAN IP) |
| `TV_HUB_PORT` | Listen port (default 8090) |
| `ARK_JOBS_DIR` | Optional path to render-queue JSON files |

## Tizen sideload

Developer mode must be enabled on the TV (remote sequence 1-2-3-4-5 in the Apps panel). Point the TV at `<hub-ip>`, reboot, then use `sdb connect <tv-ip>:26101` and `tizen install` with a Samsung-issued certificate.

Stock firmware cannot enable dev mode remotely.
