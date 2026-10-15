#!/bin/bash
# stop.sh <app_dir>: stop any Next.js server started from this app directory.
DIR=$(cd "$1" && pwd)
# Never touch this script's own ancestors (the shell that called it may sit in the app folder).
ANCESTORS=" $$ "; a=$$
while [ "$a" -gt 1 ] 2>/dev/null; do a=$(awk '{print $4}' /proc/$a/stat 2>/dev/null || echo 1); ANCESTORS="$ANCESTORS$a "; done
for p in /proc/[0-9]*; do
  pid=${p#/proc/}
  case "$ANCESTORS" in *" $pid "*) continue ;; esac
  [ "$(readlink "$p/cwd" 2>/dev/null)" = "$DIR" ] || continue
  # Only real Next.js servers: the CLI wrapper or the next-server process.
  if tr '\0' ' ' < "$p/cmdline" 2>/dev/null | grep -qE 'next/dist/bin/next (start|dev)|^next-server'; then
    kill "$pid" 2>/dev/null && [ "$(basename "$0")" = "stop.sh" ] && echo "stopped $pid"
  fi
done
