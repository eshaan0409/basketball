#!/bin/bash
# run-e2e.sh <script.mjs> [BASE_URL]: run a Playwright flow script against a running app.
# Uses the same cached Playwright install as shoot.sh, so apps never need Playwright as a dependency.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
CACHE=${SHIP_CHECK_DIR:-${TMPDIR:-/tmp}/ship-check}/pw
if [ ! -d "$CACHE/node_modules/playwright" ]; then
  mkdir -p "$CACHE" && (cd "$CACHE" && npm init -y >/dev/null && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright@1 >/dev/null 2>&1)
fi
SCRIPT=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
NAME=$(basename "$(dirname "$(dirname "$SCRIPT")")")-$(basename "$SCRIPT")
cp "$SCRIPT" "$CACHE/$NAME"
mkdir -p "$CACHE/out"
CHROME=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)
cd "$CACHE" && BASE=${2:-$BASE} OUT="$CACHE/out" CHROMIUM_PATH="$CHROME" node "$NAME"
