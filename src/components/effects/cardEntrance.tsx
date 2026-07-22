"use client";

// Category arrival choreographies + the acquire entrance.
//
// CategoryArrival: the card's face icon ARRIVES as a participant in a themed
// scene (a comet, a curse circle, a supply crate...) instead of being stamped
// flat over the board. Used by two layers:
//   - CardEntrance (below): fired once when a card ENTERS a hand — draft pick,
//     steal, grant — so passives and off-board cards (clock drains, draft
//     locks) finally announce themselves the moment they exist.
//   - CastSpectacle's non-bespoke path (BoardEffects.tsx): a played card with
//     no hand-made play art gets the same arrival at full scale.
// BoardEffects imports from this module, never the reverse (no cycle); the
// palette here mirrors CAST_THEME so the two layers always agree.
//
// All motion lives in cardEntrance.css: transform/opacity only, one-shot,
// scaled by --fx-dur, hidden entirely when animations are off in Settings.

import React from "react";
import type { LucideIcon } from "lucide-react";
import type { BuffCategory } from "@/engine/buff";
import "./cardEntrance.css";

/** Same hues as BoardEffects' CAST_THEME (kept local: BoardEffects imports us). */
export const ARRIVAL_THEME: Record<BuffCategory, { color: string; soft: string; deep: string }> = {
  movement: { color: "#67e8f9", soft: "rgba(103,232,249,0.14)", deep: "#0e4a56" },
  pieces: { color: "#e6bf6a", soft: "rgba(230,191,106,0.14)", deep: "#4a3a12" },
  tempo: { color: "#f4c430", soft: "rgba(244,196,48,0.13)", deep: "#4a3a06" },
  protection: { color: "#7eb59a", soft: "rgba(126,181,154,0.15)", deep: "#1d3a2d" },
  attack: { color: "#e05252", soft: "rgba(224,82,82,0.14)", deep: "#4a1212" },
  info: { color: "#8ba9c4", soft: "rgba(139,169,196,0.14)", deep: "#233242" },
  draft: { color: "#e07ab8", soft: "rgba(224,122,184,0.13)", deep: "#45183a" },
  nerf: { color: "#5eead4", soft: "rgba(94,234,212,0.14)", deep: "#0e4038" },
  hex: { color: "#a877d8", soft: "rgba(168,119,216,0.15)", deep: "#331a4a" },
  item: { color: "#a3d160", soft: "rgba(163,209,96,0.14)", deep: "#2c3a12" },
};

interface ArrivalProps {
  category: BuffCategory;
  /** The card's own face icon (cardFaceIcon result). */
  icon: LucideIcon;
  /** Extra ms before the scene starts (layering under banners). */
  delayMs?: number;
}

/** Animation-delay helper: base scene delay plus the element's own offset. */
function dm(base: number, extra: number): React.CSSProperties {
  return { animationDelay: `${base + extra}ms` };
}

// --- attack: the emblem rides a comet in and slams -------------------------

function AttackArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      <span
        className="ce-comet-tail absolute left-[8%] top-[6%] block h-[10%] w-[52%] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.soft}, ${t.color}55)`,
          ...dm(delayMs, 0),
        }}
      />
      <span
        className="ce-comet absolute left-1/2 top-1/2 ml-[-16%] mt-[-16%] flex h-[32%] w-[32%] items-center justify-center"
        style={{ color: t.color, filter: `drop-shadow(0 0 10px ${t.soft})`, ...dm(delayMs, 60) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.6} />
      </span>
      <span
        className="ce-ring absolute left-1/2 top-1/2 block h-[46%] w-[46%] rounded-full"
        style={{ border: `2.5px solid ${t.color}`, ...dm(delayMs, 430) }}
      />
      {[
        { dx: "230%", dy: "-160%", rot: "170deg" },
        { dx: "-240%", dy: "-120%", rot: "-200deg" },
        { dx: "40%", dy: "230%", rot: "120deg" },
      ].map((s, i) => (
        <span
          key={i}
          className="ce-shard absolute left-1/2 top-1/2 ml-[-3%] mt-[-3%] block h-[6%] w-[6%]"
          style={
            {
              background: i % 2 ? t.color : "#ffe9c9",
              clipPath: "polygon(50% 0, 100% 80%, 0 80%)",
              "--dx": s.dx,
              "--dy": s.dy,
              "--rot": s.rot,
              ...dm(delayMs, 470 + i * 40),
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

// --- hex: curse circle inscribes, sigil burns in, ink drips -----------------

function HexArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      <span
        className="ce-circle absolute left-1/2 top-1/2 ml-[-24%] mt-[-24%] block h-[48%] w-[48%] rounded-full"
        style={{
          border: `2px dashed ${t.color}`,
          boxShadow: `0 0 18px ${t.soft}, inset 0 0 12px ${t.soft}`,
          ...dm(delayMs, 0),
        }}
      />
      <span
        className="ce-sigil absolute left-1/2 top-1/2 ml-[-13%] mt-[-13%] flex h-[26%] w-[26%] items-center justify-center"
        style={{ color: t.color, filter: `drop-shadow(0 0 8px ${t.color})`, ...dm(delayMs, 380) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.7} />
      </span>
      {[-14, 0, 15].map((off, i) => (
        <span
          key={i}
          className="ce-drip absolute top-[62%] block w-[2%] rounded-b-full"
          style={{
            left: `${49 + off}%`,
            height: "9%",
            background: `linear-gradient(180deg, ${t.color}, transparent)`,
            ...dm(delayMs, 640 + i * 130),
          }}
        />
      ))}
    </span>
  );
}

// --- tempo: a clock hand sweeps, the emblem ticks in ------------------------

function TempoArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      <span
        className="ce-iris absolute left-1/2 top-1/2 ml-[-25%] mt-[-25%] block h-[50%] w-[50%] rounded-full"
        style={{ border: `2px solid ${t.color}66`, ...dm(delayMs, 0) }}
      />
      {/* the sweeping hand: a thin wedge pinned to the dial center */}
      <span
        className="ce-hand absolute left-1/2 top-1/2 ml-[-1%] mt-[-22%] block h-[22%] w-[2%] rounded-full"
        style={{ background: `linear-gradient(180deg, ${t.color}, transparent)`, ...dm(delayMs, 80) }}
      />
      <span
        className="ce-tick absolute left-1/2 top-1/2 ml-[-13%] mt-[-13%] flex h-[26%] w-[26%] items-center justify-center"
        style={{ color: t.color, filter: `drop-shadow(0 0 8px ${t.soft})`, ...dm(delayMs, 480) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.7} />
      </span>
      <span
        className="ce-ring absolute left-1/2 top-1/2 block h-[52%] w-[52%] rounded-full"
        style={{ border: `2px solid ${t.color}`, ...dm(delayMs, 620) }}
      />
    </span>
  );
}

// --- protection: two shield halves clamp shut around the emblem -------------

function ProtectionArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  const half = (side: "l" | "r") => (
    <span
      className={`ce-clamp-${side} absolute top-1/2 mt-[-20%] block h-[40%] w-[20%]`}
      style={{
        [side === "l" ? "left" : "right"]: "30%",
        background: `linear-gradient(${side === "l" ? "90deg" : "270deg"}, transparent, ${t.soft})`,
        border: `2px solid ${t.color}`,
        [side === "l" ? "borderRight" : "borderLeft"]: "none",
        borderRadius: side === "l" ? "45% 0 0 45%" : "0 45% 45% 0",
        ...dm(delayMs, 60),
      }}
    />
  );
  return (
    <span className="absolute inset-0 block">
      {half("l")}
      {half("r")}
      <span
        className="ce-seam absolute left-1/2 top-1/2 ml-[-0.75%] mt-[-21%] block h-[42%] w-[1.5%] rounded-full"
        style={{ background: "#fff4d6", boxShadow: `0 0 14px ${t.color}`, ...dm(delayMs, 480) }}
      />
      <span
        className="ce-tick absolute left-1/2 top-1/2 ml-[-11%] mt-[-11%] flex h-[22%] w-[22%] items-center justify-center"
        style={{ color: t.color, ...dm(delayMs, 520) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.8} />
      </span>
    </span>
  );
}

// --- movement: emblem dashes across, after-images trail, dust kicks ---------

function MovementArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      {[0.45, 0.25].map((ghost, i) => (
        <span
          key={i}
          className="ce-after absolute left-1/2 top-1/2 ml-[-14%] mt-[-14%] flex h-[28%] w-[28%] items-center justify-center"
          style={
            {
              color: t.color,
              "--ghost": ghost,
              "--lag": `${55 + i * 45}%`,
              ...dm(delayMs, 40 + i * 40),
            } as React.CSSProperties
          }
        >
          <Icon className="h-full w-full" strokeWidth={1.6} />
        </span>
      ))}
      <span
        className="ce-dash absolute left-1/2 top-1/2 ml-[-14%] mt-[-14%] flex h-[28%] w-[28%] items-center justify-center"
        style={{ color: t.color, filter: `drop-shadow(0 0 9px ${t.soft})`, ...dm(delayMs, 0) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.6} />
      </span>
      {[
        { dx: "-110%", dy: "-30%" },
        { dx: "-80%", dy: "40%" },
        { dx: "-130%", dy: "10%" },
      ].map((p, i) => (
        <span
          key={i}
          className="ce-dust absolute left-[42%] top-[58%] block h-[4.5%] w-[4.5%] rounded-full"
          style={
            {
              background: "#d9cbb0",
              "--dx": p.dx,
              "--dy": p.dy,
              ...dm(delayMs, 380 + i * 60),
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

// --- draft: three card backs fan open, the emblem pops from the middle ------

function DraftArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      <span className="ce-fan-fade absolute inset-0 block" style={dm(delayMs, 0)}>
        {[-22, 0, 22].map((fan, i) => (
          <span
            key={i}
            className="ce-fan absolute left-1/2 top-1/2 ml-[-9%] mt-[-14%] block h-[28%] w-[18%] rounded-[8%]"
            style={
              {
                background: `linear-gradient(160deg, ${t.deep}, #10131a)`,
                border: `1.5px solid ${t.color}88`,
                boxShadow: `0 0 12px ${t.soft}`,
                "--fan": `${fan}deg`,
                zIndex: i === 1 ? 2 : 1,
                ...dm(delayMs, i * 70),
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      <span
        className="ce-pop absolute left-1/2 top-1/2 ml-[-12%] mt-[-12%] flex h-[24%] w-[24%] items-center justify-center"
        style={{ color: t.color, filter: `drop-shadow(0 0 10px ${t.soft})`, ...dm(delayMs, 420) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.7} />
      </span>
      <span
        className="ce-ring absolute left-1/2 top-1/2 block h-[42%] w-[42%] rounded-full"
        style={{ border: `2px solid ${t.color}`, ...dm(delayMs, 560) }}
      />
    </span>
  );
}

// --- info: an iris opens on the emblem, a lens glint sweeps -----------------

function InfoArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      <span
        className="ce-iris absolute left-1/2 top-1/2 ml-[-21%] mt-[-21%] block h-[42%] w-[42%] rounded-full"
        style={{
          border: `2.5px solid ${t.color}`,
          boxShadow: `inset 0 0 20px ${t.soft}, 0 0 16px ${t.soft}`,
          ...dm(delayMs, 0),
        }}
      />
      <span
        className="ce-sigil absolute left-1/2 top-1/2 ml-[-11%] mt-[-11%] flex h-[22%] w-[22%] items-center justify-center"
        style={{ color: t.color, ...dm(delayMs, 300) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.7} />
      </span>
      <span className="absolute left-1/2 top-1/2 ml-[-21%] mt-[-21%] block h-[42%] w-[42%] overflow-hidden rounded-full">
        <span
          className="ce-glint absolute left-[30%] top-[-10%] block h-[120%] w-[16%]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,250,235,0.75), transparent)",
            ...dm(delayMs, 560),
          }}
        />
      </span>
    </span>
  );
}

// --- item: a supply crate drops in, lid flips, emblem springs out -----------

function ItemArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      <span
        className="ce-shadow absolute left-1/2 top-[64%] block h-[6%] w-[30%] rounded-[50%]"
        style={{ background: "rgba(8,10,14,0.8)", ...dm(delayMs, 0) }}
      />
      <span className="ce-crate absolute left-1/2 top-1/2 ml-[-13%] mt-[-8%] block h-[22%] w-[26%]" style={dm(delayMs, 100)}>
        <span
          className="absolute inset-0 block rounded-[6%]"
          style={{ background: "linear-gradient(180deg, #6b4a2a, #4a321a)", border: "2px solid #2e1f10" }}
        />
        <span
          className="absolute inset-x-[12%] top-[38%] block h-[22%]"
          style={{ background: t.soft, border: `1.5px solid ${t.color}` }}
        />
        <span
          className="ce-lid absolute inset-x-[-4%] top-[-14%] block h-[26%] rounded-[6%]"
          style={{ background: "#5d3f22", border: "2px solid #2e1f10", ...dm(delayMs, 620) }}
        />
      </span>
      <span
        className="ce-pop absolute left-1/2 top-1/2 ml-[-11%] mt-[-16%] flex h-[22%] w-[22%] items-center justify-center"
        style={{ color: t.color, filter: `drop-shadow(0 0 9px ${t.soft})`, ...dm(delayMs, 700) }}
      >
        <Icon className="h-full w-full" strokeWidth={1.7} />
      </span>
    </span>
  );
}

// --- nerf: a rubber stamp slams the emblem down, ink bleeds ------------------

function NerfArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  return (
    <span className="absolute inset-0 block">
      <span className="ce-stamp absolute left-1/2 top-1/2 ml-[-14%] mt-[-14%] block h-[28%] w-[28%]" style={dm(delayMs, 0)}>
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={{ border: `2.5px solid ${t.color}`, background: t.soft, color: t.color }}
        >
          <Icon className="h-[64%] w-[64%]" strokeWidth={1.8} />
        </span>
      </span>
      <span
        className="ce-ink absolute left-1/2 top-1/2 block h-[44%] w-[44%] rounded-full"
        style={{ border: `3px solid ${t.color}`, ...dm(delayMs, 330) }}
      />
      <span
        className="ce-ink absolute left-1/2 top-1/2 block h-[34%] w-[34%] rounded-full"
        style={{ border: `2px solid ${t.color}88`, ...dm(delayMs, 430) }}
      />
    </span>
  );
}

// --- pieces: the emblem assembles from four sliding quarters -----------------

function PiecesArrival({ category, icon: Icon, delayMs = 0 }: ArrivalProps) {
  const t = ARRIVAL_THEME[category];
  const quarters: { qx: string; qy: string; qr: string; clip: string }[] = [
    { qx: "-120%", qy: "-120%", qr: "-18deg", clip: "polygon(0 0, 100% 0, 0 100%)" },
    { qx: "120%", qy: "-120%", qr: "18deg", clip: "polygon(0 0, 100% 0, 100% 100%)" },
    { qx: "120%", qy: "120%", qr: "-14deg", clip: "polygon(100% 0, 100% 100%, 0 100%)" },
    { qx: "-120%", qy: "120%", qr: "14deg", clip: "polygon(0 0, 100% 100%, 0 100%)" },
  ];
  return (
    <span className="absolute inset-0 block">
      {quarters.map((q, i) => (
        <span
          key={i}
          className="ce-quarter absolute left-1/2 top-1/2 ml-[-13%] mt-[-13%] flex h-[26%] w-[26%] items-center justify-center"
          style={
            {
              color: t.color,
              clipPath: q.clip,
              "--qx": q.qx,
              "--qy": q.qy,
              "--qr": q.qr,
              ...dm(delayMs, i * 60),
            } as React.CSSProperties
          }
        >
          <Icon className="h-full w-full" strokeWidth={1.7} />
        </span>
      ))}
      <span
        className="ce-ring absolute left-1/2 top-1/2 block h-[40%] w-[40%] rounded-full"
        style={{ border: `2px solid ${t.color}`, ...dm(delayMs, 380) }}
      />
    </span>
  );
}

const ARRIVAL_BY_CATEGORY: Record<BuffCategory, (p: ArrivalProps) => React.ReactElement> = {
  attack: (p) => <AttackArrival {...p} />,
  hex: (p) => <HexArrival {...p} />,
  tempo: (p) => <TempoArrival {...p} />,
  protection: (p) => <ProtectionArrival {...p} />,
  movement: (p) => <MovementArrival {...p} />,
  draft: (p) => <DraftArrival {...p} />,
  info: (p) => <InfoArrival {...p} />,
  item: (p) => <ItemArrival {...p} />,
  nerf: (p) => <NerfArrival {...p} />,
  pieces: (p) => <PiecesArrival {...p} />,
};

/** The themed arrival scene, centered in (and sized by) the parent box. */
export function CategoryArrival(props: ArrivalProps) {
  return ARRIVAL_BY_CATEGORY[props.category](props);
}

// --- Acquire entrance ---------------------------------------------------------

/** Board-level one-shot fired the moment a card ENTERS a hand (draft pick,
 *  steal, grant) — distinct from its play. Mounted by Board keyed to the
 *  acquisition, so React runs it exactly once. Marquee tiers add a dim +
 *  board-wide rim shock. */
// --- Opener entrances (overhaul) ---------------------------------------------
// Every opener card (id op_*) gets a UNIQUE deterministic entrance: the id's
// hash picks the screen edge it arrives from, its flight curve, tilt, timing,
// hue shift, and a small trail of themed glyphs. One keyframe family plus CSS
// custom properties yields thousands of distinct compositions with no
// per-card code. Lives inside .ce-scene, so the anim-off gate applies as-is.

function openerHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 12 arrival origins around and beyond the crop (percent offsets). */
const OE_ORIGINS: Array<[number, number]> = [
  [-70, -70], [0, -85], [70, -70], [-85, 0], [85, 0], [-70, 70],
  [0, 85], [70, 70], [-90, -30], [90, -30], [-90, 30], [90, 30],
];

/** Trail glyphs: tiny SVG paths stamped along the flight. */
const OE_GLYPHS = [
  "M6 0 L7.6 4.2 L12 4.6 L8.6 7.4 L9.8 12 L6 9.4 L2.2 12 L3.4 7.4 L0 4.6 L4.4 4.2 Z", // star
  "M6 0 C9 3 12 6 6 12 C0 6 3 3 6 0 Z", // leaf/drop
  "M2 6 A4 4 0 1 0 10 6 A4 4 0 1 0 2 6 M6 2 V0 M6 12 V10 M2 6 H0 M12 6 H10", // gear-ish
  "M1 6 A5 3.4 0 1 0 11 6 A5 3.4 0 1 0 1 6", // coin
  "M0 12 C4 8 8 4 12 0 C10 6 6 10 0 12 Z", // feather
  "M6 0 L8 6 L6 12 L4 6 Z", // spark
  "M4 0 H6 V8 A2.4 2.4 0 1 1 4 6.4 Z", // note
  "M6 1 L11 11 H1 Z", // rune
];

const OE_EASINGS = ["oe-ease-a", "oe-ease-b", "oe-ease-c", "oe-ease-d"];

function OpenerArrival({ seed, icon: Icon }: { seed: string; icon: LucideIcon }) {
  const h = openerHash(seed);
  const [ox, oy] = OE_ORIGINS[h % OE_ORIGINS.length];
  const rot = ((h >>> 4) % 51) - 25; // -25..25 deg
  const dur = 620 + ((h >>> 9) % 9) * 55; // 620..1060ms
  const hue = (h >>> 13) % 360;
  const glyph = OE_GLYPHS[(h >>> 17) % OE_GLYPHS.length];
  const glyphCount = 3 + ((h >>> 21) % 4); // 3..6
  const easing = OE_EASINGS[(h >>> 24) % OE_EASINGS.length];
  const spin = (h & 1) === 0 ? 1 : -1;
  const color = `hsl(${hue} 62% 66%)`;
  const soft = `hsl(${hue} 62% 66% / 0.28)`;
  return (
    <span className="absolute inset-0 block" aria-hidden="true">
      {/* the flyer: badge ring + card icon, arriving from beyond the crop */}
      <span
        className={`oe-flyer ${easing} absolute left-1/2 top-1/2 flex h-[34%] w-[34%] items-center justify-center`}
        style={
          {
            "--oe-fx": `${ox}%`,
            "--oe-fy": `${oy}%`,
            "--oe-rot": `${rot * spin}deg`,
            animationDuration: `${dur}ms`,
            marginLeft: "-17%",
            marginTop: "-17%",
          } as React.CSSProperties
        }
      >
        <span
          className="oe-ring absolute inset-0 block rounded-full"
          style={{ border: `2.5px solid ${color}`, boxShadow: `0 0 24px ${soft}, inset 0 0 18px ${soft}` }}
        />
        <Icon className="relative h-[52%] w-[52%]" style={{ color }} strokeWidth={2} />
      </span>
      {/* the trail: themed glyphs strung back along the arrival vector */}
      {Array.from({ length: glyphCount }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 12 12"
          className="oe-trail absolute left-1/2 top-1/2 h-[7%] w-[7%]"
          style={
            {
              "--oe-fx": `${ox * (0.35 + i * 0.16)}%`,
              "--oe-fy": `${oy * (0.35 + i * 0.16)}%`,
              animationDuration: `${dur + 90 + i * 70}ms`,
              animationDelay: `${60 + i * 45}ms`,
              marginLeft: "-3.5%",
              marginTop: "-3.5%",
            } as React.CSSProperties
          }
        >
          <path d={glyph} fill={color} opacity={0.85} />
        </svg>
      ))}
      {/* landing pop */}
      <span
        className="oe-pop absolute left-1/2 top-1/2 block h-[40%] w-[40%] rounded-full"
        style={{ marginLeft: "-20%", marginTop: "-20%", border: `2px solid ${color}`, animationDelay: `${dur - 80}ms` }}
      />
    </span>
  );
}

export function CardEntrance({
  category,
  tier,
  icon,
  name,
  mine,
  cardId,
}: {
  category: BuffCategory;
  tier: number;
  icon: LucideIcon;
  name: string;
  /** Which side gained the card: flavors the banner label. */
  mine: boolean;
  /** Card id: openers (op_*) swap in their unique generated entrance. */
  cardId?: string;
}) {
  const t = ARRIVAL_THEME[category];
  const marquee = tier >= 8;
  const isOpener = !!cardId?.startsWith("op_");
  return (
    <span className="ce-scene pointer-events-none absolute inset-0 z-40 block" aria-hidden="true">
      {marquee && <span className="ce-dim absolute inset-0 block" style={{ background: "rgba(6,10,16,0.45)" }} />}
      <span
        className="ce-wash absolute inset-0 block"
        style={{ background: `radial-gradient(circle at 50% 42%, ${t.soft}, transparent 70%)` }}
      />
      {/* the arrival plays in a centered stage, ~56% of the crop; openers
          swap in their unique per-card generated entrance */}
      <span className="absolute left-[22%] top-[14%] block h-[56%] w-[56%]">
        {isOpener && cardId ? (
          <OpenerArrival seed={cardId} icon={icon} />
        ) : (
          <CategoryArrival category={category} icon={icon} delayMs={80} />
        )}
      </span>
      {marquee && (
        <span
          className="ce-marquee-rim absolute left-1/2 top-1/2 block h-[70%] w-[70%] rounded-full"
          style={{ border: `3px solid ${t.color}` }}
        />
      )}
      {/* Cinematic title over the arrival: no plate, no border — the name
          itself is the graphic, with a light sweep and a drawn-in rule. */}
      <span className="absolute inset-x-0 top-[68%] flex flex-col items-center px-[6%] text-center">
        <span
          className="ce-title-tag smallcaps text-[9.5px] tracking-[0.22em] text-parchment-300"
          style={{ animationDelay: "300ms", textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}
        >
          {isOpener ? (mine ? "Opening pick" : "Opponent opens with") : mine ? "New card" : "Opponent gains"}
        </span>
        <span className="relative block max-w-full overflow-hidden">
          <span
            className={`ce-title-name block font-display text-xl font-bold leading-tight tier-${tier}`}
            style={{
              animationDelay: "360ms",
              textShadow: `0 2px 10px rgba(0,0,0,0.95), 0 0 22px ${t.soft}`,
            }}
          >
            {name}
          </span>
          <span
            className="ce-title-sweep absolute inset-y-0 w-[18%]"
            style={{
              animationDelay: "620ms",
              background: "linear-gradient(100deg, transparent, rgba(255,250,235,0.5), transparent)",
            }}
          />
        </span>
        <span
          className="ce-title-rule mt-1 block h-[2px] w-[34%] rounded-full"
          style={{ animationDelay: "520ms", background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }}
        />
      </span>
    </span>
  );
}
