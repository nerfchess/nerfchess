#!/bin/bash
# print source block for card id(s)
for id in "$@"; do
  hit=$(grep -rn "id: \"$id\"" ./src/engine/buffs ./src/engine/nerfs | grep -v "nerfs/library.ts" | head -2)
  echo "########## $id :: $hit"
  f=$(echo "$hit" | head -1 | cut -d: -f1); l=$(echo "$hit" | head -1 | cut -d: -f2)
  [ -n "$f" ] && sed -n "${l},$((l+${N:-40}))p" "$f"
done
