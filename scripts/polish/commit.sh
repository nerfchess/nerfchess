#!/bin/sh
# Commit only the named paths, under a box-wide lock, so agents sharing one
# working tree never sweep each other's edits into their commits.
#
#   scripts/polish/commit.sh "Plain sentence saying what changed" path1 path2 ...
set -u
msg="$1"; shift
[ "$#" -gt 0 ] || { echo "commit.sh: name the paths to commit" >&2; exit 2; }
exec flock /tmp/polish-git.lock sh -c '
  msg="$1"; shift
  git add -A -- "$@" &&
  git commit -q -m "$msg

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YECgEmH5LFGrr5Wy9Gqq3B" -- "$@" &&
  git log --oneline -1
' commit.sh "$msg" "$@"
