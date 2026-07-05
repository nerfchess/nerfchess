# Suggest a buff (punch-list item 17)

2026-07-05. Extends the existing "Suggest a rule" flow so players can submit buff ideas too, with no parallel system.

## How the existing flow worked

- `src/app/codex/suggest/page.tsx` is a client form (name, description, optional contact) that POSTs to `/api/suggest`.
- `src/app/api/suggest/route.ts` validates the description (10 to 1000 chars), inserts a row into the D1 `rule_suggestions` table, then best-effort emails the owner through Resend when `RESEND_API_KEY` and `SUGGESTIONS_EMAIL` are set. An email outage never loses the row.
- `src/app/api/mod/suggestions/route.ts` (mod-guarded) lists the newest 200 rows for the Suggestions tab in `src/app/mod/page.tsx`.
- The only entry point was a "Suggest a rule" button on the codex page, shown only in the Nerfs library. `/codex/build` redirects there.

## What changed

One flow, one table, a `kind` on everything:

- Suggest page: a Nerf / Buff toggle above the form. Nerf wears the warm `mode-nerf` identity, Buff the `mode-buff` blue (same tokens as `ModeBadge`). Copy, labels, placeholders, and the submit button follow the selected kind. `?kind=buff` preselects Buff so the codex buff library can deep-link.
- Buff ideas get a second small toggle for the intended pool: "Buff mode card" or "Nerf-mode boon", with a one-line explanation of each.
- API: accepts `kind` ("nerf" | "buff", anything else treated as nerf so legacy clients keep working) and, for buffs only, `pool` ("buff" | "boon", default "buff"). Both are stored; the notification email subject and body say which kind and pool.
- Codex entry points: the suggest button now shows in both libraries. In the Nerfs library it reads "Suggest a nerf", in the Buffs library "Suggest a buff" and links with `?kind=buff`. No other pages linked the form (checked nav, faq).
- Mod panel: the Suggestions tab renders a `ModeBadge` pill per row (nerf rose / buff blue) plus a small pool tag on buff rows, so buff ideas are distinguishable at a glance.

## Schema

Two additive columns on `rule_suggestions`:

- `kind TEXT NOT NULL DEFAULT 'nerf'` (the DEFAULT backfills every pre-existing row as a nerf)
- `pool TEXT` (null for nerfs; 'buff' or 'boon' for buff ideas)

Both live in `src/lib/server/schema.ts`: added to the `CREATE TABLE IF NOT EXISTS rule_suggestions` statement (fresh databases) and to `ADDITIVE_COLUMNS` (existing databases; each ALTER is try/catch so it is idempotent). No migration file was added on purpose: migrations/0003's header documents that columns ensureSchema adds at runtime cannot safely live in a migration, because the worker bootstraps the column on deploy and a later `wrangler migrations apply` would then die on "duplicate column", which would violate the additive-and-idempotent rule. This mirrors the `users.avatar` precedent.
