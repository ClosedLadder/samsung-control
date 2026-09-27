# Tizen sideload checklist

Steps to install the companion app on a Samsung Tizen TV. Requires physical access to the TV remote.

## Prerequisites

- Samsung account (for signing certificate)
- Tizen Studio CLI or `sdb` + `tizen` tools on a host on the same LAN as the TV
- tv-hub running at `http://<hub-ip>:8090` (see root README)

## Enable developer mode

1. On the TV: Apps panel → press **1-2-3-4-5** quickly.
2. Turn **Developer mode** ON.
3. Enter `<hub-ip>` (the machine that will run `sdb` / serve tv-hub).
4. Cold reboot the TV.

## Connect and install

```bash
sdb connect <tv-ip>:26101
tizen security-profiles add -n MyProfile -a <path-to-author-certificate.p12> -p <cert-password>
tizen package -t wgt -s MyProfile -- tizen-app/
tizen install -n ArkShowcase.wgt -t <tv-device-id>
```

Replace certificate paths and device IDs with your own. Pre-signed `.wgt` files from another author will not install unless re-signed.

## Verify

- Launch the app from the TV app list.
- Badge should read **LIVE API** if tv-hub is reachable; otherwise **SAMPLE FALLBACK**.
- REST check (from dev host): `curl http://<tv-ip>:8001/api/v2/applications/` lists running apps after launch.

## Limits

- Turning developer mode OFF removes sideloaded apps.
- No stock API for screenshots — verify via REST app list or in-app status badge.
- CSP and `config.xml` must allow your hub origin; update before packaging.
