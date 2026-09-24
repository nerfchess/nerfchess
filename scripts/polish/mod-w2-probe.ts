// Wave 2 mod-area probe: failure states, the card editor's guards, the house
// placeholder height and the persona link, run against the shared dev server
// with the seeded polish_mod session (a moderator, not an admin).
//
//   ./node_modules/.bin/tsx scripts/polish/mod-w2-probe.ts [--out FILE] [--only NAME]

import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { launch, BASE, AUTH_DIR } from "./lib/common";

const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;
const T = 300_000;

type Check = { id: string; pass: boolean; detail: string };
const checks: Check[] = [];
function check(id: string, pass: boolean, detail: unknown) {
  const d = typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 500);
  checks.push({ id, pass, detail: d });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${d}`);
}

async function ctx(browser: Browser, auth: "mod" | "signed-out", width = 1280, height = 800): Promise<BrowserContext> {
  return browser.newContext({
    storageState: auth === "mod" ? path.join(AUTH_DIR, "mod.json") : undefined,
    viewport: { width, height },
  });
}

async function text(page: Page): Promise<string> {
  return (await page.locator("main").first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
}

const tests: Record<string, (b: Browser) => Promise<void>> = {
  // 1. /api/auth/me failing: every gated page stops and offers Retry.
  async meFails(browser) {
    for (const route of ["/mod", "/mod/cards", "/mod/house", "/mod/stats/all"]) {
      const c = await ctx(browser, "mod");
      let fail = true;
      await c.route("**/api/auth/me", (r) => (fail ? r.fulfill({ status: 503, body: "{}" }) : r.continue()));
      const page = await c.newPage();
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: T });
      const retry = page.getByRole("button", { name: "Retry" });
      const shown = await retry.waitFor({ state: "visible", timeout: 60_000 }).then(() => true, () => false);
      check(`me 503 ${route}: Retry shown`, shown, await text(page));
      if (shown) {
        fail = false;
        await retry.click();
        const recovered = await page
          .getByText("This page is for moderators")
          .or(page.locator("nav[aria-label='Moderation sections'], table, h1"))
          .first()
          .waitFor({ timeout: 60_000 })
          .then(() => true, () => false);
        const still = await page.getByText("Could not check your session").count();
        check(`me 503 ${route}: Retry recovers`, recovered && still === 0, await text(page));
      }
      await c.close();
    }
  },

  // 2. The /mod sections whose API fails show an error with Retry.
  async sections(browser) {
    const cases: [string, string][] = [
      ["log", "**/api/mod/log*"],
      ["ideas", "**/api/mod/suggestions*"],
      ["nerfs", "**/api/mod/nerf-feedback*"],
      ["buffs", "**/api/mod/buff-feedback*"],
      ["reports", "**/api/mod/reports*"],
      ["chat", "**/api/mod/chat-flags*"],
      ["players", "**/api/mod/users*"],
      ["controls", "**/api/mod/house"],
    ];
    for (const [hash, glob] of cases) {
      const c = await ctx(browser, "mod");
      await c.route(glob, (r) => (r.request().method() === "GET" ? r.fulfill({ status: 500, body: "{}" }) : r.continue()));
      const page = await c.newPage();
      await page.goto(`${BASE}/mod#${hash}`, { waitUntil: "domcontentloaded", timeout: T });
      const alert = page.getByRole("alert").filter({ hasText: /Could not load/ });
      const ok = await alert.first().waitFor({ timeout: 90_000 }).then(() => true, () => false);
      const hasRetry = ok && (await alert.first().getByRole("button", { name: "Retry" }).count()) > 0;
      check(`section #${hash} API 500: error with Retry`, ok && hasRetry, ok ? await alert.first().innerText() : await text(page));
      await c.close();
    }
  },

  // 3. Card editor: failed overrides GET pauses editing; a failed POST re-enables.
  async cards(browser) {
    {
      const c = await ctx(browser, "mod");
      await c.route("**/api/mod/cards", (r) => (r.request().method() === "GET" ? r.fulfill({ status: 500, body: "{}" }) : r.continue()));
      const page = await c.newPage();
      await page.goto(`${BASE}/mod/cards`, { waitUntil: "domcontentloaded", timeout: T });
      const ok = await page.getByText("Could not load the saved overrides").waitFor({ timeout: 120_000 }).then(() => true, () => false);
      const editButtons = await page.getByRole("button", { name: "Edit" }).count();
      check("cards GET 500: error shown, no Edit buttons", ok && editButtons === 0, { ok, editButtons });
      await c.close();
    }
    {
      const c = await ctx(browser, "mod");
      await c.route("**/api/mod/cards", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
      const page = await c.newPage();
      await page.goto(`${BASE}/mod/cards`, { waitUntil: "domcontentloaded", timeout: T });
      await page.getByRole("button", { name: "Edit" }).first().waitFor({ timeout: 120_000 });
      await page.getByRole("button", { name: "Edit" }).first().click();
      await page.getByRole("button", { name: "Save" }).click();
      await page.waitForTimeout(3000);
      const notice = await page.getByRole("alert").filter({ hasText: "Save failed" }).count();
      const buttons = await page.evaluate(
        "Array.from(document.querySelectorAll('button')).filter(b => /^(Save|Saving…|Cancel)$/.test(b.textContent.trim())).map(b => b.textContent.trim() + (b.disabled ? ':disabled' : ':enabled'))",
      ) as string[];
      const saveEnabled = buttons.includes("Save:enabled");
      const cancelEnabled = buttons.includes("Cancel:enabled");
      check("cards POST aborted: notice, Save and Cancel enabled", notice > 0 && saveEnabled && cancelEnabled, {
        notice,
        saveEnabled,
        cancelEnabled,
        buttons,
      });
      await c.close();
    }
  },

  // 4. Controls: the strength placeholder holds the editor's height; the
  //    persona link shows for a plain moderator.
  async controls(browser) {
    for (const [w, h] of [[360, 780], [1280, 800]]) {
      const c = await ctx(browser, "mod", w, h);
      let release: () => void = () => {};
      const gate = new Promise<void>((res) => (release = res));
      await c.route("**/api/mod/house", async (r) => {
        if (r.request().method() === "GET") await gate;
        await r.continue();
      });
      const page = await c.newPage();
      await page.goto(`${BASE}/mod#controls`, { waitUntil: "domcontentloaded", timeout: T });
      const ed = page.locator("[data-strength-editor]");
      await ed.waitFor({ timeout: 120_000 });
      const note = page.getByText("Notifications", { exact: true }).first();
      await note.waitFor({ timeout: 60_000 });
      const before = await note.boundingBox();
      const sumBefore = await ed.locator("summary").innerText();
      release();
      await page.waitForFunction(() => !/…/.test(document.querySelector("[data-strength-editor] summary")?.textContent ?? "…"), null, { timeout: 60_000 });
      await page.waitForTimeout(500);
      const after = await note.boundingBox();
      const sumAfter = await ed.locator("summary").innerText();
      await ed.locator("summary").click();
      const open = await page.getByRole("button", { name: /Weakened/ }).isVisible();
      const dy = before && after ? Math.round(after.y - before.y) : null;
      check(`controls ${w}: Notifications dy ${dy} when the settings land; editor opens`, dy === 0 && open, {
        dy,
        sumBefore,
        sumAfter,
        open,
      });
      if (w === 1280) {
        const link = await page.getByRole("link", { name: /Open persona editor/ }).count();
        check("controls: persona link shows for polish_mod", link > 0, { link });
      }
      await c.close();
    }
  },

  // 5. /mod/house signed out: Sign in link, and no personas request.
  async house(browser) {
    const c = await ctx(browser, "signed-out");
    const hits: string[] = [];
    c.on("request", (r) => {
      if (r.url().includes("/api/mod/house/personas")) hits.push(r.url());
    });
    await c.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"user":null}' }));
    await c.route("**/api/auth/guest", (r) => r.fulfill({ status: 503, body: "{}" }));
    const page = await c.newPage();
    await page.goto(`${BASE}/mod/house`, { waitUntil: "domcontentloaded", timeout: T });
    await page.getByText("This page is for moderators").waitFor({ timeout: 120_000 });
    const href = await page.getByRole("link", { name: "Sign in" }).last().getAttribute("href");
    await page.waitForTimeout(1500);
    check("house signed out: Sign in link, no personas fetch", href === "/login?next=%2Fmod%2Fhouse" && hits.length === 0, { href, hits: hits.length });
    await c.close();
  },

  // 6. API: audit log paging, group and search; games cursor.
  async api(browser) {
    const c = await ctx(browser, "mod");
    const page = await c.newPage();
    await page.goto(`${BASE}/mod#dashboard`, { waitUntil: "domcontentloaded", timeout: T });
    const r = (await page.evaluate(`(async () => {
      const j = async (u) => {
        const res = await fetch(u);
        return { status: res.status, body: (await res.json()) };
      };
      const first = await j("/api/mod/log");
      const log = (first.body.log) ?? [];
      const next = first.body.next;
      const second = next ? await j(\`/api/mod/log?before=\${next.before}&beforeId=\${encodeURIComponent(next.beforeId)}\`) : null;
      const overlap = second ? (second.body.log).filter(e => log.some(f => f.id === e.id)).length : 0;
      const mid = log[Math.floor(log.length / 2)];
      const tail = mid ? await j(\`/api/mod/log?before=\${mid.created_at}&beforeId=\${encodeURIComponent(mid.id)}\`) : null;
      const tailIds = tail ? tail.body.log.map(e => e.id).join(",") : "";
      const expectIds = mid ? log.slice(log.indexOf(mid) + 1).map(e => e.id).join(",") : "";
      const byName = log[0] ? await j("/api/mod/log?q=" + encodeURIComponent(log[0].mod_name)) : null;
      const byNameOk = byName ? byName.body.log.length > 0 && byName.body.log.every(e => [e.mod_name, e.target_name, e.action, e.note, e.target_ref].some(v => String(v ?? "").toLowerCase().includes(log[0].mod_name.toLowerCase()))) : null;
      const groups = {};
      for (const g of ["ban", "mute", "warn", "role", "queue", "config"]) groups[g] = (await j("/api/mod/log?group=" + g)).body.log.length;
      const group = await j("/api/mod/log?group=config");
      const q = await j("/api/mod/log?q=" + encodeURIComponent("%_"));
      const games = await j("/api/mod/games?limit=5");
      return {
        firstStatus: first.status,
        firstCount: log.length,
        hasNext: !!next,
        secondCount: second ? (second.body.log).length : null,
        overlap,
        groupStatus: group.status,
        groupCount: (group.body.log)?.length,
        qStatus: q.status,
        gamesStatus: games.status,
        gamesKeys: Object.keys(games.body),
        cursorMatches: tailIds === expectIds,
        byNameOk,
        groups,
      };
    })()`)) as { firstStatus: number; overlap: number; groupStatus: number; qStatus: number; gamesKeys: string[]; cursorMatches: boolean; byNameOk: boolean | null };
    check(
      "api: log pages without overlap, group and q answer 200, games has nextBeforeId",
      r.firstStatus === 200 && r.overlap === 0 && r.groupStatus === 200 && r.qStatus === 200 && r.gamesKeys.includes("nextBeforeId") && r.cursorMatches && r.byNameOk !== false,
      r,
    );
    await c.close();
  },
};

async function main() {
  const browser = await launch();
  try {
    for (const [name, fn] of Object.entries(tests)) {
      if (ONLY && !ONLY.split(",").includes(name)) continue;
      try {
        await fn(browser);
      } catch (e) {
        check(`${name} threw`, false, String(e));
      }
    }
  } finally {
    await browser.close();
  }
  if (OUT) writeFileSync(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), checks }, null, 2) + "\n");
  const failed = checks.filter((c) => !c.pass).length;
  console.log(`${checks.length - failed}/${checks.length} passed`);
  process.exitCode = failed ? 1 : 0;
}

void main();
