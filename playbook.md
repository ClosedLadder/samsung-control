# Samsung control playbook

A practical guide for controlling Samsung Tizen TVs and Android tablets on a home LAN. Covers discovery, token-based TV auth, ADB drive loops, websocket/REST remote control, and Tizen sideloading.

## Devices (example topology)

- **Tablet:** Android tablet with wireless debugging (ADB over Wi-Fi).
- **TV:** Samsung Tizen TV or Smart Monitor on LAN `<tv-ip>`.
- **Dev host:** Machine running tooling and the tv-hub server at `<hub-ip>`.

## Tablet — ADB over Wi-Fi + scrcpy

Install: `sudo apt install android-sdk-platform-tools scrcpy avahi-utils` (or equivalent on macOS).

Pairing (one human pass, keep dialog open):

1. Tablet: Developer options → Wireless debugging → "Pair device with pairing code" (note IP:PAIRPORT + 6-digit code).
2. Host: `adb pair <IP>:<PAIRPORT>` → enter code.
3. Tablet: back on Wireless debugging screen, note IP:SESSIONPORT (≠ pairing port, random high port, changes on reboot).
4. Host: `adb connect <IP>:<SESSIONPORT>` → `adb devices` shows device.
5. Optional: use a VPN mesh (e.g. Tailscale) so the tablet address is stable across networks.

Gotchas: wireless debugging turns OFF on every reboot (re-enable on-device; pairing persists). DHCP reservation or mDNS (`avahi-browse -rt _adb-tls-connect._tcp`) for rediscovery. Turn wireless debugging off when done — any paired host on the network can run commands.

### Drive loop (headless)

```
adb exec-out screencap -p > screen.png          # eyes
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml .
adb shell input tap X Y                          # tap
adb shell input swipe X1 Y1 X2 Y2 MS             # swipe / scroll
adb shell input text "hello%sworld"              # ASCII typing (%s = space)
adb shell input keyevent 3                       # home (4 back, 187 recents, 26 power)
adb shell monkey -p com.pkg -c android.intent.category.LAUNCHER 1   # launch app
adb install app.apk                              # install APK
adb shell am force-stop com.pkg
```

For reliable/unicode typing: install ADBKeyboard APK, `adb shell ime set com.android.adbkeyboard/.AdbIME`, then `adb shell am broadcast -a ADB_INPUT_TEXT --es msg 'text'`.

Video (optional): `SDL_VIDEODRIVER=dummy scrcpy -s <IP>:<PORT> -N --record=session.mp4` or `--v4l2-sink=/dev/video0`. Live window on a display machine: `scrcpy -s <IP>:<PORT>`.

## TV — Tizen websocket (primary) + REST + SmartThings (power) + dev-mode sideload

Install: `pip install "samsungtvws[cli]"` (Python ≥3.10)

### Pairing (one human tap)

```bash
export TV=<tv-ip>
samsungtv --host $TV --token-file ~/.config/tv-token device-info   # tap "Allow" on TV once
# TV: Settings > Device Connection Manager > Access Notification > First Time Only
```

The token file stores the pairing credential for subsequent commands. Treat it like a password.

### Cheat-sheet

```bash
samsungtv --host $TV send-key KEY_VOLUP --times 5
samsungtv --host $TV app-run 111299001912        # YouTube (IDs: Netflix 3201907018807, Prime 3201512006785, Disney+ 3202204027038, Spotify 3201606009684, Plex 3201512006963, browser org.tizen.browser)
samsungtv --host $TV open-browser https://example.com
samsungtv --host $TV apps                         # installed apps (may be empty on 2023+ fw)
curl -X PUT http://$TV:8001/api/v2/applications/3201606009684   # store-install app by ID
curl -X POST http://$TV:8001/api/v2/applications/<appId>        # launch via REST
curl -X DELETE http://$TV:8001/api/v2/applications/<appId>      # close app
```

Power: WoL (`samsungtv --host $TV wol`, needs "Power On with Mobile" on TV) or SmartThings cloud `switch on` (PAT from account.smartthings.com, `POST /v1/devices/{id}/commands`). Websocket/REST cannot power on from full off.

Text: `custom.remote.textReceived` event or `POST http://$TV:8001/api/v2/remoteControl/imeInput/<base64>?token=<your-token>`.

Mouse: `{"Cmd":"Move","Position":{"x":200,"y":120,"Time":"0"},"TypeOfRemote":"ProcessMouseDevice"}`.

DLNA push (flaky on 2023+): port 9197 `dmr/SamsungMRDesc.xml`, SOAP AVTransport1 SetAVTransportURI+Play.

### Sideloading (developer mode)

Apps panel → 1-2-3-4-5 → Dev mode ON → enter `<hub-ip>` → cold reboot. Then `sdb connect <tv-ip>:26101`, cert from Samsung account, `tizen install -n app.wgt`. Pre-signed `.wgt` files won't install unless re-signed with your cert. Dev mode survives reboots; turning it off wipes sideloaded apps.

## Hard limits (stock firmware)

- NO screenshot/screen-read API
- NO silent arbitrary installs
- NO remote dev-mode enable
- NO bypassing the one-time Allow prompt
- No cross-subnet websocket
- Store-install-by-ID only for apps in the TV's region store

## tv-hub server

See `tv-hub/server.py` — a stdlib HTTP server that serves JSON manifests and static assets for Tizen TV apps. Configure `TV_HUB_HOST` to your LAN address before running.
