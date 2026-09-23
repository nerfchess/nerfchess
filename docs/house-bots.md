# How the house bots work

The "house players" are a fixed roster of engine-driven accounts that keep the
lobby and TV alive: they sit in the queues so a new player always finds a game,
pick up humans who queue, and play each other when nobody needs them. They look
like ordinary players everywhere (real accounts, ratings, profiles, leaderboard):
no bot flag ever leaves the server, in any payload or API (owner request: no
trace anywhere on the site).

TL;DR of the moving parts (2026-07, after the wave-3 spread):

- **900 accounts** ("personas") across three waves: the original 210, a 300
  persona expansion, and a 390 persona wave 3. The roster had to reach 900
  because the shown population now peaks at `HOUSE_ONLINE_MAX` (800) and the
  presence window is bounded by the roster length.
- **Every persona advertises its own tier** (± a name-hashed 40), and the
  roster's shape is set in ONE place: `HOUSE_SKILL_WEIGHTS`. About **82% of the
  field sits between 800 and 2000** and only **~9% at 2400 or above**, because a
  lobby whose bots all played 1500-2200 left genuinely new players with nobody at
  their level. `scripts/audit-house-bots.ts` asserts both the curve and that
  every declared tier matches it.
- The old three-layer rating stack is **gone** (a +100 spread, a 100-150 drop
  below 1600, an owner boost of +100..+300, and a +300..+400 uplift, all applied
  only to the legacy half). It made the field impossible to aim: two personas on
  the same tier could read 400 apart and no tier's displayed band matched its
  engine strength.
- **Tiers 2400-2700 advertise more than the engine can currently back.** The
  remote engine clamps every search to its 1800ms ceiling, which 2200 already
  uses, against the Worker's 3000ms engine timeout. Those tiers differ from 2200
  only by having no forced blunder (search efficiency, slice HB2, is the route
  to making them real).
  Their live ratings will drift down toward what they actually play, which is
  self-correcting; making them genuinely 2400+ needs a bigger service ceiling and
  a raised worker timeout, measured against the public URL first.
- Exactly **150 of the 300** expansion personas carry a short, casual,
  unique bio; the other 150 stay blank. Expansion personas carry **no**
  fictional location.
- Each persona has a stable **style** (`houseStyle`): think tempo, buff
  activation appetite, draft bank bias, aggression-driven search jitter, and a
  pet opening for each color, so no two bots pace or play identically.
- **Availability**: never the whole roster at once. The ACTIVE window (bots that
  seek, get picked up, or play filler) breathes daily between 260 and 380, and
  both windows rotate daily through the full roster.
- **The shown population and the presence list are different numbers.**
  `HOUSE_PRESENCE_LIST_MAX` (400) bounds how many personas are ENUMERATED into
  the lobby snapshot, because every one is a row in a payload every client polls.
  `houseOnlineCount(now)` is the COUNT the site displays: it breathes between
  **350 and 800** on a time-of-day curve (trough about 05:00 UTC, peak about
  17:00) with a per-day scale, and the DO pads the anonymous tally up to it. That
  separation is what lets the site read 800 online without shipping 800 rows.
- **Concurrent filler games run 80-120** (was 40-55), which is safe only because
  filler lives in `arena-service` rather than the Durable Object, and because
  bot-vs-bot is never rated or archived, so the arena caps each filler search at
  `ARENA_SEARCH_CEILING_MS` (300ms) to keep 120 games inside one event loop.
- Bots now occasionally play a **premove-style instant recapture**
  (`houseSnapReplyMs`): when the opponent just traded, or the bot has exactly
  one king-safe move, it sometimes answers in 120-350ms instead of thinking.
  Appetite is stable per persona (0.15-0.50), so a given bot is consistently
  snappy or consistently deliberate, and no bot snaps every time.
- Each move is chosen by the site's own alpha-beta engine (`src/engine/ai.ts`).
  A human game's search runs on the remote engine service (`engine-service/`,
  up to 1800ms) while the bot has more than 5 seconds left, and otherwise on the
  Durable Object itself, capped at `HOUSE_SEARCH_CEILING_MS` (80ms) so it can
  never stall the server. On top of the search sit a king-safety floor, a
  human-shaped blunder, an opening repertoire and a card policy, all in
  `bots.ts` (see "Playing strength" below).
- The whole roster is driven from the game server's **alarm loop** (`houseTick`
  in `worker.ts`), one action at a time, and **stands down completely when no
  human is connected**.
- It can be turned off live by a moderator, or hard-disabled in code.

Everything about the bots is built to not repeat the first version's crash: it
ran unbounded engine searches and per-tick database queries inside the
single-threaded game-server Durable Object and starved real traffic until it was
ripped out. Every cap below exists because of that.

---

## Where the code lives

| Concern | File |
| --- | --- |
| Roster, skill tiers, move/draft pacing, move + nerf-pick selection | `src/lib/server/bots.ts` |
| The chess engine (search + evaluation) | `src/engine/ai.ts` |
| Buff-draft choice + buff activation choice (shared with client bot) | `src/engine/game.ts` (`aiDraftChoice`, `aiChooseBuffActivation`) |
| Orchestration: seeks, pairing, house-vs-house games, the alarm tick, on/off | `worker.ts` (the game-server Durable Object) |
| Avatars (flower presets + house-pfp scenic images) | `src/lib/avatars.ts`, `public/house-pfp/` |
| Runtime on/off flag storage | `app_settings` table (D1), key `house_enabled` |

---

## The roster (`src/lib/server/bots.ts`)

There are **900 personas** defined in `PERSONA_DEFS` (the original list plus
`EXPANSION_DEFS` and `WAVE3_DEFS`, folded in at module load). Each has a
Lichess-style username (nothing that says "bot": `pawnstorm77`, `caroCannon`,
`zwischenzugzz`, `SIXSEVENHAHAHAH`, `toastyweasel`, `idontknowopenings`, ...) and
a tier DERIVED FROM ITS NAME by `houseSkillForName` against
`HOUSE_SKILL_WEIGHTS`. Deriving it means a name maps to the same tier forever and
adding names later never reshuffles anyone else; the tuples still carry the
number so the file stays readable, and the audit asserts the two agree.

Resulting shape (900 personas):

| Band | Share |
| --- | --- |
| 800-2000 | ~82% |
| 2000-2400 | ~8% |
| 2400+ | ~9% |

Each persona is a **real user row** in the database (`ensureHouseUsers`, run on
cold start, idempotent):

- User id is prefixed `hp_` (e.g. `hp_pawnstorm77`) so it is never confused with
  a real account or the retired old bot system.
- Password hash is deliberately unusable, so nobody can ever sign in as one.
- It gets a rating in **both** rating pools (nerf and buff). The seed rating is
  the skill tier plus a stable name-derived jitter of about +-40
  (`houseSeedRating`), so the roster does not debut as blocks of identical
  numbers. RD/volatility start at normal values, so their ratings move like real
  players' once they play.
- Its avatar is one of two house-only looks. **About half** the roster
  (`HOUSE_PFP_ASSIGN` in `bots.ts`) gets a "real uploaded-looking" profile
  picture: an original SVG (a scenic/object image such as a coffee mug or a night
  skyline, or one of the memorable character/meme-style subjects: a troll
  grin, a puzzle cube, a shiba, a moai, ...) stored as `house_pfp:<name>` and
  served from `public/house-pfp/<name>.svg`, so the crowd reads like real
  users who uploaded a random photo. Thematic names get thematic images
  (`teatimechess -> tea_set`, `lazydodge -> shiba_wow`), and the generated
  pool (`scripts/gen-house-pfps.mjs`) covers the rest with 50 distinct
  subjects x 4 palette variations. The rest keep a **flower** preset (`FLOWER_AVATARS`): the
  normal piece-on-plate look (the "_flower" preset id survives only as an
  internal marker; no visible mark is drawn from it). Real accounts can never
  pick either kind (`isAvatarId` and the avatar upload route reject them, and
  `isHousePfp` only matches house-held ids), so both stay house-only. The
  `/mod/house` editor may move a persona between any look in `HOUSE_AVATAR_IDS`
  (both catalogs) but never outside it.

Because they hold real rows, rated games against them count, and they appear on
the leaderboard exactly like humans (moderator views filter them out).

---

## Playing strength (`HOUSE_SKILL_PROFILES`)

The engine itself (`src/engine/ai.ts`) has three levels: `easy` (1-ply greedy
with heavy noise and a 22% random move, used only by the client practice bot),
`medium` (alpha-beta to depth 3 plus quiescence) and `hard` (iterative deepening
up to 12 plies with a richer evaluation). House players never use `easy`.

Each tier's baked profile (the table below is checked against the code by
`scripts/audit-house-bots.ts`; update both together). Depth, top-K, temperature
and noise are the weakening knobs (`WeakenParams`): a tier with top-K above 1,
a temperature or noise samples among the best root moves instead of playing the
single best one. A dash means the engine default (argmax, the level's depth).

<!-- house-skill-profiles:start -->
| Tier | Level | Budget ms | Blunder | Depth | Top-K | Temp cp | Noise cp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 800 | medium | 24 | 0.28 | 1 | 7 | 320 | 150 |
| 900 | medium | 30 | 0.22 | 1 | 6 | 260 | 120 |
| 1050 | medium | 40 | 0.16 | 1 | 4 | 150 | 70 |
| 1200 | medium | 40 | 0.12 | 3 | 4 | 150 | 70 |
| 1350 | medium | 120 | 0.05 | - | - | - | - |
| 1450 | medium | 180 | 0.035 | - | - | - | - |
| 1550 | hard | 240 | 0.02 | - | - | - | - |
| 1650 | hard | 400 | 0.01 | - | - | - | - |
| 1750 | hard | 600 | 0.003 | - | - | - | - |
| 1900 | hard | 760 | 0.002 | - | - | - | - |
| 1950 | hard | 960 | 0.002 | - | - | - | - |
| 2000 | hard | 1160 | 0.001 | - | - | - | - |
| 2050 | hard | 1360 | 0.001 | - | - | - | - |
| 2100 | hard | 1520 | 0.001 | - | - | - | - |
| 2150 | hard | 1680 | 0.0005 | - | - | - | - |
| 2200 | hard | 1800 | 0.0005 | - | - | - | - |
| 2400 | hard | 1800 | 0.0002 | - | - | - | - |
| 2500 | hard | 1800 | 0.0001 | - | - | - | - |
| 2600 | hard | 1800 | 0 | - | - | - | - |
| 2700 | hard | 1800 | 0 | - | - | - | - |
<!-- house-skill-profiles:end -->

How one move is chosen (`pickHouseMove`), in order:

1. A king capture, when one is on the board.
2. The persona's pet first move (70% of the time, when legal), then the opening
   repertoire (`HOUSE_BOOK`, about 50 mainstream lines) for the first 4 to 12
   plies depending on tier. Each persona weights the lines its own way, or a
   `varietySeed` does when no persona is known, so the house plays many
   openings instead of the search's single favourite. A book move is played
   only when the position is exactly the book's, the move keeps the king safe
   and it does not trip the bot's own nerf.
3. At 800 and 900 only, a small check leak (7% and 4.5% when in check): the bot
   has not noticed the check and grabs material instead.
4. The blunder roll (the table's chance, one and a half times as likely under
   10 seconds): a human-shaped blunder (`houseBlunderMove`), a move that leaves
   something to take and loses 100-600cp statically at 800-1050, 100-450 up to
   1450 and 80-350 above, never a king hang or an own-nerf loss. If nothing in
   the position fits, a shallow sampled search instead.
5. Otherwise the search at the graded budget (`houseMoveBudgetMs`, below).
6. The king-safety floor over 4 and 5: no move after which the opponent can
   capture the king while another move exists.

The search budget (`houseMoveBudgetMs`) is graded from the clock: untimed, the
tier's budget; timed, about remaining / 30 plus 0.7 x the increment, minus the
expected visible think and (on the remote path) a 500ms round trip, capped by
the tier and the ceiling, and floored at 60ms (40ms under 5 seconds). It
replaced a flat 25ms under 30 seconds, which made every tier play like a 1300
for most of a bullet game.

Persona style (`applyPersonaStyle`) jitters the temperature and noise of the
sampled tiers only. Argmax tiers keep their full search: their variety comes
from the repertoire, which costs no depth.

Measured (evidence in `docs/polish-pass/evidence/HB/HB1/`, slice HB1): the
800-1050 tiers used to leave the king capturable after 47-57% of moves played in
check (now 0-1.3%); each adjacent tier from 800 to 1450 now scores 55-88%
against the one below over 20 games (a direction, not a calibration, at that
sample size); a forced blunder used to be a random move (7 king hangs in 320,
12.8% losing 900cp or more) and is now a missed tactic (0 king hangs, median
loss 330cp at 800 down to 120cp at 1900, none at 900cp or more).

### Moderator overrides (formerly `docs/bot-weakening-spec.md`)

That document was never committed; this section replaces it. A moderator can
patch any tier's profile live from `/mod/house`, stored as JSON in
`app_settings.house_skill_overrides` and read by the Durable Object about every
15 seconds (`resolveSkillProfile`). Every field is clamped to `WEAKEN_CLAMP`
and a bad or missing field falls back to the baked value, so no stored value
can stall the thread. `WEAKENED_PRESET` and `VERY_WEAK_PRESET` are the one-click
presets. `level` is never overridable.

---

## Pacing: how long a bot "waits" before acting

The delay before an action lands is separate from the time the search takes,
and gives way to it: the caller passes the expected search time and it is taken
out of the wait, since a human sees the two added together and both come off
the bot's clock.

- **Moves against a human** (`houseThinkMs`): shaped by the time control, using
  the estimated game length (base + 40 x increment). 0.3-1.0s in 1+0,
  0.4-1.4s in 2+1, 0.7-2.2s in 3+0 and 3+2, and the familiar 1-4s from 5+0 up,
  where about 1 move in 10 is a 6-10s long think, more often when captures are
  on the board. The first five own moves come in 0.3-1.1s and a forced move
  (one king-safe move) in 0.2-0.7s. The clock caps every think at a sixtieth of
  what is left (a 25th for a long think), so a bot low on time speeds up the way
  a person does. The persona `tempo` (0.75-1.35) leans every think.
- **Filler games** (bot against bot, `thinkMultiplier > 1`) keep the exact
  pre-2026-09-23 pacing (`houseFillerThinkMs`: 1-3s up to 3 minutes, else 1-4s
  with a 6-10s tail, then the multiplier and the low-clock clamps).
  `scripts/sim-house-clock.ts` checks 10,000 seeds against a copy of the old
  function.
- **Draft picks** (`houseDraftThinkMs`): **2-8 seconds** before a pick lands,
  comfortably inside the 15-second lock-in window (the server's deadline
  auto-resolve is the backstop).

Measured with the worker as it is (`scripts/sim-house-clock.ts`, 400 runs a
cell, 500ms round trip): a 1+0 bot used to flag around move 34-41 with 59-72% of
its first 40 moves searched at 25ms; now around move 72-81, none at 30ms or
less. 3+0: from 62-92 to 105-141. No increment pool flags inside 150 moves.

---

## Drafting: how bots pick nerfs and buffs

- **Opening nerf pick** (`houseNerfPickIndex`): between the two dealt options the
  bot prefers the **lower tier** (the milder handicap), random on a tie. It is a
  pure function so a deadline re-roll lands the same way.
- **Buff / hex offers** (`aiDraftChoice` in `game.ts`): the bot prefers the
  **highest-tier card it can actually use** without a human's targeting UI;
  passives and instants score highest, activated cards a bit lower, pure
  info/reveal cards score zero, and if every option is unusable to a bot it
  **banks** the draft instead.
- **Using held buffs**: today `worker.ts` rolls the persona's activation
  appetite (0.25-0.55) each turn and fires the first card
  `aiChooseBuffActivation`'s gates accept. `houseChooseActivation` (in
  `bots.ts`, waiting on REQUEST R9 in `docs/polish-pass/slices/HB.md` to be wired
  in) replaces that: it looks at every card the gates accept, never passes the
  turn with a piece hanging that a move would have saved, takes the best card
  rather than the first, and grows keener as the board empties. Measured over 80
  paired games: bad fires 17-19 to 0, paired score 53-58% against today's policy
  (the interval still includes 50%). `houseDraftChoice` leans each persona its
  own way among equal cards and banks less as the offered tier rises. Any card
  that throws mid-activation is caught and the bot just makes a normal move.

### Behaviour helpers waiting on `worker.ts`

Pure decisions in `bots.ts`, tested by `scripts/test-house-policy.ts`, for the
worker to call through the same frames a human's action produces (REQUESTS R5
to R11 in `docs/polish-pass/slices/HB.md`): `houseResignDecision` (1500 and up
resign after 2-6 own moves at -600cp or worse, beginners play on, some personas
never resign), `houseDrawDecision` and `houseDrawOffer` (dead-level endings are
always drawn, winning ones never), `houseRematchDecision` (50-85% by persona,
2-6s), `houseSnapMove` (the recapture a snap plays, without the remote round
trip), `houseEngineTimeoutMs` and `HouseEngineBreaker` (stop paying a timeout
per move when the engine box hangs). Their numbers never reach a client.

---

## Orchestration: the alarm loop (`worker.ts`)

The game server is one global Durable Object. It has an **alarm** that fires
roughly once a second while there is activity; each firing runs `houseTick()`
(before regular match maintenance). `houseTick` does, in order:

1. **Check the on/off flag.** If the bots are paused, it clears all seeks and
   ends any in-progress bot game as an unrated draw (so no human is left waiting
   on a bot that will never move), then stops.
2. **Stand-down check.** **If no human socket is connected anywhere, the roster
   stands down**: seeks clear and nothing new starts (games already live still
   play out and finish). This is the core anti-crash rule: the bots only churn
   while a human is actually present.
3. **Maintain the queue.** Keep only **2-4 personas seeking** (`houseSeekMin`
   ..`houseSeekMax`) across the blitz pools, split roughly 50/50 between Buff and
   Nerf so neither queue starves. Pools are weighted toward common blitz
   controls (1+0, 2+1, 3+0, 3+2, 5+0, 5+3); a seek expires after 8 minutes.
4. **Pick up a waiting human.** A lone human who has been queued for about
   **4.5 seconds** (`houseHumanPickupMs`) with no human opponent is paired with a
   persona, so the queue never feels dead. (If the house is already at its game
   cap, the human keeps waiting for a real opponent instead.)
5. **Spawn a few house-vs-house games** so the lobby and TV always show live
   play, up to the caps below.
6. **Play at most a few pending bot actions** this tick.

The action itself (`playHouseAction`) does exactly **one** thing per invocation
(a nerf pick, a buff-offer resolve, a buff activation, or a move) and then
re-arms the next one; it never batches a whole game's worth of work into one
tick.

### The caps (all in `worker.ts`)

| Cap | Value | Meaning |
| --- | --- | --- |
| `houseSeekMin` / `houseSeekMax` | 2 / 4 | Personas kept in the queue at once |
| `HOUSE_VS_HOUSE_FLOOR` / `HOUSE_VS_HOUSE_CAP` | 80 / 120 | Simultaneous bot-vs-bot games (160-240 bots in games) |
| `HOUSE_GAMES_MAX` | 140 | Ceiling on the moderator's "Active games" pin |
| `ARENA_SEARCH_CEILING_MS` | 300 ms | Per-move search in a FILLER game (unrated, so safe to cap) |
| `houseMaxActionsPerTick` | 3 | Engine actions (moves + draft resolves) per alarm tick, across all bot games |
| `houseTickBudgetMs` | 250 ms | Soft wall-clock budget for one tick's bot work |
| `houseHumanPickupMs` | 4.5 s | Wait before a lone human is given a bot opponent |
| `HOUSE_SEARCH_CEILING_MS` | 80 ms | Absolute per-move search time |

Every bot code path is wrapped so a failure "degrades to bots absent" rather than
breaking human play: if any bot step throws, that step is skipped, never the
human's game.

---

## Turning the bots on and off

Two independent switches:

1. **`HOUSE_ENABLED`** constant in `worker.ts` (currently `true`): a hard,
   code-level kill switch. `false` = no seeks, no new games, no engine moves at
   all, requires a redeploy to change.
2. **Runtime flag** `app_settings.house_enabled` in the database: a moderator
   flips it via `POST /api/mod/house`. The Durable Object reads it and caches the
   value for ~15 seconds (`houseEnabledTtlMs`) so the hot alarm path does no
   per-tick database work. A flip takes effect within a few seconds **without a
   redeploy**: seeks clear and any in-progress bot game winds down as an unrated
   draw.

Any read error defaults to ON, so the bots never vanish on a transient database
blip. Both switches must be on for the roster to run.

---

## How a bot game actually flows

1. A persona is seeking in a pool, or is spawned to fill / to pick up a human.
2. When paired, the match is created with that persona in one seat
   (`match.bots[color] = hp_id`). A house seat counts as "connected" for game
   start (it has no socket), and the alarm plays its turns.
3. Draft games: each side's opening nerf is picked (bots prefer the milder one);
   then buff/hex offers are resolved every few moves as they come.
4. On the bot's turn the alarm, after the pacing delay, either fires a held buff
   (40% coin) or plays a move from the capped engine search.
5. If the human seat disconnects **during its own turn**, that game's clock
   pauses so a dropped socket never flags them mid-move, and the bot resumes
   when they return. The pause is **bounded**: one absence buys at most 45
   seconds and a seat gets at most 90 seconds across the whole game
   (`src/lib/server/clockPause.ts`). Past that the clock restarts itself from
   the alarm and the ordinary flag path applies, so an absent player can lose on
   time like anyone else. Without those bounds nothing could ever end the pause
   (`currentClocks` returns banked values while it holds and `candidateAlarm`
   arms no flag), so five minutes away cost only the ~10s the socket took to
   notice, and backgrounding a phone tab froze the clock indefinitely. If the
   server is updated mid-game, the game ends as a drawn, unrated result.

---

## How they present to players

House players are intentionally indistinguishable from humans: no visible mark,
no bot flag in any payload, and moderator-only user lists are the one place
they are filtered out. Their resigns, draw answers and rematch answers (once
wired, REQUESTS R5 and R6) use exactly the frames and human-like delays a
person's would.

They have profiles, real (moving) ratings in both pools, appear in game history
and on the leaderboard, and their games show on TV like any other.

---

## Notes vs the original spec

The original request asked to "use Maia for the engine" and "outsource the engine
so it doesn't crash the servers." The shipped system does **neither**:

- It uses a **local, homegrown alpha-beta engine** (`src/engine/ai.ts`), not
  Maia. Maia would have meant bundling a neural-net weights file and running
  inference, which is far too heavy for the single-threaded Durable Object.
- Search for human games is outsourced now: the remote engine service
  (`engine-service/`, on the OCI box) takes up to 1800ms a move, and the
  Durable Object only searches locally (80ms ceiling, strictly serialized) when
  the bot is low on time or the service does not answer. The human-like feel
  comes from the pacing, the opening repertoire and the human-shaped blunders.

Where the implementation does match the spec: the 1-4s / up-to-10s move timing
from 5+0 up (shorter in bullet and 3-minute blitz), a mix of Nerf and Buff
games, and keeping a couple of personas in the queue at all times (here, 2-4).
The roster is 900 (the spec floated 10-20) and the skill mix is set by
`HOUSE_SKILL_WEIGHTS` (see "The roster" above).
