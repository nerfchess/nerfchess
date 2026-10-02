// Simulates colour-vision deficiency on the board's move-risk dots
// (src/app/globals.css .dot-target / -yellow / -red) composited over the
// default board squares, and reports pairwise CIE76 deltaE. deltaE < ~10 on a
// 19%-radius dot is hard to tell apart at a glance; < ~5 is near-identical.
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const over = (fg: RGB, a: number, bg: RGB): RGB => fg.map((c, i) => c * a + bg[i] * (1 - a)) as RGB;
const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const unlin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
// Machado et al. 2009, severity 1.0
const M: Record<string, number[][]> = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const sim = (c: RGB, m: number[][]): RGB => {
  const l = c.map(lin);
  return m.map((row) => unlin(Math.min(1, Math.max(0, row[0] * l[0] + row[1] * l[1] + row[2] * l[2])))) as RGB;
};
const lab = (c: RGB) => {
  const [r, g, b] = c.map(lin);
  let x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const dE = (a: RGB, b: RGB) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

const dots: Record<string, [RGB, number]> = {
  plain: [[20, 85, 30], 0.5],
  nerfRisk: [[214, 178, 55], 0.75],
  checkRisk: [[199, 56, 48], 0.78],
};
const boards: Record<string, [string, string]> = { midnight: ["#9fa6b2", "#3a3f4b"], classic: ["#f0d9b5", "#b58863"] };
for (const [bn, [l, d]] of Object.entries(boards))
  for (const [sqn, sq] of [["light", hex(l)], ["dark", hex(d)]] as const)
    for (const [mn, m] of Object.entries(M)) {
      const c = Object.fromEntries(Object.entries(dots).map(([k, [rgb, a]]) => [k, sim(over(rgb, a, sq), m)])) as Record<string, RGB>;
      console.log(
        `${bn}/${sqn}/${mn}: plain-vs-nerf ${dE(c.plain, c.nerfRisk).toFixed(1)}  plain-vs-check ${dE(c.plain, c.checkRisk).toFixed(1)}  nerf-vs-check ${dE(c.nerfRisk, c.checkRisk).toFixed(1)}`,
      );
    }
// selected vs last-move tints (sq-sel vs sq-last), same treatment
const sel: [RGB, number] = [[20, 85, 30], 0.5], last: [RGB, number] = [[155, 199, 0], 0.41];
for (const [bn, [l, d]] of Object.entries(boards))
  for (const [sqn, sq] of [["light", hex(l)], ["dark", hex(d)]] as const)
    for (const [mn, m] of Object.entries(M)) {
      const a = sim(over(sel[0], sel[1], sq), m), b = sim(over(last[0], last[1], sq), m), base = sim(sq, m);
      console.log(`${bn}/${sqn}/${mn}: sel-vs-last ${dE(a, b).toFixed(1)}  last-vs-plain-square ${dE(b, base).toFixed(1)}`);
    }
