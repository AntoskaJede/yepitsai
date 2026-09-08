# Store screenshots

Reproducible captures of the extension running on a real YouTube page, composed into Chrome Web Store images (1280x800) plus a 440x280 promo tile.

```bash
mkdir -p /tmp/shots && cd /tmp/shots
npm init -y && npm i playwright@1 && npx playwright install chromium
node /path/to/repo/extension/screenshots/shoot.mjs /path/to/repo/extension ./out
python3 /path/to/repo/extension/screenshots/compose.py ./out /path/to/repo/dist/store
```

`shoot.mjs` loads the unpacked extension into Chromium, rejects YouTube's consent dialog, waits for the injected button, covers the player with the video's poster frame (ads are random in headless), then drives the side panel through ready / loading / result / limit / sign-in states. `compose.py` needs Pillow (`pip3 install pillow`).
