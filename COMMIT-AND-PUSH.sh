#!/usr/bin/env bash
# yepitsai - final commit + push recipe
# Run from the cloned repo on whichever machine has GitHub auth.

set -euo pipefail

cd "/path/to/yepitsai"   # <-- adjust to your checkout

echo "=== Working tree status ==="
git status --short

echo ""
echo "=== Stage the verified-patch set ==="
# These four are the files that actually ship:
git add frontend/index.html            # JSON-LD: drop Chrome extension + Markdown export
git add server/index.js                # JWT prod-fail, CORS allowlist, public/ static serve
git add public/llms.txt                # drop dead /extension + /signup links
git add marketing/v2/                  # launch calendar, drafts, post-launch roadmap
git add frontend/package-lock.json     # libc-flag cleanup from npm install

echo ""
echo "=== Staged diff (verify before you push) ==="
git diff --cached --stat

echo ""
echo "=== Stop and inspect: are these ONLY the files you expect? ==="
echo "    If yes, run the commit. If no, paste me the output before committing."

read -p "Press Enter to commit and push, or Ctrl-C to abort..."

git commit -m "fix(audit): drop Chrome-ext/Markdown from JSON-LD, JWT prod-fail, CORS allowlist, public/ static serve, launch v2 drafts"

echo ""
echo "=== Push ==="
git push origin main

echo ""
echo "=== Watch Railway for deploy start ==="
echo "Go to: https://railway.app/project/<your-project>/deployments"
echo "Once Build successful + Deploying + Active = done, tell Toto."
