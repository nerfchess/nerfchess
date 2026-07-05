# Google + email sign-in — 2026-07-05

## What shipped
- **Email + password**: optional email at registration (stored lowercase, unique partial index); the sign-in field accepts username *or* email (an `@` switches the lookup). `/api/auth/me` now returns the caller's own email.
- **Google OAuth**: `GET /api/auth/google` (state cookie + redirect) and `GET /api/auth/google/callback` (server-side code exchange, id_token payload decode — no signature check needed since it comes straight from Google over TLS). No new dependencies.
- Schema: `users.email`, `users.google_sub` + unique partial indexes (migration `0012`, mirrored in `schema.ts` ADDITIVE_COLUMNS — indexes live there too because they must run after the ALTERs on fresh DBs).

## Account-linking rules (security-driven)
- `google_sub` match → sign in.
- Signed-in caller (guest or registered) → link Google to current account; guests upgrade in place keeping rating/history.
- Google's verified email on a *different* account → refuse with "sign in with password then link". Stored emails are unverified, so auto-linking by email = pre-registration account takeover.
- New Google accounts get a username from the email local part (validated, uniquified) or a random name; password is unknowable.

## Config
- `GOOGLE_CLIENT_ID` in wrangler vars (empty = feature off, button redirects back with a message), `GOOGLE_CLIENT_SECRET` via `wrangler secret put`. Setup steps in `docs/google-sign-in.md`. **Owner must create the OAuth client in Google Cloud Console and add the redirect URIs.**

## Deliberate choices / follow-ups
- Email login = email+password. Magic-link login would need an email provider (e.g. Resend) — not added.
- No profile UI yet for adding an email to an existing password account (they can link Google instead, which stores the Google email). Small follow-up if wanted.
- Google-created accounts can't sign in by password until a password-set flow exists.
