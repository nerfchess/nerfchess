// Engine service contract test (slice HB3). Starts a built bundle on local
// ports and checks the /move and /healthz contract end to end, plus the card
// overrides replay against the local engine.
//
//   node engine-service/build.mjs
//   ./node_modules/.bin/tsx engine-service/test/server.test.ts [--bundle <path>] [--json <out>]
//
// Exit 0 when every check passes. --bundle runs the same checks against
// another build (the before evidence ran it against the unmodified server).
// Local ports only (8872, 8873); nothing here talks to a production host.
import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  UNRESTRICTED_NERF,
  newGame,
  enableDraftMode,
  playMove,
  legalMoves,
  checkLossConditions,
  activateBuff,
  pickDraftCard,
  bankDraft,
  aiDraftChoice,
  aiChooseBuffActivation,
  type NerfGame,
} from "../../src/engine/game";
import { moveToUCI, positionKey } from "../../src/engine/board";
import { setDraftPoolOverrides } from "../../src/engine/draft";
import { BUFF_POOL_BY_TIER } from "../../src/engine/buffs/library";
import { isRetired } from "../../src/engine/retired";
import { replayToPosition, type EngineMatch, type EngineDraftAction } from "../../src/engine/replay";
import type { Move } from "../../src/engine/types";
import { HOUSE_ROSTER, houseStyle } from "../../src/lib/server/bots";

// This directory is CommonJS (test/package.json), like src/: under tsx an ESM
// test loaded the engine twice, so its setDraftPoolOverrides never reached the
// copy game.ts rolls offers from. The service itself is one esbuild bundle.
const here = dirname(resolve(process.argv[1]));
const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const BUNDLE = resolve(arg("--bundle", join(here, "..", "dist", "server.mjs")));
const JSON_OUT = arg("--json", "");
const TOKEN = "hb3-local-test-token";
const VERSION = 3;
const PORT = 8872;
const BAD_PORT = 8873;
const BASE = `http://127.0.0.1:${PORT}`;

// A Najdorf, English attack: past every repertoire line, so a strong tier
// searches it.
const MIDGAME = "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 c8e6 f2f3 f8e7 d1d2 e8g8".split(" ");

const results: Record<string, { pass: boolean; detail: string }> = {};
function check(name: string, pass: boolean, detail = ""): void {
  results[name] = { pass, detail };
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

function startServer(port: number, env: Record<string, string>): Promise<ChildProcess> {
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, [BUNDLE], {
      env: { ...process.env, PORT: String(port), ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let done = false;
    child.stdout!.on("data", (d: Buffer) => {
      if (!done && d.toString().includes("listening")) {
        done = true;
        ok(child);
      }
    });
    child.stderr!.on("data", (d: Buffer) => process.stderr.write(d));
    child.on("exit", (code) => {
      if (!done) fail(new Error(`server exited ${code}`));
    });
    setTimeout(() => {
      if (!done) fail(new Error("server did not start"));
    }, 10_000);
  });
}

type Reply = { status: number; body: Record<string, unknown> | null };
async function post(body: unknown, opts: { token?: string; raw?: string; base?: string } = {}): Promise<Reply> {
  const send = () =>
    fetch(`${opts.base ?? BASE}/move`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${opts.token ?? TOKEN}` },
      body: opts.raw ?? JSON.stringify(body),
    });
  // One retry: a keep-alive socket the server closed while the test was busy
  // building fixtures fails the first write ("other side closed").
  const res = await send().catch(() => send());
  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

const buffMatch = (moves: string[], seed = 1): EngineMatch => ({
  setup: { whiteNerfId: UNRESTRICTED_NERF.id, blackNerfId: UNRESTRICTED_NERF.id, seed },
  mode: "buff",
  moves,
});

const sameMove = (a: Move, b: Move) =>
  a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null) && (a.via ?? null) === (b.via ?? null);
const isLegalIn = (game: NerfGame, m: unknown): boolean =>
  !!m && typeof m === "object" && legalMoves(game).some((c) => sameMove(c, m as Move));

// ---------------------------------------------------------------------------
// Card overrides fixture: games played locally with 16 cards switched off, the
// way the DO plays a match stamped with moderator overrides.
// ---------------------------------------------------------------------------

function sixteenCardsOff(): string[] {
  const off: string[] = [];
  for (let t = 1; t <= 8; t++) {
    const ids = (BUFF_POOL_BY_TIER[t] ?? [])
      .filter((b) => b.implemented && !isRetired(b.id))
      .map((b) => b.id)
      .sort();
    off.push(...ids.slice(0, 2));
  }
  return off;
}

type Turn = { match: EngineMatch & { cardOverrides: { off: string[] } }; key: string; legal: Move[] };

/** The board plus both hands, the pending offers and the draft RNG, so a
 * replay that rolled different cards counts as diverged even while the
 * pieces still agree. */
function stateKey(g: NerfGame): string {
  const bs = g.buffs;
  const side = (c: "w" | "b") => {
    const ps = bs?.players[c];
    return ps ? { h: ps.buffs.map((b) => b.id), o: ps.offer?.cards.map((x) => x.id) ?? null } : null;
  };
  return positionKey(g.board) + JSON.stringify({ w: side("w"), b: side("b"), r: bs?.rngState ?? null });
}

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 2 ** 32) * max);
  };
}

function overrideGames(games: number, plies: number, off: string[]): Turn[] {
  const turns: Turn[] = [];
  setDraftPoolOverrides({ off });
  try {
    for (let gi = 0; gi < games; gi++) {
      const rnd = lcg(0x5eed + gi * 7919);
      const seed = 1000 + gi;
      const draftSeed = 5000 + gi * 31;
      let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
      enableDraftMode(g, draftSeed, { mode: "buff" });
      const moves: string[] = [];
      const actions: EngineDraftAction[] = [];
      const snapshot = (): Turn["match"] => ({
        setup: { whiteNerfId: UNRESTRICTED_NERF.id, blackNerfId: UNRESTRICTED_NERF.id, seed },
        mode: "buff",
        draft: true,
        draftSeed,
        moves: [...moves],
        draftActions: actions.map((a) => ({ ...a })),
        cardOverrides: { off: [...off] },
      });
      for (let guard = 0; moves.length < plies && guard < plies * 4; guard++) {
        if (g.result || checkLossConditions(g)) break;
        let offered = false;
        for (const c of ["w", "b"] as const) {
          if (!g.buffs?.players[c].offer) continue;
          const choice = aiDraftChoice(g, c);
          if (choice?.action === "pick") {
            pickDraftCard(g, c, choice.index);
            actions.push({ ply: moves.length, color: c, a: "pick", index: choice.index });
          } else {
            bankDraft(g, c);
            actions.push({ ply: moves.length, color: c, a: "bank" });
          }
          offered = true;
          break;
        }
        if (offered) continue;
        const turn = g.board.turn;
        // Every position a bot would be asked to move in.
        turns.push({ match: snapshot(), key: stateKey(g), legal: JSON.parse(JSON.stringify(legalMoves(g))) });
        if (g.buffs && rnd(100) < 25) {
          try {
            const act = aiChooseBuffActivation(g, turn);
            if (act && activateBuff(g, turn, act.buffIndex, act.picks)) {
              actions.push({ ply: moves.length, color: turn, a: "use", buffIndex: act.buffIndex, picks: act.picks });
              turns.pop();
              continue;
            }
          } catch {
            const rebuilt = replayToPosition(snapshot());
            if (!rebuilt) break;
            g = rebuilt;
          }
        }
        const legal = legalMoves(g).filter((m) => m.captured !== "k");
        if (!legal.length) break;
        const m = legal[rnd(legal.length)];
        g = playMove(g, m);
        moves.push(moveToUCI(m));
      }
    }
  } finally {
    setDraftPoolOverrides(null);
  }
  return turns;
}

async function main(): Promise<void> {
  const server = await startServer(PORT, { HOUSE_ENGINE_TOKEN: TOKEN, ENGINE_REPLAY_VERSION: String(VERSION), ENGINE_POOL_SIZE: "2" });
  const bad = await startServer(BAD_PORT, { HOUSE_ENGINE_TOKEN: "", ENGINE_REPLAY_VERSION: String(VERSION) });
  const metrics: Record<string, unknown> = { bundle: BUNDLE };
  try {
    // Health.
    const h1 = await fetch(`${BASE}/healthz`);
    check("healthz 200 when configured", h1.status === 200, `status ${h1.status}`);
    const h2 = await fetch(`http://127.0.0.1:${BAD_PORT}/healthz`);
    check("healthz 503 with an empty token", h2.status === 503, `status ${h2.status}`);

    // A legal move on the fixed record.
    const midGame = replayToPosition(buffMatch(MIDGAME))!;
    const r1 = await post({ match: buffMatch(MIDGAME), skill: 1650, replayVersion: VERSION });
    check("legal move on the fixed record", r1.status === 200 && isLegalIn(midGame, r1.body?.move), `status ${r1.status}`);

    // Auth, version, garbage.
    const r401 = await post({ match: buffMatch(MIDGAME), skill: 1650, replayVersion: VERSION }, { token: "wrong" });
    check("401 on a bad token", r401.status === 401, `status ${r401.status}`);
    const r409 = await post({ match: buffMatch(MIDGAME), skill: 1650, replayVersion: VERSION + 1 });
    check("409 on a version mismatch", r409.status === 409, `status ${r409.status}`);
    const rGarbage = await post(null, { raw: "{not json" });
    const rShape = await post({ match: { setup: 5, moves: "e2e4" }, skill: 1650, replayVersion: VERSION });
    const rSkill = await post({ match: buffMatch(MIDGAME), skill: 1234, replayVersion: VERSION });
    check(
      "400 on garbage (bad JSON, bad match shape, bad skill)",
      rGarbage.status === 400 && rShape.status === 400 && rSkill.status === 400,
      `statuses ${rGarbage.status} / ${rShape.status} / ${rSkill.status}`,
    );

    // scoreCp from a real search (a 1% blunder can skip the search; retry).
    let score: unknown = undefined;
    let hasKey = false;
    for (let i = 0; i < 4 && typeof score !== "number"; i++) {
      const r = await post({ match: buffMatch(MIDGAME), skill: 1650, replayVersion: VERSION });
      hasKey = !!r.body && "scoreCp" in r.body;
      score = r.body?.scoreCp;
    }
    check("scoreCp present on a searched move", hasKey && typeof score === "number", `scoreCp ${String(score)}`);

    // Unknown fields ignored (top level and inside the match).
    const rExtra = await post({
      match: { ...buffMatch(MIDGAME), extra: { a: 1 } },
      skill: 1650,
      replayVersion: VERSION,
      futureField: [1, 2, 3],
      persona: "not-a-real-persona",
      incrementSec: 2,
      deadlineMs: 2000,
    });
    check("unknown fields and an unknown persona ignored", rExtra.status === 200 && isLegalIn(midGame, rExtra.body?.move), `status ${rExtra.status}`);

    // Persona honored: its pet opening at ply 0.
    const start = replayToPosition(buffMatch([]))!;
    const noPersona = await post({ match: buffMatch([], 7), skill: 1650, replayVersion: VERSION });
    const noPersonaUci = noPersona.body?.move ? moveToUCI(noPersona.body.move as Move) : "";
    const persona = HOUSE_ROSTER.find(
      (p) => p.skill === 1650 && houseStyle(p).openingWhite && houseStyle(p).openingWhite !== noPersonaUci &&
        legalMoves(start).some((m) => moveToUCI(m) === houseStyle(p).openingWhite),
    );
    let petHits = 0;
    const PET_N = 20;
    if (persona) {
      for (let i = 0; i < PET_N; i++) {
        const r = await post({ match: buffMatch([], 100 + i), skill: persona.skill, persona: persona.userId, replayVersion: VERSION });
        if (r.body?.move && moveToUCI(r.body.move as Move) === houseStyle(persona).openingWhite) petHits++;
      }
    }
    check(
      "persona honored (pet opening at ply 0 in 10 or more of 20)",
      !!persona && petHits >= 10,
      `${persona?.name ?? "no persona found"} pet ${persona ? houseStyle(persona).openingWhite : "-"}: ${petHits}/${PET_N}`,
    );
    metrics.persona = { name: persona?.name, pet: persona ? houseStyle(persona).openingWhite : null, hits: petHits, n: PET_N };

    // Variety with no persona: 20 match seeds at 1650, 8 plies each.
    const firsts = new Set<string>();
    const lines = new Set<string>();
    for (let s = 0; s < 20; s++) {
      const moves: string[] = [];
      for (let ply = 0; ply < 8; ply++) {
        const r = await post({ match: buffMatch(moves, 20_000 + s * 7919), skill: 1650, replayVersion: VERSION });
        if (!r.body?.move) break;
        moves.push(moveToUCI(r.body.move as Move));
      }
      firsts.add(moves[0] ?? "");
      lines.add(moves.join(" "));
    }
    check("variety with no persona: 8 or more distinct 8-ply lines over 20 seeds at 1650", lines.size >= 8, `${lines.size} lines, ${firsts.size} first moves (${[...firsts].join(" ")})`);
    metrics.variety = { seeds: 20, plies: 8, distinctLines: lines.size, distinctFirstMoves: firsts.size, firstMoves: [...firsts] };

    // Card overrides: 16 cards off.
    const off = sixteenCardsOff();
    const turns = overrideGames(8, 80, off);
    // What the old service did: replay with no overrides installed.
    let divergedPlain = 0;
    let unreplayablePlain = 0;
    for (const t of turns) {
      const plain = replayToPosition(t.match);
      if (!plain) unreplayablePlain++;
      else if (stateKey(plain) !== t.key) divergedPlain++;
    }
    let nullMoves = 0;
    let illegal = 0;
    let non200 = 0;
    for (const t of turns) {
      const r = await post({ match: t.match, skill: 800, replayVersion: VERSION });
      if (r.status !== 200) non200++;
      else if (!r.body?.move) nullMoves++;
      else if (!t.legal.some((c) => sameMove(c, r.body!.move as Move))) illegal++;
    }
    check(
      "overrides: the service replays 16-cards-off matches identically to the local engine",
      turns.length >= 300 && divergedPlain + unreplayablePlain > 0 && nullMoves === 0 && illegal === 0 && non200 === 0,
      `${turns.length} turns over 8 games; a replay without the overrides diverges on ${divergedPlain} and cannot replay ${unreplayablePlain}; ` +
        `service answers: ${nullMoves} null, ${illegal} illegal, ${non200} non-200`,
    );
    metrics.overrides = { cardsOff: off.length, turns: turns.length, divergedWithoutOverrides: divergedPlain, unreplayableWithoutOverrides: unreplayablePlain, nullMoves, illegal, non200 };
  } finally {
    server.kill("SIGTERM");
    bad.kill("SIGTERM");
  }
  const failed = Object.entries(results).filter(([, v]) => !v.pass);
  console.log(failed.length ? `\nRESULT: FAIL (${failed.length} of ${Object.keys(results).length})` : `\nRESULT: PASS (${Object.keys(results).length} checks)`);
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ results, metrics }, null, 2) + "\n");
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
