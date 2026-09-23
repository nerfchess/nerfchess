// Direct challenge bell link (slice D request 3): a new challenge's bell entry
// points at the invite route /c/<code>, that route opens the lobby join flow
// for the code, the /friend?code= links stored before it still resolve, and
// answering the challenge clears the bell entry.
//
//   ./node_modules/.bin/tsx scripts/polish/challenge-href-check.ts
//
// Needs the shared dev server and the seeded accounts (npm run polish:seed).
import fs from "node:fs";
import { challengeHref, challengeHrefs } from "../../src/lib/server/social";

const BASE = (process.env.POLISH_BASE ?? "http://localhost:3000").replace(/\/$/, "");
let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`);
}
function cookie(auth: "user" | "mod"): string {
  const s = JSON.parse(fs.readFileSync(`.polish-auth/${auth}.json`, "utf8")) as { cookies: { name: string; value: string }[] };
  return s.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}
async function call(auth: "user" | "mod", method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    headers: { cookie: cookie(auth), origin: BASE, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function main() {
  const host = new URL(BASE).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") throw new Error(`refusing non-local base ${BASE}`);

  check("challengeHref is the invite route", challengeHref("AB12CD") === "/c/AB12CD", challengeHref("AB12CD"));
  check("challengeHrefs keeps the stored /friend form", JSON.stringify(challengeHrefs("AB12CD")) === JSON.stringify(["/c/AB12CD", "/friend?code=AB12CD"]));

  const code = `ZC${Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, "0")}`;
  const sent = await call("user", "POST", "/api/challenges", { to: "polish_mod", code, timeSec: 300, incrementSec: 3 });
  check("challenge sent", sent.ok, sent.status);

  type N = { type: string; href: string | null; read: boolean };
  const list = async () => ((await (await call("mod", "GET", "/api/notifications")).json()) as { notifications: N[] }).notifications;
  const entry = (await list()).find((n) => n.type === "challenge" && n.href?.includes(code));
  check("bell entry points at /c/<code>", entry?.href === `/c/${code}` && entry.read === false, entry);

  const page = await call("mod", "GET", `/c/${code}`);
  const html = await page.text();
  check("/c/<code> opens the lobby join flow for the code", page.status === 200 && html.includes(`/lobby?tab=friends&amp;code=${code}`), page.status);

  const legacy = await call("mod", "GET", `/friend?code=${code}`);
  const loc = legacy.headers.get("location") ?? "";
  check("stored /friend?code= link still resolves", legacy.status >= 300 && legacy.status < 400 && loc.includes(`code=${code}`) && loc.includes("tab=friends"), { status: legacy.status, loc });

  const declined = await call("mod", "POST", `/api/challenges/${code}`, { action: "declined" });
  check("challenge declined", declined.ok, declined.status);
  const after = (await list()).find((n) => n.type === "challenge" && n.href === `/c/${code}`);
  check("answering clears the bell entry", after?.read === true, after);

  console.log(failures ? `\n${failures} failed` : "\nall passed");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
