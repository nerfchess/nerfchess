// nerfchess arena service (Tier 2 · M1).
//
// Runs bot-vs-bot games in RAM on the OCI box and exposes a small local
// observability surface. Isolated: no DO, no D1/PG, no lobby/TV, no rating
// writes. See docs/bot-offload-tier2-m1-arena-service.md.
//
// Build:  node build.mjs   ->  dist/server.mjs
// Run:    node dist/server.mjs   (env from /etc/nerfchess-arena.env)
import { createServer } from "node:http";
import { loadConfig } from "./config";
import { CompositeSink, IngestSink, LogSink } from "./sink";
import { IngestClient } from "./ingest";
import { Arena } from "./arena";

const config = loadConfig();
const logSink = new LogSink(config.verboseMoves);

// M2: when the DO is configured, forward finished games to it (archive + rating)
// and let it gate spawning. Otherwise stay in M1 mode (isolated, logs only).
const ingest = config.doUrl && config.ingestToken ? new IngestClient(config.doUrl, config.ingestToken) : null;
const sink = ingest ? new CompositeSink([logSink, new IngestSink(ingest)]) : logSink;
const arena = new Arena(config, sink, ingest);
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

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event: "arena_listen", port: config.port }));
});

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    arena.stop();
    server.close(() => process.exit(0));
  });
}
