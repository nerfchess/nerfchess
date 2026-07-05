# Security audit — 2026-07-05

Full pass over API routes, auth, the Durable Object game server, and configs.

## Already solid (no changes needed)
- All SQL is parameterized; `IN (${placeholders})` patterns bind values.
- Sessions: 32-byte random tokens stored hashed (SHA-256), HttpOnly + SameSite=Lax + Secure cookies; SameSite=Lax also covers CSRF for the JSON POST routes.
- Passwords: PBKDF2-SHA256 (100k iters), constant-time compare.
- Every private route goes through `requireUser`/`requireMod`; mod hierarchy (nobody touches admins, only admins touch mods/roles) with a full audit log.
- CSP + full security-header set; only `dangerouslySetInnerHTML` use is static piece SVGs.
- Custom avatars: data-URL whitelist (jpeg/png/webp only — no SVG), 24k cap.
- Websocket server checks Origin allowlist; seat tokens are crypto-random.
- Messages and reports already rate-limited.

## Fixed in this pass
1. **Login brute force**: `/api/auth/login` had no throttling. Added `login_attempts` D1 table (migration 0011) + counters in `lib/server/auth.ts`: 10 failures per username / 100 per IP (CF-Connecting-IP) in a 15-min rolling window → 429. Success clears the username counter.
2. **CSP `unsafe-eval`**: now dev-only (webpack source maps); production `script-src` no longer allows eval.

## Noted, deliberately not changed
- `/healthz` returns error stacks — deliberate (comment says it's the only log access); consider gating if the site grows.
- No rate limit on guest-account creation or register (row-spam risk only, not a credential risk).
- `'unsafe-inline'` in script-src is required by Next hydration; a nonce-based CSP would be the eventual upgrade.
