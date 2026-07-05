# Mode color identity (Nerf red, Buff blue)

Owner asked for a clear visual differentiator between the two game modes
everywhere on the site: Nerf mode slightly red, Buff mode blue.

## Tokens

Added `colors.mode` to `tailwind.config.ts`:

- `mode-nerf` #c0413b, `mode-nerfGlow` #dc5a54 (shares the oxblood family)
- `mode-buff` #3692e7, `mode-buffGlow` #4a9fee (the site azure, fixed hex so
  it survives accent-color setting swaps)

Used as subtle tints only: borders (`border-mode-x/40`), soft washes
(`bg-mode-x/10`), smallcaps text (`text-mode-xGlow`). Glows reuse the
existing `shadow-oxblood` / `shadow-leaf` box shadows.

## Shared badge

`src/components/ModeBadge.tsx`: small pill, props `mode` ("nerf" | "buff" |
undefined) and `compact`. Renders "Nerf" red or "Buff" blue; renders nothing
for undefined (legacy games, older servers).

## Where it shows

- Home hero copy now names the two modes with tinted names and a one-line
  description each.
- Play page mode cards carry their identity at all times (tinted border and
  title, one-word tagline: Buff "Power-ups", Nerf "Handicaps"); selection
  deepens border, wash, and glow.
- Friend page mode buttons tint red/blue when selected.
- Lobby: seek rows, open-challenge rows, and live-game rows show ModeBadge.
- TV page: live-game list rows and the pinned-game status line show it.
- In-game headers: OnlineMatch subtitle, bot game subtitle, and the
  spectator status line tint the mode name (statusLabel prop widened from
  string to ReactNode for this).

## Protocol change

The lobby snapshot now threads `mode` end to end: `MPLobbyGame`,
`MPLobbyChallenge`, and `MPLobbySeek` gained optional `mode`
(`src/lib/multiplayer.ts`), and `worker.ts` `lobbySnapshot` emits it from
each `StoredMatch.mode` (seeks are always `"buff"`). Old payloads without
`mode` simply render no badge. Documented in
`docs/game-server-protocol.md` (lobby reply row).
