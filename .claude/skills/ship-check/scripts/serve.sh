#!/bin/bash
# serve.sh <app_dir> <port>
# (Re)start a built Next.js app in the background and wait until it answers.
# Stops any previous server for the same app by working directory, so a stale build never keeps the port.
set -u
DIR=$(cd "$1" && pwd); PORT=$2
LOGDIR=${SHIP_CHECK_DIR:-${TMPDIR:-/tmp}/ship-check}; mkdir -p "$LOGDIR"
for p in /proc/[0-9]*; do
  pid=${p#/proc/}
  [ "$pid" = "$$" ] && continue
  if [ "$(readlink "$p/cwd" 2>/dev/null)" = "$DIR" ] && grep -qa "next" "$p/cmdline" 2>/dev/null; then kill "$pid" 2>/dev/null; fi
done
for i in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$PORT/" || break; sleep 0.25; done
if curl -s -o /dev/null "http://localhost:$PORT/"; then echo "port $PORT is still taken by another process"; exit 1; fi
cd "$DIR" && NEXT_TELEMETRY_DISABLED=1 nohup node node_modules/next/dist/bin/next start -p "$PORT" > "$LOGDIR/server-$PORT.log" 2>&1 &
PID=$!
for i in $(seq 1 40); do
  kill -0 $PID 2>/dev/null || { echo "server exited:"; tail -20 "$LOGDIR/server-$PORT.log"; exit 1; }
  curl -s -o /dev/null "http://localhost:$PORT/" && { echo "up on http://localhost:$PORT (pid $PID, log $LOGDIR/server-$PORT.log)"; exit 0; }
  sleep 0.5
done
echo "server did not answer in time:"; tail -20 "$LOGDIR/server-$PORT.log"; exit 1
