#!/bin/bash
# scaffold.sh <folder> "<Display Name>" "<tagline>" <brand-hex> <brand-soft-hex> <brand-dark-hex> <brand-soft-dark-hex>
# Creates <repo>/<folder> from the template with pinned versions, then installs and runs the smoke test.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
FOLDER=$1; TITLE=$2; TAGLINE=$3; BRAND=$4; SOFT=$5; BRAND_DARK=$6; SOFT_DARK=$7
DEST="$REPO/$FOLDER"
[ -e "$DEST" ] && { echo "$DEST already exists"; exit 1; }
cp -r "$HERE/template" "$DEST"
esc() { printf '%s' "$1" | sed -e 's/[\/&|]/\\&/g'; }
find "$DEST" -type f \( -name '*.json' -o -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.svg' \) -print0 |
  xargs -0 sed -i \
    -e "s|__NAME__|$(esc "$FOLDER")|g" -e "s|__TITLE__|$(esc "$TITLE")|g" -e "s|__TAGLINE__|$(esc "$TAGLINE")|g" \
    -e "s|__BRAND_SOFT_DARK__|$SOFT_DARK|g" -e "s|__BRAND_DARK__|$BRAND_DARK|g" \
    -e "s|__BRAND_SOFT__|$SOFT|g" -e "s|__BRAND__|$BRAND|g"
cd "$DEST"
npm install --no-fund --no-audit >/dev/null
npx vitest run >/dev/null && echo "scaffolded $FOLDER: tests pass"
npx tsc --noEmit && echo "typecheck ok"
