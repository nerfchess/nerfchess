// ---------------------------------------------------------------------------
// API fuzz and regression checks for slice F (brief sections 7 and 14).
//
//   ./node_modules/.bin/tsx scripts/polish/api-fuzz.ts [--out FILE] [--only a,b] [--keep]
//
// Talks to the shared dev server (POLISH_BASE, default http://localhost:3000).
// Uses its own accounts (polish_fuzz_a, polish_fuzz_b, polish_fuzz_m which is
// muted) so nothing it writes lands on the accounts other slices screenshot,
// and deletes every row those accounts created when it finishes (unless
// --keep). Local D1 only: it refuses to run against anything but localhost.
//
// Two layers:
//   1. Regression checks, one per ledger finding, each asserting the fixed
//      behaviour (these fail on the code before the fix).
//   2. A bad-input matrix over every mutating route slice F owns and a set of
//      hostile GETs: null, arrays, scalars, broken JSON, 200 KB bodies, type
//      confusion, 10k-character strings, zero-width, RTL override, HTML.
//      Every response must be a 4xx or 2xx, never a 5xx.
//
// Output: a JSON report (default e2e/__screens__/polish/api-fuzz-latest.json)
// and exit code 1 when any check fails.
// ---------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import path from "node:path";
import { BASE, ROOT, SCRATCH_DIR, parseArgs, argStr, waitForServer, writeJson, rel } from "./lib/common";

const PASSWORD = process.env.POLISH_SEED_PASSWORD || "polish-local-only-7";
const EVIL_ORIGIN = "https://evil.example";

type Result = { id: string; finding?: string; ok: boolean; detail: string };
const results: Result[] = [];
let matrixCount = 0;
let matrix5xx: { case: string; status: number }[] = [];

function assertLocal() {
  const host = new URL(BASE).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`refusing to fuzz ${BASE}: api-fuzz.ts only touches the local dev server`);
  }
}

// ---------- local D1 ----------

function d1(sql: string): Record<string, unknown>[] {
  // The dev server holds the same sqlite file; a write that lands while it is
  // mid-transaction fails with "database is locked", so retry a few times.
  let out = "";
  for (let attempt = 0; ; attempt++) {
    try {
      out = execFileSync(
        path.join(ROOT, "node_modules", ".bin", "wrangler"),
        ["d1", "execute", "nerfchess", "--local", "--json", "--command", sql],
        { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
      ).toString();
      break;
    } catch (err) {
      if (attempt >= 5) throw err;
      execFileSync("sleep", [String(2 * (attempt + 1))]);
    }
  }
  try {
    const parsed = JSON.parse(out) as { results?: Record<string, unknown>[] }[];
    return parsed[parsed.length - 1]?.results ?? [];
  } catch {
    return [];
  }
}

// ---------- HTTP ----------

type CallOpts = {
  token?: string;
  body?: unknown; // JSON-encoded unless raw is set
  raw?: string;
  headers?: Record<string, string>;
  origin?: string | null; // null = send no Origin header
};

type Reply = { status: number; json: Record<string, unknown> | null; text: string; headers: Headers };

async function call(method: string, pathname: string, opts: CallOpts = {}): Promise<Reply> {
  const headers: Record<string, string> = {};
  if (opts.origin !== null) headers.origin = opts.origin ?? BASE;
  if (opts.token) headers.cookie = `dc_session=${opts.token}`;
  let body: string | undefined;
  if (opts.raw !== undefined) {
    body = opts.raw;
    headers["content-type"] = "application/json";
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["content-type"] = "application/json";
  }
  Object.assign(headers, opts.headers ?? {});
  // The shared dev server recompiles (and sometimes restarts) under other
  // agents' edits; a dropped socket is retried rather than read as a result.
  let res: Response | null = null;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(BASE + pathname, { method, headers, body, signal: AbortSignal.timeout(90_000) });
      break;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

function record(id: string, finding: string | undefined, ok: boolean, detail: string) {
  results.push({ id, finding, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"} ${finding ? `[${finding}] ` : ""}${id}: ${detail}`);
}

function tokenFrom(res: Response): string | null {
  const raw = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  for (const c of raw) {
    const m = /(?:^|,\s*)dc_session=([0-9a-f]{64})/.exec(c);
    if (m) return m[1];
  }
  return null;
}

async function account(username: string): Promise<{ token: string; id: string }> {
  const post = (p: string) =>
    fetch(BASE + p, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify({ username, password: PASSWORD }),
    });
  let res = await post("/api/auth/register");
  if (res.status === 409) res = await post("/api/auth/login");
  if (!res.ok) throw new Error(`${username}: ${res.status} ${await res.text()}`);
  const token = tokenFrom(res);
  if (!token) throw new Error(`${username}: no session cookie`);
  const rows = d1(`SELECT id FROM users WHERE username_lower = '${username.toLowerCase()}'`);
  return { token, id: String(rows[0]?.id) };
}

// ---------- fixtures ----------

type Ctx = {
  a: { token: string; id: string; name: string };
  b: { token: string; id: string; name: string };
  m: { token: string; id: string; name: string };
  clubSlug?: string;
  tournamentId?: string;
};

function resetFuzzState(ids: string[]) {
  const list = ids.map((id) => `'${id}'`).join(",");
  d1(
    [
      `DELETE FROM messages WHERE from_user_id IN (${list}) OR to_user_id IN (${list})`,
      `DELETE FROM notifications WHERE user_id IN (${list})`,
      `DELETE FROM friendships WHERE user_lo IN (${list}) OR user_hi IN (${list})`,
      `DELETE FROM challenges WHERE from_user_id IN (${list}) OR to_user_id IN (${list})`,
      `DELETE FROM reports WHERE reporter_user_id IN (${list})`,
      `DELETE FROM rule_suggestions WHERE user_id IN (${list}) OR name LIKE 'fuzz%' OR description LIKE '%fuzz-anon%'`,
      `DELETE FROM buff_feedback WHERE user_id IN (${list})`,
      `DELETE FROM nerf_feedback WHERE user_id IN (${list})`,
      // Tournaments first: a club tournament references its club.
      `DELETE FROM tournament_games WHERE tournament_id IN (SELECT id FROM tournaments WHERE creator_user_id IN (${list}))`,
      `DELETE FROM tournament_entries WHERE tournament_id IN (SELECT id FROM tournaments WHERE creator_user_id IN (${list}))`,
      `DELETE FROM tournament_entries WHERE user_id IN (${list})`,
      `DELETE FROM tournaments WHERE creator_user_id IN (${list})`,
      `DELETE FROM club_posts WHERE user_id IN (${list})`,
      `DELETE FROM club_posts WHERE club_id IN (SELECT id FROM clubs WHERE owner_user_id IN (${list}))`,
      `DELETE FROM club_members WHERE club_id IN (SELECT id FROM clubs WHERE owner_user_id IN (${list}))`,
      `DELETE FROM club_members WHERE user_id IN (${list})`,
      `DELETE FROM clubs WHERE owner_user_id IN (${list})`,
      `DELETE FROM games WHERE id LIKE 'FZ%'`,
      `UPDATE user_ratings SET games = 0 WHERE user_id IN (${list})`,
      `DELETE FROM login_attempts WHERE key LIKE 'rl:%'`,
    ].join("; "),
  );
}

// ---------- regression checks ----------

async function regressions(ctx: Ctx) {
  const { a, b, m } = ctx;

  // F047: a JSON body of null used to throw inside ~32 handlers.
  for (const [method, p] of [
    ["POST", "/api/friends"],
    ["POST", `/api/messages/${b.name}`],
    ["POST", "/api/notifications"],
    ["POST", "/api/report"],
    ["POST", "/api/suggest"],
    ["POST", "/api/challenges"],
    ["POST", "/api/clubs"],
    ["POST", "/api/tournaments"],
    ["POST", "/api/buff-feedback"],
    ["POST", "/api/nerf-feedback"],
    ["PUT", "/api/users/settings"],
    ["POST", "/api/users/settings"],
    ["POST", "/api/desync"],
    ["POST", "/api/tv-telemetry"],
  ] as const) {
    const r = await call(method, p, { token: a.token, raw: "null" });
    record(`null body ${method} ${p}`, "F047", r.status === 400, `status ${r.status}`);
  }

  // F046: cross-site writes are refused; text/plain bodies are refused.
  {
    const r1 = await call("POST", "/api/friends", { token: a.token, body: { action: "request", username: b.name }, origin: EVIL_ORIGIN });
    record("cross-site Origin refused", "F046", r1.status === 403, `status ${r1.status}`);
    const r2 = await call("POST", "/api/friends", {
      token: a.token,
      body: { action: "request", username: b.name },
      origin: null,
      headers: { "sec-fetch-site": "cross-site" },
    });
    record("Sec-Fetch-Site cross-site refused", "F046", r2.status === 403, `status ${r2.status}`);
    const r3 = await call("POST", "/api/friends", {
      token: a.token,
      raw: JSON.stringify({ action: "request", username: b.name }),
      headers: { "content-type": "text/plain" },
    });
    record("text/plain body refused", "F046", r3.status === 415, `status ${r3.status}`);
    const r4 = await call("POST", `/api/messages/${b.name}`, { token: a.token, body: { text: "fuzz csrf" }, origin: "null" });
    record("Origin null refused", "F046", r4.status === 403, `status ${r4.status}`);
    const r5 = await call("POST", "/api/games/bot", { token: a.token, origin: EVIL_ORIGIN });
    record("cross-site bodiless POST refused", "F046", r5.status === 403, `status ${r5.status}`);
    d1(`DELETE FROM friendships WHERE user_lo IN ('${a.id}','${b.id}') AND user_hi IN ('${a.id}','${b.id}'); DELETE FROM notifications WHERE user_id IN ('${a.id}','${b.id}')`);
  }

  // F072: the thread returns the NEWEST 200, oldest first.
  {
    d1(
      `INSERT INTO messages (id, from_user_id, to_user_id, text, created_at, read)
       WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 204)
       SELECT 'fuzzmsg-' || i, '${b.id}', '${a.id}', 'fuzz message ' || i, 1700000000000 + i * 1000, 0 FROM n`,
    );
    const r = await call("GET", `/api/messages/${b.name}`, { token: a.token });
    const msgs = (r.json?.messages as { text: string; at: number }[] | undefined) ?? [];
    const last = msgs[msgs.length - 1]?.text;
    const ordered = msgs.every((msg, i) => i === 0 || msgs[i - 1].at <= msg.at);
    record("long thread shows the newest message", "F072", r.status === 200 && last === "fuzz message 204" && msgs.length === 200 && ordered, `status ${r.status}, ${msgs.length} messages, last "${last}", ascending ${ordered}`);
    const cc = r.headers.get("cache-control") ?? "";
    record("thread is private no-store", "F105", /no-store/.test(cc) && /private/.test(cc), `cache-control "${cc}"`);
    d1(`DELETE FROM messages WHERE id LIKE 'fuzzmsg-%'`);
  }

  // F075: opening a DM thread must not mark a friend request from the same player read.
  {
    const req = await call("POST", "/api/friends", { token: b.token, body: { action: "request", username: a.name } });
    await call("GET", `/api/messages/${b.name}`, { token: a.token });
    const rows = d1(`SELECT read, href FROM notifications WHERE user_id = '${a.id}' AND actor_user_id = '${b.id}' AND href = '/friend'`);
    record("friend request survives opening the DM", "F075", req.status === 200 && rows.length === 1 && Number(rows[0].read) === 0, `request ${req.status}, rows ${JSON.stringify(rows)}`);
    // And a DM after the request still rings the bell.
    await call("POST", `/api/messages/${a.name}`, { token: b.token, body: { text: "fuzz hello" } });
    const dm = d1(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = '${a.id}' AND href LIKE '/inbox/%' AND read = 0`);
    record("DM after a friend request still notifies", "F075", Number(dm[0]?.n) === 1, JSON.stringify(dm));
    d1(`DELETE FROM friendships WHERE user_lo IN ('${a.id}','${b.id}') AND user_hi IN ('${a.id}','${b.id}'); DELETE FROM notifications WHERE user_id IN ('${a.id}','${b.id}'); DELETE FROM messages WHERE from_user_id = '${b.id}'`);
  }

  // F052, F053: invisible-only text is empty; overrides are stripped; caps count code points.
  {
    const r1 = await call("POST", `/api/messages/${b.name}`, { token: a.token, body: { text: "\u200b\u200d\u2060\ufeff\u3164" } });
    record("zero-width-only DM refused", "F052", r1.status === 400, `status ${r1.status}`);
    const r2 = await call("POST", `/api/messages/${b.name}`, { token: a.token, body: { text: "fuzz \u202eevil\u202c done" } });
    const t2 = String((r2.json?.message as { text?: string } | undefined)?.text ?? "");
    record("RTL override stripped from DM", "F052", r2.status === 200 && !t2.includes("\u202e"), `status ${r2.status}, text ${JSON.stringify(t2)}`);
    const r3 = await call("POST", `/api/messages/${b.name}`, { token: a.token, body: { text: "\u{1F600}".repeat(1500) } });
    const t3 = String((r3.json?.message as { text?: string } | undefined)?.text ?? "");
    const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(t3);
    record("emoji DM capped without a split surrogate", "F053", r3.status === 200 && [...t3].length === 1000 && !lone, `status ${r3.status}, code points ${[...t3].length}, lone surrogate ${lone}`);
    const r4 = await call("POST", `/api/messages/${b.name}`, { token: a.token, body: { text: "<script>alert(1)</script> fuzz" } });
    const t4 = String((r4.json?.message as { text?: string } | undefined)?.text ?? "");
    record("HTML in a DM stored as typed text", "F052", r4.status === 200 && t4.startsWith("<script>"), `status ${r4.status}`);
  }

  // F073: arena ids are hex and may contain 0 and 1.
  {
    const r = await call("GET", "/api/games/0A1B2C3D");
    record("hex game id with 0 and 1 is looked up", "F073", r.status === 404, `status ${r.status}`);
    const bad = await call("GET", "/api/games/%3Cscript%3E");
    record("junk game id is a 400", "F073", bad.status === 400, `status ${bad.status}`);
  }

  // F048: prototype keys are not card ids.
  for (const id of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    const r = await call("GET", `/api/cards/insights?kind=nerf&id=${id}`);
    record(`insights id=${id} is unknown`, "F048", r.status === 404, `status ${r.status}`);
  }

  // F077: the games archive defaults to 30 rows when no limit is given.
  {
    const values = [0, 1, 2]
      .map(
        (i) =>
          `('FZ${i}GAME', '${a.id}', NULL, '${a.name}', 'fuzzbot', 'none', 'none', 1, 180, 0, '', 'w', 'resign', 0, ${1700000000000 + i}, ${1700000100000 + i})`,
      )
      .join(", ");
    d1(
      `INSERT OR IGNORE INTO games (id, white_user_id, black_user_id, white_name, black_name, white_nerf_id, black_nerf_id, seed, time_sec, increment_sec, moves, winner, reason, rated, started_at, completed_at) VALUES ${values}`,
    );
    const r = await call("GET", `/api/users/${a.name}/games`);
    const n = (r.json?.games as unknown[] | undefined)?.length ?? -1;
    record("archive without ?limit returns every game up to 30", "F077", r.status === 200 && n === 3, `status ${r.status}, ${n} games`);
  }

  // F059: clock bounds, muted senders, flood limit. F096: TTL and exact href.
  {
    const huge = await call("POST", "/api/challenges", { token: a.token, body: { to: b.name, code: "FZAAAA", timeSec: 999999, incrementSec: 0 } });
    record("challenge with a 999999s clock refused", "F059", huge.status === 400, `status ${huge.status}`);
    const neg = await call("POST", "/api/challenges", { token: a.token, body: { to: b.name, code: "FZAAAB", timeSec: 300, incrementSec: -5 } });
    record("challenge with a negative increment refused", "F059", neg.status === 400, `status ${neg.status}`);
    const muted = await call("POST", "/api/challenges", { token: m.token, body: { to: b.name, code: "FZAAAC", timeSec: 300, incrementSec: 0 } });
    record("muted player cannot send a challenge", "F059", muted.status === 403, `status ${muted.status}`);

    const c1 = await call("POST", "/api/challenges", { token: a.token, body: { to: b.name, code: "FZTTL", timeSec: 300, incrementSec: 0 } });
    d1(`UPDATE challenges SET created_at = created_at - 31 * 60 * 1000 WHERE id = 'FZTTL'`);
    const late = await call("POST", "/api/challenges/FZTTL", { token: b.token, body: { action: "accepted" } });
    record("accepting an expired challenge is 410", "F096", c1.status === 200 && late.status === 410, `create ${c1.status}, accept ${late.status}`);

    await call("POST", "/api/challenges", { token: a.token, body: { to: b.name, code: "FZHREF", timeSec: 300, incrementSec: 0 } });
    await call("POST", "/api/challenges", { token: a.token, body: { to: b.name, code: "FZHREFX", timeSec: 300, incrementSec: 0 } });
    await call("POST", "/api/challenges/FZHREF", { token: b.token, body: { action: "declined" } });
    const other = d1(`SELECT read FROM notifications WHERE user_id = '${b.id}' AND href = '/friend?code=FZHREFX'`);
    record("resolving one challenge leaves a longer code's bell alone", "F096", other.length === 1 && Number(other[0].read) === 0, JSON.stringify(other));

    const statuses: number[] = [];
    for (let i = 0; i < 14; i++) {
      const r = await call("POST", "/api/challenges", { token: a.token, body: { to: b.name, code: `FZF${String(i).padStart(3, "0")}`, timeSec: 300, incrementSec: 0 } });
      statuses.push(r.status);
    }
    record("challenge flood is rate limited", "F059", statuses.includes(429) && !statuses.some((s) => s >= 500), statuses.join(","));
    const bell = d1(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = '${b.id}' AND type = 'challenge'`);
    record("challenge flood rings the bell a bounded number of times", "F059", Number(bell[0]?.n) <= 12, JSON.stringify(bell));
  }

  // F058: friend request loop.
  {
    const muted = await call("POST", "/api/friends", { token: m.token, body: { action: "request", username: b.name } });
    record("muted player cannot send a friend request", "F058", muted.status === 403, `status ${muted.status}`);
    const statuses: number[] = [];
    for (let i = 0; i < 24; i++) {
      const r1 = await call("POST", "/api/friends", { token: a.token, body: { action: "request", username: b.name } });
      const r2 = await call("POST", "/api/friends", { token: a.token, body: { action: "decline", username: b.name } });
      statuses.push(r1.status, r2.status);
    }
    const notes = d1(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = '${b.id}' AND href = '/friend'`);
    record("request/cancel loop is limited", "F058", statuses.includes(429) && Number(notes[0]?.n) <= 1, `statuses ${[...new Set(statuses)].join(",")}, bell rows ${notes[0]?.n}`);
    const bogus = await call("POST", "/api/friends", { token: a.token, body: { action: "hug", username: b.name } });
    record("unknown friend action is a 400", "F058", bogus.status === 400, `status ${bogus.status}`);
  }

  // F061: clubs and posts.
  {
    const prof = await call("POST", "/api/clubs", { token: a.token, body: { name: "fuzz ｆｕｃｋ club", description: "x" } });
    record("profane club name refused", "F061", prof.status === 400, `status ${prof.status}`);
    const invisible = await call("POST", "/api/clubs", { token: a.token, body: { name: "\u200b\u200b\u200b\u200b", description: "" } });
    record("invisible club name refused", "F061", invisible.status === 400, `status ${invisible.status}`);
    const muted = await call("POST", "/api/clubs", { token: m.token, body: { name: "fuzz muted club" } });
    record("muted player cannot create a club", "F061", muted.status === 403, `status ${muted.status}`);
    const ok = await call("POST", "/api/clubs", { token: a.token, body: { name: "fuzz club \u202eflip", description: "fuzz shit description" } });
    const club = ok.json?.club as { slug?: string; name?: string; description?: string } | undefined;
    ctx.clubSlug = club?.slug;
    record("club name loses its override, description is censored", "F061", ok.status === 200 && !String(club?.name).includes("\u202e") && String(club?.description).includes("****"), `status ${ok.status}, ${JSON.stringify(club?.name)}, ${JSON.stringify(club?.description)}`);
    if (ctx.clubSlug) {
      // A structurally valid 256x256 PNG header padded to about 470K base64
      // characters: under the 1 MB decode cap, over the client's 300K budget.
      const png = Buffer.alloc(350_000);
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0, 0, 0, 1, 0]).copy(png);
      const big = "data:image/png;base64," + png.toString("base64");
      const icon = await call("PATCH", `/api/clubs/${ctx.clubSlug}`, { token: a.token, body: { icon: big } });
      record("oversized club icon refused before decoding", "F104", icon.status === 413 || icon.status === 400, `status ${icon.status}`);
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) {
        const r = await call("POST", `/api/clubs/${ctx.clubSlug}/posts`, { token: a.token, body: { text: `fuzz post ${i}` } });
        statuses.push(r.status);
      }
      record("club post flood is rate limited", "F061", statuses.includes(429), statuses.join(","));
      const blank = await call("POST", `/api/clubs/${ctx.clubSlug}/posts`, { token: b.token, body: { text: "x" } });
      record("non-member post still 403", "F061", blank.status === 403, `status ${blank.status}`);
    }
    const flood: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await call("POST", "/api/clubs", { token: a.token, body: { name: `fuzz club ${i}` } });
      flood.push(r.status);
    }
    record("club creation is capped per owner", "F061", flood.includes(429), flood.join(","));
  }

  // F060, F074, F078: tournaments.
  {
    const base = { format: "arena", mode: "nerf", clockTimeSec: 180, clockIncrementSec: 0, durationMin: 30 };
    const prof = await call("POST", "/api/tournaments", { token: a.token, body: { ...base, name: "fuzz shit cup" } });
    record("profane tournament name refused", "F060", prof.status === 400, `status ${prof.status}`);
    const muted = await call("POST", "/api/tournaments", { token: m.token, body: { ...base, name: "fuzz muted cup" } });
    record("muted player cannot create a tournament", "F060", muted.status === 403, `status ${muted.status}`);
    const far = await call("POST", "/api/tournaments", { token: a.token, body: { ...base, name: "fuzz far cup", startsAt: 32503680000000 } });
    record("start date in the year 3000 refused", "F060", far.status === 400, `status ${far.status}`);
    const slow = await call("POST", "/api/tournaments", { token: a.token, body: { ...base, name: "fuzz slow cup", clockTimeSec: 10800 } });
    record("3 hour clock refused (the game server caps at 2 hours)", "F078", slow.status === 400, `status ${slow.status}`);
    const ok = await call("POST", "/api/tournaments", { token: a.token, body: { ...base, name: "fuzz finished cup" } });
    const id = (ok.json?.tournament as { id?: string } | undefined)?.id;
    ctx.tournamentId = id;
    if (id) {
      await call("POST", `/api/tournaments/${id}/entry`, { token: b.token, body: { action: "join" } });
      d1(`UPDATE tournaments SET status = 'finished', finished_at = 1 WHERE id = '${id}'`);
      const w = await call("POST", `/api/tournaments/${id}/entry`, { token: b.token, body: { action: "withdraw" } });
      const still = d1(`SELECT COUNT(*) AS n FROM tournament_entries WHERE tournament_id = '${id}' AND user_id = '${b.id}'`);
      record("withdraw from a finished tournament refused, standings kept", "F074", w.status === 400 && Number(still[0]?.n) === 1, `status ${w.status}, entry rows ${still[0]?.n}`);
      const detail = await call("GET", `/api/tournaments/${id}`, { token: a.token });
      const cc = detail.headers.get("cache-control") ?? "";
      record("tournament detail (carries seat tokens) is private no-store", "F105", /no-store/.test(cc), `cache-control "${cc}"`);
    } else {
      record("tournament created for the withdraw check", "F074", false, `status ${ok.status} ${ok.text.slice(0, 120)}`);
    }
    const junk = await call("GET", `/api/tournaments/${"x".repeat(300)}`);
    record("junk tournament id is a 404", "F107", junk.status === 404, `status ${junk.status}`);
    const flood: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await call("POST", "/api/tournaments", { token: a.token, body: { ...base, name: `fuzz cup ${i}` } });
      flood.push(r.status);
    }
    record("tournament creation is rate limited", "F060", flood.includes(429), flood.join(","));
  }

  // F057: anonymous suggestions are throttled per IP.
  {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const r = await call("POST", "/api/suggest", {
        body: { name: "fuzz anon", description: `fuzz-anon suggestion number ${i} long enough` },
        headers: { "cf-connecting-ip": "203.0.113.77" },
      });
      statuses.push(r.status);
    }
    record("anonymous suggest flood is limited per IP", "F057", statuses.includes(429), statuses.join(","));
  }

  // F066: log sinks cap bodies and floods.
  {
    const big = await call("POST", "/api/desync", { body: { gameId: "x", clientHash: "a", serverHash: "b", rules: ["r".repeat(9000)] } });
    record("desync body over 4 KB refused", "F066", big.status === 413, `status ${big.status}`);
    const big2 = await call("POST", "/api/tv-telemetry", { body: { event: "tv_tune_failed", reason: "r".repeat(9000) } });
    record("tv-telemetry body over 4 KB refused", "F066", big2.status === 413, `status ${big2.status}`);
    const statuses: number[] = [];
    for (let i = 0; i < 140; i++) {
      const r = await call("POST", "/api/tv-telemetry", { body: { event: "tv_tune_started" }, headers: { "cf-connecting-ip": "203.0.113.78" } });
      statuses.push(r.status);
    }
    record("tv-telemetry flood is sampled", "F066", statuses.includes(429), `${statuses.filter((s) => s === 429).length} of 140 limited`);
  }

  // F070: the bot game counter.
  {
    const statuses: number[] = [];
    for (let i = 0; i < 35; i++) statuses.push((await call("POST", "/api/games/bot", { token: a.token })).status);
    record("bot game counter is rate limited", "F070", statuses.includes(429) && statuses[0] === 200, `${statuses.filter((s) => s === 429).length} of 35 limited`);
  }

  // F097: arena ingest without a token stays 401 (the record checks need the secret).
  {
    const r = await call("POST", "/api/arena/end", { body: { record: null }, origin: null });
    record("arena/end without a bearer is 401", "F097", r.status === 401, `status ${r.status}`);
  }

  // F106: leaderboard limit and meOnly. The local board is often empty, so
  // the three fuzz accounts are given one rated nerf game each for the check.
  {
    d1(
      [a.id, b.id, m.id]
        .map(
          (id, i) =>
            `INSERT INTO user_ratings (user_id, category, rating, games) VALUES ('${id}', 'nerf', ${1500 + i}, 1)
             ON CONFLICT(user_id, category) DO UPDATE SET games = 1, rating = ${1500 + i}`,
        )
        .join("; "),
    );
    const def = await call("GET", "/api/leaderboard");
    const all = (def.json?.players as unknown[] | undefined)?.length ?? -1;
    record("leaderboard default returns the full board", "F106", def.status === 200 && all >= 3, `status ${def.status}, ${all} rows`);
    const r = await call("GET", "/api/leaderboard?limit=2", { token: a.token });
    const n = (r.json?.players as unknown[] | undefined)?.length ?? -1;
    record("leaderboard ?limit=2 returns 2 rows", "F106", r.status === 200 && n === 2, `status ${r.status}, ${n} rows`);
    const me = await call("GET", "/api/leaderboard?meOnly=1", { token: a.token });
    const pn = (me.json?.players as unknown[] | undefined)?.length ?? -1;
    const rank = (me.json?.me as { rank?: number } | null | undefined)?.rank;
    record("leaderboard ?meOnly=1 returns only the viewer row", "F106", me.status === 200 && pn === 0 && typeof rank === "number", `status ${me.status}, ${pn} rows, me.rank ${rank}`);
  }

  // F168: tournament detail carries the club slug.
  if (ctx.clubSlug) {
    const club = d1(`SELECT id FROM clubs WHERE slug = '${ctx.clubSlug}'`);
    const clubId = String(club[0]?.id ?? "");
    d1(`DELETE FROM login_attempts WHERE key LIKE 'rl:%'`);
    const t = await call("POST", "/api/tournaments", {
      token: a.token,
      body: { format: "arena", mode: "nerf", clockTimeSec: 180, clockIncrementSec: 0, durationMin: 30, name: "fuzz club cup", clubId },
    });
    const id = (t.json?.tournament as { id?: string } | undefined)?.id;
    const d = id ? await call("GET", `/api/tournaments/${id}`) : null;
    const slug = (d?.json?.tournament as { club_slug?: string } | undefined)?.club_slug;
    record("tournament detail includes club_slug", "F168", slug === ctx.clubSlug, `create ${t.status}, club_slug ${slug}`);
  }
}

// ---------- bad-input matrix ----------

const STRING_POISON = [
  "x".repeat(10_000),
  "\u200b\u200d\u2060",
  "\u202egnp.exe",
  "<img src=x onerror=alert(1)>",
  "\u{1F600}".repeat(3000),
  "'; DROP TABLE users; --",
  "\u0000\u0001",
  "a\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308",
];
const TYPE_POISON: unknown[] = [null, true, 0, -1, 1e308, [], {}, { __proto__: { x: 1 } }, ["a"], "constructor"];

function bodiesFor(fields: string[]): { label: string; raw: string; type?: string }[] {
  const out: { label: string; raw: string; type?: string }[] = [
    { label: "null", raw: "null" },
    { label: "array", raw: "[]" },
    { label: "string", raw: '"str"' },
    { label: "number", raw: "123" },
    { label: "broken json", raw: "{" },
    { label: "empty", raw: "" },
    { label: "empty object", raw: "{}" },
    { label: "200KB", raw: JSON.stringify({ [fields[0] ?? "x"]: "a".repeat(200_000) }) },
    { label: "deep nesting", raw: "[".repeat(5000) + "]".repeat(5000) },
    { label: "form type", raw: "a=b", type: "application/x-www-form-urlencoded" },
  ];
  for (const f of fields) {
    TYPE_POISON.forEach((v, i) => out.push({ label: `${f}=type${i}`, raw: JSON.stringify({ [f]: v }) }));
    STRING_POISON.forEach((v, i) => {
      const body: Record<string, unknown> = {};
      for (const g of fields) body[g] = v;
      out.push({ label: `all=str${i} via ${f}`, raw: JSON.stringify(body) });
    });
  }
  return out;
}

async function matrix(ctx: Ctx) {
  const { a, b } = ctx;
  const slug = ctx.clubSlug ?? "fuzz-missing";
  const tid = ctx.tournamentId ?? "fuzz-missing";
  const targets: { method: string; path: string; token?: string; fields: string[] }[] = [
    { method: "POST", path: `/api/messages/${b.name}`, token: a.token, fields: ["text"] },
    { method: "POST", path: "/api/notifications", token: a.token, fields: ["ids"] },
    { method: "POST", path: "/api/friends", token: a.token, fields: ["action", "username"] },
    { method: "POST", path: "/api/challenges", token: a.token, fields: ["to", "code", "timeSec", "incrementSec", "rated"] },
    { method: "POST", path: "/api/challenges/FZMATRIX", token: a.token, fields: ["action"] },
    { method: "POST", path: "/api/report", token: a.token, fields: ["username", "reason", "description", "gameId"] },
    { method: "POST", path: "/api/suggest", token: a.token, fields: ["name", "description", "contact", "kind", "pool"] },
    { method: "POST", path: "/api/buff-feedback", token: a.token, fields: ["buffId", "vote", "gameId"] },
    { method: "POST", path: "/api/nerf-feedback", token: a.token, fields: ["nerfId", "vote", "gameId"] },
    { method: "POST", path: "/api/clubs", token: a.token, fields: ["name", "description", "icon"] },
    { method: "PATCH", path: `/api/clubs/${slug}`, token: a.token, fields: ["icon"] },
    { method: "POST", path: `/api/clubs/${slug}/membership`, token: b.token, fields: ["action"] },
    { method: "POST", path: `/api/clubs/${slug}/posts`, token: a.token, fields: ["text"] },
    { method: "POST", path: "/api/tournaments", token: a.token, fields: ["name", "description", "format", "mode", "rated", "clockTimeSec", "clockIncrementSec", "durationMin", "roundsTotal", "startsAt", "maxPlayers", "clubId"] },
    { method: "POST", path: `/api/tournaments/${tid}/entry`, token: b.token, fields: ["action"] },
    { method: "POST", path: "/api/users/settings", token: a.token, fields: ["friendsVisibility", "showOnline"] },
    { method: "PUT", path: "/api/users/settings", token: a.token, fields: ["settings", "updatedAt"] },
    { method: "POST", path: "/api/desync", fields: ["gameId", "clientHash", "serverHash", "diverged", "rules"] },
    { method: "POST", path: "/api/tv-telemetry", fields: ["event", "surface", "gameId", "hashMismatch"] },
  ];
  let ipSeq = 0;
  for (const t of targets) {
    for (const b0 of bodiesFor(t.fields)) {
      // A fresh client address per request keeps the per-IP flood guards out
      // of the way, so the matrix exercises validation rather than only 429s.
      ipSeq++;
      const headers: Record<string, string> = { "cf-connecting-ip": `198.51.-e.-e` };
      if (b0.type) headers["content-type"] = b0.type;
      const r = await call(t.method, t.path, { token: t.token, raw: b0.raw, headers });
      matrixCount++;
      if (r.status >= 500) matrix5xx.push({ case: `${t.method} ${t.path} ${b0.label}`, status: r.status });
    }
    d1(`DELETE FROM login_attempts WHERE key LIKE 'rl:%'`);
  }
  // Hostile GETs.
  const long = "x".repeat(5000);
  const gets = [
    `/api/users/${long}`,
    `/api/users/%00`,
    `/api/users/${a.name}/games?limit=abc&before=-1&mode=__proto__&result=x&rated=2`,
    `/api/users/${a.name}/games?limit=1e999`,
    `/api/users/${a.name}/stats`,
    `/api/users/${a.name}/achievements`,
    `/api/users/${a.name}/friends`,
    `/api/users/${long}/friends`,
    `/api/users/search?q=%00%00`,
    `/api/users/search?q=${encodeURIComponent("\u202e\u200b")}`,
    `/api/users/search?q=${encodeURIComponent("%_\\")}`,
    `/api/games/${long}`,
    `/api/games/recent?limit=-5&mode=constructor`,
    `/api/cards/insights?kind=__proto__&id=x`,
    `/api/cards/insights?kind=buff&id=${long}`,
    `/api/leaderboard?category=__proto__&limit=abc`,
    `/api/tournaments/%2e%2e`,
    `/api/clubs/${long}`,
    `/api/clubs?q=${encodeURIComponent("%_")}`,
    `/api/messages/${long}`,
    `/api/community/active`,
    `/api/community/recent`,
    `/api/history`,
    `/api/challenges`,
    `/api/notifications`,
    `/api/friends`,
    `/api/messages`,
  ];
  for (const g of gets) {
    const r = await call("GET", g, { token: a.token });
    matrixCount++;
    if (r.status >= 500) matrix5xx.push({ case: `GET ${g.slice(0, 120)}`, status: r.status });
  }
  // Hostile DELETE.
  for (const q of ["", "?id=", `?id=${long}`]) {
    const r = await call("DELETE", `/api/clubs/${slug}/posts${q}`, { token: a.token });
    matrixCount++;
    if (r.status >= 500) matrix5xx.push({ case: `DELETE posts ${q.slice(0, 20)}`, status: r.status });
  }
  record(`bad-input matrix (${matrixCount} requests) has no 5xx`, "F047", matrix5xx.length === 0, `${matrix5xx.length} server errors`);
}

async function main() {
  assertLocal();
  const args = parseArgs();
  const out = argStr(args, "out", path.join(SCRATCH_DIR, "api-fuzz-latest.json"));
  const only = new Set(argStr(args, "only", "regressions,matrix").split(","));
  await waitForServer();
  const [a, b, m] = await Promise.all([account("polish_fuzz_a"), account("polish_fuzz_b"), account("polish_fuzz_m")]);
  const ctx: Ctx = {
    a: { ...a, name: "polish_fuzz_a" },
    b: { ...b, name: "polish_fuzz_b" },
    m: { ...m, name: "polish_fuzz_m" },
  };
  resetFuzzState([a.id, b.id, m.id]);
  d1(`UPDATE users SET muted_until = ${Date.now() + 365 * 24 * 3600 * 1000} WHERE id = '${m.id}'`);
  const t0 = Date.now();
  try {
    if (only.has("regressions")) await regressions(ctx);
    if (only.has("matrix")) await matrix(ctx);
  } finally {
    if (!args.flags.has("keep")) {
      try {
        resetFuzzState([a.id, b.id, m.id]);
      } catch (err) {
        console.error("cleanup failed (rows may remain for the fuzz accounts):", (err as Error).message.split("\n")[0]);
      }
    }
  }
  const failed = results.filter((r) => !r.ok);
  const file = writeJson(out, {
    base: BASE,
    at: new Date().toISOString(),
    ms: Date.now() - t0,
    passed: results.length - failed.length,
    failed: failed.length,
    matrixRequests: matrixCount,
    matrix5xx,
    results,
  });
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed; report ${rel(file)}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
