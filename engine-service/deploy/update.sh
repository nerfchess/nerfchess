#!/usr/bin/env bash
# Unprivileged half of the engine self-update: fetch origin/master, verify its
# REPLAY_VERSION matches what the worker asked for, build the bundle, then hand
# off to the root-owned apply script. Invoked by updater.mjs (as ubuntu).
set -euo pipefail
REQ="${1:?usage: update.sh <replayVersion>}"
REPO=/opt/nerfchess-engine/repo

cd "$REPO"
git fetch origin master
git checkout -q -f --detach FETCH_HEAD
SRC_VER=$(grep -oP 'const REPLAY_VERSION = \K[0-9]+' worker.ts)
echo "origin/master $(git rev-parse --short HEAD) has REPLAY_VERSION=$SRC_VER (worker wants $REQ)"
if [ "$SRC_VER" != "$REQ" ]; then
  echo "refusing: origin/master does not match the deployed worker's version" >&2
  exit 3
fi
cd engine-service
npm install --no-audit --no-fund
node build.mjs
sudo /usr/local/sbin/nerfchess-engine-apply "$REQ" "$REPO/engine-service/dist/server.mjs"
