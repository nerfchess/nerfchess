// nerfchess house-bot engine service (Tier 1).
//
// Runs on the OCI box. Given a stored-match subset, it replays the position
// with the bundled engine and returns a house move — moving the (unbounded,
// CPU-heavy) engine search off the single-threaded game-server Durable Object.
// See docs/bot-offload-tier1-engine-service.md.
//
// Stateless. No DB. The only trust it grants is the shared bearer token.
// Build:  node build.mjs   ->  dist/server.mjs
// Run:    node dist/server.mjs   (env from /etc/nerfchess-engine.env)

import { createServer, type IncomingMessage } from "node:http";
import { replayToPosition, type EngineMatch } from "../src/engine/replay";
import { pickHouseMove, type HouseSkill } from "../src/lib/server/bots";

const TOKEN = process.env.HOUSE_ENGINE_TOKEN ?? "";
const REPLAY_VERSION = Number(process.env.ENGINE_REPLAY_VERSION ?? "0");
const PORT = Number(process.env.PORT ?? "8787");
const VALID_SKILLS = new Set<HouseSkill>([1200, 1400, 1600, 1750]);

// The blunder branch inside pickHouseMove is nondeterministic by design, so a
// local RNG is correct here — only the replayed BOARD must match the DO's, and
// that is guaranteed by the shared engine + the REPLAY_VERSION guard below.
const randomInt = (max: number) => Math.floor(Math.random() * max);

interface MoveRequest {
  match: EngineMatch;
  skill: HouseSkill;
  remainingClockMs?: number;
  replayVersion: number;
}

function readBody(req: IncomingMessage, limit = 2_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }
    if (req.method !== "POST" || req.url !== "/move") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.writeHead(401);
      res.end("unauthorized");
      return;
    }

    const body = JSON.parse(await readBody(req)) as MoveRequest;

    // Version guard: if this box's engine is out of lockstep with the Worker's
    // REPLAY_VERSION, refuse rather than risk a desynced replay. The DO reads
    // 409 as "fall back to local".
    if (body.replayVersion !== REPLAY_VERSION) {
      res.writeHead(409, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "replay_version", expected: REPLAY_VERSION }));
      return;
    }
    if (!VALID_SKILLS.has(body.skill)) {
      res.writeHead(400);
      res.end("bad skill");
      return;
    }

    const game = replayToPosition(body.match);
    const move = game ? pickHouseMove(game, body.skill, randomInt, body.remainingClockMs) : null;

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ move }));
  } catch (err) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "bad_request", message: String(err) }));
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`nerfchess-engine listening on :${PORT} (REPLAY_VERSION=${REPLAY_VERSION})`);
});
