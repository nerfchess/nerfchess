// Regression checks for the moderator API (slice G): run against the shared
// dev server with the seeded polish_mod / polish_admin / polish_user sessions.
//
//   ./node_modules/.bin/tsx scripts/polish/mod-test.ts [--out FILE]
//
// Each check names the finding it covers. Fixture rows (one report against
// polish_user, three chat flags) are inserted into local D1 with
// `wrangler d1 execute --local`; ids carry a per-run nonce so reruns never
// collide. Local only: refuses a non-localhost base, never uses --remote.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const BASE = process.env.POLISH_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error(`mod-test refuses a non-local base: ${BASE}`);
}
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;

function token(key: "mod" | "admin" | "user"): string {
  const file = path.join(ROOT, ".polish-auth", `${key}.json`);
  const state = JSON.parse(readFileSync(file, "utf8")) as { cookies: { name: string; value: string }[] };
  const c = state.cookies.find((x) => x.name === "dc_session");
  if (!c) throw new Error(`no dc_session in ${file}; run npm run polish:seed`);
  return c.value;
}

type Who = "mod" | "admin" | "user";
const TOKENS: Record<Who, string> = { mod: token("mod"), admin: token("admin"), user: token("user") };

async function call(
  who: Who,
  method: string,
  pathname: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      cookie: `dc_session=${TOKENS[who]}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      // What a same-origin browser fetch sends.
      "sec-fetch-site": "same-origin",
      origin: BASE,
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

function d1(sql: string) {
  execFileSync(path.join(ROOT, "node_modules", ".bin", "wrangler"), ["d1", "execute", "nerfchess", "--local", "--command", sql], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

type Check = { id: string; finding: string; pass: boolean; detail: string };
const checks: Check[] = [];
function check(finding: string, id: string, pass: boolean, detail: unknown) {
  checks.push({ id, finding, pass, detail: typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400) });
  console.log(`${pass ? "PASS" : "FAIL"} [${finding}] ${id}${pass ? "" : `: ${checks[checks.length - 1].detail}`}`);
}

type LogRow = { action: string; target_name?: string; target_kind?: string; target_ref?: string | null; note?: string | null; before_json?: string | null; after_json?: string | null };
async function log(): Promise<LogRow[]> {
  const r = await call("admin", "GET", "/api/mod/log");
  return (r.json.log as LogRow[]) ?? [];
}

async function main() {
  const nonce = Date.now().toString(36);
  const me = async (who: Who) => (await call(who, "GET", "/api/auth/me")).json as { user?: { id: string; username: string } };
  const userMe = (await me("user")).user;
  const modMe = (await me("mod")).user;
  const adminMe = (await me("admin")).user;
  if (!userMe || !modMe || !adminMe) throw new Error("seeded sessions are not signed in; run npm run polish:seed");

  // Fixtures: one open report against polish_user, three unreviewed flags.
  const reportId = `polishrep_${nonce}`;
  const flagIds = [0, 1, 2].map((i) => `polishflag_${nonce}_${i}`);
  const now = Date.now();
  d1(
    [
      `INSERT INTO reports (id, reporter_user_id, reporter_name, reported_user_id, reported_name, reason, description, game_id, status, created_at)
       VALUES ('${reportId}', '${adminMe.id}', '${adminMe.username}', '${userMe.id}', '${userMe.username}', 'chat', 'mod-test fixture', NULL, 'open', ${now})`,
      ...flagIds.map(
        (id, i) =>
          `INSERT INTO chat_flags (id, match_id, user_id, username, color, text, matched_words, created_at, reviewed)
           VALUES ('${id}', 'polish_match', '${userMe.id}', '${userMe.username}', 'w', 'mod-test fixture ${i}', 'x', ${now - i}, 0)`,
      ),
    ].join("; "),
  );

  // ---- Authorisation -------------------------------------------------------
  {
    const r = await call("user", "GET", "/api/mod/log");
    check("auth", "a player gets 403 from the mod API", r.status === 403, r);
    const x = await call("mod", "POST", "/api/mod/users", { username: userMe.username, action: "warn", note: "x" }, { "sec-fetch-site": "cross-site", origin: "https://evil.example" });
    check("F046", "a cross-site mod write is refused", x.status === 403, x);
    const self = await call("mod", "POST", "/api/mod/users", { username: modMe.username, action: "warn", note: "self" });
    check("safety", "a mod cannot act on themselves", self.status === 400, self);
    const adm = await call("mod", "POST", "/api/mod/users", { username: adminMe.username, action: "warn", note: "admin" });
    check("safety", "a mod cannot act on an admin", adm.status === 400, adm);
    const noReason = await call("mod", "POST", "/api/mod/users", { username: userMe.username, action: "mute", durationMs: 60000 });
    check("F121", "a mute without a reason is refused", noReason.status === 400, noReason);
  }

  // ---- F120: underscores in a search ----------------------------------------
  {
    const r = await call("mod", "GET", `/api/mod/users?q=${encodeURIComponent(userMe.username.slice(0, 8))}`);
    const names = ((r.json.users as { username: string }[]) ?? []).map((u) => u.username);
    check("F120", `searching "${userMe.username.slice(0, 8)}" finds ${userMe.username}`, names.includes(userMe.username), names);
  }

  // ---- F115: context follows the selected player, by id ---------------------
  {
    const note = `mod-test warn ${nonce}`;
    const w = await call("mod", "POST", "/api/mod/users", { username: userMe.username, action: "warn", note });
    check("F115", "warn with a reason succeeds", w.status === 200, w);
    const ctx = await call("mod", "GET", `/api/mod/users?id=${encodeURIComponent(userMe.id)}`);
    const hist = (ctx.json.history as { note: string | null }[]) ?? [];
    const reports = (ctx.json.reports as { reason: string }[]) ?? [];
    check("F115", "context by id carries the player's own mod history", hist.some((h) => h.note === note), { status: ctx.status, hist: hist.slice(0, 3) });
    check("F115", "context by id carries reports against the player", reports.length > 0, { status: ctx.status, n: reports.length });
    const byAdmin = await call("mod", "GET", `/api/mod/users?id=${encodeURIComponent(adminMe.id)}`);
    const filed = (byAdmin.json.reportsBy as unknown[]) ?? null;
    check("F115", "context carries reports the player filed", Array.isArray(filed) && filed.length > 0, { status: byAdmin.status, filed });
    const acct = byAdmin.json.user as { username?: string } | undefined;
    check("F115", "context names the requested player, not a search match", acct?.username === adminMe.username, acct ?? byAdmin.json);
  }

  // ---- F122: mark reviewed only what was shown ------------------------------
  {
    const r = await call("mod", "POST", "/api/mod/chat-flags", { ids: flagIds.slice(0, 2) });
    const g = await call("mod", "GET", "/api/mod/chat-flags");
    const open = ((g.json.flags as { id: string }[]) ?? []).map((f) => f.id);
    check("F122", "bulk review clears exactly the ids sent", r.status === 200 && !open.includes(flagIds[0]) && !open.includes(flagIds[1]) && open.includes(flagIds[2]), { status: r.status, open: open.filter((id) => id.includes(nonce)) });
  }

  // ---- F127: a report closes once, with a note -----------------------------
  {
    const first = await call("mod", "POST", "/api/mod/reports", { id: reportId, status: "resolved", note: "handled in test" });
    const second = await call("admin", "POST", "/api/mod/reports", { id: reportId, status: "dismissed", note: "again" });
    check("F127", "first close succeeds", first.status === 200, first);
    check("F127", "a second close of the same report answers 409", second.status === 409, second);
  }

  // ---- F124: card override delete validates and is traced -------------------
  {
    const bad = await call("mod", "DELETE", "/api/mod/cards?id=not_a_real_card_zz&kind=buff");
    check("F124", "deleting an unknown card id answers 400", bad.status === 400, bad);
  }

  // ---- F116: every mutation reaches the audit log --------------------------
  {
    const rows = await log();
    const has = (pred: (r: LogRow) => boolean) => rows.some(pred);
    check("F116", "the sanction is in the log with its reason", has((r) => r.action === "warn" && (r.note ?? "").includes(nonce)), rows.slice(0, 3));
    check("F116", "report triage is in the log with the report id and note", has((r) => r.target_ref === reportId && r.note === "handled in test"), rows.slice(0, 3));
    check("F116", "chat-flag review is in the log with the count", has((r) => r.action === "chat_flag_reviewed" && (r.after_json ?? "").includes("2")), rows.slice(0, 3));
  }

  // ---- F117 / F118: metrics exclude house, seed and test accounts -----------
  {
    const m = await call("mod", "GET", "/api/mod/metrics");
    const defs = m.json.definitions as Record<string, string> | undefined;
    check("F118", "metrics answer with written definitions", m.status === 200 && !!defs?.exclusion && !!defs?.active, { status: m.status, keys: Object.keys(m.json) });
    const u = await call("user", "GET", "/api/mod/metrics");
    check("auth", "metrics are moderator-only", u.status === 403, u.status);
  }

  const failed = checks.filter((c) => !c.pass).length;
  console.log(`\n${checks.length - failed} of ${checks.length} passed`);
  if (OUT) {
    mkdirSync(path.dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), base: BASE, passed: checks.length - failed, total: checks.length, checks }, null, 2));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
