#!/bin/sh
# Run a heavy command (tsc, eslint, next build, Playwright, simulations) in one
# of two box-wide slots, so a fleet of agents never runs more than two at once
# on the 4-core box (docs/ralph-backlog.md, parallelism). Waits for a free slot.
#
#   scripts/polish/heavy.sh ./node_modules/.bin/tsc --noEmit
set -u
# Playwright must never start its own dev server on the shared :3000 port
# (playwright.config.ts skips webServer when this is 1).
export PW_NO_WEBSERVER="${PW_NO_WEBSERVER:-1}"
while :; do
  for s in 1 2; do
    flock -n -E 75 "/tmp/polish-heavy.$s.lock" "$@"
    rc=$?
    [ "$rc" -ne 75 ] && exit "$rc"
  done
  sleep 3
done
