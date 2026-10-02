// Independent reference move generator (10x12 mailbox), written from scratch for
// the audit. Two rule sets:
//   variant: NerfChess no-card rules (pseudo-legal, king may move into check,
//            castle through/out of/into check; capturing a king ends the game).
//   legal:   standard FIDE legality (used to cross-check the harness itself).
// Board: 120-cell mailbox; piece codes: uppercase white, lowercase black, '.' empty, '#' offboard.

type Pos = { b: string[]; stm: "w" | "b"; K: boolean; Q: boolean; k: boolean; q: boolean; ep: number };
export type RMove = { f: number; t: number; promo?: string; cap?: string; ep?: boolean; castle?: "K" | "Q"; dbl?: boolean };

const N = -10, S = 10, E = 1, W = -1;
const KN = [-21, -19, -12, -8, 8, 12, 19, 21];
const DIAG = [N + E, N + W, S + E, S + W];
const ORTH = [N, S, E, W];

export function parseFen(fen: string): Pos {
  const [pl, stm, cr, ep] = fen.split(/\s+/);
  const b: string[] = new Array(120).fill("#");
  const rows = pl.split("/");
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { for (let i = 0; i < +ch; i++) b[21 + r * 10 + c++] = "."; }
      else b[21 + r * 10 + c++] = ch;
    }
  }
  const epIdx = ep && ep !== "-" ? 21 + (8 - +ep[1]) * 10 + (ep.charCodeAt(0) - 97) : -1;
  return { b, stm: stm as "w" | "b", K: cr.includes("K"), Q: cr.includes("Q"), k: cr.includes("k"), q: cr.includes("q"), ep: epIdx };
}

const isW = (p: string) => p >= "A" && p <= "Z";
const isB = (p: string) => p >= "a" && p <= "z";
const mine = (p: string, c: "w" | "b") => (c === "w" ? isW(p) : isB(p));
const theirs = (p: string, c: "w" | "b") => (c === "w" ? isB(p) : isW(p));

export function sqName(i: number): string {
  const r = Math.floor((i - 21) / 10), c = (i - 21) % 10;
  return "abcdefgh"[c] + (8 - r);
}
export function uci(m: RMove) { return sqName(m.f) + sqName(m.t) + (m.promo ? m.promo.toLowerCase() : ""); }

function attacked(pos: Pos, sq: number, by: "w" | "b"): boolean {
  const b = pos.b;
  // pawns
  if (by === "w") { if (b[sq + 9] === "P" || b[sq + 11] === "P") return true; }
  else { if (b[sq - 9] === "p" || b[sq - 11] === "p") return true; }
  const n = by === "w" ? "N" : "n", k = by === "w" ? "K" : "k";
  const bq = by === "w" ? ["B", "Q"] : ["b", "q"], rq = by === "w" ? ["R", "Q"] : ["r", "q"];
  for (const d of KN) if (b[sq + d] === n) return true;
  for (const d of [...DIAG, ...ORTH]) if (b[sq + d] === k) return true;
  for (const d of DIAG) { let t = sq + d; while (b[t] === ".") t += d; if (bq.includes(b[t])) return true; }
  for (const d of ORTH) { let t = sq + d; while (b[t] === ".") t += d; if (rq.includes(b[t])) return true; }
  return false;
}

export function gen(pos: Pos, mode: "variant" | "legal"): RMove[] {
  const out: RMove[] = [];
  const c = pos.stm, b = pos.b;
  const fwd = c === "w" ? N : S;
  const startRow = c === "w" ? 6 : 1; // mailbox row index (0 = rank 8)
  const promoRow = c === "w" ? 0 : 7;
  const promos = c === "w" ? ["Q", "R", "B", "N"] : ["q", "r", "b", "n"];
  const row = (i: number) => Math.floor((i - 21) / 10);
  for (let f = 21; f < 99; f++) {
    const p = b[f];
    if (p === "#" || p === "." || !mine(p, c)) continue;
    const t = p.toLowerCase();
    const push = (to: number, extra: Partial<RMove> = {}) => {
      const cap = b[to] !== "." ? b[to] : undefined;
      if (row(to) === promoRow && t === "p") for (const pr of promos) out.push({ f, t: to, cap, promo: pr, ...extra });
      else out.push({ f, t: to, cap, ...extra });
    };
    if (t === "p") {
      if (b[f + fwd] === ".") {
        push(f + fwd);
        if (row(f) === startRow && b[f + 2 * fwd] === ".") push(f + 2 * fwd, { dbl: true });
      }
      for (const d of [fwd + E, fwd + W]) {
        if (theirs(b[f + d], c)) push(f + d);
        else if (f + d === pos.ep && b[f + d] === ".") {
          const victim = f + d - fwd;
          if (b[victim] === (c === "w" ? "p" : "P")) out.push({ f, t: f + d, cap: b[victim], ep: true });
        }
      }
    } else if (t === "n" || t === "k") {
      const ds = t === "n" ? KN : [...DIAG, ...ORTH];
      for (const d of ds) { const to = f + d; if (b[to] === "." || theirs(b[to], c)) push(to); }
      if (t === "k") {
        const home = c === "w" ? 95 : 25; // e1 / e8
        if (f === home) {
          const rk = c === "w" ? "R" : "r";
          const canK = c === "w" ? pos.K : pos.k, canQ = c === "w" ? pos.Q : pos.q;
          const opp = c === "w" ? "b" : "w";
          if (canK && b[f + 1] === "." && b[f + 2] === "." && b[f + 3] === rk) {
            if (mode === "variant" || (!attacked(pos, f, opp) && !attacked(pos, f + 1, opp) && !attacked(pos, f + 2, opp)))
              out.push({ f, t: f + 2, castle: "K" });
          }
          if (canQ && b[f - 1] === "." && b[f - 2] === "." && b[f - 3] === "." && b[f - 4] === rk) {
            if (mode === "variant" || (!attacked(pos, f, opp) && !attacked(pos, f - 1, opp) && !attacked(pos, f - 2, opp)))
              out.push({ f, t: f - 2, castle: "Q" });
          }
        }
      }
    } else {
      const ds = t === "b" ? DIAG : t === "r" ? ORTH : [...DIAG, ...ORTH];
      for (const d of ds) {
        let to = f + d;
        while (b[to] === ".") { push(to); to += d; }
        if (theirs(b[to], c)) push(to);
      }
    }
  }
  if (mode === "variant") return out;
  return out.filter((m) => {
    if (m.castle) return true;
    const nx = make(pos, m);
    const ks = nx.b.indexOf(c === "w" ? "K" : "k");
    return ks < 0 || !attacked(nx, ks, nx.stm);
  });
}

export function make(pos: Pos, m: RMove): Pos {
  const b = pos.b.slice();
  const p = b[m.f];
  b[m.t] = m.promo ?? p;
  b[m.f] = ".";
  const c = pos.stm;
  if (m.ep) b[m.t - (c === "w" ? N : S)] = ".";
  if (m.castle === "K") { b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = "."; }
  if (m.castle === "Q") { b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = "."; }
  let { K, Q, k, q } = pos;
  if (p === "K") K = Q = false;
  if (p === "k") k = q = false;
  for (const s of [m.f, m.t]) {
    if (s === 98) K = false; if (s === 91) Q = false; if (s === 28) k = false; if (s === 21) q = false;
  }
  return { b, stm: c === "w" ? "b" : "w", K, Q, k, q, ep: m.dbl ? (m.f + m.t) / 2 : -1 };
}

export function perft(pos: Pos, d: number, mode: "variant" | "legal"): number {
  const ms = gen(pos, mode);
  if (d === 1) return ms.length;
  let n = 0;
  for (const m of ms) {
    if (mode === "variant" && m.cap && m.cap.toLowerCase() === "k") { n += 1; continue; }
    n += perft(make(pos, m), d - 1, mode);
  }
  return n;
}

export function divide(pos: Pos, d: number, mode: "variant" | "legal"): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of gen(pos, mode)) {
    const c = d === 1 || (mode === "variant" && m.cap && m.cap.toLowerCase() === "k") ? 1 : perft(make(pos, m), d - 1, mode);
    out.set(uci(m), (out.get(uci(m)) ?? 0) + c);
  }
  return out;
}
