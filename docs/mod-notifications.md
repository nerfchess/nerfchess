# Moderator notifications to a Google Sheet

Every moderator action can append a row to a spreadsheet: warns, mutes, bans,
role changes, report triage, chat-flag review, card overrides, the house-bot
toggles and persona edits, rating sets, and the god-panel switch. Nothing is
required for the site to work — with no webhook configured the whole path is a
silent no-op, the same way the Resend key in `/api/suggest` and
`HOUSE_ENGINE_REMOTE` already behave.

`mod_actions` in D1 remains the audit trail of record. This is a convenience
notification, deliberately fire-and-forget: it is fired through
`ctx.waitUntil` after the database write lands, so a slow or dead Google endpoint
can never delay or fail a moderation action.

## Setup (about five minutes)

**1. Make the sheet.** A new Google Sheet. Rename the first tab to `mod-log` and
put these headers in row 1:

| A | B | C | D | E | F |
| --- | --- | --- | --- | --- | --- |
| at | kind | actor | target | detail | expires |

**2. Add the script.** Extensions → Apps Script, delete the placeholder, paste:

```js
// Appends one row per NerfChess moderator action.
// Set SECRET to the same value you pass to `wrangler secret put MOD_WEBHOOK_TOKEN`,
// or leave it "" to accept unauthenticated posts (fine if the /exec URL stays private).
const SECRET = "";
const TAB = "mod-log";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (SECRET && body.token !== SECRET) {
      return ContentService.createTextOutput("forbidden");
    }
    const sheet = SpreadsheetApp.getActive().getSheetByName(TAB);
    sheet.appendRow([
      body.at || "",
      body.kind || "",
      body.actor || "",
      body.target || "",
      body.detail || "",
      body.expiresAt ? new Date(Number(body.expiresAt)).toISOString() : "",
    ]);
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error: " + err);
  }
}
```

**3. Deploy it.** Deploy → New deployment → type **Web app**. Execute as **Me**,
who has access **Anyone**. Copy the `/exec` URL.

> "Anyone" is what lets the Worker post without a Google login. The URL is the
> only credential, so treat it as a secret — and set `MOD_WEBHOOK_TOKEN` as well
> if you want a second one.

**4. Point the site at it.** Put the URL in the `vars` block of
`wrangler.jsonc`:

```jsonc
"MOD_WEBHOOK_URL": "https://script.google.com/macros/s/AKfycb.../exec"
```

It has to live in that file: `wrangler deploy` rewrites plaintext vars from it on
every deploy, so a value set only in the Cloudflare dashboard is clobbered next
time. If you want the shared secret too:

```sh
npx wrangler secret put MOD_WEBHOOK_TOKEN
```

Then deploy.

**5. Check it.** `POST /api/mod/notify-test` (there is a button for it in `/mod`)
fires one `test` row. Watch the sheet.

The response says only that the POST was *scheduled*, not that Google accepted
it — the send runs through `ctx.waitUntil` precisely so no moderator action ever
waits on a third party, which means the result is not known by the time the route
answers. The spreadsheet is the end-to-end proof.

## What arrives

One row per event. `kind` is one of a small closed set, so the sheet can be
filtered or pivoted on it:

| Group | kinds |
| --- | --- |
| Sanctions | `warn` `mute` `unmute` `ban` `unban` `set_role` `flag_name` `unflag_name` |
| Queue work | `report_resolved` `report_dismissed` `chat_flag_reviewed` |
| Configuration | `card_override_saved` `card_override_cleared` `house_toggled` `house_games_pinned` `house_skill_override` `house_persona_edited` `rating_set` `god_panel_toggled` |
| Diagnostics | `test` |

`at` is an ISO timestamp (so Sheets parses it as a date with no formula),
`actor` is the moderator's username, `target` is a username, a card id or a
persona name, `detail` is free text (the note a mod typed, the value a slider
moved to), and `expires` is filled only for a timed mute or ban.

## Notes and limits

- **Apps Script quotas.** A consumer Google account allows roughly 20,000
  `UrlFetch`/script executions a day, which is orders of magnitude above
  moderation volume. Nothing here retries, so a row lost to a quota error is
  lost; `mod_actions` still has it.
- **Where the hook lives.** `applyModAction` in `src/lib/server/mod.ts` covers
  every player sanction in one place. The routes that mutate state *without*
  going through it call `notifyModEvent` themselves: `/api/mod/cards`,
  `/api/mod/house`, `/api/mod/house/personas`, `/api/mod/ratings`,
  `/api/mod/god-panel`, `/api/mod/reports`, `/api/mod/chat-flags`. Any new
  mod-facing mutation should add its own call and a `ModEventKind`.
- **Events the game server sees are not covered.** God-panel card grants and
  in-game clock adjustments happen inside the Durable Object, which does not
  import the Next-side module. Wiring those up means a separate call from
  `worker.ts` using `env` directly.
- **Discord instead?** Same shape: point `MOD_WEBHOOK_URL` at a Discord webhook
  and change the payload keys to `{ content }`. The transport here is a plain
  POST with a JSON body, nothing Google-specific beyond the `text/plain`
  content-type (which avoids a CORS preflight Apps Script does not answer).
