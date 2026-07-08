#!/usr/bin/env bash
# Unprivileged half of the engine self-update: fetch master (auth via a
# short-lived GitHub App installation token — org policy forbids deploy keys),
# verify its REPLAY_VERSION matches what the worker asked for, build the
# bundle, then hand off to the root-owned apply script. Invoked by updater.mjs
# (as ubuntu), which supplies the GITHUB_APP_* env.
set -euo pipefail
REQ="${1:?usage: update.sh <replayVersion>}"
REPO=/opt/nerfchess-engine/repo
REPO_URL="${GITHUB_REPO_URL:-https://github.com/nerfchess/nerfchess.git}"

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
SRC_VER=$(grep -oP 'const REPLAY_VERSION = \K[0-9]+' worker.ts)
echo "master $(git rev-parse --short HEAD) has REPLAY_VERSION=$SRC_VER (worker wants $REQ)"
if [ "$SRC_VER" != "$REQ" ]; then
  echo "refusing: master does not match the deployed worker's version" >&2
  exit 3
fi
cd engine-service
npm install --no-audit --no-fund
node build.mjs
sudo /usr/local/sbin/nerfchess-engine-apply "$REQ" "$REPO/engine-service/dist/server.mjs"
