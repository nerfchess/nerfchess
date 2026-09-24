#!/bin/bash
# SessionStart hook for Claude Code on the web (F252): a fresh cloud container
# starts without node_modules, so every guard, typecheck and dev server would
# fail until someone ran npm ci. Local sessions are left alone.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Install when node_modules is missing or older than the lockfile.
if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "session-start: installing dependencies (npm ci)"
  npm ci --no-audit --no-fund
else
  echo "session-start: node_modules is current"
fi
