# Store screenshots

Two paths to regenerate the Chrome Web Store kit in `dist/store/`.

## Quick path — fully synthetic (no browser)

Renders 5 store screenshots (1280x800), a promo tile (440x280), and a
marquee (1400x560) from scratch with Pillow. No browser, no network,
works offline. This is what the v2.1 store submission uses.

```bash
python3 compose_v4.py /path/to/repo/dist/store
```

Needs Pillow (`pip3 install pillow`). The on-disk `compose_v4.py` is
self-contained — every label, icon, and layout is hand-drawn so the
output is identical across machines and CI runs.

## Real-capture path — Playwright (optional)

If you want true browser captures instead of synthetic renders (for
example, to refresh the screenshots after a side-panel redesign), the
Playwright + Pillow pipeline is still wired up:

```bash
mkdir -p /tmp/shots && cd /tmp/shots
npm init -y && npm i playwright@1 && npx playwright install chromium
node /path/to/repo/extension/screenshots/shoot.mjs /path/to/repo/extension ./out
python3 /path/to/repo/extension/screenshots/compose.py ./out /path/to/repo/dist/store
```

`shoot.mjs` loads the unpacked extension into Chromium, dismisses the
YouTube consent dialog, waits for the injected "Summarize with AI"
button, replaces the player with the video's poster (ads are random in
headless), and drives the side panel through ready / loading / result /
limit / sign-in states. `compose.py` needs Pillow.
