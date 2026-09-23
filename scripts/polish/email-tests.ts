// Email and daily-job tests (brief 17.5, slice L).
//
//   ./node_modules/.bin/tsx scripts/polish/email-tests.ts
//
// Runs the real schema (schema.ts plus emailSchema.ts), the real daily job and
// the real templates against an in-memory SQLite database behind a small D1
// shim (node:sqlite), with a fake fetch standing in for Resend. No network, no
// dev server. Covers: exactly-once sending (two runs, and two runs at once),
// unsubscribe respected (settings toggle and signed link), missing key no-ops,
// CASL gates, retry rules, the guest-upgrade registered_at trigger, and
// template rendering (links, escaping, dark mode, plain text, design floor).
import { DatabaseSync } from "node:sqlite";
import { ensureSchema } from "../../src/lib/server/schema";
import { ensureEmailSchema } from "../../src/lib/server/emailSchema";
import { runDailyJob, type DailyJobEnv, WELCOME_WINDOW_MS } from "../../src/lib/server/dailyJob";
import { emailProviderFromEnv, sendEmail } from "../../src/lib/server/email";
import { getEmailPrefs, setEmailSubscribed, unsubscribeWithToken } from "../../src/lib/server/emailPrefs";
import { unsubscribeToken, verifyUnsubscribeToken } from "../../src/lib/email/unsubscribe";
import { renderFounderReport, renderWelcomeEmail } from "../../src/lib/email/templates";

// ---------------------------------------------------------------- D1 shim
type Params = unknown[];
function d1(sqlite: DatabaseSync): D1Database {
  const norm = (p: Params) => p.map((v) => (v === undefined ? null : typeof v === "boolean" ? Number(v) : v)) as never[];
  const prepare = (sql: string) => {
    let params: Params = [];
    const stmt = {
      bind(...p: Params) {
        params = p;
        return stmt;
      },
      async run() {
        const r = sqlite.prepare(sql).run(...norm(params));
        return { success: true, meta: { changes: Number(r.changes) } };
      },
      async all() {
        const s = sqlite.prepare(sql);
        const results = /^\s*(select|with)/i.test(sql) ? s.all(...norm(params)) : (s.run(...norm(params)), []);
        return { success: true, results, meta: {} };
      },
      async first() {
        return (sqlite.prepare(sql).get(...norm(params)) as unknown) ?? null;
      },
    };
    return stmt;
  };
  return {
    prepare,
    async batch(stmts: { all: () => Promise<unknown> }[]) {
      const out = [];
      for (const s of stmts) out.push(await s.all());
      return out;
    },
  } as unknown as D1Database;
}

// ---------------------------------------------------------------- harness
let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`);
}

type Sent = { to: string[]; subject: string; html: string; text: string; headers?: Record<string, string>; idem: string | null };
function fakeResend(status: (n: number) => number = () => 200) {
  const sent: Sent[] = [];
  let calls = 0;
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls++;
    const body = JSON.parse(String(init.body));
    const h = init.headers as Record<string, string>;
    const code = status(calls);
    if (code === 200) sent.push({ ...body, idem: h["Idempotency-Key"] ?? null });
    return new Response(code === 200 ? JSON.stringify({ id: `re_${calls}` }) : "nope", { status: code });
  }) as unknown as typeof fetch;
  return { sent, fetchImpl, calls: () => calls };
}

const quiet = { log: () => {}, warn: () => {} };
const DAY = 24 * 3600 * 1000;

async function freshDb() {
  const sqlite = new DatabaseSync(":memory:");
  const db = d1(sqlite);
  await ensureSchema(db);
  await ensureEmailSchema(db);
  return { sqlite, db };
}

let uid = 0;
function addUser(
  sqlite: DatabaseSync,
  o: { id?: string; name: string; email?: string | null; guest?: boolean; createdAt: number },
): string {
  const id = o.id ?? `u_${++uid}`;
  sqlite
    .prepare(
      `INSERT INTO users (id, username, username_lower, password_hash, email, created_at, is_guest) VALUES (?, ?, ?, 'x', ?, ?, ?)`,
    )
    .run(id, o.name, o.name.toLowerCase(), o.email ?? null, o.createdAt, o.guest ? 1 : 0);
  return id;
}

const baseEnv = (db: D1Database): DailyJobEnv => ({
  DB: db,
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Nerf Chess <hello@nerfchess.test>",
  FOUNDER_REPORT_EMAILS: "founder1@nerfchess.test, founder2@nerfchess.test",
  EMAIL_MAILING_ADDRESS: "PO Box 1, Toronto ON",
  EMAIL_UNSUBSCRIBE_SECRET: "s3cret",
});

async function main() {
  const now = Date.now();

  // ------------------------------------------------ main schema pass carries email
  {
    // ensureSchema alone (no ensureEmailSchema) must create the email columns,
    // table and triggers, since EMAIL_SCHEMA_STATEMENTS sit in ADDITIVE_COLUMNS.
    const sqlite = new DatabaseSync(":memory:");
    await ensureSchema(d1(sqlite));
    const cols = (sqlite.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]).map((c) => c.name);
    const objs = (sqlite.prepare(`SELECT name FROM sqlite_master WHERE name IN ('email_sends', 'trg_users_registered_insert', 'trg_users_registered_upgrade')`).all() as { name: string }[]).map((r) => r.name).sort();
    check("ensureSchema alone adds registered_at and email_opt_out", cols.includes("registered_at") && cols.includes("email_opt_out"), cols);
    check("ensureSchema alone creates email_sends and both triggers", objs.length === 3, objs);
  }

  // ------------------------------------------------ registered_at triggers
  {
    const { sqlite, db } = await freshDb();
    const g = addUser(sqlite, { name: "guesty", guest: true, createdAt: now - 10 * DAY });
    const before = sqlite.prepare(`SELECT registered_at FROM users WHERE id = ?`).get(g) as { registered_at: number | null };
    sqlite.prepare(`UPDATE users SET is_guest = 0, email = 'g@x.test' WHERE id = ?`).run(g);
    const after = sqlite.prepare(`SELECT registered_at, created_at FROM users WHERE id = ?`).get(g) as { registered_at: number; created_at: number };
    check("guest has no registered_at", before.registered_at === null, before);
    check("guest upgrade stamps registered_at now, not the guest created_at", Math.abs(after.registered_at - Date.now()) < 60_000, after);
    const r = addUser(sqlite, { name: "direct", createdAt: now - 3000 });
    const rr = sqlite.prepare(`SELECT registered_at FROM users WHERE id = ?`).get(r) as { registered_at: number };
    check("direct registration gets registered_at = created_at", rr.registered_at === now - 3000, rr);
    void db;
  }

  // ------------------------------------------------ missing key no-ops
  {
    const { sqlite, db } = await freshDb();
    addUser(sqlite, { name: "newbie", email: "newbie@x.test", createdAt: now - 3600_000 });
    const fake = fakeResend();
    const env = { ...baseEnv(db), RESEND_API_KEY: undefined };
    const out = await runDailyJob(env, { now, log: quiet, provider: emailProviderFromEnv(env, { log: quiet, fetchImpl: fake.fetchImpl }), sendGapMs: 0 });
    const claims = (sqlite.prepare(`SELECT COUNT(*) AS n FROM email_sends`).get() as { n: number }).n;
    check("missing RESEND_API_KEY: no request made", fake.calls() === 0, fake.calls());
    check("missing RESEND_API_KEY: nothing claimed, so a later run still welcomes", claims === 0, claims);
    check("missing RESEND_API_KEY: job reports why", out.welcome.status === "skipped" && /RESEND_API_KEY/.test(out.welcome.reason ?? ""), out);
    const direct = await sendEmail({}, { to: ["a@b.test"], subject: "s", html: "h", text: "t" }, { log: quiet, fetchImpl: fake.fetchImpl });
    check("sendEmail without a key returns skipped", !direct.ok && direct.skipped === true && fake.calls() === 0, direct);
    const noFrom = await sendEmail({ RESEND_API_KEY: "k" }, { to: ["a@b.test"], subject: "s", html: "h", text: "t" }, { log: quiet, fetchImpl: fake.fetchImpl });
    check("sendEmail without EMAIL_FROM returns skipped", !noFrom.ok && noFrom.skipped === true && fake.calls() === 0, noFrom);
  }

  // ------------------------------------------------ exactly once
  {
    const { sqlite, db } = await freshDb();
    const a = addUser(sqlite, { name: "Alice", email: "alice@x.test", createdAt: now - 2 * 3600_000 });
    const g = addUser(sqlite, { name: "Bobguest", guest: true, createdAt: now - 20 * DAY });
    sqlite.prepare(`UPDATE users SET is_guest = 0, username = 'Bob', username_lower = 'bob', email = 'bob@x.test' WHERE id = ?`).run(g);
    addUser(sqlite, { name: "Oldtimer", email: "old@x.test", createdAt: now - 5 * DAY });
    addUser(sqlite, { name: "NoMail", createdAt: now - 3600_000 });
    addUser(sqlite, { name: "Guest2", email: null, guest: true, createdAt: now - 3600_000 });
    addUser(sqlite, { id: "hp_bot1", name: "housebot", email: "bot@x.test", createdAt: now - 3600_000 });
    addUser(sqlite, { name: "polish_user", email: "p@x.test", createdAt: now - 3600_000 });
    const fake = fakeResend();
    const env = baseEnv(db);
    const provider = emailProviderFromEnv(env, { log: quiet, fetchImpl: fake.fetchImpl });
    const r1 = await runDailyJob(env, { now, provider, log: quiet, sendGapMs: 0 });
    const welcomes1 = fake.sent.filter((s) => s.subject === "Welcome to Nerf Chess");
    const to1 = welcomes1.map((s) => s.to[0]).sort();
    check("run 1 welcomes exactly the new sign-ups (new and upgraded guest)", JSON.stringify(to1) === JSON.stringify(["alice@x.test", "bob@x.test"]), to1);
    check("run 1 sends one founders' report to both founders", fake.sent.filter((s) => /daily report/.test(s.subject)).length === 1 && r1.report.status === "sent", r1.report);
    const r2 = await runDailyJob(env, { now: now + 3600_000, provider, log: quiet, sendGapMs: 0 });
    const welcomes2 = fake.sent.filter((s) => s.subject === "Welcome to Nerf Chess").length - welcomes1.length;
    check("run 2 (retry, same day) sends no welcome again", welcomes2 === 0 && r2.welcome.sent === 0, r2.welcome);
    check("run 2 (same UTC day) does not resend the report", r2.report.status === "already-sent", r2.report);
    // Double-fired cron: two runs at once over a new sign-up.
    addUser(sqlite, { name: "Carol", email: "carol@x.test", createdAt: now });
    const before = fake.sent.length;
    await Promise.all([
      runDailyJob(env, { now: now + 7200_000, provider, log: quiet, sendGapMs: 0 }),
      runDailyJob(env, { now: now + 7200_000, provider, log: quiet, sendGapMs: 0 }),
    ]);
    const carol = fake.sent.slice(before).filter((s) => s.to[0] === "carol@x.test").length;
    check("two concurrent runs welcome a new account once", carol === 1, carol);
    const a1 = welcomes1.find((s) => s.to[0] === "alice@x.test");
    check("welcome carries an idempotency key per account", a1?.idem === `welcome:${a}`, a1?.idem);
    check(
      "welcome carries RFC 8058 one-click headers",
      !!a1?.headers?.["List-Unsubscribe"]?.includes("/api/email/unsubscribe?u=") &&
        a1?.headers?.["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click",
      a1?.headers,
    );
    const report = fake.sent.find((s) => /daily report/.test(s.subject));
    check("report lists the new sign-ups by name", !!report && /Alice/.test(report.text) && /Bob/.test(report.text) && !/housebot|polish_user/.test(report.text), report?.text);
    check("report goes to both founders", JSON.stringify(report?.to) === JSON.stringify(["founder1@nerfchess.test", "founder2@nerfchess.test"]), report?.to);
    const later = await runDailyJob(env, { now: now + WELCOME_WINDOW_MS + DAY, provider, log: quiet, sendGapMs: 0 });
    check("next day sends a new report", later.report.status === "sent", later.report);
  }

  // ------------------------------------------------ unsubscribe respected
  {
    const { sqlite, db } = await freshDb();
    const dave = addUser(sqlite, { name: "Dave", email: "dave@x.test", createdAt: now - 3600_000 });
    const erin = addUser(sqlite, { name: "Erin", email: "erin@x.test", createdAt: now - 3600_000 });
    const env = baseEnv(db);
    const good = await unsubscribeToken("s3cret", dave);
    check("token verifies for its own account", await verifyUnsubscribeToken("s3cret", dave, good));
    check("token does not verify for another account", !(await verifyUnsubscribeToken("s3cret", erin, good)));
    check("token does not verify under another secret", !(await verifyUnsubscribeToken("other", dave, good)));
    check("tampered token refused", (await unsubscribeWithToken(db, "s3cret", dave, good.slice(0, -1) + "A")) === "invalid" || good.endsWith("A"));
    check("signed link unsubscribes", (await unsubscribeWithToken(db, "s3cret", dave, good)) === "unsubscribed");
    check("no secret configured: link reports unavailable", (await unsubscribeWithToken(db, undefined, dave, good)) === "unavailable");
    await setEmailSubscribed(db, erin, false);
    const prefs = await getEmailPrefs(db, erin);
    check("settings toggle stores the opt-out, email masked", prefs?.subscribed === false && prefs.email === "e***@x.test", prefs);
    const fake = fakeResend();
    await runDailyJob(env, { now, provider: emailProviderFromEnv(env, { log: quiet, fetchImpl: fake.fetchImpl }), log: quiet, sendGapMs: 0 });
    const welcomed = fake.sent.filter((s) => s.subject === "Welcome to Nerf Chess").map((s) => s.to[0]);
    check("opted-out accounts get no welcome (link and toggle)", welcomed.length === 0, welcomed);
    await setEmailSubscribed(db, erin, true);
    await runDailyJob(env, { now: now + 1000, provider: emailProviderFromEnv(env, { log: quiet, fetchImpl: fake.fetchImpl }), log: quiet, sendGapMs: 0 });
    const welcomedAfter = fake.sent.filter((s) => s.subject === "Welcome to Nerf Chess").map((s) => s.to[0]);
    check("turning email back on inside the window welcomes once", JSON.stringify(welcomedAfter) === JSON.stringify(["erin@x.test"]), welcomedAfter);
  }

  // ------------------------------------------------ CASL gates and retries
  {
    const { sqlite, db } = await freshDb();
    addUser(sqlite, { name: "Finn", email: "finn@x.test", createdAt: now - 3600_000 });
    const fake = fakeResend();
    const env = { ...baseEnv(db), EMAIL_MAILING_ADDRESS: "" };
    const out = await runDailyJob(env, { now, provider: emailProviderFromEnv(env, { log: quiet, fetchImpl: fake.fetchImpl }), log: quiet, sendGapMs: 0 });
    check("no mailing address: no welcome (CASL), report still sent", out.welcome.status === "skipped" && out.report.status === "sent" && fake.sent.length === 1, out);
    const env2 = { ...baseEnv(db), EMAIL_UNSUBSCRIBE_SECRET: "" };
    const out2 = await runDailyJob(env2, { now, provider: emailProviderFromEnv(env2, { log: quiet, fetchImpl: fake.fetchImpl }), log: quiet, sendGapMs: 0 });
    check("no unsubscribe secret: no welcome", out2.welcome.status === "skipped" && /UNSUBSCRIBE/.test(out2.welcome.reason ?? ""), out2.welcome);

    const flaky = fakeResend((n) => (n === 1 ? 503 : 200));
    const env3 = { ...baseEnv(db), FOUNDER_REPORT_EMAILS: "" };
    const p3 = emailProviderFromEnv(env3, { log: quiet, fetchImpl: flaky.fetchImpl });
    const o3 = await runDailyJob(env3, { now, provider: p3, log: quiet, sendGapMs: 0 });
    const o4 = await runDailyJob(env3, { now: now + 1000, provider: p3, log: quiet, sendGapMs: 0 });
    check("provider 503: released and sent on the next run", o3.welcome.failed === 1 && o4.welcome.sent === 1 && flaky.sent.length === 1, { o3: o3.welcome, o4: o4.welcome });

    const { sqlite: s2, db: db2 } = await freshDb();
    addUser(s2, { name: "Gil", email: "gil@x.test", createdAt: now - 3600_000 });
    const refuse = fakeResend(() => 422);
    const env5 = { ...baseEnv(db2), FOUNDER_REPORT_EMAILS: "" };
    const p5 = emailProviderFromEnv(env5, { log: quiet, fetchImpl: refuse.fetchImpl });
    await runDailyJob(env5, { now, provider: p5, log: quiet, sendGapMs: 0 });
    await runDailyJob(env5, { now: now + 1000, provider: p5, log: quiet, sendGapMs: 0 });
    check("provider 422 (bad address): tried once, never retried", refuse.calls() === 1, refuse.calls());
  }

  // ------------------------------------------------ templates
  {
    const w = renderWelcomeEmail({
      username: "<b>Zed</b>",
      siteUrl: "https://nerfchess.com",
      footer: {
        reason: "You got this because you just made an account.",
        mailingAddress: "PO Box 1, Toronto ON",
        contact: "hello@nerfchess.com",
        unsubscribeUrl: "https://nerfchess.com/api/email/unsubscribe?u=1&t=abc",
        settingsUrl: "https://nerfchess.com/settings",
      },
    });
    const links = ["/tutorial/first-game", "/tutorial", "/lobby?mode=nerf", "/lobby?mode=buff", "/api/email/unsubscribe?u=1&amp;t=abc"];
    check("welcome html has tutorial, first game, Nerf and Buff mode and unsubscribe links", links.every((l) => w.html.includes(l)), links.filter((l) => !w.html.includes(l)));
    check("welcome text part has the same links", ["/tutorial/first-game", "/lobby?mode=nerf", "/lobby?mode=buff", "/api/email/unsubscribe?u=1&t=abc"].every((l) => w.text.includes(l)));
    check("username is escaped in html", w.html.includes("&lt;b&gt;Zed&lt;/b&gt;") && !w.html.includes("<b>Zed</b>"));
    check("html and text carry the mailing address and contact (CASL)", w.html.includes("PO Box 1, Toronto ON") && w.text.includes("PO Box 1, Toronto ON") && w.text.includes("hello@nerfchess.com"));
    check("dark and light: color-scheme meta and a dark media block", /name="color-scheme" content="light dark"/.test(w.html) && /prefers-color-scheme: dark/.test(w.html) && /\[data-ogsc\]/.test(w.html));
    check("no images required", !/<img\b/i.test(w.html) && !/background-image/i.test(w.html));
    const sizes = [...w.html.matchAll(/(\d+)px\/[\d.]+|font-size: (\d+)px/g)].map((m) => Number(m[1] ?? m[2]));
    check("no text below 13px", sizes.length > 0 && Math.min(...sizes) >= 13, sizes);
    const radii = [...new Set([...w.html.matchAll(/border-radius: (\d+)px/g)].map((m) => m[1]))].sort();
    check("radii are 3px (button) and 7px (box) only", JSON.stringify(radii) === JSON.stringify(["3", "7"]), radii);
    check("no shadows", !/box-shadow|text-shadow/.test(w.html));
    const r = renderFounderReport({
      dateLabel: "2026-09-23",
      siteUrl: "https://nerfchess.com",
      newSignups: { count: 2, usernames: ["a", "b"], more: 0 },
      sections: [{ title: "Totals", rows: [{ label: "Registered", value: 10 }] }, { title: "Empty", rows: [] }],
      problems: [],
      footer: { reason: "internal", mailingAddress: "x", contact: "y" },
    });
    check("report renders html and text, skips empty sections", r.html.includes("Registered") && r.text.includes("Registered: 10") && !r.text.includes("Empty"));
    const all = [w.html, w.text, r.html, r.text].join("\n");
    check("no em dashes in any email", !all.includes("—"));
  }

  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
