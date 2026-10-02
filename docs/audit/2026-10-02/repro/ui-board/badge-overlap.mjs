// Measures how much of each on-piece badge rectangle overlaps opaque piece
// pixels, for the default piece set (cburnett) at the default 88% piece fit and
// the 97% "larger pieces" fit, and reports badge sizes in CSS px at the cell
// sizes a 320 and 360 viewport produce. Static geometry only (no browser).
import sharp from "../../../../../node_modules/sharp/lib/index.js";
import fs from "node:fs";
const R = 800; // raster resolution of one square
const SET = process.argv[2] || "cburnett";
const dir = `./public/piece/lichess/${SET}`;
const pieces = ["K","Q","R","B","N","P"].flatMap(t => ["w","b"].map(c => c+t));
// cell px at given viewport: board ~= viewport - ~1.6px (C42: 44.8 at 360)
const cells = { 320: 320/8 - 0.2, 360: 44.8, 390: 390/8 - 0.2 };
// Badges: [name, x0%, y0%, w%, h%] or fixed-px boxes resolved per cell
const badges = (cell) => {
  const px = (p) => (p / cell) * 100;
  return [
    ["countdown chip br (15px fixed)", 100 - px(2) - px(15), 100 - px(2) - px(15), px(15), px(15)],
    ["status chip tr (24%/min17px)", 100 - 2 - Math.max(24, px(17)), 2, Math.max(24, px(17)), Math.max(24, px(17))],
    ["motif badge tr (30%)", 100 - 3 - 30, 3, 30, 30],
    ["motif category chip tr (15%)", 100 - 3 - 15, 33, 15, 15],
    ["empower roundel tr (32%)", 100 - 2 - 32, 2, 32, 32],
    ["empower category chip (15%)", 100 - 2 - 15, 34, 15, 15],
    ["bound sigil tl (26%)", 3, 3, 26, 26],
    ["buckler shield bl (28%)", 5, 100 - 3 - 28, 28, 28],
    ["heater shield bl (38x44%)", 4, 100 - 2 - 44, 38, 44],
    ["blindfold band (84x15%)", 8, 100 - 22 - 15, 84, 15],
    ["ward ring (80x16%)", 10, 100 - 3 - 16, 80, 16],
  ];
};
async function alphaFor(file, fit) {
  const size = Math.round(R * fit);
  const off = Math.round((R - size) / 2);
  const svg = fs.readFileSync(file);
  const piece = await sharp(svg, { density: 300 }).resize(size, size, { fit: "contain", background: { r:0,g:0,b:0,alpha:0 } }).ensureAlpha().raw().toBuffer();
  const a = new Uint8Array(R * R);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) a[(y + off) * R + (x + off)] = piece[(y * size + x) * 4 + 3];
  return a;
}
function overlap(a, [_, x0, y0, w, h]) {
  const X0 = Math.round(x0 / 100 * R), Y0 = Math.round(y0 / 100 * R);
  const X1 = Math.round((x0 + w) / 100 * R), Y1 = Math.round((y0 + h) / 100 * R);
  let on = 0, tot = 0;
  for (let y = Math.max(0,Y0); y < Math.min(R,Y1); y++) for (let x = Math.max(0,X0); x < Math.min(R,X1); x++) { tot++; if (a[y*R+x] > 64) on++; }
  return tot ? on / tot : 0;
}
for (const fit of [0.88, 0.97]) {
  const alphas = {};
  for (const p of pieces) alphas[p] = await alphaFor(`${dir}/${p}.svg`, fit);
  console.log(`\n== set=${SET} piece-fit=${fit*100}% ==`);
  for (const [vw, cell] of Object.entries(cells)) {
    console.log(`-- viewport ${vw}: cell ${cell.toFixed(1)}px`);
    for (const b of badges(cell)) {
      const ov = pieces.map(p => overlap(alphas[p], b));
      const max = Math.max(...ov), mean = ov.reduce((s,v)=>s+v,0)/ov.length;
      const worst = pieces[ov.indexOf(max)];
      console.log(`  ${b[0].padEnd(34)} size ${(b[3]/100*cell).toFixed(1)}x${(b[4]/100*cell).toFixed(1)}px  covers piece: mean ${(mean*100).toFixed(0)}% of badge, worst ${(max*100).toFixed(0)}% (${worst})`);
    }
  }
}
