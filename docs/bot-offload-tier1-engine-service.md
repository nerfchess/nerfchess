# Tier 1 — House-bot engine offload (search → OCI)

**Goal:** move `pickAIMove` (the engine search) off the single-threaded game-server
Durable Object onto the OCI box, so bot search can never seize the DO thread and can
be scaled up (stronger / more bots) safely. Bot-vs-**human** games keep running on the
DO; only the *move computation* goes remote. This is the smaller, lower-risk step and
it de-risks the OCI engine bundle + transport before Tier 2.

## Phase 0 decision (settled)

A `NerfGame` is **not** JSON-round-trippable:
- `PlayerSlot.nerf` / `buffs` carry **functions** (`nerf.init`, behavior hooks) — dropped by `JSON.stringify`.
- `PlayerSlot.rng` is an **RNG class instance** — serializes to a dead plain object.

So we do **not** serialize the game object (option A1). Instead (**A2**) we send the
`StoredMatch` — already pure JSON in DO storage — and OCI **replays** it with a bundled
copy of `src/engine` to reconstruct the position. The replay reuses the same
deterministic engine the DO trusts, so no bespoke serializer and no risk of losing
mutable buff/closure state.

Version-lockstep is the price: OCI's engine must match the Worker's `REPLAY_VERSION`.
It fails **safe** — the DO re-validates the returned move against its own
`legalMoves(game)`, so a desync just makes the bot skip a tick (never a corrupt move).

## Components

1. **Shared replay** — `src/engine/replay.ts` (`replayToPosition`), used by both DO and OCI.
2. **OCI service** — `engine-service/` exposing `POST /move` + `/healthz`.
3. **DO swap** — `remoteHouseMove()` + the call-site change at `worker.ts:2617-2623`, behind a flag.
4. **Transport** — `engine.nerfchess.com` via the existing cloudflared tunnel + bearer secret.
5. **Deploy** — `nerfchess-engine.service` (systemd), coexists with `postgres16`.

---

### 1. Shared replay — `src/engine/replay.ts`

Extract the replay loop from `gameFromMatch` ([worker.ts:1195-1239](../worker.ts)) into a
**pure** function with no `this`. The DO's reveal bookkeeping
(`markViaRevealed` / `markBuffRevealed` / `draftRebuild`) is wire-visibility only and is
**not** needed for move choice, so it's injected via optional hooks — keeping ONE replay
implementation as the single source of truth.

Also move `moveByUci` ([worker.ts:410](../worker.ts)) into `src/engine` so both sides share it.

```ts
// src/engine/replay.ts
import {
  NerfGame, newGame, enableDraftMode, playMove,
  pickDraftCard, bankDraft, activateBuff,
} from "./game";
import { moveByUci } from "./uci";               // moved here from worker.ts:410
import { PLAYABLE_NERFS, UNRESTRICTED_NERF } from "./nerf";  // adjust to real module
import type { Color, Move } from "./types";

export interface EngineMatch {
  setup: { whiteNerfId: string; blackNerfId: string; seed: number; timeSec?: number };
  mode?: "nerf" | "buff";
  draft?: boolean;
  draftSeed?: number;
  cadence?: number;
  stacked?: boolean;
  moves: string[];
  draftActions?: StoredDraftAction[];            // same shape as worker.ts:89
  replayVersion?: number;
}

export interface ReplayHooks {
  onMove?: (game: NerfGame, move: Move) => void;      // DO passes markViaRevealed
  onAction?: (game: NerfGame, a: StoredDraftAction, i: number) => void; // DO passes reveal tracking
}

export function replayToPosition(m: EngineMatch, hooks?: ReplayHooks): NerfGame | null {
  const nerfById = (id: string) =>
    m.mode === "buff" ? UNRESTRICTED_NERF : PLAYABLE_NERFS.find((n) => n.id === id);
  const white = nerfById(m.setup.whiteNerfId);
  const black = nerfById(m.setup.blackNerfId);
  if (!white || !black) return null;

  let game = newGame(white, black, m.setup.seed);
  if (m.draft) {
    enableDraftMode(game, m.draftSeed ?? m.setup.seed, {
      mode: m.mode,
      ...(m.cadence ? { cadence: m.cadence } : {}),
      ...(m.stacked ? { stackFor: "b" as Color, stackBoost: 2 } : {}),
    });
  }

  const actions = m.draftActions ?? [];
  let cursor = 0;
  const applyUpTo = (ply: number) => {
    while (cursor < actions.length && actions[cursor].ply <= ply) {
      const a = actions[cursor];
      if (a.a === "pick") pickDraftCard(game, a.color, a.index);
      else if (a.a === "bank") bankDraft(game, a.color);
      else activateBuff(game, a.color, a.buffIndex, a.picks);
      hooks?.onAction?.(game, a, cursor);
      cursor += 1;
    }
  };

  for (let i = 0; i < m.moves.length; i++) {
    applyUpTo(i);
    const mv = moveByUci(game, m.moves[i]);
    if (!mv) return null;
    hooks?.onMove?.(game, mv);
    game = playMove(game, mv);
  }
  applyUpTo(m.moves.length);
  return game;
}
```

Then refactor the DO's `gameFromMatch` to call `replayToPosition(match, { onMove, onAction })`
where its hooks perform the existing `markViaRevealed` / reveal-tracking. This de-dupes
and guarantees byte-identical board reconstruction on both sides.

**Note:** `StoredDraftAction`, `PLAYABLE_NERFS`, `UNRESTRICTED_NERF`, `moveByUci` must all
end up importable from `src/engine`. `UNRESTRICTED_NERF` already lives in `game.ts:98`.

---

### 2. OCI engine service — `engine-service/`

```
engine-service/
  server.ts          # HTTP server (Bun or node:http)
  build.mjs          # esbuild: bundle server.ts + src/engine + pickHouseMove path → dist/server.js
  package.json
```

`pickHouseMove` (blunder branch + search) lives in `src/lib/server/bots.ts` and — for the
move path — imports only from `src/engine`, so it tree-shakes into the bundle cleanly.
Reuse it rather than re-implementing the blunder logic.

```ts
// engine-service/server.ts
import { replayToPosition, EngineMatch } from "../src/engine/replay";
import { pickHouseMove } from "../src/lib/server/bots";
import type { HouseSkill } from "../src/lib/server/bots";

const TOKEN = process.env.HOUSE_ENGINE_TOKEN!;
const REPLAY_VERSION = Number(process.env.ENGINE_REPLAY_VERSION);  // must match worker's
const PORT = Number(process.env.PORT ?? 8787);

// blunder is nondeterministic by design; a local RNG is fine
const randomInt = (max: number) => Math.floor(Math.random() * max);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/healthz") return new Response("ok");
    if (url.pathname !== "/move" || req.method !== "POST")
      return new Response("not found", { status: 404 });
    if (req.headers.get("authorization") !== `Bearer ${TOKEN}`)
      return new Response("unauthorized", { status: 401 });

    const body = (await req.json()) as {
      match: EngineMatch; skill: HouseSkill; remainingClockMs?: number; replayVersion: number;
    };
    // version guard → DO falls back to local compute on mismatch
    if (body.replayVersion !== REPLAY_VERSION)
      return new Response(JSON.stringify({ error: "replay_version" }), { status: 409 });

    const game = replayToPosition(body.match);
    if (!game) return Response.json({ move: null });
    const move = pickHouseMove(game, body.skill, randomInt, body.remainingClockMs);
    return Response.json({ move });
  },
});
```

Build: `esbuild engine-service/server.ts --bundle --platform=node --format=esm --outfile=dist/server.js`.
`src/engine` has **zero external deps** (verified), so the bundle is self-contained.

---

### 3. DO-side swap — `worker.ts`

**Env / config additions** (`wrangler.jsonc` `vars` + a secret):

| name | kind | value |
|---|---|---|
| `HOUSE_ENGINE_REMOTE` | var | `"true"` to enable; unset/`"false"` = local | 
| `HOUSE_ENGINE_URL` | var | `https://engine.nerfchess.com` |
| `HOUSE_ENGINE_TOKEN` | **secret** | `wrangler secret put HOUSE_ENGINE_TOKEN` |

> Optional upgrade: read the on/off from an `app_settings` row like `house_enabled`
> (cached ~15s) so you can flip remote on/off **without a redeploy**.

Constant: `const HOUSE_ENGINE_TIMEOUT_MS = 150;`

**New method:**

```ts
private async remoteHouseMove(
  match: StoredMatch, skill: HouseSkill, remainingClockMs?: number,
): Promise<Move | null> {
  if (this.env.HOUSE_ENGINE_REMOTE !== "true" || !this.env.HOUSE_ENGINE_URL) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), HOUSE_ENGINE_TIMEOUT_MS);
  try {
    const r = await fetch(`${this.env.HOUSE_ENGINE_URL}/move`, {
      method: "POST",
      signal: ctl.signal,
      headers: {
        authorization: `Bearer ${this.env.HOUSE_ENGINE_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        match: serializeMatchForEngine(match),   // curated EngineMatch subset
        skill,
        remainingClockMs,
        replayVersion: REPLAY_VERSION,
      }),
    });
    if (!r.ok) return null;                       // 409 version / 5xx → local fallback
    const { move } = (await r.json()) as { move: Move | null };
    return move ?? null;
  } catch {
    return null;                                  // timeout / network → local fallback
  } finally {
    clearTimeout(t);
  }
}
```

`serializeMatchForEngine(match)` = the `EngineMatch` subset only (`setup`, `mode`, `draft`,
`draftSeed`, `cadence`, `stacked`, `moves`, `draftActions`). Never send clocks/sessions/PII.

**Call-site swap** at `worker.ts:2617-2623`:

```ts
const clocks = this.currentClocks(match, now);
const remaining = match.setup.timeSec ? clocks[color] : undefined;

let move: Move | null = null;
if (this.env.HOUSE_ENGINE_REMOTE === "true") {
  move = await this.remoteHouseMove(match, persona.skill, remaining);
  // >>> concurrency guard: the await yielded the thread; the match may have ended
  if (match.result) return;
  // >>> desync/tamper guard: reject anything illegal in OUR reconstruction
  if (move && !legalMoves(game).some((m) => sameMove(m, move!))) move = null;
}
if (!move) {
  try {
    move = pickHouseMove(game, persona.skill, randomInt, remaining);  // local, full strength
  } catch (err) {
    console.error("house move pick failed, using a legal fallback", match.id, err);
  }
}
// ... existing `if (!move) { legal-random / no-legal-move end }` block unchanged ...
await this.commitMove(match, game, color, move, moveToUCI(move));
```

Two guards are **load-bearing** and new because of the `await`:
- **`if (match.result) return;`** after the remote call — the yielded thread may have
  serviced a resign/disconnect/end for this match while the search ran.
- **`legalMoves(game).some(sameMove)`** — treats OCI as untrusted; the DO stays authoritative.

Add a small equality helper:

```ts
function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
  // extend if Move carries buff/target discriminators
}
```

The fallback chain is: **remote → local `pickHouseMove` (full strength) → random legal →
end**. So an OCI outage degrades to *today's behavior*, not to weak bots.

---

### 4. Transport & auth

Add to the box's `/etc/cloudflared/config.yml`, **above** the catch-all (same pattern as
the `ssh.` and `pgdb.` ingress already there):

```yaml
- hostname: engine.nerfchess.com
  service: http://localhost:8787
```

Then `cloudflared tunnel route dns <tunnel> engine.nerfchess.com` and restart cloudflared.
No inbound ports open — it rides the existing tunnel.

Auth = the shared bearer secret (`HOUSE_ENGINE_TOKEN`), stored as a Worker secret and in
`/etc/nerfchess-engine.env` (chmod 600). The service 401s anything without it. Optional
belt-and-suspenders: front `engine.nerfchess.com` with an Access **service-token** app
(machinery already exists) — but the bearer check alone is sufficient and shaves a hop.

### 5. Deploy (mirror the status reporter already on the box)

- `/opt/nerfchess-engine/` — `dist/server.js`.
- `/etc/nerfchess-engine.env` (chmod 600): `HOUSE_ENGINE_TOKEN=…`, `ENGINE_REPLAY_VERSION=…`, `PORT=8787`.
- `nerfchess-engine.service`: `Type=simple`, `ExecStart=/usr/bin/bun /opt/nerfchess-engine/dist/server.js`,
  `EnvironmentFile=/etc/nerfchess-engine.env`, `Restart=always`, `Nice=5`, `After=network-online.target`.
  (Long-running, **not** oneshot like the reporter.)

---

## Rollout

1. Deploy service with flag **off**. `curl /healthz`; POST `/move` with a dumped real
   `StoredMatch` and confirm a legal move comes back.
2. `wrangler secret put HOUSE_ENGINE_TOKEN`; set `HOUSE_ENGINE_URL`; deploy Worker with
   `HOUSE_ENGINE_REMOTE` unset.
3. Flip `HOUSE_ENGINE_REMOTE=true`. Watch: engine-service logs, DO CPU-time per invocation,
   bot move cadence. Rollback = set `false` (instant if using the settings-row toggle).

## Tests

- **Parity:** dump a corpus of real `StoredMatch` JSONs; assert `replayToPosition(m)` on OCI
  yields the same board/FEN and identical `legalMoves` set as the DO's `gameFromMatch(m)`.
- **Version guard:** send a mismatched `replayVersion`, assert 409 + DO falls back local.
- **Outage:** point `HOUSE_ENGINE_URL` at a dead port; assert bots still move (local path) and
  humans are unaffected.

## Scope boundaries

- Bot-vs-**bot** games are still fully hosted on the DO — that's **Tier 2**.
- The DO still replays for commit + framing on bot-vs-human games (unavoidable: the human
  needs the resulting frame). Tier 1 removes only the **search** from the DO thread, and — via
  the `await` — stops it from blocking sockets at all.
```
