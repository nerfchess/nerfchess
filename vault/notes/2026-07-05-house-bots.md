# House players (rebuilt, 2026-07-05)

Punch-list item 14: 10-20 fake "house players" so new players always find a
game. This is the second attempt; the first one crashed the server and was
removed. This note records what existed, what crashed, and how the rebuild is
designed so it cannot happen again.

## What existed before

- PR #65 added a 15-account roster (`src/lib/server/bots.ts`, star-marked
  avatars) with orchestration in the Durable Object (`botTick`).
- It then went through a crash-fix saga: unbounded engine searches and full
  game replays on every clock check starved the single-threaded DO
  ("Can't reach the game server"), one wedged game froze the whole roster
  (#71), the alarm chain died silently (#72), per-tick D1 roster queries kept
  the DO too busy (#74).
- Commit 7331763 removed the whole system and migration 0008 deleted the
  `bot_%` accounts. The current worker until today only carried a one-time
  purge of the leftover storage keys (now removed; it ran in production long
  ago).

## The rebuild

New module `src/lib/server/bots.ts` (pure functions only) plus orchestration
in `worker.ts` (`houseTick`, `playHouseAction`, `armBotAction`). New storage
keys use the `hp:` prefix and new user ids use the `hp_` prefix, so nothing
collides with the retired system or its cleanup migration.

### Personas (16)

| Skill | Personas | Engine level | Search budget | Blunder chance |
|-------|----------|--------------|---------------|----------------|
| ~1200 (6) | pawnstorm77, f6isfine, tempoLoss, premoveKing, eloFarmer2, backRankBlues | medium (3-ply) | 25ms | 10% |
| ~1400 (5) | QuietMoveGuy, caroCannon, rookliftt, zugzwangg, LondonSystemFan | medium (3-ply) | 40ms | 5% |
| ~1600 (3) | kniveskniqht, endgameEnjoyer, berserkedd | hard (ID) | 60ms | 2% |
| ~1750 (2) | smotheredM8, outpostcrab | hard (ID) | 80ms | 0.5% |

- Roughly the requested 40/30/20/10 mix. Strength comes from budget plus
  blunder probability, never deep search.
- Seeded rating: skill plus a stable +-40 name-hash jitter, written into
  `users` and both mode buckets (`user_ratings` nerf/buff, rd 150) by
  `ensureHouseUsers` (runtime, idempotent, one-time via `hp:seeded:v1`).
  Their games are rated inside their pool through the exact same
  `recordFinishedGame` flow humans use.
- Accounts are real user rows with an unusable password hash, so profiles,
  history, and the leaderboard work with no special casing.

### The flower mark

Every persona's avatar is a `_flower` twin of a normal preset
(`src/lib/avatars.ts`). `PlayerAvatar` renders a small flower emoji in the
bottom-left corner for those presets. Because the mark travels inside the
avatar id string, it shows everywhere avatars render from server data (lobby,
in-game, spectate, profiles) with zero schema or wire-format changes.
`isAvatarId` rejects `_flower` (and `_star`) ids, so a real account can never
claim one.

### Queue presence

- `houseTick` keeps 2-3 personas seeking at all times across the two pools
  (weighted ~60% Buff / 40% Nerf, blitz-heavy time controls), rotating
  personas by random draw, 8-minute seek TTL.
- A human who queues pairs instantly with any waiting human (unchanged
  `queueJoin` flow). If nobody comes within ~4.5s, `houseTick` pairs them
  with a persona: preferring the persona whose seek matches the pool+mode.
- House matches are ordinary rated queue Draft matches (same record shape,
  same frames); the house seat counts as "arrived", the human joins via the
  usual `paired`/`reconnect` path.

### Caps (hard)

- Max 2 simultaneous house-vs-house filler games (`houseVsHouseCap`),
  started at most one per tick with a random 20-80s gap.
- Max 6 unfinished games with any house seat (`houseTotalGamesCap`); above
  it, personas leave the queue instead of pairing.
- At most ONE house-vs-house action (search) per alarm tick; human-facing
  actions all run (there are at most a handful).
- Search ceiling `HOUSE_SEARCH_CEILING_MS` = 80ms; measured worst case in the
  sim is ~200ms (the negamax time check fires at 2x budget and quiescence
  finishes its subtree). That is the absolute worst per-tick CPU chunk.

### Pacing

- Moves: uniform 1-4s, ~1 in 10 moves 6-10s (sim measured 10.0%).
- Clock-aware clamps: under 25s bank think <=1.5s, under 10s <=0.8s, and
  never more than a fifth of the remaining bank, so a house player cannot
  flag with time left because of pacing.
- Opening nerf pick and buff-offer resolves: 2-8s, inside the 15s lock-in;
  the existing deadline auto-resolve is the backstop if the timer is lost.
- Nerf pick: lower tier of the two options (milder handicap), random on tie.
  Buff offers via `aiDraftChoice`, occasional activations via
  `aiChooseBuffActivation` (both are the decision halves of the existing
  client-bot helpers, applied through the server's recorded-action flow so
  the match record is byte-identical to a human game's).

### Crash safety (each maps to a previous incident)

- No humans connected = full stand-down: seeks cleared, no filler starts, no
  heartbeat; the DO goes idle. Live house games still finish via their own
  per-move alarms. (Incident: constant alarm churn with zero traffic.)
- `houseTick` is wrapped in try/catch in `alarm()` and runs before (never
  inside) match maintenance; any failure degrades to "bots absent".
- Every unit inside the tick (each due action, each pool pickup, seek top-up,
  filler start) is individually isolated; a match that throws while acting is
  retired on the spot so it cannot re-throw every tick. (Incident: #71.)
- Alarm-chain revival on socket connect and /healthz when the stored alarm is
  missing or >20s overdue. (Incident: #72.)
- Zero D1 in the steady state: ticks read only DO storage. D1 is touched at
  pairing/filler start (one rating read) and game end (the normal recording
  path), plus one-time seeding. (Incident: #74.)
- Clock/flag checks still never replay games (parity/turnColor only); a house
  action replays its own game exactly once, the same cost as one human move.
- /healthz is read-only diagnostics (`house` section: seeded, seeks, games,
  tickError) and never runs orchestration. Build version `house-players-1`.

### Known small trade-offs

- Rematch offers against a house player return "opponent gone" (bots do not
  accept rematches); requeueing pairs you again within ~5s.
- House players never chat and decline draws/takebacks implicitly by moving.
- Two humans in different pools: pickups run one per tick, the second waits
  ~1.5s longer (quick follow-up alarm).

### Verification

- `npm run typecheck` clean.
- `npx -y tsx scripts/sim-house-bots.ts`: all skill tiers produce legal moves
  across full Nerf and Buff draft games (including offer resolves and
  activations), worst search 202ms, pacing distribution 10.0% long thinks,
  clamps verified, roster shape 6/5/3/2, no "bot" substring in names, all
  flower avatars, seek mix ~60/40.
