// Tier 2 · M3 integration test, the arena's spectator protocol against a mock
// DO. Boots a mock DO that picks ONE live arena game to "watch", then spawns the
// real arena bundle pointed at it and asserts the wire contract:
//
//   arena --/arena/games--> DO replies { enabled, watch:[id] }
//   arena --/arena/frame(snapshot)--> once the watched game has started
//   arena --/arena/frame(move|draft)--> streamed only while watched, snapshot-first
//   arena --/arena/end--> on finish (round-trip-valid records only)
//
// PASS: a snapshot bootstraps before any move, moves stream for the watched id
// only (unwatched games stay silent), records round-trip, and an end is reported.
//
// Run:  node build.mjs && node test/m3-spectate.mjs   (from arena-service/)
// Env:  ITEST_BUNDLE (default dist/server.mjs), ITEST_WINDOW_MS, ITEST_DO_PORT, ITEST_ARENA_PORT
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = "itest-ingest-token";
// Local ports in the polish range (8790-8899). The arena used to bind 8788,
// the production arena's own port, which collides on a box running both.
const PORT = Number(process.env.ITEST_DO_PORT ?? "8899");
const ARENA_PORT = process.env.ITEST_ARENA_PORT ?? "8898";
// The run ends as soon as every check holds, or fails at this deadline. A
// fixed 25s window failed on a loaded box before any game finished.
const WINDOW_MS = Number(process.env.ITEST_WINDOW_MS ?? "90000");

const frames = [];
const ends = [];
let watched = null;
let syncCount = 0;

const server = createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  const auth = req.headers.authorization === `Bearer ${TOKEN}`;
  const json = (o) => { res.writeHead(auth ? 200 : 401, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
  const data = body ? JSON.parse(body) : {};

  if (req.url === "/arena/games") {
    syncCount++;
    if (!watched) {
      const started = (data.games || []).find((g) => g.moves >= 1); // moves>=1 => past the nerf draft
      if (started) watched = started.id;
    }
    return json({ enabled: true, lobby: true, watch: watched ? [watched] : [] });
  }
  if (req.url === "/arena/frame") {
    if (data.frame) frames.push({ kind: data.frame.kind, id: data.frame.id });
    return json({ ok: true });
  }
  if (req.url === "/arena/end") {
    if (data.record) ends.push(data.record.id);
    return json({ ok: true });
  }
  json({ ok: true });
});

server.listen(PORT, () => {
  // ITEST_BUNDLE runs another build (the before evidence used the unmodified one).
  const arena = spawn(process.execPath, [process.env.ITEST_BUNDLE ?? "dist/server.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      ARENA_TOKEN: "itest-local",
      ARENA_INGEST_TOKEN: TOKEN,
      ARENA_DO_URL: `http://127.0.0.1:${PORT}`,
      ARENA_REPLAY_VERSION: "3",
      ARENA_MAX_GAMES: "3",
      ARENA_ENABLED: "true",
      ARENA_SYNC_MS: "500",
      ARENA_FAST_MS: "8",
      PORT: ARENA_PORT,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let gameEnds = 0, replayMismatch = 0, buf = "";
  arena.stdout.on("data", (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (line.includes('"game_end"')) gameEnds++;
      if (line.includes("REPLAY_MISMATCH")) replayMismatch++;
    }
  });
  arena.stderr.on("data", (d) => process.stderr.write(d));

  const evaluate = () => {
    const wf = frames.filter((f) => f.id === watched);
    const stray = frames.filter((f) => f.id !== watched);
    const snapIdx = wf.findIndex((f) => f.kind === "snapshot");
    const firstMoveIdx = wf.findIndex((f) => f.kind === "move");
    const moves = wf.filter((f) => f.kind === "move").length;
    const checks = {
      "sync happened": syncCount >= 2,
      "a game was watched": !!watched,
      "snapshot received for watched game": snapIdx >= 0,
      "snapshot precedes first move": snapIdx >= 0 && (firstMoveIdx < 0 || snapIdx < firstMoveIdx),
      "move frames streamed": moves >= 1,
      "no frames for unwatched games": stray.length === 0,
      "every finished game round-tripped": replayMismatch === 0,
      "a finished game was reported to DO": ends.length >= 1,
    };
    return { checks, wf, stray, moves };
  };
  const started = Date.now();
  let arenaExit = null;
  arena.on("exit", (code, sig) => { arenaExit = { code, sig }; });
  const finish = () => {
    clearInterval(poll);
    const early = arenaExit;
    // Wait for the arena to be gone before exiting, so a back-to-back run
    // never finds its port still bound (that failed 1 run in 10 with no sync).
    const killer = setTimeout(() => arena.kill("SIGKILL"), 3000);
    arena.kill("SIGTERM");
    server.close();
    const { checks, wf, stray, moves } = evaluate();
    console.log(JSON.stringify({ watched, syncCount, moves, drafts: wf.filter((f) => f.kind === "draft").length, stray: stray.length, endsReported: ends.length, gameEndsLogged: gameEnds, replayMismatch, seconds: Math.round((Date.now() - started) / 1000) }, null, 2));
    let ok = true;
    for (const [k, v] of Object.entries(checks)) { console.log(`${v ? "PASS" : "FAIL"}  ${k}`); if (!v) ok = false; }
    if (early) console.log(`arena exited early: ${JSON.stringify(early)}`);
    console.log(ok ? "\nRESULT: PASS" : "\nRESULT: FAIL");
    const done = () => { clearTimeout(killer); process.exit(ok ? 0 : 1); };
    if (arenaExit || arena.exitCode != null) done();
    else arena.once("exit", done);
  };
  const poll = setInterval(() => {
    const { checks } = evaluate();
    if (arenaExit || Object.values(checks).every(Boolean) || Date.now() - started >= WINDOW_MS) finish();
  }, 500);
});
