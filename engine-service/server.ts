// nerfchess house-bot engine service (Tier 1).
//
// Runs on the OCI box. Given a stored-match subset, it replays the position
// with the bundled engine and returns a house move, moving the (CPU-heavy)
// engine search off the single-threaded game-server Durable Object.
// See docs/bot-offload-tier1-engine-service.md.
//
// Stateless. No DB. The only trust it grants is the shared bearer token.
// Build:  node build.mjs   ->  dist/server.mjs
// Run:    node dist/server.mjs   (env from /etc/nerfchess-engine.env)
//
// The one bundle is both the HTTP front (main thread) and the search threads
// (searchPool.ts starts this same file as each worker), so the deploy stays a
// single file.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isMainThread, parentPort } from "node:worker_threads";
import { parseMoveBody, runSearch, type SearchTask } from "./search";
import { SearchPool } from "./searchPool";

/** Default request deadline, measured from arrival, for a worker that sends
 * none: the old worker waits 3000ms, and about 600ms of that is the round
 * trip through the tunnel. */
const DEFAULT_DEADLINE_MS = 2400;
/** A caller's deadline is clamped to this range. */
const MAX_DEADLINE_MS = 5000;

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

function main(): void {
  const TOKEN = process.env.HOUSE_ENGINE_TOKEN ?? "";
  const REPLAY_VERSION = Number(process.env.ENGINE_REPLAY_VERSION ?? "0");
  const PORT = Number(process.env.PORT ?? "8787");
  // Search threads. Default 2 leaves the rest of the box's cores to the arena
  // service that shares it.
  const POOL_SIZE = Math.max(1, Math.min(16, Math.floor(Number(process.env.ENGINE_POOL_SIZE ?? "2")) || 2));
  const QUEUE_LIMIT = 2 * POOL_SIZE;
  // Misconfigured: every /move would 401 (no token) or 409 (no version), and
  // the worker would silently fall back to local compute forever. /healthz
  // says so, so the apply script's health check and any monitor see it.
  const configured = TOKEN.length > 0 && Number.isInteger(REPLAY_VERSION) && REPLAY_VERSION > 0;

  const pool = new SearchPool({ size: POOL_SIZE, queueLimit: QUEUE_LIMIT, workerUrl: new URL(import.meta.url) });

  const json = (res: ServerResponse, code: number, body: unknown) => {
    if (res.headersSent || res.destroyed) return;
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const authed = (req: IncomingMessage) => !!TOKEN && req.headers.authorization === `Bearer ${TOKEN}`;

  const server = createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/healthz") {
        res.writeHead(configured ? 200 : 503, { "content-type": "text/plain" });
        res.end(configured ? "ok" : "misconfigured");
        return;
      }
      // Pool counters for the operator; behind the token like /move.
      if (req.method === "GET" && req.url === "/stats") {
        if (!authed(req)) {
          res.writeHead(401);
          res.end("unauthorized");
          return;
        }
        json(res, 200, { poolSize: pool.size, queueLimit: QUEUE_LIMIT, busy: pool.busy, queued: pool.queued, ...pool.counters });
        return;
      }
      if (req.method !== "POST" || req.url !== "/move") {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      if (!authed(req)) {
        res.writeHead(401);
        res.end("unauthorized");
        return;
      }

      let raw: unknown;
      try {
        raw = JSON.parse(await readBody(req));
      } catch (err) {
        json(res, 400, { error: "bad_request", message: String(err) });
        return;
      }
      const parsed = parseMoveBody(raw);
      // Version guard first: if this box's engine is out of lockstep with the
      // Worker's REPLAY_VERSION, refuse rather than risk a desynced replay. The
      // DO reads 409 as "fall back to local" and pings the self-updater.
      const version = parsed.ok ? parsed.replayVersion : (raw as { replayVersion?: unknown } | null)?.replayVersion;
      if (version !== REPLAY_VERSION) {
        json(res, 409, { error: "replay_version", expected: REPLAY_VERSION });
        return;
      }
      if (!parsed.ok) {
        json(res, 400, { error: "bad_request", message: parsed.error });
        return;
      }

      // The client hanging up (the worker's own timeout firing) drops the
      // request if it is still queued, so nobody searches for an answer no
      // one will read.
      const ctl = new AbortController();
      res.on("close", () => {
        if (!res.writableFinished) ctl.abort();
      });
      const deadlineMs = Math.max(1, Math.min(MAX_DEADLINE_MS, parsed.deadlineMs ?? DEFAULT_DEADLINE_MS));
      const outcome = await pool.submit(parsed.task, deadlineMs, ctl.signal);
      switch (outcome.kind) {
        case "done":
          json(res, 200, outcome.result);
          return;
        case "full":
          // Busy: the worker falls back to its local search at once.
          res.setHeader("retry-after", "1");
          json(res, 503, { error: "busy" });
          return;
        case "expired":
          json(res, 503, { error: "deadline" });
          return;
        case "aborted":
          return;
        case "error":
          json(res, 500, { error: "search_failed" });
          return;
      }
    } catch (err) {
      json(res, 500, { error: "internal", message: String(err) });
    }
  });

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `nerfchess-engine listening on :${PORT} (REPLAY_VERSION=${REPLAY_VERSION}, pool=${POOL_SIZE}, queue=${QUEUE_LIMIT}${configured ? "" : ", MISCONFIGURED"})`,
    );
  });

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => {
      server.close();
      void pool.close().finally(() => process.exit(0));
    });
  }
}

// A search thread: one task at a time, answered by id.
function thread(): void {
  parentPort!.on("message", (msg: { id: number; task: SearchTask }) => {
    try {
      parentPort!.postMessage({ id: msg.id, result: runSearch(msg.task) });
    } catch (err) {
      parentPort!.postMessage({ id: msg.id, error: String(err) });
    }
  });
}

if (isMainThread) main();
else thread();
