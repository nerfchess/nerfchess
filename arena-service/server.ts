// nerfchess arena service (Tier 2 · M1).
//
// Runs bot-vs-bot games in RAM on the OCI box and exposes a small local
// observability surface. Isolated: no DO, no D1/PG, no lobby/TV, no rating
// writes. See docs/bot-offload-tier2-m1-arena-service.md.
//
// Build:  node build.mjs   ->  dist/server.mjs
// Run:    node dist/server.mjs   (env from /etc/nerfchess-arena.env)
import { createServer } from "node:http";
import { housePersona } from "../src/lib/server/bots";
import { loadConfig } from "./config";
import { CompositeSink, IngestSink, LogSink, type ArenaSink } from "./sink";
import { IngestClient } from "./ingest";
import { Arena } from "./arena";
import { SpectatorHub } from "./spectate";

const config = loadConfig();
const logSink = new LogSink(config.verboseMoves);

// M2: when the DO is configured, forward finished games to it (archive + rating)
// and let it gate spawning. Otherwise stay in M1 mode (isolated, logs only).
// Tier 3: ARENA_END_URL alone (no DO) is enough for archive + rating via the
// Worker route (see docs/bot-offload-tier3-direct-arena.md).
const ingest =
  (config.doUrl || config.endUrl) && config.ingestToken
    ? new IngestClient(config.doUrl, config.ingestToken, config.endUrl)
    : null;
// The sink list is shared by reference so the spectator hub (which needs the
// arena, which needs the sink) can join after construction.
const sinks: ArenaSink[] = ingest ? [logSink, new IngestSink(ingest)] : [logSink];
const sink = new CompositeSink(sinks);
const arena = new Arena(config, sink, ingest);
// Tier 3 / M3: direct spectator WebSocket — game events fan out to local
// sockets instead of relaying through the DO.
const hub = new SpectatorHub(arena, config.publicOrigins);
sinks.push(hub);
arena.watcherCountFn = (id) => hub.count(id);
arena.start();

// eslint-disable-next-line no-console
console.log(
  JSON.stringify({
    event: "arena_start",
    port: config.port,
    maxGames: config.maxGames,
    replayVersion: config.replayVersion,
    enabled: config.enabled,
    ingest: !!ingest,
    doUrl: config.doUrl || null,
  }),
);

function authed(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  return !!config.token && req.headers.authorization === `Bearer ${config.token}`;
}

// Tier 3 / M2: public lobby snapshot for the site's client-side merge (see
// docs/bot-offload-tier3-direct-arena.md §B). Cached briefly so N polling
// clients cost one serialization; each hit also marks human presence, which is
// what gates filler spawning once the DO sync is retired.
const LOBBY_CACHE_MS = 2000;
let lobbyCache: { at: number; body: string } | null = null;
function lobbyBody(): string {
  const now = Date.now();
  if (lobbyCache && now - lobbyCache.at < LOBBY_CACHE_MS) return lobbyCache.body;
  const games = arena.liveMeta().map((g) => ({
    ...g,
    // Avatars ride along so the site client needs no house-roster import.
    seats: {
      w: { ...g.seats.w, avatar: housePersona(g.seats.w.userId)?.avatar ?? null },
      b: { ...g.seats.b, avatar: housePersona(g.seats.b.userId)?.avatar ?? null },
    },
    watchers: arena.watcherCount(g.id),
  }));
  const body = JSON.stringify({ games, at: now });
  lobbyCache = { at: now, body };
  return body;
}

// Browser origins allowed to read the public endpoints. Same-origin tools
// (curl, monitors) send no Origin header and are served without CORS grants.
function corsOrigin(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const origin = req.headers.origin;
  if (typeof origin === "string" && config.publicOrigins.includes(origin)) return origin;
  return null;
}

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const json = (code: number, body: unknown) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  // /healthz is open; everything else needs the bearer token.
  if (req.method === "GET" && url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  // Public lobby snapshot (Tier 3 / M2): open like /healthz, CORS-gated to the
  // site origins, and counted as human presence for the spawn gate.
  if (req.method === "GET" && url.startsWith("/lobby")) {
    arena.notePresence();
    const origin = corsOrigin(req);
    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...(origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
    });
    res.end(lobbyBody());
    return;
  }
  if (!authed(req)) {
    res.writeHead(401);
    res.end("unauthorized");
    return;
  }

  if (req.method === "GET" && url === "/stats") {
    return json(200, {
      live: arena.liveCount(),
      enabled: arena.enabled,
      maxGames: config.maxGames,
      ingest: !!ingest,
      ...logSink.stats(),
    });
  }
  if (req.method === "GET" && url === "/games") {
    return json(200, arena.liveGames());
  }
  if (req.method === "GET" && url.startsWith("/finished")) {
    const limit = Number(new URL(url, "http://x").searchParams.get("limit") ?? "20");
    return json(200, logSink.recent.slice(0, Math.max(1, Math.min(50, limit))));
  }
  if (req.method === "POST" && url === "/pause") {
    arena.setEnabled(false);
    return json(200, { enabled: false });
  }
  if (req.method === "POST" && url === "/resume") {
    arena.setEnabled(true);
    return json(200, { enabled: true });
  }
  res.writeHead(404);
  res.end("not found");
});

hub.attach(server);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event: "arena_listen", port: config.port }));
});

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    arena.stop();
    hub.stop();
    server.close(() => process.exit(0));
  });
}
