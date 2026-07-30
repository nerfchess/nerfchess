# How the house bots work

The "house players" are a fixed roster of engine-driven accounts that keep the
lobby and TV alive: they sit in the queues so a new player always finds a game,
pick up humans who queue, and play each other when nobody needs them. They look
like ordinary players everywhere (real accounts, ratings, profiles, leaderboard):
no bot flag ever leaves the server, in any payload or API (owner request: no
trace anywhere on the site).

TL;DR of the moving parts (2026-07 expansion):

- **510 accounts** ("personas"): the 210-deep legacy roster plus a 300-persona
  expansion wave spanning genuine beginner (new 900 / 1050 / 1200 tiers)
  through elite (2200) strength.
- Every **legacy** persona's advertised rating gained a deterministic
  **+300..400** (name-hashed, stable across resyncs — `houseRatingUplift`), and
  every tier's engine profile was strengthened in the same change (bigger
  search budgets, fewer forced blunders) so real strength moves with the number.
  **Expansion** personas advertise their tier directly (no uplift stack).
- Exactly **150 of the 300** expansion personas carry a short, casual,
  unique bio; the other 150 stay blank. Expansion personas carry **no**
  fictional location.
- Each persona has a stable **style** (`houseStyle`): think tempo, buff
  activation appetite, draft bank bias, aggression-driven search jitter, and a
  pet opening for each color — so no two bots pace or play identically.
- **Availability**: never the whole roster at once. The ACTIVE window breathes
  daily between 180 and 240 personas, the ONLINE window shows at most 280, and
  both rotate daily through the full roster.
- Each move is chosen by a **local chess engine** (a small alpha-beta search in
  `src/engine/ai.ts`) with a **hard 80ms budget** so it can never stall the
  server. It is NOT Maia and nothing is outsourced (see "Notes vs the original
  spec").
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

There are **50 personas** defined in `PERSONA_DEFS`. Each has a Lichess-style
username (nothing that says "bot": `pawnstorm77`, `caroCannon`, `zwischenzugzz`,
`SIXSEVENHAHAHAH`, `kingcongo`, `anarchychess`, ...) and a fixed skill tier.

Skill distribution (roughly 40 / 30 / 20 / 10):

| Skill | Count |
| --- | --- |
| ~1200 | 20 |
| ~1400 | 15 |
| ~1600 | 10 |
| ~1750 | 5 |

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
  picture: an original SVG (a scenic/object image — a coffee mug, a night
  skyline — or one of the memorable character/meme-style subjects: a troll
  grin, a puzzle cube, a shiba, a moai, ...) stored as `house_pfp:<name>` and
  served from `public/house-pfp/<name>.svg`, so the crowd reads like real
  users who uploaded a random photo. Thematic names get thematic images
  (`teatimechess -> tea_set`, `lazydodge -> shiba_wow`), and the generated
  pool (`scripts/gen-house-pfps.mjs`) covers the rest with 50 distinct
  subjects x 4 palette variations. The rest keep a **flower** preset (`FLOWER_AVATARS`): the
  normal piece-on-plate look plus a small flower mark. Real accounts can never
  pick either kind (`isAvatarId` and the avatar upload route reject them, and
  `isHousePfp` only matches house-held ids), so both stay house-only. The
  `/mod/house` editor may move a persona between any look in `HOUSE_AVATAR_IDS`
  (both catalogs) but never outside it.

Because they hold real rows, rated games against them count, and they appear on
the leaderboard exactly like humans (moderator views filter them out).

---

## Playing strength (`HOUSE_SKILL_PROFILES`)

The engine itself (`src/engine/ai.ts`) has three levels: `easy` (1-ply greedy
with heavy noise), `medium` (3-ply alpha-beta + quiescence), and `hard`
(iterative-deepening search up to 12 plies + a richer evaluation). The client's
"play vs bot" uses these with 700-2000ms to think.

House players use the SAME engine but on a **tiny time budget**, and their
strength difference comes from the budget plus a blunder chance, not from deep
thinking:

| Skill | Engine level | Search budget | Blunder chance |
| --- | --- | --- | --- |
| 1200 | medium | 25 ms | 10% |
| 1400 | medium | 40 ms | 5% |
| 1600 | hard | 60 ms | 2% |
| 1750 | hard | 80 ms | 0.5% |

- **Blunder chance** is the probability, per move, of ignoring the search
  entirely and playing a random legal move (that does not instantly lose to the
  bot's own nerf). This is what makes the lower tiers feel human-fallible.
- Every search is clamped to **`HOUSE_SEARCH_CEILING_MS = 80ms`**, and shrunk
  further when the bot's own clock is low (down to ~25ms under 30s left, floor
  10ms). This ceiling is the single most important safety number: while a search
  runs, the single-threaded server answers nothing else.

---

## Pacing: how long a bot "waits" before acting

The delay before an action lands is separate from the (tiny) time it actually
spends computing.

- **Moves** (`houseThinkMs`): about **90% of moves take 1-4 seconds**, and
  roughly **1 in 10 takes 6-10 seconds** (a human-like "long think"). The delay
  is clamped hard when the bot's own clock is low so pacing can never flag a bot
  that still has time on the bank (under 10s left it moves in ~0.3-0.8s; under
  25s in ~0.7-1.5s; otherwise never spends more than a fifth of its remaining
  clock waiting).
- **Draft picks** (`houseDraftThinkMs`): **2-8 seconds** before a pick lands,
  comfortably inside the 15-second lock-in window (the server's deadline
  auto-resolve is the backstop).

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
- **Using held buffs**: on each of its turns in a draft game there is a **40%
  chance** the bot tries to fire a held buff instead of moving
  (`aiChooseBuffActivation`), which applies its own "is this worth it" gates. The
  coin keeps bots from dumping every card the instant it clears the bar. Any card
  that throws mid-activation is caught and the bot just makes a normal move.

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
| `houseVsHouseCap` | 18 | Simultaneous bot-vs-bot games (~36 bots in games) |
| `houseTotalGamesCap` | 20 | Unfinished games with any house seat at all |
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

House players are intentionally indistinguishable from humans except:

- the **flower** in the bottom-left of their avatar,
- moderator-only user lists filter them out.

They have profiles, real (moving) ratings in both pools, appear in game history
and on the leaderboard, and their games show on TV like any other.

---

## Notes vs the original spec

The original request asked to "use Maia for the engine" and "outsource the engine
so it doesn't crash the servers." The shipped system does **neither**:

- It uses a **local, homegrown alpha-beta engine** (`src/engine/ai.ts`), not
  Maia. Maia would have meant bundling a neural-net weights file and running
  inference, which is far too heavy for the single-threaded Durable Object.
- Nothing is outsourced. Instead the crash risk is handled by making each search
  trivially cheap (<=80ms) and strictly serialized (at most a few per tick, only
  while a human is watching). The human-like feel comes from the pacing (1-4s,
  occasionally 6-10s) and the per-tier blunder chance, not from engine strength.

Where the implementation does match the spec: the 1-4s / up-to-10s move timing,
the ~40/30/20/10 skill mix around 1200/1400/1600/1750, a mix of Nerf and Buff
games, the flower avatar mark, and keeping a couple of personas in the queue at
all times (here, 2-4). The roster is 50 (the spec floated 10-20) to comfortably
fill a busy lobby and serve as a load test.
