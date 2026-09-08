#!/usr/bin/env bash
# Package the extension for the Chrome Web Store.
# Usage: ./extension/build.sh  →  dist/yepitsai-extension-<version>.zip
set -euo pipefail
cd "$(dirname "$0")"
VERSION=$(node -p "require('./manifest.json').version")
mkdir -p ../dist
OUT="../dist/yepitsai-extension-$VERSION.zip"
rm -f "$OUT"
zip -q -r "$OUT" manifest.json background.js content.js content.css sidepanel.html sidepanel.js sidepanel.css icons -x '*.DS_Store'
echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -1
