// ---------------------------------------------------------------------------
// test:auth-safety: regression checks for the slice A auth fixes.
//
//   ./node_modules/.bin/tsx scripts/check-auth-safety.ts           unit + HTTP
//   ./node_modules/.bin/tsx scripts/check-auth-safety.ts --unit    unit only
//
// Unit (no server):
//   F041/F042  safeNextPath refuses every off-site or protocol-relative form,
//              including the backslash one browsers resolve to another host.
//   who        the display cookie round-trips and refuses malformed values.
//   oauth      /login shows only the known Google sign-in messages.
// HTTP (the local dev server on POLISH_BASE or http://localhost:3000; refuses
// anything but localhost):
//   F047  a JSON body of null / [] / 7 is a 400 on every auth POST, not a 500.
//   F043  names in ADMIN_USERNAMES cannot be registered.
//   F063  ten wrong passwords from one IP do not lock the owner out from
//         another IP.
//   F076  a guest upgrading keeps its old /u/<GuestName> link working.
//   who   sign-in, /me and sign-out set, keep and clear nc_who.
// Every HTTP case uses a fresh throwaway account and a random
// CF-Connecting-IP, so it cannot lock or rename a shared seed account.
// ---------------------------------------------------------------------------

import { safeNextPath } from "../src/lib/safeNext";
import { encodeWho, parseWho, whoCookieHeader } from "../src/lib/session/who";
import { OAUTH_ERRORS, oauthErrorMessage } from "../src/app/login/oauthErrors";

const BASE = (process.env.POLISH_BASE || "http://localhost:3000").replace(/\/$/, "");
let failures = 0;
let checks = 0;

function check(name: string, ok: boolean, detail = "") {
  checks++;
  if (!ok) {
    failures++;
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

function unit() {
  const bad = [
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/..//evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    "/" + "a".repeat(3000),
  ];
  for (const v of bad) check(`safeNextPath refuses ${JSON.stringify(v).slice(0, 40)}`, safeNextPath(v) === "/", safeNextPath(v));
  check("safeNextPath null", safeNextPath(null) === "/");
  check("safeNextPath fallback", safeNextPath("//x", "/lobby") === "/lobby");
  const good: Array<[string, string]> = [
    ["/", "/"],
    ["/lobby", "/lobby"],
    ["/lobby?tab=friends#x", "/lobby?tab=friends#x"],
    ["/u/some_one", "/u/some_one"],
    ["/%2F%2Fevil.com", "/%2F%2Fevil.com"],
  ];
  for (const [v, want] of good) check(`safeNextPath keeps ${v}`, safeNextPath(v) === want, safeNextPath(v));

  const hint = { username: "polish_user", avatar: "gold_n", role: "mod" as const, isGuest: false };
  check("who round trip", JSON.stringify(parseWho(encodeWho(hint))) === JSON.stringify(hint));
  check("who round trip encoded", JSON.stringify(parseWho(encodeURIComponent(encodeWho(hint)))) === JSON.stringify(hint));
  check("who guest", parseWho("v1.g.user.GuestFox.")?.isGuest === true);
  for (const v of ["", "v2.u.user.x.", "v1.u.root.x.", "v1.u.user.<b>.", "v1.x.user.a.", "v1.u.user.a.b.c", "%E0%A4%A"]) {
    check(`who refuses ${v}`, parseWho(v) === null);
  }
  check("who clear header", /nc_who=; .*Max-Age=0/.test(whoCookieHeader(null, false)));
  check("who header not httpOnly", !/HttpOnly/i.test(whoCookieHeader(hint, true)) && /Secure/.test(whoCookieHeader(hint, true)));

  check("oauth known message kept", oauthErrorMessage(OAUTH_ERRORS.expired) === OAUTH_ERRORS.expired);
  check("oauth unknown message replaced", oauthErrorMessage("Your account is locked, call 555") === OAUTH_ERRORS.failed);
  check("oauth none", oauthErrorMessage(null) === null);
}

function cookieOf(res: Response, name: string): string | null | undefined {
  const all = res.headers.getSetCookie?.() ?? [];
  const line = all.find((c) => c.startsWith(`${name}=`));
  if (line === undefined) return undefined;
  const value = line.slice(name.length + 1).split(";")[0];
  return /Max-Age=0/i.test(line) ? null : value;
}

let step = "";

async function post(path: string, body: string, headers: Record<string, string> = {}): Promise<Response> {
  step = `POST ${path} ${body.slice(0, 40)}`;
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
    redirect: "manual",
  });
}

function randomIp(): string {
  const b = () => Math.floor(Math.random() * 250) + 2;
  return `10.${b()}.${b()}.${b()}`;
}

async function http() {
  const host = new URL(BASE).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") throw new Error(`refusing non-local base ${BASE}`);
  const tag = Math.random().toString(36).slice(2, 8);
  const password = "auth-safety-" + tag;

  // F047
  for (const route of ["login", "register", "rename", "avatar", "bio", "flair"]) {
    for (const body of ["null", "[]", "7"]) {
      const res = await post(`/api/auth/${route}`, body, { "CF-Connecting-IP": randomIp() });
      check(`F047 ${route} ${body}`, res.status === 400, `status ${res.status}`);
    }
  }

  // F043: every name in ADMIN_USERNAMES (wrangler.jsonc vars) is reserved.
  for (const name of ["ilovenewjeans", "RuyLopezSolos"]) {
    const res = await post("/api/auth/register", JSON.stringify({ username: name, password }), {
      "CF-Connecting-IP": randomIp(),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    check(`F043 register ${name}`, res.status === 400 && /reserved/i.test(data.error ?? ""), `${res.status} ${data.error}`);
  }

  // Register a throwaway account: the display cookie comes with the session.
  const owner = `as_${tag}`;
  const reg = await post("/api/auth/register", JSON.stringify({ username: owner, password }), {
    "CF-Connecting-IP": randomIp(),
  });
  check("register ok", reg.ok, `status ${reg.status}`);
  check("register sets nc_who", cookieOf(reg, "nc_who") === `v1.u.user.${owner}.`, String(cookieOf(reg, "nc_who")));
  const session = cookieOf(reg, "dc_session");

  // F063: ten failures from one IP, then the owner signs in from another.
  const attacker = randomIp();
  for (let i = 0; i < 10; i++) {
    await post("/api/auth/login", JSON.stringify({ username: owner, password: "wrong-" + i }), {
      "CF-Connecting-IP": attacker,
    });
  }
  const blocked = await post("/api/auth/login", JSON.stringify({ username: owner, password }), {
    "CF-Connecting-IP": attacker,
  });
  check("F063 attacker IP is throttled", blocked.status === 429, `status ${blocked.status}`);
  const ownerLogin = await post("/api/auth/login", JSON.stringify({ username: owner, password }), {
    "CF-Connecting-IP": randomIp(),
  });
  check("F063 owner from another IP signs in", ownerLogin.ok, `status ${ownerLogin.status}`);
  check("login sets nc_who", cookieOf(ownerLogin, "nc_who") === `v1.u.user.${owner}.`, String(cookieOf(ownerLogin, "nc_who")));

  // /me re-stamps a missing or stale hint and leaves a correct one alone.
  if (session) {
    const stale = await fetch(`${BASE}/api/auth/me`, {
      headers: { cookie: `dc_session=${session}; nc_who=v1.u.admin.someone_else.` },
    });
    check("me corrects a stale hint", cookieOf(stale, "nc_who") === `v1.u.user.${owner}.`, String(cookieOf(stale, "nc_who")));
    const same = await fetch(`${BASE}/api/auth/me`, {
      headers: { cookie: `dc_session=${session}; nc_who=v1.u.user.${owner}.` },
    });
    check("me leaves a correct hint alone", cookieOf(same, "nc_who") === undefined, String(cookieOf(same, "nc_who")));
    const out = await post("/api/auth/logout", "{}", { cookie: `dc_session=${session}; nc_who=v1.u.user.${owner}.` });
    check("logout clears nc_who", cookieOf(out, "nc_who") === null, String(cookieOf(out, "nc_who")));
  }
  const anon = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: "nc_who=v1.u.user.ghost." } });
  check("me clears a hint with no session", cookieOf(anon, "nc_who") === null, String(cookieOf(anon, "nc_who")));

  // F076: guest upgrade keeps the old name resolvable.
  const guest = await post("/api/auth/guest", "{}", { "CF-Connecting-IP": randomIp() });
  const guestSession = cookieOf(guest, "dc_session");
  const guestName = ((await guest.json()) as { username?: string }).username ?? "";
  check("guest sets nc_who", cookieOf(guest, "nc_who") === `v1.g.user.${guestName}.`, String(cookieOf(guest, "nc_who")));
  if (guestSession && guestName) {
    const upgraded = `ag_${tag}`;
    const up = await post("/api/auth/register", JSON.stringify({ username: upgraded, password }), {
      cookie: `dc_session=${guestSession}`,
      "CF-Connecting-IP": randomIp(),
    });
    check("guest upgrade ok", up.ok, `status ${up.status}`);
    check("guest upgrade re-stamps nc_who", cookieOf(up, "nc_who") === `v1.u.user.${upgraded}.`, String(cookieOf(up, "nc_who")));
    const old = await fetch(`${BASE}/api/users/${encodeURIComponent(guestName)}`);
    const data = (await old.json().catch(() => ({}))) as { redirectTo?: string };
    check("F076 old guest name redirects", data.redirectTo === upgraded, `${old.status} ${JSON.stringify(data)}`);
  }
}

async function main() {
  unit();
  if (!process.argv.includes("--unit")) await http();
  console.log(`[auth-safety] ${checks} checks, ${failures} failures`);
  if (failures) process.exit(1);
}

main().catch((e) => {
  console.error(`failed during ${step}:`, e instanceof Error ? e.message : e);
  process.exit(1);
});
