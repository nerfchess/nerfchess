// Browser checks for the moderator panel (slice G), run against the shared dev
// server with the seeded polish_mod session (a moderator, not an admin).
//
//   ./node_modules/.bin/tsx scripts/polish/mod-ui-check.ts [--out FILE]
//
// F129: the House personas entry shows for a non-admin moderator, because the
//       page and /api/mod/house/personas admit every moderator.
// F200: switching sections scrolls to the top without a smooth scroll when
//       the Animations setting is off, and with one when it is on.

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launch, BASE, AUTH_DIR, EVIDENCE_DIR } from "./lib/common";

const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;

type Check = { finding: string; id: string; pass: boolean; detail: string };
const checks: Check[] = [];
function check(finding: string, id: string, pass: boolean, detail: unknown) {
  checks.push({ finding, id, pass, detail: typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400) });
  console.log(`${pass ? "PASS" : "FAIL"} [${finding}] ${id}${pass ? "" : `: ${checks[checks.length - 1].detail}`}`);
}

async function run(animationSpeed: "off" | "normal", shot: string | null) {
  const browser = await launch();
  try {
    const context = await browser.newContext({
      storageState: path.join(AUTH_DIR, "mod.json"),
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript((speed) => {
      try {
        const key = "dc:settings-v1";
        const cur = JSON.parse(window.localStorage.getItem(key) ?? "{}");
        window.localStorage.setItem(key, JSON.stringify({ ...cur, animationSpeed: speed, reducedMotion: false, followSystemMotion: false }));
      } catch {}
      const calls: string[] = [];
      (window as unknown as { __scrolls: string[] }).__scrolls = calls;
      const orig = window.scrollTo.bind(window);
      window.scrollTo = ((a?: ScrollToOptions | number, b?: number) => {
        if (typeof a === "object" && a) calls.push(String(a.behavior ?? "auto"));
        return typeof a === "object" ? orig(a) : orig(a ?? 0, b ?? 0);
      }) as typeof window.scrollTo;
    }, animationSpeed);
    const page = await context.newPage();
    await page.goto(`${BASE}/mod`, { waitUntil: "domcontentloaded", timeout: 300_000 });
    const nav = page.getByRole("navigation", { name: "Moderation sections" });
    await nav.waitFor({ state: "visible", timeout: 300_000 });

    const me = await page.evaluate(async () => (await (await fetch("/api/auth/me")).json()) as { user?: { username: string; role?: string; isAdmin?: boolean } });
    const anim = await page.evaluate(() => document.documentElement.getAttribute("data-anim"));

    if (animationSpeed === "normal") {
      const house = nav.locator('a[href="/mod/house"]');
      const visible = (await house.count()) > 0 && (await house.first().isVisible());
      check("F129", `House personas entry shows for ${me.user?.username} (role ${me.user?.role ?? "?"})`, visible, { visible, user: me.user });
      if (shot) await nav.screenshot({ path: shot });
    }

    await page.evaluate(() => {
      (window as unknown as { __scrolls: string[] }).__scrolls.length = 0;
    });
    await nav.getByRole("button", { name: /Audit log/ }).click();
    await page.waitForTimeout(300);
    const scrolls = await page.evaluate(() => (window as unknown as { __scrolls: string[] }).__scrolls.slice());
    const want = animationSpeed === "off" ? "auto" : "smooth";
    check("F200", `section switch scrolls with behavior "${want}" when Animations is ${animationSpeed}`, scrolls.length > 0 && scrolls[scrolls.length - 1] === want, { dataAnim: anim, scrolls });
    await context.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  const dir = path.join(EVIDENCE_DIR, "G");
  mkdirSync(dir, { recursive: true });
  const shotArg = process.argv.indexOf("--shot");
  const shot = shotArg > 0 ? process.argv[shotArg + 1] : null;
  await run("normal", shot);
  await run("off", null);
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
