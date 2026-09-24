// ---------------------------------------------------------------------------
// Link-preview contact sheet (brief section 19, "verify").
//
// For each route, fetch the page's raw HTML as an unfurl bot would, follow its
// og:image, time the image, and lay every image out in one grid PNG so the
// whole family can be reviewed at once. A second sheet renders every card at
// 400px wide, which is roughly how big a preview shows in a phone chat, so
// legibility is judged at the size people will actually see.
//
//   ./node_modules/.bin/tsx scripts/polish/og-grid.ts --label after
//   ./node_modules/.bin/tsx scripts/polish/og-grid.ts --label after --routes /,/about,/u/polish_user
//
// Writes docs/polish-pass/evidence/E2/og-grid-<label>.png (600px tiles),
// og-grid-<label>-400.png (400px tiles) and og-grid-<label>.json (per route:
// og tags, image status, content type, bytes, render time, cache headers).
// Needs the dev server (POLISH_BASE, default http://localhost:3000).
// ---------------------------------------------------------------------------

import path from "node:path";
import sharp from "sharp";
import { EVIDENCE_DIR, argStr, parseArgs, waitForServer, writeJson } from "./lib/common";
import { UNFURL_UA, fetchPage, fetchRetry, first, local, parseHead, pngSize } from "./lib/seoCrawl";

const args = parseArgs();
const label = argStr(args, "label", "latest");
const DEFAULT_ROUTES = [
  "/",
  "/lobby",
  "/play",
  "/about",
  "/faq",
  "/codex",
  "/codex/buff/pawn_push",
  "/codex/nerf/lucky",
  "/codex/hex/heavy_boots",
  "/codex/boon/extra_glance",
  "/guide",
  "/guide/how-to-play",
  "/tutorial",
  "/puzzles",
  "/leaderboard",
  "/tournaments",
  "/clubs",
  "/tv",
  "/u/polish_user",
  "/game/ZZZZZ",
  "/history/zzzz",
  "/friend",
];
const routes = (args.values.get("routes")?.split(",").map((s) => s.trim()).filter(Boolean) ?? DEFAULT_ROUTES).concat(
  args.values.get("extra")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
);
const OUT = path.join(EVIDENCE_DIR, "E2");

type Tile = {
  route: string;
  pageStatus: number;
  ogImage?: string;
  ogAlt?: string;
  ogTitle?: string;
  status?: number;
  type?: string | null;
  bytes?: number;
  size?: { width: number; height: number } | null;
  firstMs?: number;
  warmMs?: number;
  cacheControl?: string | null;
  png?: Buffer;
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function placeholder(w: number, h: number, text: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#3a1d1b"/><text x="50%" y="50%" fill="#ff7a75" font-family="sans-serif" font-size="${Math.round(w / 22)}" text-anchor="middle">${esc(text)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function sheet(tiles: Tile[], tileW: number, cols: number, file: string) {
  const tileH = Math.round((tileW * 630) / 1200);
  const cap = 26;
  const gap = 12;
  const rows = Math.ceil(tiles.length / cols);
  const W = cols * tileW + (cols + 1) * gap;
  const H = rows * (tileH + cap) + (rows + 1) * gap;
  const layers: sharp.OverlayOptions[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const x = gap + (i % cols) * (tileW + gap);
    const y = gap + Math.floor(i / cols) * (tileH + cap + gap);
    const img = t.png
      ? await sharp(t.png).resize(tileW, tileH, { fit: "fill", kernel: "lanczos3" }).png().toBuffer()
      : await placeholder(tileW, tileH, t.ogImage ? `image ${t.status}` : "no og:image");
    layers.push({ input: img, left: x, top: y + cap });
    const capSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${cap}"><text x="0" y="18" fill="#c6c6c6" font-family="sans-serif" font-size="15">${esc(
      `${t.route}${t.warmMs !== undefined ? `  ${t.firstMs}ms / ${t.warmMs}ms` : ""}`,
    )}</text></svg>`;
    layers.push({ input: Buffer.from(capSvg), left: x, top: y });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: "#101010" } })
    .composite(layers)
    .png({ compressionLevel: 9, palette: true })
    .toFile(file);
  return file;
}

async function main() {
  await waitForServer();
  const tiles: Tile[] = [];
  for (const route of routes) {
    const t: Tile = { route, pageStatus: 0 };
    tiles.push(t);
    try {
      const page = await fetchPage(route, UNFURL_UA);
      t.pageStatus = page.status;
      if (page.status !== 200) continue;
      const h = parseHead(page.html);
      t.ogImage = first(h, "og:image");
      t.ogAlt = first(h, "og:image:alt");
      t.ogTitle = first(h, "og:title");
      if (!t.ogImage) continue;
      const url = local(t.ogImage);
      let t0 = Date.now();
      let res = await fetchRetry(url, { headers: { "user-agent": UNFURL_UA }, signal: AbortSignal.timeout(60_000) });
      let buf = Buffer.from(await res.arrayBuffer());
      t.firstMs = Date.now() - t0;
      // Second fetch: the warm render time (the first includes a dev compile).
      t0 = Date.now();
      res = await fetchRetry(url, { headers: { "user-agent": UNFURL_UA }, signal: AbortSignal.timeout(60_000) });
      buf = Buffer.from(await res.arrayBuffer());
      t.warmMs = Date.now() - t0;
      t.status = res.status;
      t.type = res.headers.get("content-type");
      t.cacheControl = res.headers.get("cache-control");
      t.bytes = buf.length;
      t.size = pngSize(buf);
      if (res.status === 200 && t.size) t.png = buf;
    } catch (e) {
      t.status = -1;
      t.type = (e as Error).message;
    }
    console.log(`${route}  page ${t.pageStatus}  image ${t.status ?? "-"} ${t.size ? `${t.size.width}x${t.size.height}` : ""} ${t.warmMs ?? ""}ms`);
  }
  const a = await sheet(tiles, 600, 3, path.join(OUT, `og-grid-${label}.png`));
  const b = await sheet(tiles, 400, 4, path.join(OUT, `og-grid-${label}-400.png`));
  writeJson(
    path.join(OUT, `og-grid-${label}.json`),
    tiles.map(({ png: _png, ...rest }) => rest),
  );
  console.log(`wrote ${path.relative(process.cwd(), a)} and ${path.relative(process.cwd(), b)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
