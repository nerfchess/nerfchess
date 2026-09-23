// ---------------------------------------------------------------------------
// The state matrix: every dimension the brief (section 3.2) asks for, and how
// to put a browser context into one cell of it.
//
// Settings go through the app's own storage key (dc:settings-v1), exactly as
// playwright.config.ts and e2e/sweep.spec.ts do, because applyUiPrefs is what
// turns them into html[data-theme] / html[data-anim]. Stamping the attributes
// by hand would skip the rest of what applyUiPrefs sets.
//
// Auth comes from the storageState files scripts/polish/seed.ts writes under
// .polish-auth/ (gitignored). Throttling is CDP: Network.emulateNetworkConditions
// with the DevTools "Fast 3G" numbers plus Emulation.setCPUThrottlingRate 4.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { AUTH_DIR, BASE } from "./common";
import { installProbe } from "./probe";

export const VIEWPORTS = ["360x780", "390x844", "768x1024", "1280x800", "1920x1080"] as const;
export const THEMES = ["dark", "light"] as const;
/** full = animationSpeed "normal"; reduced = OS prefers-reduced-motion with the
 *  app's followSystemMotion opt-in on (the only way the OS flag reaches
 *  data-anim, see applyUiPrefs in src/lib/settings.ts). */
export const ANIMS = ["full", "fast", "off", "reduced"] as const;
export const AUTHS = ["signed-out", "guest", "user", "mod", "admin"] as const;
export const NETS = ["normal", "throttled", "fast3g", "cpu4"] as const;

export type Viewport = (typeof VIEWPORTS)[number];
export type Theme = (typeof THEMES)[number];
export type Anim = (typeof ANIMS)[number];
export type Auth = (typeof AUTHS)[number];
export type Net = (typeof NETS)[number];

export type State = { viewport: Viewport; theme: Theme; anim: Anim; auth: Auth; net: Net };

export function stateLabel(s: State): string {
  return `${s.viewport}|${s.theme}|${s.anim}|${s.auth}|${s.net}`;
}

export function parseViewport(v: string): { width: number; height: number } {
  const [w, h] = v.split("x").map(Number);
  return { width: w, height: h };
}

export function cartesian(dims: {
  viewports: Viewport[];
  themes: Theme[];
  anims: Anim[];
  auths: Auth[];
  nets: Net[];
}): State[] {
  const out: State[] = [];
  for (const auth of dims.auths)
    for (const net of dims.nets)
      for (const viewport of dims.viewports)
        for (const theme of dims.themes)
          for (const anim of dims.anims) out.push({ viewport, theme, anim, auth, net });
  return out;
}

export function authFile(auth: Auth): string {
  return path.join(AUTH_DIR, `${auth}.json`);
}

export type StorageState = {
  cookies: {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }[];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
};

export function settingsFor(s: Pick<State, "theme" | "anim">): Record<string, unknown> {
  const settings: Record<string, unknown> = { siteTheme: s.theme };
  if (s.anim === "full") settings.animationSpeed = "normal";
  if (s.anim === "fast") settings.animationSpeed = "fast";
  if (s.anim === "off") settings.animationSpeed = "off";
  if (s.anim === "reduced") {
    settings.animationSpeed = "normal";
    settings.followSystemMotion = true;
  }
  return settings;
}

/**
 * Build the storageState for a cell: the seeded session cookie (if any) plus
 * the settings key. `extraStorage` lets a caller add more localStorage keys.
 */
export function storageStateFor(s: State, extraStorage: Record<string, string> = {}): StorageState {
  let cookies: StorageState["cookies"] = [];
  if (s.auth !== "signed-out") {
    const file = authFile(s.auth);
    if (!fs.existsSync(file)) {
      throw new Error(`no seeded ${s.auth} session at ${file}; run: npm run polish:seed`);
    }
    cookies = (JSON.parse(fs.readFileSync(file, "utf8")) as StorageState).cookies;
  }
  const localStorage = [
    { name: "dc:settings-v1", value: JSON.stringify(settingsFor(s)) },
    ...Object.entries(extraStorage).map(([name, value]) => ({ name, value })),
  ];
  return { cookies, origins: [{ origin: BASE, localStorage }] };
}

export async function newStateContext(
  browser: Browser,
  s: State,
  opts: { probe?: boolean; extraStorage?: Record<string, string> } = {},
): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport: parseViewport(s.viewport),
    reducedMotion: s.anim === "reduced" ? "reduce" : "no-preference",
    colorScheme: s.theme,
    storageState: storageStateFor(s, opts.extraStorage),
  });
  if (opts.probe !== false) await installProbe(ctx);
  return ctx;
}

/** DevTools "Fast 3G" preset (the one Lighthouse used for years). */
const FAST_3G = {
  offline: false,
  latency: 562.5,
  downloadThroughput: Math.round(((1.6 * 1000 * 1000) / 8) * 0.9),
  uploadThroughput: Math.round(((750 * 1000) / 8) * 0.9),
};

/** Apply the cell's network/CPU conditions to a page (call before goto). */
export async function applyNet(page: Page, net: Net): Promise<void> {
  if (net === "normal") return;
  const cdp = await page.context().newCDPSession(page);
  if (net === "throttled" || net === "fast3g") {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", FAST_3G);
  }
  if (net === "throttled" || net === "cpu4") {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
}

/** Open a page in a fresh context for the cell, throttled if asked. */
export async function openCell(
  browser: Browser,
  s: State,
  opts: { probe?: boolean; extraStorage?: Record<string, string> } = {},
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await newStateContext(browser, s, opts);
  const page = await ctx.newPage();
  await applyNet(page, s.net);
  return { ctx, page };
}

/** Navigation timeout that respects throttling (dev bundles are megabytes). */
export function navTimeout(net: Net): number {
  return net === "normal" || net === "cpu4" ? 90_000 : 240_000;
}
