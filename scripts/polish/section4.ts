// ---------------------------------------------------------------------------
// Brief section 4, measurement only: the post-sign-in bump.
//
//   npm run polish:section4 -- [--auth user,signed-out] [--viewports 1280x800,390x844]
//                              [--net throttled] [--routes section4] [--out section4-before]
//
// Loads /, /lobby, /play, /profile and the bot game page signed in, under
// Fast 3G + 4x CPU, with the layout shift probe and a screencast running.
// For every shift it records the exact nodes that moved (selector, previous
// and current rect, dx/dy/dw/dh), when it happened relative to hydration,
// and which /api response landed just before it (the usual culprit being
// /api/auth/me). Writes, under docs/polish-pass/evidence/<out>/:
//
//   section4.json          every shift with its sources and timing context
//   section4-<vp>.png      per route: the frame as /api/auth/me lands and
//                          1.5s later with every watched box that changed
//                          outlined (red was, blue now), then the largest
//                          layout shift outside that window, same colours
//
// Besides layout-shift entries it watches the boxes of the header and main
// column every frame (see WATCH), because a swapped or resized node is not a
// scored layout shift but is still a visible jump.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { argList, argStr, EVIDENCE_DIR, launch, parseArgs, rel, round, waitForServer, warmRoutes, writeJson } from "./lib/common";
import { composeStrip, type Tile } from "./lib/compose";
import { readProbe, sessionWindowCls, watchBoxes, type ProbeRaw, type Shift } from "./lib/probe";
import { resolveRoutes, SECTION4 } from "./lib/routes";
import { frameAt, frameAfter, startScreencast } from "./lib/screencast";
import { AUTHS, authFile, NETS, navTimeout, openCell, stateLabel, VIEWPORTS, type State } from "./lib/states";
import { seedAll } from "./seed";

/**
 * The boxes watched every frame: the header and two levels under it, and the
 * main column and two levels under it. Layout-shift entries only score nodes
 * that already existed and moved; a header chip that is swapped for a wider
 * one, or a main child that grows, shows up here instead.
 */
const WATCH = ["header", "header > *", "header > * > *", "header > * > * > *", "main", "main > *", "main > * > *"];

type Move = {
  t: number;
  node: string;
  text: string;
  kind: "moved" | "resized" | "inserted" | "removed";
  from: string | null;
  to: string;
  dx?: number;
  dy?: number;
  dw?: number;
  dh?: number;
};

/**
 * Every box change after first paint, as a move list. Changes before first
 * contentful paint are construction, not something anyone saw.
 */
function moves(raw: ProbeRaw): Move[] {
  const paint = raw.marks.fcp ?? raw.marks.firstPaint ?? 0;
  const out: Move[] = [];
  for (const b of raw.boxes) {
    if (b.t <= paint) continue;
    if (b.box === "gone") {
      out.push({ t: b.t, node: `${b.sel} [${b.i}]`, text: "", kind: "removed", from: b.was, to: "gone" });
      continue;
    }
    if (!b.was || b.was === "gone") {
      out.push({ t: b.t, node: b.desc, text: b.text, kind: "inserted", from: null, to: b.box });
      continue;
    }
    const [x0, y0, w0, h0] = b.was.split(",").map(Number);
    const [x1, y1, w1, h1] = b.box.split(",").map(Number);
    const m: Move = { t: b.t, node: b.desc, text: b.text, kind: x0 !== x1 || y0 !== y1 ? "moved" : "resized", from: b.was, to: b.box };
    if (x1 !== x0) m.dx = x1 - x0;
    if (y1 !== y0) m.dy = y1 - y0;
    if (w1 !== w0) m.dw = w1 - w0;
    if (h1 !== h0) m.dh = h1 - h0;
    out.push(m);
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const routes = resolveRoutes(args.values.get("routes"), SECTION4);
  const auths = argList(args, "auth", AUTHS, ["user"]);
  const viewports = argList(args, "viewports", VIEWPORTS, ["1280x800", "390x844"]);
  const nets = argList(args, "net", NETS, ["throttled"]);
  const outDir = path.join(EVIDENCE_DIR, argStr(args, "out", "section4-before"));
  const quiet = Number(argStr(args, "quiet", "4000"));

  await waitForServer();
  if (auths.some((a) => a !== "signed-out" && !fs.existsSync(authFile(a)))) await seedAll();
  await warmRoutes(routes);

  const browser = await launch();
  const results: unknown[] = [];
  const tilesByVp = new Map<string, Tile[]>();
  try {
    for (const net of nets)
      for (const auth of auths)
        for (const viewport of viewports)
          for (const route of routes) {
            const s: State = { viewport, theme: "dark", anim: "full", auth, net };
            const { ctx, page } = await openCell(browser, s, { probe: true });
            await watchBoxes(page, WATCH);
            const rec = await startScreencast(page, { quality: 70 });
            const t = Date.now();
            let error: string | undefined;
            try {
              await page.goto(route, { waitUntil: "load", timeout: navTimeout(net) });
              // Throttled pages with polling never reach network idle; cap it.
              await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
              await page.waitForTimeout(quiet);
            } catch (e) {
              error = (e as Error).message.split("\n")[0];
            }
            const raw = await readProbe(page).catch(() => null);
            const frames = await rec.stop();
            await ctx.close();
            if (!raw) {
              results.push({ route, state: stateLabel(s), error: error ?? "no probe data" });
              console.log(`  ${route} ${stateLabel(s)} ERROR ${error}`);
              continue;
            }
            const api = raw.api;
            const context = (sh: Shift) => {
              const before = api.filter((a) => a.end <= sh.t).sort((a, b) => b.end - a.end)[0];
              return {
                sinceHydratedMs: raw.marks.hydrated !== undefined ? Math.round(sh.t - raw.marks.hydrated) : null,
                lastApiBefore: before ? { url: before.url, endedMsBefore: Math.round(sh.t - before.end) } : null,
              };
            };
            const shifts = raw.shifts
              .filter((x) => !x.hadRecentInput)
              .map((x) => ({ ...x, value: round(x.value), ...context(x) }));
            const me = api.filter((a) => a.url.startsWith("/api/auth/me")).sort((a, b) => a.end - b.end)[0];
            const cls = round(sessionWindowCls(raw.shifts));
            const total = round(shifts.reduce((a, x) => a + x.value, 0));
            results.push({
              route,
              state: stateLabel(s),
              error,
              loadMs: Date.now() - t,
              cls,
              total,
              marks: raw.marks,
              firstAuthMeEnd: me?.end ?? null,
              authMeCalls: api.filter((a) => a.url.startsWith("/api/auth/me")).length,
              shifts,
              boxMoves: moves(raw),
            });
            console.log(
              `  ${route}  ${stateLabel(s)}  CLS ${cls} (sum ${total}, ${shifts.length} shifts)  box changes ${moves(raw).length}  hydrated ${raw.marks.hydrated}ms  /me ${me?.end ?? "-"}ms`,
            );

            // Pictures. First the auth moment: the frame on screen as the
            // first /api/auth/me answer lands, and the frame 1.5s later, with
            // every watched box that changed in between outlined (red where it
            // was, blue where it went). Then, if the largest layout shift falls
            // outside that window, the frames either side of it.
            const tileKey = `${viewport}-${auth}${nets.length > 1 ? "-" + net : ""}`;
            const list = tilesByVp.get(tileKey) ?? [];
            const rectOf = (v: string | null) => {
              if (!v || v === "gone") return null;
              const [x, y, w, h] = v.split(",").map(Number);
              return { x, y, w, h };
            };
            const WINDOW = 1500;
            if (me && frames.length) {
              const at = raw.timeOrigin + me.end;
              const pre = frameAt(frames, at - 1) ?? frames[0];
              const post = frameAt(frames, at + WINDOW) ?? frames[frames.length - 1];
              const changed = moves(raw)
                .filter((m) => m.t >= me.end - 50 && m.t <= me.end + WINDOW && m.kind !== "removed")
                .sort((a, b) => Math.abs(b.dy ?? 0) + Math.abs(b.dh ?? 0) + Math.abs(b.dw ?? 0) - (Math.abs(a.dy ?? 0) + Math.abs(a.dh ?? 0) + Math.abs(a.dw ?? 0)))
                .slice(0, 12);
              const was = changed.map((m) => rectOf(m.from)).filter(Boolean).map((r) => ({ ...r!, color: "#ff3b30" }));
              const now = changed.map((m) => rectOf(m.to)).filter(Boolean).map((r) => ({ ...r!, color: "#0a84ff" }));
              list.push({ data: pre.data, label: `${route}: as the first /api/auth/me lands @${me.end}ms`, rects: was });
              list.push({ data: post.data, label: `+${WINDOW}ms: ${changed.length} boxes changed (red was, blue now)`, rects: [...was, ...now] });
            }
            const big = [...shifts].sort((a, b) => b.value - a.value)[0];
            if (big && frames.length && !(me && big.t >= me.end - 50 && big.t <= me.end + WINDOW)) {
              const at = raw.timeOrigin + big.t;
              const pre = frameAt(frames, at - 1) ?? frames[0];
              const post = frameAfter(frames, at + 1) ?? frames[frames.length - 1];
              const prevRects = big.sources.filter((x) => x.prev).map((x) => ({ ...x.prev!, color: "#ff3b30" }));
              const currRects = big.sources.filter((x) => x.curr).map((x) => ({ ...x.curr!, color: "#0a84ff" }));
              list.push({ data: pre.data, label: `${route}: largest shift ${big.value} @${Math.round(big.t)}ms, before`, rects: prevRects });
              list.push({ data: post.data, label: "after (red prev, blue now)", rects: [...prevRects, ...currRects] });
            }
            tilesByVp.set(tileKey, list);
          }

    fs.mkdirSync(outDir, { recursive: true });
    for (const [vp, tiles] of tilesByVp) {
      const wide = Number(vp.split("x")[0]) > 800;
      // vp here is the tile key: viewport-auth[-net]
      const png = await composeStrip(browser, tiles, {
        columns: wide ? 2 : 4,
        title: `Section 4 bump ${vp}: auth resolve, then largest other shift`,
        scale: wide ? 0.4 : 0.5,
      });
      const file = path.join(outDir, `section4-${vp}.png`);
      fs.writeFileSync(file, png);
      console.log(`[section4] ${rel(file)}`);
    }
  } finally {
    await browser.close();
  }
  const out = writeJson(path.join(outDir, "section4.json"), { generatedAt: new Date().toISOString(), results });
  console.log(`[section4] ${rel(out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
