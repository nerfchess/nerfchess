#!/usr/bin/env bash
# For every src/app/api/**/route.ts that exports POST/PUT/PATCH/DELETE, report
# whether it calls a same-origin guard (guardJsonWrite / assertSameOrigin, or
# requireMod which runs assertSameOrigin for non-GET), a rate limiter, and auth.
cd .
for f in $(find src/app/api -name route.ts | sort); do
  m=$(grep -oE "export (async )?function (POST|PUT|PATCH|DELETE)" "$f" | grep -oE "POST|PUT|PATCH|DELETE" | tr '\n' ',')
  [ -z "$m" ] && continue
  g=$(grep -cE "guardJsonWrite|assertSameOrigin|requireMod\(" "$f")
  r=$(grep -cE "rateLimit\(|memoryRateLimit\(|loginThrottled|verifyTurnstile" "$f")
  echo "$(echo "$f" | sed 's|src/app/api/||;s|/route.ts||') methods=$m sameOriginGuard=$g rateLimit=$r"
done
