#!/bin/bash
# shoot.sh <config.json>: screenshots + console/page errors + horizontal-overflow check.
# Installs Playwright once into a cache dir (never into the app) and uses the preinstalled Chromium if present.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
CACHE=${SHIP_CHECK_DIR:-${TMPDIR:-/tmp}/ship-check}/pw
if [ ! -d "$CACHE/node_modules/playwright" ]; then
  mkdir -p "$CACHE" && (cd "$CACHE" && npm init -y >/dev/null && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright@1 >/dev/null 2>&1)
fi
CHROME=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)
cp "$HERE/shoot.mjs" "$CACHE/shoot.mjs"
cd "$CACHE" && CHROMIUM_PATH="$CHROME" node shoot.mjs "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
