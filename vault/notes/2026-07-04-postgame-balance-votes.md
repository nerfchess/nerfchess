# Post-game balance votes for nerfs and buffs

Date: 2026-07-04

## What shipped

- `buff_feedback` table mirroring `nerf_feedback` (`buff_id`, `vote`, `user_id`, `username`, `game_id`, `created_at`), in both `SCHEMA_STATEMENTS` (src/lib/server/schema.ts) and `migrations/0010_buff_feedback.sql`. Vote rows are keyed `userId:buffId`, so re-voting replaces (INSERT OR REPLACE), one vote per player per buff.
- `POST /api/buff-feedback` mirrors `/api/nerf-feedback`: requires a signed-in user, validates the id against `ALL_BUFFS`, optional `gameId`.
- GameOver dialog: new optional `myBuffs` prop (`BuffInstance[]`). Draft games render a "Was it balanced?" section listing each buff held (deduped by id, ids resolved via `BUFF_BY_ID`) with the same compact thumbs control as the nerf vote; the existing "Like this rule?" nerf thumbs stay in the Your rule card. Both call sites (`OnlineMatch.tsx`, `src/app/game/page.tsx`) pass `game.buffs?.players[myColor].buffs`.
- Mod dashboard: the old "Rule feedback" tab is retitled "Nerf feedback" and a new "Buff feedback" tab reads `GET /api/mod/buff-feedback` (per-buff up/down/net, sorted by most voted, plus 30 most recent votes).

## Conventions worth remembering

- Feedback vote tables key rows `userId:itemId` for one-vote-per-item; extend the same way for future votable content.
- The thumbs pair in GameOver.tsx is the shared `VoteThumbs` component; reuse it for any new post-game vote rows.
