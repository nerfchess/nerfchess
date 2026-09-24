// ---------------------------------------------------------------------------
// Layout shift probe for Playwright specs (brief section 3.1).
//
//   import { installClsProbe, readCls, throttle } from "./polish/clsProbe";
//
//   test("no bump after sign-in", async ({ page }) => {
//     await installClsProbe(page);            // before the first goto
//     await throttle(page);                   // optional: Fast 3G + 4x CPU
//     await page.goto("/lobby");
//     const cls = await readCls(page);        // settles, then summarizes
//     expect(cls.cls, JSON.stringify(cls.offenders, null, 1)).toBeLessThan(0.01);
//   });
//
// Same probe the polish scripts use (scripts/polish/lib/probe.ts), so a spec
// and `npm run test:cls` always agree on the number. Signed-in states: use the
// storageState files that `npm run polish:seed` writes, via polishAuthState().
// This file is a helper, not a spec, so Playwright does not collect it.
// ---------------------------------------------------------------------------

import type { Page } from "@playwright/test";
import { installProbe, readProbe, settle, summarizeCls, type ClsReport } from "../../scripts/polish/lib/probe";
import { applyNet, storageStateFor, type Anim, type Auth, type Theme } from "../../scripts/polish/lib/states";

export { FINDING_THRESHOLD } from "../../scripts/polish/lib/probe";
export type { ClsReport };

export async function installClsProbe(page: Page): Promise<void> {
  await installProbe(page);
}

export async function throttle(page: Page, mode: "throttled" | "fast3g" | "cpu4" = "throttled"): Promise<void> {
  await applyNet(page, mode);
}

/** Wait for the page to settle, then summarize every shift so far. */
export async function readCls(page: Page, opts: { idleMs?: number; quietMs?: number } = {}): Promise<ClsReport> {
  await settle(page, opts);
  return summarizeCls(await readProbe(page));
}

/**
 * A storageState for test.use(): the seeded session for `auth` plus the app
 * settings for theme and motion. Throws if `npm run polish:seed` has not run.
 */
export function polishAuthState(auth: Auth, opts: { theme?: Theme; anim?: Anim } = {}) {
  return storageStateFor({ viewport: "1280x800", net: "normal", auth, theme: opts.theme ?? "dark", anim: opts.anim ?? "full" });
}
