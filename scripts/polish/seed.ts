// ---------------------------------------------------------------------------
// Seed the polish-pass accounts against the LOCAL dev server and write their
// Playwright storageState files to .polish-auth/ (gitignored).
//
//   ./node_modules/.bin/tsx scripts/polish/seed.ts          (npm run polish:seed)
//
// Accounts (password from POLISH_SEED_PASSWORD, default below, local only):
//
//   guest   POST /api/auth/guest, the same call the site makes for "play as guest"
//   user    polish_user, registered through POST /api/auth/register
//   mod     polish_mod, registered, then role set to 'mod' in the LOCAL D1
//   admin   polish_admin, registered, then role set to 'admin' in the LOCAL D1
//
// Why the role write goes to the database: the only in-app path to a role is
// ADMIN_USERNAMES (promotes to admin on login, and changing it means restarting
// the shared dev server) and then an admin granting `mod` from /mod. The local
// D1 behind `next dev` is miniflare's sqlite under .wrangler/state, and
// `wrangler d1 execute --local` writes to that same file. It never passes
// --remote, and it refuses to run at all unless POLISH_BASE is localhost.
//
// Idempotent: an existing storageState whose session still resolves to the
// right account (and role) is kept, so re-running does not mint sessions or
// guest rows.
// ---------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AUTH_DIR, BASE, ROOT, waitForServer, writeJson } from "./lib/common";

const PASSWORD = process.env.POLISH_SEED_PASSWORD || "polish-local-only-7";

type Role = "user" | "mod" | "admin";
type Account = { key: "user" | "mod" | "admin"; username: string; role: Role };

export const ACCOUNTS: Account[] = [
  { key: "user", username: "polish_user", role: "user" },
  { key: "mod", username: "polish_mod", role: "mod" },
  { key: "admin", username: "polish_admin", role: "admin" },
];

type Me = { id: string; username: string; role: Role; isGuest: boolean } | null;

function assertLocal() {
  const host = new URL(BASE).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`refusing to seed against ${BASE}: seed.ts only ever touches the local dev server`);
  }
}

function tokenFrom(res: Response): string | null {
  const raw = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  for (const c of raw) {
    const m = /(?:^|,\s*)dc_session=([0-9a-f]{64})/.exec(c);
    if (m) return m[1];
  }
  return null;
}

async function me(token: string): Promise<Me> {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: `dc_session=${token}` } });
  if (!res.ok) return null;
  return ((await res.json()) as { user: Me }).user;
}

function storedToken(key: string): string | null {
  const file = path.join(AUTH_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const s = JSON.parse(fs.readFileSync(file, "utf8")) as { cookies: { name: string; value: string }[] };
    return s.cookies.find((c) => c.name === "dc_session")?.value ?? null;
  } catch {
    return null;
  }
}

function save(key: string, token: string) {
  const host = new URL(BASE).hostname;
  writeJson(path.join(AUTH_DIR, `${key}.json`), {
    cookies: [
      {
        name: "dc_session",
        value: token,
        domain: host,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 80,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [],
  });
}

function d1(sql: string) {
  execFileSync(
    path.join(ROOT, "node_modules", ".bin", "wrangler"),
    ["d1", "execute", "nerfchess", "--local", "--command", sql],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
}

async function post(pathname: string, body: unknown, token?: string): Promise<Response> {
  return fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { cookie: `dc_session=${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

async function seedAccount(a: Account): Promise<string> {
  const kept = storedToken(a.key);
  if (kept) {
    const who = await me(kept);
    if (who && who.username === a.username && who.role === a.role) return `${a.key}: kept existing session (${a.username}, ${a.role})`;
  }
  let res = await post("/api/auth/register", { username: a.username, password: PASSWORD });
  if (res.status === 409) res = await post("/api/auth/login", { username: a.username, password: PASSWORD });
  if (!res.ok) throw new Error(`${a.key}: ${res.status} ${await res.text()}`);
  let token = tokenFrom(res);
  if (!token) throw new Error(`${a.key}: no session cookie in the response`);
  if (a.role !== "user") {
    // Username is validated to [A-Za-z0-9_], so it is safe to inline.
    d1(`UPDATE users SET role = '${a.role}' WHERE username_lower = '${a.username.toLowerCase()}'`);
    // Sign in again so nothing session-cached predates the role.
    const again = await post("/api/auth/login", { username: a.username, password: PASSWORD });
    token = tokenFrom(again) ?? token;
  }
  const who = await me(token);
  if (!who || who.role !== a.role) throw new Error(`${a.key}: session resolves to ${JSON.stringify(who)}`);
  save(a.key, token);
  return `${a.key}: ${a.username} (${who.role}) seeded`;
}

async function seedGuest(): Promise<string> {
  const kept = storedToken("guest");
  if (kept) {
    const who = await me(kept);
    if (who?.isGuest) return `guest: kept existing session (${who.username})`;
  }
  const res = await post("/api/auth/guest", {});
  if (!res.ok) throw new Error(`guest: ${res.status} ${await res.text()}`);
  const token = tokenFrom(res);
  if (!token) throw new Error("guest: no session cookie in the response");
  const who = await me(token);
  if (!who?.isGuest) throw new Error(`guest: session resolves to ${JSON.stringify(who)}`);
  save("guest", token);
  return `guest: ${who.username} seeded`;
}

export async function seedAll(log = console.log): Promise<void> {
  assertLocal();
  await waitForServer();
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  log(await seedGuest());
  for (const a of ACCOUNTS) log(await seedAccount(a));
}

if (require.main === module) {
  seedAll().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
