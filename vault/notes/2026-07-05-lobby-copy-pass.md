# Lobby flow, mode colors, TV split, and copy pass (2026-07-05)

Owner punch-list items 8-13, batch D.

## Lobby flow (item 8)

`QueueButton` no longer queues on card click. The two big mode cards are now a
selection (aria-pressed toggles, one highlighted in its mode color), and a
separate full-width Play button at the bottom of the plate starts the queue
for the selected mode. The button is disabled ("Pick a mode to play") until a
mode is chosen and wears the selected mode's color once one is. The
time-control picker is unchanged and still feeds the queue call.

Preselection order: `?mode=nerf|buff` query param (used by the home page
links) wins, then the last choice stored in localStorage (`dc:last-mode`),
else nothing selected. Every pick writes `dc:last-mode`.

## Softer mode palette (item 9)

The mode identity tokens in `tailwind.config.ts` moved off the oxblood alert
red toward a warm rose/terracotta, with an equivalently gentle blue:

- `mode.nerf`: `#c0413b` -> `#c4785f` (terracotta rose)
- `mode.nerfGlow`: `#dc5a54` -> `#dd9b82`
- `mode.buff`: `#3692e7` -> `#5b9bd4` (softer sky blue)
- `mode.buffGlow`: `#4a9fee` -> `#84b7e2`

New soft glow shadows `shadow-nerf` / `shadow-buff` (0.35 alpha, tighter
spread) replace the alert-grade `shadow-oxblood` / `shadow-leaf` on the mode
cards in the lobby and on /play. Card washes softened too: resting border
alpha 30 percent, wash 5 percent, selected 100 percent border with 15 percent
wash. `oxblood` itself is untouched and stays the alert/danger color.
Everything that uses `mode-*` classes (ModeBadge, lobby listings, game pages)
inherits the softer identity automatically.

## Removed text (item 10)

The "Rated games against a real opponent. Two pools, one rating each." line
is gone from the Play online plate.

## Watch split (item 11)

The nav Watch dropdown now lists Nerf TV (`/tv?mode=nerf`, terracotta) and
Buff TV (`/tv?mode=buff`, blue) plus the analysis board; the mobile menu got
the same two colored entries in place of "Watch TV".

`/tv` reads `?mode=` via `useSearchParams` (page wrapped in Suspense for
prerender). The lobby snapshot's live games already carry `mode` since the
ModeBadge work, so filtering is client-side: `games.filter(g => g.mode ===
modeFilter)`. Legacy games without a mode only appear on the All channel. The
page title, radio icon color, and empty states follow the channel, and
All/Nerf/Buff channel tabs sit in the sidebar. The no-live-games fallback
replay respects the channel too: `/api/games/recent` accepts `?mode=` and
filters on the games table's `category` column (mode games record "nerf" or
"buff" there). Switching channels resets pin/stream/replay state so nothing
from the other pool lingers.

## How-it-works copy (item 12)

Every stale merged-mode explanation now describes the modes separately:

- Home HowItWorks steps are now: Pick your mode / Draft as you play / Capture
  the king. Nerf mode: secret handicap picked from two cards, opponent's
  hidden until game end, boon drafts every 6 moves that mostly soften the
  nerf. Buff mode: no handicaps, buff drafts every 6 moves, strongest army.
- FAQ: new "What are the two modes?" entry, nerf/buff answers scoped by mode,
  and the stale "Are Draft games rated?" (claimed everything unrated) replaced
  with the real answer: queue games rated, one rating per pool, friend games
  casual.
- About: intro and "The idea" describe the two modes.
- Tutorial: intro and Rule III scoped to modes; walkthrough closing line
  updated (boons in Nerf mode, buffs in Buff mode).
- Footer tagline: "chess with two modes, secret nerfs or drafted buffs".
- Lobby "Create a Draft game" link renamed "Create a friend game".

## Home page (item 13)

The hero paragraph now opens with "Chess with two modes: choose Nerf or
Buff", each name a link in its mode color to `/lobby?mode=nerf|buff`, which
the QueueButton reads to preselect that mode.
