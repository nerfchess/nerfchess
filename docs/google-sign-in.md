# Google sign-in

"Continue with Google" on `/login` uses the standard OAuth authorization-code
flow, implemented directly in two route handlers (no auth library):

- `GET /api/auth/google` — sets a random `dc_oauth_state` cookie (CSRF
  protection, also carries the post-sign-in path) and redirects to Google.
- `GET /api/auth/google/callback` — verifies state, exchanges the code for an
  id_token server-side, then signs in / links / creates the account.

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** of type **Web application**.
2. Add the authorized redirect URI(s):
   - `https://nerfchess.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (for dev)
3. Put the client id in `wrangler.jsonc` under `vars.GOOGLE_CLIENT_ID`.
4. Store the secret: `wrangler secret put GOOGLE_CLIENT_SECRET`
   (for `next dev`, add both to `.dev.vars` instead).

With either value missing, the button redirects back to `/login` with a
"not set up" message; nothing else breaks.

## Account rules

- A user whose `google_sub` matches signs straight in.
- A signed-in caller (guest **or** registered) clicking the button links the
  Google account to their current account; guests upgrade in place keeping
  rating/history, mirroring password registration.
- Otherwise a new account is created (username derived from the email's local
  part, random fallback), with an unknowable password — it signs in via Google.
- If Google's verified email already belongs to a *different* account, the
  sign-in is refused with instructions to sign in by password first. Stored
  emails are unverified, so auto-linking by email would allow account
  pre-registration takeover.
