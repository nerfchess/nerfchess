# Moderation

Lichess-inspired moderation: players file reports, moderators work a queue at
`/mod`, and actions (warn / mute / ban) are written to an audit log.

## Roles

`users.role` is one of `user` (default), `mod`, or `admin`.

- **mod** — everything in the `/mod` panel: review reports and flagged chat,
  warn, mute, and ban players.
- **admin** — mods, plus promoting/demoting moderators and moderating mods
  themselves. Admins cannot be moderated by anyone.

### Bootstrapping the first admin

Set a comma-separated `ADMIN_USERNAMES` var on the worker (wrangler.jsonc
`vars`, or a secret):

```jsonc
"vars": { "ADMIN_USERNAMES": "yourname" }
```

Listed accounts are promoted to admin on their next login. Alternatively, one
manual query works too:

```sh
npx wrangler d1 execute nerfchess --remote \
  --command "UPDATE users SET role = 'admin' WHERE username_lower = 'yourname'"
```

Admins grant `mod` from the Players tab of `/mod`.

## Actions

| Action | Effect |
| --- | --- |
| Warn | Audit-log entry only; the paper trail for escalation. |
| Mute | Chat is shadow-muted: the player sees their own messages, nobody else does. Timed (1h/1d/7d/30d) or permanent. |
| Ban | Sessions are deleted immediately and login is refused while the ban lasts. |
| Unmute / Unban | Clears the state. |

Mutes are read when a websocket connects, so a freshly muted player is
silenced on their next connection (in practice: their next game).

## Reports

Signed-in players can report a player from the profile page (reason +
description, throttled to 5/day). Reports land in the `/mod` queue where a
moderator resolves or dismisses them. Chat that trips the profanity filter is
additionally auto-flagged into the Chat flags tab (see `chat_flags`).

## Data

- `users.role`, `users.muted_until`, `users.banned_until` — moderation state.
- `reports` — player-filed reports and their lifecycle (`open` → `resolved` / `dismissed`).
- `mod_actions` — the audit log; every action a mod takes is recorded with
  actor, target, expiry, and note.
