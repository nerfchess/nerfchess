"use client";

// ---------------------------------------------------------------------------
// Generated play-signature system ("no card left behind").
//
// The bespoke SIGNATURES table in BoardEffects.tsx hand-crafts ~180 cards;
// this module deterministically manufactures a unique-feeling play animation
// for EVERY remaining buff-family card (~747 total in ALL_BUFFS). It never
// imports from BoardEffects (no cycle): it exposes its own config type
// (GenConfig, structurally compatible with SignatureConfig except that
// `visual` is a rich descriptor object) and its own renderer (GenBurst,
// mirroring SignatureOverlay's { role, delayMs } contract).
//
// How uniqueness works
//   family    — one of 37 choreography concepts, chosen by tier-1 keyword
//               sniffing of the card's name + description (freeze / summon /
//               swap / promote / clock / shield / teleport / pawn / knight /
//               ... ~40 rules), falling back to a per-category default list
//               (hash-picked, so a category is never uniform).
//   variant   — 3-6 structural layouts per family (geometry counts, extra
//               layers, alternate silhouettes), hash-picked.
//   hue/hue2  — a category-keyed base hue, hash-jittered +-22deg, with a
//               hash-spread accent; saturation/lightness deepen with tier.
//   particles, scale, dir, rot — further hash dimensions (shard counts,
//               overall size, spin/sweep direction, layout rotation).
// Any two cards therefore differ in family or, within the same family, in at
// least two visible dimensions; runGenSelfCheck proves it in dev.
//
// Motion rules match effects.css: transform/opacity-only keyframes (all in
// genSignature.css), one-shot `both` fill, whole overlay hidden when animations
// are off in Settings, global html[data-anim] speed clamps apply for free.
// ---------------------------------------------------------------------------

import React from "react";
import type { PieceType } from "@/engine/types";
import { ALL_BUFFS, BUFF_BY_ID } from "@/engine/buffs/library";
import "./genSignature.css";

// The grammar (types, family defs, config derivation, self-check) lives in
// genSignatureCore.ts so build tools can import it without this module's CSS.
// Everything is re-exported here so existing importers keep working.
export * from "./genSignatureCore";
import {
  type GenConfig,
  type GenFamily,
  type GenFinisher,
  type GenGlyph,
  type GenOrdering,
  type GenSoundKey,
  type GenVisual,
  hsl,
  palette,
  clamp,
  FAMILY_DEFS,
} from "./genSignatureCore";

// --- Glyph art -------------------------------------------------------------------

/** Tiny solid emblems (24x24, single path, evenodd). Stylized: they read at
 * 10-60px inside leads and family cores, never as standalone art. */
const GLYPHS: Record<GenGlyph, string> = {
  pawn: "M12 3a3.2 3.2 0 0 0-1.8 5.9C9 9.7 8.2 11.1 8 13.2h8c-.2-2.1-1-3.5-2.2-4.3A3.2 3.2 0 0 0 12 3ZM7 15h10l1.6 4.6H5.4Z",
  knight: "M6.5 20.5h11l-.9-2.8c-.5-1.6.3-3.1.8-4.7.9-2.7-.3-6.2-3.4-7.6L13 3.2l-1.4 2.1-3.7 1.2-1.4 2.8 1.9 1.3 1.7-.7c-.2 2.8-2.7 4.2-3.6 7.1Z",
  rook: "M6 4h2.6v2h2.2V4h2.4v2h2.2V4H18v5l-1.5 1.5v6L18 20H6l1.5-3.5v-6L6 9Z",
  bishop: "M12 3a1.6 1.6 0 0 0-.7 3.1C9.5 7.3 8 9.4 8 12c0 1.7.8 3 2 3.8L9 19h6l-1-3.2c1.2-.8 2-2.1 2-3.8 0-2.6-1.5-4.7-3.3-5.9A1.6 1.6 0 0 0 12 3Z",
  queen: "M4 8l3.5 3L9 5l3 5 3-5 1.5 6L20 8l-2 9H6Zm2 11h12v2H6Z",
  crown: "M4 9l4 3 4-6 4 6 4-3-1.5 8h-13Zm1.5 10h13v2h-13Z",
  star: "M12 2l2.6 6.5 6.4.7-5 4.4 1.6 6.9-5.6-3.7-5.6 3.7 1.6-6.9-5-4.4 6.4-.7Z",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-1-6h2v4h-2Zm0 18h2v4h-2ZM1 11h4v2H1Zm18 0h4v2h-4ZM4.2 5.6 5.6 4.2l2.9 2.8-1.5 1.5Zm11.3 11.4 1.5-1.5 2.8 2.9-1.4 1.4ZM4.2 18.4l2.8-2.9 1.5 1.5-2.9 2.8Zm11.3-11.4 2.9-2.8 1.4 1.4-2.8 2.9Z",
  snow: "M11 2h2v7.2l5-2.9 1 1.7-5 3 5 3-1 1.7-5-2.9V22h-2v-7.2l-5 2.9-1-1.7 5-3-5-3 1-1.7 5 2.9Z",
  gear: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-6h4v3.1l2.7-1.5 2 3.4L16 8.5l2.7 1.5-2 3.5-2.7-1.6V15h-4v-3.1l-2.7 1.6-2-3.5L7.9 8.5 5.3 7l2-3.4L10 5.1Zm2 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-6 8.5h12v2H6Z",
  shield: "M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5Z",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6Z",
  leaf: "M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z",
  drop: "M12 2C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-12Z",
  flame: "M12 2c1 4-3 5.5-3 9a3 3 0 0 0 6 0c0-1.4-.8-2.5-1.4-3.6C15.8 8.6 18 10.6 18 14a6 6 0 0 1-12 0c0-5 4.5-7 6-12Z",
  scroll: "M5 4h11l3 3v11l-3 3H8a3 3 0 0 1-3-3Zm3 5h8v2H8Zm0 4h8v2H8Z",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z",
  die: "M4 4h16v16H4Zm4 3.5A1.5 1.5 0 1 0 8 10a1.5 1.5 0 0 0 0-2.5Zm8 0A1.5 1.5 0 1 0 16 10a1.5 1.5 0 0 0 0-2.5Zm-4 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-4 4A1.5 1.5 0 1 0 8 19a1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
  bell: "M12 2a6 6 0 0 0-6 6v5l-2 4h16l-2-4V8a6 6 0 0 0-6-6Zm-2.5 16h5a2.5 2.5 0 0 1-5 0Z",
  quill: "M20 3c-7 0-12 4-14 12l-2 6 6-2c8-2 10-9 10-16Zm-13 13 7-7-5 8Z",
  hourglass: "M6 2h12v4l-4 6 4 6v4H6v-4l4-6-4-6Zm3 3 3 4 3-4Z",
  eye: "M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7Zm0 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z",
  link: "M8 7h3v2.5H8a2.5 2.5 0 0 0 0 5h3V17H8A5 5 0 0 1 8 7Zm5 0h3a5 5 0 0 1 0 10h-3v-2.5h3a2.5 2.5 0 0 0 0-5h-3Zm-4 4h6v2H9Z",
  feather: "M20 4c-8 0-13 5-14 12l-3 4h4l2-3c7 0 11-6 11-13Zm-12 9 7-7-5 8Z",
  spiral: "M12 4a8 8 0 1 1-8 8h2.5A5.5 5.5 0 1 0 12 6.5 3.5 3.5 0 0 0 8.5 10c0 1 .7 1.8 1.7 2H12v2.5h-2A4.3 4.3 0 0 1 6 10a6 6 0 0 1 6-6Z",
  rune: "M12 2 4 7v10l8 5 8-5V7Zm0 3.2 5 3.1v7.4l-5 3.1-5-3.1V8.3Z",
  prism: "M12 3 2 20h20Zm0 5.4L6.2 18h11.6Z",
  flask: "M10 2h4v2h-1v4l5 9a3 3 0 0 1-2.6 4.5H8.6A3 3 0 0 1 6 17l5-9V4h-1Z",
  banner: "M6 2h12v16l-6-4-6 4Z",
  drum: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3v10c0 1.7-3.6 3-8 3s-8-1.3-8-3Zm2 3 6 4 6-4",
  moon: "M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z",
  skull: "M12 2a8 8 0 0 0-8 8c0 3 1.6 5.4 4 6.8V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.2c2.4-1.4 4-3.8 4-6.8a8 8 0 0 0-8-8ZM9 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-3 5 1.5 3h-3Z",
  shard: "M5 2l15 5-9 15Z",
  wave: "M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3v7H2Z",
};

function Glyph({ glyph, fill, className, style }: { glyph: GenGlyph; fill: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={style}>
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <path d={GLYPHS[glyph]} fill={fill} fillRule="evenodd" />
      </svg>
    </span>
  );
}

// --- Shared primitives -------------------------------------------------------------

interface FamProps {
  v: GenVisual;
  delayMs: number;
}

/** Deterministic layout jitter: pseudo-random 0..span-1 from the card's rot
 * seed and a local index (stable across renders, unique across cards). */
const jit = (v: GenVisual, k: number, span: number): number =>
  ((v.rot * 31 + k * 53 + v.particles * 17) >>> 0) % Math.max(1, span);

type ShardShape = "spike" | "crystal" | "chip" | "petal" | "dot";
const SHARD_SHAPES: Record<ShardShape, string> = {
  spike: "M5 0 8.5 20h-7Z",
  crystal: "M5 0l5 10-5 10-5-10Z",
  chip: "M1.5 4h7v13h-7Z",
  petal: "M5 0c4 6 4 14 0 20-4-6-4-14 0-20Z",
  dot: "M5 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
};

/** Radial burst: `count` shards fly outward, one every `stepMs`. Geometry is
 * static (wrapper rotation); only the shared gsig-shard keyframe animates. */
function Shards({
  v,
  delayMs,
  colors,
  shape = "spike",
  count,
  stepMs = 22,
  sizePct = 9,
  startDeg = 0,
}: FamProps & {
  colors: readonly string[];
  shape?: ShardShape;
  count?: number;
  stepMs?: number;
  sizePct?: number;
  startDeg?: number;
}) {
  const n = Math.max(1, count ?? v.particles);
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="absolute inset-0 block"
          style={{ transform: `rotate(${startDeg + (v.rot % 45) + (360 / n) * i * v.dir}deg)` }}
        >
          <span
            className="absolute left-1/2 top-1/2 block"
            style={{
              width: `${sizePct}%`,
              height: `${sizePct * 2}%`,
              marginLeft: `${-sizePct / 2}%`,
              marginTop: `${-sizePct * 1.7}%`,
            }}
          >
            <span className="gsig-shard block h-full w-full" style={{ animationDelay: `${delayMs + i * stepMs}ms` }}>
              <svg viewBox="0 0 10 20" className="h-full w-full" aria-hidden="true">
                <path d={SHARD_SHAPES[shape]} fill={colors[i % colors.length]} />
              </svg>
            </span>
          </span>
        </span>
      ))}
    </>
  );
}

/** An expanding (or collapsing) outline ring. */
function Ring({
  delayMs,
  color,
  cls = "gsig-ring",
  inset = "6%",
  square = false,
  widthPx = 2.5,
}: {
  delayMs: number;
  color: string;
  cls?: string;
  inset?: string;
  square?: boolean;
  widthPx?: number;
}) {
  return (
    <span
      className={`${cls} absolute block ${square ? "rounded-[18%]" : "rounded-full"}`}
      style={{ inset, border: `${widthPx}px solid ${color}`, animationDelay: `${delayMs}ms` }}
    />
  );
}

/** A filled core dot that pops and fades. */
function Core({ delayMs, color, inset = "34%" }: { delayMs: number; color: string; inset?: string }) {
  return (
    <span
      className="gsig-pop absolute block rounded-full"
      style={{ inset, background: color, animationDelay: `${delayMs}ms` }}
    />
  );
}

// --- Family renderers (per-square, role === "target") ---------------------------
// Each family is ONE parameterized component; variants rewire its geometry
// (counts, layers, mirrored layouts, alternate silhouettes). All animation
// comes from the shared gsig-* classes; colors/rotations are static styles.

function FrostBloom({ v, delayMs }: FamProps) {
  const c = palette(v);
  const points = [4, 6, 8, 5][v.variant % 4];
  return (
    <>
      <Ring delayMs={delayMs} color={c.pale} inset="10%" />
      <Shards v={v} delayMs={delayMs + 40} colors={[c.glow, c.main, c.pale]} shape="crystal" count={points} stepMs={18} sizePct={10} />
      {v.variant >= 2 && (
        <Shards v={v} delayMs={delayMs + 140} colors={[c.pale, c.accent]} shape="crystal" count={points} stepMs={14} sizePct={6} startDeg={180 / points} />
      )}
      <Glyph glyph="snow" fill={c.glow} className="gsig-pop absolute inset-[30%] block" style={{ animationDelay: `${delayMs + 60}ms` }} />
    </>
  );
}

function EmberFall({ v, delayMs }: FamProps) {
  const c = palette(v);
  const cols = 3 + (v.variant % 3);
  return (
    <>
      {v.variant >= 2 && <Core delayMs={delayMs} color={c.glow} inset="38%" />}
      <Glyph glyph="flame" fill={c.main} className="gsig-rise absolute inset-x-[34%] bottom-[18%] block h-[38%]" style={{ animationDelay: `${delayMs + 40}ms` }} />
      {Array.from({ length: cols }, (_, i) => (
        <span
          key={i}
          className="gsig-fall absolute top-[6%] block rounded-full"
          style={{
            left: `${12 + ((i * 76) / Math.max(1, cols - 1) + jit(v, i, 10)) % 80}%`,
            width: "7%",
            height: "7%",
            background: i % 2 ? c.accent : c.glow,
            animationDelay: `${delayMs + 90 + i * 70}ms`,
          }}
        />
      ))}
    </>
  );
}

function StoneCarve({ v, delayMs }: FamProps) {
  const c = { ...palette(v), main: hsl(v.hue, 14, v.light - 8), deep: hsl(v.hue, 12, 30) };
  return (
    <>
      <span className="gsig-crack absolute inset-[18%] block rounded-[14%]" style={{ background: c.main, animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
          <path d="M12 2v7l-4 4 5 3v6M12 9l6 2" stroke={c.deep} strokeWidth={v.variant % 2 ? 2.2 : 1.4} fill="none" strokeLinecap="round" />
        </svg>
      </span>
      <Shards v={v} delayMs={delayMs + 180} colors={[c.main, c.deep, c.pale]} shape="chip" stepMs={16} sizePct={7 + (v.variant % 2) * 2} />
      {v.variant >= 2 && <Ring delayMs={delayMs + 200} color={c.deep} inset="8%" square />}
    </>
  );
}

function Clockwork({ v, delayMs }: FamProps) {
  const c = palette(v);
  const flip = v.dir === -1;
  return (
    <>
      <span className="absolute inset-[14%] block" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
        <Glyph glyph="gear" fill={c.main} className="gsig-tick absolute inset-0 block" style={{ animationDelay: `${delayMs}ms` }} />
      </span>
      {v.variant >= 1 && (
        <span className="absolute left-[58%] top-[54%] block h-[34%] w-[34%]" style={{ transform: flip ? undefined : "scaleX(-1)" }}>
          <Glyph glyph="gear" fill={c.accent} className="gsig-tick absolute inset-0 block" style={{ animationDelay: `${delayMs + 60}ms` }} />
        </span>
      )}
      {Array.from({ length: Math.min(v.particles, 12) }, (_, i) => (
        <span key={i} className="absolute inset-0 block" style={{ transform: `rotate(${(360 / Math.min(v.particles, 12)) * i}deg)` }}>
          <span
            className="gsig-pop absolute left-[47.5%] top-[2%] block h-[6%] w-[5%]"
            style={{ background: v.variant === 2 && i % 2 ? c.accent : c.deep, animationDelay: `${delayMs + i * 55}ms` }}
          />
        </span>
      ))}
    </>
  );
}

function Hourglass({ v, delayMs }: FamProps) {
  const c = palette(v);
  return (
    <>
      <Glyph glyph="hourglass" fill={c.main} className="gsig-drop absolute inset-x-[32%] top-[14%] block h-[46%]" style={{ animationDelay: `${delayMs}ms` }} />
      <span
        className="gsig-drain absolute left-[46%] top-[36%] block w-[8%]"
        style={{ height: "26%", background: c.accent, animationDelay: `${delayMs + 260}ms` }}
      />
      {v.variant >= 1 && <Ring delayMs={delayMs + 340} color={c.pale} inset="16%" />}
      {v.variant === 2 && (
        <Glyph glyph="moon" fill={c.accent} className="gsig-rise absolute left-[12%] top-[52%] block h-[22%] w-[22%]" style={{ animationDelay: `${delayMs + 300}ms` }} />
      )}
    </>
  );
}

function ArcaneRunes({ v, delayMs }: FamProps) {
  const c = palette(v);
  const marks = Math.min(v.particles, 9);
  return (
    <>
      <span className={`absolute inset-[8%] block ${v.dir === 1 ? "gsig-spin" : "gsig-spin-ccw"}`} style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke={c.main} strokeWidth="2" strokeDasharray={v.variant % 2 ? "5 4" : "9 3"} />
          {v.variant >= 2 && <circle cx="20" cy="20" r="11" fill="none" stroke={c.accent} strokeWidth="1.4" strokeDasharray="3 5" />}
        </svg>
      </span>
      {Array.from({ length: marks }, (_, i) => (
        <span key={i} className="absolute inset-0 block" style={{ transform: `rotate(${(360 / marks) * i * v.dir + v.rot}deg)` }}>
          <span className="gsig-twinkle absolute left-[46%] top-[6%] block h-[9%] w-[8%]" style={{ background: c.glow, animationDelay: `${delayMs + 80 + i * 45}ms` }} />
        </span>
      ))}
      <Glyph glyph={v.glyph} fill={c.accent} className="gsig-stamp absolute inset-[32%] block" style={{ animationDelay: `${delayMs + 140}ms` }} />
    </>
  );
}

function HexSigil({ v, delayMs }: FamProps) {
  const c = palette(v);
  const drips = Math.min(v.particles, 5);
  return (
    <>
      <span className="gsig-stamp absolute inset-[16%] block" style={{ transform: `rotate(${(v.rot % 30) - 15}deg)`, animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
          <path d="M12 1 22 8l-4 13H6L2 8Z" fill="none" stroke={c.main} strokeWidth="2.2" strokeLinejoin="round" />
          <path d={GLYPHS[v.glyph]} fill={c.accent} fillRule="evenodd" transform="translate(6 6) scale(0.5)" />
        </svg>
      </span>
      {v.variant >= 2 && <Ring delayMs={delayMs + 60} color={c.deep} inset="4%" square={v.variant === 3} />}
      {Array.from({ length: drips }, (_, i) => (
        <span
          key={i}
          className="gsig-fall absolute block rounded-full"
          style={{
            left: `${18 + ((i * 64) / Math.max(1, drips - 1) + jit(v, i + 3, 8)) % 72}%`,
            top: "58%",
            width: "6%",
            height: "9%",
            background: i % 2 ? c.deep : c.main,
            animationDelay: `${delayMs + 220 + i * 80}ms`,
          }}
        />
      ))}
    </>
  );
}

function PawnTide({ v, delayMs }: FamProps) {
  const c = palette(v);
  const rows = Math.min(v.particles, 4);
  const down = v.variant === 3;
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          className={`${down ? "gsig-fall" : "gsig-rise"} absolute inset-x-[16%] block`}
          style={{ top: `${20 + i * 18}%`, height: "16%", animationDelay: `${delayMs + i * 95}ms` }}
        >
          <svg viewBox="0 0 40 12" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path
              d={down ? "M2 2 20 10 38 2 38 5 20 13 2 5Z" : "M2 10 20 2 38 10 38 7 20 -1 2 7Z"}
              fill={i % 2 ? c.accent : c.main}
            />
          </svg>
        </span>
      ))}
      {v.variant >= 1 && (
        <Glyph glyph="pawn" fill={c.glow} className={`${down ? "gsig-fall" : "gsig-rise"} absolute inset-x-[38%] top-[34%] block h-[26%]`} style={{ animationDelay: `${delayMs + rows * 95}ms` }} />
      )}
    </>
  );
}

function KnightVault({ v, delayMs }: FamProps) {
  const c = palette(v);
  const prints = Math.min(v.particles, 5);
  const mirror = v.dir === -1;
  return (
    <>
      <span className="absolute inset-0 block" style={{ transform: mirror ? "scaleX(-1)" : undefined }}>
        {Array.from({ length: prints }, (_, i) => {
          const t = i / Math.max(1, prints - 1);
          return (
            <span
              key={i}
              className="gsig-pop absolute block rounded-full"
              style={{
                left: `${10 + t * 66}%`,
                top: `${64 - Math.sin(t * Math.PI) * 42}%`,
                width: "10%",
                height: "12%",
                background: i === prints - 1 ? c.accent : c.main,
                animationDelay: `${delayMs + i * 70}ms`,
              }}
            />
          );
        })}
        <Ring delayMs={delayMs + prints * 70} color={c.pale} inset="22%" />
        {v.variant >= 1 && (
          <Glyph glyph="knight" fill={c.deep} className="gsig-drop absolute right-[8%] top-[30%] block h-[36%] w-[36%]" style={{ animationDelay: `${delayMs + prints * 70 + 40}ms` }} />
        )}
      </span>
      {v.variant === 2 && <Shards v={v} delayMs={delayMs + prints * 70 + 90} colors={[c.pale, c.main]} shape="dot" count={5} sizePct={5} />}
    </>
  );
}

function RookRampart({ v, delayMs }: FamProps) {
  const c = palette(v);
  const merlons = 2 + (v.variant % 3);
  const teeth = merlons * 2 - 1;
  const step = 36 / teeth;
  const battlement =
    `M2 26V8` +
    Array.from({ length: teeth }, (_, i) => `${i % 2 === 0 ? "v-6" : "v6"}h${step.toFixed(2)}`).join("") +
    `${teeth % 2 === 1 ? "v6" : ""}V26Z`;
  return (
    <>
      <span className="gsig-grow absolute inset-x-[14%] bottom-[12%] block h-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 26" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d={battlement} fill={c.main} />
          <path d="M8 26v-7h5v7Zm12 0v-7h5v7Z" fill={c.deep} />
        </svg>
      </span>
      <span className="gsig-pop absolute inset-x-[10%] bottom-[8%] block h-[8%] rounded-full" style={{ background: c.pale, animationDelay: `${delayMs + 60}ms` }} />
      {v.variant === 3 && (
        <Glyph glyph="rook" fill={c.accent} className="gsig-rise absolute inset-x-[36%] top-[10%] block h-[26%]" style={{ animationDelay: `${delayMs + 260}ms` }} />
      )}
    </>
  );
}

function BishopCross({ v, delayMs }: FamProps) {
  const c = palette(v);
  const beams = v.variant === 2 ? [45, -45, 0, 90] : [45, -45];
  return (
    <>
      {beams.map((deg, i) => (
        <span key={i} className="absolute inset-0 block" style={{ transform: `rotate(${deg * v.dir}deg)` }}>
          <span
            className="gsig-snap absolute inset-x-[4%] top-1/2 block"
            style={{ height: "9%", marginTop: "-4.5%", background: i % 2 ? c.accent : c.main, animationDelay: `${delayMs + i * 90}ms` }}
          />
        </span>
      ))}
      {v.variant >= 1 && (
        <>
          <span className="gsig-twinkle absolute left-[42%] top-[42%] block h-[16%] w-[16%] rounded-full" style={{ background: c.glow, animationDelay: `${delayMs + 180}ms` }} />
          <Ring delayMs={delayMs + 220} color={c.pale} inset="18%" />
        </>
      )}
    </>
  );
}

function QueenRadiance({ v, delayMs }: FamProps) {
  const c = palette(v);
  return (
    <>
      <Core delayMs={delayMs} color={c.glow} inset="36%" />
      <Shards v={v} delayMs={delayMs + 50} colors={[c.main, c.accent, c.glow]} shape="spike" stepMs={12} sizePct={8 + (v.variant % 2) * 3} />
      <Ring delayMs={delayMs + 120} color={c.main} cls={v.variant === 2 ? "gsig-shock" : "gsig-ring"} inset="4%" />
      {v.variant >= 1 && (
        <Glyph glyph={v.glyph} fill={c.deep} className="gsig-rise absolute inset-x-[36%] top-[30%] block h-[30%]" style={{ animationDelay: `${delayMs + 160}ms` }} />
      )}
    </>
  );
}

function KingsDecree({ v, delayMs }: FamProps) {
  const c = palette(v);
  const ribbons = Math.min(v.particles, 4);
  return (
    <>
      <span className="gsig-stamp absolute inset-[24%] block rounded-full" style={{ background: c.main, animationDelay: `${delayMs}ms` }}>
        <Glyph glyph="crown" fill={c.glow} className="absolute inset-[18%] block" />
      </span>
      <Ring delayMs={delayMs + 90} color={c.deep} inset="14%" />
      {Array.from({ length: ribbons }, (_, i) => (
        <span
          key={i}
          className="gsig-fall absolute block"
          style={{
            left: `${24 + ((i * 52) / Math.max(1, ribbons - 1) + jit(v, i, 8)) % 60}%`,
            top: "56%",
            width: "6%",
            height: "18%",
            background: i % 2 ? c.accent : c.deep,
            transform: `rotate(${(jit(v, i + 5, 30) - 15) * 1}deg)`,
            animationDelay: `${delayMs + 220 + i * 70}ms`,
          }}
        />
      ))}
      {v.variant === 2 && <Ring delayMs={delayMs + 260} color={c.accent} inset="2%" square />}
    </>
  );
}

function CrownGleam({ v, delayMs }: FamProps) {
  const c = palette(v);
  const gleams = Math.min(v.particles, 5);
  return (
    <>
      <Glyph glyph={v.glyph} fill={c.main} className="gsig-rise absolute inset-x-[28%] top-[26%] block h-[42%]" style={{ animationDelay: `${delayMs}ms` }} />
      {Array.from({ length: gleams }, (_, i) => (
        <span
          key={i}
          className="gsig-twinkle absolute block"
          style={{
            left: `${14 + jit(v, i, 68)}%`,
            top: `${12 + jit(v, i + 7, 54)}%`,
            width: "10%",
            height: "10%",
            animationDelay: `${delayMs + 110 + i * 85}ms`,
          }}
        >
          <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
            <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" fill={i % 2 ? c.accent : c.glow} />
          </svg>
        </span>
      ))}
      {v.variant >= 2 && <Ring delayMs={delayMs + 120} color={c.pale} inset="12%" />}
      {v.variant === 3 && <Core delayMs={delayMs + 40} color={c.glow} inset="40%" />}
    </>
  );
}

function BannerRally({ v, delayMs }: FamProps) {
  const c = palette(v);
  const left = v.dir === 1;
  return (
    <>
      <span
        className="gsig-grow absolute bottom-[12%] block w-[5%]"
        style={{ left: left ? "24%" : "71%", height: "64%", background: c.deep, animationDelay: `${delayMs}ms` }}
      />
      <span
        className="gsig-unfurl absolute top-[16%] block h-[24%] w-[42%]"
        style={{ left: left ? "28%" : undefined, right: left ? undefined : "28%", transform: left ? undefined : "scaleX(-1)", animationDelay: `${delayMs + 200}ms` }}
      >
        <svg viewBox="0 0 40 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d={v.variant % 2 ? "M0 0h40l-8 10 8 10H0Z" : "M0 0h40L28 20H0Z"} fill={c.main} />
          {v.variant >= 2 && <circle cx="13" cy="9" r="5" fill={c.accent} />}
        </svg>
      </span>
      {v.variant >= 1 && (
        <span className="gsig-pop absolute bottom-[8%] block h-[7%] rounded-full" style={{ left: "16%", right: "16%", background: c.pale, animationDelay: `${delayMs + 80}ms` }} />
      )}
    </>
  );
}

function DrumShock({ v, delayMs }: FamProps) {
  const c = palette(v);
  const rings = Math.min(v.particles + 1, 4);
  return (
    <>
      <Glyph glyph="drum" fill={c.main} className="gsig-drop absolute inset-x-[32%] top-[26%] block h-[38%]" style={{ animationDelay: `${delayMs}ms` }} />
      {Array.from({ length: rings }, (_, i) => (
        <Ring key={i} delayMs={delayMs + 240 + i * 110} color={i % 2 ? c.accent : c.deep} cls="gsig-shock" inset="12%" square={v.variant === 2} widthPx={3} />
      ))}
      {v.variant >= 1 && <Shards v={v} delayMs={delayMs + 300} colors={[c.pale]} shape="dot" count={6} sizePct={4} />}
    </>
  );
}

function ShieldDome({ v, delayMs }: FamProps) {
  const c = palette(v);
  const ribs = 2 + (v.variant % 3);
  return (
    <>
      {Array.from({ length: ribs }, (_, i) => (
        <span key={i} className="gsig-grow absolute bottom-[16%] block" style={{ inset: `${16 + i * 12}% ${16 + i * 12}% 16%`, animationDelay: `${delayMs + i * 90}ms` }}>
          <svg viewBox="0 0 40 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M2 24C2 10 10 2 20 2s18 8 18 22" fill="none" stroke={i % 2 ? c.accent : c.main} strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <Glyph glyph="shield" fill={c.glow} className="gsig-pop absolute inset-[34%] block" style={{ animationDelay: `${delayMs + ribs * 90}ms` }} />
      {v.variant === 3 && <Ring delayMs={delayMs + ribs * 90 + 60} color={c.pale} inset="8%" />}
    </>
  );
}

function ThornRing({ v, delayMs }: FamProps) {
  const c = palette(v);
  return (
    <>
      <span className="gsig-stamp absolute inset-[10%] block" style={{ transform: `rotate(${v.rot % 90}deg)`, animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="14" fill="none" stroke={c.deep} strokeWidth="2.4" />
          {Array.from({ length: v.variant === 2 ? 10 : 7 }, (_, i) => {
            const a = ((Math.PI * 2) / (v.variant === 2 ? 10 : 7)) * i;
            const x = 20 + Math.cos(a) * 14;
            const y = 20 + Math.sin(a) * 14;
            const xo = 20 + Math.cos(a + 0.35) * 19;
            const yo = 20 + Math.sin(a + 0.35) * 19;
            return <path key={i} d={`M${x} ${y} L${xo} ${yo}`} stroke={c.deep} strokeWidth="2" strokeLinecap="round" />;
          })}
        </svg>
      </span>
      <Shards v={v} delayMs={delayMs + 160} colors={[c.main, c.accent]} shape="petal" stepMs={20} sizePct={6} />
      {v.variant >= 1 && (
        <Glyph glyph="leaf" fill={c.main} className="gsig-rise absolute left-[38%] top-[34%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs + 240}ms` }} />
      )}
    </>
  );
}

function ChainSnap({ v, delayMs }: FamProps) {
  const c = palette(v);
  const deg = [0, 90, 45][v.variant % 3] * v.dir;
  const links = Math.min(v.particles, 6);
  return (
    <>
      <span className="absolute inset-0 block" style={{ transform: `rotate(${deg}deg)` }}>
        <span className="gsig-snap absolute inset-x-[6%] top-1/2 block" style={{ height: "14%", marginTop: "-7%", animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 60 12" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            {Array.from({ length: links }, (_, i) => (
              <ellipse key={i} cx={6 + (48 / Math.max(1, links - 1)) * i} cy="6" rx="5" ry="4" fill="none" stroke={i % 2 ? c.deep : c.main} strokeWidth="2" />
            ))}
          </svg>
        </span>
      </span>
      <Glyph glyph="link" fill={c.accent} className="gsig-crack absolute inset-[36%] block" style={{ animationDelay: `${delayMs + 260}ms` }} />
      <Shards v={v} delayMs={delayMs + 340} colors={[c.pale, c.deep]} shape="chip" count={4} sizePct={5} />
    </>
  );
}

function ShadowVeil({ v, delayMs }: FamProps) {
  const c = palette(v);
  const wisps = Math.min(v.particles, 5);
  return (
    <>
      <span className="absolute inset-0 block" style={{ transform: v.dir === -1 ? "scaleX(-1)" : undefined }}>
        <span
          className="gsig-sweep absolute inset-y-[8%] left-[4%] right-[4%] block rounded-[24%]"
          style={{ background: hsl(v.hue, Math.min(60, v.sat), 16), opacity: 0.85, animationDelay: `${delayMs}ms` }}
        />
      </span>
      {Array.from({ length: wisps }, (_, i) => (
        <span
          key={i}
          className="gsig-rise absolute block rounded-full"
          style={{
            left: `${14 + jit(v, i, 68)}%`,
            top: `${30 + jit(v, i + 9, 40)}%`,
            width: "8%",
            height: "8%",
            background: i % 2 ? c.main : c.deep,
            animationDelay: `${delayMs + 160 + i * 75}ms`,
          }}
        />
      ))}
      {v.variant >= 2 && (
        <Glyph glyph={v.glyph} fill={c.accent} className="gsig-pop absolute inset-[32%] block" style={{ animationDelay: `${delayMs + 200}ms` }} />
      )}
    </>
  );
}

function LanternFloat({ v, delayMs }: FamProps) {
  const c = palette(v);
  const motes = Math.min(v.particles, 5);
  return (
    <>
      <span className="gsig-rise absolute inset-x-[34%] top-[30%] block h-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 26" className="h-full w-full" aria-hidden="true">
          <path d="M6 2h8v2l3 5v10l-3 5H6l-3-5V9l3-5Z" fill={c.main} />
          <path d={GLYPHS[v.glyph]} fill={c.glow} fillRule="evenodd" transform="translate(4 7) scale(0.5)" />
        </svg>
      </span>
      {Array.from({ length: motes }, (_, i) => (
        <span
          key={i}
          className="gsig-rise absolute block rounded-full"
          style={{
            left: `${18 + jit(v, i, 60)}%`,
            top: `${48 + jit(v, i + 4, 34)}%`,
            width: "5%",
            height: "5%",
            background: i % 2 ? c.accent : c.glow,
            animationDelay: `${delayMs + 150 + i * 110}ms`,
          }}
        />
      ))}
      {v.variant >= 1 && <Ring delayMs={delayMs + 120} color={c.pale} inset="18%" />}
    </>
  );
}

function FeatherBurst({ v, delayMs }: FamProps) {
  const c = palette(v);
  return (
    <>
      <Core delayMs={delayMs} color={c.pale} inset="38%" />
      <Shards v={v} delayMs={delayMs + 60} colors={[c.pale, c.main, c.accent]} shape="petal" stepMs={20} sizePct={8} />
      {v.variant >= 1 && (
        <Glyph glyph="feather" fill={c.main} className="gsig-fall absolute left-[36%] top-[18%] block h-[30%] w-[30%]" style={{ animationDelay: `${delayMs + 240}ms` }} />
      )}
      {v.variant === 2 && (
        <Glyph glyph="feather" fill={c.accent} className="gsig-fall absolute left-[54%] top-[30%] block h-[22%] w-[22%]" style={{ transform: "scaleX(-1)", animationDelay: `${delayMs + 340}ms` }} />
      )}
    </>
  );
}

function TideSweep({ v, delayMs }: FamProps) {
  const c = palette(v);
  const drops = Math.min(v.particles, 5);
  return (
    <>
      <span className="absolute inset-0 block" style={{ transform: v.dir === -1 ? "scaleX(-1)" : undefined }}>
        <span className="gsig-sweep absolute inset-x-0 bottom-[16%] block h-[36%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 16" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M0 10C6 4 10 12 16 7s10 4 16 -1 8 4 8 4v6H0Z" fill={c.main} />
            <path d="M0 13c8-3 16 2 24-1s12 1 16 0v4H0Z" fill={c.accent} />
          </svg>
        </span>
        {v.variant >= 2 && (
          <span className="gsig-sweep absolute inset-x-0 bottom-[34%] block h-[20%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
            <svg viewBox="0 0 40 8" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d="M0 5c7-4 13 3 20-1s13 2 20-1v5H0Z" fill={c.pale} />
            </svg>
          </span>
        )}
      </span>
      {Array.from({ length: drops }, (_, i) => (
        <span
          key={i}
          className="gsig-rise absolute block rounded-full"
          style={{
            left: `${12 + jit(v, i, 72)}%`,
            top: `${34 + jit(v, i + 6, 20)}%`,
            width: "5%",
            height: "7%",
            background: i % 2 ? c.glow : c.pale,
            animationDelay: `${delayMs + 120 + i * 80}ms`,
          }}
        />
      ))}
    </>
  );
}

function GustSpiral({ v, delayMs }: FamProps) {
  const c = palette(v);
  const streaks = Math.min(v.particles, 4);
  return (
    <>
      <span className="absolute inset-0 block" style={{ transform: v.dir === -1 ? "scaleX(-1)" : undefined }}>
        {Array.from({ length: streaks }, (_, i) => (
          <span
            key={i}
            className="gsig-sweep absolute block rounded-full"
            style={{
              left: "8%",
              right: `${10 + jit(v, i, 26)}%`,
              top: `${20 + i * (56 / Math.max(1, streaks - 1) || 0)}%`,
              height: "6%",
              background: i % 2 ? c.pale : c.main,
              animationDelay: `${delayMs + i * 90}ms`,
            }}
          />
        ))}
      </span>
      <Glyph
        glyph="spiral"
        fill={c.accent}
        className={`${v.dir === 1 ? "gsig-spin" : "gsig-spin-ccw"} absolute inset-[26%] block`}
        style={{ animationDelay: `${delayMs + 80}ms` }}
      />
      {v.variant >= 2 && <Shards v={v} delayMs={delayMs + 200} colors={[c.pale]} shape="dot" count={5} sizePct={4} />}
    </>
  );
}

function SparkArc({ v, delayMs }: FamProps) {
  const c = palette(v);
  const arcs = Math.min(v.particles, 5);
  return (
    <>
      <Glyph glyph="bolt" fill={c.glow} className="gsig-crack absolute inset-[28%] block" style={{ animationDelay: `${delayMs}ms` }} />
      {Array.from({ length: arcs }, (_, i) => (
        <span key={i} className="absolute inset-0 block" style={{ transform: `rotate(${v.rot + (360 / arcs) * i * v.dir}deg)` }}>
          <span className="gsig-pop absolute left-[44%] top-[4%] block h-[20%] w-[12%]" style={{ animationDelay: `${delayMs + 70 + i * 55}ms` }}>
            <svg viewBox="0 0 10 16" className="h-full w-full" aria-hidden="true">
              <path d="M6 0 2 7h3l-2 9 6-10H5Z" fill={i % 2 ? c.accent : c.main} />
            </svg>
          </span>
        </span>
      ))}
      {v.variant >= 2 && <Ring delayMs={delayMs + 160} color={c.main} inset="8%" square={v.variant === 3} />}
    </>
  );
}

function SwapHelix({ v, delayMs }: FamProps) {
  const c = palette(v);
  const orbs = v.variant === 2 ? 3 : 2;
  return (
    <>
      <span className={`absolute inset-[10%] block ${v.dir === 1 ? "gsig-spin" : "gsig-spin-ccw"}`} style={{ animationDelay: `${delayMs}ms` }}>
        {Array.from({ length: orbs }, (_, i) => (
          <span key={i} className="absolute inset-0 block" style={{ transform: `rotate(${(360 / orbs) * i}deg)` }}>
            <span
              className={`absolute left-[42%] top-0 block h-[16%] w-[16%] ${v.variant % 2 ? "rounded-[22%]" : "rounded-full"}`}
              style={{ background: i % 2 ? c.accent : c.main }}
            />
            <span className="absolute left-[46%] top-[16%] block h-[12%] w-[8%] rounded-full" style={{ background: c.pale, opacity: 0.7 }} />
          </span>
        ))}
      </span>
      <Ring delayMs={delayMs + 200} color={c.pale} inset="24%" />
    </>
  );
}

function TeleportRift({ v, delayMs }: FamProps) {
  const c = palette(v);
  const deg = [0, 24, -24][v.variant % 3] * v.dir;
  const sparks = Math.min(v.particles, 6);
  return (
    <>
      <span className="absolute inset-0 block" style={{ transform: `rotate(${deg}deg)` }}>
        <span className="gsig-rift absolute inset-y-[10%] left-1/2 block w-[14%] rounded-full" style={{ marginLeft: "-7%", background: c.deep, animationDelay: `${delayMs}ms` }} />
        <span className="gsig-rift absolute inset-y-[18%] left-1/2 block w-[6%] rounded-full" style={{ marginLeft: "-3%", background: c.glow, animationDelay: `${delayMs + 40}ms` }} />
      </span>
      {Array.from({ length: sparks }, (_, i) => (
        <span
          key={i}
          className="gsig-twinkle absolute block"
          style={{ left: `${16 + jit(v, i, 64)}%`, top: `${14 + jit(v, i + 8, 66)}%`, width: "7%", height: "7%", animationDelay: `${delayMs + 90 + i * 60}ms` }}
        >
          <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
            <path d="M5 0 6 4l4 1-4 1-1 4-1-4-4-1 4-1Z" fill={i % 2 ? c.accent : c.main} />
          </svg>
        </span>
      ))}
    </>
  );
}

function MirrorShatter({ v, delayMs }: FamProps) {
  const c = palette(v);
  return (
    <>
      <span className={`gsig-crack absolute inset-[16%] block ${v.variant === 2 ? "rounded-full" : "rounded-[10%]"}`} style={{ border: `3px solid ${c.main}`, animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
          <path d="M12 12 5 4m7 8 9-3m-9 3-3 9m3-9 7 7" stroke={c.pale} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </span>
      <Shards v={v} delayMs={delayMs + 220} colors={[c.glow, c.pale, c.accent]} shape={v.variant % 2 ? "chip" : "crystal"} stepMs={14} sizePct={7} />
    </>
  );
}

function CoinFlip({ v, delayMs }: FamProps) {
  const c = palette(v);
  const coins = Math.min(v.particles, 3);
  return (
    <>
      {Array.from({ length: coins }, (_, i) => (
        <Glyph
          key={i}
          glyph="coin"
          fill={i % 2 ? c.accent : c.main}
          className="gsig-tumble absolute block"
          style={{
            left: `${30 + i * 18 + jit(v, i, 10)}%`,
            top: `${24 + jit(v, i + 2, 16)}%`,
            width: `${30 - i * 7}%`,
            height: `${30 - i * 7}%`,
            animationDelay: `${delayMs + i * 130}ms`,
          }}
        />
      ))}
      <Ring delayMs={delayMs + 520} color={c.glow} inset="26%" />
      {v.variant >= 1 && (
        <span className="gsig-twinkle absolute left-[22%] top-[22%] block h-[12%] w-[12%] rounded-full" style={{ background: c.glow, animationDelay: `${delayMs + 420}ms` }} />
      )}
    </>
  );
}

function DiceTumble({ v, delayMs }: FamProps) {
  const c = palette(v);
  const dice = v.variant === 0 ? 1 : 2;
  return (
    <>
      {Array.from({ length: dice }, (_, i) => (
        <Glyph
          key={i}
          glyph="die"
          fill={i % 2 ? c.accent : c.main}
          className="gsig-tumble absolute block"
          style={{
            left: `${26 + i * 26}%`,
            top: `${28 + jit(v, i, 14)}%`,
            width: "26%",
            height: "26%",
            animationDelay: `${delayMs + i * 150}ms`,
          }}
        />
      ))}
      <span className="gsig-pop absolute inset-x-[20%] bottom-[14%] block h-[6%] rounded-full" style={{ background: c.pale, animationDelay: `${delayMs + 560}ms` }} />
      {v.variant === 2 && <Shards v={v} delayMs={delayMs + 600} colors={[c.glow]} shape="dot" count={5} sizePct={4} />}
    </>
  );
}

function ScrollUnfurl({ v, delayMs }: FamProps) {
  const c = palette(v);
  const vertical = v.variant === 2;
  const lines = Math.min(v.particles, 4);
  return (
    <span className="absolute inset-0 block" style={{ transform: vertical ? "rotate(90deg)" : undefined }}>
      <span className="gsig-unfurl absolute inset-x-[10%] top-[26%] block h-[48%] rounded-[8%]" style={{ background: c.pale, animationDelay: `${delayMs}ms` }}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className="absolute block rounded-full"
            style={{ left: "12%", right: `${14 + jit(v, i, 26)}%`, top: `${22 + i * (56 / Math.max(1, lines - 1) || 0)}%`, height: "8%", background: c.deep, opacity: 0.75 }}
          />
        ))}
      </span>
      <span className="gsig-pop absolute left-[6%] top-[22%] block h-[56%] w-[7%] rounded-full" style={{ background: c.main, animationDelay: `${delayMs}ms` }} />
      <span className="gsig-pop absolute right-[6%] top-[22%] block h-[56%] w-[7%] rounded-full" style={{ background: c.main, animationDelay: `${delayMs + 320}ms` }} />
      {v.variant >= 1 && (
        <Glyph glyph={v.glyph} fill={c.accent} className="gsig-rise absolute left-[40%] top-[38%] block h-[22%] w-[22%]" style={{ animationDelay: `${delayMs + 380}ms` }} />
      )}
    </span>
  );
}

function QuillSign({ v, delayMs }: FamProps) {
  const c = palette(v);
  const drips = Math.min(v.particles, 4);
  return (
    <>
      <Glyph glyph="quill" fill={c.main} className="gsig-stroke absolute left-[24%] top-[14%] block h-[46%] w-[46%]" style={{ transform: v.dir === -1 ? "scaleX(-1)" : undefined, animationDelay: `${delayMs}ms` }} />
      <span className="gsig-unfurl absolute bottom-[26%] left-[18%] right-[22%] block h-[6%] rounded-full" style={{ background: c.deep, animationDelay: `${delayMs + 220}ms` }} />
      {v.variant >= 1 && (
        <span className="gsig-unfurl absolute bottom-[16%] left-[30%] right-[34%] block h-[5%] rounded-full" style={{ background: c.accent, animationDelay: `${delayMs + 340}ms` }} />
      )}
      {Array.from({ length: drips }, (_, i) => (
        <span
          key={i}
          className="gsig-fall absolute block rounded-full"
          style={{ left: `${26 + jit(v, i, 46)}%`, top: "60%", width: "5%", height: "8%", background: c.deep, animationDelay: `${delayMs + 300 + i * 90}ms` }}
        />
      ))}
    </>
  );
}

function PrismSplit({ v, delayMs }: FamProps) {
  const c = palette(v);
  const rays = clamp(v.particles, 3, 5);
  return (
    <>
      <Glyph glyph="prism" fill={c.main} className="gsig-pop absolute inset-x-[34%] top-[32%] block h-[36%]" style={{ animationDelay: `${delayMs}ms` }} />
      {Array.from({ length: rays }, (_, i) => {
        const spread = (i - (rays - 1) / 2) * 22 * v.dir;
        return (
          <span key={i} className="absolute inset-0 block" style={{ transform: `rotate(${spread}deg)` }}>
            <span
              className="gsig-snap absolute left-1/2 right-[6%] top-1/2 block"
              style={{ height: "6%", marginTop: "-3%", background: hsl(v.hue2 + i * (140 / rays), v.sat, v.light + 8), animationDelay: `${delayMs + 120 + i * 70}ms` }}
            />
          </span>
        );
      })}
      {v.variant >= 2 && <Ring delayMs={delayMs + 320} color={c.pale} inset="10%" />}
    </>
  );
}

function PotionFizz({ v, delayMs }: FamProps) {
  const c = palette(v);
  const bubbles = Math.min(v.particles, 7);
  return (
    <>
      <Glyph
        glyph="flask"
        fill={c.main}
        className="gsig-drop absolute inset-x-[32%] top-[26%] block h-[44%]"
        style={{ transform: v.variant === 2 ? `rotate(${12 * v.dir}deg)` : undefined, animationDelay: `${delayMs}ms` }}
      />
      {Array.from({ length: bubbles }, (_, i) => (
        <span
          key={i}
          className="gsig-rise absolute block rounded-full"
          style={{
            left: `${24 + jit(v, i, 52)}%`,
            top: `${36 + jit(v, i + 3, 26)}%`,
            width: `${4 + (i % 3) * 2}%`,
            height: `${4 + (i % 3) * 2}%`,
            border: `1.6px solid ${i % 2 ? c.accent : c.glow}`,
            animationDelay: `${delayMs + 200 + i * 85}ms`,
          }}
        />
      ))}
      {v.variant >= 1 && <Ring delayMs={delayMs + 260} color={c.accent} inset="20%" />}
    </>
  );
}

function StarChart({ v, delayMs }: FamProps) {
  const c = palette(v);
  const n = clamp(v.particles, 4, 6);
  const pts = Array.from({ length: n }, (_, i) => ({
    x: 16 + jit(v, i * 2 + 1, 66),
    y: 14 + jit(v, i * 2 + 2, 66),
  }));
  return (
    <>
      <span className="gsig-pop absolute inset-[4%] block" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d={`M${pts.map((p) => `${p.x} ${p.y}`).join(" L")}${v.variant % 2 ? " Z" : ""}`} fill="none" stroke={c.main} strokeWidth="1.6" strokeDasharray="4 3" />
        </svg>
      </span>
      {pts.map((p, i) => (
        <span key={i} className="gsig-twinkle absolute block" style={{ left: `${p.x - 5}%`, top: `${p.y - 5}%`, width: "10%", height: "10%", animationDelay: `${delayMs + i * 90}ms` }}>
          <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
            <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" fill={i === 0 ? c.accent : c.glow} />
          </svg>
        </span>
      ))}
      {v.variant >= 2 && (
        <Glyph glyph={v.glyph} fill={c.pale} className="gsig-pop absolute inset-[38%] block" style={{ animationDelay: `${delayMs + n * 90}ms` }} />
      )}
    </>
  );
}

function GravityWell({ v, delayMs }: FamProps) {
  const c = palette(v);
  const rings = clamp(v.particles + 1, 2, 4);
  return (
    <>
      {Array.from({ length: rings }, (_, i) => (
        <Ring key={i} delayMs={delayMs + i * 120} color={i % 2 ? c.accent : c.main} cls="gsig-collapse" inset="2%" square={v.variant !== 1} widthPx={2.5} />
      ))}
      <Core delayMs={delayMs + rings * 120} color={c.deep} inset="40%" />
      {v.variant === 2 && (
        <span className={`absolute inset-[18%] block ${v.dir === 1 ? "gsig-spin" : "gsig-spin-ccw"}`} style={{ animationDelay: `${delayMs + 80}ms` }}>
          <span className="absolute left-[46%] top-0 block h-[10%] w-[10%] rounded-full" style={{ background: c.glow }} />
        </span>
      )}
    </>
  );
}

function BellToll({ v, delayMs }: FamProps) {
  const c = palette(v);
  const ripples = clamp(v.particles, 2, 3);
  return (
    <>
      <span className="gsig-swing absolute inset-x-[32%] top-[12%] block h-[44%]" style={{ animationDelay: `${delayMs}ms` }}>
        <Glyph glyph="bell" fill={c.main} className="absolute inset-0 block" />
      </span>
      {v.variant === 2 && (
        <span className="gsig-swing absolute left-[12%] top-[30%] block h-[26%] w-[22%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
          <Glyph glyph="bell" fill={c.accent} className="absolute inset-0 block" />
        </span>
      )}
      {Array.from({ length: ripples }, (_, i) => (
        <Ring key={i} delayMs={delayMs + 260 + i * 140} color={i % 2 ? c.accent : c.pale} cls="gsig-shock" inset="14%" />
      ))}
    </>
  );
}

const FAMILY_RENDER: Record<GenFamily, (p: FamProps) => React.ReactElement> = {
  frostbloom: FrostBloom,
  emberfall: EmberFall,
  stonecarve: StoneCarve,
  clockwork: Clockwork,
  hourglass: Hourglass,
  arcaneRunes: ArcaneRunes,
  hexSigil: HexSigil,
  pawnTide: PawnTide,
  knightVault: KnightVault,
  rookRampart: RookRampart,
  bishopCross: BishopCross,
  queenRadiance: QueenRadiance,
  kingsDecree: KingsDecree,
  crownGleam: CrownGleam,
  bannerRally: BannerRally,
  drumShock: DrumShock,
  shieldDome: ShieldDome,
  thornRing: ThornRing,
  chainSnap: ChainSnap,
  shadowVeil: ShadowVeil,
  lanternFloat: LanternFloat,
  featherBurst: FeatherBurst,
  tideSweep: TideSweep,
  gustSpiral: GustSpiral,
  sparkArc: SparkArc,
  swapHelix: SwapHelix,
  teleportRift: TeleportRift,
  mirrorShatter: MirrorShatter,
  coinFlip: CoinFlip,
  diceTumble: DiceTumble,
  scrollUnfurl: ScrollUnfurl,
  quillSign: QuillSign,
  prismSplit: PrismSplit,
  potionFizz: PotionFizz,
  starChart: StarChart,
  gravityWell: GravityWell,
  bellToll: BellToll,
};

// --- Lead (board-wide) flourish ---------------------------------------------------
// Rendered oversized on the lead square and clipped by Board's crop, exactly
// like the DragonLordBurst lead branch. Style comes from the family (bloom /
// band / rain / rise / orbit), identity from the family's emblem glyph + the
// card's palette, so two tier-5+ cards in the same family still read apart.

function GenLead({ v, delayMs }: FamProps) {
  const c = palette(v);
  const style = FAMILY_DEFS[v.family].lead;
  const n = clamp(v.particles + 3, 6, 10);

  if (style === "bloom") {
    return (
      <>
        <span className="gsig-lead-bloom absolute inset-[-320%] block rounded-full" style={{ border: `10px solid ${c.main}`, animationDelay: `${delayMs}ms` }} />
        <span className="gsig-lead-bloom absolute inset-[-320%] block rounded-full" style={{ border: `5px solid ${c.accent}`, animationDelay: `${delayMs + 180}ms` }} />
        <Glyph glyph={v.glyph} fill={c.glow} className="gsig-pop absolute inset-[-55%] block" style={{ animationDelay: `${delayMs + 60}ms` }} />
      </>
    );
  }

  if (style === "band") {
    return (
      <span className="gsig-lead-band absolute top-[6%] block h-[88%]" style={{ left: "-380%", width: "860%", animationDelay: `${delayMs}ms`, transform: v.dir === -1 ? "scaleX(-1)" : undefined }}>
        {Array.from({ length: n }, (_, i) => (
          <Glyph
            key={i}
            glyph={v.glyph}
            fill={i % 2 ? c.accent : c.main}
            className="gsig-pop absolute top-[10%] block h-[80%]"
            style={{ left: `${(i * 100) / n}%`, width: `${72 / n}%`, animationDelay: `${delayMs + 80 + i * 70}ms` }}
          />
        ))}
      </span>
    );
  }

  if (style === "rain" || style === "rise") {
    const cls = style === "rain" ? "gsig-lead-rain" : "gsig-lead-rise";
    return (
      <>
        {Array.from({ length: n }, (_, i) => (
          <Glyph
            key={i}
            glyph={v.glyph}
            fill={i % 3 === 2 ? c.accent : i % 3 === 1 ? c.pale : c.main}
            className={`${cls} absolute block`}
            style={{
              left: `${-360 + i * (800 / n) + jit(v, i, 40)}%`,
              top: style === "rain" ? `${-460 - jit(v, i + 1, 120)}%` : `${420 + jit(v, i + 1, 120)}%`,
              width: `${44 + jit(v, i + 2, 30)}%`,
              height: `${44 + jit(v, i + 2, 30)}%`,
              animationDelay: `${delayMs + i * 55}ms`,
            }}
          />
        ))}
      </>
    );
  }

  // orbit
  return (
    <span className="gsig-lead-orbit absolute inset-[-330%] block" style={{ animationDelay: `${delayMs}ms`, animationDirection: v.dir === -1 ? "reverse" : undefined }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="absolute inset-0 block" style={{ transform: `rotate(${(360 / n) * i}deg)` }}>
          <Glyph glyph={v.glyph} fill={i % 2 ? c.accent : c.main} className="absolute left-[46.5%] top-[2%] block h-[7%] w-[7%]" />
        </span>
      ))}
      <span className="absolute inset-[38%] block rounded-full" style={{ border: `4px solid ${c.pale}`, opacity: 0.5 }} />
    </span>
  );
}

// --- Public renderer ----------------------------------------------------------------

/** One square's slice of a GENERATED signature sequence. Mirrors
 * SignatureOverlay's contract exactly: absolutely positioned, inset-0,
 * pointer-events-none; `role` is "lead" for the origin square (board-wide
 * flourish when the config carries one) and "target" for each affected
 * square; `delayMs` is Board's pre-computed stagger. */
export function GenBurst({
  config,
  role,
  delayMs,
}: {
  config: GenConfig;
  role: "lead" | "target";
  delayMs: number;
}) {
  const v = config.visual;
  if (role === "lead" && config.hasLead) {
    return (
      <span className="gsig-root pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <GenLead v={v} delayMs={delayMs} />
      </span>
    );
  }
  const Fam = FAMILY_RENDER[v.family];
  return (
    <span className="gsig-root pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute inset-0 block" style={v.scale === 1 ? undefined : { transform: `scale(${v.scale})` }}>
        <Fam v={v} delayMs={delayMs} />
        <GenFinisherLayer v={v} delayMs={delayMs} />
      </span>
    </span>
  );
}

/** The ending flourish layer (overhaul): a short, distinct closing beat after
 * the family scene, hash-picked per card (GenVisual.finisher). All
 * transform/opacity keyframes (genSignature.css), one-shot `both` fill, and it
 * lives inside gsig-root so the anim-off gate covers it unchanged. */
function GenFinisherLayer({ v, delayMs }: { v: GenVisual; delayMs: number }) {
  const start = delayMs + 620; // after the family scene's main beat
  const c = `hsl(${v.hue} ${v.sat}% ${v.light}%)`;
  const c2 = `hsl(${v.hue2} ${v.sat}% ${Math.min(78, v.light + 10)}%)`;
  const d = (extra: number) => ({ animationDelay: `${start + extra}ms` });
  switch (v.finisher) {
    case "ringfade":
      return (
        <span className="gsig-fin-ring absolute left-1/2 top-1/2 block h-[70%] w-[70%] rounded-full" style={{ ...d(0), border: `2px solid ${c}`, marginLeft: "-35%", marginTop: "-35%" }} />
      );
    case "shardring":
      return (
        <span className="absolute inset-0 block">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="gsig-fin-shard absolute left-1/2 top-1/2 block h-[16%] w-[4%]" style={{ ...d(i * 30), background: i % 2 ? c2 : c, transform: `rotate(${i * 60 + v.rot}deg)` } as React.CSSProperties} />
          ))}
        </span>
      );
    case "risemotes":
      return (
        <span className="absolute inset-0 block">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="gsig-fin-mote absolute bottom-[18%] block h-[6%] w-[6%] rounded-full" style={{ ...d(i * 70), left: `${22 + i * 18}%`, background: i % 2 ? c : c2 }} />
          ))}
        </span>
      );
    case "afterglow":
      return (
        <span className="gsig-fin-glow absolute inset-[12%] block rounded-full" style={{ ...d(0), background: `radial-gradient(circle, ${c2}44, transparent 70%)` }} />
      );
    case "sparkclose":
      return (
        <span className="absolute inset-0 block">
          <span className="gsig-fin-sparkx absolute left-1/2 top-1/2 block h-[2.5%] w-[52%]" style={{ ...d(0), background: c, marginLeft: "-26%" }} />
          <span className="gsig-fin-sparkx absolute left-1/2 top-1/2 block h-[2.5%] w-[52%]" style={{ ...d(60), background: c2, marginLeft: "-26%", transform: "rotate(90deg)" }} />
        </span>
      );
    case "echopulse":
      return (
        <span className="absolute inset-0 block">
          <span className="gsig-fin-echo absolute left-1/2 top-1/2 block h-[46%] w-[46%] rounded-full" style={{ ...d(0), border: `2px solid ${c}`, marginLeft: "-23%", marginTop: "-23%" }} />
          <span className="gsig-fin-echo absolute left-1/2 top-1/2 block h-[46%] w-[46%] rounded-full" style={{ ...d(140), border: `1.5px solid ${c2}`, marginLeft: "-23%", marginTop: "-23%" }} />
        </span>
      );
    case "dustfall":
      return (
        <span className="absolute inset-0 block">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="gsig-fin-dust absolute top-[20%] block h-[4%] w-[4%] rounded-full" style={{ ...d(i * 45), left: `${18 + i * 15}%`, background: i % 2 ? c2 : c }} />
          ))}
        </span>
      );
    default:
      return (
        <span className="gsig-fin-seal absolute left-1/2 top-1/2 flex h-[34%] w-[34%] items-center justify-center" style={{ ...d(0), marginLeft: "-17%", marginTop: "-17%", color: c2 }}>
          <svg viewBox="0 0 24 24" className="h-full w-full"><path d={GLYPHS[v.glyph]} fill="currentColor" fillRule="evenodd" /></svg>
        </span>
      );
  }
}

