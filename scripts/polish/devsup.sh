#!/bin/bash
# scripts/polish/devsup.sh PORT DISTDIR MAX_RSS_KB LOG
#
# Polish-pass fleet setup (2026-09-23): the shared server runs as
#   scripts/polish/devsup.sh 3000 .next-wp 8500000 /tmp/nerfchess-dev.log
# and the card-effect strip server (only /dev/plays, see lib/common.ts) as
#   scripts/polish/devsup.sh 3100 .next-fx 6500000 /tmp/nerfchess-fx.log
# Keeps one webpack `next dev` alive on PORT, in its own process group, and
# restarts it when it stops answering twice or when any process in its group
# passes MAX_RSS_KB. Only ever kills its own group.
PORT=$1; DIST=$2; MAX=$3; LOG=$4
cd /home/user/nerfchess || exit 1
pgid=""
start() {
  NEXT_DIST_DIR=$DIST setsid ./node_modules/.bin/next dev --webpack -p "$PORT" > "$LOG" 2>&1 < /dev/null &
  pgid=$!
  echo "[devsup:$PORT] $(date -u +%H:%M:%S) started pgid $pgid"
  sleep 60
}
stop() { [ -n "$pgid" ] && kill -9 -- "-$pgid" 2>/dev/null; sleep 2; }
# A listening port means alive: a heavy first compile can take minutes under
# fleet load, and an HTTP probe would restart a server that is only busy.
alive() { (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; }
grouprss() { ps -eo pgid=,rss= | awk -v g="$pgid" '$1==g {s+=$2} END {print s+0}'; }
start
while true; do
  rss=$(grouprss)
  if [ "$rss" -gt "$MAX" ]; then
    echo "[devsup:$PORT] $(date -u +%H:%M:%S) rss ${rss}k over cap, restarting"; stop; start; continue
  fi
  if ! alive; then
    sleep 20
    if ! alive; then echo "[devsup:$PORT] $(date -u +%H:%M:%S) not answering, restarting"; stop; start; continue; fi
  fi
  sleep 15
done
