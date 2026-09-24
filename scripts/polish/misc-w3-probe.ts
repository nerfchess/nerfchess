// Wave 3 misc probe: the /mod/house requests and failure states, the owner
// god panel toggle when its GET fails, and the skeleton minimum duration.
// Runs against the shared dev server with the seeded polish sessions.
//
//   ./node_modules/.bin/tsx scripts/polish/misc-w3-probe.ts [--out FILE] [--only NAME]

import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { launch, BASE, AUTH_DIR } from "./lib/common";

const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;
const T = 300_000;

type Auth = "signed-out" | "user" | "mod" | "admin";
type Check = { id: string; pass: boolean; detail: string };
const checks: Check[] = [];
const data: Record<string, unknown> = {};
function check(id: string, pass: boolean, detail: unknown) {
  const d = typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600);
  checks.push({ id, pass, detail: d });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${d}`);
}

async function ctx(browser: Browser, auth: Auth): Promise<BrowserContext> {
  return browser.newContext({
    storageState: auth === "signed-out" ? undefined : path.join(AUTH_DIR, `${auth}.json`),
    viewport: { width: 1280, height: 800 },
  });
}

async function mainText(page: Page): Promise<string> {
  return (await page.locator("main").first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
}

const tests: Record<string, (b: Browser) => Promise<void>> = {
  // 1. Who asks for the roster, and what each session sees.
  async houseRequests(browser) {
    for (const auth of ["signed-out", "user", "mod", "admin"] as Auth[]) {
      const c = await ctx(browser, auth);
      const page = await c.newPage();
      const personas: number[] = [];
      const bad: string[] = [];
      const consoleErrors: string[] = [];
      page.on("response", (r) => {
        const u = new URL(r.url());
        if (u.pathname === "/api/mod/house/personas") personas.push(r.status());
        if (u.pathname.startsWith("/api/") && r.status() >= 400) bad.push(`${r.status()} ${u.pathname}`);
      });
      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
      });
      const staffCell = auth === "mod" || auth === "admin";
      const roster = staffCell
        ? page.waitForResponse((r) => new URL(r.url()).pathname === "/api/mod/house/personas", { timeout: 240_000 }).catch(() => null)
        : null;
      await page.goto(BASE + "/mod/house", { waitUntil: "domcontentloaded", timeout: T });
      if (roster) await roster;
      await page
        .getByText(/This page is for moderators|\d+ of \d+ personas|Could not load/)
        .first()
        .waitFor({ timeout: 120_000 })
        .catch(() => {});
      await page.waitForTimeout(4000);
      const text = await mainText(page);
      const row = { personas, bad, consoleErrors: consoleErrors.filter((e) => !e.includes("arena.nerfchess.com")), text: text.slice(0, 200) };
      (data.houseRequests ??= {} as Record<string, unknown>);
      (data.houseRequests as Record<string, unknown>)[auth] = row;
      const staff = auth === "mod" || auth === "admin";
      check(
        `house ${auth}: roster requested only for staff, no 4xx`,
        (staff ? personas.length >= 1 && personas.every((st) => st === 200) : personas.length === 0) && row.bad.length === 0 && row.consoleErrors.length === 0,
        row,
      );
      await c.close();
    }
  },

  // 2. A roster load that fails in transit offers Retry, and Retry recovers.
  async houseRetry(browser) {
    const c = await ctx(browser, "mod");
    let fail = true;
    await c.route("**/api/mod/house/personas", (r) =>
      fail && r.request().method() === "GET" ? r.fulfill({ status: 503, body: "{}" }) : r.continue(),
    );
    const page = await c.newPage();
    await page.goto(BASE + "/mod/house", { waitUntil: "domcontentloaded", timeout: T });
    const retry = page.getByRole("button", { name: "Retry" });
    const shown = await retry.waitFor({ timeout: 240_000 }).then(() => true, () => false);
    check("house 503: error with Retry", shown, await mainText(page));
    if (shown) {
      fail = false;
      await retry.click();
      const ok = await page.getByText(/\d+ of \d+ personas/).waitFor({ timeout: 240_000 }).then(() => true, () => false);
      check("house 503: Retry loads the roster", ok, await mainText(page));
    }
    await c.close();
  },

  // 3. The server refusing the roster (403) says so instead of offering a
  //    Retry that can never work.
  async houseDenied(browser) {
    const c = await ctx(browser, "mod");
    await c.route("**/api/mod/house/personas", (r) => r.fulfill({ status: 403, body: '{"error":"forbidden"}' }));
    const page = await c.newPage();
    await page.goto(BASE + "/mod/house", { waitUntil: "domcontentloaded", timeout: T });
    const shown = await page.getByText("Your session can no longer edit house personas").waitFor({ timeout: 240_000 }).then(() => true, () => false);
    const link = await page.getByRole("link", { name: "Sign in again" }).getAttribute("href").catch(() => null);
    check("house 403: denied state with a sign-in link", shown && link === "/login?next=%2Fmod%2Fhouse", { link, text: await mainText(page) });
    await c.close();
  },

  // 4. The owner god panel toggle when its GET fails.
  async godPanel(browser) {
    const c = await ctx(browser, "admin");
    // Present the admin session as the owner account so the section mounts;
    // the god-panel API is mocked, so nothing is written.
    await c.route("**/api/auth/me", async (r) => {
      const res = await r.fetch();
      const body = (await res.json()) as { user?: Record<string, unknown> | null };
      if (body.user) body.user.username = "ilovenewjeans";
      await r.fulfill({ response: res, body: JSON.stringify(body) });
    });
    let fail = true;
    let gets = 0;
    await c.route("**/api/mod/god-panel", (r) => {
      if (r.request().method() !== "GET") return r.fulfill({ status: 200, body: '{"enabled":true}' });
      gets++;
      return fail
        ? r.fulfill({ status: 500, body: "{}" })
        : r.fulfill({ status: 200, contentType: "application/json", body: '{"enabled":false}' });
    });
    const page = await c.newPage();
    await page.goto(BASE + "/mod#controls", { waitUntil: "domcontentloaded", timeout: T });
    // .last(): the controls sit inside an outer <section> that also contains the heading.
    const section = page.locator("section").filter({ has: page.locator("h2", { hasText: /^god panel$/i }) }).last();
    const mounted = await section.waitFor({ timeout: 240_000 }).then(() => true, () => false);
    if (!mounted) {
      check("god panel: section mounts for the owner", false, await mainText(page));
      await c.close();
      return;
    }
    await page.waitForTimeout(4000);
    const failedText = (await section.innerText()).replace(/\s+/g, " ");
    const retry = section.getByRole("button", { name: "Retry" });
    const hasRetry = (await retry.count()) > 0;
    const sw = section.getByRole("switch", { name: "God panel" });
    const disabledWhileFailed = await sw.isDisabled();
    data.godPanelFailed = { text: failedText, hasRetry, disabledWhileFailed, gets };
    check("god panel GET 500: error with Retry, switch disabled", hasRetry && disabledWhileFailed && /Could not load/.test(failedText), data.godPanelFailed);
    if (hasRetry) {
      fail = false;
      await retry.click();
      const recovered = await section.getByText("Off", { exact: true }).waitFor({ timeout: 30_000 }).then(() => true, () => false);
      const after = (await section.innerText()).replace(/\s+/g, " ");
      const enabledNow = !(await sw.isDisabled());
      data.godPanelRecovered = { text: after, enabledNow, gets };
      check("god panel Retry: switch shows Off and is usable", recovered && enabledNow && !/Could not load/.test(after), data.godPanelRecovered);
    }
    await c.close();
  },

  // 5. Skeleton timing on /leaderboard, after hydration: each run clicks the
  //    next rating tab (which clears the rows and fetches that ladder) with
  //    the API answer held back by a set delay, and the page records when the
  //    table skeleton was in the DOM, when it was visible (opacity, since the
  //    CSS show-delay keeps it at 0 for 150ms) and when it left. Times are in
  //    ms from the click.
  async skeletonHold(browser) {
    const rows: Record<string, unknown>[] = [];
    const c = await ctx(browser, "signed-out");
    let delay = 0;
    let answeredAt = 0;
    // Answers come from memory after the warm-up pass, so the set delay is
    // the whole wait and the dev server's compile and query time drop out.
    const cache = new Map<string, string>();
    await c.route((u) => u.pathname === "/api/leaderboard", async (r) => {
      const key = r.request().url();
      let body = cache.get(key);
      if (body === undefined) {
        const res = await r.fetch();
        body = await res.text();
        cache.set(key, body);
      }
      if (delay) await new Promise((s) => setTimeout(s, delay));
      answeredAt = Date.now();
      await r.fulfill({ status: 200, contentType: "application/json", body });
    });
    // A string, not a function: tsx wraps named inner functions in a
    // __name() helper that does not exist in the page.
    await c.addInitScript(`
      window.__skel = [];
      (function tick() {
        var el = document.querySelector("main .skeleton.h-6.w-6");
        var present = !!el;
        var visible = !!el && Number(getComputedStyle(el).opacity) > 0.05;
        var last = window.__skel[window.__skel.length - 1];
        if (!last || last.present !== present || last.visible !== visible) window.__skel.push({ t: Date.now(), present: present, visible: visible });
        requestAnimationFrame(tick);
      })();
    `);
    const page = await c.newPage();
    await page.goto(BASE + "/leaderboard", { waitUntil: "domcontentloaded", timeout: T });
    const tabs = page.getByRole("tablist", { name: "Rating category" }).getByRole("tab");
    await tabs.first().waitFor({ timeout: 240_000 });
    await page.waitForFunction(() => !document.querySelector("main .skeleton.h-6.w-6"), null, { timeout: 240_000 });
    const n = await tabs.count();
    // Warm-up: every ladder once, so each answer is cached.
    for (let k = 1; k <= n; k++) {
      await tabs.nth(k % n).click();
      await page.waitForFunction(() => !document.querySelector("main .skeleton.h-6.w-6"), null, { timeout: 240_000 });
      await page.waitForTimeout(800);
    }
    let i = 0;
    for (const d of [0, 60, 260, 600, 1200, 0, 60, 260, 600, 1200]) {
      i = (i + 1) % n;
      delay = d;
      answeredAt = 0;
      await page.evaluate(() => {
        (window as unknown as { __skel: unknown[] }).__skel = [];
      });
      const clickAt = Date.now();
      await tabs.nth(i).click();
      await page.waitForTimeout(d + 1500);
      const log = (await page.evaluate(() => (window as unknown as { __skel: unknown[] }).__skel)) as {
        t: number;
        present: boolean;
        visible: boolean;
      }[];
      const on = log.find((e) => e.present);
      const vis = log.find((e) => e.visible);
      const off = on ? log.find((e) => e.t >= on.t && !e.present) : undefined;
      const row = {
        delayMs: d,
        answeredMs: answeredAt ? answeredAt - clickAt : null,
        skeletonInMs: on ? on.t - clickAt : null,
        visibleAtMs: vis ? vis.t - clickAt : null,
        goneMs: off ? off.t - clickAt : null,
        visibleForMs: vis && off ? off.t - vis.t : 0,
        goneAfterAnswerMs: off && answeredAt ? off.t - answeredAt : null,
      };
      rows.push(row);
      console.log(`  ${JSON.stringify(row)}`);
    }
    await c.close();
    data.skeletonHold = rows;
    type R = { delayMs: number; visibleAtMs: number | null; visibleForMs: number; goneAfterAnswerMs: number | null };
    const rs = rows as R[];
    const fast = rs.filter((r) => r.delayMs <= 60);
    check("skeleton: a load inside the show-delay never shows it", fast.every((r) => r.visibleAtMs === null), fast);
    const mid = rs.filter((r) => r.delayMs === 260);
    // Visibility is read as opacity > 0.05, a frame or two into the fade, so
    // 400ms on screen reads as roughly 370-400 here.
    check("skeleton: once visible it stays about 400ms", mid.every((r) => r.visibleForMs >= 340), mid);
    const slow = rs.filter((r) => r.delayMs >= 600);
    check("skeleton: a slow load swaps as soon as it lands", slow.every((r) => (r.goneAfterAnswerMs ?? 999) < 120), slow);
  },
};

async function main() {
  const browser = await launch();
  try {
    for (const [name, fn] of Object.entries(tests)) {
      if (ONLY && !ONLY.split(",").includes(name)) continue;
      console.log(`-- ${name}`);
      await fn(browser).catch((e) => check(`${name} threw`, false, String(e).slice(0, 300)));
    }
  } finally {
    await browser.close();
  }
  if (OUT) writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), checks, data }, null, 1));
  const failed = checks.filter((c) => !c.pass).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks pass`);
}

void main();
