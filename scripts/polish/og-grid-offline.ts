// ---------------------------------------------------------------------------
// Link-preview contact sheet without a server (brief section 19, "verify").
//
// og-grid.ts follows each page's served og:image, which needs the dev server.
// This renders the same family straight from the route modules: every static
// route's card (src/lib/og/pageImage.ts), the codex index and one card per
// family (codexImage.tsx), today's puzzle and one puzzle (puzzleImage.ts),
// and the data-backed cards (game, profile, invite, club, tournament,
// leaderboard) from sample data, since their real data lives in D1. Tiles
// from sample data say so in their caption.
//
//   ./node_modules/.bin/tsx scripts/polish/og-grid-offline.ts --label after
//
// Writes docs/polish-pass/evidence/E2/og-offline-<label>.png (600px tiles),
// og-offline-<label>-400.png (400px tiles, the size of a preview in a phone
// chat) and og-offline-<label>.json (per tile: bytes, render time, size).
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { brandCard, gameCard, inviteCard, pageCard, profileCard } from "../../src/lib/ogCard";
import { fenPieces } from "../../src/lib/og/board";
import { codexImage, codexIndexImage } from "../../src/lib/og/codexImage";
import { staticPageImage } from "../../src/lib/og/pageImage";
import { dailyPuzzleImage, puzzleImage } from "../../src/lib/og/puzzleImage";
import { renderPng } from "../../src/lib/og/render";
import { PAGES, type StaticPath } from "../../src/lib/seoPages";
import { allCardMeta } from "../../src/lib/seoCards";
import { todaysPuzzle } from "../../src/lib/seoPuzzles";

const labelIdx = process.argv.indexOf("--label");
const label = labelIdx > 0 ? process.argv[labelIdx + 1] : "latest";
const OUT = path.join(__dirname, "..", "..", "docs", "polish-pass", "evidence", "E2");

type Tile = { route: string; png: Buffer | null; ms: number; note?: string };

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
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
    if (t.png) layers.push({ input: await sharp(t.png).resize(tileW, tileH, { fit: "fill", kernel: "lanczos3" }).png().toBuffer(), left: x, top: y + cap });
    const capSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${cap}"><text x="0" y="18" fill="#c6c6c6" font-family="sans-serif" font-size="15">${esc(
      `${t.route}${t.note ? ` (${t.note})` : ""}`,
    )}</text></svg>`;
    layers.push({ input: Buffer.from(capSvg), left: x, top: y });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: "#101010" } })
    .composite(layers)
    .png({ compressionLevel: 9, palette: true })
    .toFile(file);
}

async function main() {
  const jobs: { route: string; note?: string; run: () => Promise<Response> }[] = [];
  jobs.push({ route: "/", run: () => renderPng(brandCard(), 60) });
  for (const p of Object.keys(PAGES) as StaticPath[]) {
    if (p === "/codex" || p === "/puzzles" || p === "/leaderboard") continue;
    if (!fs.existsSync(path.join(__dirname, "..", "..", "src", "app", p, "opengraph-image.tsx"))) continue;
    jobs.push({ route: p, run: () => staticPageImage(p) });
  }
  jobs.push({ route: "/codex", run: () => codexIndexImage() });
  const byFamily = new Map<string, string>();
  for (const c of allCardMeta()) {
    const fam = c.path.split("/")[2];
    if (!byFamily.has(fam)) byFamily.set(fam, c.path);
  }
  for (const [fam, p] of byFamily) {
    const id = p.split("/")[3];
    const kind = fam === "nerf" ? "nerf" : "buff";
    const family = fam === "hex" ? "Hex" : fam === "boon" ? "Boon" : undefined;
    jobs.push({ route: p, run: () => codexImage(kind, id, family) });
  }
  jobs.push({ route: "/puzzles", run: () => dailyPuzzleImage() });
  const today = todaysPuzzle();
  if (today) jobs.push({ route: `/puzzles/${today.puzzle.id}`, run: () => puzzleImage(today.puzzle.id) });

  const start = fenPieces("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
  const mid = fenPieces("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R");
  const sample = "sample data";
  jobs.push({
    route: "/game/[id] finished",
    note: sample,
    run: () =>
      renderPng(
        gameCard({
          white: { name: "polish_user", rating: 1532 },
          black: { name: "Timmy", rating: 1488 },
          mode: "buff",
          clock: "5+3",
          rated: true,
          result: "White won, king captured",
          winner: "w",
          pieces: mid,
          lastMove: undefined,
          live: false,
        }),
        60,
      ),
  });
  jobs.push({
    route: "/game/[id] live",
    note: sample,
    run: () =>
      renderPng(
        gameCard({ white: { name: "polish_user", rating: 1532 }, black: { name: "Robert", rating: 1610 }, mode: "nerf", clock: "3+2", rated: true, result: null, winner: null, pieces: start, lastMove: undefined, live: true }),
        60,
      ),
  });
  jobs.push({
    route: "/u/[username]",
    note: sample,
    run: () =>
      renderPng(
        profileCard({
          username: "polish_user",
          avatar: { piece: "n", bg: "#2b3a4a" },
          ratings: [
            { mode: "buff", rating: 1532, games: 41, provisional: false },
            { mode: "nerf", rating: 1466, games: 12, provisional: true },
          ],
          games: 53,
          topCards: [
            { name: "Pawn Storm", tier: 3 },
            { name: "Lucky", tier: 1 },
          ],
        }),
        60,
      ),
  });
  jobs.push({
    route: "/c/[code] challenge",
    note: sample,
    run: () => renderPng(inviteCard({ from: "Joseph", rating: 1540, clock: "5+3", mode: "buff", rated: true, code: "K7Q2M" }), 60),
  });
  jobs.push({
    route: "/c/[code] unknown",
    note: "no data",
    run: () => renderPng(inviteCard({ from: null, rating: null, clock: null, mode: null, rated: null, code: "ZZZZZ" }), 60),
  });
  jobs.push({
    route: "/clubs/[slug]",
    note: sample,
    run: () => renderPng(pageCard({ kicker: "Club", title: "Knight Riders", subtitle: "Weekly Buff mode arenas and a friendly board.", stat: { value: "24", label: "members" } }), 60),
  });
  jobs.push({
    route: "/tournaments/[id]",
    note: sample,
    run: () =>
      renderPng(pageCard({ kicker: "Tournament", title: "Friday Blitz", subtitle: "Starts Sep 25, 7:00 PM UTC, Buff mode, 3+2, Rated", stat: { value: "12/32", label: "players" }, mode: "buff" }), 60),
  });
  jobs.push({
    route: "/leaderboard",
    note: sample,
    run: () => renderPng(pageCard({ kicker: "Leaderboard", title: "The top players", subtitle: "Number one in Buff mode: polish_user", stat: { value: "1532", label: "top rating" } }), 60),
  });

  const tiles: Tile[] = [];
  for (const j of jobs) {
    const t0 = Date.now();
    try {
      const res = await j.run();
      const png = Buffer.from(await res.arrayBuffer());
      tiles.push({ route: j.route, png, ms: Date.now() - t0, note: j.note });
    } catch (e) {
      console.log(`FAIL ${j.route}: ${(e as Error).message}`);
      tiles.push({ route: j.route, png: null, ms: Date.now() - t0, note: "render failed" });
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  await sheet(tiles, 600, 3, path.join(OUT, `og-offline-${label}.png`));
  await sheet(tiles, 400, 4, path.join(OUT, `og-offline-${label}-400.png`));
  const meta = await Promise.all(
    tiles.map(async (t) => {
      const m = t.png ? await sharp(t.png).metadata() : null;
      return { route: t.route, note: t.note ?? null, bytes: t.png?.length ?? 0, width: m?.width ?? null, height: m?.height ?? null, ms: t.ms };
    }),
  );
  fs.writeFileSync(path.join(OUT, `og-offline-${label}.json`), JSON.stringify({ tiles: meta }, null, 2) + "\n");
  const bad = meta.filter((m) => m.width !== 1200 || m.height !== 630);
  console.log(`og-grid-offline: ${tiles.length} cards, ${bad.length} not 1200x630; slowest ${Math.max(...meta.map((m) => m.ms))}ms`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
