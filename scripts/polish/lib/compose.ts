// ---------------------------------------------------------------------------
// Image work done inside the browser, on a canvas, so the harness needs no
// native image dependency: composing frame strips into one PNG, and pixel
// diffing two frames into changed regions.
//
// A single about:blank page per browser is reused as the workbench.
// ---------------------------------------------------------------------------

import type { Browser, Page } from "@playwright/test";
import type { Rect } from "./probe";

export type Tile = {
  /** base64 image data (no data: prefix) */
  data: string;
  mime?: "image/jpeg" | "image/png";
  label: string;
  /** outlines drawn over the tile, in source-image pixels */
  rects?: (Rect & { color: string })[];
};

const benches = new WeakMap<Browser, Promise<Page>>();

function bench(browser: Browser): Promise<Page> {
  let p = benches.get(browser);
  if (!p) {
    p = browser.newPage().then(async (page) => {
      await page.setContent("<!doctype html><title>bench</title><body style='margin:0'></body>");
      return page;
    });
    benches.set(browser, p);
  }
  return p;
}

const COMPOSE = String.raw`async (o) => {
  function load(t) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error("image decode failed: " + t.label)); };
      img.src = "data:" + (t.mime || "image/jpeg") + ";base64," + t.data;
    });
  }
  var imgs = [];
  for (var i = 0; i < o.tiles.length; i++) imgs.push(await load(o.tiles[i]));
  var src = o.clip || { x: 0, y: 0, w: imgs[0].width, h: imgs[0].height };
  var s = o.scale || 1;
  var tw = Math.round(src.w * s), th = Math.round(src.h * s);
  var gap = 8, lineH = 15, titleH = o.title ? 24 : 0;
  var cols = Math.max(1, Math.min(o.columns || imgs.length, imgs.length));
  var rows = Math.ceil(imgs.length / cols);
  // Labels wrap to the tile width so neighbours never overprint each other.
  var mc = document.createElement("canvas").getContext("2d");
  mc.font = "12px monospace";
  function wrap(text) {
    var words = String(text).split(" "), lines = [], cur = "";
    for (var w = 0; w < words.length; w++) {
      var next = cur ? cur + " " + words[w] : words[w];
      if (mc.measureText(next).width > tw && cur) { lines.push(cur); cur = words[w]; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }
  var wrapped = o.tiles.map(function (t) { return wrap(t.label); });
  var maxLines = wrapped.reduce(function (a, l) { return Math.max(a, l.length); }, 1);
  var labelH = maxLines * lineH + 4;
  var c = document.createElement("canvas");
  c.width = cols * (tw + gap) + gap;
  c.height = titleH + rows * (th + labelH + gap) + gap;
  var g = c.getContext("2d");
  g.fillStyle = "#15171a";
  g.fillRect(0, 0, c.width, c.height);
  g.font = "12px monospace";
  g.textBaseline = "top";
  if (o.title) {
    g.fillStyle = "#e8e8e8";
    g.font = "bold 13px monospace";
    g.fillText(o.title, gap, 6);
    g.font = "12px monospace";
  }
  for (var k = 0; k < imgs.length; k++) {
    var col = k % cols, row = Math.floor(k / cols);
    var x = gap + col * (tw + gap);
    var y = titleH + gap + row * (th + labelH + gap);
    g.fillStyle = "#c8c8c8";
    for (var ln = 0; ln < wrapped[k].length; ln++) g.fillText(wrapped[k][ln], x, y + ln * lineH);
    g.drawImage(imgs[k], src.x, src.y, src.w, src.h, x, y + labelH, tw, th);
    var rects = o.tiles[k].rects || [];
    // Outlines stay inside their own tile even when a box runs off screen.
    g.save();
    g.beginPath();
    g.rect(x, y + labelH, tw, th);
    g.clip();
    for (var r = 0; r < rects.length; r++) {
      var q = rects[r];
      g.strokeStyle = q.color;
      g.lineWidth = 2;
      g.strokeRect(x + (q.x - src.x) * s, y + labelH + (q.y - src.y) * s, q.w * s, q.h * s);
    }
    g.restore();
  }
  return c.toDataURL("image/png").split(",")[1];
}`;

/** Compose tiles into one PNG (returned as a Buffer). */
export async function composeStrip(
  browser: Browser,
  tiles: Tile[],
  opts: { columns?: number; clip?: Rect; scale?: number; title?: string } = {},
): Promise<Buffer> {
  if (!tiles.length) throw new Error("composeStrip: no tiles");
  const page = await bench(browser);
  const b64 = (await page.evaluate(`(${COMPOSE})(${JSON.stringify({ tiles, ...opts })})`)) as string;
  return Buffer.from(b64, "base64");
}

const DIFF = String.raw`async (o) => {
  function load(d, mime) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error("image decode failed")); };
      img.src = "data:" + mime + ";base64," + d;
    });
  }
  var a = await load(o.a, o.amime), b = await load(o.b, o.bmime);
  var W = b.width, H = b.height;
  function pixels(img) {
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var g = c.getContext("2d");
    g.drawImage(img, 0, 0, W, H);
    return g.getImageData(0, 0, W, H).data;
  }
  var pa = pixels(a), pb = pixels(b);
  var cell = o.cell, cw = Math.ceil(W / cell), ch = Math.ceil(H / cell);
  var grid = new Uint8Array(cw * ch);
  var changedPx = 0;
  for (var cy = 0; cy < ch; cy++) {
    for (var cx = 0; cx < cw; cx++) {
      var n = 0, tot = 0;
      for (var y = cy * cell; y < Math.min(H, (cy + 1) * cell); y++) {
        for (var x = cx * cell; x < Math.min(W, (cx + 1) * cell); x++) {
          var i = (y * W + x) * 4;
          var d = Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
          tot++;
          if (d > o.pixelThreshold) n++;
        }
      }
      if (n / tot > o.cellFraction) { grid[cy * cw + cx] = 1; changedPx += n; }
    }
  }
  var seen = new Uint8Array(cw * ch), regions = [];
  for (var s0 = 0; s0 < grid.length; s0++) {
    if (!grid[s0] || seen[s0]) continue;
    var stack = [s0], minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, cells = 0;
    seen[s0] = 1;
    while (stack.length) {
      var p = stack.pop(), px = p % cw, py = (p - px) / cw;
      cells++;
      if (px < minx) minx = px; if (py < miny) miny = py;
      if (px > maxx) maxx = px; if (py > maxy) maxy = py;
      var nb = [p - 1, p + 1, p - cw, p + cw];
      for (var j = 0; j < 4; j++) {
        var q = nb[j];
        if (q < 0 || q >= grid.length) continue;
        if ((j === 0 && px === 0) || (j === 1 && px === cw - 1)) continue;
        if (grid[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (cells >= o.minCells) {
      regions.push({ x: minx * cell, y: miny * cell, w: (maxx - minx + 1) * cell, h: (maxy - miny + 1) * cell, cells: cells });
    }
  }
  regions.sort(function (r1, r2) { return r2.w * r2.h - r1.w * r1.h; });
  return { width: W, height: H, changedFraction: changedPx / (W * H), regions: regions.slice(0, o.maxRegions) };
}`;

export type DiffRegion = Rect & { cells: number; element?: string | null };
export type DiffResult = { width: number; height: number; changedFraction: number; regions: DiffRegion[] };

/**
 * Pixel-diff two images. Defaults are tuned for JPEG screencast frames:
 * a pixel counts as changed when its summed RGB delta exceeds 60 (JPEG noise
 * sits well under that), a 8px cell when more than 8% of its pixels changed,
 * and a region needs at least 2 connected cells.
 */
export async function diffImages(
  browser: Browser,
  a: { data: string; mime?: string },
  b: { data: string; mime?: string },
  opts: { cell?: number; pixelThreshold?: number; cellFraction?: number; minCells?: number; maxRegions?: number } = {},
): Promise<DiffResult> {
  const page = await bench(browser);
  const arg = {
    a: a.data,
    amime: a.mime ?? "image/jpeg",
    b: b.data,
    bmime: b.mime ?? "image/jpeg",
    cell: opts.cell ?? 8,
    pixelThreshold: opts.pixelThreshold ?? 60,
    cellFraction: opts.cellFraction ?? 0.08,
    minCells: opts.minCells ?? 2,
    maxRegions: opts.maxRegions ?? 12,
  };
  return (await page.evaluate(`(${DIFF})(${JSON.stringify(arg)})`)) as DiffResult;
}
