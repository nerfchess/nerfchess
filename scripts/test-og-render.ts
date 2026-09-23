// Link-preview renderer checks (F248, F249, brief section 19). No server.
//
//   ./node_modules/.bin/tsx scripts/test-og-render.ts [--out dir]
//
// 1. Every card in the family renders to a 1200x630 PNG within a second
//    (warm), with the site's Noto Sans (not next/og's default face).
// 2. Any failure answers with the brand card, never an error or a blank:
//    a build that throws, a data read that throws, a layout next/og rejects.
//    The fallback carries a short cache life so the real card replaces it.
// 3. Text that the embedded font cannot draw (emoji, CJK) is dropped, never
//    drawn as empty boxes, and em dashes never reach a card.
// 4. Titles are sized to their line budget from real font metrics, so a long
//    name steps down in size instead of overflowing the frame.
//
// --out writes every rendered card as a PNG for review.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { brandCard, codexCard, gameCard, inviteCard, pageCard, profileCard } from "../src/lib/ogCard";
import { fenPieces } from "../src/lib/og/board";
import { OG_CACHE, ogResponse, renderPng } from "../src/lib/og/render";
import { clamp, fitSize, lineCount, ogText } from "../src/lib/og/text";

let failures = 0;
let checks = 0;
function check(cond: boolean, label: string) {
  checks++;
  if (!cond) {
    failures++;
    console.log(`FAIL  ${label}`);
  }
}

const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;
if (OUT) fs.mkdirSync(OUT, { recursive: true });

function pngSize(buf: Uint8Array) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf[0] === 0x89 && buf[1] === 0x50 ? { w: dv.getUint32(16), h: dv.getUint32(20) } : null;
}

async function main() {
  const start = fenPieces("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
  const cards: Record<string, () => ReturnType<typeof brandCard>> = {
    brand: brandCard,
    page: () => pageCard({ kicker: "Guide", title: "How to play", subtitle: "Capture the king to win. No checkmate, no stalemate." }),
    codex: () =>
      codexCard({ family: "Hex", name: "Heavy Boots", tier: 5, tierLabel: "Tier V, Brutal", mode: "nerf", rule: "Your opponent's pawns cannot double-step." }),
    game: () =>
      gameCard({
        white: { name: "joseph", rating: 1543 },
        black: { name: "timmy", rating: 1610 },
        mode: "buff",
        clock: "5+3",
        rated: true,
        result: "White won, king captured",
        winner: "w",
        pieces: start,
      }),
    profile: () => profileCard({ username: "polish_user", avatar: { piece: "n", bg: "#28604f" }, ratings: [], games: 0, topCards: [] }),
    invite: () => inviteCard({ from: "Joseph", rating: 1543, clock: "5+3", mode: "buff", rated: false, code: "K7Q2M" }),
    inviteLongName: () => inviteCard({ from: "averyveryverylongname", rating: null, clock: "10+0", mode: "nerf", rated: true, code: "ABCDE" }),
  };

  // 1. Every card renders, at size, fast when warm.
  for (const [name, build] of Object.entries(cards)) {
    await renderPng(build(), 60); // warm (fonts, wasm)
    const t0 = Date.now();
    const res = await renderPng(build(), 60);
    const ms = Date.now() - t0;
    const buf = new Uint8Array(await res.arrayBuffer());
    const size = pngSize(buf);
    check(res.status === 200 && res.headers.get("content-type") === "image/png", `${name}: 200 image/png`);
    check(!!size && size.w === 1200 && size.h === 630, `${name}: 1200x630 (got ${JSON.stringify(size)})`);
    check(ms < 1000, `${name}: warm render under 1s (${ms}ms)`);
    check(buf.length > 20_000, `${name}: not blank (${buf.length} bytes)`);
    if (OUT) fs.writeFileSync(path.join(OUT, `${name}.png`), buf);
  }

  // 2. Failures fall back to the brand card with a short cache life.
  const brandBytes = new Uint8Array(await (await renderPng(brandCard(), 60)).arrayBuffer());
  const fallbacks: [string, () => ReturnType<typeof brandCard> | Promise<ReturnType<typeof brandCard>>][] = [
    [
      "build throws",
      () => {
        throw new Error("boom");
      },
    ],
    ["data read rejects", async () => Promise.reject(new Error("D1 unavailable"))],
    // next/og rejects a div with several children and no display: flex.
    ["layout next/og rejects", () => createElement("div", null, createElement("span", null, "a"), createElement("span", null, "b"))],
  ];
  const quiet = console.error;
  console.error = () => {};
  for (const [label, build] of fallbacks) {
    const res = await ogResponse({ build, fallback: brandCard, maxAge: OG_CACHE.static });
    const buf = new Uint8Array(await res.arrayBuffer());
    check(res.status === 200, `${label}: still 200`);
    check(res.headers.get("content-type") === "image/png", `${label}: still a PNG`);
    check(buf.length === brandBytes.length && buf.every((b, i) => b === brandBytes[i]), `${label}: serves the brand card`);
    check(/max-age=60\b/.test(res.headers.get("cache-control") ?? ""), `${label}: short cache (${res.headers.get("cache-control")})`);
  }
  console.error = quiet;
  const ok = await ogResponse({ build: brandCard, fallback: brandCard, maxAge: OG_CACHE.immutable });
  check(new RegExp(`max-age=${OG_CACHE.immutable}\\b`).test(ok.headers.get("cache-control") ?? ""), "success carries its own cache life");

  // 3. Text the font cannot draw is dropped; em dashes never reach a card.
  check(ogText("Club \u{1F451} Kings") === "Club Kings", `emoji dropped (${JSON.stringify(ogText("Club \u{1F451} Kings"))})`);
  check(ogText("\u738b\u306e\u30af\u30e9\u30d6") === "", "CJK-only name leaves nothing to draw (caller falls back)");
  check(ogText("Caf\u00e9 \u0141\u00f3d\u017a") === "Caf\u00e9 \u0141\u00f3d\u017a", "Latin accents kept");
  check(!/\u2014/.test(ogText("a \u2014 b")), "em dash never drawn");
  check(clamp("one two three four five", 12).endsWith("\u2026") && clamp("one two three four five", 12).length <= 12, "clamp ends on a word with an ellipsis");

  // 4. Titles fit their line budget from real metrics.
  const width = 582;
  const long = "averyveryverylongname challenged you";
  const size = fitSize(long, width, 2, [76, 66, 58, 50]);
  check(lineCount(long, size, width, true) <= 2 || size === 50, `long title fits 2 lines (size ${size})`);
  check(fitSize("Lucky", width, 2, [76, 66, 58, 50]) === 76, "short title keeps the largest size");
  check(lineCount("Joseph challenged you", 76, width, true) >= 2, "a title that wraps is counted as wrapping");

  // 5. Every live codex card's preview carries its face icon, not the letter
  //    fallback (overflow faces are named "Sword#1": the base icon plus a
  //    variant the site tints; the preview draws the base icon).
  const { allCardMeta } = await import("../src/lib/seoCards");
  const { codexFaceIcon } = await import("../src/lib/og/codexImage");
  const noIcon = allCardMeta().filter((c) => !codexFaceIcon(c.path.split("/")[3]));
  check(noIcon.length === 0, `every live card has a face icon (${noIcon.length} fall back to a letter, e.g. ${noIcon.slice(0, 3).map((c) => c.path).join(", ")})`);

  console.log(`${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
