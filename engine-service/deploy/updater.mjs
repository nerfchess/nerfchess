// nerfchess engine self-updater (webhook target).
//
// The game-server Worker pings POST /update {replayVersion} when the engine
// answers 409 (version drift, e.g. after a worker deploy), and
// nerfchess-autoupdate.timer pings it every 15 min at the applied version to
// heal silent same-version drift (see docs/tokyo-box-self-update.md). This
// service then rebuilds the engine AND arena bundles from origin/master via
// update.sh and applies them through the root-owned nerfchess-engine-apply.
// Runs as ubuntu on 127.0.0.1 only; the Cloudflare tunnel routes
// engine.nerfchess.com/update here.
//
// GET  /update -> last/current run status (same bearer token).
// POST /update {replayVersion:int} -> 202 started | 200 cooldown | 202 already_running.
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const TOKEN = process.env.UPDATER_TOKEN ?? "";
const PORT = Number(process.env.PORT ?? "8788");
const SCRIPT = process.env.UPDATE_SCRIPT ?? "/opt/nerfchess-engine/update.sh";
// Don't rebuild in a tight loop when origin/master doesn't have the requested
// version yet (the worker was deployed from unpushed code): one attempt per
// version per cooldown window.
const COOLDOWN_MS = 5 * 60_000;

let current = null; // { version, startedAt } while a run is in flight
let last = null;    // { version, startedAt, endedAt, ok, code, tail }

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > limit) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const send = (code, obj) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  try {
    if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) {
      return send(401, { error: "unauthorized" });
    }
    if (req.method === "GET" && req.url === "/update") {
      return send(200, { running: !!current, current, last });
    }
    if (req.method !== "POST" || req.url !== "/update") {
      return send(404, { error: "not_found" });
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return send(400, { error: "bad_json" });
    }
    const version = body?.replayVersion;
    if (!Number.isInteger(version) || version < 1 || version > 10_000) {
      return send(400, { error: "bad_version" });
    }
    if (current) return send(202, { status: "already_running", current });
    if (last && last.version === version && Date.now() - last.endedAt < COOLDOWN_MS) {
      return send(200, { status: "cooldown", last });
    }

    current = { version, startedAt: Date.now() };
    const run = current;
    const chunks = [];
    const child = spawn("/usr/bin/bash", [SCRIPT, String(version)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const grab = (s) =>
      s.on("data", (d) => {
        chunks.push(d);
        if (chunks.length > 400) chunks.shift();
      });
    grab(child.stdout);
    grab(child.stderr);
    child.on("close", (code) => {
      const tail = Buffer.concat(chunks).toString().split("\n").slice(-25).join("\n");
      last = { version, startedAt: run.startedAt, endedAt: Date.now(), ok: code === 0, code, tail };
      current = null;
      console.log(`update to v${version} finished code=${code}\n${tail}`);
    });
    child.on("error", (err) => {
      last = { version, startedAt: run.startedAt, endedAt: Date.now(), ok: false, code: -1, tail: String(err) };
      current = null;
      console.error(`update to v${version} failed to spawn: ${err}`);
    });
    return send(202, { status: "started", version });
  } catch (err) {
    return send(500, { error: String(err) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`nerfchess-engine-updater listening on 127.0.0.1:${PORT}`);
});
