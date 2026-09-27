# ARK Showcase

Samsung Tizen TV web app: a 1920×1080 series companion for the original animated series **The ARK Road**. Remote-control driven. Sample copy is synthetic and marked SAMPLE.

Target: Samsung Tizen TV (Chromium-based web runtime). The platform upscales from 1920×1080.

## File map

| File | Role |
|---|---|
| `index.html` | Screens: title, episodes, episode detail, stills viewer, world |
| `style.css` | Cinematic dark theme, grain/vignette, 3px amber focus ring. System fonts only |
| `app.js` | Focus manager, fetch + SAMPLE fallback, key bindings, stills viewer |
| `config.xml` | Tizen web widget skeleton |
| `README.md` | This file |

## Configure hub address

Before sideloading to a TV, set your tv-hub LAN address in three places:

1. `app.js` — `API_BASE` (default `http://127.0.0.1:8090`)
2. `config.xml` — `<access origin="...">`
3. `index.html` — Content-Security-Policy `img-src` and `connect-src`

Replace `127.0.0.1` with `<hub-ip>` on your LAN (the machine running `tv-hub/server.py`).

## Preview (desktop browser)

No Tizen SDK required. From this directory:

```bash
cd tizen-app
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/` in Chrome or Safari. The stage is 1920×1080 and scales to the window. Arrow keys move focus; Enter activates; Escape or Backspace goes back (maps to Tizen Return `10009`). If the tv-hub API is unreachable, the embedded SAMPLE manifest is used and every screen remains reachable.

The title-screen badge reads `SAMPLE FALLBACK` or `LIVE API`.

## Key bindings

| Key | Code | Action |
|---|---|---|
| ← ↑ → ↓ | 37 / 38 / 39 / 40 | Move focus (spatial). In stills viewer, ← → step frames |
| Enter | 13 | Open focused item |
| Return / Back | 10009 | Back one screen |
| Escape / Backspace | 27 / 8 | Desktop stand-in for Return |
| Tizen hwkey `back` | — | Same as Return |

On the title screen, Return/Back calls `tizen.application.getCurrentApplication().exit()` inside try/catch. Desktop preview shows a toast instead of throwing.

There is no hover styling, no touch requirement, and no mouse requirement. Clicks on `[data-focusable]` still activate items so a pointer can be used while previewing.

## Data service

`GET http://<hub-ip>:8090/api/ark` (CORS open). `fetch()` is try/catch + 4s abort. On any failure the SAMPLE payload in `app.js` is used.

See the root [playbook.md](../playbook.md) for TV pairing and sideload instructions.
