#!/usr/bin/env bash
# Fired by nerfchess-autoupdate.timer: ask the local self-updater to rebuild
# from origin/master at the CURRENTLY APPLIED replay version. Two outcomes:
#   - master moved but kept the same REPLAY_VERSION (the silent-drift class
#     that caused the 2026-07-08/09 outages: card/tier/pool changes ship, the
#     engine+arena keep replaying the old rules, /move degrades to 200+null,
#     the DO falls back to the unbounded local search) -> rebuilt and applied.
#   - master bumped REPLAY_VERSION -> update.sh refuses (exit 3). That drift
#     is intentionally left to the worker's 409 -> POST /update ping right
#     after the deploy lands; auto-updating ahead of the deploy would break
#     the engine for the still-live old worker.
# Runs as root (reads both env files); talks only to 127.0.0.1.
set -euo pipefail
VER=$(grep -oP '^ENGINE_REPLAY_VERSION=\K[0-9]+' /etc/nerfchess-engine.env)
TOKEN=$(grep -oP '^UPDATER_TOKEN=\K.*' /etc/nerfchess-engine-updater.env)
PORT=$(grep -oP '^PORT=\K[0-9]+' /etc/nerfchess-engine-updater.env || echo 8789)
curl -sf -m 10 -X POST "http://127.0.0.1:$PORT/update" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d "{\"replayVersion\":$VER}"
echo
