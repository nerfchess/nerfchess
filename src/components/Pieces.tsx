// Inline SVG chess pieces (derived from public-domain Wikimedia Cburnett set, simplified).
import React from "react";
import type { CSSProperties } from "react";
import { Color, PieceType } from "@/engine/types";

interface Props {
  type: PieceType;
  color: Color;
  size?: number | string;
  className?: string;
}

const SHEETS: Record<string, string> = {
  // We use Cburnett SVGs encoded inline as React components below
};

// Memoized so identical (type, color, size, className) props skip re-rendering.
// Without this, every premove update reflows every piece's SVG via
// dangerouslySetInnerHTML and the textures visibly flicker.
export const Piece = React.memo(function Piece({ type, color, size = 60, className = "" }: Props) {
  const key = `${color}${type}`;
  const path = PATHS[key];
  const style: CSSProperties = { width: size, height: size };
  return (
    <span
      className={"piece-shell inline-grid place-items-center select-none " + className}
      style={style}
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${type}`}
    >
      <svg
        viewBox="0 0 45 45"
        width="100%"
        height="100%"
        className="piece-inline"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: path }}
      />
      <span
        className="piece-asset"
        aria-hidden="true"
        style={{ backgroundImage: `var(--piece-${key}-image)` }}
      />
    </span>
  );
});

// A piece hexed into a walnut: the whole piece becomes a plump, glossy walnut
// (the joke), with the original piece shrunk down and nestled in the shell so
// you can still tell what got petrified. The shell wobbles like it is trying to
// crack itself open (see .walnut-piece in globals.css). Gradient ids are
// per-instance (useId) so many walnuts on one board never collide.
export const WalnutPiece = React.memo(function WalnutPiece({
  type,
  color,
  size = "100%",
}: {
  type: PieceType;
  color: Color;
  size?: number | string;
}) {
  const uid = React.useId().replace(/[:]/g, "");
  const body = `wn-body-${uid}`;
  const cav = `wn-cav-${uid}`;
  return (
    <span
      className="walnut-piece relative inline-grid place-items-center select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${type} hexed into a walnut`}
      title="Hexed into a walnut"
    >
      <svg viewBox="0 0 45 45" width="100%" height="100%" className="walnut-inline" aria-hidden="true">
        <defs>
          <radialGradient id={body} cx="38%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#f0cf9c" />
            <stop offset="42%" stopColor="#cd944f" />
            <stop offset="100%" stopColor="#754319" />
          </radialGradient>
          <radialGradient id={cav} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#8a5a2c" />
            <stop offset="100%" stopColor="#3d2410" />
          </radialGradient>
        </defs>
        {/* shell */}
        <path
          d="M22.5 4.5C31.3 4.5 38.5 11.8 38.5 23C38.5 34.4 31.2 41.5 22.5 41.5C13.8 41.5 6.5 34.4 6.5 23C6.5 11.8 13.7 4.5 22.5 4.5Z"
          fill={`url(#${body})`}
          stroke="#4a2b10"
          strokeWidth="1.3"
        />
        {/* central seam */}
        <path
          d="M22.5 6C20.8 12 24 18 22.5 23.5C21 29 24.2 35 22.5 40"
          fill="none"
          stroke="#5c3714"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* brain-like ridges, both halves */}
        <g fill="none" stroke="#6d3f18" strokeWidth="1" strokeLinecap="round" opacity="0.72">
          <path d="M21.8 10.5C15.5 11.5 11.5 15.5 10.5 20.5" />
          <path d="M22 16.5C16 17.5 12.8 21.5 12 26.5" />
          <path d="M22.2 23C17 24 14.2 28 14.5 33" />
          <path d="M23.2 10.5C29.5 11.5 33.5 15.5 34.5 20.5" />
          <path d="M23 16.5C29 17.5 32.2 21.5 33 26.5" />
          <path d="M22.8 23C28 24 30.8 28 30.5 33" />
        </g>
        {/* gloss highlight */}
        <ellipse cx="16" cy="13.5" rx="6" ry="3.8" fill="#ffffff" opacity="0.22" />
        {/* cavity the piece sits in */}
        <ellipse cx="22.5" cy="25.5" rx="8.2" ry="9" fill={`url(#${cav})`} stroke="#4a2b10" strokeWidth="0.8" opacity="0.95" />
      </svg>
      {/* the shrunken original piece, nestled in the shell */}
      <span
        className="pointer-events-none absolute"
        style={{ left: "50%", top: "56%", width: "40%", height: "40%", transform: "translate(-50%, -50%)" }}
      >
        <Piece type={type} color={color} size="100%" />
      </span>
    </span>
  );
});

// A tossed banana peel, sitting on its square as a slip trap (see the Banana
// Peel item). Splayed three-frond peel with a warm yellow gradient, gloss and a
// ground shadow for a plump pseudo-3D look; it does a jaunty little shimmy (see
// .banana-peel in globals.css). Gradient ids are per-instance so several peels
// on one board never collide.
export const BananaPeel = React.memo(function BananaPeel() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `bp-${uid}`;
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe86b" />
          <stop offset="55%" stopColor="#f6c518" />
          <stop offset="100%" stopColor="#c07f0d" />
        </linearGradient>
        <linearGradient id={`${g}-in`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff7da" />
          <stop offset="100%" stopColor="#efdfa0" />
        </linearGradient>
      </defs>
      {/* soft ground shadow */}
      <ellipse cx="22.5" cy="37.5" rx="13" ry="3.1" fill="#000000" opacity="0.18" />
      <g stroke="#8a5c0c" strokeWidth="1" strokeLinejoin="round">
        {/* left + right outer fronds */}
        <path d="M22.5 33C14 31 8 24 7 15C10.5 13.8 13.5 15.2 15.3 19C17.2 23.8 20 28.8 24 31.8Z" fill={`url(#${g})`} />
        <path d="M22.5 33C31 31 37 24 38 15C34.5 13.8 31.5 15.2 29.7 19C27.8 23.8 25 28.8 21 31.8Z" fill={`url(#${g})`} />
        {/* center frond, pale inner skin */}
        <path d="M22.5 33C20 24 21 15 22.5 7C24 15 25 24 22.5 33Z" fill={`url(#${g}-in)`} />
        {/* squashed base pulp */}
        <ellipse cx="22.5" cy="33" rx="4.6" ry="3" fill="#a06a12" />
      </g>
      {/* gloss streak */}
      <path d="M12 17C13 21 16 26 19 29" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.42" />
    </svg>
  );
});

// Simplified silhouettes; high-contrast white/black with outline for both.
// Colors resolve through CSS variables so piece themes can recolor the whole
// set at runtime (see PIECE_THEMES / applyPieceTheme in lib/settings).
// Each entry is innerHTML for the SVG (viewBox 0 0 45 45)
const fill = (c: Color) => (c === "w" ? "var(--piece-w-fill)" : "var(--piece-b-fill)");
const stroke = (c: Color) => (c === "w" ? "var(--piece-w-stroke)" : "var(--piece-b-stroke)");

function make(svg: string) { return svg; }

const PATHS: Record<string, string> = {
  // King
  wk: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 11.6V6M20 8h5" stroke-linecap="round" />
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="${fill("w")}" />
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="${fill("w")}" />
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" fill="none" />
    </g>`),
  bk: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 11.6V6M20 8h5" stroke-linecap="round" stroke="${stroke("b")}" />
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" fill="none" stroke="${stroke("b")}" />
    </g>`),
  // Queen (Cburnett — 5 symmetric spikes with jewels, layered base ridges)
  wq: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <circle cx="6" cy="12" r="2.75"/>
      <circle cx="14" cy="9" r="2.75"/>
      <circle cx="22.5" cy="8" r="2.75"/>
      <circle cx="31" cy="9" r="2.75"/>
      <circle cx="39" cy="12" r="2.75"/>
      <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" stroke-linecap="butt"/>
      <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" stroke-linecap="butt"/>
      <path d="M 11,38.5 A 35,35 1 0 0 34,38.5" fill="none" stroke-linecap="butt"/>
      <path d="M 11,29 A 35,35 1 0 1 34,29" fill="none"/>
      <path d="M 12.5,31.5 L 32.5,31.5" fill="none"/>
      <path d="M 11.5,34.5 A 35,35 1 0 0 33.5,34.5" fill="none"/>
      <path d="M 10.5,37.5 A 35,35 1 0 0 34.5,37.5" fill="none"/>
    </g>`),
  bq: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <circle cx="6" cy="12" r="2.75"/>
      <circle cx="14" cy="9" r="2.75"/>
      <circle cx="22.5" cy="8" r="2.75"/>
      <circle cx="31" cy="9" r="2.75"/>
      <circle cx="39" cy="12" r="2.75"/>
      <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" stroke-linecap="butt"/>
      <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" stroke-linecap="butt"/>
      <path d="M 11,38.5 A 35,35 1 0 0 34,38.5" fill="none" stroke="${stroke("b")}" stroke-linecap="butt"/>
      <path d="M 11,29 A 35,35 1 0 1 34,29" fill="none" stroke="${stroke("b")}"/>
      <path d="M 12.5,31.5 L 32.5,31.5" fill="none" stroke="${stroke("b")}"/>
      <path d="M 11.5,34.5 A 35,35 1 0 0 33.5,34.5" fill="none" stroke="${stroke("b")}"/>
      <path d="M 10.5,37.5 A 35,35 1 0 0 34.5,37.5" fill="none" stroke="${stroke("b")}"/>
    </g>`),
  // Rook
  wr: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M9 39h27v-3H9zM12 36v-4h21v4zM11 14V9h4v2h5V9h5v2h5V9h4v5"/>
      <path d="M34 14l-3 3H14l-3-3"/>
      <path d="M31 17v12.5H14V17"/>
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
      <path d="M11 14h23" fill="none"/>
    </g>`),
  br: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M9 39h27v-3H9zM12.5 32l1.5-2.5h17l1.5 2.5M12 36v-4h21v4z"/>
      <path d="M14 29.5v-13h17v13"/>
      <path d="M14 16.5l-3-2.5h23l-3 2.5M11 14V9h4v2h5V9h5v2h5V9h4v5"/>
    </g>`),
  // Bishop
  wb: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <g stroke-linecap="butt">
        <path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.7.5 3 2-1.4 1-3 .5-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1 0 0-1.6.5-3-.5 1.3-1.5 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <circle cx="22.5" cy="8" r="2.5"/>
      </g>
      <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" fill="none" stroke-linejoin="miter"/>
    </g>`),
  bb: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <g stroke-linecap="butt">
        <path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.7.5 3 2-1.4 1-3 .5-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1 0 0-1.6.5-3-.5 1.3-1.5 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <circle cx="22.5" cy="8" r="2.5"/>
      </g>
      <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" fill="none" stroke="${stroke("b")}" stroke-linejoin="miter"/>
    </g>`),
  // Knight (Cburnett — full head silhouette: ear at y=2, snout, mane)
  wn: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" stroke-linecap="butt"/>
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13.5,29 10.5,30.5 8,30 C 6,29.5 5,27 6,24 C 7,21 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,5.5 16.5,4.5 16.5,4.5 L 18,5 L 16,2 L 19,2 L 18,4 L 20,3.5 L 19.5,5.5 C 19.5,5.5 21.5,5 21.5,6 z" stroke-linecap="butt"/>
      <path d="M 9.5,25.5 A 0.5,0.5 0 1,1 8.5,25.5 A 0.5,0.5 0 1,1 9.5,25.5 z" fill="${stroke("w")}"/>
      <path d="M 15,15.5 A 0.5,1.5 0 1,1 14,15.5 A 0.5,1.5 0 1,1 15,15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="${stroke("w")}"/>
    </g>`),
  bn: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" stroke-linecap="butt"/>
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13.5,29 10.5,30.5 8,30 C 6,29.5 5,27 6,24 C 7,21 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,5.5 16.5,4.5 16.5,4.5 L 18,5 L 16,2 L 19,2 L 18,4 L 20,3.5 L 19.5,5.5 C 19.5,5.5 21.5,5 21.5,6 z" stroke-linecap="butt"/>
      <path d="M 9.5,25.5 A 0.5,0.5 0 1,1 8.5,25.5 A 0.5,0.5 0 1,1 9.5,25.5 z" fill="${stroke("b")}" stroke="${stroke("b")}"/>
      <path d="M 15,15.5 A 0.5,1.5 0 1,1 14,15.5 A 0.5,1.5 0 1,1 15,15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="${stroke("b")}" stroke="${stroke("b")}"/>
    </g>`),
  // Pawn
  wp: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </g>`),
  bp: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </g>`),
};
