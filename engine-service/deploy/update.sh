#!/usr/bin/env bash
# Unprivileged half of the Tokyo box self-update: fetch master (auth via a
# short-lived GitHub App installation token — org policy forbids deploy keys),
# verify its REPLAY_VERSION matches what the caller asked for, build BOTH
# bundles (engine + arena — the arena shares the replay code and rots the same
# way; see docs/tokyo-box-self-update.md), then hand off to the root-owned
# nerfchess-engine-apply. Invoked by updater.mjs (as ubuntu), which supplies
# the GITHUB_APP_* env.
#
# Idempotent: when the fetched master commit equals the last applied one
# (/opt/nerfchess-engine/applied-commit, stamped by the apply script) it exits
# before building, so the periodic nerfchess-autoupdate.timer never restarts
# healthy services.
set -euo pipefail
REQ="${1:?usage: update.sh <replayVersion>}"
REPO=/opt/nerfchess-engine/repo
REPO_URL="${GITHUB_REPO_URL:-https://github.com/nerfchess/nerfchess.git}"
STAMP=/opt/nerfchess-engine/applied-commit

cd "$REPO"
GIT_TOKEN=$(node /opt/nerfchess-engine/github-app-token.mjs)
export GIT_TOKEN
# Token goes through a credential helper (env-expanded at call time), never
# onto the command line or into .git/config.
git -c credential.helper= \
  -c credential.helper='!f() { echo username=x-access-token; echo "password=$GIT_TOKEN"; }; f' \
  fetch "$REPO_URL" master
unset GIT_TOKEN
git checkout -q -f --detach FETCH_HEAD
COMMIT=$(git rev-parse HEAD)
SRC_VER=$(grep -oP 'const REPLAY_VERSION = \K[0-9]+' worker.ts)
echo "master $(git rev-parse --short HEAD) has REPLAY_VERSION=$SRC_VER (worker wants $REQ)"
if [ "$SRC_VER" != "$REQ" ]; then
  echo "refusing: master does not match the deployed worker's version" >&2
  exit 3
fi
if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$COMMIT" ]; then
  echo "already applied $COMMIT — nothing to do"
  exit 0
fi
cd engine-service
npm install --no-audit --no-fund
node build.mjs
cd ../arena-service
npm install --no-audit --no-fund
node build.mjs
cd ..
sudo /usr/local/sbin/nerfchess-engine-apply "$REQ" \
  "$REPO/engine-service/dist/server.mjs" \
  "$REPO/arena-service/dist/server.mjs" \
  "$COMMIT"
