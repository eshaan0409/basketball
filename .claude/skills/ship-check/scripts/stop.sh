#!/bin/bash
# stop.sh <app_dir>: stop any Next.js server started from this app directory.
DIR=$(cd "$1" && pwd)
for p in /proc/[0-9]*; do
  pid=${p#/proc/}
  [ "$pid" = "$$" ] && continue
  if [ "$(readlink "$p/cwd" 2>/dev/null)" = "$DIR" ] && grep -qa "next" "$p/cmdline" 2>/dev/null; then kill "$pid" 2>/dev/null && echo "stopped $pid"; fi
done
