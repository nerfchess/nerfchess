#!/usr/bin/env bash
# Fired by nerfchess-autoupdate.timer: ask the local self-updater to rebuild
# from origin/master at the CURRENT replay version
# Runs as root 
set -euo pipefail
VER=$(grep -oP '^ENGINE_REPLAY_VERSION=\K[0-9]+' /etc/nerfchess-engine.env)
TOKEN=$(grep -oP '^UPDATER_TOKEN=\K.*' /etc/nerfchess-engine-updater.env)
PORT=$(grep -oP '^PORT=\K[0-9]+' /etc/nerfchess-engine-updater.env || echo 8789)
curl -sf -m 10 -X POST "http://127.0.0.1:$PORT/update" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d "{\"replayVersion\":$VER}"
echo
